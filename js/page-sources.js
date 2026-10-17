/* Page 5 - Data sources, methodology, data quality, downloads. */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  const A = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t || u}</a>`;
  let built = false;

  function build() {
    const D = TD.D;
    $("src-date").textContent = D.generated;

    const ok = '<span class="badge raw">ใช้ได้</span>', part = '<span class="badge calc">ใช้บางส่วน</span>', no = '<span class="badge na">ใช้ไม่ได้</span>', nv = '<span class="badge na">ไม่ได้ตรวจสอบ</span>';
    const rows = [
      { n: "การกระจายตัวของนักท่องเที่ยวชาวไทยและต่างชาติ", o: "กระทรวงการท่องเที่ยวและกีฬา (สำนักงานปลัดกระทรวง)", u: A("https://data.go.th/dataset/trend_domestic_tourists"),
        s: ok + " หน้าชุดข้อมูลเปิดได้ (HTTP 200) · ไฟล์ <code>trend-domistic-tourists.json</code> (resource เดียวกับที่ลิงก์ในหน้านั้น) ตรวจโครงสร้างแล้ว", p: "ม.ค. 2015 – ก.ค. 2023 รายเดือน", un: "คน (นักท่องเที่ยวไทย/ต่างชาติ); รายได้จากนักท่องเที่ยว: เมทาดาทาของชุดข้อมูลไม่ระบุหน่วย — แดชบอร์ดอ่านเป็น “ล้านบาท” (ตีความ: ผลรวมระดับประเทศปี 2019 ในไฟล์ ≈ 2.78 ล้านล้านบาท หากหน่วยเป็นล้านบาท) จึงควรใช้เปรียบเทียบระหว่างจังหวัด ไม่ใช่อ้างเป็นตัวเลขทางการสัมบูรณ์", c: "77 จังหวัด; มีทั้งไทยและต่างชาติ" },
      { n: "ผลิตภัณฑ์มวลรวมจังหวัด (GPP) และ GPP ต่อหัว — ปริมาณลูกโซ่ ปีอ้างอิง 2545", o: "สำนักงานสภาพัฒนาการเศรษฐกิจและสังคมแห่งชาติ (สศช.) เผยแพร่ซ้ำในหนังสือสถิติรายปี สสช.", u: A("https://www.nso.go.th/public/e-book/Statistical-Yearbook/SYB-2025_webPage/File%20SYB/2025/10/T%2010.15%202025.pdf", "สสช. SYB 2025 ตาราง 10.15 (PDF)") + "<br>" + A("https://www.nesdc.go.th/", "nesdc.go.th"),
        s: part + " เว็บ สศช. เปิดได้แต่ลิงก์ไฟล์ถูกสร้างด้วย JavaScript ดึงไฟล์ตรงไม่ได้ จึงใช้ตาราง 10.15 ที่ระบุที่มาเป็น สศช. (อ่านจาก PDF ด้วย pdftotext และตรวจจับคู่ครบ 77 จังหวัด)", p: "2564r (2021), 2565 (2022), 2566p (2023, ค่าเบื้องต้น)", un: "ล้านบาท; ต่อคน = บาท/คน/ปี", c: "77 จังหวัด" },
      { n: "GPP (ราคาประจำปี?) ไฟล์ CSV บนพอร์ทัลข้อมูลจังหวัดกาญจนบุรี", o: "สศช. (โฮสต์โดยจังหวัดกาญจนบุรี)", u: A("https://gdcatalog.go.th/dataset/gdpublish-gpp2"),
        s: no + " ดาวน์โหลดได้ แต่ครอบคลุมเพียง 63 จังหวัด (ขาดจังหวัดภาคกลางและตะวันออก 14 จังหวัด เช่น ชลบุรี ระยอง อยุธยา) และค่ามากกว่าปริมาณลูกโซ่มาก (เข้าใจว่าเป็นอีกฐานการวัด) — ไม่ผสมกับตาราง 10.15 เพื่อไม่ให้ฐานต่างกัน", p: "2012–2023", un: "ล้านบาท", c: "63 จังหวัด (เก็บไว้ที่ raw/ เพื่อตรวจสอบ ไม่ใช้)" },
      { n: "สถิติท่าอากาศยาน (ผู้โดยสาร เที่ยวบิน)", o: "ท่าอากาศยานไทย / กรมท่าอากาศยาน / กระทรวงคมนาคม", u: A("https://www.airportthai.co.th/") + "<br>" + A("https://data.mot.go.th/") + "<br>" + A("https://datagov.mot.go.th/en/dataset/number-of-airports", "datagov.mot.go.th (จำนวนท่าอากาศยาน)"),
        s: no + " หน้าแรก airportthai.co.th เปิดได้ แต่ไม่พบไฟล์สถิติรายท่าอากาศยานที่ดาวน์โหลดได้; data.mot.go.th เชื่อมต่อไม่ได้; ชุดของ MOT มีเฉพาะ “จำนวนท่าอากาศยาน” ระดับประเทศ", p: "–", un: "–", c: "ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์ จึงไม่แสดงในแดชบอร์ด" },
      { n: "ข้อมูลที่พัก (accommodation.json)", o: "การท่องเที่ยวแห่งประเทศไทย (ททท.) — TAT Data Catalog", u: A("https://datacatalog.tat.or.th/dataset/accommodation"),
        s: part + " ดาวน์โหลดสำเร็จ 27,241 รายการ (ไฟล์ ~78 MB; เก็บเฉพาะผลรวมรายจังหวัดใน raw/accommodation_by_province.csv) เป็นภาพรวมปัจจุบัน ไม่ใช่อนุกรมเวลา", p: "ภาพรวม ณ " + D.generated, un: "แห่ง / ห้อง", c: "77 จังหวัด; ไม่ใช่สำมะโน และไม่ระบุปีเปิดกิจการส่วนใหญ่" },
      { n: "จำนวนที่พักที่ได้รับมาตรฐาน (SHA) ระดับจังหวัด", o: "ททท. / กรมการท่องเที่ยว", u: A("https://datacatalog.tat.or.th/dataset/sha") + "<br>" + A("https://www.dot.go.th/"),
        s: no + " ชุด SHA ของ ททท. เป็นระดับประเทศ (ตามประเภทธุรกิจ) ไม่แยกจังหวัด; www.dot.go.th ไม่พบชุดข้อมูลรายจังหวัดที่ตรวจสอบได้", p: "–", un: "–", c: "ไม่มีข้อมูลเพียงพอ" },
      { n: "แผนพัฒนาการท่องเที่ยวแห่งชาติ / นโยบายเมืองรอง / งบประมาณรายจังหวัด", o: "กระทรวงการท่องเที่ยวและกีฬา, สศช., กรมสรรพากร", u: A("https://www.mots.go.th/") + "<br>" + A("https://www.nesdc.go.th/") + "<br>" + A("https://www.rd.go.th/"),
        s: nv + " หน้าแรกเปิดได้ แต่ยังไม่พบ/ไม่ได้เปิดอ่านเอกสารฉบับเต็มที่ตรวจสอบ URL ได้ (สำเนาแผนฯ ฉบับที่ 3 พ.ศ. 2566–2570 ที่ค้นพบอยู่บนเว็บสำนักงานจังหวัด ไม่สามารถดาวน์โหลดตรวจเนื้อหาได้)", p: "–", un: "–", c: "ไม่นำมาใช้เชิงตัวเลข · ไม่มีข้อมูลงบประมาณรายจังหวัด" },
      { n: "ขอบเขตจังหวัด (GeoJSON)", o: "OpenGISData-Thailand (อ้างอิงกรมการปกครอง)", u: A("https://github.com/chingchai/OpenGISData-Thailand"),
        s: ok + " ดาวน์โหลดได้ 77 จังหวัด · CC BY 4.0", p: "–", un: "–", c: "ใช้เป็นตารางรหัสจังหวัดกลาง และภูมิภาค (ราชบัณฑิตยสภา)" },
      { n: "รูปภาพสถานที่ท่องเที่ยว/แบนเนอร์", o: "Wikimedia Commons / Wikipedia", u: A("https://commons.wikimedia.org/"),
        s: ok + " ผู้ถ่ายและใบอนุญาตของแต่ละภาพเก็บใน <code>data/images.js</code>", p: "–", un: "–", c: "ใช้ประกอบการแสดงผลเท่านั้น ไม่เกี่ยวกับตัวเลขวิเคราะห์" },
    ];
    TD.table("src-table", [
      { k: "n", t: "ชุดข้อมูล", html: (r) => `<b>${r.n}</b>` }, { k: "o", t: "หน่วยงานต้นทาง" }, { k: "u", t: "ลิงก์", html: (r) => r.u },
      { k: "s", t: "สถานะการเข้าถึง/การใช้", html: (r) => r.s }, { k: "p", t: "ปี/ช่วงเวลา" }, { k: "un", t: "หน่วยวัด" }, { k: "c", t: "ความครอบคลุม" },
    ], rows);
    $("src-table").insertAdjacentHTML("beforeend", `<p class="src">วันที่เข้าถึงข้อมูล: ${D.generated} (ทุกแหล่ง) · ลิงก์ทั้งหมดเปิดได้จริงตอนตรวจ ยกเว้นที่ระบุว่าเชื่อมต่อไม่ได้</p>`);

    const dict = [
      { v: "นักท่องเที่ยวชาวไทย (InternalAmount)", d: "จำนวนนักท่องเที่ยวชาวไทยที่ไปแต่ละจังหวัดในเดือนนั้น", u: "คน", s: "กก.", t: "ต้นฉบับ" },
      { v: "นักท่องเที่ยวชาวต่างชาติ (ForeignerInternalAmount)", d: "จำนวนนักท่องเที่ยวชาวต่างชาติที่ไปแต่ละจังหวัดในเดือนนั้น (นับซ้ำข้ามจังหวัดได้)", u: "คน", s: "กก.", t: "ต้นฉบับ" },
      { v: "นักท่องเที่ยวรวม", d: "ไทย + ต่างชาติ ของเดือนที่ใช้ (ตามตัวเลือกเดือนร่วม)", u: "คน", s: "คำนวณ", t: "คำนวณ" },
      { v: "ประเภทเมือง (CityType)", d: "เมืองหลัก / เมืองรอง ตามที่ระบุในชุดข้อมูลต้นทาง", u: "–", s: "กก.", t: "ต้นฉบับ" },
      { v: "GPP", d: "ผลิตภัณฑ์มวลรวมจังหวัด ปริมาณลูกโซ่ ปีอ้างอิง 2545 (ราคาคงที่)", u: "ล้านบาท", s: "สศช.", t: "ต้นฉบับ" },
      { v: "รายได้จากนักท่องเที่ยว (InternalIncome / ForeignersinternalIncome)", d: "รายได้ที่เกิดจากนักท่องเที่ยวชาวไทย/ชาวต่างชาติในจังหวัดนั้น รวมรายเดือนตามเดือนที่ใช้ หน่วยในไฟล์ไม่ได้ระบุ — อ่านเป็นล้านบาท (ตีความ)", u: "ล้านบาท (ตีความ)", s: "กก.", t: "ต้นฉบับ" },
      { v: "รายได้ต่อนักท่องเที่ยว", d: "รายได้รวม ÷ จำนวนนักท่องเที่ยวรวม (ของจังหวัดและเดือนที่ใช้)", u: "บาท/คน (ตีความ)", s: "คำนวณ", t: "คำนวณ" },
      { v: "GPP ต่อหัว", d: "GPP ÷ ประชากรตามประมาณการ (สศช.)", u: "บาท/คน/ปี", s: "สศช.", t: "ต้นฉบับ" },
      { v: "จำนวนที่พัก / ห้องพัก", d: "จำนวนรายการ และผลรวมห้องพักของที่พักที่ลงทะเบียนในฐานข้อมูล ททท. แยกตามจังหวัด", u: "แห่ง / ห้อง", s: "ททท. (รวมโดยแดชบอร์ด)", t: "คำนวณ" },
    ];
    TD.table("src-dict", [{ k: "v", t: "ตัวแปร" }, { k: "d", t: "นิยาม" }, { k: "u", t: "หน่วย" }, { k: "s", t: "ที่มา" }, { k: "t", t: "ประเภท", html: (r) => (r.t === "ต้นฉบับ" ? TD.badge.raw : TD.badge.calc) }], dict);

    $("src-method").innerHTML = `<h2>วิธีทำความสะอาดและรวมชุดข้อมูล</h2><ol>
      <li><b>รหัสจังหวัดกลาง:</b> ใช้ตารางขอบเขตจังหวัด 77 จังหวัด (รหัส 2 หลักตามกรมการปกครอง) เป็นตัวเชื่อม; จับคู่ชื่อไทยหลังปรับสระ “ำ” และตัดช่องว่าง; ข้อมูลที่จับคู่ไม่ได้ทำให้สคริปต์หยุด (ไม่เดา)</li>
      <li><b>นักท่องเที่ยว:</b> ตรวจแถวซ้ำด้วยคีย์ (ปี, เดือน, จังหวัด) พบ ${D.tourism.droppedDuplicates.length / 2} จังหวัด-เดือนที่ซ้ำและค่าต่างกัน (ม.ค. 2021) จึงตัดทั้งสองแถว; ไม่เติมค่าที่ขาด</li>
      <li><b>เดือนร่วม (common months):</b> ปี 2021 ใช้ ก.พ.–ธ.ค., ปี 2022 ตัด ส.ค. (ไม่มีข้อมูล กทม./อยุธยา/ลำพูน) เพื่อให้ทุกจังหวัดถูกเทียบด้วยช่วงเวลาเดียวกัน; ปิดได้ที่ตัวกรอง</li>
      <li><b>GPP:</b> อ่านตาราง 10.15 จากข้อความ PDF แถวละจังหวัด (ชื่อไทย + ค่า 6 ตัว + ชื่ออังกฤษ) จับคู่ครบ 77 จังหวัด; ใช้เฉพาะปริมาณลูกโซ่ชุดเดียวกัน</li>
      <li><b>จับคู่ปี:</b> ปีนักท่องเที่ยว/รายได้ = ปี GPP ที่ผู้ใช้เลือก; GPP เปรียบเทียบได้เฉพาะ 2021–2022; ที่พัก (snapshot) เทียบเป็นภาพรวมพร้อมคำเตือน</li></ol>`;
    $("src-formulas").innerHTML = `<h2>สูตรที่ใช้</h2><ul>
      <li><b>Pearson r</b> = Σ(x−x̄)(y−ȳ) / √[Σ(x−x̄)²·Σ(y−ȳ)²] ; แสดงทั้งค่าจริงและหลังแปลง log₁₀ ทั้งสองแกน</li>
      <li><b>Spearman ρ</b> = Pearson r ของอันดับ (อันดับเท่ากันใช้ค่าเฉลี่ย) ; p-value สองทาง จาก t = ρ√((n−2)/(1−ρ²)), df = n−2</li>
      <li><b>จัดกลุ่ม 4 กลุ่ม:</b> สูง/ต่ำ เทียบค่ามัธยฐานของนักท่องเที่ยวและของ GPP (หรือ GPP ต่อหัว) ในจังหวัดที่แสดง</li>
      <li><b>รายได้ต่อนักท่องเที่ยว</b> = Σ รายได้ ÷ Σ นักท่องเที่ยว ในเดือนที่ใช้</li>
      <li><b>สัดส่วน N จังหวัดแรก</b> = Σ นักท่องเที่ยวของ N จังหวัดสูงสุด ÷ Σ ทั้ง 77 จังหวัด</li>
      <li><b>ค่าเฉลี่ยกลุ่ม</b> = ค่าเฉลี่ยเลขคณิตไม่ถ่วงน้ำหนักของจังหวัดในกลุ่ม</li>
      <li>ระดับการตีความ |ρ|: ≥ 0.7 สูง, 0.4–0.7 ปานกลาง, 0.2–0.4 ต่ำ, &lt; 0.2 ต่ำมาก (เกณฑ์ทั่วไป ไม่ใช่เกณฑ์ทางการ)</li></ul>`;

    // quality log
    $("src-quality").innerHTML = D.quality.map((q) => `<li>${TD.esc(q)}</li>`).join("");
    const used = D.tourism.rows.length;
    TD.table("src-counts", [{ k: "a", t: "ชุดข้อมูล" }, { k: "b", t: "จำนวนที่ใช้จริง", num: true }, { k: "c", t: "จำนวนที่หาย/ตัดออก" }, { k: "d", t: "หมายเหตุ" }], [
      { a: "นักท่องเที่ยว (จังหวัด-เดือน)", b: used, c: `ตัดแถวซ้ำ ${D.tourism.droppedDuplicates.length} แถว; ขาด ส.ค. 2022 อีก 3 จังหวัด-เดือน`, d: "7,928 แถวในไฟล์ต้นทาง ; ครอบคลุม 77 จังหวัด × 103 เดือน = 7,931 ช่อง" },
      { a: "GPP / GPP ต่อหัว (จังหวัด)", b: Object.keys(D.gpp).length, c: "0", d: "3 ปีต่อจังหวัด (ใช้ 2021–2022 เปรียบเทียบ)" },
      { a: "ที่พัก ททท. (จังหวัด)", b: Object.keys(D.accommodation).length, c: "รายการที่ไม่ระบุจังหวัด 4 รายการ", d: "27,237 รายการที่ใช้" },
    ]);

    /* ---- downloads ---- */
    const dl = $("src-dl");
    dl.innerHTML = `<button data-k="analysis">ตารางวิเคราะห์รายจังหวัด-ปี (CSV)</button><button class="alt" data-k="tour">นักท่องเที่ยวรายเดือนที่ผ่านการทำความสะอาด (CSV)</button><button class="alt" data-k="gpp">GPP / GPP ต่อหัว (CSV)</button><button class="alt" data-k="log">บันทึกคุณภาพข้อมูล (TXT)</button>`;
    dl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => download(b.dataset.k)));

    $("src-howto").innerHTML = `<ol>
      <li><b>เปิดใช้งาน (แบ็กเอนด์ Python):</b> รัน <code>python server.py</code> ในโฟลเดอร์โครงการ แล้วเปิด http://localhost:8000 — แบ็กเอนด์ใช้เฉพาะไลบรารีมาตรฐาน ส่งข้อมูลผ่าน <code>/api/dataset</code> และสร้างข้อมูลใหม่ผ่าน <code>POST /api/rebuild</code> (หากเปิด <code>index.html</code> ตรง ๆ จะใช้ข้อมูลที่ฝังใน <code>data/*.js</code> แทน) · ขณะนี้: ${TD.backend ? "<b>เชื่อมต่อแบ็กเอนด์แล้ว</b>" : "ไม่ได้เชื่อมต่อแบ็กเอนด์ (ใช้ข้อมูลที่ฝัง)"}</li>
      <li><b>อัปเดตข้อมูล:</b> วางไฟล์ใหม่ใน <code>raw/</code> (เช่น ไฟล์นักท่องเที่ยวฉบับล่าสุด) แล้วรัน <code>python pipeline/build_data.py</code> ; รูปภาพด้วย <code>python pipeline/fetch_images.py</code></li>
      <li><b>ตรวจความถูกต้อง:</b> เปรียบเทียบตารางที่ดาวน์โหลดจากหน้านี้กับไฟล์ใน <code>raw/</code>; รัน <code>python pipeline/verify.py</code> เพื่อสุ่มตรวจตัวเลขที่ฝังกับไฟล์ต้นทาง; ตรวจ Spearman/Pearson ด้วยโปรแกรมสถิติอื่นจากไฟล์ CSV วิเคราะห์</li>
      <li>ไม่มี API key หรือ Secret ใน front-end</li></ol>`;
  }

  function download(k) {
    const D = TD.D, y0 = TD.state.year;
    if (k === "log") {
      const blob = new Blob(["﻿" + D.quality.join("\n")], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data_quality_log.txt"; a.click(); return;
    }
    if (k === "tour") {
      TD.downloadCSV("tourism_monthly_clean.csv", ["province_code", "province_th", "year", "month", "thai_visitors", "foreign_visitors", "thai_income_raw", "foreign_income_raw", "occupancy_pct"],
        D.tourism.rows.map((r) => [TD.P[r[0]].code, TD.P[r[0]].th, r[1], r[2], r[3], r[4], r[5], r[6], r[7]]));
    } else if (k === "gpp") {
      const out = [];
      TD.P.forEach((p) => TD.gppYears().forEach((y) => out.push([p.code, p.th, y, TD.gpp(p.code, y), TD.gppPc(p.code, y)])));
      TD.downloadCSV("gpp_chain_volume_2002_ref.csv", ["province_code", "province_th", "year", "gpp_million_baht", "gpp_per_capita_baht"], out);
    } else {
      const out = [];
      TD.years.forEach((y) => {
        const w = D.tourism.commonMonths[String(y)] || null, Ag = TD.agg(y, w);
        TD.P.forEach((p) => {
          const a = Ag[p.idx], ac = TD.accom(p.code);
          out.push([p.code, p.th, p.region, p.cityType, y, w ? w.join("|") : "", a ? a.thai : "", a ? a.foreign : "", a ? a.total : "", TD.gpp(p.code, y) ?? "", TD.gppPc(p.code, y) ?? "",
            a ? a.thaiInc : "", a ? a.forInc : "", a ? a.inc : "", ac ? ac.listings : "", ac ? ac.rooms : ""]);
        });
      });
      TD.downloadCSV("analysis_province_year.csv", ["province_code", "province_th", "region", "city_type", "year", "months_used", "thai_visitors", "foreign_visitors", "total_visitors", "gpp_million_baht_chain", "gpp_per_capita_baht", "thai_income_raw", "foreign_income_raw", "total_income_raw", "accommodation_listings_snapshot", "accommodation_rooms_snapshot"], out);
    }
  }

  TD.pages = TD.pages || {};
  TD.pages.sources = { render: () => { if (!built) { build(); built = true; } } };
})();
