/* Number / text formatting. Thousands separators, no needless decimals. */
(function () {
  const TD = (window.TD = window.TD || {});
  const ok = (n) => n !== null && n !== undefined && !Number.isNaN(n) && Number.isFinite(n);
  TD.f = {
    ok,
    int: (n) => (ok(n) ? Math.round(n).toLocaleString("en-US") : "–"),
    dec: (n, d = 1) => (ok(n) ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–"),
    pct: (n, d = 1) => (ok(n) ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%" : "–"),
    // visitors: show millions when large
    people: (n) => {
      if (!ok(n)) return "–";
      if (n >= 1e6) return (n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + " ล้าน";
      if (n >= 1e3) return (n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " พัน";
      return Math.round(n).toLocaleString("en-US");
    },
    /** money given in million baht -> largest readable Thai unit with value >= 1 (never shows 0.00 for a non-zero amount) */
    baht: (mb) => {
      if (!ok(mb)) return "–";
      if (mb === 0) return "0 บาท";
      const b = Math.abs(mb) * 1e6;
      const units = [[1e12, "ล้านล้านบาท"], [1e11, "แสนล้านบาท"], [1e9, "พันล้านบาท"], [1e8, "ร้อยล้านบาท"], [1e7, "สิบล้านบาท"], [1e6, "ล้านบาท"], [1e5, "แสนบาท"], [1e4, "หมื่นบาท"], [1e3, "พันบาท"], [1, "บาท"]];
      const [u, name] = units.find(([x]) => b >= x) || units[units.length - 1];
      const v = (mb < 0 ? -b : b) / u;
      const d = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
      return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + " " + name;
    },
    r: (n) => (ok(n) ? (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) : "–"),
  };
  TD.MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  /** [1,2,3,5,6] -> "ม.ค.–มี.ค., พ.ค.–มิ.ย." */
  TD.monthsLabel = (arr) => {
    if (!arr || !arr.length) return "–";
    const out = [];
    let s = arr[0], p = arr[0];
    for (let i = 1; i <= arr.length; i++) {
      if (arr[i] === p + 1) { p = arr[i]; continue; }
      out.push(s === p ? TD.MONTHS_TH[s - 1] : TD.MONTHS_TH[s - 1] + "–" + TD.MONTHS_TH[p - 1]);
      s = p = arr[i];
    }
    return out.join(", ");
  };
  TD.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
})();
