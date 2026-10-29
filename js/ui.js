/* Shared UI helpers: charts (Plotly), tables, KPI cards, source lines, hover card, CSV download. */
(function () {
  const TD = (window.TD = window.TD || {});
  const $ = (s, r = document) => r.querySelector(s);
  TD.$ = $;
  TD.$$ = (s, r = document) => [...r.querySelectorAll(s)];

  const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  TD.colors = () => ({
    ink: cssv("--ink"), muted: cssv("--muted"), line: cssv("--line"), card: cssv("--card"),
    thai: cssv("--thai"), foreign: cssv("--foreign"), teal: cssv("--teal"), eco: cssv("--blue"), cost: cssv("--amber"), con: cssv("--violet"), main: cssv("--main"), second: cssv("--second"),
  });

  /* ---- source lines (one per chart: source, URL, period, unit) ---- */
  const L = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  TD.SRC = {
    tour: () => `<b>ที่มา</b> กระทรวงการท่องเที่ยวและกีฬา (สำนักงานปลัดกระทรวง) · ${L("https://data.go.th/dataset/trend_domestic_tourists", "data.go.th/dataset/trend_domestic_tourists")} · ม.ค. 2015–ก.ค. 2023 · หน่วย: คน (นับรายจังหวัด)`,
    gpp: () => `<b>ที่มา</b> สศช. (NESDC) ผลิตภัณฑ์ภาคและจังหวัด แบบปริมาณลูกโซ่ (ปีอ้างอิง 2545) ผ่านตาราง 10.15 ${L("https://www.nso.go.th/public/e-book/Statistical-Yearbook/SYB-2025_webPage/File%20SYB/2025/10/T%2010.15%202025.pdf", "หนังสือสถิติรายปีประเทศไทย 2568 (สสช.)")} · ปี 2021 (r) และ 2022 · หน่วย: ล้านบาท / บาทต่อคน`,
    acc: () => `<b>ที่มา</b> การท่องเที่ยวแห่งประเทศไทย (ททท.) ${L("https://datacatalog.tat.or.th/dataset/accommodation", "datacatalog.tat.or.th/dataset/accommodation")} · ภาพรวม ณ วันที่ดึงข้อมูล 17 ต.ค. 2026 (snapshot) · หน่วย: แห่ง / ห้อง`,
    geo: () => `<b>ขอบเขตจังหวัด</b> ${L("https://github.com/chingchai/OpenGISData-Thailand", "OpenGISData-Thailand")} (CC BY 4.0, อ้างอิงกรมการปกครอง)`,
  };
  TD.setSrc = (id, ...keys) => { const e = $("#" + id); if (e) e.innerHTML = keys.map((k) => TD.SRC[k]()).join("<br>"); };

  /* ---- Plotly wrapper ---- */
  TD.plot = function (id, data, layout = {}, config = {}) {
    const el = typeof id === "string" ? $("#" + id) : id;
    if (!el) return;
    const c = TD.colors();
    const base = {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: '"Noto Sans Thai",system-ui,sans-serif', color: c.ink, size: 12 },
      margin: { l: 60, r: 20, t: 20, b: 50 },
      legend: { orientation: "h", y: -0.2 },
      hoverlabel: { font: { family: '"Noto Sans Thai",system-ui,sans-serif' } },
    };
    const xaxis = Object.assign({ gridcolor: c.line, zerolinecolor: c.line, linecolor: c.line }, layout.xaxis || {});
    const yaxis = Object.assign({ gridcolor: c.line, zerolinecolor: c.line, linecolor: c.line }, layout.yaxis || {});
    const lay = Object.assign(base, layout, { xaxis, yaxis });
    el.classList.remove("empty");
    if (el.style.height && parseInt(el.style.height, 10) > 0) lay.height = parseInt(el.style.height, 10);   // charts whose box is resized by code: Plotly.react would keep the old pixel height
    Plotly.react(el, data, lay, Object.assign({ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }, config));
  };
  TD.emptyChart = function (id, msg) {
    const el = $("#" + id);
    if (!el) return;
    try { Plotly.purge(el); } catch (e) { /* not a plot yet */ }
    el.innerHTML = `<div class="empty">${msg || "ไม่มีข้อมูลตามตัวกรองที่เลือก"}</div>`;
  };

  /* ---- KPI cards ---- */
  TD.kpis = function (id, items) {
    $("#" + id).innerHTML = items.map((k) => `<div class="kpi ${k.cls || ""}"><div class="l">${k.l}</div><div class="v">${k.v}</div><div class="n">${k.n || ""}</div></div>`).join("");
  };

  /* ---- sortable table ----
     cols: [{k, t, num, fmt(v,row), html}] */
  TD.table = function (id, cols, rows, opts = {}) {
    const host = typeof id === "string" ? $("#" + id) : id;
    let sortK = opts.sort || null, dir = opts.dir || -1;
    const draw = () => {
      let rs = rows.slice();
      if (sortK) {
        const c = cols.find((x) => x.k === sortK);
        rs.sort((a, b) => {
          const va = a[sortK], vb = b[sortK];
          if (va === null || va === undefined) return 1;
          if (vb === null || vb === undefined) return -1;
          return (typeof va === "string" ? va.localeCompare(vb, "th") : va - vb) * dir;
        });
      }
      host.innerHTML = `<table><thead><tr>${cols.map((c) => `<th class="sort ${c.num ? "num" : ""}" data-k="${c.k}">${c.t}${sortK === c.k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>${
        rs.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.html ? c.html(r) : c.fmt ? c.fmt(r[c.k], r) : TD.esc(r[c.k] ?? "–")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      host.querySelectorAll("th.sort").forEach((th) => th.addEventListener("click", () => {
        const k = th.dataset.k;
        if (sortK === k) dir = -dir; else { sortK = k; dir = -1; }
        draw();
      }));
    };
    draw();
  };

  /* ---- province hover card (photo of the main attraction) ---- */
  const card = () => $("#hovercard");
  TD.showCard = function (idx, ev) {
    const p = TD.P[idx];
    const im = TD.image(p.code);
    const c = card();
    if (im) {
      const src = im.kind === "attraction" ? `สถานที่: ${TD.esc(im.subject)}` : "ภาพจากบทความของจังหวัด (Wikipedia)";
      c.innerHTML = `<img src="${im.file}" alt="${TD.esc(im.subject)}" loading="lazy"><div class="t"><b>${TD.esc(p.th)}</b>${src}<small>ภาพ: ${TD.esc((im.author || "Wikimedia Commons").replace(/^Original image:\s*/i, ""))} · ${TD.esc(im.license || "")}</small></div>`;
    } else {
      c.innerHTML = `<div class="none">ไม่มีรูปภาพ</div><div class="t"><b>${TD.esc(p.th)}</b></div>`;
    }
    c.hidden = false;
    TD.moveCard(ev);
  };
  TD.moveCard = function (ev) {
    const c = card();
    if (c.hidden) return;
    const w = 260, h = c.offsetHeight || 220;
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 16;
    if (y + h > innerHeight - 8) y = innerHeight - h - 8;
    c.style.left = Math.max(8, x) + "px"; c.style.top = Math.max(8, y) + "px";
  };
  TD.hideCard = () => { card().hidden = true; };

  /* ---- CSV download (UTF-8 BOM so Excel reads Thai) ---- */
  TD.downloadCSV = function (name, header, rows) {
    const q = (v) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    const csv = "﻿" + [header.join(","), ...rows.map((r) => r.map(q).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ---- misc ---- */
  TD.badge = { raw: '<span class="badge raw">ข้อมูลต้นฉบับ</span>', calc: '<span class="badge calc">ค่าที่คำนวณ</span>', insight: '<span class="badge insight">ข้อสรุปจากการวิเคราะห์</span>', na: '<span class="badge na">ไม่มีข้อมูลเพียงพอ</span>' };
  TD.pName = (idx) => TD.P[idx].th;
  /** strength wording for |r| */
  TD.strength = (r) => { const a = Math.abs(r); return a >= 0.7 ? "สูง" : a >= 0.4 ? "ปานกลาง" : a >= 0.2 ? "ต่ำ" : "ต่ำมาก/แทบไม่มี"; };
  TD.corrHTML = function (xs, ys, label) {
    const X = [], Y = [];
    xs.forEach((x, i) => { if (Number.isFinite(x) && Number.isFinite(ys[i])) { X.push(x); Y.push(ys[i]); } });
    const n = X.length;
    if (n < 5) return `<span>${TD.badge.na} (n = ${n} จังหวัด น้อยเกินไปที่จะคำนวณสหสัมพันธ์)</span>`;
    const r = TD.stats.pearson(X, Y), rho = TD.stats.spearman(X, Y);
    const lx = X.map(TD.stats.log10), ly = Y.map(TD.stats.log10);
    const rl = TD.stats.pearson(lx, ly);
    const p = TD.stats.pValue(rho, n);
    const pt = p === null ? "" : p < 0.001 ? "p < 0.001" : "p = " + p.toFixed(3);
    return `<span>${TD.badge.calc}<b>n = ${n}</b> จังหวัด</span>
      <span>Pearson r = <b>${TD.f.r(r)}</b> (เชิงเส้น)</span>
      <span>Pearson r (log–log) = <b>${TD.f.r(rl)}</b></span>
      <span>Spearman ρ = <b>${TD.f.r(rho)}</b> (${TD.strength(rho)}, ${pt})</span>
      ${label ? `<span>${label}</span>` : ""}`;
  };
})();
