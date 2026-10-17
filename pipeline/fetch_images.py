#!/usr/bin/env python3
"""
Download one representative photo per province (+ 4 banner photos) from Wikipedia/Wikimedia Commons,
store them in assets/img and write data/images.js with the file name, licence and author of each photo.

Only the *picture* of a place is used - no statistic comes from here.
If no picture is found the dashboard shows "ไม่มีรูปภาพ" (nothing is invented).
Run:  python pipeline/fetch_images.py
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
os.makedirs(os.path.join(IMG, "province"), exist_ok=True)
os.makedirs(os.path.join(IMG, "banner"), exist_ok=True)
UA = "ThaiTourismDashboard/1.0 (educational project)"

geo = json.load(open(os.path.join(ROOT, "raw", "provinces.geojson"), encoding="utf-8"))
provs = {int(f["properties"]["pro_code"]): f["properties"] for f in geo["features"]}

# Curated main attraction (English Wikipedia title) per province. First hit with a photo wins;
# the fallback is the lead photo of the province article, and the caption says so.
ATTRACTION = {
    "Bangkok": ["Wat Phra Kaew"],
    "Chon Buri": ["Sanctuary of Truth", "Pattaya"],
    "Phuket": ["Promthep Cape", "Patong"],
    "Chiang Mai": ["Wat Phra That Doi Suthep"],
    "Krabi": ["Railay Beach", "Ao Nang"],
    "Kanchanaburi": ["Bridge over the River Kwai", "Erawan National Park"],
    "Surat Thani": ["Ko Samui", "Khao Sok National Park"],
    "Prachuap Khiri Khan": ["Hua Hin"],
    "Phetchaburi": ["Phra Nakhon Khiri"],
    "Phra Nakhon Si Ayutthaya": ["Ayutthaya Historical Park", "Wat Mahathat (Ayutthaya)"],
    "Nakhon Ratchasima": ["Khao Yai National Park"],
    "Rayong": ["Ko Samet"],
    "Phang-nga": ["Phang Nga Bay"],
    "Songkhla": ["Samila Beach", "Songkhla"],
    "Chiang Rai": ["Wat Rong Khun"],
    "Khon Kaen": ["Phu Wiang National Park", "Khon Kaen"],
    "Udon Thani": ["Ban Chiang", "Red Lotus Lake"],
    "Nong Khai": ["Sala Keoku", "Nong Khai"],
    "Nakhon Si Thammarat": ["Wat Phra Mahathat Woramahawihan"],
    "Sukhothai": ["Sukhothai Historical Park"],
    "Mae Hong Son": ["Pai, Thailand", "Wat Phra That Doi Kong Mu"],
    "Nan": ["Wat Phumin"],
    "Lop Buri": ["Phra Prang Sam Yot"],
    "Trat": ["Ko Chang"],
    "Chanthaburi": ["Chanthaburi Cathedral"],
    "Loei": ["Phu Kradueng National Park"],
    "Tak": ["Thi Lo Su Waterfall", "Umphang"],
    "Phitsanulok": ["Wat Phra Si Rattana Mahathat (Phitsanulok)"],
    "Ubon Ratchathani": ["Pha Taem National Park"],
    "Nakhon Pathom": ["Phra Pathommachedi"],
    "Ratchaburi": ["Damnoen Saduak Floating Market"],
    "Samut Songkhram": ["Maeklong Railway Market", "Amphawa Floating Market"],
    "Lampang": ["Wat Phra That Lampang Luang"],
    "Saraburi": ["Phra Phutthabat"],
    "Buri Ram": ["Phanom Rung"],
    "Surin": ["Prasat Sikhoraphum"],
    "Sakon Nakhon": ["Phra That Choeng Chum"],
    "Nakhon Phanom": ["Phra That Phanom"],
    "Phetchabun": ["Khao Kho", "Phu Hin Rong Kla National Park"],
    "Trang": ["Ko Libong", "Trang"],
    "Satun": ["Ko Tarutao"],
    "Ranong": ["Ranong"],
    "Chumphon": ["Ko Tao", "Chumphon"],
    "Samut Prakan": ["Erawan Museum", "Ancient City (Muang Boran)"],
    "Nonthaburi": ["Koh Kret"],
    "Pathum Thani": ["Wat Phra Dhammakaya"],
    "Samut Sakhon": ["Mahachai"],
    "Prachin Buri": ["Khao Yai National Park"],
    "Sa Kaeo": ["Prasat Khao Noi"],
    "Chachoengsao": ["Wat Sothonwararam"],
    "Kamphaeng Phet": ["Kamphaeng Phet Historical Park"],
    "Uthai Thani": ["Wat Tha Sung"],
    "Amnat Charoen": ["Phu Sa Dok Bua"],
    "Mukdahan": ["Mukdahan"],
}

BANNERS = {
    "sea": ["Maya Bay", "Phi Phi Islands"],
    "mountain": ["Doi Inthanon", "Doi Inthanon National Park"],
    "waterfall": ["Erawan Falls", "Erawan National Park"],
    "temple": ["Wat Phra Kaew"],
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    err = None
    for attempt in range(6):
        try:
            time.sleep(1.2)  # be polite to Wikimedia servers (they answer 429 otherwise)
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(10 * (attempt + 1))
    raise err


def api(params, host="en.wikipedia.org"):
    return json.loads(get("https://%s/w/api.php?%s" % (host, urllib.parse.urlencode(params))))


def page_image(title, width):
    d = api({"action": "query", "titles": title, "prop": "pageimages", "piprop": "name|thumbnail",
             "pithumbsize": width, "redirects": 1, "format": "json"})
    for p in d["query"]["pages"].values():
        if "thumbnail" in p and p.get("pageimage"):
            return p["title"], p["pageimage"], p["thumbnail"]["source"]
    return None


def licence(filename):
    d = api({"action": "query", "titles": "File:" + filename, "prop": "imageinfo", "iiprop": "extmetadata|url",
             "format": "json"}, host="commons.wikimedia.org")
    for p in d["query"]["pages"].values():
        ii = (p.get("imageinfo") or [{}])[0]
        m = ii.get("extmetadata", {})
        strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()  # noqa: E731
        return {
            "license": strip(m.get("LicenseShortName", {}).get("value")),
            "author": strip(m.get("Artist", {}).get("value"))[:120],
            "page": ii.get("descriptionurl", "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename)),
        }
    return {"license": "", "author": "", "page": ""}


def fetch(titles, width, dest):
    for t in titles:
        try:
            hit = page_image(t, width)
        except Exception as e:  # noqa: BLE001
            print("  api error", t, e)
            continue
        if not hit:
            continue
        title, fname, src = hit
        if not re.search(r"\.(jpe?g|png)$", fname, re.I):
            continue
        data = get(src)
        ext = ".jpg" if fname.lower().endswith(("jpg", "jpeg")) else ".png"
        path = dest + ext
        open(path, "wb").write(data)
        info = licence(fname)
        return {"file": os.path.relpath(path, ROOT).replace("\\", "/"), "subject": title, "commonsFile": fname, **info}
    return None


out = {"province": {}, "banner": {}}
for code, pr in sorted(provs.items()):
    en = pr["pro_en"]
    cands = ATTRACTION.get(en, [])
    r = fetch(cands, 640, os.path.join(IMG, "province", str(code))) if cands else None
    kind = "attraction"
    if r is None:
        r = fetch([en + " Province", en + " province", en], 640, os.path.join(IMG, "province", str(code)))
        kind = "province-article"
    if r:
        r["kind"] = kind
        out["province"][str(code)] = r
    print(code, en, "->", (r or {}).get("subject"), kind if r else "NO IMAGE")
for k, titles in BANNERS.items():
    r = fetch(titles, 1200, os.path.join(IMG, "banner", k))
    if r:
        out["banner"][k] = r
    print("banner", k, "->", (r or {}).get("subject"))
with open(os.path.join(ROOT, "data", "images.js"), "w", encoding="utf-8") as f:
    f.write("window.DASH_IMAGES=")
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print("done", len(out["province"]), "province images,", len(out["banner"]), "banners")
