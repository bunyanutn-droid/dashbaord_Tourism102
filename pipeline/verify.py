#!/usr/bin/env python3
"""
Independent check that numbers embedded in data/dataset.json match the RAW source files.
Re-reads raw/ with separate code (no shared logic with build_data.py except name matching) and compares.
Run:  python pipeline/verify.py     -> exit code 0 = all checks passed
"""
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ds = json.load(open(os.path.join(ROOT, "data", "dataset.json"), encoding="utf-8"))
raw = json.load(open(os.path.join(ROOT, "raw", "trend-domistic-tourists.json"), encoding="utf-8"))
norm = lambda s: s.replace("\xa0", "").replace(" ", "").replace("ํา", "ำ")  # noqa: E731
by_th = {norm(p["th"]): p for p in ds["provinces"]}
ok = True


def check(name, cond, detail=""):
    global ok
    print(("PASS " if cond else "FAIL ") + name + (" - " + detail if detail and not cond else ""))
    ok &= bool(cond)


# 1. tourism: yearly sums per province from raw (excluding the duplicate keys) == embedded sums
cnt = defaultdict(int)
for r in raw:
    cnt[(r["YearInfo"], r["MonthInfo"], r["ProvinceID"])] += 1
sums = defaultdict(lambda: [0, 0])
for r in raw:
    if cnt[(r["YearInfo"], r["MonthInfo"], r["ProvinceID"])] > 1:
        continue
    k = (r["YearInfo"], by_th[norm(r["Province"])]["idx"])
    sums[k][0] += r["InternalAmount"]
    sums[k][1] += r["ForeignerInternalAmount"]
emb = defaultdict(lambda: [0, 0])
for pi, y, m, th, fo, *_ in ds["tourism"]["rows"]:
    emb[(y, pi)][0] += th
    emb[(y, pi)][1] += fo
check("tourism: province-year sums identical to raw (%d groups)" % len(sums), dict(sums) == dict(emb))
check("tourism: row count = raw rows - dropped duplicates", len(ds["tourism"]["rows"]) == len(raw) - len(ds["tourism"]["droppedDuplicates"]))

# 2. GPP: every embedded value appears in the raw table text on the right row
line_re = re.compile(r"^(\S+?)[.…]*\s+([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) (.+)$")
lines = [line_re.match(l.strip()) for l in open(os.path.join(ROOT, "raw", "gpp_chain_volume_t10_15_text.txt"), encoding="utf-8")]
by_en = {re.sub(r"[^a-z]", "", p["en"].lower()): p["code"] for p in ds["provinces"]}
seen = 0
bad = []
for m in lines:
    if not m:
        continue
    code = by_en.get(re.sub(r"[^a-z]", "", m.group(8).lower()))
    if code is None:
        continue
    v = [int(x.replace(",", "")) for x in m.groups()[1:7]]
    g = ds["gpp"][str(code)]
    if [g["gpp"]["2021"], g["gpp"]["2022"], g["gpp"]["2023"], g["perCapita"]["2021"], g["perCapita"]["2022"], g["perCapita"]["2023"]] != v:
        bad.append(code)
    seen += 1
check("GPP: %d provinces identical to table 10.15 text" % seen, seen == 77 and not bad, str(bad))

# 3. CPI: embedded series identical to the saved API responses
cpi_dir = os.path.join(ROOT, "raw", "cpi")
n = 0
bad = []
for f in sorted(os.listdir(cpi_dir)) if os.path.isdir(cpi_dir) else []:
    code, idx = f[:-5].split("_")
    data = json.load(open(os.path.join(cpi_dir, f), encoding="utf-8"))
    if not data:
        continue
    e = ds["cpi"]["series"].get(code, {}).get(idx)
    want = sorted([r["year"], r["month"], r["price_index"], r["yoy"]] for r in data)
    if e != want:
        bad.append(f)
    n += 1
check("CPI: %d saved API files identical to embedded series; base year 2019" % n, not bad and ds["cpi"]["baseYear"] == 2019, str(bad[:5]))

# 4. no non-finite numbers anywhere
txt = open(os.path.join(ROOT, "data", "dataset.json"), encoding="utf-8").read()
check("no NaN/Infinity in dataset.json", not re.search(r"\bNaN\b|Infinity", txt))
print("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
