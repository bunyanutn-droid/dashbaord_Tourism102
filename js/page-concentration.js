/* Page 3 - Accommodation (rooms per province, click to compare) and tourism concentration. */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  const S = { acc: "rooms", cmp: [] };      // cmp = province codes chosen for comparison
  const MAXCMP = 8;

  function init() {
    TD.$$("#con-acc-metric button").forEach((b) => b.addEventListener("click", () => { S.acc = b.dataset.v; TD.$$("#con-acc-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
  }
  const toggle = (code) => {
    const k = S.cmp.indexOf(code);
    if (k >= 0) S.cmp.splice(k, 1); else if (S.cmp.length < MAXCMP) S.cmp.push(code);
    render();
  };
  const shareTop = (A, n) => {
    const v = TD.P.map((p) => (A[p.idx] ? A[p.idx].total : 0)).sort((a, b) => b - a);
    const tot = TD.stats.sum(v);
    return tot ? (TD.stats.sum(v.slice(0, n)) / tot) * 100 : null;
  };

  function render() {
    const f = TD.state, y = f.year, win = TD.D.tourism.commonMonths[String(y)];
    const A = TD.agg(y, win);
    const typeLbl = TD.typeLabel(f.type);
    const C = TD.colors();
    const metric = S.acc === "rooms" ? "ห้องพัก" : "ที่พัก";
    const unit = S.acc === "rooms" ? "ห้อง" : "แห่ง";

    /* ---------- KPIs ---------- */
    const top5 = shareTop(A, 5), top10 = shareTop(A, 10);
    const sec = TD.P.filter((p) => p.cityType === "เมืองรอง"), main = TD.P.filter((p) => p.cityType === "เมืองหลัก");
    const vAll = TD.stats.sum(TD.P.map((p) => (A[p.idx] ? A[p.idx].total : 0))), vSec = TD.stats.sum(sec.map((p) => (A[p.idx] ? A[p.idx].total : 0)));
    const rooms = TD.P.map((p) => ({ p, r: (TD.accom(p.code) || {}).rooms || 0 }));
    const totRooms = TD.stats.sum(rooms.map((q) => q.r));
    const topRoom = rooms.slice().sort((a, b) => b.r - a.r)[0];
    // share of the province(s) the user picked: provinces chosen for comparison, otherwise the global province filter
    let selCodes = S.cmp.length ? S.cmp.slice() : (f.prov !== "all" && TD.byCode[+f.prov] ? [+f.prov] : []);
    const isTop5 = !selCodes.length;                      // nothing selected = all provinces -> show the top-5 share
    if (isTop5) selCodes = TD.topProvinces(y, 5).map((i) => TD.P[i].code);
    let selKpi;
    {
      const sel = selCodes.map((c) => A[TD.byCode[c].idx]).filter(Boolean);
      const sT = TD.stats.sum(sel.map((a) => a.thai)), sF = TD.stats.sum(sel.map((a) => a.foreign));
      const names = selCodes.map((c) => TD.byCode[c].th);
      const nmLbl = isTop5 ? ` 5 จังหวัดแรก (${names.join(", ")})` : `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` และอีก ${names.length - 3} จังหวัด` : ""}`;
      if (f.type === "all") {
        selKpi = { l: `สัดส่วนนักท่องเที่ยวของ${nmLbl} (${y})`,
          v: TD.f.pct(((sT + sF) / vAll) * 100), n: `ของนักท่องเที่ยวทั้งประเทศ (${TD.f.people(sT + sF)}คน) · ชาวไทย ${TD.f.pct((sT / (sT + sF)) * 100)} · ชาวต่างชาติ ${TD.f.pct((sF / (sT + sF)) * 100)}` };
      } else {
        // only the visitor type chosen in the filter is shown
        const mine = f.type === "thai" ? sT : sF;
        const nat = TD.stats.sum(TD.P.map((p) => (A[p.idx] ? TD.val(A[p.idx], f.type) : 0)));
        selKpi = { l: `สัดส่วนนักท่องเที่ยว${TD.typeLabel(f.type)}ของ${nmLbl} (${y})`,
          v: TD.f.pct((mine / nat) * 100), n: `ของนักท่องเที่ยว${TD.typeLabel(f.type)}ทั้งประเทศ (${isTop5 ? "5 จังหวัดแรก" : "จังหวัดที่เลือก"} ${TD.f.people(mine)}คน จากทั้งประเทศ ${TD.f.people(nat)}คน)` };
      }
    }
    selKpi.cls = f.type === "thai" ? "thai" : f.type === "foreign" ? "foreign" : "neu";
    TD.kpis("con-kpis", [
      { l: `ห้องพักรวมในฐานข้อมูล ททท.`, v: TD.f.int(totRooms) + " ห้อง", n: `มากสุด: ${topRoom.p.th} ${TD.f.int(topRoom.r)} ห้อง (snapshot 2026)`, cls: "tot" },
      selKpi,
      { l: "สัดส่วน 10 จังหวัดแรก", cls: "neu", v: TD.f.pct(top10), n: `จาก 77 จังหวัด · เดือน ${TD.monthsLabel(win)}` },
      { l: `เมืองรอง ${sec.length} จังหวัด`, cls: "sec", v: TD.f.pct((vSec / vAll) * 100), n: `ของนักท่องเที่ยวรวม (เมืองหลัก ${main.length} จังหวัด)` },
    ]);

    /* ---------- rooms per province (click = add/remove from comparison) ---------- */
    const base = TD.provSet({ ignoreProv: true });
    const list = [];
    base.forEach((i) => {
      const p = TD.P[i], ac = TD.accom(p.code);
      if (!ac) return;
      list.push({ i, p, v: ac[S.acc], rooms: ac.rooms, listings: ac.listings, vis: A[i] ? TD.val(A[i], f.type) : NaN });
    });
    list.sort((a, b) => a.v - b.v);                           // ascending -> largest at the top of a horizontal bar chart
    const h = Math.max(300, list.length * 19 + 70);
    $("con-rank").style.height = h + "px";
    $("con-rank-desc").innerHTML = `จำนวน${metric}ที่ลงทะเบียนในฐานข้อมูล ททท. แยกจังหวัด (${list.length} จังหวัดตามตัวกรอง) · <b style="color:var(--main)">น้ำเงิน = เมืองหลัก</b> · <b style="color:var(--second)">ส้ม = เมืองรอง</b> · <b>คลิกแท่ง (หรือจุดในกราฟด้านล่าง) เพื่อเลือกเปรียบเทียบได้สูงสุด ${MAXCMP} จังหวัด</b> ${TD.badge.raw}${TD.badge.calc}`;
    if (list.length) {
      TD.plot("con-rank", [{
        type: "bar", orientation: "h", x: list.map((q) => q.v), y: list.map((q) => q.p.th),
        marker: { color: list.map((q) => (q.p.cityType === "เมืองหลัก" ? C.main : C.second)), line: { width: list.map((q) => (S.cmp.includes(q.p.code) ? 3 : 0)), color: "#111827" } },
        opacity: 0.95, customdata: list.map((q) => [q.p.cityType, q.rooms, q.listings, q.vis, q.p.code]),
        text: list.map((q) => TD.f.int(q.v)), textposition: "outside", cliponaxis: false,
        hovertemplate: "<b>%{y}</b> (%{customdata[0]})<br>ห้องพัก: %{customdata[1]:,.0f} ห้อง<br>ที่พัก: %{customdata[2]:,.0f} แห่ง<br>นักท่องเที่ยว: %{customdata[3]:,.0f} คน<br><i>คลิกเพื่อเปรียบเทียบ</i><extra></extra>",
      }], { margin: { l: 120, r: 70, t: 6, b: 40 }, xaxis: { title: `จำนวน${metric} (${unit})`, tickformat: ",d" }, yaxis: { automargin: true, tickfont: { size: 11 }, dtick: 1 }, bargap: 0.25 });
      const gd = $("con-rank"); if (gd.removeAllListeners) gd.removeAllListeners("plotly_click");
      gd.on("plotly_click", (e) => toggle(e.points[0].customdata[4]));
    } else TD.emptyChart("con-rank");
    TD.setSrc("con-rank-src", "acc");
    $("con-rank-src").innerHTML += `<br>ฐานข้อมูลที่พักของ ททท. ไม่ใช่สำมะโนที่พักทั้งหมด และเป็นภาพรวมปัจจุบัน (ไม่ใช่รายปี)`;

    /* ---------- comparison panel ---------- */
    S.cmp = S.cmp.filter((c) => TD.byCode[c]);
    const cmpRows = S.cmp.map((c) => {
      const p = TD.byCode[c], ac = TD.accom(c) || { rooms: 0, listings: 0 }, a = A[p.idx], vis = a ? TD.val(a, f.type) : NaN;
      return { name: p.th, city: p.cityType, rooms: ac.rooms, listings: ac.listings, avg: ac.listings ? ac.rooms / ac.listings : NaN, vis, per: ac.rooms ? vis / ac.rooms : NaN, rank: 1 + TD.P.filter((q) => (TD.accom(q.code) || {}).rooms > ac.rooms).length, code: c };
    });
    $("con-compare").innerHTML = `<div class="chips">${S.cmp.map((c) => `<button class="chip" data-c="${c}" title="คลิกเพื่อเอาออก">${TD.esc(TD.byCode[c].th)} <b>✕</b></button>`).join("")}${S.cmp.length ? `<button class="ghost" id="cmp-clear">ล้างการเลือก</button>` : ""}</div>` +
      (S.cmp.length ? '<div id="cmp-table" class="tablewrap"></div><div id="cmp-chart" class="chart sm"></div>' : '<div class="empty-compare">ยังไม่ได้เลือกจังหวัด — คลิกแท่งหรือจุดในกราฟเพื่อเปรียบเทียบจำนวนห้องพักระหว่างจังหวัด</div>');
    $("con-compare").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => toggle(+b.dataset.c)));
    const clr = $("cmp-clear"); if (clr) clr.onclick = () => { S.cmp = []; render(); };
    if (S.cmp.length) {
      TD.table("cmp-table", [
        { k: "name", t: "จังหวัด" }, { k: "city", t: "ประเภทเมือง", html: (r) => `<span class="${r.city === "เมืองหลัก" ? "chip-main" : "chip-sec"}" style="margin:0">${r.city}</span>` },
        { k: "rooms", t: "ห้องพัก (ห้อง)", num: true, fmt: (v) => TD.f.int(v) }, { k: "rank", t: "อันดับห้องพัก (จาก 77)", num: true },
        { k: "listings", t: "จำนวนที่พัก (แห่ง)", num: true, fmt: (v) => TD.f.int(v) }, { k: "avg", t: "ห้องเฉลี่ยต่อแห่ง", num: true, fmt: (v) => TD.f.dec(v, 1) },
        { k: "vis", t: `นักท่องเที่ยว ${y} (คน)`, num: true, fmt: (v) => TD.f.int(v) }, { k: "per", t: "นักท่องเที่ยวต่อห้อง (คน/ห้อง)", num: true, fmt: (v) => TD.f.int(v) },
      ], cmpRows, { sort: "rooms" });
      TD.plot("cmp-chart", [
        { type: "bar", name: "ห้องพัก (ห้อง)", x: cmpRows.map((r) => r.name), y: cmpRows.map((r) => r.rooms), marker: { color: C.con }, hovertemplate: "%{x}<br>ห้องพัก %{y:,.0f}<extra></extra>" },
        { type: "scatter", mode: "lines+markers", name: `นักท่องเที่ยว (คน, แกนขวา)`, x: cmpRows.map((r) => r.name), y: cmpRows.map((r) => r.vis), yaxis: "y2", marker: { color: "#d97706", size: 9 }, line: { color: "#d97706" }, hovertemplate: "%{x}<br>นักท่องเที่ยว %{y:,.0f} คน<extra></extra>" },
      ], { yaxis: { title: "ห้องพัก (ห้อง)", tickformat: ",d" }, yaxis2: { title: "นักท่องเที่ยว (คน)", overlaying: "y", side: "right", showgrid: false, tickformat: ",.2s" }, margin: { l: 70, r: 70, t: 10, b: 60 }, legend: { orientation: "h", y: -0.25 } });
    }

    /* ---------- scatter: accommodation vs visitors, bubble size = visitors ---------- */
    const pts = list.filter((q) => q.v > 0 && q.vis > 0);
    const xl = S.acc === "rooms" ? "จำนวนห้องพักที่ลงทะเบียนใน ททท. (ห้อง)" : "จำนวนที่พักที่ลงทะเบียนใน ททท. (แห่ง)";
    if (pts.length < 5) { TD.emptyChart("con-acc", "ข้อมูลไม่เพียงพอ"); $("con-acc-corr").innerHTML = ""; } else {
      const maxV = Math.max(...pts.map((q) => q.vis)), maxPx = 56;
      const lab = new Set(pts.slice().sort((a, b) => b.vis - a.vis).slice(0, 8).map((q) => q.i));
      S.cmp.forEach((c) => lab.add(TD.byCode[c].idx));
      const mk = (city, color) => {
        const q = pts.filter((r) => r.p.cityType === city);
        return { type: "scatter", mode: "markers+text", name: city === "เมืองหลัก" ? "เมืองหลัก" : "เมืองรอง", x: q.map((r) => r.v), y: q.map((r) => r.vis), text: q.map((r) => (lab.has(r.i) ? r.p.th : "")), textposition: "top center", textfont: { size: 10 },
          customdata: q.map((r) => [r.p.th, r.p.cityType, r.rooms, r.listings, r.p.code]),
          marker: { color, opacity: 0.65, size: q.map((r) => r.vis), sizemode: "area", sizeref: (2 * maxV) / (maxPx * maxPx), sizemin: 4, line: { width: q.map((r) => (S.cmp.includes(r.p.code) ? 3 : 1)), color: q.map((r) => (S.cmp.includes(r.p.code) ? "#111827" : "#ffffff")) } },
          hovertemplate: "<b>%{customdata[0]}</b> (%{customdata[1]})<br>ห้องพัก: %{customdata[2]:,.0f} ห้อง · ที่พัก: %{customdata[3]:,.0f} แห่ง<br>นักท่องเที่ยว: %{y:,.0f} คน<br><i>คลิกเพื่อเปรียบเทียบ</i><extra></extra>" };
      };
      TD.plot("con-acc", [mk("เมืองหลัก", C.main), mk("เมืองรอง", C.second)], {
        xaxis: { title: xl, type: "log", tickformat: ",.2s" }, yaxis: { title: `นักท่องเที่ยว${typeLbl} ปี ${y} (คน)`, type: "log", tickformat: ",.2s" }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 14, t: 10, b: 70 },
      });
      const gd = $("con-acc"); if (gd.removeAllListeners) gd.removeAllListeners("plotly_click");
      gd.on("plotly_click", (e) => toggle(e.points[0].customdata[4]));
      $("con-acc-corr").innerHTML = TD.corrHTML(pts.map((q) => q.v), pts.map((q) => q.vis), "<i>ไม่ระบุเหตุและผล: จังหวัดที่คนไปมากย่อมมีที่พักมาก และที่พักมากก็ดึงดูดคนได้ ทั้งสองทิศทางเป็นไปได้</i>");
    }
    $("con-acc-desc").innerHTML = `แกน X = ${metric}ที่ลงทะเบียน · แกน Y = นักท่องเที่ยว ปี ${y} (${TD.monthsLabel(win)}) · <b>ขนาดวงกลมแปรตามจำนวนนักท่องเที่ยวของจังหวัดนั้น</b> · น้ำเงิน = เมืองหลัก ส้ม = เมืองรอง · ขอบดำ = จังหวัดที่เลือกเปรียบเทียบ — <b>ช่วงเวลาไม่ตรงกัน</b> (ที่พักเป็นภาพรวมปี 2026 ไม่ใช่รายปี) จึงใช้ดูภาพรวมเท่านั้น ${TD.badge.raw}`;
    TD.setSrc("con-acc-src", "acc", "tour");

    /* ---------- concentration over time ---------- */
    const yrs = TD.years;
    const topNames = (yy, n) => TD.topProvinces(yy, n).map((i, k) => `${k + 1}. ${TD.P[i].th}`);
    const hover = (n) => yrs.map((yy) => topNames(yy, n).join("<br>"));
    TD.plot("con-share", [
      { type: "scatter", mode: "lines+markers", name: "5 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 5)), customdata: hover(5), line: { color: "#e11d48", width: 4 }, marker: { size: 9, symbol: "circle" }, hovertemplate: "<b>ปี %{x} · 5 จังหวัดแรก %{y:.1f}%</b><br>%{customdata}<extra></extra>" },
      { type: "scatter", mode: "lines+markers", name: "10 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 10)), customdata: hover(10), line: { color: "#2563eb", width: 4, dash: "dash" }, marker: { size: 9, symbol: "diamond" }, hovertemplate: "<b>ปี %{x} · 10 จังหวัดแรก %{y:.1f}%</b><br>%{customdata}<extra></extra>" },
    ], { yaxis: { title: "สัดส่วนของนักท่องเที่ยวรวม (%)", range: [0, 100] }, xaxis: { title: "ปี (ค.ศ.) — 2023 = ม.ค.–ก.ค.", dtick: 1 }, legend: { orientation: "h", y: -0.4 }, margin: { l: 60, r: 10, t: 10, b: 90 } });
    const t5 = TD.topProvinces(y, 5), t10 = TD.topProvinces(y, 10);
    const nm10 = (arr) => arr.map((i, k) => `<span style="white-space:nowrap">${k + 1}. ${TD.esc(TD.P[i].th)} <small>(${TD.f.pct(((TD.agg(y, win)[i] || { total: 0 }).total / vAll) * 100)})</small></span>`).join(" · ");
    $("con-share-list").innerHTML = `<p><b style="color:#e11d48">━ 5 จังหวัดแรก ปี ${y}</b> (รวม ${TD.f.pct(top5)}): ${nm10(t5)}</p>
      <p><b style="color:#2563eb">┅ 10 จังหวัดแรก ปี ${y}</b> (รวม ${TD.f.pct(top10)}): ${nm10(t10)}</p>
      <p class="desc">ตัวเลขในวงเล็บคือสัดส่วนของแต่ละจังหวัดต่อนักท่องเที่ยวทั้งประเทศ · ชี้ที่จุดบนกราฟเพื่อดูรายชื่อของแต่ละปี</p>`;
    TD.setSrc("con-share-src", "tour");
    $("con-share-src").innerHTML += `<br>${TD.badge.calc} สัดส่วน = ผลรวมของ N จังหวัดแรก ÷ ผลรวม 77 จังหวัด ในเดือนที่ทุกจังหวัดมีข้อมูลของปีนั้น (ไทย+ต่างชาติ)`;

    /* ---------- main vs secondary ---------- */
    const shareOf = (fn) => { const a = TD.stats.sum(main.map(fn)), b = TD.stats.sum(sec.map(fn)); return a + b ? [(a / (a + b)) * 100, (b / (a + b)) * 100] : [null, null]; };
    const cats = [], mainV = [], secV = [];
    const add = (name, fn) => { const [a, b] = shareOf(fn); if (a === null) return; cats.push(name); mainV.push(a); secV.push(b); };
    add("จำนวนจังหวัด", () => 1);
    add(`นักท่องเที่ยว`, (p) => (A[p.idx] ? TD.val(A[p.idx], f.type) : 0));
    add(`รายได้`, (p) => (A[p.idx] ? TD.inc(A[p.idx], f.type) : 0));
    if (TD.gppYears().includes(y)) add("GPP", (p) => TD.gpp(p.code, y) || 0);
    add("ห้องพัก (snapshot)", (p) => (TD.accom(p.code) ? TD.accom(p.code).rooms : 0));
    TD.plot("con-city", [
      { type: "bar", name: "เมืองหลัก", x: cats, y: mainV, marker: { color: C.main }, text: mainV.map((v) => TD.f.dec(v, 0) + "%"), textposition: "inside", hovertemplate: "%{x}<br>เมืองหลัก %{y:.1f}%<extra></extra>" },
      { type: "bar", name: "เมืองรอง", x: cats, y: secV, marker: { color: C.second }, text: secV.map((v) => TD.f.dec(v, 0) + "%"), textposition: "inside", hovertemplate: "%{x}<br>เมืองรอง %{y:.1f}%<extra></extra>" },
    ], { barmode: "stack", yaxis: { title: "สัดส่วน (%)", range: [0, 100] }, margin: { l: 55, r: 10, t: 10, b: 70 } });
    $("con-city-desc").innerHTML = `สัดส่วนของ “เมืองหลัก” (${main.length}) เทียบกับ “เมืองรอง” (${sec.length}) ตามการจัดประเภทที่ระบุในชุดข้อมูลนักท่องเที่ยวของ กก. · ปี ${y} ${TD.badge.raw}${TD.badge.calc}`;
    $("con-city-src").innerHTML = TD.SRC.tour() + "<br>" + TD.SRC.gpp() + "<br>" + TD.SRC.acc() + "<br><i>ห้องพักเป็น snapshot ปัจจุบัน ไม่ใช่ข้อมูลปี " + y + "</i>";

    /* ---------- summary for the mascot: rooms versus visitors, concentration trend ---------- */
    (function () {
      const el = $("con-findings");
      if (pts.length < 8) { el.innerHTML = `<h3>สรุป ${TD.badge.na}</h3><p>จังหวัดตามตัวกรองมีน้อยเกินไป จึงไม่สรุป</p>`; return; }
      const li = [];
      const rho = TD.stats.spearman(pts.map((q) => q.rooms), pts.map((q) => q.vis));
      li.push(`<li><b>ห้องพักกับนักท่องเที่ยวสัมพันธ์กันในระดับ${TD.strength(rho)}</b> (Spearman ρ = ${TD.f.r(rho)}, ${pts.length} จังหวัด) — บอกได้เพียงว่าจังหวัดที่คนไปมากมักมีห้องพักมาก ไม่ได้บอกว่าห้องพักเป็นต้นเหตุให้คนไป หรือคนไปทำให้มีห้องพักเพิ่ม</li>`);
      const big = pts.filter((q) => q.rooms >= 1000).map((q) => ({ q, per: q.vis / q.rooms })).sort((a, b) => b.per - a.per);
      if (big.length >= 6) {
        const nm = (o) => `<b>${TD.esc(o.q.p.th)}</b> (${TD.f.int(o.per)} คน/ห้อง)`;
        li.push(`<li><b>จำนวนนักท่องเที่ยวต่อห้อง ต่างกันหลายเท่า:</b> สูงสุด ${big.slice(0, 3).map(nm).join(", ")} เทียบกับต่ำสุด ${big.slice(-3).reverse().map(nm).join(", ")} — ค่าสูงอาจหมายถึงที่พักตึงตัว หรือนักท่องเที่ยวส่วนใหญ่เที่ยวเช้า–เย็นกลับ ส่วนค่าต่ำอาจหมายถึงห้องพักเหลือ แต่ข้อมูลไม่พอแยกสาเหตุ (เทียบเฉพาะจังหวัดที่มี ≥ 1,000 ห้อง)</li>`);
      }
      const rv = TD.stats.rankDesc(pts.map((q) => q.vis)), rr = TD.stats.rankDesc(pts.map((q) => q.rooms));
      const gap = pts.map((q, k) => ({ q, rv: rv[k], rr: rr[k] })).filter((o) => o.rv <= 30 || o.rr <= 30);
      const roomRich = gap.filter((o) => o.rv - o.rr >= 4).sort((a, b) => (b.rv - b.rr) - (a.rv - a.rr)).slice(0, 3);
      const roomPoor = gap.filter((o) => o.rr - o.rv >= 4).sort((a, b) => (b.rr - b.rv) - (a.rr - a.rv)).slice(0, 3);
      const gl = (arr) => arr.map((o) => `<b>${TD.esc(o.q.p.th)}</b> (ห้องพักอันดับ ${o.rr}, นักท่องเที่ยวอันดับ ${o.rv})`).join("; ");
      if (roomRich.length) li.push(`<li><b>ห้องพักมากกว่าที่จำนวนนักท่องเที่ยวบอก:</b> ${gl(roomRich)}</li>`);
      if (roomPoor.length) li.push(`<li><b>นักท่องเที่ยวมากกว่าที่จำนวนห้องพักบอก:</b> ${gl(roomPoor)}</li>`);
      const sh = (yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 5);
      const s15 = sh(2015), s19 = sh(2019), s20 = sh(2020), s22 = sh(2022);
      if ([s15, s19, s20, s22].every(Number.isFinite)) {
        li.push(`<li><b>การกระจุกตัว${s22 < s19 ? "ลดลงเล็กน้อย" : "เพิ่มขึ้น"}หลังโควิด:</b> 5 จังหวัดแรกครองนักท่องเที่ยว ${TD.f.pct(s15, 0)} (2015) → ${TD.f.pct(s19, 0)} (2019) → ${TD.f.pct(s20, 0)} (2020) → ${TD.f.pct(s22, 0)} (2022) — ค่อนข้างคงที่ตลอดการเปลี่ยนแปลงใหญ่ แสดงว่าโครงสร้างจังหวัดที่นักท่องเที่ยวนิยมเปลี่ยนช้ามาก</li>`);
      }
      if (S.cmp.length >= 2) {
        const sel = S.cmp.map((cd) => pts.find((q) => q.p.code === cd)).filter(Boolean).map((q) => ({ q, per: q.vis / q.rooms })).sort((a, b) => b.per - a.per);
        if (sel.length >= 2) li.push(`<li><b>จังหวัดที่เลือกเปรียบเทียบ:</b> ${TD.esc(sel[0].q.p.th)} มีนักท่องเที่ยวต่อห้องสูงสุด (${TD.f.int(sel[0].per)} คน/ห้อง) ส่วน${TD.esc(sel[sel.length - 1].q.p.th)}ต่ำสุด (${TD.f.int(sel[sel.length - 1].per)} คน/ห้อง) — ต่างกัน ${TD.f.dec(sel[0].per / sel[sel.length - 1].per, 1)} เท่า</li>`);
      }
      li.push(`<li><b>ข้อควรระวัง:</b> ห้องพักเป็นภาพรวมปัจจุบันจากฐานข้อมูล ททท. (ไม่ใช่รายปีและไม่ใช่สำมะโน) เทียบกับนักท่องเที่ยวปี ${y} จึงเป็นการเปรียบเทียบคร่าว ๆ</li>`);
      el.innerHTML = `<h3>สรุป ${TD.badge.insight}</h3><ul>${li.join("")}</ul>`;
    })();
  }

  TD.pages = TD.pages || {};
  TD.pages.concentration = { render, init, onShow: () => ["con-rank", "con-acc", "con-share", "con-city", "cmp-chart"].forEach((id) => { const g = document.getElementById(id); if (g && g.data) Plotly.Plots.resize(g); }) };
})();
