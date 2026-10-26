/* Story mode = a slide show. Each slide shows ONLY the chart/card being talked about (the live card is moved into the slide)
   and the narration sits in its own column, so the text never covers the data.
   The narration is the same computed summary (.findings) the mascot shows on each page - nothing is typed in by hand. */
(function () {
  const TD = window.TD;
  const root = document.createElement("div");
  root.id = "story"; root.hidden = true;
  root.innerHTML = `<div class="sl-head"><b id="sl-title"></b><div class="story-dots" id="st-dots"></div><span class="cnt" id="st-count"></span><button type="button" id="st-x">✕ ออก</button></div>
    <div class="sl-body">
      <section class="sl-stage" id="sl-stage" aria-live="polite"></section>
      <aside class="sl-note" role="dialog" aria-label="คำบรรยาย">
        <div class="sl-avatar" id="st-avatar" aria-hidden="true"></div>
        <div class="sl-text" id="st-text"></div>
        <div class="st-nav"><button type="button" id="st-prev">← ก่อนหน้า</button><button type="button" id="st-next" class="go">ถัดไป →</button></div>
      </aside>
    </div>`;
  document.body.appendChild(root);
  const $ = (id) => document.getElementById(id);

  const pick = (findId, keyword) => {
    const el = $(findId);
    const li = el && [...el.querySelectorAll("li")].find((x) => x.textContent.includes(keyword));
    return li ? li.innerHTML : null;
  };
  const STEPS = [
    { page: "overview", target: "#ov-kpis", title: "ใครสร้างรายได้ให้การท่องเที่ยวไทย?", find: ["ov-findings", "ชาวต่างชาติสร้างรายได้ต่อคน"] },
    { page: "overview", target: "#ov-top10", title: "รายได้กระจุกตัวกว่าจำนวนคนมาก", find: ["ov-findings", "รายได้กระจุกตัว"] },
    { page: "overview", target: "#ov-scatter", title: "คนน้อยแต่ได้เงินมาก — และกลับกัน", find: ["ov-findings", "ได้รายได้เกินจำนวนคน"] },
    { page: "overview", target: "#ov-recovery", title: "การฟื้นตัวหลังโควิด-19", find: ["ov-findings", "การฟื้นตัว"] },
    { page: "map", target: "#ov-map", title: "บนแผนที่ รายได้ไปรวมกันที่ไหน", find: ["map-findings", "กระจุกตัวในไม่กี่จังหวัด"] },
    { page: "economy", target: "#eco-scatter", title: "นักท่องเที่ยวมาก = เศรษฐกิจใหญ่จริงหรือ?", find: ["eco-findings", "นักท่องเที่ยวมากไม่ได้แปลว่า"] },
    { page: "concentration", target: "#con-rank", title: "ห้องพักสอดคล้องกับจำนวนนักท่องเที่ยวไหม", find: ["con-findings", "ห้องพักกับนักท่องเที่ยวสัมพันธ์"] },
    { page: "concentration", target: "#con-share", title: "การกระจุกตัวเปลี่ยนไปหลังโควิดหรือไม่", find: ["con-findings", "การกระจุกตัว"] },
    { page: null, target: null, title: "จบการเล่าเรื่อง", text: "ทั้งหมดนี้มาจากข้อมูลทางการและตัวเลขที่คำนวณจากข้อมูลจริง ตัวเลขเป็นความสัมพันธ์เชิงสถิติ ไม่ใช่เหตุและผล — ลองเปลี่ยนปี ภูมิภาค หรือประเภทนักท่องเที่ยวที่ตัวกรอง แล้วคลิกฉันที่มุมจอเพื่ออ่านสรุปของแต่ละหน้าได้เสมอ 😊" },
  ];
  let i = 0, on = false, moved = null;

  function restore() { if (moved) { moved.ph.replaceWith(moved.el); moved = null; } }
  function resizeCharts(el) {
    setTimeout(() => {
      el.querySelectorAll(".js-plotly-plot").forEach((g) => { try { Plotly.Plots.resize(g); } catch (e) { /* not ready */ } });
      if (TD.pages.map && TD.pages.map.onShow) TD.pages.map.onShow();
    }, 160);
  }
  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    const s = STEPS[i];
    restore();
    if (s.page) { if (TD.state.page !== s.page) TD.showPage(s.page); else TD.render(); }
    $("sl-title").textContent = s.title;
    $("st-count").textContent = `${i + 1} / ${STEPS.length}`;
    $("st-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    $("st-text").innerHTML = s.text || (s.find && pick(s.find[0], s.find[1])) || "ไม่มีข้อมูลเพียงพอสำหรับขั้นนี้ตามตัวกรองปัจจุบัน";
    $("st-prev").disabled = i === 0;
    $("st-next").textContent = i === STEPS.length - 1 ? "เริ่มใหม่ ↺" : "ถัดไป →";
    const stage = $("sl-stage");
    stage.innerHTML = ""; stage.scrollTop = 0;
    if (s.target) {
      const t = document.querySelector(s.target);
      const el = t && (t.closest(".card") || t);
      if (el) {
        const ph = document.createElement("div");
        el.parentNode.insertBefore(ph, el);
        stage.appendChild(el);
        moved = { el, ph };
        resizeCharts(el);
      } else stage.innerHTML = '<div class="sl-thanks"><p>ไม่มีข้อมูลสำหรับขั้นนี้</p></div>';
    } else stage.innerHTML = '<div class="sl-thanks"><div style="font-size:4rem">🎓</div><h2>ขอบคุณที่รับชม</h2><p>ตัวเลขทั้งหมดตรวจสอบย้อนกลับได้ที่หน้า “แหล่งข้อมูลและวิธีวิเคราะห์”</p></div>';
  }
  function start() {
    on = true;
    document.body.classList.add("story-on");
    Object.assign(TD.state, { year: 2022, region: "all", city: "all", type: "all", prov: "all", common: true });   // a clean, comparable view
    if (TD.stopPlay) TD.stopPlay();
    $("st-avatar").innerHTML = TD.mascotInstance ? TD.mascotInstance({ bust: true }) : "";
    root.hidden = false;
    go(0);
  }
  function stop() { on = false; restore(); root.hidden = true; $("sl-stage").innerHTML = ""; document.body.classList.remove("story-on"); TD.render(); }
  TD.startStory = start;
  $("st-next").addEventListener("click", () => (i === STEPS.length - 1 ? go(0) : go(i + 1)));
  $("st-prev").addEventListener("click", () => go(i - 1));
  $("st-x").addEventListener("click", stop);
  document.addEventListener("keydown", (e) => {
    if (!on) return;
    if (e.key === "Escape") stop();
    else if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
  });
  const sb = document.getElementById("side-story");
  if (sb) sb.addEventListener("click", start);
})();
