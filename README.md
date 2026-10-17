# แดชบอร์ดท่องเที่ยว เศรษฐกิจ และค่าครองชีพรายจังหวัด

ใช้ข้อมูลทางการเท่านั้น ไม่มีข้อมูลจำลอง — ดูรายละเอียดแหล่งข้อมูลและข้อจำกัดในแท็บ “แหล่งข้อมูลและวิธีวิเคราะห์”

## เปิดใช้งาน
```bash
python server.py          # แบ็กเอนด์ Python (ไลบรารีมาตรฐาน) -> http://localhost:8000
```
หรือเปิด `index.html` ตรง ๆ (ใช้ข้อมูลที่ฝังใน `data/*.js`; ไม่มีการเก็บไฟล์อัปโหลด/ปุ่มดึง CPI)

## โครงสร้าง
| ส่วน | ไฟล์ |
|---|---|
| แบ็กเอนด์ (Python) | `server.py` — `/api/dataset`, `/api/upload/<airport\|budget>`, `/api/rebuild`, `/api/refresh-cpi` |
| ดึงข้อมูล | `pipeline/fetch_cpi.py` (API กระทรวงพาณิชย์), `pipeline/fetch_images.py` (Wikimedia) |
| ประมวลผล | `pipeline/build_data.py` → `data/dataset.json`, `data/dataset.js`, `data/provinces.geo.js` |
| ตรวจความถูกต้อง | `pipeline/verify.py` (เทียบข้อมูลที่ฝังกับไฟล์ใน `raw/`) |
| แสดงผล | `index.html`, `css/`, `js/` (Plotly, Leaflet, Papa Parse, SheetJS ใน `vendor/`) |
| ข้อมูลต้นฉบับ | `raw/` |

## เพิ่ม/อัปเดตข้อมูล
1. วางไฟล์ใหม่ใน `raw/` (เช่น `trend-domistic-tourists.json` ฉบับล่าสุด) แล้ว `python pipeline/build_data.py`
2. CPI: `python pipeline/fetch_cpi.py` (ช้า และบางครั้งกระทรวงตอบ HTTP 500/504 — สคริปต์ลองซ้ำและข้ามไฟล์ที่ได้แล้ว) แล้ว build
3. ข้อมูลสนามบิน/งบประมาณ: อัปโหลด CSV/Excel ที่หน้า “ปัจจัยการกระจุกตัว” (คอลัมน์ `province, year, passengers` / `province, year, budget`)
4. ตรวจ: `python pipeline/verify.py`

## สถานะข้อมูล (ณ 17 ต.ค. 2026)
- นักท่องเที่ยวและ GPP ครบ 77 จังหวัด; GPP เทียบได้เฉพาะปี 2021–2022
- **CPI ยังไม่ครบ**: API กระทรวงพาณิชย์ตอบ HTTP 500/504 จึงมีข้อมูลเพียงบางจังหวัด (หน้าค่าครองชีพจะเตือนและไม่สรุปผล) — รัน `python pipeline/fetch_cpi.py` ซ้ำแล้ว `python pipeline/build_data.py`
- สนามบิน/คมนาคม/งบประมาณรายจังหวัด/เอกสารนโยบาย: ไม่มีแหล่งที่ตรวจสอบได้ (ใช้ปุ่มอัปโหลด)
- รูปภาพ: Wikimedia Commons ผู้ถ่ายและใบอนุญาตอยู่ใน `data/images.js`
