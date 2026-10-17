#!/usr/bin/env python3
"""
Build data/dataset.json + data/dataset.js (+ data/provinces.geo.js) for the dashboard
from the RAW files in ../raw. Standard library only.

Layers (kept apart on purpose):
  1. LOAD   - read raw files exactly as published (no edits)
  2. CLEAN  - normalise province names, drop duplicate / invalid rows (every drop is logged)
  3. EXPORT - write the compact dataset the front-end reads

Nothing is imputed. A value that is missing in the source stays missing (null).
Run:  python pipeline/build_data.py
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "data")
ACCESS_DATE = "2026-10-17"
os.makedirs(OUT, exist_ok=True)

log = []  # human-readable data-quality log, shipped to the Methodology page


def note(msg):
    log.append(msg)
    print(msg)


def norm(s):
    """Normalise Thai province spellings for joining."""
    s = (s or "").replace("\xa0", "").replace(" ", "").replace("ํา", "ำ").strip()
    return s


# ---------------------------------------------------------------- 1. LOAD
geo = json.load(open(os.path.join(RAW, "provinces.geojson"), encoding="utf-8"))
tour = json.load(open(os.path.join(RAW, "trend-domistic-tourists.json"), encoding="utf-8"))

REGION_TH = {
    "North": "ภาคเหนือ", "Northeast": "ภาคตะวันออกเฉียงเหนือ", "Central": "ภาคกลาง",
    "East": "ภาคตะวันออก", "West": "ภาคตะวันตก", "South": "ภาคใต้",
}

# ---------------------------------------------------------------- 2a. province master (from official boundary file)
provinces = []
by_name = {}
by_code = {}
for f in geo["features"]:
    p = f["properties"]
    reg = REGION_TH.get(p["reg_royin"])
    if reg is None:
        sys.exit("unknown region value %r" % p["reg_royin"])
    rec = {
        "code": int(p["pro_code"]), "th": p["pro_th"], "en": p["pro_en"],
        "region": reg, "areaSqKm": round(p["area_sqkm"], 1),
    }
    provinces.append(rec)
provinces.sort(key=lambda r: r["code"])
for i, r in enumerate(provinces):
    r["idx"] = i
    by_name[norm(r["th"])] = r
    by_code[r["code"]] = r
assert len(provinces) == 77

# ---------------------------------------------------------------- 2b. tourism (monthly)
key_count = Counter((r["YearInfo"], r["MonthInfo"], r["ProvinceID"]) for r in tour)
tour_rows, dropped_dups = [], []
src_id_to_prov = {}
city_type = {}
for r in tour:
    prov = by_name.get(norm(r["Province"]))
    if prov is None:
        sys.exit("tourism province not matched: %r" % r["Province"])
    src_id_to_prov[r["ProvinceID"]] = prov["code"]
    city_type[prov["code"]] = r["CityType"]
    if key_count[(r["YearInfo"], r["MonthInfo"], r["ProvinceID"])] > 1:
        dropped_dups.append((r["YearInfo"], r["MonthInfo"], prov["th"]))
        continue
    tour_rows.append([
        prov["idx"], r["YearInfo"], r["MonthInfo"],
        r["InternalAmount"], r["ForeignerInternalAmount"],
        r["InternalIncome"], r["ForeignersinternalIncome"], r["OR"],
    ])
assert len(src_id_to_prov) == 77
dup_keys = sorted({(y, m) for y, m, _ in dropped_dups})
note("ท่องเที่ยว: อ่านได้ %d แถว; ตัดแถวซ้ำที่ค่าไม่ตรงกัน %d แถว (%d จังหวัด-เดือน, เดือน %s) เพราะระบุไม่ได้ว่าแถวใดถูกต้อง"
     % (len(tour), len(dropped_dups), len(dropped_dups) // 2,
        ", ".join("%d-%02d" % k for k in dup_keys)))

for p in provinces:
    p["cityType"] = "เมืองหลัก" if city_type[p["code"]].strip() == "เมืองหลัก" else "เมืองรอง"
assert Counter(p["cityType"] for p in provinces)["เมืองหลัก"] > 0

# months present per (year, province) after cleaning
present = defaultdict(set)
for pi, y, m, *_ in tour_rows:
    present[(y, pi)].add(m)
missing_months = []
for y in sorted({k[0] for k in present}):
    expect = range(1, 8) if y == 2023 else range(1, 13)
    for p in provinces:
        miss = [m for m in expect if m not in present[(y, p["idx"])]]
        if miss:
            missing_months.append((y, p["th"], miss))
for y, name, miss in missing_months:
    if y != 2021:
        note("ท่องเที่ยว: %s ปี %d ไม่มีข้อมูลเดือน %s" % (name, y, miss))
n21 = sum(1 for y, _, _ in missing_months if y == 2021)
note("ท่องเที่ยว: ปี 2021 มี %d จังหวัดที่ขาดเดือน ม.ค. (เพราะตัดแถวซ้ำ)" % n21)

# "common months": months for which EVERY province has a valid row -> comparable windows across provinces
common_months = {}
for y in sorted({k[0] for k in present}):
    expect = list(range(1, 8)) if y == 2023 else list(range(1, 13))
    ok = [m for m in expect if all(m in present[(y, p["idx"])] for p in provinces)]
    common_months[y] = ok

# ---------------------------------------------------------------- 2c. GPP chain-volume 2021-2023 (NESDC via NSO Statistical Yearbook 2025, table 10.15)
gpp = {}
line_re = re.compile(r"^(\S+?)[.…]*\s+([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) (.+)$")
en_to_prov = {re.sub(r"[^a-z]", "", p["en"].lower()): p for p in provinces}
manual_en = {"phranakhonsiayutthaya": "phranakhonsiayutthaya"}
unmatched = []
regional_rows = []
for line in open(os.path.join(RAW, "gpp_chain_volume_t10_15_text.txt"), encoding="utf-8"):
    m = line_re.match(line.strip())
    if not m:
        continue
    th, vals, en = m.group(1), [int(x.replace(",", "")) for x in m.groups()[1:7]], m.group(8)
    if th.startswith("ภาค") or th.startswith("กรุงเทพมหานครและ"):
        regional_rows.append((th, en))
        continue
    prov = by_name.get(norm(th)) or en_to_prov.get(re.sub(r"[^a-z]", "", en.lower()))
    if prov is None:
        unmatched.append((th, en))
        continue
    gpp[prov["code"]] = {
        "gpp": {2021: vals[0], 2022: vals[1], 2023: vals[2]},
        "perCapita": {2021: vals[3], 2022: vals[4], 2023: vals[5]},
    }
if unmatched:
    sys.exit("GPP rows not matched: %s" % unmatched)
assert len(gpp) == 77, len(gpp)
note("GPP: จับคู่ได้ %d/77 จังหวัด (NESDC ปริมาณลูกโซ่ ปีอ้างอิง 2545; 2564r 2565 2566p)" % len(gpp))

# ---------------------------------------------------------------- 2d. accommodation snapshot (TAT data catalog)
accom = {}
for row in csv.DictReader(open(os.path.join(RAW, "accommodation_by_province.csv"), encoding="utf-8-sig")):
    prov = by_name.get(norm(row["province"]))
    if prov is None:
        sys.exit("accommodation province not matched %r" % row["province"])
    accom[prov["code"]] = {"listings": int(row["listings"]), "rooms": int(row["rooms"])}
note("ที่พัก: TAT Data Catalog ภาพรวม ณ วันดึงข้อมูล (snapshot) %d จังหวัด" % len(accom))

# ---------------------------------------------------------------- 3. EXPORT
dataset = {
    "generated": ACCESS_DATE,
    "provinces": provinces,
    "tourism": {
        "columns": ["provIdx", "year", "month", "thai", "foreign", "thaiIncomeMB", "foreignIncomeMB", "occupancyPct"],
        "rows": tour_rows,
        "commonMonths": {str(k): v for k, v in common_months.items()},
        "droppedDuplicates": [[y, m, n] for y, m, n in dropped_dups],
    },
    "gpp": {str(c): v for c, v in gpp.items()},
    "accommodation": {str(c): v for c, v in accom.items()},
    "quality": log,
}
with open(os.path.join(OUT, "dataset.json"), "w", encoding="utf-8") as f:
    json.dump(dataset, f, ensure_ascii=False, separators=(",", ":"))
with open(os.path.join(OUT, "dataset.js"), "w", encoding="utf-8") as f:
    f.write("window.DASH_DATA=")
    json.dump(dataset, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

# simplified geometry (rounded coordinates) keyed by province code
def rnd(c):
    return [round(c[0], 3), round(c[1], 3)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]


feats = []
for ft in geo["features"]:
    feats.append({"type": "Feature", "properties": {"code": int(ft["properties"]["pro_code"])},
                  "geometry": {"type": ft["geometry"]["type"], "coordinates": rnd(ft["geometry"]["coordinates"])}})
with open(os.path.join(OUT, "provinces.geo.js"), "w", encoding="utf-8") as f:
    f.write("window.DASH_GEO=")
    json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    f.write(";\n")
print("wrote", os.listdir(OUT))
