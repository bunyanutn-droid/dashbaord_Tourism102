/* Page 3 - Cost of living (official CPI, base 2019 = 100). No home-made "cost" score is ever computed. */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  const S = { cat: "0000000000000000", cmp: "none", sc: "level" };
  const LBL = {
    "0000000000000000": "รวมทุกรายการ", "1000000000000000": "อาหารและเครื่องดื่มไม่มีแอลกอฮอล์",
    "3000000000000000": "เคหสถาน (ที่อยู่อาศัย ไฟฟ้า น้ำ ฯลฯ)", "3100000000000000": "ค่าที่พักอาศัย",
    "5000000000000000": "พาหนะ การขนส่ง และการสื่อสาร", "5100000000000000": "ค่าโดยสารสาธารณะ",
  };
  const GROUP_C = { top: "#d97706", other: "#64748b" };

  function init() {
    const sel = $("c-cat");
    sel.innerHTML = Object.keys(LBL).filter((k) => TD.D.cpi.indexNames[k]).map((k) => `<option value="${k}">${LBL[k]}</option>`).join("");
    sel.onchange = () => { S.cat = sel.value; render(); };
    const cp = $("c-prov");
    cp.innerHTML = `<option value="none">— ไม่เลือก —</option>` + TD.P.filter((p) => TD.cpiAvailable(p.code)).map((p) => `<option value="${p.code}">${p.th}</option>`).join("");
    cp.onchange = () => { S.cmp = cp.value; render(); };
    TD.$$("#cost-sc-metric button").forEach((b) => b.addEventListener("click", () => { S.sc = b.dataset.v; TD.$$("#cost-sc-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
  }

  /** months common to every year <= 2022 (so that annual totals are comparable across years) */
  function allYearMonths() {
    const cm = TD.D.tourism.commonMonths;
    return Object.keys(cm).filter((y) => +y <= 2022).reduce((acc, y) => acc.filter((m) => cm[y].includes(m)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  }

  function render() {
    const f = TD.state, y = f.year;
    const withCpi = TD.P.filter((p) => TD.cpiAvailable(p.code));
    const months = TD.cpiMonths(y);
    const catName = LBL[S.cat] || S.cat;
    $("cost-warn").innerHTML = `<h3>อ่านก่อน: CPI ไม่ใช่ “ราคา” หรือ “ค่าครองชีพเป็นบาท”</h3><ul>
      <li>CPI คือ <b>ดัชนีการเปลี่ยนแปลงระดับราคา</b> ฐานปี 2562 = 100 ของแต่ละจังหวัด ค่า 110 หมายถึงราคาสูงกว่าปี 2562 ในจังหวัดนั้น 10% ไม่ได้แปลว่าจังหวัดนั้นแพงกว่าจังหวัดที่ค่า 105</li>
      <li>เพราะทุกจังหวัดเริ่มที่ 100 ในปีฐาน “ระดับ CPI” ใช้เปรียบเทียบ <b>ความเร็วที่ราคาขยับขึ้น</b> เท่านั้น ไม่ใช่เปรียบเทียบว่าจังหวัดใดมีค่าครองชีพสูงกว่า ระบบจึง <b>ไม่สร้างคะแนนค่าครองชีพ</b> ขึ้นเอง</li>
      <li>ไม่มีข้อมูลราคาสินค้าจริงข้ามจังหวัดในชุดข้อมูลทางการที่เข้าถึงได้ จึงแสดงเฉพาะ CPI และอัตราเงินเฟ้อ (ที่คำนวณจาก CPI)</li>
      <li>แสดงเฉพาะจังหวัดที่ดึงข้อมูลจาก API กระทรวงพาณิชย์ได้ครบ (${withCpi.length} จาก 77 จังหวัด — API ตอบข้อผิดพลาดเป็นช่วง ๆ และกรุงเทพมหานครไม่ได้ข้อมูล) จังหวัดที่ไม่มีข้อมูลไม่ถูกเดาหรือเติมค่า</li></ul>`;

    const A = TD.agg(y, TD.D.tourism.commonMonths[String(y)] || null);
    const set = TD.provSet({ ignoreProv: true });
    const topIdx = new Set(TD.topProvinces(y, 10));
    const rows = [];
    withCpi.forEach((p) => {
      if (!set.has(p.idx)) return;
      const lvl = TD.cpiMean(p.code, S.cat, y, months);
      if (lvl === null) return;
      rows.push({ i: p.idx, code: p.code, name: p.th, city: p.cityType, lvl, infl: TD.cpiInfl(p.code, S.cat, y, months),
        vis: A[p.idx] ? TD.val(A[p.idx], f.type) : NaN, grp: topIdx.has(p.idx) ? "top" : "other" });
    });
    const block = $("cost-blocked");
    if (rows.length < 3) {
      $("cost-body").hidden = true; block.hidden = false;
      block.innerHTML = `<h2>ข้อมูลไม่เพียงพอสำหรับการวิเคราะห์</h2><p>ไม่มีข้อมูล CPI (${catName}) ปี ${y} สำหรับจังหวัดตามตัวกรอง (พบ ${rows.length} จังหวัด; ชุดข้อมูลที่โหลดมี CPI ครบ ${TD.P.filter((p) => TD.cpiMean(p.code, TD.CPI_TOTAL, y, months) !== null).length} จังหวัดของปีนี้)<br>API ดัชนีราคาฯ ของกระทรวงพาณิชย์ตอบ HTTP 500/504 ในช่วงที่ดึงข้อมูล จึงยังโหลดไม่ครบ — ระบบไม่แสดงตัวเลขสมมติแทน</p>` +
        (TD.backend ? `<button class="btn" id="cpi-refresh">ดึง CPI ใหม่จากกระทรวงพาณิชย์ (แบ็กเอนด์ Python)</button><p id="cpi-status" class="msg"></p>` : `<p>วิธีดึงข้อมูล: รัน <code>python pipeline/fetch_cpi.py</code> แล้ว <code>python pipeline/build_data.py</code> หรือเปิดด้วย <code>python server.py</code> เพื่อใช้ปุ่มดึงข้อมูลอัตโนมัติ</p>`);
      const b = $("cpi-refresh");
      if (b) b.onclick = async () => {
        const st = $("cpi-status");
        await fetch("/api/refresh-cpi", { method: "POST" });
        b.disabled = true;
        const tick = async () => {
          const j = await (await fetch("/api/refresh-cpi", { cache: "no-store" })).json();
          st.textContent = `กำลังดึงข้อมูล… ไฟล์ที่ได้ ${j.files}/${j.expected}`;
          if (j.running) return setTimeout(tick, 5000);
          st.textContent = "เสร็จสิ้น — โหลดหน้าใหม่เพื่อใช้ข้อมูลล่าสุด\n" + (j.log || "");
          b.disabled = false;
        };
        tick();
      };
      return;
    }
    block.hidden = true; $("cost-body").hidden = false;
    const mlabel = y === 2023 ? "ม.ค.–ก.ค. 2023" : "ทั้งปี " + y;

    /* ---- KPIs ---- */
    const byLvl = rows.slice().sort((a, b) => b.lvl - a.lvl);
    const gTop = rows.filter((r) => r.grp === "top"), gOth = rows.filter((r) => r.grp === "other");
    const mI = (g) => TD.stats.mean(g.map((r) => r.infl));
    const mL = (g) => TD.stats.mean(g.map((r) => r.lvl));
    TD.kpis("cost-kpis", [
      { l: `CPI สูงสุด (${mlabel})`, v: `${byLvl[0].name} ${TD.f.dec(byLvl[0].lvl)}`, n: `ฐาน 2562 = 100 · หมวด: ${catName}`, cls: "cost" },
      { l: "CPI ต่ำสุด", v: `${byLvl[byLvl.length - 1].name} ${TD.f.dec(byLvl[byLvl.length - 1].lvl)}`, n: `จาก ${rows.length} จังหวัดที่มีข้อมูล`, cls: "cost" },
      { l: "เงินเฟ้อเฉลี่ย: กลุ่มท่องเที่ยวสูง", v: TD.f.pct(mI(gTop), 2), n: `${gTop.length} จังหวัด (10 อันดับนักท่องเที่ยวที่มี CPI) · ค่าเฉลี่ยไม่ถ่วงน้ำหนัก`, cls: "cost" },
      { l: "เงินเฟ้อเฉลี่ย: จังหวัดอื่น", v: TD.f.pct(mI(gOth), 2), n: `${gOth.length} จังหวัด`, cls: "cost" },
    ]);

    /* ---- rank charts (15 highest + 15 lowest) ---- */
    const pick = (arr, key) => {
      const s = arr.filter((r) => Number.isFinite(r[key])).sort((a, b) => b[key] - a[key]);
      return s.length <= 30 ? s : [...s.slice(0, 15), ...s.slice(-15)];
    };
    const rankChart = (id, key, title, unit, ref) => {
      const s = pick(rows, key).reverse();
      if (!s.length) { TD.emptyChart(id, "ไม่มีข้อมูล" + (key === "infl" ? " (ต้องมีข้อมูลปีก่อนหน้า)" : "")); return; }
      TD.plot(id, [{
        type: "bar", orientation: "h", x: s.map((r) => r[key]), y: s.map((r) => r.name),
        marker: { color: s.map((r) => (String(r.code) === S.cmp ? "#b91c1c" : GROUP_C[r.grp])) },
        text: s.map((r) => TD.f.dec(r[key], key === "infl" ? 2 : 1)), textposition: "outside", cliponaxis: false,
        customdata: s.map((r) => [r.city, r.grp === "top" ? "กลุ่มท่องเที่ยวสูง" : "จังหวัดอื่น"]),
        hovertemplate: "<b>%{y}</b> (%{customdata[0]})<br>" + title + ": %{x:.2f} " + unit + "<br>%{customdata[1]}<extra></extra>",
      }], { margin: { l: 110, r: 50, t: 6, b: 50 }, xaxis: Object.assign({ title: title + (unit ? " (" + unit + ")" : "") }, ref ? { range: [Math.min(ref, Math.min(...s.map((r) => r[key])) - 1), Math.max(...s.map((r) => r[key])) + 2] } : {}), yaxis: { automargin: true, tickfont: { size: 10 } }, showlegend: false });
    };
    $("cost-rank-title").textContent = `จัดอันดับ CPI ปี ${y} (${catName})`;
    $("cost-rank-desc").innerHTML = `ค่าเฉลี่ยรายเดือนของ ${mlabel} · 15 จังหวัดสูงสุด และ 15 จังหวัดต่ำสุด · <span style="color:${GROUP_C.top}">■</span> กลุ่มท่องเที่ยวสูง <span style="color:${GROUP_C.other}">■</span> จังหวัดอื่น · ${TD.badge.raw}`;
    rankChart("cost-rank", "lvl", "ดัชนี (2562=100)", "", 100);
    $("cost-infl-title").textContent = `อัตราเงินเฟ้อ ปี ${y} (${catName})`;
    $("cost-infl-desc").innerHTML = y === 2015 ? "ปี 2015 ไม่มีข้อมูลปีก่อนหน้าให้คำนวณ" : `= ค่าเฉลี่ย CPI ${mlabel} เทียบกับช่วงเดือนเดียวกันของปี ${y - 1} · 15 จังหวัดสูงสุดและต่ำสุด · ${TD.badge.calc}`;
    if (y === 2015) TD.emptyChart("cost-infl", "ไม่มีข้อมูลปีก่อนหน้า (ข้อมูลเริ่ม ม.ค. 2015)"); else rankChart("cost-infl", "infl", "อัตราเงินเฟ้อ", "%", 0);
    TD.setSrc("cost-rank-src", "cpi"); TD.setSrc("cost-infl-src", "cpi");
    $("cost-infl-src").innerHTML += "<br>" + TD.badge.calc + " เงินเฟ้อรายปีคำนวณโดยแดชบอร์ดจากค่าดัชนีรายเดือน (ไม่ใช่ตัวเลขประกาศของกระทรวง)";

    /* ---- monthly trend: group means vs others, + selected province, + national visitors ---- */
    const pool = withCpi.filter((p) => set.has(p.idx));
    const keys = [];
    for (let yy = 2015; yy <= 2023; yy++) for (let m = 1; m <= (yy === 2023 ? 7 : 12); m++) keys.push(yy * 100 + m);
    const topPool = pool.filter((p) => topIdx.has(p.idx)), othPool = pool.filter((p) => !topIdx.has(p.idx));
    const meanAt = (grp, k) => {
      const v = grp.map((p) => { const m = TD.cpiMap(p.code, S.cat); const r = m && m.get(k); return r ? r[2] : null; }).filter((x) => x !== null);
      return v.length === grp.length && v.length ? TD.stats.mean(v) : (v.length ? TD.stats.mean(v) : null);
    };
    const xs = keys.map((k) => `${Math.floor(k / 100)}-${String(k % 100).padStart(2, "0")}`);
    const traces = [
      { type: "scatter", mode: "lines", name: `กลุ่มท่องเที่ยวสูง (${topPool.length} จังหวัด)`, x: xs, y: keys.map((k) => meanAt(topPool, k)), line: { color: GROUP_C.top, width: 2.5 } },
      { type: "scatter", mode: "lines", name: `จังหวัดอื่น (${othPool.length})`, x: xs, y: keys.map((k) => meanAt(othPool, k)), line: { color: GROUP_C.other, width: 2.5 } },
    ];
    if (S.cmp !== "none") {
      const m = TD.cpiMap(+S.cmp, S.cat);
      traces.push({ type: "scatter", mode: "lines", name: TD.byCode[+S.cmp].th, x: xs, y: keys.map((k) => (m && m.get(k) ? m.get(k)[2] : null)), line: { color: "#b91c1c", width: 2, dash: "dot" } });
    }
    // national visitors per month, only months where all 77 provinces have valid rows (no gaps filled)
    const visY = keys.map((k) => {
      const yy = Math.floor(k / 100), mm = k % 100;
      if (!(TD.D.tourism.commonMonths[String(yy)] || []).includes(mm)) return null;
      let s = 0;
      (TD.rowsByYear[yy] || []).forEach((r) => { if (r[2] === mm) s += r[3] + r[4]; });
      return s;
    });
    traces.push({ type: "bar", name: "นักท่องเที่ยวรวมทั่วประเทศ (แกนขวา)", x: xs, y: visY, yaxis: "y2", marker: { color: "rgba(13,148,136,.28)" }, hovertemplate: "%{x}<br>%{y:,.0f} คน<extra></extra>" });
    TD.plot("cost-trend", traces, {
      xaxis: { title: "เดือน", tickangle: -45, nticks: 20 }, yaxis: { title: `ดัชนี CPI (2562=100) — ${catName}` },
      yaxis2: { title: "นักท่องเที่ยว (คน/เดือน)", overlaying: "y", side: "right", showgrid: false, tickformat: ",.2s" },
      legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 70, t: 10, b: 110 }, hovermode: "x unified",
    });
    $("cost-trend-desc").innerHTML = `เส้น = ค่าเฉลี่ยไม่ถ่วงน้ำหนักของดัชนีรายจังหวัด · กลุ่ม “ท่องเที่ยวสูง” = 10 จังหวัดที่มีนักท่องเที่ยวสูงสุดในปี ${y} (กำหนดสมาชิกคงที่ทั้งช่วง) ที่มี CPI · แท่ง = ผลรวมนักท่องเที่ยวของเดือนที่ทุกจังหวัดมีข้อมูลครบเท่านั้น (เดือนที่ขาดปล่อยว่าง)`;
    TD.setSrc("cost-trend-src", "cpi", "tour");

    /* ---- scatter visitors vs CPI ---- */
    const sy = S.sc === "level" ? "lvl" : "infl";
    const sp = rows.filter((r) => r.vis > 0 && Number.isFinite(r[sy]));
    if (sp.length < 5) TD.emptyChart("cost-scatter", "ข้อมูลไม่เพียงพอ"); else {
      TD.plot("cost-scatter", [{
        type: "scatter", mode: "markers", x: sp.map((r) => r.vis), y: sp.map((r) => r[sy]), text: sp.map((r) => r.name),
        marker: { size: sp.map((r) => (String(r.code) === S.cmp ? 15 : 9)), color: sp.map((r) => GROUP_C[r.grp]), opacity: 0.85, line: { width: 1, color: "#fff" } },
        hovertemplate: "<b>%{text}</b><br>นักท่องเที่ยว: %{x:,.0f} คน<br>" + (sy === "lvl" ? "CPI: %{y:.1f}" : "เงินเฟ้อ: %{y:.2f}%") + "<extra></extra>",
      }], { xaxis: { title: `นักท่องเที่ยว${TD.typeLabel(f.type)} ปี ${y} (คน)`, type: "log", tickformat: ",.2s" }, yaxis: { title: sy === "lvl" ? "ดัชนี CPI (2562=100)" : "อัตราเงินเฟ้อ (%)" }, showlegend: false, margin: { l: 60, r: 10, t: 10, b: 55 } });
    }
    $("cost-corr").innerHTML = TD.corrHTML(sp.map((r) => r.vis), sp.map((r) => r[sy]), "<i>ไม่ใช่เหตุและผล</i>");
    $("cost-sc-src").innerHTML = TD.SRC.cpi() + "<br>" + TD.SRC.tour();

    /* ---- categories: top group vs others ---- */
    const catIds = Object.keys(LBL).filter((k) => TD.D.cpi.indexNames[k] && k !== "0000000000000000");
    const gm = (grp, id) => TD.stats.mean(grp.map((p) => TD.cpiMean(p.code, id, y, months)).filter((v) => v !== null));
    TD.plot("cost-cats", [
      { type: "bar", name: "กลุ่มท่องเที่ยวสูง", x: catIds.map((k) => LBL[k].split(" (")[0]), y: catIds.map((k) => gm(topPool, k)), marker: { color: GROUP_C.top }, hovertemplate: "%{x}<br>กลุ่มท่องเที่ยวสูง: %{y:.1f}<extra></extra>" },
      { type: "bar", name: "จังหวัดอื่น", x: catIds.map((k) => LBL[k].split(" (")[0]), y: catIds.map((k) => gm(othPool, k)), marker: { color: GROUP_C.other }, hovertemplate: "%{x}<br>จังหวัดอื่น: %{y:.1f}<extra></extra>" },
    ], { barmode: "group", yaxis: { title: "ดัชนี (2562=100)", range: [90, undefined] }, xaxis: { tickfont: { size: 10 } }, margin: { l: 55, r: 10, t: 10, b: 120 } });
    $("cost-cat-desc").innerHTML = `ค่าเฉลี่ยของดัชนีหมวดหลักที่เกี่ยวกับการใช้จ่ายประจำวัน (อาหาร ที่อยู่อาศัย การเดินทาง) ${mlabel} · แกน Y เริ่มที่ 90`;
    TD.setSrc("cost-cats-src", "cpi");

    /* ---- table ---- */
    const sumRows = [["กลุ่มท่องเที่ยวสูง", gTop], ["จังหวัดอื่น", gOth]].map(([n, g]) => ({
      n, k: g.length, lvl: mL(g), med: TD.stats.median(g.map((r) => r.lvl)), infl: mI(g), vis: TD.stats.sum(g.map((r) => r.vis)),
    }));
    $("cost-table").innerHTML = `<div id="cost-tab-sum"></div><h3 style="margin:14px 0 6px">รายจังหวัด</h3><div id="cost-tab-detail"></div><p class="src">${TD.SRC.cpi()}<br>${TD.SRC.tour()}<br>${TD.badge.calc} ค่าเฉลี่ย/เงินเฟ้อคำนวณโดยแดชบอร์ด · ดัชนีฐานปี 2562 = 100 ของทุกจังหวัด (ฐานดัชนีเท่ากัน แต่โครงสร้างตะกร้าสินค้าของแต่ละจังหวัดอาจต่างกัน)</p>`;
    TD.table("cost-tab-sum", [
      { k: "n", t: "กลุ่ม" }, { k: "k", t: "จำนวนจังหวัด", num: true },
      { k: "lvl", t: "CPI เฉลี่ย", num: true, fmt: (v) => TD.f.dec(v) }, { k: "med", t: "CPI มัธยฐาน", num: true, fmt: (v) => TD.f.dec(v) },
      { k: "infl", t: "เงินเฟ้อเฉลี่ย (%)", num: true, fmt: (v) => TD.f.dec(v, 2) }, { k: "vis", t: "นักท่องเที่ยวรวม (คน)", num: true, fmt: (v) => TD.f.int(v) },
    ], sumRows);
    TD.table("cost-tab-detail", [
      { k: "name", t: "จังหวัด" }, { k: "city", t: "ประเภทเมือง" }, { k: "grp", t: "กลุ่ม", fmt: (v) => (v === "top" ? "ท่องเที่ยวสูง" : "อื่น") },
      { k: "vis", t: "นักท่องเที่ยว (คน)", num: true, fmt: (v) => TD.f.int(v) },
      { k: "lvl", t: "CPI (2562=100)", num: true, fmt: (v) => TD.f.dec(v) }, { k: "infl", t: "เงินเฟ้อ (%)", num: true, fmt: (v) => TD.f.dec(v, 2) },
    ], rows, { sort: "vis" });

    /* ---- findings ---- */
    const rhoL = TD.stats.spearman(rows.map((r) => r.vis), rows.map((r) => r.lvl));
    const rhoI = TD.stats.spearman(rows.map((r) => r.vis), rows.map((r) => r.infl));
    // year-to-year co-movement of national visitors and top-group CPI, same months in every year
    const am = allYearMonths();
    const natVis = (yy) => { let s = 0; (TD.rowsByYear[yy] || []).forEach((r) => { if (am.includes(r[2])) s += r[3] + r[4]; }); return s; };
    const grpCpi = (yy) => TD.stats.mean(topPool.map((p) => TD.cpiMean(p.code, S.cat, yy, am)).filter((v) => v !== null));
    const yrs = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];
    const dV = [], dC = [];
    for (let i = 1; i < yrs.length; i++) { const v1 = natVis(yrs[i]), v0 = natVis(yrs[i - 1]), c1 = grpCpi(yrs[i]), c0 = grpCpi(yrs[i - 1]); if (v0 && v1 && c0 && c1) { dV.push(v1 / v0 - 1); dC.push(c1 / c0 - 1); } }
    const same = dV.filter((v, i) => Math.sign(v) === Math.sign(dC[i])).length;
    const drop = dV.map((v, i) => [yrs[i + 1], v, dC[i]]).filter((t) => t[1] < -0.3);
    const thin = rows.length < 20 || gTop.length < 3 || gOth.length < 3;
    if (thin) {
      $("cost-findings").innerHTML = `<h3>ข้อค้นพบ ${TD.badge.na}</h3><p>ข้อมูล CPI ที่โหลดได้ครอบคลุมเพียง ${rows.length} จังหวัด (กลุ่มท่องเที่ยวสูง ${gTop.length}, กลุ่มอื่น ${gOth.length}) ซึ่งน้อยเกินกว่าจะสรุปการเปรียบเทียบหรือสหสัมพันธ์ได้อย่างน่าเชื่อถือ จึงไม่สร้างข้อสรุปจากตัวเลขเหล่านี้ — ตัวเลขในกราฟและตารางเป็นข้อมูลจริงรายจังหวัดที่มีเท่านั้น (ต้องการอย่างน้อย 20 จังหวัด และกลุ่มละ 3 จังหวัด)</p>`;
      $("cost-warn").insertAdjacentHTML("beforeend", `<p><b>⚠ ความครอบคลุมข้อมูลต่ำ:</b> มี CPI ปี ${y} เพียง ${rows.length} จังหวัด (API กระทรวงพาณิชย์ยังดึงไม่ครบ)</p>`);
      return;
    }
    $("cost-findings").innerHTML = `<h3>ข้อค้นพบ ${TD.badge.insight}</h3><ul>
      <li>ปี ${y} (${mlabel}) กลุ่มท่องเที่ยวสูงมี CPI ${catName} เฉลี่ย ${TD.f.dec(mL(gTop))} เทียบกับ ${TD.f.dec(mL(gOth))} ของจังหวัดอื่น และเงินเฟ้อเฉลี่ย ${TD.f.dec(mI(gTop), 2)}% เทียบกับ ${TD.f.dec(mI(gOth), 2)}% — ต่างกัน ${TD.f.dec(Math.abs(mI(gTop) - mI(gOth)), 2)} จุดเปอร์เซ็นต์ (ค่าเฉลี่ยไม่ถ่วงน้ำหนักของ ${gTop.length} และ ${gOth.length} จังหวัด)</li>
      <li>ความสัมพันธ์ระหว่างนักท่องเที่ยวกับ CPI: Spearman ρ = ${TD.f.r(rhoL)} (${rhoL === null ? "–" : TD.strength(rhoL)}) กับระดับ CPI และ ${TD.f.r(rhoI)} (${rhoI === null ? "–" : TD.strength(rhoI)}) กับเงินเฟ้อ (n = ${rows.length})</li>
      <li>เมื่อดูการเปลี่ยนแปลงรายปี (ใช้เดือนเดียวกันทุกปี: ${TD.monthsLabel(am)}) ทิศทางของจำนวนนักท่องเที่ยวทั้งประเทศกับ CPI ของกลุ่มท่องเที่ยวสูงตรงกัน ${same} จาก ${dV.length} ปี${drop.length ? ` — ปี ${drop.map((t) => t[0]).join(", ")} นักท่องเที่ยวลดลงมาก (${drop.map((t) => TD.f.dec(t[1] * 100, 0) + "%").join(", ")}) แต่ CPI เปลี่ยน ${drop.map((t) => TD.f.dec(t[2] * 100, 1) + "%").join(", ")} จึงไม่เห็นว่า CPI ขยับตามจำนวนนักท่องเที่ยว` : ""}</li>
      <li><b>ข้อสรุปที่ทำได้:</b> ข้อมูลนี้บอกได้เพียงว่าราคาในจังหวัดกลุ่มนี้ขยับขึ้นเร็วหรือช้ากว่ากลุ่มอื่นเท่าใด ไม่ได้พิสูจน์ว่าการท่องเที่ยวเป็นสาเหตุให้ค่าครองชีพสูง และไม่ได้บอกว่าจังหวัดใดแพงกว่ากันเป็นบาท</li></ul>`;
  }

  TD.pages = TD.pages || {};
  TD.pages.cost = { render, init, onShow: () => ["cost-trend", "cost-rank", "cost-infl", "cost-scatter", "cost-cats"].forEach((id) => { const g = document.getElementById(id); if (g && g.data) Plotly.Plots.resize(g); }) };
})();
