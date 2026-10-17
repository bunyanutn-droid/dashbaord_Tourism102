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
    TD.kpis("eco-kpis", [
      { l: "จังหวัดที่นำมาเปรียบเทียบ", v: pts.length + " จังหวัด", n: `ปี ${y} · เดือนที่ใช้: ${TD.monthsLabel(win)}`, cls: "eco" },
      { l: "สหสัมพันธ์อันดับ (Spearman ρ)", v: TD.f.r(rho), n: `นักท่องเที่ยว${typeLbl} กับ ${yLbl.split(" (")[0]}`, cls: "eco" },
      { l: "สหสัมพันธ์ log–log (Pearson r)", v: TD.f.r(rl), n: "ลดอิทธิพลค่าสุดโต่ง เช่น กทม.", cls: "eco" },
      { l: "นักท่องเที่ยวสูงสุด", v: topX.name, n: `GPP อันดับ ${topX.rg} · GPP ต่อหัวอันดับ ${topX.rp} (จาก ${pts.length})`, cls: "eco" },
    ]);

    /* ---- scatter ---- */
    const labelSet = new Set(pts.slice().sort((a, b) => b.x - a.x).slice(0, 8).map((p) => p.i));
    labelSet.add(pts.slice().sort((a, b) => b[yKey] - a[yKey])[0].i);
    pts.slice().sort((a, b) => b[yKey] - a[yKey]).slice(0, 4).forEach((p) => labelSet.add(p.i));
    const selI = f.prov !== "all" && TD.byCode[+f.prov] ? TD.byCode[+f.prov].idx : -1;
    if (selI >= 0) labelSet.add(selI);
    const traces = Object.keys(QN).map((q) => {
      const g = pts.filter((p) => p.q === q);
      return {
        type: "scatter", mode: "markers+text", name: QN[q], x: g.map((p) => p.x), y: g.map((p) => p[yKey]),
        text: g.map((p) => (labelSet.has(p.i) ? p.name : "")), textposition: "top center", textfont: { size: 10 },
        customdata: g.map((p) => [p.name, p.city, p.thai, p.foreign, p.gpp, p.pc, p.rx, p.i]),
        marker: { color: QC[q], size: g.map((p) => (p.i === selI ? 17 : 10)), opacity: 0.85, line: { width: g.map((p) => (p.i === selI ? 3 : 1)), color: g.map((p) => (p.i === selI ? "#b45309" : "#ffffff")) } },
        hovertemplate: "<b>%{customdata[0]}</b> (%{customdata[1]})<br>นักท่องเที่ยวรวม: %{x:,.0f} คน<br>ไทย %{customdata[2]:,.0f} · ต่างชาติ %{customdata[3]:,.0f}<br>GPP: %{customdata[4]:,.0f} ล้านบาท<br>GPP ต่อหัว: %{customdata[5]:,.0f} บาท/คน<br>อันดับนักท่องเที่ยว: %{customdata[6]}<extra></extra>",
      };
    });
    // hover for foreign-only/thai-only: x shows chosen type; hovertemplate says "รวม" -> fix label
    traces.forEach((t) => (t.hovertemplate = t.hovertemplate.replace("นักท่องเที่ยวรวม", "นักท่องเที่ยว" + typeLbl)));
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
    $("eco-scatter-desc").innerHTML = `แกน X = จำนวนนักท่องเที่ยว${typeLbl} ปี ${y} · แกน Y = ${yLbl} ปี ${y} · เส้นประ = ค่ามัธยฐาน (X ${TD.f.int(mx)} คน, Y ${TD.f.int(my)}) · ชี้หรือคลิกจุดเพื่อดูจังหวัด (คลิกเพื่อกรอง) ${TD.badge.raw}${TD.badge.calc}`;
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
    $("eco-quad").innerHTML = ["q1", "q2", "q3", "q4"].map((q) => {
      const g = pts.filter((p) => p.q === q).sort((a, b) => b.x - a.x);
      return `<div class="${q}"><h3>${QN[q]}</h3><div class="cnt">${g.length} จังหวัด</div><div class="names">${g.length ? g.map((p) => `${TD.esc(p.name)} <small>(#${p.rx})</small>`).join(" · ") : "—"}</div></div>`;
    }).join("");

    /* ---- automatic findings (all numbers come from the arrays above) ---- */
    const rhoPc = TD.stats.spearman(xs, pts.map((p) => p.pc));
    const rhoG = TD.stats.spearman(xs, pts.map((p) => p.gpp));
    const hh = pts.filter((p) => p.q === "q1").sort((a, b) => b.x - a.x).slice(0, 5);
    const hl = pts.filter((p) => p.q === "q2").sort((a, b) => b.x - a.x).slice(0, 5);
    const lh = pts.filter((p) => p.q === "q3").sort((a, b) => b[yKey] - a[yKey]).slice(0, 5);
    const nm = (p) => `<b>${TD.esc(p.name)}</b> (นักท่องเที่ยวอันดับ ${p.rx}, GPP อันดับ ${p.rg}, GPP ต่อหัวอันดับ ${p.rp})`;
    const dir = (r) => (r >= 0 ? "ไปในทิศทางเดียวกัน" : "สวนทางกัน");
    $("eco-findings").innerHTML = `<h3>ข้อค้นพบอัตโนมัติ ${TD.badge.insight}</h3><ul>
      <li>จาก ${pts.length} จังหวัด (ปี ${y}) ลำดับของนักท่องเที่ยว${typeLbl}กับลำดับของ GPP ${dir(rhoG)}: Spearman ρ = ${TD.f.r(rhoG)} (${TD.strength(rhoG)}) ส่วนกับ GPP ต่อหัวมี ρ = ${TD.f.r(rhoPc)} (${TD.strength(rhoPc)}) — สอดคล้องกับข้อสังเกตว่า “ขนาดเศรษฐกิจ” กับ “ผลผลิตต่อคน” เป็นคนละเรื่องกัน</li>
      <li><b>นักท่องเที่ยวสูง และ ${yLbl.split(" (")[0]} สูง (≥ มัธยฐานทั้งคู่):</b> ${hh.length ? hh.map(nm).join("; ") : "ไม่มี"}</li>
      <li><b>นักท่องเที่ยวสูง แต่ ${yLbl.split(" (")[0]} ต่ำกว่ามัธยฐาน:</b> ${hl.length ? hl.map(nm).join("; ") : "ไม่มี"}</li>
      <li><b>นักท่องเที่ยวน้อย แต่ ${yLbl.split(" (")[0]} สูง:</b> ${lh.length ? lh.map(nm).join("; ") : "ไม่มี"} — ชุดข้อมูลนี้ไม่แยก GPP ตามสาขาการผลิต จึงยืนยันไม่ได้ว่า GPP สูงมาจากอุตสาหกรรมหรือภาคอื่น</li>
      <li>ค่าสหสัมพันธ์เป็นเพียงความสัมพันธ์เชิงสถิติ ณ ปีเดียว (cross-section) จึงไม่พิสูจน์ว่านักท่องเที่ยวทำให้ GPP สูงขึ้น หรือ GPP สูงดึงดูดนักท่องเที่ยว</li></ul>`;

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
