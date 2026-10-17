/* Page 1 - Overview */
(function () {
  const TD = window.TD;
  const PAL = ["#e6f4f1", "#bfe3dc", "#8fd0c5", "#52b5a8", "#1f8f87", "#0b5e5f"];
  let map, layer, breaks = [];

  function classOf(v) {
    if (!Number.isFinite(v) || v <= 0) return -1;
    let c = 0;
    while (c < breaks.length && v > breaks[c]) c++;
    return c;
  }

  function render() {
    const f = TD.state, y = f.year, win = TD.window(y);
    const A = TD.agg(y, win);
    const base = TD.provSet({ ignoreProv: true });       // region + city filters
    const chosen = TD.provSet();                           // + province filter
    const rows = [...base].filter((i) => A[i]);
    const crows = [...chosen].filter((i) => A[i]);
    const typeLbl = TD.typeLabel(f.type);

    if (!crows.length) {
      TD.kpis("ov-kpis", []);
      ["ov-top10"].forEach((id) => (document.getElementById(id).innerHTML = '<div class="empty">ไม่มีข้อมูลตามตัวกรองที่เลือก — ลองล้างตัวกรอง</div>'));
      TD.emptyChart("ov-share"); TD.emptyChart("ov-trend");
      return;
    }

    /* ---- KPIs ---- */
    const tot = TD.stats.sum(crows.map((i) => TD.val(A[i], f.type)));
    const thai = TD.stats.sum(crows.map((i) => A[i].thai)), fr = TD.stats.sum(crows.map((i) => A[i].foreign));
    const topI = rows.slice().sort((a, b) => TD.val(A[b], f.type) - TD.val(A[a], f.type))[0];
    const complete = crows.filter((i) => TD.isComplete(y, i)).length;
    TD.kpis("ov-kpis", [
      { l: `นักท่องเที่ยวรวม (${typeLbl})`, v: TD.f.people(tot) + " คน", n: `ไทย ${TD.f.people(thai)} · ต่างชาติ ${TD.f.people(fr)}` },
      { l: "จังหวัดที่มีนักท่องเที่ยวสูงสุด", v: TD.P[topI].th, n: `${TD.f.people(TD.val(A[topI], f.type))} คน · ${TD.P[topI].region}` },
      { l: "จังหวัดที่มีข้อมูลครบทุกเดือน", v: `${complete} / ${crows.length}`, n: `ครบ ${TD.expectedMonths(y)} เดือนของปี ${y} (จากจังหวัดที่เลือก)` },
      { l: "ปีข้อมูลที่แสดง", v: String(y) + ` (พ.ศ. ${y + 543})`, n: "เดือนที่ใช้: " + TD.windowLabel(y) },
    ]);

    /* ---- map ---- */
    const vals = rows.map((i) => TD.val(A[i], f.type)).filter((v) => v > 0);
    breaks = [1, 2, 3, 4, 5].map((k) => TD.stats.quantile(vals, k / 6));
    $drawMap(A, base, f);
    document.getElementById("ov-map-desc").textContent = `สีแสดงจำนวนนักท่องเที่ยว${typeLbl} ปี ${y} (${TD.windowLabel(y)}) แบ่ง 6 ระดับตามควอนไทล์ของจังหวัดที่เลือก · คลิกจังหวัดเพื่อกรอง`;
    const lg = [`<span><i style="background:#d9dee0;border:1px dashed #9aa"></i>ไม่มีข้อมูล / นอกตัวกรอง</span>`];
    const edges = [0, ...breaks, Math.max(...vals)];
    for (let c = 0; c < 6; c++) lg.push(`<span><i style="background:${PAL[c]}"></i>${TD.f.people(edges[c])} – ${TD.f.people(edges[c + 1])}</span>`);
    document.getElementById("ov-map-legend").innerHTML = lg.join("");
    TD.setSrc("ov-map-src", "tour", "geo");

    /* ---- top 10 ---- */
    const top = rows.slice().sort((a, b) => TD.val(A[b], f.type) - TD.val(A[a], f.type)).slice(0, 10);
    const mx = TD.val(A[top[0]], f.type);
    const host = document.getElementById("ov-top10");
    host.innerHTML = top.map((i, k) => {
      const a = A[i], v = TD.val(a, f.type);
      const wT = f.type === "foreign" ? 0 : (a.thai / mx) * 100, wF = f.type === "thai" ? 0 : (a.foreign / mx) * 100;
      return `<div class="toprow ${String(TD.P[i].code) === f.prov ? "sel" : ""}" data-i="${i}">
        <span class="rk">${k + 1}</span><span class="nm" tabindex="0">${TD.esc(TD.P[i].th)}</span>
        <span class="bar" title="ไทย ${TD.f.int(a.thai)} · ต่างชาติ ${TD.f.int(a.foreign)}"><i class="t" style="width:${wT}%"></i><i class="f" style="width:${wF}%"></i></span>
        <span class="vl">${TD.f.people(v)}</span></div>`;
    }).join("") + `<div class="legend"><span><i style="background:var(--thai)"></i>ชาวไทย</span><span><i style="background:var(--foreign)"></i>ชาวต่างชาติ</span></div>`;
    host.querySelectorAll(".toprow .nm").forEach((nm) => {
      const i = +nm.parentElement.dataset.i;
      nm.addEventListener("mouseenter", (e) => TD.showCard(i, e));
      nm.addEventListener("mousemove", TD.moveCard);
      nm.addEventListener("mouseleave", TD.hideCard);
      nm.addEventListener("focus", () => { const r = nm.getBoundingClientRect(); TD.showCard(i, { clientX: r.right, clientY: r.top }); });
      nm.addEventListener("blur", TD.hideCard);
      nm.addEventListener("touchstart", (e) => { const t = e.touches[0]; TD.showCard(i, t); setTimeout(TD.hideCard, 3500); }, { passive: true });
    });
    TD.setSrc("ov-top-src", "tour");
    document.getElementById("ov-top-src").innerHTML += `<br><b>รูปภาพ</b> Wikimedia Commons (ผู้ถ่ายและใบอนุญาตแสดงในการ์ดภาพ; รายละเอียดครบใน <code>data/images.js</code>)`;

    /* ---- share doughnut ---- */
    Plotly.purge("ov-share");
    TD.plot("ov-share", [{
      type: "pie", hole: 0.55, labels: ["ชาวไทย", "ชาวต่างชาติ"], values: [thai, fr], sort: false,
      marker: { colors: [TD.colors().thai, TD.colors().foreign] },
      textinfo: "label+percent", hovertemplate: "%{label}<br>%{value:,.0f} คน<br>%{percent}<extra></extra>",
    }], { margin: { l: 10, r: 10, t: 10, b: 10 }, showlegend: false,
      annotations: [{ text: `${y}<br>${TD.f.people(thai + fr)}`, showarrow: false, font: { size: 15 } }] });
    document.getElementById("ov-share-src").innerHTML = TD.SRC.tour() + `<br>${TD.badge.calc} สัดส่วน = ผลรวมประเภทนั้น ÷ ผลรวมทั้งสองประเภท ของจังหวัดที่เลือก (${crows.length} จังหวัด)`;

    /* ---- yearly trend ---- */
    const ys = TD.years;
    const th = [], fo = [], lab = [];
    ys.forEach((yy) => {
      const AA = TD.agg(yy, TD.window(yy));
      th.push(TD.stats.sum(crows.map((i) => (AA[i] ? AA[i].thai : 0))));
      fo.push(TD.stats.sum(crows.map((i) => (AA[i] ? AA[i].foreign : 0))));
      lab.push(yy === 2023 ? "2023 (ม.ค.–ก.ค.)" : String(yy));
    });
    const tr = [];
    if (f.type !== "foreign") tr.push({ type: "bar", name: "ชาวไทย", x: lab, y: th, marker: { color: TD.colors().thai }, hovertemplate: "%{x}<br>ชาวไทย %{y:,.0f} คน<extra></extra>" });
    if (f.type !== "thai") tr.push({ type: "bar", name: "ชาวต่างชาติ", x: lab, y: fo, marker: { color: TD.colors().foreign }, hovertemplate: "%{x}<br>ชาวต่างชาติ %{y:,.0f} คน<extra></extra>" });
    TD.plot("ov-trend", tr, { barmode: "stack", xaxis: { title: "ปี (ค.ศ.)" }, yaxis: { title: "จำนวนนักท่องเที่ยว (คน)", tickformat: ",.2s" }, margin: { l: 70, r: 10, t: 10, b: 60 } });
    document.getElementById("ov-trend-src").innerHTML = TD.SRC.tour() + "<br>แต่ละปีใช้เดือนตามตัวเลือก “เทียบเฉพาะเดือนที่ทุกจังหวัดมีข้อมูล”";

    /* ---- notes ---- */
    const D = TD.D.tourism;
    const dup = D.droppedDuplicates;
    document.getElementById("ov-notes").innerHTML = `<h3>หมายเหตุคุณภาพข้อมูลที่ควรทราบ</h3><ul>
      <li><b>หน่วยนับ:</b> ชุดข้อมูลนับนักท่องเที่ยวที่เดินทางไปแต่ละจังหวัด ผู้เดินทางหลายจังหวัดจึงถูกนับซ้ำข้ามจังหวัด ผลรวมระดับประเทศจึงไม่เท่ากับจำนวนผู้เดินทางเข้าประเทศที่ไม่ซ้ำกัน</li>
      <li><b>ม.ค. 2021:</b> พบแถวซ้ำที่ค่าไม่ตรงกันของ ${dup.length / 2} จังหวัด จึงตัดแถวเหล่านั้นออกทั้งสองแถว (ไม่เดาว่าแถวใดถูก)</li>
      <li><b>ส.ค. 2022:</b> ไม่มีข้อมูลของ กรุงเทพมหานคร, พระนครศรีอยุธยา และ ลำพูน (ในชุดข้อมูลต้นทาง)</li>
      <li><b>ปี 2023:</b> มีข้อมูลถึง ก.ค. เท่านั้น (7 เดือน)</li>
      <li>ตัวเลือก “เทียบเฉพาะเดือนที่ทุกจังหวัดมีข้อมูล” ทำให้ทุกจังหวัดถูกเทียบด้วยช่วงเดือนเดียวกัน (ปี 2021 ตัด ม.ค.; ปี 2022 ตัด ส.ค.)</li></ul>`;
  }

  function $drawMap(A, base, f) {
    if (!map) {
      map = L.map("ov-map", { zoomSnap: 0.25, attributionControl: false, minZoom: 4.5 });
      L.control.attribution({ prefix: false }).addAttribution("ขอบเขตจังหวัด: OpenGISData-Thailand (CC BY 4.0)").addTo(map);
      layer = L.geoJSON(window.DASH_GEO, {
        style: () => ({ weight: 0.6, color: "#6b8a93", fillOpacity: 0.9 }),
        onEachFeature: (ft, lyr) => {
          lyr.on("click", () => TD.setFilter({ prov: String(ft.properties.code) }));
          lyr.bindTooltip(() => {
            const p = TD.byCode[ft.properties.code];
            const a = TD.agg(TD.state.year, TD.window(TD.state.year))[p.idx];
            if (!a) return `<b>${p.th}</b><br>ไม่มีข้อมูล`;
            return `<b>${p.th}</b> (${p.cityType})<br>${TD.typeLabel(TD.state.type)}: ${TD.f.int(TD.val(a, TD.state.type))} คน<br>ไทย ${TD.f.int(a.thai)} · ต่างชาติ ${TD.f.int(a.foreign)}`;
          }, { sticky: true });
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [4, 4] });
    }
    layer.eachLayer((lyr) => {
      const p = TD.byCode[lyr.feature.properties.code];
      const inSet = base.has(p.idx);
      const v = inSet ? TD.val(A[p.idx], f.type) : NaN;
      const c = classOf(v);
      const sel = String(p.code) === f.prov;
      lyr.setStyle({
        fillColor: c >= 0 ? PAL[c] : "#d9dee0", fillOpacity: inSet ? 0.92 : 0.35, dashArray: inSet && c < 0 ? "3" : null,
        weight: sel ? 2.8 : 0.6, color: sel ? "#b45309" : "#6b8a93",
      });
      if (sel) lyr.bringToFront();
    });
    setTimeout(() => map.invalidateSize(), 50);
  }

  TD.pages = TD.pages || {};
  TD.pages.overview = { render, onShow: () => map && setTimeout(() => map.invalidateSize(), 80) };
})();
