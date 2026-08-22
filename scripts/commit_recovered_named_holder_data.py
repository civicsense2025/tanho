#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path("research/named-holder-data")
if not ROOT.exists() or not any(ROOT.rglob("*.csv")):
    print("No recovered CSV files exist; nothing to commit.")
    raise SystemExit(0)

branch = os.environ.get("GITHUB_HEAD_REF") or os.environ.get("GITHUB_REF_NAME")
if not branch:
    print("No GitHub branch context is available; leaving files in the job workspace.")
    raise SystemExit(0)

commands = [
    ["git", "config", "user.name", "github-actions[bot]"],
    ["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
    ["git", "add", "--", str(ROOT)],
]
for command in commands:
    subprocess.run(command, check=True)

if subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
    print("Recovered files are already committed.")
    raise SystemExit(0)

subprocess.run(
    ["git", "commit", "-m", "research: preserve recovered named holder datasets [skip ci]"],
    check=True,
)
completed = subprocess.run(
    ["git", "push", "origin", f"HEAD:{branch}"],
    check=False,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)
print(completed.stdout)
if completed.returncode != 0:
    print("The workflow token could not push. The log payload remains available for recovery.")
