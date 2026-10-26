/* Cover (landing) page: all 12 attraction photos (main + secondary cities) tiled side by side, title and "Open Dashboard".
   Shown on a fresh visit; skipped when the URL already points to a page (e.g. ...#map). */
(function () {
  const cover = document.getElementById("cover");
  if (!cover) return;
  const close = () => { cover.remove(); document.body.classList.remove("cover-on"); };
  if (location.hash && location.hash.length > 1) return close();
  document.body.classList.add("cover-on");

  // main and secondary cities alternate so that the mosaic mixes both groups
  const CODES = [10, 55, 83, 64, 50, 57, 81, 58, 71, 63, 84, 52];
  const img = (window.DASH_IMAGES && window.DASH_IMAGES.province) || {};
  const grid = cover.querySelector(".cv-grid");
  CODES.filter((c) => img[c]).forEach((c, k) => {
    const t = document.createElement("div");
    t.className = "tile";
    t.style.backgroundImage = `url(${img[c].file})`;
    t.style.animationDelay = (k * 0.07) + "s";
    grid.appendChild(t);
  });

  // short facts line, computed from the loaded data (nothing typed in by hand)
  const P = (window.DASH_DATA && window.DASH_DATA.provinces) || [];
  if (P.length) {
    const main = P.filter((p) => p.cityType === "เมืองหลัก").length;
    document.getElementById("cv-sub").textContent = `${P.length} จังหวัด · เมืองหลัก ${main} · เมืองรอง ${P.length - main} · ข้อมูลนักท่องเที่ยวและรายได้ ปี 2015–2023`;
  }

  // waving mascot
  const mh = document.getElementById("cv-mascot");
  if (mh && window.TD && TD.mascotInstance) mh.insertAdjacentHTML("beforeend", TD.mascotInstance({ wave: true }));
  const storyBtn = document.getElementById("cv-story");

  function open(thenStory) { cover.classList.add("leaving"); setTimeout(() => { close(); if (thenStory === true && window.TD && TD.startStory) TD.startStory(); }, 850); }
  const btn = document.getElementById("cv-open");
  btn.addEventListener("click", () => open(false));
  if (storyBtn) storyBtn.addEventListener("click", () => { document.removeEventListener("keydown", onKeyRef); open(true); });
  function onKeyRef(e) {
    if (cover.isConnected && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); open(false); document.removeEventListener("keydown", onKeyRef); }
  }
  document.addEventListener("keydown", onKeyRef);
  setTimeout(() => btn.focus({ preventScroll: true }), 50);
})();
