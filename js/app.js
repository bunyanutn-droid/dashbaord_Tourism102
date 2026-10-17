/* App shell: loading / error states, tabs, global filters. */
(function () {
  const TD = window.TD;
  const $ = (id) => document.getElementById(id);
  const PAGES = ["overview", "economy", "cost", "concentration", "sources"];

  function fail(title, detail) {
    $("state-loading").hidden = true;
    const e = $("state-error");
    e.hidden = false;
    e.innerHTML = `<h2>${title}</h2><p>${detail}</p>`;
  }

  function buildFilters() {
    const s = TD.state;
    $("f-year").innerHTML = TD.years.map((y) => `<option value="${y}">${y} (พ.ศ. ${y + 543})${y === 2023 ? " — ม.ค.–ก.ค." : ""}</option>`).join("");
    $("f-year").value = String(s.year);
    $("f-region").innerHTML = `<option value="all">ทุกภูมิภาค</option>` + TD.regions.map((r) => `<option>${r}</option>`).join("");
    $("f-prov").innerHTML = `<option value="all">ทุกจังหวัด</option>` + TD.P.slice().sort((a, b) => a.th.localeCompare(b.th, "th")).map((p) => `<option value="${p.code}">${p.th}</option>`).join("");
    const bind = (id, key, conv) => $(id).addEventListener("change", (e) => TD.setFilter({ [key]: conv ? conv(e.target.value) : e.target.value }));
    bind("f-year", "year", Number); bind("f-region", "region"); bind("f-city", "city"); bind("f-type", "type"); bind("f-prov", "prov");
    $("f-common").addEventListener("change", (e) => TD.setFilter({ common: e.target.checked }));
    $("f-reset").addEventListener("click", () => TD.setFilter({ region: "all", city: "all", type: "all", prov: "all", common: true }));
  }

  function syncFilters() {
    const s = TD.state;
    $("f-year").value = String(s.year); $("f-region").value = s.region; $("f-city").value = s.city; $("f-type").value = s.type; $("f-prov").value = s.prov;
    $("f-common").checked = s.common;
    const n = TD.provSet().size, nb = TD.provSet({ ignoreProv: true }).size;
    const parts = [];
    if (s.region !== "all") parts.push(s.region);
    if (s.city !== "all") parts.push(s.city);
    if (s.prov !== "all") parts.push("จังหวัด" + TD.byCode[+s.prov].th);
    $("filter-note").textContent = `กำลังแสดง ${nb} จังหวัดตามตัวกรอง${parts.length ? " (" + parts.join(" · ") + ")" : ""}` +
      (s.prov !== "all" ? " · ตัวกรองจังหวัดมีผลกับ KPI สัดส่วน และแนวโน้มของหน้าภาพรวม ส่วนแผนที่/อันดับ/กราฟเปรียบเทียบยังแสดงทุกจังหวัดตามภูมิภาคและประเภทเมือง โดยเน้นสีจังหวัดที่เลือก" : "") +
      (s.page === "cost" ? " · หน้าค่าครองชีพไม่มีข้อมูลกรุงเทพมหานคร" : "");
  }

  TD.setFilter = function (patch) { Object.assign(TD.state, patch); TD.render(); };

  TD.render = function () {
    syncFilters();
    const p = TD.state.page;
    try {
      TD.pages[p].render();
      $("state-error").hidden = true;
    } catch (err) {
      console.error(err);
      fail("แสดงผลหน้านี้ไม่สำเร็จ", `เกิดข้อผิดพลาดในการประมวลผล: <code>${TD.esc(err.message)}</code> — ลองล้างตัวกรอง หรือเลือกปีอื่น`);
    }
  };

  function show(page) {
    TD.state.page = page;
    PAGES.forEach((p) => { $("page-" + p).hidden = p !== page; });
    TD.$$("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.page === page));
    $("filters").hidden = page === "sources";
    if (location.hash.slice(1) !== page) history.replaceState(null, "", "#" + page);
    TD.render();
    const pg = TD.pages[page];
    if (pg && pg.onShow) setTimeout(pg.onShow, 60);
    window.scrollTo({ top: 0 });
  }

  /* Python back-end (server.py) is optional: when present, data and saved uploads come from /api/*,
     otherwise the embedded data/*.js files are used. */
  async function fromBackend() {
    TD.backend = false;
    if (!/^https?:$/.test(location.protocol)) return;
    try {
      const h = await fetch("/api/health", { cache: "no-store" });
      if (!h.ok) return;
      const r = await fetch("/api/dataset", { cache: "no-store" });
      if (r.ok) { window.DASH_DATA = await r.json(); TD.backend = true; }
      for (const k of ["airport", "budget"]) {
        const u = await fetch("/api/upload/" + k, { cache: "no-store" });
        if (u.ok) { const j = await u.json(); if (j && j.rows) TD.extra[k] = j; }
      }
    } catch (e) { TD.backend = false; }
  }

  async function start() {
    await fromBackend();
    if ((window.__dataError && !TD.backend) || !window.DASH_DATA || !window.DASH_GEO) {
      return fail("โหลดข้อมูลไม่สำเร็จ", `ไม่พบไฟล์ <code>data/dataset.js</code> หรือ <code>data/provinces.geo.js</code> — รัน <code>python pipeline/build_data.py</code> เพื่อสร้างไฟล์จากโฟลเดอร์ <code>raw/</code> (ไม่มีการแสดงตัวเลขสมมติแทน)`);
    }
    if (!window.Plotly || !window.L) {
      return fail("โหลดไลบรารีกราฟไม่สำเร็จ", "ไม่พบไฟล์ในโฟลเดอร์ <code>vendor/</code> — ตรวจว่าโฟลเดอร์ครบ");
    }
    try {
      TD.init();
      const years = TD.years;
      if (!years.includes(TD.state.year)) TD.state.year = years[years.length - 2];
      buildFilters();
      Object.values(TD.pages).forEach((p) => p.init && p.init());
      TD.$$("#tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.page)));
      $("state-loading").hidden = true;
      const h = location.hash.slice(1);
      show(PAGES.includes(h) ? h : "overview");
      window.addEventListener("hashchange", () => { const hp = location.hash.slice(1); if (PAGES.includes(hp) && hp !== TD.state.page) show(hp); });
      window.addEventListener("resize", () => { const pg = TD.pages[TD.state.page]; if (pg && pg.onShow) pg.onShow(); });
    } catch (err) {
      console.error(err);
      fail("เริ่มระบบไม่สำเร็จ", `<code>${TD.esc(err.message)}</code>`);
    }
  }
  document.addEventListener("DOMContentLoaded", start);
})();
