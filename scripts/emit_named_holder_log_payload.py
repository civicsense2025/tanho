#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
from pathlib import Path

ROOT = Path("research/named-holder-data/normalized")
CANDIDATES = [
    ROOT / "all-public-source-named-holder-assertions.csv",
    ROOT / "nps-st-louis-1860-named-holders.csv",
    ROOT / "nps-st-louis-1850-named-holders.csv",
]

for path in CANDIDATES:
    if not path.exists():
        continue
    payload = gzip.compress(path.read_bytes(), compresslevel=9)
    encoded = base64.b64encode(payload).decode("ascii")
    print(f"NAMED_HOLDER_PAYLOAD_BEGIN filename={path.name} encoding=gzip+base64 bytes={path.stat().st_size}")
    for start in range(0, len(encoded), 8000):
        print(encoded[start:start + 8000])
    print("NAMED_HOLDER_PAYLOAD_END")
    break
else:
    print("NAMED_HOLDER_PAYLOAD_MISSING")
