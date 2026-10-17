/* Page 4 - Tourism concentration: what real data exists for infrastructure / accommodation / policy. */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  const S = { acc: "listings" };
  let uploadsReady = false;

  function init() {
    TD.$$("#con-acc-metric button").forEach((b) => b.addEventListener("click", () => { S.acc = b.dataset.v; TD.$$("#con-acc-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
  }

  const shareTop = (A, n) => {
    const v = TD.P.map((p) => (A[p.idx] ? A[p.idx].total : 0)).sort((a, b) => b - a);
    const tot = TD.stats.sum(v);
    return tot ? (TD.stats.sum(v.slice(0, n)) / tot) * 100 : null;
  };

  function render() {
    const f = TD.state, y = f.year, win = TD.D.tourism.commonMonths[String(y)];
    const A = TD.agg(y, win);
    const typeLbl = TD.typeLabel(f.type);

    /* ---------- concentration measures (all 77 provinces) ---------- */
    const top5 = shareTop(A, 5), top10 = shareTop(A, 10);
    const sec = TD.P.filter((p) => p.cityType === "เมืองรอง"), main = TD.P.filter((p) => p.cityType === "เมืองหลัก");
    const vSec = TD.stats.sum(sec.map((p) => (A[p.idx] ? A[p.idx].total : 0))), vAll = TD.stats.sum(TD.P.map((p) => (A[p.idx] ? A[p.idx].total : 0)));
    const top5names = TD.topProvinces(y, 5).map(TD.pName).join(", ");
    TD.kpis("con-kpis", [
      { l: `สัดส่วน 5 จังหวัดแรก (${y})`, v: TD.f.pct(top5), n: top5names, cls: "con" },
      { l: "สัดส่วน 10 จังหวัดแรก", v: TD.f.pct(top10), n: `จาก 77 จังหวัด · เดือน ${TD.monthsLabel(win)}`, cls: "con" },
      { l: `เมืองรอง ${sec.length} จังหวัด`, v: TD.f.pct((vSec / vAll) * 100), n: `ของนักท่องเที่ยวรวม (เมืองหลัก ${main.length} จังหวัด)`, cls: "con" },
      { l: "ปัจจัยที่มีข้อมูลรองรับ", v: "1 จาก 3 ด้าน", n: "ที่พัก (snapshot) · คมนาคมและงบประมาณ: ไม่มีข้อมูลเพียงพอ", cls: "con" },
    ]);

    // concentration over time
    const yrs = TD.years;
    TD.plot("con-share", [
      { type: "scatter", mode: "lines+markers", name: "5 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 5)), line: { color: TD.colors().con, width: 3 } },
      { type: "scatter", mode: "lines+markers", name: "10 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 10)), line: { color: "#a78bfa", width: 3 } },
    ], { yaxis: { title: "สัดส่วนของนักท่องเที่ยวรวม (%)", range: [0, 100] }, xaxis: { title: "ปี (ค.ศ.) — 2023 = ม.ค.–ก.ค.", dtick: 1 }, legend: { orientation: "h", y: -0.4 }, margin: { l: 60, r: 10, t: 10, b: 90 } });
    TD.setSrc("con-share-src", "tour");
    $("con-share-src").innerHTML += `<br>${TD.badge.calc} สัดส่วน = ผลรวมของ N จังหวัดแรก ÷ ผลรวม 77 จังหวัด ในเดือนที่ทุกจังหวัดมีข้อมูลของปีนั้น (ไทย+ต่างชาติ)`;

    /* ---------- main vs secondary ---------- */
    const g = TD.gpp;
    const shareOf = (fn) => { const a = TD.stats.sum(main.map(fn)), b = TD.stats.sum(sec.map(fn)); return a + b ? [(a / (a + b)) * 100, (b / (a + b)) * 100] : [null, null]; };
    const cats = [], mainV = [], secV = [];
    const add = (name, fn) => { const [a, b] = shareOf(fn); if (a === null) return; cats.push(name); mainV.push(a); secV.push(b); };
    add("จำนวนจังหวัด", () => 1);
    add(`นักท่องเที่ยว${typeLbl}`, (p) => (A[p.idx] ? TD.val(A[p.idx], f.type) : 0));
    if (TD.gppYears().includes(y)) add("GPP (ล้านบาท)", (p) => g(p.code, y) || 0);
    add("ห้องพัก (snapshot)", (p) => (TD.accom(p.code) ? TD.accom(p.code).rooms : 0));
    TD.plot("con-city", [
      { type: "bar", name: "เมืองหลัก", x: cats, y: mainV, marker: { color: TD.colors().con }, text: mainV.map((v) => TD.f.dec(v, 0) + "%"), textposition: "inside", hovertemplate: "%{x}<br>เมืองหลัก %{y:.1f}%<extra></extra>" },
      { type: "bar", name: "เมืองรอง", x: cats, y: secV, marker: { color: "#c4b5fd" }, text: secV.map((v) => TD.f.dec(v, 0) + "%"), textposition: "inside", hovertemplate: "%{x}<br>เมืองรอง %{y:.1f}%<extra></extra>" },
    ], { barmode: "stack", yaxis: { title: "สัดส่วน (%)", range: [0, 100] }, margin: { l: 55, r: 10, t: 10, b: 70 } });
    $("con-city-desc").innerHTML = `สัดส่วนของ “เมืองหลัก” (${main.length}) เทียบกับ “เมืองรอง” (${sec.length}) ตามการจัดประเภทที่ระบุในชุดข้อมูลนักท่องเที่ยวของ กก. · ปี ${y} ${TD.badge.raw}${TD.badge.calc}`;
    $("con-city-src").innerHTML = TD.SRC.tour() + "<br>" + TD.SRC.gpp() + "<br>" + TD.SRC.acc() + "<br><i>ห้องพักเป็น snapshot ปัจจุบัน ไม่ใช่ข้อมูลปี " + y + "</i>";

    /* ---------- B. accommodation vs visitors ---------- */
    const set = TD.provSet({ ignoreProv: true });
    const pts = [];
    set.forEach((i) => {
      const p = TD.P[i], a = A[i], ac = TD.accom(p.code);
      if (!a || !ac) return;
      const x = ac[S.acc], yv = TD.val(a, f.type);
      if (x > 0 && yv > 0) pts.push({ i, name: p.th, city: p.cityType, x, y: yv });
    });
    const xl = S.acc === "rooms" ? "จำนวนห้องพักที่ลงทะเบียนใน ททท. (ห้อง)" : "จำนวนที่พักที่ลงทะเบียนใน ททท. (แห่ง)";
    if (pts.length < 5) { TD.emptyChart("con-acc", "ข้อมูลไม่เพียงพอ"); $("con-acc-corr").innerHTML = ""; } else {
      const lab = new Set(pts.slice().sort((a, b) => b.y - a.y).slice(0, 8).map((p) => p.i));
      const selI = f.prov !== "all" && TD.byCode[+f.prov] ? TD.byCode[+f.prov].idx : -1;
      if (selI >= 0) lab.add(selI);
      const mk = (city, color) => { const q = pts.filter((p) => p.city === city); return { type: "scatter", mode: "markers+text", name: city, x: q.map((p) => p.x), y: q.map((p) => p.y), text: q.map((p) => (lab.has(p.i) ? p.name : "")), textposition: "top center", textfont: { size: 10 }, customdata: q.map((p) => [p.name, p.city]), marker: { color, size: q.map((p) => (p.i === selI ? 16 : 10)), opacity: 0.85, line: { width: q.map((p) => (p.i === selI ? 3 : 1)), color: q.map((p) => (p.i === selI ? "#b45309" : "#fff")) } }, hovertemplate: "<b>%{customdata[0]}</b> (%{customdata[1]})<br>" + (S.acc === "rooms" ? "ห้องพัก" : "ที่พัก") + ": %{x:,.0f}<br>นักท่องเที่ยว: %{y:,.0f} คน<extra></extra>" }; };
      TD.plot("con-acc", [mk("เมืองหลัก", TD.colors().con), mk("เมืองรอง", "#94a3b8")], {
        xaxis: { title: xl, type: "log", tickformat: ",.2s" }, yaxis: { title: `นักท่องเที่ยว${typeLbl} ปี ${y} (คน)`, type: "log", tickformat: ",.2s" }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 14, t: 10, b: 70 },
      });
      const gd = $("con-acc"); if (gd.removeAllListeners) gd.removeAllListeners("plotly_click");
      gd.on("plotly_click", (e) => TD.setFilter({ prov: String(TD.byName[e.points[0].customdata[0].replace(/\s/g, "")].code) }));
      $("con-acc-corr").innerHTML = TD.corrHTML(pts.map((p) => p.x), pts.map((p) => p.y), "<i>ไม่ระบุเหตุและผล: จังหวัดที่คนไปมากย่อมมีที่พักมาก และที่พักมากก็ดึงดูดคนได้ ทั้งสองทิศทางเป็นไปได้</i>");
    }
    $("con-acc-desc").innerHTML = `เปรียบเทียบ “ที่พักที่มีอยู่ในฐานข้อมูล ททท. ณ ปัจจุบัน” กับนักท่องเที่ยวปี ${y} (${TD.monthsLabel(win)}) — <b>ช่วงเวลาไม่ตรงกัน</b> (ฐานข้อมูลที่พักเป็นภาพรวมปี 2026 ไม่ใช่รายปี และไม่ใช่สำมะโนที่พักทั้งหมด) จึงใช้ดูภาพรวมเท่านั้น ${TD.badge.raw}`;
    TD.setSrc("con-acc-src", "acc", "tour");

    /* ---------- A. infrastructure (airport) ---------- */
    renderAirport(A, y, typeLbl);
    renderPolicy();
    renderSummary(pts, y);
  }

  function renderAirport(A, y, typeLbl) {
    const host = $("con-air");
    if (!uploadsReady) host.innerHTML = '<div id="air-body"></div><div id="air-upload"></div>';
    const body = $("air-body");
    const ex = TD.extra.airport;
    if (!ex) {
      body.innerHTML = `<h2>A. โครงสร้างพื้นฐานและการคมนาคม</h2><div class="na-box"><h3>${TD.badge.na}</h3>
        <p>ยังไม่มีข้อมูลจำนวนผู้โดยสารและเที่ยวบินรายท่าอากาศยาน/จังหวัดจากแหล่งทางการที่เข้าถึงและตรวจสอบได้ (ตรวจแล้ว: ท่าอากาศยานไทย airportthai.co.th — หน้าสถิติเปิดไม่ได้จากระบบอัตโนมัติ; MOT Data Catalog <code>datagov.mot.go.th</code> มีเฉพาะ “จำนวนท่าอากาศยาน” ระดับประเทศ ไม่ใช่ผู้โดยสาร/เที่ยวบิน; data.mot.go.th เข้าถึงไม่ได้) จึงไม่นำปัจจัยนี้ไปจัดอันดับหรือคำนวณคะแนน และไม่ใช้จำนวนเที่ยวบินแทนจำนวนผู้โดยสาร</p>
        <p>หากมีไฟล์จริงจาก ทอท./กรมท่าอากาศยาน อัปโหลดด้านล่างเพื่อวิเคราะห์เทียบกับนักท่องเที่ยว</p></div>`;
    } else {
      const yrs = [...new Set(ex.rows.map((r) => r.year))].sort();
      const rows = ex.rows.filter((r) => r.year === y);
      if (!rows.length) {
        body.innerHTML = `<h2>A. โครงสร้างพื้นฐานและการคมนาคม</h2><div class="na-box"><h3>${TD.badge.na}</h3><p>ไฟล์ที่อัปโหลด (${TD.esc(ex.source)}) มีปี ${yrs.join(", ")} แต่ไม่มีปี ${y} — เลือกปีให้ตรงกัน</p></div>`;
      } else {
        const pts = rows.map((r) => { const p = TD.byCode[r.code]; const a = A[p.idx]; return a ? { name: p.th, x: r.passengers, y: TD.val(a, TD.state.type) } : null; }).filter(Boolean);
        body.innerHTML = `<h2>A. ท่าอากาศยาน: ผู้โดยสาร เทียบกับนักท่องเที่ยว</h2><p class="desc">${TD.badge.raw} ข้อมูลที่ผู้ใช้อัปโหลด: ${TD.esc(ex.source)} (${rows.length} จังหวัด, ปี ${y}) — ความถูกต้องของไฟล์เป็นความรับผิดชอบของผู้อัปโหลด</p><div id="air-plot" class="chart md"></div><div class="corr" id="air-corr"></div>`;
        if (pts.length >= 3) TD.plot("air-plot", [{ type: "scatter", mode: "markers+text", x: pts.map((p) => p.x), y: pts.map((p) => p.y), text: pts.map((p) => p.name), textposition: "top center", textfont: { size: 10 }, marker: { size: 10, color: TD.colors().con }, hovertemplate: "<b>%{text}</b><br>ผู้โดยสาร %{x:,.0f}<br>นักท่องเที่ยว %{y:,.0f}<extra></extra>" }], { xaxis: { title: "ผู้โดยสารท่าอากาศยานในจังหวัด (คน)", type: "log" }, yaxis: { title: `นักท่องเที่ยว${typeLbl} (คน)`, type: "log" }, margin: { l: 70, r: 10, t: 10, b: 55 } });
        $("air-corr").innerHTML = TD.corrHTML(pts.map((p) => p.x), pts.map((p) => p.y), "<i>จังหวัดที่ไม่มีท่าอากาศยานไม่อยู่ในไฟล์ จึงไม่ถูกนำมาคำนวณ</i>");
      }
    }
    if (!uploadsReady) { TD.attachUpload($("air-upload"), "airport"); }
  }

  function renderPolicy() {
    const host = $("con-policy");
    if (!uploadsReady) host.innerHTML = '<div id="pol-body"></div><div id="pol-upload"></div>';
    const sec = TD.P.filter((p) => p.cityType === "เมืองรอง").length, main = TD.P.length - sec;
    const ex = TD.extra.budget;
    let extra = "";
    if (ex) {
      const y = TD.state.year, rows = ex.rows.filter((r) => r.year === y);
      extra = rows.length ? `<h3 style="margin-top:10px">งบประมาณที่อัปโหลด ปี ${y} ${TD.badge.raw}</h3><div id="bud-tab" class="tablewrap"></div>` : `<p class="msg">ไฟล์งบประมาณที่อัปโหลดไม่มีปี ${y}</p>`;
    }
    $("pol-body").innerHTML = `<h2>C. นโยบายและการส่งเสริมการท่องเที่ยว</h2>
      <ul><li><b>ข้อมูลที่ยืนยันได้:</b> ชุดข้อมูลนักท่องเที่ยวของ กระทรวงการท่องเที่ยวและกีฬา จัดประเภทจังหวัดเป็น “เมืองหลัก” ${main} และ “เมืองรอง” ${sec} จังหวัด (ใช้ในการเปรียบเทียบหน้านี้) ${TD.badge.raw}</li>
      <li>เอกสารแผนพัฒนาการท่องเที่ยวแห่งชาติและนโยบายส่งเสริมเมืองรอง: <b>ยังไม่ได้ตรวจสอบเนื้อหาและ URL ต้นฉบับ</b> จึงไม่นำมาอ้างอิงเชิงตัวเลข (ดูรายการที่ต้องตรวจในหน้าแหล่งข้อมูล)</li></ul>
      <div class="na-box"><h3>งบประมาณพัฒนาแหล่งท่องเที่ยวรายจังหวัด: ${TD.badge.na}</h3><p>ไม่พบชุดข้อมูลงบประมาณรายจังหวัดที่เปิดเผยและตรวจสอบได้ จึงไม่สมมติว่าทุกจังหวัดได้รับงบหรือผลจากนโยบายเท่ากัน และไม่ใช้เป็นตัวแปรอธิบาย</p></div>${extra}`;
    if (ex) {
      const rows = ex.rows.filter((r) => r.year === TD.state.year).map((r) => ({ name: TD.byCode[r.code].th, budget: r.budget }));
      if (rows.length) TD.table("bud-tab", [{ k: "name", t: "จังหวัด" }, { k: "budget", t: "งบประมาณ (บาท)", num: true, fmt: (v) => TD.f.int(v) }], rows, { sort: "budget" });
    }
    if (!uploadsReady) TD.attachUpload($("pol-upload"), "budget");
    uploadsReady = true;
  }

  function renderSummary(pts, y) {
    const acc = pts.length >= 5 ? TD.stats.spearman(pts.map((p) => p.x), pts.map((p) => p.y)) : null;
    const rows = [
      { f: "A1 ผู้โดยสาร/เที่ยวบินท่าอากาศยาน", st: TD.extra.airport ? "มีข้อมูล (ผู้ใช้อัปโหลด)" : "ไม่มีข้อมูลเพียงพอ", src: TD.extra.airport ? TD.extra.airport.source : "ทอท./กรมท่าอากาศยาน/MOT — เข้าถึงข้อมูลรายท่าอากาศยานไม่ได้", yr: TD.extra.airport ? "ตามไฟล์" : "–", res: "ไม่จัดอันดับ" },
      { f: "A2 การเชื่อมต่อทางบก/ราง", st: "ไม่มีข้อมูลเพียงพอ", src: "ไม่พบชุดข้อมูลระดับจังหวัดที่ตรวจสอบได้", yr: "–", res: "ไม่จัดอันดับ" },
      { f: "B1 จำนวนที่พัก/ห้องพัก", st: "มีข้อมูล (snapshot)", src: "ททท. TAT Data Catalog — accommodation.json", yr: "ภาพรวม 2026 (เทียบกับนักท่องเที่ยว " + y + ")", res: acc === null ? "–" : `Spearman ρ = ${TD.f.r(acc)} (n = ${pts.length})` },
      { f: "B2 ที่พักที่ได้รับรองมาตรฐาน", st: "ไม่มีข้อมูลเพียงพอ", src: "ในฐานข้อมูล ททท. มีป้ายมาตรฐาน SHA/ดาว เพียงส่วนน้อย (ไม่ครอบคลุมทั้งจังหวัด)", yr: "–", res: "ไม่จัดอันดับ" },
      { f: "C1 การจัดประเภทเมืองหลัก/เมืองรอง", st: "มีข้อมูล", src: "กระทรวงการท่องเที่ยวและกีฬา (ในชุดข้อมูลนักท่องเที่ยว)", yr: "ตลอดชุดข้อมูล", res: "ใช้เปรียบเทียบกลุ่มเท่านั้น" },
      { f: "C2 งบประมาณพัฒนาแหล่งท่องเที่ยวรายจังหวัด", st: TD.extra.budget ? "มีข้อมูล (ผู้ใช้อัปโหลด)" : "ไม่มีข้อมูลเพียงพอ", src: TD.extra.budget ? TD.extra.budget.source : "ไม่พบข้อมูลเปิดที่ตรวจสอบได้", yr: "–", res: "ไม่จัดอันดับ" },
      { f: "C3 แผนพัฒนาการท่องเที่ยวแห่งชาติ", st: "ยังไม่ได้ตรวจสอบเอกสาร", src: "ดูหน้าแหล่งข้อมูล", yr: "–", res: "ไม่อ้างอิงเชิงตัวเลข" },
    ];
    TD.table("con-summary", [
      { k: "f", t: "ปัจจัย" }, { k: "st", t: "สถานะข้อมูล", html: (r) => (r.st.startsWith("ไม่มี") || r.st.startsWith("ยังไม่") ? TD.badge.na.replace("ไม่มีข้อมูลเพียงพอ", r.st) : "<b>" + TD.esc(r.st) + "</b>") },
      { k: "src", t: "แหล่งข้อมูล" }, { k: "yr", t: "ปี" }, { k: "res", t: "ผลวิเคราะห์" },
    ], rows);
    $("con-summary").insertAdjacentHTML("beforeend", `<p class="src">ไม่มีการให้คะแนนความสำคัญของปัจจัยใด เพราะไม่มีวิธีคำนวณที่ชัดเจนและข้อมูลครบทุกปัจจัย — แสดงเฉพาะสหสัมพันธ์ของปัจจัยที่มีข้อมูลจริง</p>`);
  }

  TD.pages = TD.pages || {};
  TD.pages.concentration = { render, init, onShow: () => ["con-share", "con-city", "con-acc"].forEach((id) => { const g = document.getElementById(id); if (g && g.data) Plotly.Plots.resize(g); }) };
})();
