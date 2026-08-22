#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import pathlib
import urllib.request
import zipfile

BASE = (
    "https://ppivlagimorknznjbybo.supabase.co/storage/v1/object/public/"
    "national-schedule-export-temp-20260821/chunks"
)
ROOT = pathlib.Path("national-export")
CHUNKS = ROOT / "chunks"
DATA = ROOT / "data"
DOCS = ROOT / "docs"


def fetch(filename: str) -> pathlib.Path:
    destination = CHUNKS / filename
    request = urllib.request.Request(
        f"{BASE}/{filename}",
        headers={"User-Agent": "Principle historical census preservation project/1.0"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        payload = response.read()
    if not payload:
        raise RuntimeError(f"Downloaded an empty file: {filename}")
    destination.write_bytes(payload)
    print(f"downloaded {filename}: {len(payload):,} bytes")
    return destination


def main() -> None:
    for directory in (CHUNKS, DATA, DOCS):
        directory.mkdir(parents=True, exist_ok=True)

    assertion_parts = [fetch(f"assertions-{offset:05d}.csv") for offset in range(0, 90000, 5000)]
    source_file = fetch("sources.csv")
    coverage_file = fetch("coverage.csv")
    named_file = fetch("named_enslaved.csv")

    assertions_out = DATA / "usgenweb_recorded_holder_assertions.csv"
    expected_header: str | None = None
    assertion_rows = 0
    with assertions_out.open("w", encoding="utf-8", newline="") as target:
        for path in assertion_parts:
            with path.open("r", encoding="utf-8-sig", newline="") as source:
                header = source.readline()
                if not header:
                    raise RuntimeError(f"Missing CSV header: {path}")
                if expected_header is None:
                    expected_header = header
                    target.write(header)
                elif header != expected_header:
                    raise RuntimeError(f"Header mismatch in {path}")
                for line in source:
                    if line.strip():
                        target.write(line)
                        assertion_rows += 1

    if assertion_rows != 88_742:
        raise RuntimeError(f"Expected 88,742 assertions; assembled {assertion_rows:,}")

    (DATA / "usgenweb_source_manifest.csv").write_bytes(source_file.read_bytes())
    (DATA / "usgenweb_state_year_coverage.csv").write_bytes(coverage_file.read_bytes())
    (DATA / "named_enslaved_person_assertions.csv").write_bytes(named_file.read_bytes())

    groups: dict[str, dict[str, object]] = {}
    associated_total = 0
    review_assertions = 0
    assertion_ids: set[str] = set()
    blank_names = 0

    with assertions_out.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            assertion_id = row["assertion_id"]
            if assertion_id in assertion_ids:
                raise RuntimeError(f"Duplicate assertion identifier: {assertion_id}")
            assertion_ids.add(assertion_id)

            normalized = row["normalized_holder_text"].strip()
            literal = row["raw_holder_text"].strip()
            if not literal:
                blank_names += 1
            associated = int(row["associated_person_rows"] or 0)
            associated_total += associated
            flagged = row["parse_status"] != "literal_name"
            review_assertions += int(flagged)

            group = groups.setdefault(
                normalized,
                {
                    "literals": set(),
                    "assertions": 0,
                    "associated": 0,
                    "sources": set(),
                    "jurisdictions": set(),
                    "jurisdiction_years": set(),
                    "review": 0,
                    "literal_candidates": [],
                },
            )
            group["literals"].add(literal)
            group["assertions"] += 1
            group["associated"] += associated
            group["sources"].add(row["source_url"])
            group["jurisdictions"].add(row["state_code"])
            group["jurisdiction_years"].add(f'{row["state_code"]}-{row["census_year"]}')
            group["review"] += int(flagged)
            group["literal_candidates"].append((flagged, len(literal), literal))

    if blank_names:
        raise RuntimeError(f"Found {blank_names} blank holder names")
    if len(groups) != 80_277:
        raise RuntimeError(f"Expected 80,277 distinct names; found {len(groups):,}")
    if associated_total != 460_089:
        raise RuntimeError(f"Expected associated count 460,089; found {associated_total:,}")

    distinct_out = DATA / "usgenweb_distinct_recorded_holder_names.csv"
    distinct_columns = [
        "normalized_holder_text",
        "preferred_literal_name",
        "assertion_count",
        "associated_count",
        "source_count",
        "jurisdiction_count",
        "jurisdiction_year_count",
        "jurisdiction_years",
        "literal_variant_count",
        "review_flag_count",
        "other_literal_variants",
    ]
    with distinct_out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=distinct_columns)
        writer.writeheader()
        for normalized in sorted(groups):
            group = groups[normalized]
            preferred = min(group["literal_candidates"])[2]
            variants = sorted(group["literals"])
            writer.writerow(
                {
                    "normalized_holder_text": normalized,
                    "preferred_literal_name": preferred,
                    "assertion_count": group["assertions"],
                    "associated_count": group["associated"],
                    "source_count": len(group["sources"]),
                    "jurisdiction_count": len(group["jurisdictions"]),
                    "jurisdiction_year_count": len(group["jurisdiction_years"]),
                    "jurisdiction_years": ";".join(sorted(group["jurisdiction_years"])),
                    "literal_variant_count": len(variants),
                    "review_flag_count": group["review"],
                    "other_literal_variants": " | ".join(v for v in variants if v != preferred),
                }
            )

    with (DATA / "named_enslaved_person_assertions.csv").open(
        "r", encoding="utf-8-sig", newline=""
    ) as handle:
        named_rows = sum(1 for _ in csv.DictReader(handle))
    if named_rows != 27:
        raise RuntimeError(f"Expected 27 named enslaved-person assertions; found {named_rows}")

    report = {
        "build_date": "2026-08-21",
        "scope": "Open USGenWeb Schedule 2 transcriptions recovered for private research",
        "holder_assertions": assertion_rows,
        "distinct_normalized_holder_names": len(groups),
        "associated_person_rows_or_reported_totals": associated_total,
        "assertions_with_review_flags": review_assertions,
        "named_enslaved_person_assertions": named_rows,
        "source_files": 491,
        "represented_jurisdictions": 15,
        "represented_jurisdiction_year_pairs": 25,
        "blank_holder_names": blank_names,
        "duplicate_assertion_ids": assertion_rows - len(assertion_ids),
        "failed_source_files": 0,
        "complete_national_claim": False,
    }
    (ROOT / "BUILD_REPORT.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    (ROOT / "README.md").write_text(
        """# United States Schedule 2 Recorded-Holder Registry — Open Recovery Tranche

This package contains names recovered from 491 public United States GenWeb Census Project transcriptions of the 1850 and 1860 federal Schedule 2 censuses. It contains 88,742 source assertions and 80,277 distinct normalized holder-name strings.

It is a national registry package, not a claim that every surviving Schedule 2 holder has been recovered. The state-year coverage file identifies the jurisdictions and source units represented. Complete national literal holder strings remain available through access-controlled indexes and restricted-use datasets.

The source transcriptions carry individual transcriber, proofreader, copyright and reuse notices. The package preserves those credits and source URLs. It extracts factual name assertions for private research and does not republish the source transcript text.

The `associated_person_rows` field means the number of Schedule 2 rows linked to an assertion unless `associated_count_basis` identifies an aggregate reported total. It must not be treated automatically as a legally adjudicated ownership count.

The separate named-enslaved-person file contains the rare cases in which a Schedule 2 transcription preserved an enslaved person's name in a schedule field.
""",
        encoding="utf-8",
    )

    (DOCS / "SCOPE_RIGHTS_AND_ATTRIBUTION.md").write_text(
        """# Scope, attribution and reuse

The United States GenWeb Census Project source files were created by individual volunteer transcribers and proofreaders. Many source headers prohibit republication by organizations without the transcriber's permission while allowing individuals to use the material in their own research.

This archive therefore retains each source URL, transcriber, proofreader, copyright line and detected rights notice. It contains structured factual assertions rather than copied source transcript pages. Organizational republication still requires a source-by-source rights review.

A recorded holder can be an owner, an estate, a trust, a guardian, an employer, a hirer, an institution or an unresolved compound entry. The literal source string remains authoritative until additional records support an identity resolution.
""",
        encoding="utf-8",
    )

    checksums: list[str] = []
    for path in sorted(p for p in ROOT.rglob("*") if p.is_file() and p.name != "MANIFEST.sha256"):
        checksums.append(
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(ROOT).as_posix()}"
        )
    (ROOT / "MANIFEST.sha256").write_text("\n".join(checksums) + "\n", encoding="utf-8")

    zip_path = pathlib.Path("us_slaveholding_open_national_registry_usgenweb_v0.5.0_2026-08-21.zip")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(p for p in ROOT.rglob("*") if p.is_file()):
            archive.write(path, pathlib.Path(ROOT.name) / path.relative_to(ROOT))

    print(json.dumps(report, indent=2))
    print(f"created {zip_path}: {zip_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
