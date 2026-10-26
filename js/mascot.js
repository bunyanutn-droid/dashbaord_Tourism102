/* Mascot: a flat-illustration student (brown bob with side-swept bangs, round glasses, white shirt, black pleated skirt).
   TD.mascotInstance(opts) returns the SVG for each use:
     {sign:true}  holds the "สรุป" sign (floating guide)   {wave:true} waves with her left hand (cover)   {bust:true} head and shoulders (story slides)
   The floating guide opens the page's summary (the page's .findings card, hidden from the page itself) when clicked. */
(function () {
  const TD = (window.TD = window.TD || {});
  const INK = "#2b2220", SKIN = "#f2c6a2", HAIR = "#6b4630", HAIR2 = "#8a5e40";
  const st = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

  /* hanging left arm (screen left); the right arm is the same shape mirrored around x = 383 */
  const armShape = `<path d="M266,432 L302,440 C300,520 302,585 308,628 L270,632 C260,575 260,500 266,432Z" fill="${SKIN}" ${st}/>
    <path d="M270,632 L308,628 C314,652 310,676 298,684 C286,688 272,680 268,664Z" fill="${SKIN}" ${st}/>
    <path d="M280,666 L282,682 M292,664 L294,684" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const sleeveL = `<path d="M318,335 L284,346 C266,354 262,384 262,432 L302,442 L314,422 L320,362Z" fill="#fff" ${st}/>`;

  const studentInstance = function (opts = {}) {
    const sign = !!opts.sign, wave = !!opts.wave;
    const vb = opts.viewBox || (opts.bust ? "238 52 290 380" : sign ? "205 40 540 960" : wave ? "135 30 480 960" : "205 40 360 960");
    const leftArm = wave
      ? `<g class="wave-arm">${armShape}</g>`                       /* raised + waving (CSS animates the rotation) */
      : armShape;
    /* raised arm: drawn BEHIND the shirt so it comes out of the sleeve; the hand + pole go in front */
    const rightBack = sign ? `<path d="M468,428 L610,408 C618,418 618,442 610,454 L468,466Z" fill="${SKIN}" ${st}/>` : "";
    const rightArm = sign
      ? `<rect x="623" y="250" width="12" height="270" rx="5" fill="#a0713f" ${st}/>
         <circle cx="629" cy="432" r="22" fill="${SKIN}" ${st}/>
         <path d="M614,422 Q629,415 644,422 M614,434 Q629,427 644,434" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<g transform="translate(766 0) scale(-1 1)">${armShape}</g>`;
    const board = sign ? `<g class="mascot-sign">
        <rect x="545" y="140" width="168" height="124" rx="16" fill="#fffdf2" ${st}/>
        <rect x="556" y="151" width="146" height="102" rx="10" fill="none" stroke="#f5c56b" stroke-width="3" stroke-dasharray="8 6"/>
        <text x="629" y="231" text-anchor="middle" font-family="'Noto Sans Thai',system-ui,sans-serif" font-weight="700" font-size="84" fill="#0f766e">สรุป</text>
        <path d="M574,172 l5,10 10,5 -10,5 -5,10 -5,-10 -10,-5 10,-5z" fill="#f59e0b"/>
        <path d="M684,236 l4,8 8,4 -8,4 -4,8 -4,-8 -8,-4 8,-4z" fill="#14b8a6"/>
      </g>` : "";
    return `<svg class="mascot-svg" viewBox="${vb}" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="383" cy="966" rx="138" ry="13" fill="rgba(80,50,20,.22)"/>
  <g transform="translate(-9 -8)">
  <!-- hair (bell-shaped bob) and ears -->
  <path transform="translate(392 230) scale(1.05) translate(-392 -230)" d="M300,296 C284,292 270,266 264,232 C258,190 266,140 296,106 C326,76 362,66 395,66 C430,66 466,76 492,104 C514,128 524,170 522,214 C521,250 512,282 494,294 C482,298 470,296 462,292 L400,298Z" fill="${HAIR}" ${st}/>
  <ellipse cx="297" cy="238" rx="17" ry="24" fill="${SKIN}" ${st}/><ellipse cx="490" cy="238" rx="17" ry="24" fill="${SKIN}" ${st}/>
  <path d="M296,236 Q304,246 296,258 M491,236 Q483,246 491,258" stroke="#d9a27c" stroke-width="7" fill="none" stroke-linecap="round"/>
  </g>
  <!-- legs, socks, shoes -->
  <path d="M316,700 L372,700 L371,800 L319,800Z" fill="${SKIN}" ${st}/><path d="M394,700 L450,700 L447,800 L395,800Z" fill="${SKIN}" ${st}/>
  <path d="M315,788 L372,788 L370,906 L319,906Z" fill="#fff" ${st}/><path d="M394,788 L451,788 L447,906 L396,906Z" fill="#fff" ${st}/>
  <path d="M316,800 Q344,806 371,800 M395,800 Q423,806 450,800" stroke="${INK}" stroke-width="2.5" fill="none"/>
  <path d="M308,912 C316,894 366,894 372,912 C378,942 372,970 344,970 C318,970 304,948 308,912Z" fill="#161616" ${st}/>
  <path d="M394,912 C400,894 450,894 458,912 C462,948 448,970 422,970 C394,970 388,942 394,912Z" fill="#161616" ${st}/>
  <path d="M330,916 L352,924 M352,916 L330,924 M336,932 L358,938 M358,932 L336,938 M414,916 L436,924 M436,916 L414,924 M408,932 L430,938 M430,932 L408,938" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <!-- pleated skirt + belt -->
  <path d="M318,506 L448,506 L506,690 C500,704 470,714 383,714 C296,714 266,704 262,690Z" fill="#171717" ${st}/>
  <path d="M342,508 L318,708 M368,508 L354,714 M398,508 L412,714 M424,508 L450,708" stroke="#3d3d3d" stroke-width="3" fill="none"/>
  <rect x="316" y="486" width="134" height="21" rx="3" fill="#6b4228" ${st}/><rect x="366" y="484" width="34" height="25" rx="3" fill="#cfd3d8" ${st}/>
  <!-- left arm (under sleeve) -->
  ${leftArm}
  ${rightBack}
  <!-- shirt -->
  <path d="M346,316 L420,316 L448,334 L456,440 L452,490 L316,490 L312,440 L318,334Z" fill="#fff" ${st}/>
  ${sleeveL}
  <path d="M448,335 L482,346 C500,354 504,384 504,432 L464,442 L452,422 L446,362Z" fill="#fff" ${st}/>
  <path d="M346,296 L383,324 L383,354 L352,334Z" fill="#fff" ${st}/><path d="M420,296 L383,324 L383,354 L414,334Z" fill="#fff" ${st}/>
  <circle cx="394" cy="378" r="6" fill="#fff" ${st}/><circle cx="394" cy="421" r="6" fill="#fff" ${st}/><circle cx="394" cy="463" r="6" fill="#fff" ${st}/>
  <!-- right arm (hanging, or raised with the sign) -->
  ${rightArm}
  <!-- neck + face; the zig-zag upper edge is the side-swept bangs (hair above, skin below) -->
  <path d="M364,290 L364,316 L404,316 L404,290Z" fill="${SKIN}" ${st}/>
  <g transform="translate(-9 -8)">
  <path d="M306,198 L330,166 L358,127 L367,153 L391,174 L408,182 L395,152 L439,179 L432,155 L486,196 C484,262 446,298 394,298 C342,298 306,262 306,198Z" fill="${SKIN}" ${st}/>
  <circle cx="336" cy="251" r="19" fill="#e5453a" opacity=".95"/><circle cx="452" cy="251" r="19" fill="#e5453a" opacity=".95"/>
  <path d="M344,191 Q356,184 369,189 M418,189 Q431,183 444,188" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <g class="mascot-eyes"><circle cx="356" cy="224" r="11" fill="#1c1c38"/><circle cx="430" cy="224" r="11" fill="#1c1c38"/></g>
  <path d="M390,231 Q384,236 392,241" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M370,266 Q393,283 416,266" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <!-- round glasses -->
  <circle cx="356" cy="223" r="34" fill="rgba(255,255,255,.12)" stroke="#4a3426" stroke-width="3.6"/><circle cx="430" cy="223" r="34" fill="rgba(255,255,255,.12)" stroke="#4a3426" stroke-width="3.6"/>
  <path d="M386,221 Q393,215 400,221 M325,219 L302,213 M461,219 L486,213" stroke="#4a3426" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  </g>
  ${board}
</svg>`;
  };


  /* ---------------- chubby orange cat (the default mascot) ----------------
     Same API and poses as the student: {sign:true} holds the "สรุป" sign, {wave:true} waves, {bust:true} head and shoulders. */
  const CAT = "#f4a04b", CAT_D = "#d9791f", CREAM = "#ffe7c7", PINK = "#ff9fb2", LINE = "#3a2518";
  const cs = `stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
  const arm = (d, pawX, pawY) => `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="78" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${CAT}" stroke-width="66" stroke-linecap="round"/><circle cx="${pawX}" cy="${pawY}" r="32" fill="${CREAM}" ${cs}/><path d="M${pawX - 10},${pawY + 6} v12 M${pawX + 10},${pawY + 6} v12" stroke="${LINE}" stroke-width="3.5" stroke-linecap="round"/>`;
  const HANG = "M236,590 C196,650 190,730 216,788";
  const catInstance = function (opts = {}) {
    const sign = !!opts.sign, wave = !!opts.wave;
    const vb = opts.bust ? "175 78 420 440" : sign ? "70 40 840 960" : wave ? "40 30 660 960" : "90 40 600 960";
    const leftArm = wave ? `<g class="wave-arm" style="transform-origin:236px 590px">${arm(HANG, 218, 790)}</g>` : arm(HANG, 218, 790);
    const rightArm = sign
      ? `${`<rect x="728" y="330" width="16" height="240" rx="6" fill="#a0713f" ${cs}/>`}${arm("M530,590 C590,590 650,550 722,486", 728, 480)}`
      : `<g transform="translate(766 0) scale(-1 1)">${arm(HANG, 218, 790)}</g>`;
    const board = sign ? `<g class="mascot-sign">
        <rect x="590" y="104" width="300" height="226" rx="22" fill="#fffdf2" ${cs}/>
        <rect x="606" y="120" width="268" height="194" rx="14" fill="none" stroke="#f5c56b" stroke-width="4" stroke-dasharray="10 8"/>
        <text x="740" y="260" text-anchor="middle" font-family="'Noto Sans Thai',system-ui,sans-serif" font-weight="700" font-size="150" fill="#0f766e">สรุป</text>
        <path d="M632,150 l8,17 17,8 -17,8 -8,17 -8,-17 -17,-8 17,-8z" fill="#f59e0b"/>
        <path d="M846,270 l6,12 12,6 -12,6 -6,12 -6,-12 -12,-6 12,-6z" fill="#14b8a6"/>
      </g>` : "";
    const tail = `<path d="M520,830 C650,850 710,730 664,640 C650,612 606,632 624,668 C652,726 612,780 520,772Z" fill="${CAT}" ${cs}/><path d="M640,664 q22,10 34,2 M628,712 q24,8 34,-4" stroke="${CAT_D}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    const mirror = (g) => `<g transform="translate(766 0) scale(-1 1)">${g}</g>`;
    const ear = `<path d="M222,262 C204,190 222,122 264,100 C304,102 348,142 360,190Z" fill="${CAT}" ${cs}/><path d="M242,236 C234,188 244,148 264,130 C288,134 316,158 330,190Z" fill="${PINK}"/>`;
    const whiskers = `<path d="M300,404 L232,392 M298,418 L226,426 M304,432 L238,454" stroke="${LINE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    return `<svg class="mascot-svg" viewBox="${vb}" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="383" cy="968" rx="160" ry="14" fill="rgba(80,50,20,.22)"/>
  ${sign ? mirror(tail) : tail}
  <!-- feet -->
  <ellipse cx="318" cy="940" rx="68" ry="38" fill="${CAT}" ${cs}/><ellipse cx="448" cy="940" rx="68" ry="38" fill="${CAT}" ${cs}/>
  <ellipse cx="318" cy="950" rx="38" ry="20" fill="${CREAM}"/><ellipse cx="448" cy="950" rx="38" ry="20" fill="${CREAM}"/>
  <path d="M302,944 v14 M318,946 v16 M334,944 v14 M432,944 v14 M448,946 v16 M464,944 v14" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>
  <!-- body, belly, stripes -->
  <path d="M383,478 C250,478 200,590 205,720 C210,850 290,920 383,920 C476,920 556,850 561,720 C566,590 516,478 383,478Z" fill="${CAT}" ${cs}/>
  <path d="M383,566 C300,566 268,654 272,742 C276,830 320,892 383,892 C446,892 490,830 494,742 C498,654 466,566 383,566Z" fill="${CREAM}"/>
  <path d="M214,640 q30,10 42,32 M212,702 q34,6 48,26 M224,764 q30,0 44,18 M552,640 q-30,10 -42,32 M554,702 q-34,6 -48,26 M542,764 q-30,0 -44,18" stroke="${CAT_D}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <!-- arms -->
  ${leftArm}
  ${rightArm}
  <!-- ears (behind the head) -->
  ${ear}${mirror(ear)}
  <!-- head -->
  <ellipse cx="383" cy="335" rx="192" ry="170" fill="${CAT}" ${cs}/>
  <path d="M203,384 L170,396 L204,418Z" fill="${CAT}" ${cs}/><path d="M563,384 L596,396 L562,418Z" fill="${CAT}" ${cs}/>
  <path d="M383,172 L383,224 M342,180 L355,224 M424,180 L411,224" stroke="${CAT_D}" stroke-width="12" stroke-linecap="round"/>
  <ellipse cx="383" cy="396" rx="74" ry="50" fill="${CREAM}"/>
  <ellipse cx="262" cy="400" rx="30" ry="18" fill="${PINK}" opacity=".7"/><ellipse cx="504" cy="400" rx="30" ry="18" fill="${PINK}" opacity=".7"/>
  <g class="mascot-eyes"><ellipse cx="322" cy="336" rx="26" ry="34" fill="${LINE}"/><ellipse cx="444" cy="336" rx="26" ry="34" fill="${LINE}"/>
    <circle cx="314" cy="322" r="10" fill="#fff"/><circle cx="436" cy="322" r="10" fill="#fff"/><circle cx="331" cy="351" r="5" fill="#fff"/><circle cx="453" cy="351" r="5" fill="#fff"/></g>
  <path d="M368,374 Q383,366 398,374 Q392,392 383,394 Q374,392 368,374Z" fill="${PINK}" ${cs}/>
  <path d="M383,394 L383,408 M383,408 Q362,430 340,410 M383,408 Q404,430 426,410" stroke="${LINE}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  ${whiskers}${mirror(whiskers)}
  <!-- round glasses -->
  <circle cx="322" cy="337" r="52" fill="rgba(255,255,255,.16)" stroke="#6b4a2a" stroke-width="5"/><circle cx="444" cy="337" r="52" fill="rgba(255,255,255,.16)" stroke="#6b4a2a" stroke-width="5"/>
  <path d="M374,334 Q383,326 392,334 M270,332 L206,342 M496,332 L560,342" stroke="#6b4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${board}
</svg>`;
  };

  /* choose the mascot: "cat" (default) or "student" - change this one word to switch back */
  TD.MASCOT_STYLE = TD.MASCOT_STYLE || "student";
  TD.mascotInstance = (opts) => (TD.MASCOT_STYLE === "student" ? studentInstance(opts) : catInstance(opts));

  /* ---- floating guide ---- */
  const root = document.createElement("div");
  root.id = "mascot";
  root.hidden = true;
  root.innerHTML = `<div class="mascot-panel" id="mascot-panel" role="dialog" aria-label="สรุป" hidden>
      <div class="mp-head"><b>💡 สรุป</b><button type="button" class="mp-x" aria-label="ปิด">✕</button></div>
      <div class="mp-body" id="mp-body"></div>
    </div>
    <button type="button" class="mascot-btn" id="mascot-btn" aria-expanded="false" aria-controls="mascot-panel" aria-label="คลิกเพื่ออ่านสรุปของหน้านี้">${TD.mascotInstance({ sign: true })}<span class="mascot-hint">คลิกฉันเพื่ออ่านสรุป</span></button>`;
  document.body.appendChild(root);
  const panel = root.querySelector("#mascot-panel"), body = root.querySelector("#mp-body"), btn = root.querySelector("#mascot-btn");
  let isOpen = false;

  const source = () => {
    const pg = document.getElementById("page-" + TD.state.page);
    const el = pg && pg.querySelector(".findings");
    return el && el.textContent.trim() ? el : null;
  };
  const text = (el) => el.innerHTML.replace(/<h3>.*?<\/h3>/, "");
  function setOpen(v) {
    isOpen = v;
    panel.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
    root.classList.toggle("open", v);
    if (v) { const el = source(); body.innerHTML = el ? text(el) : ""; }
  }
  btn.addEventListener("click", () => setOpen(!isOpen));
  root.querySelector(".mp-x").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) setOpen(false); });

  /** called after every render: show the mascot only on pages that have a summary; keep an open panel up to date */
  TD.updateMascot = function () {
    const el = source();
    root.hidden = !el;
    if (!el) { setOpen(false); return; }
    if (isOpen) body.innerHTML = text(el);
  };
  TD.closeMascot = () => setOpen(false);
})();
