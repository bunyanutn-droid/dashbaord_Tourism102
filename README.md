# แดชบอร์ดท่องเที่ยว เศรษฐกิจ และค่าครองชีพรายจังหวัด
https://bunyanutn-droid.github.io/dashbaord_Tourism102/
ใช้ข้อมูลทางการเท่านั้น ไม่มีข้อมูลจำลอง — ดูรายละเอียดแหล่งข้อมูลและข้อจำกัดในแท็บ “แหล่งข้อมูลและวิธีวิเคราะห์”

## เปิดใช้งาน
```bash
python server.py          # แบ็กเอนด์ Python (ไลบรารีมาตรฐาน) -> http://localhost:8000
```
หรือเปิด `index.html` ตรง ๆ (ใช้ข้อมูลที่ฝังใน `data/*.js`)

## โครงสร้าง
| ส่วน | ไฟล์ |
|---|---|
| แบ็กเอนด์ (Python) | `server.py` — `/api/dataset`, `/api/geo`, `/api/rebuild` |
| ดึงข้อมูล | `pipeline/fetch_images.py` (Wikimedia) |
| ประมวลผล | `pipeline/build_data.py` → `data/dataset.json`, `data/dataset.js`, `data/provinces.geo.js` |
| ตรวจความถูกต้อง | `pipeline/verify.py` (เทียบข้อมูลที่ฝังกับไฟล์ใน `raw/`) |
| แสดงผล | `index.html`, `css/`, `js/` (Plotly และ Leaflet ใน `vendor/`) |
| ข้อมูลต้นฉบับ | `raw/` |

## เพิ่ม/อัปเดตข้อมูล
1. วางไฟล์ใหม่ใน `raw/` (เช่น `trend-domistic-tourists.json` ฉบับล่าสุด) แล้ว `python pipeline/build_data.py`
2. ตรวจ: `python pipeline/verify.py`

## สถานะข้อมูล
- นักท่องเที่ยว รายได้จากนักท่องเที่ยว และ GPP ครบ 77 จังหวัด; GPP เทียบได้เฉพาะปี 2021–2022
- หน่วยของ “รายได้จากนักท่องเที่ยว” ในชุดข้อมูลต้นทางไม่ได้ระบุ แดชบอร์ดอ่านเป็นล้านบาท (ตีความ) — ดูหน้า “แหล่งข้อมูลและวิธีวิเคราะห์”
- ห้องพัก: ภาพรวมปัจจุบันจากฐานข้อมูลที่พักของ ททท. (ไม่ใช่รายปี)
- รูปภาพ: Wikimedia Commons ผู้ถ่ายและใบอนุญาตอยู่ใน `data/images.js`
