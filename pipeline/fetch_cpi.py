#!/usr/bin/env python3
"""
Download provincial CPI from the Ministry of Commerce open API (no key required) into raw/cpi/.
  GET https://dataapi.moc.go.th/cpip-indexes?province_code=..&index_id=..&from_year=..&to_year=..
Docs: https://data.moc.go.th/OpenData/CPIPIndexes   (the API is slow: ~30-60 s per call; we run 3 in parallel and retry)

Province codes are the 2-digit DOPA codes. Bangkok (10) returns an empty list - kept as "no data".
Run:  python pipeline/fetch_cpi.py [from_year] [to_year]
"""
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "raw", "cpi")
os.makedirs(OUT, exist_ok=True)
FROM, TO = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (2015, 2023)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"   # the server drops requests without a browser-like UA
# total, food & non-alcoholic beverages, household, housing, transport & communication, public transport fares
INDEXES = ["0000000000000000", "1000000000000000", "3000000000000000", "3100000000000000", "5000000000000000", "5100000000000000"]

geo = json.load(open(os.path.join(ROOT, "raw", "provinces.geojson"), encoding="utf-8"))
codes = sorted(int(f["properties"]["pro_code"]) for f in geo["features"])


def job(args):
    code, idx = args
    path = os.path.join(OUT, "%d_%s.json" % (code, idx))
    if os.path.exists(path):
        try:
            if json.load(open(path, encoding="utf-8")):
                return path, "cached"
        except Exception:  # noqa: BLE001  (an HTML error page saved earlier)
            pass
    url = "https://dataapi.moc.go.th/cpip-indexes?province_code=%d&index_id=%s&from_year=%d&to_year=%d" % (code, idx, FROM, TO)
    err = ""
    for attempt in range(6):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=200).read()
            parsed = json.loads(data)              # the server sometimes answers with an HTML error page under load
            if parsed:
                open(path, "wb").write(data)
                return path, "ok"
            return path, "empty"                   # valid empty list (e.g. Bangkok)
        except Exception as e:  # noqa: BLE001
            err = str(e)
            time.sleep(5 * (attempt + 1))
    return path, "FAILED " + err


PASSES = 4   # the ministry API is sometimes down (HTTP 500/504): sweep several times, files already saved are skipped
todo = [(c, i) for i in INDEXES for c in codes]   # headline index for every province first
if os.environ.get("CPI_REVERSE"):   # second worker process: walk the list from the end
    todo.reverse()
for n in range(PASSES):
    failed = []
    with ThreadPoolExecutor(int(os.environ.get("CPI_WORKERS", "3"))) as ex:
        for (c, i), (p, st) in zip(todo, ex.map(job, todo)):
            if st.startswith("FAILED"):
                failed.append((c, i))
    print("pass %d: %d of %d requests still failing" % (n + 1, len(failed), len(todo)), flush=True)
    todo = failed
    if not todo:
        break
    time.sleep(120)
print("done; missing:", todo)
