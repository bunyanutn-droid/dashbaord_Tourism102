/* Page 1 - Overview of visitors and tourism income */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  // two tone families so that "main city" and "secondary city" are told apart at a glance
  const RAMP = {
    main: ["#dbe8ff", "#b3cdfc", "#85aef8", "#5589ef", "#2f63d8", "#1a3f9e"],
    sec: ["#fff0d1", "#fddb9b", "#fbc064", "#f3a22b", "#d97f06", "#9a5200"],
  };
  const S = { metric: "income", trend: "visitors", top: "income", fixed: false, timer: null, profFor: null };
  const METRIC = {
    visitors: { t: "นักท่องเที่ยว", unit: "คน", get: (a, f) => TD.val(a, f.type), fmt: (v) => TD.f.people(v) + "คน" },
    income: { t: "รายได้รวม", unit: "ล้านบาท", get: (a, f) => TD.inc(a, f.type), fmt: (v) => TD.f.int(v) + " ล้านบาท" },
    thaiInc: { t: "รายได้จากชาวไทย", unit: "ล้านบาท", get: (a) => a.thaiInc, fmt: (v) => TD.f.int(v) + " ล้านบาท" },
    forInc: { t: "รายได้จากชาวต่างชาติ", unit: "ล้านบาท", get: (a) => a.forInc, fmt: (v) => TD.f.int(v) + " ล้านบาท" },
  };
  let map, layer, breaks = { main: [], sec: [] }, labelLayer;

  /* ---- time-lapse: step through the years with the same colour scale ---- */
  function stopPlay() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    S.fixed = false;
    const b = $("ov-play"); if (b) { b.textContent = "▶ เล่นตามปี"; b.classList.remove("on"); }
  }
  function startPlay() {
    const ys = TD.years;
    S.fixed = true;
    $("ov-play").textContent = "⏸ หยุด"; $("ov-play").classList.add("on");
    let k = 0;
    TD.setFilter({ year: ys[0] });
    S.timer = setInterval(() => {
      k++;
      if (k >= ys.length) { stopPlay(); TD.render(); return; }
      TD.setFilter({ year: ys[k] });
    }, 1600);
  }
  TD.stopPlay = stopPlay;

  function init() {
    $("ov-play").addEventListener("click", () => (S.timer ? (stopPlay(), TD.render()) : startPlay()));
    TD.$$("#ov-metric button").forEach((b) => b.addEventListener("click", () => { S.metric = b.dataset.v; TD.$$("#ov-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
    TD.$$("#ov-top-metric button").forEach((b) => b.addEventListener("click", () => { S.top = b.dataset.v; TD.$$("#ov-top-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
    TD.$$("#ov-trend-metric button").forEach((b) => b.addEventListener("click", () => { S.trend = b.dataset.v; TD.$$("#ov-trend-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
  }

  const classOf = (v, br) => { if (!Number.isFinite(v) || v <= 0) return -1; let c = 0; while (c < br.length && v > br[c]) c++; return c; };
  const chip = (p) => `<span class="${p.cityType === "เมืองหลัก" ? "chip-main" : "chip-sec"}">${p.cityType}</span>`;

  function render() {
    const f = TD.state, y = f.year, win = TD.window(y);
    const A = TD.agg(y, win);
    const base = TD.provSet({ ignoreProv: true });
    const chosen = TD.provSet();
    const rows = [...base].filter((i) => A[i]);
    const crows = [...chosen].filter((i) => A[i]);
    const typeLbl = TD.typeLabel(f.type);
    const M = METRIC[S.metric];

    if (!crows.length) {
      TD.kpis("ov-kpis", []);
      $("ov-top10").innerHTML = '<div class="empty">ไม่มีข้อมูลตามตัวกรองที่เลือก — ลองล้างตัวกรอง</div>';
      ["ov-share", "ov-trend", "ov-scatter"].forEach((id) => TD.emptyChart(id));
      return;
    }

    /* ---- KPIs ---- */
    const sumV = TD.stats.sum(crows.map((i) => TD.val(A[i], f.type)));
    const sumI = TD.stats.sum(crows.map((i) => TD.inc(A[i], f.type)));
    const byInc = rows.slice().sort((a, b) => TD.inc(A[b], f.type) - TD.inc(A[a], f.type));
    const byVis = rows.slice().sort((a, b) => TD.val(A[b], f.type) - TD.val(A[a], f.type));
    const complete = crows.filter((i) => TD.isComplete(y, i)).length;
    const tI0 = TD.stats.sum(crows.map((i) => A[i].thaiInc)), fI0 = TD.stats.sum(crows.map((i) => A[i].forInc));
    const secTop = rows.filter((i) => TD.P[i].cityType === "เมืองรอง").sort((x, z) => TD.inc(A[z], f.type) - TD.inc(A[x], f.type))[0];
    TD.kpis("ov-kpis", [
      { l: `รายได้จากนักท่องเที่ยวรวม (${typeLbl})`, cls: "tot", v: TD.f.baht(sumI), n: `ปี ${y} · ${TD.windowLabel(y)} · ${crows.length} จังหวัด` },
      { l: "รายได้จากชาวไทย", cls: "thai", v: TD.f.baht(tI0), n: `${TD.f.pct((tI0 / (tI0 + fI0)) * 100)} ของรายได้ทั้งหมด · ${TD.f.int(tI0)} ล้านบาท` },
      { l: "รายได้จากชาวต่างชาติ", cls: "foreign", v: TD.f.baht(fI0), n: `${TD.f.pct((fI0 / (tI0 + fI0)) * 100)} ของรายได้ทั้งหมด · ${TD.f.int(fI0)} ล้านบาท` },
      { l: "จังหวัดที่มีรายได้สูงสุด", cls: "main", v: TD.P[byInc[0]].th, n: `${TD.f.int(TD.inc(A[byInc[0]], f.type))} ล้านบาท · ${TD.P[byInc[0]].cityType}` },
      secTop !== undefined ? { l: "เมืองรองที่มีรายได้สูงสุด", cls: "sec", v: TD.P[secTop].th, n: `${TD.f.int(TD.inc(A[secTop], f.type))} ล้านบาท · นักท่องเที่ยว ${TD.f.people(TD.val(A[secTop], f.type))}คน` } : { l: "เมืองรองที่มีรายได้สูงสุด", cls: "sec", v: "–", n: "ไม่มีเมืองรองในตัวกรองที่เลือก" },
      { l: `นักท่องเที่ยวรวม (${typeLbl})`, cls: "neu", v: TD.f.people(sumV) + "คน", n: `รายได้เฉลี่ย ${TD.f.int((sumI / sumV) * 1e6)} บาท/คน · ครบทุกเดือน ${complete}/${crows.length} จังหวัด` },
    ]);

    renderRecovery(base, f, y);
    renderFindings(rows, A, f, y, base);



    /* ---- top 10 income provinces: total (stacked Thai/foreign), Thai only, or foreign only ---- */
    const TOPM = {
      income: { t: "รายได้รวม", get: (a) => TD.inc(a, f.type) },
      thaiInc: { t: "รายได้จากชาวไทย", get: (a) => a.thaiInc },
      forInc: { t: "รายได้จากชาวต่างชาติ", get: (a) => a.forInc },
    }[S.top];
    const top = rows.slice().sort((a, b) => TOPM.get(A[b]) - TOPM.get(A[a])).slice(0, 10);
    $("ov-top-title").textContent = `10 จังหวัดที่มี${TOPM.t}สูงสุด`;
    const mx = TOPM.get(A[top[0]]);
    $("ov-top10").innerHTML = top.map((i, k) => {
      const a = A[i], p = TD.P[i];
      const mixed = S.top === "income" ? [f.type === "foreign" ? 0 : a.thaiInc, f.type === "thai" ? 0 : a.forInc] : S.top === "thaiInc" ? [a.thaiInc, 0] : [0, a.forInc];
      const wT = (mixed[0] / mx) * 100, wF = (mixed[1] / mx) * 100;
      return `<div class="toprow ${String(p.code) === f.prov ? "sel" : ""}" data-i="${i}"><span class="rk">${k + 1}</span>
        <span><span class="nm" tabindex="0">${TD.esc(p.th)}</span>${chip(p)}</span>
        <span class="bar" title="ไทย ${TD.f.int(mixed[0])} · ต่างชาติ ${TD.f.int(mixed[1])} ล้านบาท"><i class="t" style="width:${wT}%"></i><i class="f" style="width:${wF}%"></i></span>
        <span class="vl">${TD.f.int(TOPM.get(a))} ล้านบาท<small>${S.top === "income" ? `ไทย ${TD.f.pct((mixed[0] / (mixed[0] + mixed[1])) * 100, 0)} · ต่างชาติ ${TD.f.pct((mixed[1] / (mixed[0] + mixed[1])) * 100, 0)}` : TD.f.pct((TOPM.get(a) / (a.thaiInc + a.forInc)) * 100, 0) + " ของรายได้จังหวัด"}</small></span></div>`;
    }).join("") + `<div class="legend2" style="grid-template-columns:auto auto"><span><i style="background:var(--thai)"></i>รายได้จากชาวไทย</span><span><i style="background:var(--foreign)"></i>รายได้จากชาวต่างชาติ</span></div>`;
    $("ov-top10").querySelectorAll(".toprow .nm").forEach((nm) => {
      const i = +nm.closest(".toprow").dataset.i;
      nm.addEventListener("mouseenter", (e) => TD.showCard(i, e));
      nm.addEventListener("mousemove", TD.moveCard);
      nm.addEventListener("mouseleave", TD.hideCard);
      nm.addEventListener("focus", () => { const r = nm.getBoundingClientRect(); TD.showCard(i, { clientX: r.right, clientY: r.top }); });
      nm.addEventListener("blur", TD.hideCard);
      nm.addEventListener("touchstart", (e) => { TD.showCard(i, e.touches[0]); setTimeout(TD.hideCard, 3500); }, { passive: true });
    });
    TD.setSrc("ov-top-src", "tour");
    $("ov-top-src").innerHTML += `<br>${TD.badge.calc} รายได้ต่อคน = รายได้ ÷ นักท่องเที่ยว · หน่วยรายได้ตีความเป็นล้านบาท (ดูหน้าแหล่งข้อมูล) · <b>รูปภาพ</b> Wikimedia Commons (ผู้ถ่ายและใบอนุญาตแสดงในการ์ดภาพ)`;

    /* ---- visitors vs income scatter (star = main city, circle = secondary) ---- */
    const pts = rows.map((i) => ({ i, p: TD.P[i], x: TD.val(A[i], f.type), y: TD.inc(A[i], f.type) })).filter((q) => q.x > 0 && q.y > 0);
    const selI = f.prov !== "all" && TD.byCode[+f.prov] ? TD.byCode[+f.prov].idx : -1;
    const lab = new Set(pts.slice().sort((a, b) => b.y - a.y).slice(0, 8).map((q) => q.i)); if (selI >= 0) lab.add(selI);
    const trace = (type, sym, color) => {
      const g = pts.filter((q) => q.p.cityType === type);
      return { type: "scatter", mode: "markers+text", name: `${type} (${sym === "star" ? "★" : "●"})`, x: g.map((q) => q.x), y: g.map((q) => q.y), text: g.map((q) => (lab.has(q.i) ? q.p.th : "")), textposition: "top center", textfont: { size: 10 },
        customdata: g.map((q) => [q.p.th, q.p.cityType, (q.y / q.x) * 1e6]),
        marker: { symbol: sym, color, size: g.map((q) => (q.i === selI ? 17 : 11)), opacity: 0.88, line: { width: 1, color: "#fff" } },
        hovertemplate: "<b>%{customdata[0]}</b> (%{customdata[1]})<br>นักท่องเที่ยว: %{x:,.0f} คน<br>รายได้: %{y:,.0f} ล้านบาท<br>รายได้ต่อคน: %{customdata[2]:,.0f} บาท<extra></extra>" };
    };
    if (pts.length >= 3) {
      TD.plot("ov-scatter", [trace("เมืองหลัก", "star", TD.colors().main), trace("เมืองรอง", "circle", TD.colors().second)], {
        xaxis: { title: `นักท่องเที่ยว${typeLbl} (คน)`, type: "log", tickformat: ",.2s" }, yaxis: { title: "รายได้จากนักท่องเที่ยว (ล้านบาท)", type: "log", tickformat: ",d" },
        legend: { orientation: "h", y: -0.2 }, margin: { l: 70, r: 12, t: 10, b: 70 } });
      const gd = $("ov-scatter"); if (gd.removeAllListeners) gd.removeAllListeners("plotly_click");
      gd.on("plotly_click", (e) => TD.setFilter({ prov: String(TD.byName[e.points[0].customdata[0].replace(/\s/g, "")].code) }));
    } else TD.emptyChart("ov-scatter", "ข้อมูลไม่เพียงพอ");
    $("ov-sc-desc").innerHTML = `★ = เมืองหลัก · ● = เมืองรอง · แกนทั้งสองเป็น Log · จุดที่อยู่เหนือแนวทแยงคือจังหวัดที่ได้รายได้ต่อคนสูง · ${TD.badge.raw}${TD.badge.calc}`;
    $("ov-sc-desc").innerHTML += `<div class="corr">${TD.corrHTML(pts.map((q) => q.x), pts.map((q) => q.y), "")}</div>`;
    TD.setSrc("ov-sc-src", "tour");

    /* ---- share (visitors and income, Thai vs foreign) ---- */
    const thai = TD.stats.sum(crows.map((i) => A[i].thai)), fr = TD.stats.sum(crows.map((i) => A[i].foreign));
    const tI = TD.stats.sum(crows.map((i) => A[i].thaiInc)), fI = TD.stats.sum(crows.map((i) => A[i].forInc));
    const c = TD.colors();
    TD.plot("ov-share", [
      { type: "bar", orientation: "h", name: "ชาวไทย", y: ["นักท่องเที่ยว", "รายได้"], x: [(thai / (thai + fr)) * 100, (tI / (tI + fI)) * 100], marker: { color: c.thai }, text: [TD.f.pct((thai / (thai + fr)) * 100), TD.f.pct((tI / (tI + fI)) * 100)], textposition: "inside", customdata: [[thai], [tI]], hovertemplate: "ชาวไทย %{x:.1f}%<br>%{customdata[0]:,.0f}<extra></extra>" },
      { type: "bar", orientation: "h", name: "ชาวต่างชาติ", y: ["นักท่องเที่ยว", "รายได้"], x: [(fr / (thai + fr)) * 100, (fI / (tI + fI)) * 100], marker: { color: c.foreign }, text: [TD.f.pct((fr / (thai + fr)) * 100), TD.f.pct((fI / (tI + fI)) * 100)], textposition: "inside", customdata: [[fr], [fI]], hovertemplate: "ชาวต่างชาติ %{x:.1f}%<br>%{customdata[0]:,.0f}<extra></extra>" },
    ], { barmode: "stack", xaxis: { title: "สัดส่วน (%)", range: [0, 100] }, margin: { l: 90, r: 10, t: 10, b: 60 }, legend: { orientation: "h", y: -0.3 } });
    $("ov-share-src").innerHTML = TD.SRC.tour() + `<br>${TD.badge.calc} ${y}: นักท่องเที่ยวไทย ${TD.f.people(thai)} · ต่างชาติ ${TD.f.people(fr)}คน; รายได้ไทย ${TD.f.int(tI)} · ต่างชาติ ${TD.f.int(fI)} ล้านบาท (${crows.length} จังหวัด)`;

    /* ---- yearly trend ---- */
    const th = [], fo = [], lbl = [];
    TD.years.forEach((yy) => {
      const AA = TD.agg(yy, TD.window(yy));
      const g = (fn) => TD.stats.sum(crows.map((i) => (AA[i] ? fn(AA[i]) : 0)));
      if (S.trend === "visitors") { th.push(g((a) => a.thai)); fo.push(g((a) => a.foreign)); } else { th.push(g((a) => a.thaiInc)); fo.push(g((a) => a.forInc)); }
      lbl.push(yy === 2023 ? "2023 (ม.ค.–ก.ค.)" : String(yy));
    });
    const unit = S.trend === "visitors" ? "คน" : "ล้านบาท";
    const tr = [];
    if (f.type !== "foreign") tr.push({ type: "bar", name: "ชาวไทย", x: lbl, y: th, marker: { color: c.thai }, hovertemplate: "%{x}<br>ชาวไทย %{y:,.0f} " + unit + "<extra></extra>" });
    if (f.type !== "thai") tr.push({ type: "bar", name: "ชาวต่างชาติ", x: lbl, y: fo, marker: { color: c.foreign }, hovertemplate: "%{x}<br>ชาวต่างชาติ %{y:,.0f} " + unit + "<extra></extra>" });
    TD.plot("ov-trend", tr, { barmode: "stack", xaxis: { title: "ปี (ค.ศ.)" }, yaxis: { title: (S.trend === "visitors" ? "จำนวนนักท่องเที่ยว (คน)" : "รายได้ (ล้านบาท)"), tickformat: ",.2s" }, margin: { l: 70, r: 10, t: 10, b: 60 } });
    $("ov-trend-src").innerHTML = TD.SRC.tour() + "<br>แต่ละปีใช้เดือนตามตัวเลือก “เทียบเฉพาะเดือนที่ทุกจังหวัดมีข้อมูล”";

    /* ---- notes ---- */
    const dup = TD.D.tourism.droppedDuplicates;
    $("ov-notes").innerHTML = `<h3>หมายเหตุคุณภาพข้อมูลที่ควรทราบ</h3><ul>
      <li><b>รายได้:</b> เมทาดาทาของชุดข้อมูลไม่ระบุหน่วยของรายได้จากนักท่องเที่ยว แดชบอร์ดอ่านเป็นล้านบาท (ผลรวมระดับประเทศปี 2019 ในไฟล์ = ${TD.f.dec(TD.stats.sum(TD.rowsByYear[2019].map((r) => r[5] + r[6])) / 1e6, 2)} ล้านล้านบาท ถ้าหน่วยเป็นล้านบาท) จึงเหมาะกับการเปรียบเทียบระหว่างจังหวัด ไม่ควรอ้างเป็นตัวเลขทางการสัมบูรณ์</li>
      <li><b>หน่วยนับ:</b> ชุดข้อมูลนับนักท่องเที่ยวที่เดินทางไปแต่ละจังหวัด ผู้เดินทางหลายจังหวัดถูกนับซ้ำข้ามจังหวัด ผลรวมระดับประเทศจึงไม่เท่ากับจำนวนผู้เดินทางเข้าประเทศที่ไม่ซ้ำกัน</li>
      <li><b>ม.ค. 2021:</b> พบแถวซ้ำที่ค่าไม่ตรงกันของ ${dup.length / 2} จังหวัด จึงตัดแถวเหล่านั้นออกทั้งสองแถว (ไม่เดาว่าแถวใดถูก)</li>
      <li><b>ส.ค. 2022:</b> ไม่มีข้อมูลของ กรุงเทพมหานคร, พระนครศรีอยุธยา และ ลำพูน (ในชุดข้อมูลต้นทาง)</li>
      <li><b>ปี 2023:</b> มีข้อมูลถึง ก.ค. เท่านั้น (7 เดือน) · ตัวเลือก “เทียบเฉพาะเดือนที่ทุกจังหวัดมีข้อมูล” ใช้ช่วงเดือนเดียวกันกับทุกจังหวัด (ปี 2021 ตัด ม.ค.; ปี 2022 ตัด ส.ค.)</li></ul>`;
  }


  /* ---- province profile card (shown when one province is selected) ---- */
  function renderProfile(A, y, f) {
    const card = $("ov-profile");
    const p = f.prov !== "all" ? TD.byCode[+f.prov] : null;
    if (!p || !A[p.idx]) { card.hidden = true; card.classList.remove("pop", "prof-wait"); S.profFor = null; return; }
    const isNew = S.profFor !== p.code;                   // first time for this province -> play the airplane intro
    S.profFor = p.code;
    card.hidden = false;
    const all = TD.P.filter((q) => A[q.idx]);
    const rank = (fn) => { const v = fn(p); if (!Number.isFinite(v)) return "–"; return 1 + all.filter((q) => fn(q) > v).length; };
    const a = A[p.idx];
    const ipv = (q) => TD.inc(A[q.idx], f.type) / TD.val(A[q.idx], f.type);
    const rooms = (q) => (TD.accom(q.code) || {}).rooms;
    const hasG = TD.gppYears().includes(y) && y <= 2022;
    const items = [
      ["นักท่องเที่ยว", rank((q) => TD.val(A[q.idx], f.type)), TD.f.people(TD.val(a, f.type)) + "คน"],
      ["รายได้จากนักท่องเที่ยว", rank((q) => TD.inc(A[q.idx], f.type)), TD.f.baht(TD.inc(a, f.type))],
      ["รายได้ต่อนักท่องเที่ยว", rank(ipv), TD.f.int(ipv(p) * 1e6) + " บาท/คน"],
      ["GPP", hasG ? rank((q) => TD.gpp(q.code, y)) : "–", hasG ? TD.f.int(TD.gpp(p.code, y)) + " ล้านบาท" : "ไม่มีข้อมูลปีนี้"],
      ["GPP ต่อหัว", hasG ? rank((q) => TD.gppPc(q.code, y)) : "–", hasG ? TD.f.int(TD.gppPc(p.code, y)) + " บาท/คน" : "ไม่มีข้อมูลปีนี้"],
      ["ห้องพัก (snapshot)", rank(rooms), TD.f.int(rooms(p)) + " ห้อง"],
    ];
    const im = TD.image(p.code);
    const credit = im ? (im.kind === "attraction" ? TD.esc(im.subject) : "ภาพจากบทความจังหวัด") + " · " + TD.esc((im.author || "Wikimedia").replace(/^Original image:\s*/i, "")) + " · " + TD.esc(im.license || "") : "";
    card.innerHTML = `<div class="prof">
      <div class="prof-img">${im ? `<img src="${im.file}" alt="${TD.esc(im.subject)}"><small>${credit}</small>` : '<div class="none">ไม่มีรูปภาพ</div>'}</div>
      <div class="prof-body"><h2>โปรไฟล์จังหวัด: ${TD.esc(p.th)} ${chip(p)}</h2>
        <p class="desc">${p.region} · ปี ${y} (${TD.windowLabel(y)}) · อันดับจากทั้ง ${all.length} จังหวัด (1 = สูงสุด) · ไทย ${TD.f.pct((a.thai / a.total) * 100, 0)} · ต่างชาติ ${TD.f.pct((a.foreign / a.total) * 100, 0)}</p>
        <div class="ranks">${items.map(([t, r, v]) => `<div class="rk-chip"><span>${t}</span><b>${r === "–" ? "–" : "#" + r}</b><small>${v}</small></div>`).join("")}</div>
      </div></div>
      <div id="ov-prof-chart" class="chart sm"></div>
      <p class="src">${TD.SRC.tour()}<br>${TD.SRC.gpp()}<br>${TD.SRC.acc()}<br>${TD.badge.calc} อันดับและรายได้ต่อนักท่องเที่ยวคำนวณโดยแดชบอร์ด · ปิดโปรไฟล์ด้วยการเลือก “ทุกจังหวัด”</p>`;
    // monthly visitors of this province, all years (gaps stay empty - nothing is filled in)
    const th = {}, fo = {};
    TD.years.forEach((yy) => (TD.rowsByYear[yy] || []).forEach((r) => { if (r[0] === p.idx) { const k = yy + "-" + String(r[2]).padStart(2, "0"); th[k] = r[3]; fo[k] = r[4]; } }));
    const keys = []; TD.years.forEach((yy) => { for (let m = 1; m <= TD.expectedMonths(yy); m++) keys.push(yy + "-" + String(m).padStart(2, "0")); });
    const c = TD.colors();
    TD.plot("ov-prof-chart", [
      { type: "scatter", mode: "lines", stackgroup: "v", name: "ชาวไทย", x: keys, y: keys.map((k) => (k in th ? th[k] : null)), line: { color: c.thai, width: 1 }, fillcolor: "rgba(13,148,136,.55)", hovertemplate: "%{x}<br>ชาวไทย %{y:,.0f} คน<extra></extra>" },
      { type: "scatter", mode: "lines", stackgroup: "v", name: "ชาวต่างชาติ", x: keys, y: keys.map((k) => (k in fo ? fo[k] : null)), line: { color: c.foreign, width: 1 }, fillcolor: "rgba(236,72,153,.55)", hovertemplate: "%{x}<br>ชาวต่างชาติ %{y:,.0f} คน<extra></extra>" },
    ], { yaxis: { title: "นักท่องเที่ยวรายเดือน (คน)", tickformat: ",.2s" }, xaxis: { title: "เดือน (ม.ค. 2015 – ก.ค. 2023; เดือนที่ไม่มีข้อมูลปล่อยว่าง)", nticks: 12 }, legend: { orientation: "h", y: -0.3 }, margin: { l: 70, r: 10, t: 10, b: 80 } });
    if (isNew) flyIn(card);
    else card.classList.remove("prof-wait");
  }

  /* ---- airplane intro: ONE plane flies across the screen, then the profile pops in ---- */
  TD.planeSVG = '<svg class="planesvg" viewBox="0 0 310 162" width="190" height="99" aria-hidden="true"><defs><linearGradient id="pgFus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eef2f5"/><stop offset="1" stop-color="#c3ccd4"/></linearGradient><linearGradient id="pgWingU" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7f9"/><stop offset="1" stop-color="#aab6c0"/></linearGradient><linearGradient id="pgWingL" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f4f7f9"/><stop offset="1" stop-color="#aab6c0"/></linearGradient><linearGradient id="pgEng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d98a3"/><stop offset=".5" stop-color="#e9edf0"/><stop offset="1" stop-color="#6f7a85"/></linearGradient></defs><path d="M52,75 L24,38 L12,38 L30,75Z" fill="url(#pgWingU)" stroke="#8795a1" stroke-width=".7"/><path d="M52,85 L24,122 L12,122 L30,85Z" fill="url(#pgWingL)" stroke="#8795a1" stroke-width=".7"/><path d="M184,73 L132,6 L112,6 L138,73Z" fill="url(#pgWingU)" stroke="#8795a1" stroke-width=".8"/><path d="M184,87 L132,154 L112,154 L138,87Z" fill="url(#pgWingL)" stroke="#8795a1" stroke-width=".8"/><path d="M150,70 L121,10 M150,90 L121,150" stroke="#9aa7b2" stroke-width=".6" fill="none"/><g><ellipse cx="164" cy="39" rx="17" ry="6.2" fill="url(#pgEng)" stroke="#5f6b76" stroke-width=".8"/><ellipse cx="179" cy="39" rx="3" ry="5" fill="#2b323a"/></g><g><ellipse cx="164" cy="121" rx="17" ry="6.2" fill="url(#pgEng)" stroke="#5f6b76" stroke-width=".8"/><ellipse cx="179" cy="121" rx="3" ry="5" fill="#2b323a"/></g><path d="M8,80 Q16,72 46,71.5 L246,71.5 Q288,73 302,80 Q288,87 246,88.5 L46,88.5 Q16,88 8,80Z" fill="url(#pgFus)" stroke="#7d8a96" stroke-width=".8"/><path d="M60,80 L262,80" stroke="#0d9488" stroke-width="3.2" stroke-linecap="round"/><path d="M12,80 L50,80" stroke="#0d9488" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><g fill="#56626d"><circle cx="78" cy="75.6" r="1.25"/><circle cx="78" cy="84.4" r="1.25"/><circle cx="85" cy="75.6" r="1.25"/><circle cx="85" cy="84.4" r="1.25"/><circle cx="92" cy="75.6" r="1.25"/><circle cx="92" cy="84.4" r="1.25"/><circle cx="99" cy="75.6" r="1.25"/><circle cx="99" cy="84.4" r="1.25"/><circle cx="106" cy="75.6" r="1.25"/><circle cx="106" cy="84.4" r="1.25"/><circle cx="113" cy="75.6" r="1.25"/><circle cx="113" cy="84.4" r="1.25"/><circle cx="120" cy="75.6" r="1.25"/><circle cx="120" cy="84.4" r="1.25"/><circle cx="127" cy="75.6" r="1.25"/><circle cx="127" cy="84.4" r="1.25"/><circle cx="134" cy="75.6" r="1.25"/><circle cx="134" cy="84.4" r="1.25"/><circle cx="141" cy="75.6" r="1.25"/><circle cx="141" cy="84.4" r="1.25"/><circle cx="148" cy="75.6" r="1.25"/><circle cx="148" cy="84.4" r="1.25"/><circle cx="155" cy="75.6" r="1.25"/><circle cx="155" cy="84.4" r="1.25"/><circle cx="162" cy="75.6" r="1.25"/><circle cx="162" cy="84.4" r="1.25"/><circle cx="169" cy="75.6" r="1.25"/><circle cx="169" cy="84.4" r="1.25"/><circle cx="176" cy="75.6" r="1.25"/><circle cx="176" cy="84.4" r="1.25"/><circle cx="183" cy="75.6" r="1.25"/><circle cx="183" cy="84.4" r="1.25"/><circle cx="190" cy="75.6" r="1.25"/><circle cx="190" cy="84.4" r="1.25"/><circle cx="197" cy="75.6" r="1.25"/><circle cx="197" cy="84.4" r="1.25"/><circle cx="204" cy="75.6" r="1.25"/><circle cx="204" cy="84.4" r="1.25"/><circle cx="211" cy="75.6" r="1.25"/><circle cx="211" cy="84.4" r="1.25"/><circle cx="218" cy="75.6" r="1.25"/><circle cx="218" cy="84.4" r="1.25"/><circle cx="225" cy="75.6" r="1.25"/><circle cx="225" cy="84.4" r="1.25"/><circle cx="232" cy="75.6" r="1.25"/><circle cx="232" cy="84.4" r="1.25"/><circle cx="239" cy="75.6" r="1.25"/><circle cx="239" cy="84.4" r="1.25"/><circle cx="246" cy="75.6" r="1.25"/><circle cx="246" cy="84.4" r="1.25"/></g><path d="M270,76.5 L284,80 L270,83.5 Z" fill="#26323d"/><path d="M270,77.2 L279,79.6" stroke="#6b8196" stroke-width=".8"/></svg>';
  function flyIn(card) {
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.classList.remove("pop");
    document.querySelectorAll(".plane").forEach((n) => n.remove());          // never more than one plane on screen
    clearTimeout(S.flyT1); clearTimeout(S.flyT2); clearTimeout(S.flyT3);
    if (still) { card.classList.remove("prof-wait"); return; }
    card.classList.add("prof-wait");                      // hidden until the plane has passed
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    S.flyT1 = setTimeout(() => {
      document.querySelectorAll(".plane").forEach((n) => n.remove());
      const plane = document.createElement("div");
      plane.className = "plane";
      plane.innerHTML = TD.planeSVG;
      document.body.appendChild(plane);
      S.flyT2 = setTimeout(() => { card.classList.remove("prof-wait"); card.classList.add("pop"); }, 750);
      S.flyT3 = setTimeout(() => plane.remove(), 2000);
    }, 380);
  }

  /* ---- recovery versus 2019 (same months in both years) ---- */
  function renderRecovery(base, f, y) {
    const desc = $("ov-rec-desc");
    if (y <= 2019) { TD.emptyChart("ov-recovery", "เลือกปี 2020 ขึ้นไปเพื่อดูการฟื้นตัวเทียบปี 2019"); desc.textContent = ""; $("ov-rec-src").innerHTML = ""; return; }
    const cm = TD.D.tourism.commonMonths;
    const months = cm["2019"].filter((m) => (cm[String(y)] || []).includes(m));
    const A0 = TD.agg(2019, months), A1 = TD.agg(y, months);
    const rows = [...base].map((i) => ({ i, p: TD.P[i], v0: A0[i] ? TD.val(A0[i], f.type) : NaN, v1: A1[i] ? TD.val(A1[i], f.type) : NaN })).filter((r) => r.v0 > 0 && r.v1 >= 0).map((r) => Object.assign(r, { pct: (r.v1 / r.v0) * 100 }));
    if (rows.length < 3) { TD.emptyChart("ov-recovery"); return; }
    const natAll = (TD.stats.sum(rows.map((r) => r.v1)) / TD.stats.sum(rows.map((r) => r.v0))) * 100;
    const t0 = TD.stats.sum(rows.map((r) => A0[r.i].thai)), t1 = TD.stats.sum(rows.map((r) => A1[r.i].thai));
    const f0 = TD.stats.sum(rows.map((r) => A0[r.i].foreign)), f1 = TD.stats.sum(rows.map((r) => A1[r.i].foreign));
    desc.innerHTML = `ปี ${y} เทียบปี 2019 ในเดือนเดียวกัน (${TD.monthsLabel(months)}) · 100% = เท่าก่อนโควิด · ภาพรวมของจังหวัดที่เลือก: <b>${TD.f.pct(natAll, 0)}</b> (ชาวไทย ${TD.f.pct((t1 / t0) * 100, 0)} · ชาวต่างชาติ ${TD.f.pct((f1 / f0) * 100, 0)}) ${TD.badge.calc}`;
    rows.sort((a, b) => a.pct - b.pct);
    const pick = rows.length > 26 ? [...rows.slice(0, 13), ...rows.slice(-13)] : rows;
    $("ov-recovery").style.height = Math.max(320, pick.length * 20 + 70) + "px";
    const c = TD.colors();
    TD.plot("ov-recovery", [{ type: "bar", orientation: "h", x: pick.map((r) => r.pct), y: pick.map((r) => r.p.th),
      marker: { color: pick.map((r) => (r.p.cityType === "เมืองหลัก" ? c.main : c.second)) }, text: pick.map((r) => TD.f.pct(r.pct, 0)), textposition: "outside", cliponaxis: false,
      customdata: pick.map((r) => [r.p.cityType, r.v0, r.v1]), hovertemplate: "<b>%{y}</b> (%{customdata[0]})<br>2019: %{customdata[1]:,.0f} คน<br>" + y + ": %{customdata[2]:,.0f} คน<br>ฟื้นตัว %{x:.0f}%<extra></extra>" }],
      { shapes: [{ type: "line", x0: 100, x1: 100, yref: "paper", y0: 0, y1: 1, line: { color: "#111827", dash: "dot", width: 1.5 } }], xaxis: { title: "% เทียบปี 2019 (13 จังหวัดฟื้นช้าสุดและเร็วสุด)", ticksuffix: "%" }, yaxis: { automargin: true, tickfont: { size: 11 } }, margin: { l: 120, r: 60, t: 6, b: 50 }, showlegend: false });
    $("ov-rec-src").innerHTML = TD.SRC.tour() + `<br><span style="color:var(--main)">■</span> เมืองหลัก <span style="color:var(--second)">■</span> เมืองรอง · ${TD.badge.calc} ฟื้นตัว = นักท่องเที่ยวปี ${y} ÷ ปี 2019 (เฉพาะเดือนที่มีข้อมูลทั้งสองปี)`;
  }


  /* ---- map page (its own tab) ---- */
  function renderMap() {
    const f = TD.state, y = f.year;
    const A = TD.agg(y, TD.window(y));
    const base = TD.provSet({ ignoreProv: true });
    const rows = [...base].filter((i) => A[i]);
    const M = METRIC[S.metric];
    if (!rows.length) { $("ov-map-desc").textContent = "ไม่มีข้อมูลตามตัวกรองที่เลือก — ลองล้างตัวกรอง"; return; }
    /* ---- map ---- */
    const vals = (type) => rows.filter((i) => TD.P[i].cityType === type).map((i) => M.get(A[i], f)).filter((v) => v > 0);
    // common break points over all provinces so the two tones are comparable
    let all = rows.map((i) => M.get(A[i], f)).filter((v) => v > 0);
    if (S.fixed) {                       // same scale in every year so colours can be compared across years
      all = [];
      TD.years.forEach((yy) => { const AA = TD.agg(yy, TD.window(yy)); rows.forEach((i) => { const v = AA[i] ? M.get(AA[i], f) : NaN; if (v > 0) all.push(v); }); });
    }
    const br = [1, 2, 3, 4, 5].map((k) => TD.stats.quantile(all, k / 6));
    breaks.main = br; breaks.sec = br;
    drawMap(A, base, f, M);
    $("ov-map-desc").innerHTML = `สีแสดง${M.t} ปี ${y} (${TD.windowLabel(y)}) · <b style="color:var(--main)">โทนน้ำเงิน = เมืองหลัก</b> · <b style="color:var(--second)">โทนส้ม = เมืองรอง</b> · ยิ่งเข้มยิ่งมาก (6 ระดับตามควอนไทล์ของจังหวัดที่เลือก) · ชื่อจังหวัดขยายตามการซูม · คลิกจังหวัดเพื่อกรอง${S.fixed ? " · <b>โหมดเล่นตามปี: ใช้สเกลสีเดียวกันทุกปี (2023 มีข้อมูลถึง ก.ค.)</b>" : ""}`;
    $("ov-play-year").textContent = S.fixed ? "ปี " + y : "";
    const edges = [0, ...br, Math.max(...all)];
    const ramp = (type) => RAMP[type].map((c, k) => `<span><i style="background:${c}"></i>${S.metric === "visitors" ? TD.f.people(edges[k]) : TD.f.int(edges[k])}–${S.metric === "visitors" ? TD.f.people(edges[k + 1]) : TD.f.int(edges[k + 1])}</span>`).join("");
    $("ov-map-legend").innerHTML = `<span class="ttl" style="color:var(--main)">เมืองหลัก</span><div class="ramp">${ramp("main")}</div>
      <span class="ttl" style="color:var(--second)">เมืองรอง</span><div class="ramp">${ramp("sec")}</div>
      <span class="ttl">อื่น ๆ</span><div class="ramp"><span><i style="background:#d9dee0"></i>ไม่มีข้อมูล / นอกตัวกรอง</span><span>หน่วย: ${M.unit}</span></div>`;
    TD.setSrc("ov-map-src", "tour", "geo");
    renderProfile(A, y, f);
    mapFindings(rows, A, f, M, y);
    const sel = f.prov !== "all" ? TD.byCode[+f.prov] : null;
    $("ov-map-pick").innerHTML = sel ? `จังหวัดที่เลือก: <b>${TD.esc(sel.th)}</b> ${chip(sel)} · โปรไฟล์จังหวัดอยู่ใต้แผนที่ (เลือก “ทุกจังหวัด” ที่ตัวกรองเพื่อปิด)` : "คลิกจังหวัดบนแผนที่ แล้วโปรไฟล์จังหวัดจะปรากฏใต้แผนที่พร้อมเครื่องบินบินผ่าน ✈";
  }


  /* ---- summary for the mascot (tab 1): what takes analysis, not what the charts already show ---- */
  function recoveryStats(base, y) {
    if (y <= 2019) return null;
    const cm = TD.D.tourism.commonMonths;
    const months = cm["2019"].filter((m) => (cm[String(y)] || []).includes(m));
    const A0 = TD.agg(2019, months), A1 = TD.agg(y, months);
    const set = [...base].filter((i) => A0[i] && A1[i]);
    const pct = (arr, k) => (TD.stats.sum(arr.map((i) => A1[i][k])) / TD.stats.sum(arr.map((i) => A0[i][k]))) * 100;
    const mainI = set.filter((i) => TD.P[i].cityType === "เมืองหลัก"), secI = set.filter((i) => TD.P[i].cityType === "เมืองรอง");
    return { months, all: pct(set, "total"), thai: pct(set, "thai"), foreign: pct(set, "foreign"), main: mainI.length ? pct(mainI, "total") : null, sec: secI.length ? pct(secI, "total") : null };
  }
  function renderFindings(rows, A, f, y, base) {
    const el = $("ov-findings");
    if (rows.length < 8) { el.innerHTML = `<h3>สรุป ${TD.badge.na}</h3><p>จังหวัดตามตัวกรองมีน้อยเกินไป (${rows.length} จังหวัด) จึงไม่สรุป</p>`; return; }
    const li = [];
    const sum = (k) => TD.stats.sum(rows.map((i) => A[i][k]));
    const tV = sum("thai"), fV = sum("foreign"), tI = sum("thaiInc"), fI = sum("forInc");
    // 1. spending per head, Thai vs foreign
    if (tV > 0 && fV > 0) {
      const pt = (tI / tV) * 1e6, pf = (fI / fV) * 1e6;
      li.push(`<li><b>ชาวต่างชาติสร้างรายได้ต่อคนสูงกว่าชาวไทยราว ${TD.f.dec(pf / pt, 1)} เท่า:</b> เฉลี่ย ${TD.f.int(pf)} เทียบกับ ${TD.f.int(pt)} บาทต่อคน ชาวต่างชาติเป็นเพียง ${TD.f.pct((fV / (fV + tV)) * 100, 0)} ของจำนวนนักท่องเที่ยว แต่สร้าง ${TD.f.pct((fI / (fI + tI)) * 100, 0)} ของรายได้ — “คุณภาพ” ของนักท่องเที่ยวจึงสำคัญกว่าจำนวน (หน่วยรายได้เป็นการตีความ ใช้เทียบกันเท่านั้น)</li>`);
    }
    // 2. income rank vs visitor rank
    const rv = TD.stats.rankDesc(rows.map((i) => TD.val(A[i], f.type))), ri = TD.stats.rankDesc(rows.map((i) => TD.inc(A[i], f.type)));
    const arr = rows.map((i, k) => ({ i, rv: rv[k], ri: ri[k] })).filter((o) => o.rv <= 30 || o.ri <= 30);
    const fs = (o) => { const a = A[o.i]; return TD.f.pct((a.forInc / (a.thaiInc + a.forInc)) * 100, 0); };
    const lab = (o) => `<b>${TD.esc(TD.P[o.i].th)}</b> (นักท่องเที่ยวอันดับ ${o.rv} → รายได้อันดับ ${o.ri}; ชาวต่างชาติ ${fs(o)} ของรายได้)`;
    const up = arr.filter((o) => o.rv - o.ri >= 5).sort((a, b) => (b.rv - b.ri) - (a.rv - a.ri)).slice(0, 3);
    const down = arr.filter((o) => o.ri - o.rv >= 5).sort((a, b) => (b.ri - b.rv) - (a.ri - a.rv)).slice(0, 3);
    // does the foreign share of income explain the gap? (computed, not assumed)
    const fsh = (o) => A[o.i].forInc / (A[o.i].thaiInc + A[o.i].forInc);
    const avgF = (arr) => TD.stats.mean(arr.map(fsh)) * 100;
    const natF = (fI / (fI + tI)) * 100;
    const why = (arr) => (arr.length ? `สัดส่วนรายได้จากชาวต่างชาติของกลุ่มนี้เฉลี่ย ${TD.f.pct(avgF(arr), 0)} (ค่ารวมของจังหวัดที่เลือก ${TD.f.pct(natF, 0)}) ` : "");
    if (up.length) li.push(`<li><b>จังหวัดที่ “ได้รายได้เกินจำนวนคน”:</b> ${up.map(lab).join("; ")} — ${why(up)}${avgF(up) > natF ? "สูงกว่าค่ารวม จึงอธิบายได้บางส่วนจากนักท่องเที่ยวต่างชาติ" : "ไม่สูงกว่าค่ารวม แปลว่ารายได้ที่สูงเกินจำนวนคนไม่ได้มาจากนักท่องเที่ยวต่างชาติเป็นหลัก ข้อมูลนี้ยังบอกสาเหตุไม่ได้"}</li>`);
    if (down.length) li.push(`<li><b>จังหวัดที่ “คนมากแต่รายได้น้อยกว่าที่ควร”:</b> ${down.map(lab).join("; ")} — ${why(down)}${avgF(down) < natF ? "ต่ำกว่าค่ารวม สอดคล้องกับการที่นักท่องเที่ยวส่วนใหญ่เป็นชาวไทยซึ่งใช้จ่ายต่อคนน้อยกว่า" : "ไม่ต่ำกว่าค่ารวม จึงอธิบายด้วยสัดส่วนชาวต่างชาติไม่ได้"}</li>`);
    // 3. is income more concentrated than visitors?
    const topShare = (get) => { const v = rows.map((i) => get(A[i])).sort((a, b) => b - a); return (TD.stats.sum(v.slice(0, 5)) / TD.stats.sum(v)) * 100; };
    const sI = topShare((a) => TD.inc(a, f.type)), sV = topShare((a) => TD.val(a, f.type));
    li.push(`<li><b>รายได้กระจุกตัว${sI > sV ? "มากกว่า" : "น้อยกว่า"}จำนวนนักท่องเที่ยว:</b> 5 จังหวัดแรกครองรายได้ ${TD.f.pct(sI, 0)} แต่ครองนักท่องเที่ยว ${TD.f.pct(sV, 0)} ${sI > sV ? "— ผลประโยชน์จากการท่องเที่ยวไปรวมที่ไม่กี่จังหวัดมากกว่าที่ดูจากจำนวนคน" : ""}</li>`);
    // 4. main vs secondary
    const grp = (t) => rows.filter((i) => TD.P[i].cityType === t);
    const mI = grp("เมืองหลัก"), sI2 = grp("เมืองรอง");
    if (mI.length && sI2.length) {
      const S2 = (arr, g) => TD.stats.sum(arr.map((i) => g(A[i])));
      const allI = S2(rows, (a) => TD.inc(a, f.type)), allV = S2(rows, (a) => TD.val(a, f.type));
      const mIn = S2(mI, (a) => TD.inc(a, f.type)), mVi = S2(mI, (a) => TD.val(a, f.type)), sIn = S2(sI2, (a) => TD.inc(a, f.type)), sVi = S2(sI2, (a) => TD.val(a, f.type));
      li.push(`<li><b>เมืองรองยังตามหลังด้านรายได้มากกว่าด้านจำนวนคน:</b> เมืองรอง ${sI2.length} จังหวัดมีนักท่องเที่ยว ${TD.f.pct((sVi / allV) * 100, 0)} แต่ได้รายได้เพียง ${TD.f.pct((sIn / allI) * 100, 0)} (เฉลี่ย ${TD.f.int((sIn / sVi) * 1e6)} บาท/คน เทียบกับเมืองหลัก ${TD.f.int((mIn / mVi) * 1e6)} บาท/คน)</li>`);
    }
    // 5. recovery versus 2019
    const rc = recoveryStats(base, y);
    if (rc && Number.isFinite(rc.all)) {
      li.push(`<li><b>การฟื้นตัวเทียบปี 2019 (${TD.monthsLabel(rc.months)}):</b> โดยรวม ${TD.f.pct(rc.all, 0)} — ชาวไทย ${TD.f.pct(rc.thai, 0)} แต่ชาวต่างชาติ ${TD.f.pct(rc.foreign, 0)}${rc.main !== null && rc.sec !== null ? ` · เมืองหลัก ${TD.f.pct(rc.main, 0)} เมืองรอง ${TD.f.pct(rc.sec, 0)}` : ""} ${rc.foreign < rc.thai ? "ตลาดต่างชาติเป็นตัวที่ยังฟื้นช้ากว่า และเป็นตัวที่ทำให้รายได้ยังไม่กลับไปเท่าเดิม" : ""}</li>`);
    }
    li.push(`<li><b>ข้อควรระวัง:</b> นักท่องเที่ยวนับตามจังหวัดปลายทาง (นับซ้ำข้ามจังหวัด) และรายได้เป็นหน่วยที่ตีความ จึงเหมาะกับการเปรียบเทียบสัดส่วนมากกว่าการอ้างตัวเลขสัมบูรณ์</li>`);
    el.innerHTML = `<h3>สรุป ${TD.badge.insight}</h3><p class="desc" style="margin:2px 0 4px">ปี ${y} · ${TD.windowLabel(y)} · ${rows.length} จังหวัดตามตัวกรอง</p><ul>${li.join("")}</ul>`;
  }


  /* ---- summary for the mascot (map tab): where the selected measure is concentrated ---- */
  function mapFindings(rows, A, f, M, y) {
    const el = $("map-findings");
    const vals = rows.map((i) => ({ i, v: M.get(A[i], f) })).filter((o) => o.v > 0).sort((a, b) => b.v - a.v);
    if (vals.length < 8) { el.innerHTML = `<h3>สรุป ${TD.badge.na}</h3><p>จังหวัดตามตัวกรองมีน้อยเกินไป จึงไม่สรุป</p>`; return; }
    const tot = TD.stats.sum(vals.map((o) => o.v));
    const li = [];
    let cum = 0, n50 = 0;
    for (const o of vals) { cum += o.v; n50++; if (cum >= tot * 0.5) break; }
    li.push(`<li><b>${M.t}กระจุกตัวในไม่กี่จังหวัด:</b> เพียง ${n50} จังหวัดจากทั้งหมด ${vals.length} (${TD.f.pct((n50 / vals.length) * 100, 0)}) ก็รวมกันเกินครึ่งหนึ่งของ${M.t}ทั้งหมด ได้แก่ ${vals.slice(0, Math.min(n50, 6)).map((o) => TD.esc(TD.P[o.i].th)).join(", ")}${n50 > 6 ? " ฯลฯ" : ""}</li>`);
    const reg = {};
    vals.forEach((o) => { const r = TD.P[o.i].region; reg[r] = (reg[r] || 0) + o.v; });
    const rs = Object.entries(reg).sort((a, b) => b[1] - a[1]);
    if (rs.length >= 3) {
      const pc = (v) => TD.f.pct((v / tot) * 100, 0);
      li.push(`<li><b>ช่องว่างระหว่างภูมิภาค:</b> ${rs[0][0]} ครอง ${pc(rs[0][1])} และ${rs[1][0]} ${pc(rs[1][1])} รวมกัน ${pc(rs[0][1] + rs[1][1])} ขณะที่${rs[rs.length - 1][0]}มีเพียง ${pc(rs[rs.length - 1][1])} (แบ่งภูมิภาคตามราชบัณฑิตยสภา)</li>`);
    }
    const mainV = vals.filter((o) => TD.P[o.i].cityType === "เมืองหลัก"), secV = vals.filter((o) => TD.P[o.i].cityType === "เมืองรอง");
    if (mainV.length && secV.length) {
      li.push(`<li><b>เมืองหลัก ${mainV.length} จังหวัด (${TD.f.pct((mainV.length / vals.length) * 100, 0)} ของจังหวัด) ครอง${M.t} ${TD.f.pct((TD.stats.sum(mainV.map((o) => o.v)) / tot) * 100, 0)}</b> ส่วนเมืองรอง ${secV.length} จังหวัดแบ่งกันได้ ${TD.f.pct((TD.stats.sum(secV.map((o) => o.v)) / tot) * 100, 0)} — แผนที่จึงเห็นโทนน้ำเงินเข้มเป็นหย่อม ๆ ท่ามกลางโทนส้มอ่อนเป็นส่วนใหญ่</li>`);
    }
    const sel = f.prov !== "all" ? TD.byCode[+f.prov] : null;
    const k = sel ? vals.findIndex((o) => o.i === sel.idx) : -1;
    if (sel && k >= 0) {
      const a = A[sel.idx];
      const allI = TD.stats.sum(rows.map((i) => TD.inc(A[i], f.type))), allV = TD.stats.sum(rows.map((i) => TD.val(A[i], f.type)));
      const own = (TD.inc(a, f.type) / TD.val(a, f.type)) * 1e6, avg = (allI / allV) * 1e6;
      li.push(`<li><b>${TD.esc(sel.th)}:</b> ${M.t}อันดับ ${k + 1} จาก ${vals.length} (${TD.f.pct((vals[k].v / tot) * 100, 1)} ของทั้งหมด) · รายได้ต่อนักท่องเที่ยว ${TD.f.int(own)} บาท ${own >= avg ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ยของจังหวัดที่เลือก (${TD.f.int(avg)} บาท) ${TD.f.dec(Math.max(own, avg) / Math.min(own, avg), 1)} เท่า</li>`);
    }
    el.innerHTML = `<h3>สรุป ${TD.badge.insight}</h3><p class="desc" style="margin:2px 0 4px">${M.t} ปี ${y} · ${TD.windowLabel(y)}</p><ul>${li.join("")}</ul>`;
  }

  function labelSize(z) { return Math.max(9, Math.min(24, 7 * Math.pow(1.38, z - 5.5))); }
  function drawMap(A, base, f, M) {
    if (!map) {
      map = L.map("ov-map", { zoomSnap: 0.25, attributionControl: false, minZoom: 4.5, maxZoom: 10 });
      L.control.attribution({ prefix: false }).addAttribution("ขอบเขตจังหวัด: OpenGISData-Thailand (CC BY 4.0)").addTo(map);
      layer = L.geoJSON(window.DASH_GEO, {
        style: () => ({ weight: 0.6, color: "#6b8a93", fillOpacity: 0.9 }),
        onEachFeature: (ft, lyr) => {
          lyr.on("click", () => TD.setFilter({ prov: String(ft.properties.code) }));
          lyr.bindTooltip(() => {
            const p = TD.byCode[ft.properties.code];
            const a = TD.agg(TD.state.year, TD.window(TD.state.year))[p.idx];
            if (!a) return `<b>${p.th}</b><br>ไม่มีข้อมูล`;
            const ft2 = TD.state.type;
            return `<b>${p.th}</b> (${p.cityType})<br>นักท่องเที่ยว: ${TD.f.int(TD.val(a, ft2))} คน (ไทย ${TD.f.int(a.thai)} · ต่างชาติ ${TD.f.int(a.foreign)})<br>รายได้: ${TD.f.int(TD.inc(a, ft2))} ล้านบาท (ไทย ${TD.f.int(a.thaiInc)} · ต่างชาติ ${TD.f.int(a.forInc)})<br>รายได้ต่อคน: ${TD.f.int((TD.inc(a, ft2) / TD.val(a, ft2)) * 1e6)} บาท`;
          }, { sticky: true });
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [4, 4] });
      // province names: permanent labels whose font grows with the zoom level; tiny provinces appear only when zoomed in
      labelLayer = L.layerGroup().addTo(map);
      layer.eachLayer((lyr) => {
        const p = TD.byCode[lyr.feature.properties.code];
        const m = L.marker(lyr.getBounds().getCenter(), { interactive: false, icon: L.divIcon({ className: "plabel", html: `<span>${p.th}</span>`, iconSize: [0, 0] }) });
        m._area = p.areaSqKm; m._el = null;
        labelLayer.addLayer(m);
      });
      const refresh = () => {
        const z = map.getZoom(), px = labelSize(z);
        labelLayer.eachLayer((m) => {
          const el = m.getElement();
          if (!el) return;
          const showMin = z < 5.5 ? 12000 : z < 6.5 ? 3500 : 0;   // hide the smallest provinces at low zoom so the map stays readable
          el.style.display = m._area >= showMin ? "" : "none";
          el.firstChild.style.fontSize = px + "px";
          el.firstChild.style.transform = "translate(-50%,-50%)";
          el.firstChild.style.position = "absolute";
          el.firstChild.style.whiteSpace = "nowrap";
        });
      };
      map.on("zoomend", refresh); map._refreshLabels = refresh;
      setTimeout(refresh, 0);
    }
    layer.eachLayer((lyr) => {
      const p = TD.byCode[lyr.feature.properties.code];
      const inSet = base.has(p.idx) && A[p.idx];
      const v = inSet ? M.get(A[p.idx], f) : NaN;
      const type = p.cityType === "เมืองหลัก" ? "main" : "sec";
      const k = classOf(v, breaks[type]);
      const sel = String(p.code) === f.prov;
      lyr.setStyle({ fillColor: k >= 0 ? RAMP[type][k] : "#d9dee0", fillOpacity: inSet ? 0.95 : 0.35, dashArray: inSet && k < 0 ? "3" : null, weight: sel ? 2.8 : 0.7, color: sel ? "#b91c1c" : (type === "main" ? "#355fb0" : "#a8660a") });
      if (sel) lyr.bringToFront();
    });
    setTimeout(() => { map.invalidateSize(); map._refreshLabels && map._refreshLabels(); }, 60);
  }

  TD.pages = TD.pages || {};
  const mapShow = () => map && setTimeout(() => { map.invalidateSize(); map._refreshLabels && map._refreshLabels(); }, 80);
  TD.pages.overview = { render, init };
  TD.pages.map = { render: renderMap, onShow: mapShow };
})();
