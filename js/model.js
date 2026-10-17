/* Data access layer: all selectors over window.DASH_DATA live here. Nothing is generated or filled in. */
(function () {
  const TD = (window.TD = window.TD || {});
  TD.state = { page: "overview", year: 2022, region: "all", city: "all", type: "all", prov: "all", common: true };
  TD.extra = { airport: null, budget: null }; // user-uploaded real data (see upload.js)

  TD.init = function () {
    const D = (TD.D = window.DASH_DATA);
    TD.P = D.provinces;
    TD.byCode = {};
    TD.P.forEach((p) => (TD.byCode[p.code] = p));
    TD.byName = {};
    TD.P.forEach((p) => (TD.byName[p.th.replace(/\s/g, "")] = p));
    TD.rowsByYear = {};
    D.tourism.rows.forEach((r) => {
      (TD.rowsByYear[r[1]] = TD.rowsByYear[r[1]] || []).push(r);
    });
    TD.years = Object.keys(TD.rowsByYear).map(Number).sort((a, b) => a - b);
    TD.regions = [...new Set(TD.P.map((p) => p.region))];
    TD._agg = {};
    TD._cpi = {};
  };

  TD.expectedMonths = (y) => (y === 2023 ? 7 : 12);
  TD.gppYears = () => Object.keys(Object.values(TD.D.gpp)[0].gpp).map(Number);
  /** months used for cross-province comparison of a year (null = every valid row) */
  TD.window = (y) => (TD.state.common ? TD.D.tourism.commonMonths[String(y)] || null : null);
  TD.windowLabel = (y) => {
    const w = TD.window(y);
    if (!w) return "ทุกเดือนที่มีข้อมูล";
    return TD.monthsLabel(w) + " " + y + (w.length < TD.expectedMonths(y) ? " (" + w.length + " เดือน)" : "");
  };
  /** aggregate visitors per province for a year. returns array indexed by province idx (undefined = no rows) */
  TD.agg = function (year, months) {
    const key = year + ":" + (months ? months.join(",") : "*");
    if (TD._agg[key]) return TD._agg[key];
    const out = new Array(TD.P.length);
    const set = months ? new Set(months) : null;
    (TD.rowsByYear[year] || []).forEach((r) => {
      if (set && !set.has(r[2])) return;
      const a = out[r[0]] || (out[r[0]] = { thai: 0, foreign: 0, total: 0, months: 0, occ: [] });
      a.thai += r[3]; a.foreign += r[4]; a.total += r[3] + r[4]; a.months += 1;
      if (r[7] !== null && r[7] !== undefined) a.occ.push(r[7]);
    });
    TD._agg[key] = out;
    return out;
  };
  /** number of valid months present for province in year */
  TD.monthsPresent = function (year, idx) {
    const a = TD.agg(year, null)[idx];
    return a ? a.months : 0;
  };
  TD.isComplete = (year, idx) => TD.monthsPresent(year, idx) === TD.expectedMonths(year);
  TD.val = (a, type) => (!a ? NaN : type === "thai" ? a.thai : type === "foreign" ? a.foreign : a.total);
  TD.typeLabel = (t) => (t === "thai" ? "ชาวไทย" : t === "foreign" ? "ชาวต่างชาติ" : "ชาวไทย + ชาวต่างชาติ");

  /** Set of province idx passing region/city filters (and optionally the province filter) */
  TD.provSet = function (opts = {}) {
    const f = TD.state;
    const s = new Set();
    TD.P.forEach((p) => {
      if (f.region !== "all" && p.region !== f.region) return;
      if (f.city !== "all" && p.cityType !== f.city) return;
      if (!opts.ignoreProv && f.prov !== "all" && String(p.code) !== f.prov) return;
      s.add(p.idx);
    });
    return s;
  };

  /* ---------------- GPP ---------------- */
  TD.gpp = (code, year) => {
    const g = TD.D.gpp[String(code)];
    return g && g.gpp[year] !== undefined ? g.gpp[year] : null;
  };
  TD.gppPc = (code, year) => {
    const g = TD.D.gpp[String(code)];
    return g && g.perCapita[year] !== undefined ? g.perCapita[year] : null;
  };

  /* ---------------- CPI ---------------- */
  TD.CPI_TOTAL = "0000000000000000";
  TD.cpiMap = function (code, id) {
    const k = code + ":" + id;
    if (TD._cpi[k]) return TD._cpi[k];
    const s = (TD.D.cpi.series[String(code)] || {})[id];
    const m = new Map();
    if (s) s.forEach((r) => m.set(r[0] * 100 + r[1], r));
    TD._cpi[k] = s ? m : null;
    return TD._cpi[k];
  };
  TD.cpiMonths = (y) => Array.from({ length: TD.expectedMonths(y) }, (_, i) => i + 1);
  /** mean index over months (all must exist) */
  TD.cpiMean = function (code, id, y, months) {
    const m = TD.cpiMap(code, id);
    if (!m) return null;
    let s = 0;
    for (const mo of months) {
      const r = m.get(y * 100 + mo);
      if (!r || r[2] === null) return null;
      s += r[2];
    }
    return s / months.length;
  };
  /** inflation (%) = mean index(y) / mean index(y-1) - 1 over same months */
  TD.cpiInfl = function (code, id, y, months) {
    const a = TD.cpiMean(code, id, y, months), b = TD.cpiMean(code, id, y - 1, months);
    return a === null || b === null ? null : (a / b - 1) * 100;
  };
  TD.cpiAvailable = (code) => !!TD.D.cpi.series[String(code)];

  /** top-N provinces by total visitors in a year (always on all provinces, same months for each) */
  TD.topProvinces = function (year, n = 10) {
    const w = TD.D.tourism.commonMonths[String(year)] || null;
    const A = TD.agg(year, w);
    return TD.P.filter((p) => A[p.idx]).sort((a, b) => A[b.idx].total - A[a.idx].total).slice(0, n).map((p) => p.idx);
  };

  /** image record for a province */
  TD.image = (code) => (window.DASH_IMAGES && window.DASH_IMAGES.province ? window.DASH_IMAGES.province[String(code)] : null);

  /** accommodation snapshot */
  TD.accom = (code) => TD.D.accommodation[String(code)] || null;
})();
