/* Page 1 - Overview of visitors and tourism income */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  // two tone families so that "main city" and "secondary city" are told apart at a glance
  const RAMP = {
    main: ["#dbe8ff", "#b3cdfc", "#85aef8", "#5589ef", "#2f63d8", "#1a3f9e"],
    sec: ["#fff0d1", "#fddb9b", "#fbc064", "#f3a22b", "#d97f06", "#9a5200"],
  };
  const S = { metric: "income", trend: "visitors", top: "income" };
  const METRIC = {
    visitors: { t: "นักท่องเที่ยว", unit: "คน", get: (a, f) => TD.val(a, f.type), fmt: (v) => TD.f.people(v) + "คน" },
    income: { t: "รายได้รวม", unit: "ล้านบาท", get: (a, f) => TD.inc(a, f.type), fmt: (v) => TD.f.int(v) + " ล้านบาท" },
    thaiInc: { t: "รายได้จากชาวไทย", unit: "ล้านบาท", get: (a) => a.thaiInc, fmt: (v) => TD.f.int(v) + " ล้านบาท" },
    forInc: { t: "รายได้จากชาวต่างชาติ", unit: "ล้านบาท", get: (a) => a.forInc, fmt: (v) => TD.f.int(v) + " ล้านบาท" },
  };
  let map, layer, breaks = { main: [], sec: [] }, labelLayer;

  function init() {
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
      { l: `รายได้จากนักท่องเที่ยวรวม (${typeLbl})`, v: TD.f.baht(sumI), n: `ปี ${y} · ${TD.windowLabel(y)} · ${crows.length} จังหวัด` },
      { l: "รายได้จากชาวไทย", v: TD.f.baht(tI0), n: `${TD.f.pct((tI0 / (tI0 + fI0)) * 100)} ของรายได้ทั้งหมด · ${TD.f.int(tI0)} ล้านบาท` },
      { l: "รายได้จากชาวต่างชาติ", v: TD.f.baht(fI0), n: `${TD.f.pct((fI0 / (tI0 + fI0)) * 100)} ของรายได้ทั้งหมด · ${TD.f.int(fI0)} ล้านบาท` },
      { l: "จังหวัดที่มีรายได้สูงสุด", v: TD.P[byInc[0]].th, n: `${TD.f.int(TD.inc(A[byInc[0]], f.type))} ล้านบาท · ${TD.P[byInc[0]].cityType}` },
      secTop !== undefined ? { l: "เมืองรองที่มีรายได้สูงสุด", v: TD.P[secTop].th, n: `${TD.f.int(TD.inc(A[secTop], f.type))} ล้านบาท · นักท่องเที่ยว ${TD.f.people(TD.val(A[secTop], f.type))}คน` } : { l: "เมืองรองที่มีรายได้สูงสุด", v: "–", n: "ไม่มีเมืองรองในตัวกรองที่เลือก" },
      { l: `นักท่องเที่ยวรวม (${typeLbl})`, v: TD.f.people(sumV) + "คน", n: `รายได้เฉลี่ย ${TD.f.int((sumI / sumV) * 1e6)} บาท/คน · ครบทุกเดือน ${complete}/${crows.length} จังหวัด` },
    ]);

    /* ---- map ---- */
    const vals = (type) => rows.filter((i) => TD.P[i].cityType === type).map((i) => M.get(A[i], f)).filter((v) => v > 0);
    // common break points over all provinces so the two tones are comparable
    const all = rows.map((i) => M.get(A[i], f)).filter((v) => v > 0);
    const br = [1, 2, 3, 4, 5].map((k) => TD.stats.quantile(all, k / 6));
    breaks.main = br; breaks.sec = br;
    drawMap(A, base, f, M);
    $("ov-map-desc").innerHTML = `สีแสดง${M.t} ปี ${y} (${TD.windowLabel(y)}) · <b style="color:var(--main)">โทนน้ำเงิน = เมืองหลัก</b> · <b style="color:var(--second)">โทนส้ม = เมืองรอง</b> · ยิ่งเข้มยิ่งมาก (6 ระดับตามควอนไทล์ของจังหวัดที่เลือก) · ชื่อจังหวัดขยายตามการซูม · คลิกจังหวัดเพื่อกรอง`;
    const edges = [0, ...br, Math.max(...all)];
    const ramp = (type) => RAMP[type].map((c, k) => `<span><i style="background:${c}"></i>${S.metric === "visitors" ? TD.f.people(edges[k]) : TD.f.int(edges[k])}–${S.metric === "visitors" ? TD.f.people(edges[k + 1]) : TD.f.int(edges[k + 1])}</span>`).join("");
    $("ov-map-legend").innerHTML = `<span class="ttl" style="color:var(--main)">เมืองหลัก</span><div class="ramp">${ramp("main")}</div>
      <span class="ttl" style="color:var(--second)">เมืองรอง</span><div class="ramp">${ramp("sec")}</div>
      <span class="ttl">อื่น ๆ</span><div class="ramp"><span><i style="background:#d9dee0"></i>ไม่มีข้อมูล / นอกตัวกรอง</span><span>หน่วย: ${M.unit}</span></div>`;
    TD.setSrc("ov-map-src", "tour", "geo");

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
  TD.pages.overview = { render, init, onShow: () => map && setTimeout(() => { map.invalidateSize(); map._refreshLabels && map._refreshLabels(); }, 80) };
})();
