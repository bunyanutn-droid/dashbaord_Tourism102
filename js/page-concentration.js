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
    TD.kpis("con-kpis", [
      { l: `ห้องพักรวมในฐานข้อมูล ททท.`, v: TD.f.int(totRooms) + " ห้อง", n: `มากสุด: ${topRoom.p.th} ${TD.f.int(topRoom.r)} ห้อง (snapshot 2026)`, cls: "con" },
      { l: `สัดส่วนนักท่องเที่ยว 5 จังหวัดแรก (${y})`, v: TD.f.pct(top5), n: TD.topProvinces(y, 5).map(TD.pName).join(", ") },
      { l: "สัดส่วน 10 จังหวัดแรก", v: TD.f.pct(top10), n: `จาก 77 จังหวัด · เดือน ${TD.monthsLabel(win)}` },
      { l: `เมืองรอง ${sec.length} จังหวัด`, v: TD.f.pct((vSec / vAll) * 100), n: `ของนักท่องเที่ยวรวม (เมืองหลัก ${main.length} จังหวัด)` },
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
    TD.plot("con-share", [
      { type: "scatter", mode: "lines+markers", name: "5 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 5)), line: { color: C.con, width: 3 } },
      { type: "scatter", mode: "lines+markers", name: "10 จังหวัดแรก", x: yrs, y: yrs.map((yy) => shareTop(TD.agg(yy, TD.D.tourism.commonMonths[String(yy)]), 10)), line: { color: "#a78bfa", width: 3 } },
    ], { yaxis: { title: "สัดส่วนของนักท่องเที่ยวรวม (%)", range: [0, 100] }, xaxis: { title: "ปี (ค.ศ.) — 2023 = ม.ค.–ก.ค.", dtick: 1 }, legend: { orientation: "h", y: -0.4 }, margin: { l: 60, r: 10, t: 10, b: 90 } });
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
  }

  TD.pages = TD.pages || {};
  TD.pages.concentration = { render, init, onShow: () => ["con-rank", "con-acc", "con-share", "con-city", "cmp-chart"].forEach((id) => { const g = document.getElementById(id); if (g && g.data) Plotly.Plots.resize(g); }) };
})();
