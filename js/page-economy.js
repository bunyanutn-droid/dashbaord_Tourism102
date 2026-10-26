/* Page 2 - Tourism & Economy (visitors vs GPP). */
(function () {
  const TD = window.TD;
  const S = { metric: "gpp", scale: "log" };
  const $ = (id) => document.getElementById(id);
  const QN = { q1: "นักท่องเที่ยวสูง · GPP สูง", q2: "นักท่องเที่ยวสูง · GPP ต่ำ", q3: "นักท่องเที่ยวต่ำ · GPP สูง", q4: "นักท่องเที่ยวต่ำ · GPP ต่ำ" };
  const QC = { q1: "#0d9488", q2: "#e0a100", q3: "#7c3aed", q4: "#94a3b8" };

  function wire() {
    TD.$$("#eco-metric button").forEach((b) => b.addEventListener("click", () => { S.metric = b.dataset.v; TD.$$("#eco-metric button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
    TD.$$("#eco-scale button").forEach((b) => b.addEventListener("click", () => { S.scale = b.dataset.v; TD.$$("#eco-scale button").forEach((x) => x.classList.toggle("on", x === b)); render(); }));
  }

  function render() {
    const f = TD.state, y = f.year;
    const years = TD.gppYears().filter((v) => v <= 2022);
    const blocked = $("eco-blocked"), body = $("eco-body");
    if (!years.includes(y)) {
      body.hidden = true; blocked.hidden = false;
      blocked.innerHTML = `<h2>ปี ${y} ยังเปรียบเทียบกับ GPP ไม่ได้</h2><p>ข้อมูล GPP ที่ตรวจสอบได้ครบ 77 จังหวัดมีปี ${years.join(" และ ")} ที่ช่วงเวลาตรงกับข้อมูลนักท่องเที่ยวครบทั้งปี (GPP ปี 2023 เป็นค่าประมาณเบื้องต้น และนักท่องเที่ยวปี 2023 มีเพียง ม.ค.–ก.ค.) จึงไม่นำมาเทียบเสมือนเป็นช่วงเวลาเดียวกัน</p><button class="btn" id="eco-goto">ไปที่ปี 2022</button>`;
      $("eco-goto").onclick = () => TD.setFilter({ year: 2022 });
      return;
    }
    blocked.hidden = true; body.hidden = false;

    const win = TD.D.tourism.commonMonths[String(y)];          // always the common window on this page
    const A = TD.agg(y, win);
    const set = TD.provSet({ ignoreProv: true });
    const pts = [];
    set.forEach((i) => {
      const a = A[i];
      if (!a) return;
      const code = TD.P[i].code;
      const x = TD.val(a, f.type), gpp = TD.gpp(code, y), pc = TD.gppPc(code, y);
      if (!(x > 0) || gpp === null) return;
      pts.push({ i, name: TD.P[i].th, city: TD.P[i].cityType, region: TD.P[i].region, x, gpp, pc, thai: a.thai, foreign: a.foreign });
    });
    const yKey = S.metric === "pc" ? "pc" : "gpp";
    const yLbl = S.metric === "pc" ? "GPP ต่อหัว (บาท/คน/ปี)" : "GPP (ล้านบาท, ปริมาณลูกโซ่)";
    const typeLbl = TD.typeLabel(f.type);

    if (pts.length < 3) { TD.emptyChart("eco-scatter", "ข้อมูลไม่เพียงพอ — เหลือ " + pts.length + " จังหวัดตามตัวกรอง"); $("eco-corr").innerHTML = ""; return; }

    const mx = TD.stats.median(pts.map((p) => p.x)), my = TD.stats.median(pts.map((p) => p[yKey]));
    pts.forEach((p) => (p.q = p.x >= mx ? (p[yKey] >= my ? "q1" : "q2") : (p[yKey] >= my ? "q3" : "q4")));
    const rankX = TD.stats.rankDesc(pts.map((p) => p.x)), rankG = TD.stats.rankDesc(pts.map((p) => p.gpp)), rankP = TD.stats.rankDesc(pts.map((p) => p.pc));
    pts.forEach((p, k) => { p.rx = rankX[k]; p.rg = rankG[k]; p.rp = rankP[k]; });

    /* ---- KPIs ---- */
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p[yKey]);
    const rho = TD.stats.spearman(xs, ys), rl = TD.stats.pearson(xs.map(TD.stats.log10), ys.map(TD.stats.log10));
    const topX = pts.slice().sort((a, b) => b.x - a.x)[0];
    const hi = (k) => pts.slice().sort((a, b) => b[k] - a[k])[0], lo = (k) => pts.slice().sort((a, b) => a[k] - b[k])[0];
    const gH = hi("gpp"), gL = lo("gpp"), pH = hi("pc"), pL = lo("pc");
    TD.kpis("eco-kpis", [
      { l: `GPP สูงสุด ปี ${y}`, v: gH.name, n: `${TD.f.int(gH.gpp)} ล้านบาท · นักท่องเที่ยวอันดับ ${gH.rx}/${pts.length} · ${gH.city}`, cls: "eco" },
      { l: "GPP ต่ำสุด", v: gL.name, n: `${TD.f.int(gL.gpp)} ล้านบาท · นักท่องเที่ยวอันดับ ${gL.rx}/${pts.length} · ${gL.city}`, cls: "eco" },
      { l: "GPP ต่อหัวสูงสุด", v: pH.name, n: `${TD.f.int(pH.pc)} บาท/คน/ปี · นักท่องเที่ยวอันดับ ${pH.rx}/${pts.length}`, cls: "eco" },
      { l: "GPP ต่อหัวต่ำสุด", v: pL.name, n: `${TD.f.int(pL.pc)} บาท/คน/ปี · นักท่องเที่ยวอันดับ ${pL.rx}/${pts.length}`, cls: "eco" },
    ]);

    /* ---- scatter ---- */
    const labelSet = new Set(pts.slice().sort((a, b) => b.x - a.x).slice(0, 8).map((p) => p.i));
    labelSet.add(pts.slice().sort((a, b) => b[yKey] - a[yKey])[0].i);
    pts.slice().sort((a, b) => b[yKey] - a[yKey]).slice(0, 4).forEach((p) => labelSet.add(p.i));
    const selI = f.prov !== "all" && TD.byCode[+f.prov] ? TD.byCode[+f.prov].idx : -1;
    if (selI >= 0) labelSet.add(selI);
    const SYM = { "เมืองหลัก": "star", "เมืองรอง": "circle" };
    const traces = [];
    Object.keys(QN).forEach((q) => ["เมืองหลัก", "เมืองรอง"].forEach((ct) => {
      const g = pts.filter((p) => p.q === q && p.city === ct);
      traces.push({
        type: "scatter", mode: "markers+text", name: QN[q], legendgroup: q, showlegend: ct === "เมืองรอง", x: g.map((p) => p.x), y: g.map((p) => p[yKey]),
        text: g.map((p) => (labelSet.has(p.i) ? p.name : "")), textposition: "top center", textfont: { size: 10 },
        customdata: g.map((p) => [p.name, p.city, p.thai, p.foreign, p.gpp, p.pc, p.rx, p.i]),
        marker: { symbol: SYM[ct], color: QC[q], size: g.map((p) => (p.i === selI ? 19 : ct === "เมืองหลัก" ? 14 : 10)), opacity: 0.9, line: { width: g.map((p) => (p.i === selI ? 3 : 1)), color: g.map((p) => (p.i === selI ? "#b45309" : "#ffffff")) } },
        hovertemplate: "<b>%{customdata[0]}</b> (%{customdata[1]})<br>นักท่องเที่ยวรวม: %{x:,.0f} คน<br>ไทย %{customdata[2]:,.0f} · ต่างชาติ %{customdata[3]:,.0f}<br>GPP: %{customdata[4]:,.0f} ล้านบาท<br>GPP ต่อหัว: %{customdata[5]:,.0f} บาท/คน<br>อันดับนักท่องเที่ยว: %{customdata[6]}<extra></extra>",
      });
    }));
    // legend-only entries that explain the symbols
    traces.push({ type: "scatter", mode: "markers", name: "★ = เมืองหลัก", x: [null], y: [null], marker: { symbol: "star", color: "#64748b", size: 14 }, hoverinfo: "skip" });
    traces.push({ type: "scatter", mode: "markers", name: "● = เมืองรอง", x: [null], y: [null], marker: { symbol: "circle", color: "#64748b", size: 10 }, hoverinfo: "skip" });
    // hover for foreign-only/thai-only: x shows chosen type; hovertemplate says "รวม" -> fix label
    traces.forEach((t) => { if (t.hovertemplate) t.hovertemplate = t.hovertemplate.replace("นักท่องเที่ยวรวม", "นักท่องเที่ยว" + typeLbl); });
    const axis = (title, v) => ({ title, type: S.scale === "log" ? "log" : "linear", tickformat: v });
    TD.plot("eco-scatter", traces, {
      xaxis: Object.assign(axis(`จำนวนนักท่องเที่ยว${typeLbl} (คน, ${TD.monthsLabel(win)} ${y})`, ",.2s"), { automargin: true }),
      yaxis: Object.assign(axis(yLbl, ",d"), { automargin: true }),
      shapes: [
        { type: "line", x0: mx, x1: mx, yref: "paper", y0: 0, y1: 1, line: { color: "#94a3b8", dash: "dot", width: 1 } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: my, y1: my, line: { color: "#94a3b8", dash: "dot", width: 1 } },
      ],
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 14, t: 14, b: 70 },
    });
    const gd = $("eco-scatter");
    if (gd.removeAllListeners) gd.removeAllListeners("plotly_click");
    gd.on("plotly_click", (e) => { const cd = e.points[0].customdata; TD.setFilter({ prov: String(TD.P[cd[7]].code) }); });
    $("eco-scatter-desc").innerHTML = `แกน X = จำนวนนักท่องเที่ยว${typeLbl} ปี ${y} · แกน Y = ${yLbl} ปี ${y} · เส้นประ = ค่ามัธยฐาน (X ${TD.f.int(mx)} คน, Y ${TD.f.int(my)}) · <b>★ = เมืองหลัก · ● = เมืองรอง</b> · สี = กลุ่มตามมัธยฐาน · ชี้หรือคลิกจุดเพื่อดูจังหวัด (คลิกเพื่อกรอง) ${TD.badge.raw}${TD.badge.calc}`;
    $("eco-corr").innerHTML = TD.corrHTML(xs, ys, `<i>สหสัมพันธ์ไม่ใช่หลักฐานเชิงเหตุและผล</i>`);
    $("eco-scatter-src").innerHTML = TD.SRC.tour() + "<br>" + TD.SRC.gpp() + `<br>ช่วงเวลา: นักท่องเที่ยวปี ${y} เดือน ${TD.monthsLabel(win)}; GPP ปี ${y} ทั้งปี`;

    /* ---- rankings ---- */
    const bar = (id, key, color, nm) => {
      const top = pts.slice().sort((a, b) => b[key] - a[key]).slice(0, 15).reverse();
      TD.plot(id, [{
        type: "bar", orientation: "h", x: top.map((p) => p[key]), y: top.map((p) => p.name),
        marker: { color: top.map((p) => (p.i === selI ? "#b45309" : color)) },
        customdata: top.map((p) => [p.rx]), text: top.map((p) => TD.f.int(p[key])), textposition: "outside", cliponaxis: false,
        hovertemplate: "<b>%{y}</b><br>" + nm + ": %{x:,.0f}<br>อันดับนักท่องเที่ยว: %{customdata[0]}<extra></extra>",
      }], { margin: { l: 110, r: 70, t: 10, b: 50 }, xaxis: { title: nm, tickformat: ",d" }, yaxis: { automargin: true } });
    };
    bar("eco-rank-gpp", "gpp", TD.colors().eco, "GPP (ล้านบาท)");
    bar("eco-rank-pc", "pc", "#38a3d8", "GPP ต่อหัว (บาท/คน/ปี)");
    $("eco-rank1-src").innerHTML = TD.SRC.gpp() + "<br>15 อันดับแรกจากจังหวัดที่เลือก · GPP สะท้อน “ขนาดเศรษฐกิจ” ไม่ใช่รายได้ของประชาชน";
    $("eco-rank2-src").innerHTML = TD.SRC.gpp() + "<br>GPP ต่อหัว = GPP ÷ ประชากรตามการคาดประมาณของ สศช. สะท้อน “ผลผลิตเฉลี่ยต่อคน” ซึ่งไม่เท่ากับรายได้ครัวเรือน";

    /* ---- quadrants ---- */
    $("eco-quad-desc").innerHTML = `เกณฑ์: นักท่องเที่ยวสูง = ≥ ${TD.f.int(mx)} คน, ${yLbl.split(" (")[0]}สูง = ≥ ${TD.f.int(my)} (ค่ามัธยฐานของ ${pts.length} จังหวัดที่แสดง) ${TD.badge.calc} — การแบ่งนี้เป็นวิธีจัดกลุ่มเชิงเปรียบเทียบ ไม่ใช่เกณฑ์ทางการ`;
    const cnt = (q, ct) => pts.filter((p) => p.q === q && p.city === ct).length;
    const order = ["q4", "q3", "q2", "q1"];
    TD.plot("eco-quad-chart", [
      { type: "bar", orientation: "h", name: "★ เมืองหลัก", y: order.map((q) => QN[q]), x: order.map((q) => cnt(q, "เมืองหลัก")), marker: { color: TD.colors().main }, text: order.map((q) => cnt(q, "เมืองหลัก") || ""), textposition: "inside", hovertemplate: "%{y}<br>เมืองหลัก %{x} จังหวัด<extra></extra>" },
      { type: "bar", orientation: "h", name: "● เมืองรอง", y: order.map((q) => QN[q]), x: order.map((q) => cnt(q, "เมืองรอง")), marker: { color: TD.colors().second }, text: order.map((q) => cnt(q, "เมืองรอง") || ""), textposition: "inside", hovertemplate: "%{y}<br>เมืองรอง %{x} จังหวัด<extra></extra>" },
    ], { barmode: "stack", xaxis: { title: "จำนวนจังหวัด" }, yaxis: { automargin: true }, margin: { l: 150, r: 10, t: 10, b: 60 }, legend: { orientation: "h", y: -0.3 } });
    $("eco-quad").innerHTML = ["q1", "q2", "q3", "q4"].map((q) => {
      const g = pts.filter((p) => p.q === q).sort((a, b) => b.x - a.x);
      return `<details class="${q}"><summary>${QN[q]} — ${g.length} จังหวัด</summary><div class="names">${g.length ? g.map((p) => `${p.city === "เมืองหลัก" ? "★" : "●"} ${TD.esc(p.name)} <small>(#${p.rx})</small>`).join(" · ") : "—"}</div></details>`;
    }).join("");

    /* ---- summary (for the mascot): only what needs analysis, all numbers computed from the arrays above ---- */
    const rhoPc = TD.stats.spearman(xs, pts.map((p) => p.pc));
    const rhoG = TD.stats.spearman(xs, pts.map((p) => p.gpp));
    const gapUp = pts.filter((p) => p.rx - p.rg >= 10).sort((a, b) => (b.rx - b.rg) - (a.rx - a.rg)).slice(0, 3);     // GPP rank much better than visitor rank
    const gapDown = pts.filter((p) => p.rg - p.rx >= 10).sort((a, b) => (b.rg - b.rx) - (a.rg - a.rx)).slice(0, 3);   // visitor rank much better than GPP rank
    const gl = (arr, a1, a2) => arr.map((p) => `<b>${TD.esc(p.name)}</b> (นักท่องเที่ยวอันดับ ${p.rx} → ${a1} อันดับ ${a2(p)})`).join("; ");
    const strong = Math.abs(rhoG) >= 0.4;
    $("eco-findings").innerHTML = `<h3>สรุป ${TD.badge.insight}</h3><ul>
      <li><b>นักท่องเที่ยวมากไม่ได้แปลว่าเศรษฐกิจใหญ่เสมอไป:</b> ลำดับนักท่องเที่ยว${typeLbl}สัมพันธ์กับลำดับ GPP ในระดับ${TD.strength(rhoG)} (Spearman ρ = ${TD.f.r(rhoG)}, ${pts.length} จังหวัด) ${strong ? "คือจังหวัดที่คนไปมากมักมี GPP สูงกว่า แต่ยังมีข้อยกเว้นชัดเจนด้านล่าง" : "จึงใช้จำนวนนักท่องเที่ยวทำนาย GPP ได้ไม่ดี"} ส่วนกับ GPP ต่อหัวสัมพันธ์น้อยกว่า (ρ = ${TD.f.r(rhoPc)}) แปลว่าคนไปมากไม่ได้ทำให้ผลผลิตเฉลี่ยต่อคนของคนในจังหวัดสูงตาม</li>
      ${gapUp.length ? `<li><b>GPP สูงกว่าที่จำนวนนักท่องเที่ยวบอก:</b> ${gl(gapUp, "GPP", (p) => p.rg)} — เศรษฐกิจกลุ่มนี้น่าจะพึ่งพาภาคอื่น (เช่น อุตสาหกรรม) มากกว่าการท่องเที่ยว แต่ข้อมูลไม่แยก GPP รายสาขา จึงยืนยันไม่ได้</li>` : ""}
      ${gapDown.length ? `<li><b>นักท่องเที่ยวมากแต่ GPP ต่ำกว่าที่คาด:</b> ${gl(gapDown, "GPP", (p) => p.rg)} — การท่องเที่ยวอาจไม่ได้ช่วยยกขนาดเศรษฐกิจ หรือเป็นการเดินทางเที่ยวระยะสั้นที่ใช้จ่ายน้อย (สมมติฐาน ไม่ใช่ข้อสรุป)</li>` : ""}
      <li><b>ข้อควรระวัง:</b> เป็นความสัมพันธ์เชิงสถิติ ณ ปีเดียว ไม่พิสูจน์ว่าการท่องเที่ยวทำให้ GPP สูงขึ้นหรือในทางกลับกัน</li></ul>`;

    $("eco-limits").innerHTML = `<h3>ข้อจำกัดของการใช้ GPP วัดความเข้มแข็งทางเศรษฐกิจ</h3><ul>
      <li>GPP วัดมูลค่าการผลิตภายในจังหวัด ไม่ใช่รายได้ของประชาชน จังหวัดที่มีโรงงานหรืออุตสาหกรรมขนาดใหญ่อาจมี GPP สูงโดยไม่เกี่ยวกับการท่องเที่ยว (ห้ามสรุปว่า “GPP สูง = เศรษฐกิจดี”) — จึงแสดง GPP ต่อหัวควบคู่</li>
      <li>GPP ต่อหัวคำนวณจากประชากรตามประมาณการของ สศช. ไม่ใช่ประชากรแฝงหรือจำนวนนักท่องเที่ยว จังหวัดท่องเที่ยวที่มีประชากรน้อยอาจมีค่าต่อหัวสูงผิดปกติ</li>
      <li>GPP เป็น <b>ปริมาณลูกโซ่ (ราคาคงที่ ปีอ้างอิง 2545)</b> ปี 2021 เป็นค่าปรับปรุง (r) เปรียบเทียบข้ามจังหวัดในปีเดียวกันได้ แต่ไม่ใช่มูลค่าปัจจุบัน (nominal)</li>
      <li>นักท่องเที่ยวที่ใช้เป็น ${TD.monthsLabel(win)} (${win.length} เดือน) ส่วน GPP เป็นรายปี — ใช้ช่วงเดือนเดียวกันกับทุกจังหวัดเพื่อให้เทียบกันได้ และไม่เติมค่าที่ขาด</li>
      <li>ข้อมูลนักท่องเที่ยวนับตามจังหวัดปลายทาง (ผู้เดินทางหลายจังหวัดนับซ้ำ) และกรุงเทพมหานครเป็นค่าสุดโต่งที่มีอิทธิพลต่อค่า Pearson เชิงเส้น จึงแสดง Spearman และ log–log ควบคู่</li></ul>`;
  }

  TD.pages = TD.pages || {};
  TD.pages.economy = { render, init: wire, onShow: () => { const g = document.getElementById("eco-scatter"); if (g && g.data) Plotly.Plots.resize(g); } };
})();
