#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path("research/named-holder-data")
RAW = ROOT / "raw"
NORMALIZED = ROOT / "normalized"

USER_AGENT = "Principle historical census preservation project/1.0"


@dataclass
class Receipt:
    source_id: str
    year: int
    status: str
    requested_url: str
    resolved_url: str | None = None
    output_path: str | None = None
    bytes: int | None = None
    sha256: str | None = None
    rows: int | None = None
    holder_assertions: int | None = None
    error: str | None = None


def fetch_text(urls: Iterable[str], referer: str | None = None) -> tuple[str, str]:
    errors: list[str] = []
    for url in urls:
        for attempt in range(1, 4):
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/csv,text/plain,*/*",
                    **({"Referer": referer} if referer else {}),
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=300) as response:
                    payload = response.read()
                    if not payload:
                        raise RuntimeError("empty response")
                    text = payload.decode("utf-8-sig", errors="replace")
                    lower = text[:1000].lower()
                    if "<html" in lower or "<!doctype html" in lower:
                        raise RuntimeError("received HTML instead of data")
                    if "markdown content:" in lower:
                        marker = re.search(r"markdown content:\s*", text, re.I)
                        assert marker
                        text = text[marker.end():]
                    return text, response.geturl()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{url} attempt {attempt}: {exc}")
                time.sleep(attempt * 2)
    raise RuntimeError(" | ".join(errors))


def clean_cell(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip().strip("\ufeff")


def meaningful_holder(value: str) -> bool:
    compact = value.strip().strip('"').strip()
    if not compact:
        return False
    lower = re.sub(r"\s+", " ", compact.lower())
    if lower in {
        "do", "ditto", '""', "owner", "employer", "owner & employer",
        "in trust for 2 minor heirs", "in trust for two minor heirs",
    }:
        return False
    if re.fullmatch(r"[\[\]\(\)\-\s\"']+", compact):
        return False
    # Require at least two alphabetic characters. Historical initials remain valid.
    return len(re.findall(r"[A-Za-z]", compact)) >= 2


def classify_role(raw_name: str) -> tuple[str, bool]:
    lower = raw_name.lower()
    has_owner = "owner" in lower or "proprietor" in lower
    has_employer = "employer" in lower or "employ" in lower or "hired to" in lower
    has_trust = "trust" in lower or "guardian" in lower or "minor heir" in lower
    has_estate = "estate" in lower or re.search(r"\best\.?\b", lower) is not None or "heir" in lower
    if has_owner and has_employer:
        role = "owner_and_employer_string"
    elif has_employer:
        role = "recorded_employer_or_hirer"
    elif has_trust:
        role = "recorded_trustee_or_guardian_string"
    elif has_estate:
        role = "recorded_estate_or_heirs_string"
    elif has_owner:
        role = "recorded_owner"
    else:
        role = "recorded_holder"
    requires_split = (
        has_owner and has_employer
        or has_trust
        or has_estate
        or "/" in raw_name
        or " & " in raw_name
        or " belongs to " in lower
        or " for " in lower
    )
    return role, requires_split


def find_column(fieldnames: list[str], candidates: Iterable[str]) -> str | None:
    lowered = {name.lower().strip(): name for name in fieldnames}
    for candidate in candidates:
        if candidate.lower() in lowered:
            return lowered[candidate.lower()]
    for name in fieldnames:
        lower = name.lower()
        if any(candidate.lower() in lower for candidate in candidates):
            return name
    return None


def normalize_csv(
    *,
    source_id: str,
    source_dataset: str,
    year: int,
    state_name: str,
    county_name: str,
    source_url: str,
    text: str,
    output_path: Path,
    transcription_credit: str,
    rights_basis: str,
) -> tuple[int, int]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise RuntimeError("CSV has no header")
    fieldnames = [clean_cell(name) for name in reader.fieldnames]
    reader.fieldnames = fieldnames

    holder_column = find_column(
        fieldnames,
        ("Names of Slave Owners", "Name of Slaveholder", "Name of Owner", "Slaveholder", "Owner"),
    )
    if not holder_column:
        raise RuntimeError(f"Could not identify holder column in {fieldnames}")
    location_column = find_column(fieldnames, ("Location", "District", "Township", "Enumeration District"))
    county_column = find_column(fieldnames, ("County",))
    state_column = find_column(fieldnames, ("State",))
    number_column = find_column(fieldnames, ("Number of Slaves", "Number of Slave", "Slave Number"))

    rows = list(reader)
    current_location = ""
    pending: list[dict[str, object]] = []
    holder_rows: list[tuple[int, dict[str, str], str, str]] = []

    for row_number, row in enumerate(rows, start=2):
        row = {clean_cell(key): clean_cell(value) for key, value in row.items()}
        if location_column and row.get(location_column):
            current_location = row[location_column]
        raw_name = row.get(holder_column, "")
        if meaningful_holder(raw_name):
            holder_rows.append((row_number, row, current_location, raw_name))

    raw_name_counts = Counter(raw_name for _, _, _, raw_name in holder_rows)
    location_name_counts = Counter((location, raw_name) for _, _, location, raw_name in holder_rows)

    for index, (row_number, row, location, raw_name) in enumerate(holder_rows):
        next_row_number = holder_rows[index + 1][0] if index + 1 < len(holder_rows) else len(rows) + 2
        segment = rows[row_number - 2 : next_row_number - 2]
        numbers: list[int] = []
        if number_column:
            for segment_row in segment:
                raw_number = clean_cell(segment_row.get(number_column))
                match = re.fullmatch(r"\d+", raw_number)
                if match:
                    numbers.append(int(raw_number))
        reported_holding_size = max(numbers) if numbers else None

        row_state = row.get(state_column, "") if state_column else ""
        row_county = row.get(county_column, "") if county_column else ""
        role, requires_split = classify_role(raw_name)
        digest_source = "|".join(
            [source_id, str(year), str(row_number), location, raw_name]
        )
        assertion_id = "hna_" + hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:24]
        pending.append({
            "assertion_id": assertion_id,
            "source_id": source_id,
            "source_dataset": source_dataset,
            "assertion_kind": "schedule_recorded_holder",
            "census_year": year,
            "state_name": row_state or state_name,
            "county_name": row_county or county_name,
            "location_text": location,
            "raw_name": raw_name,
            "normalized_name": raw_name,
            "recorded_role": role,
            "requires_entity_split": requires_split,
            "source_occurrence_count": raw_name_counts[raw_name],
            "location_occurrence_count": location_name_counts[(location, raw_name)],
            "reported_holding_size": reported_holding_size,
            "source_row_number": row_number,
            "source_url": source_url,
            "source_locator": f"CSV row {row_number}; {location}" if location else f"CSV row {row_number}",
            "source_access_class": "public_federal_transcription" if source_id.startswith("nps-") else "public_regional_transcription",
            "publication_status": "approved" if source_id.startswith("nps-") else "rights_review_required",
            "is_public": source_id.startswith("nps-"),
            "rights_basis": rights_basis,
            "transcription_credit": transcription_credit,
            "confidence": "source_transcribed",
            "raw_file_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "notes": "The literal holder string is preserved. Identity consolidation and multi-entity splitting require image or record review.",
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(pending[0].keys()) if pending else [
        "assertion_id", "source_id", "raw_name", "source_url"
    ]
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(pending)
    return len(rows), len(pending)


def recover_source(spec: dict[str, object]) -> Receipt:
    source_id = str(spec["source_id"])
    year = int(spec["year"])
    output_name = str(spec["output_name"])
    try:
        text, resolved = fetch_text(spec["urls"], referer=str(spec.get("referer") or "") or None)
        raw_path = RAW / output_name
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(text, encoding="utf-8")
        normalized_path = NORMALIZED / output_name.replace(".csv", "-named-holders.csv")
        row_count, assertion_count = normalize_csv(
            source_id=source_id,
            source_dataset=str(spec["source_dataset"]),
            year=year,
            state_name=str(spec.get("state_name") or ""),
            county_name=str(spec.get("county_name") or ""),
            source_url=str(spec["canonical_url"]),
            text=text,
            output_path=normalized_path,
            transcription_credit=str(spec["transcription_credit"]),
            rights_basis=str(spec["rights_basis"]),
        )
        return Receipt(
            source_id=source_id,
            year=year,
            status="downloaded_and_normalized",
            requested_url=str(list(spec["urls"])[0]),
            resolved_url=resolved,
            output_path=str(normalized_path),
            bytes=len(text.encode("utf-8")),
            sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
            rows=row_count,
            holder_assertions=assertion_count,
        )
    except Exception as exc:  # noqa: BLE001
        return Receipt(
            source_id=source_id,
            year=year,
            status="failed",
            requested_url=str(list(spec["urls"])[0]),
            error=str(exc),
        )


def combine_assertions(receipts: list[Receipt]) -> None:
    paths = [Path(receipt.output_path) for receipt in receipts if receipt.output_path]
    all_rows: list[dict[str, str]] = []
    fieldnames: list[str] = []
    for path in paths:
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            if not fieldnames and reader.fieldnames:
                fieldnames = reader.fieldnames
            all_rows.extend(reader)
    if not all_rows:
        return
    combined = NORMALIZED / "all-public-source-named-holder-assertions.csv"
    with combined.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)
    summary = {
        "assertions": len(all_rows),
        "unique_raw_names": len({row["raw_name"] for row in all_rows}),
        "by_source": dict(Counter(row["source_id"] for row in all_rows)),
        "by_year": dict(Counter(row["census_year"] for row in all_rows)),
        "public_assertions": sum(row["is_public"].lower() == "true" for row in all_rows),
    }
    (NORMALIZED / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    specs = [
        {
            "source_id": "nps-st-louis-slave-schedules",
            "source_dataset": "1850 United States Slave Schedule for St. Louis County",
            "year": 1850,
            "state_name": "Missouri",
            "county_name": "St. Louis",
            "canonical_url": "https://home.nps.gov/articles/000/united-states-census-slave-schedule-for-st-louis-county-1850.htm",
            "output_name": "nps-st-louis-1850.csv",
            "urls": [
                "https://home.nps.gov/common/uploads/sortable_dataset/articles/6680BD3F-EDE5-A7E4-7410459A92AC4D59/nri-1850CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
                "https://www.nps.gov/common/uploads/sortable_dataset/articles/6680BD3F-EDE5-A7E4-7410459A92AC4D59/nri-1850CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
                "https://r.jina.ai/https://home.nps.gov/common/uploads/sortable_dataset/articles/6680BD3F-EDE5-A7E4-7410459A92AC4D59/nri-1850CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
            ],
            "referer": "https://home.nps.gov/articles/000/united-states-census-slave-schedule-for-st-louis-county-1850.htm",
            "transcription_credit": "Railey Crews, Ulysses S. Grant National Historic Site",
            "rights_basis": "Published by the United States National Park Service; factual federal-record transcription with attribution retained.",
        },
        {
            "source_id": "nps-st-louis-slave-schedules",
            "source_dataset": "1860 United States Slave Schedule for St. Louis County",
            "year": 1860,
            "state_name": "Missouri",
            "county_name": "St. Louis",
            "canonical_url": "https://home.nps.gov/articles/000/united-states-census-slave-schedule-for-st-louis-county-1860.htm",
            "output_name": "nps-st-louis-1860.csv",
            "urls": [
                "https://home.nps.gov/common/uploads/sortable_dataset/articles/CBED050E-A1A5-B63E-05A368E8C6FD9472/nri-1860CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
                "https://www.nps.gov/common/uploads/sortable_dataset/articles/CBED050E-A1A5-B63E-05A368E8C6FD9472/nri-1860CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
                "https://r.jina.ai/https://home.nps.gov/common/uploads/sortable_dataset/articles/CBED050E-A1A5-B63E-05A368E8C6FD9472/nri-1860CompletedSlaveScheduleTranscription-StLouisCounty-CSVFile.csv",
            ],
            "referer": "https://home.nps.gov/articles/000/united-states-census-slave-schedule-for-st-louis-county-1860.htm",
            "transcription_credit": "Railey Crews, Ulysses S. Grant National Historic Site",
            "rights_basis": "Published by the United States National Park Service; factual federal-record transcription with attribution retained.",
        },
        {
            "source_id": "enduring-connections-slave-schedules",
            "source_dataset": "1850 U.S. Census Slave Schedule",
            "year": 1850,
            "state_name": "Maryland and Delaware",
            "county_name": "",
            "canonical_url": "https://enduringconnections.salisbury.edu/source/1850_us_census_slave_schedule",
            "output_name": "enduring-connections-1850.csv",
            "urls": [
                "https://enduringconnections.salisbury.edu/files/download-csv.php?filename=1850+U.S.+Census+Slave+Schedule&id=5&type=source",
                "https://r.jina.ai/https://enduringconnections.salisbury.edu/files/download-csv.php?filename=1850%2BU.S.%2BCensus%2BSlave%2BSchedule%26id=5%26type=source",
            ],
            "referer": "https://enduringconnections.salisbury.edu/source/1850_us_census_slave_schedule",
            "transcription_credit": "Edward H. Nabb Research Center for Delmarva History and Culture",
            "rights_basis": "Public research database; publication remains subject to the Nabb Research Center's source and reuse terms.",
        },
        {
            "source_id": "enduring-connections-slave-schedules",
            "source_dataset": "1860 U.S. Census Slave Schedule",
            "year": 1860,
            "state_name": "Maryland and Delaware",
            "county_name": "",
            "canonical_url": "https://enduringconnections.salisbury.edu/source/1860_us_slave_schedule",
            "output_name": "enduring-connections-1860.csv",
            "urls": [
                "https://enduringconnections.salisbury.edu/files/download-csv.php?filename=1860+U.S.+Census+Slave+Schedule&id=23&type=source",
                "https://r.jina.ai/https://enduringconnections.salisbury.edu/files/download-csv.php?filename=1860%2BU.S.%2BCensus%2BSlave%2BSchedule%26id=23%26type=source",
            ],
            "referer": "https://enduringconnections.salisbury.edu/source/1860_us_slave_schedule",
            "transcription_credit": "Edward H. Nabb Research Center for Delmarva History and Culture",
            "rights_basis": "Public research database; publication remains subject to the Nabb Research Center's source and reuse terms.",
        },
    ]

    receipts = [recover_source(spec) for spec in specs]
    combine_assertions(receipts)
    (ROOT / "receipts.json").write_text(
        json.dumps([asdict(receipt) for receipt in receipts], indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps([asdict(receipt) for receipt in receipts], indent=2))
    return 0 if any(receipt.status.startswith("downloaded") for receipt in receipts) else 1


if __name__ == "__main__":
    raise SystemExit(main())
