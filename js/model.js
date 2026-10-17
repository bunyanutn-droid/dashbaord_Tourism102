/* Data access layer: all selectors over window.DASH_DATA live here. Nothing is generated or filled in. */
(function () {
  const TD = (window.TD = window.TD || {});
  TD.state = { page: "overview", year: 2022, region: "all", city: "all", type: "all", prov: "all", common: true };

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

  /** aggregate visitors AND tourism income per province for a year.
      Income unit: the source metadata does not state it; the values are read as million baht (see Methodology). */
  TD.agg = function (year, months) {
    const key = year + ":" + (months ? months.join(",") : "*");
    if (TD._agg[key]) return TD._agg[key];
    const out = new Array(TD.P.length);
    const set = months ? new Set(months) : null;
    (TD.rowsByYear[year] || []).forEach((r) => {
      if (set && !set.has(r[2])) return;
      const a = out[r[0]] || (out[r[0]] = { thai: 0, foreign: 0, total: 0, thaiInc: 0, forInc: 0, inc: 0, months: 0 });
      a.thai += r[3]; a.foreign += r[4]; a.total += r[3] + r[4];
      a.thaiInc += r[5] || 0; a.forInc += r[6] || 0; a.inc += (r[5] || 0) + (r[6] || 0);
      a.months += 1;
    });
    TD._agg[key] = out;
    return out;
  };
  TD.monthsPresent = function (year, idx) {
    const a = TD.agg(year, null)[idx];
    return a ? a.months : 0;
  };
  TD.isComplete = (year, idx) => TD.monthsPresent(year, idx) === TD.expectedMonths(year);
  TD.val = (a, type) => (!a ? NaN : type === "thai" ? a.thai : type === "foreign" ? a.foreign : a.total);
  /** income according to the visitor-type filter */
  TD.inc = (a, type) => (!a ? NaN : type === "thai" ? a.thaiInc : type === "foreign" ? a.forInc : a.inc);
  TD.typeLabel = (t) => (t === "thai" ? "ชาวไทย" : t === "foreign" ? "ชาวต่างชาติ" : "ชาวไทย + ชาวต่างชาติ");

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

  TD.gpp = (code, year) => {
    const g = TD.D.gpp[String(code)];
    return g && g.gpp[year] !== undefined ? g.gpp[year] : null;
  };
  TD.gppPc = (code, year) => {
    const g = TD.D.gpp[String(code)];
    return g && g.perCapita[year] !== undefined ? g.perCapita[year] : null;
  };

  /** top-N provinces by total visitors in a year (all provinces, same months for each) */
  TD.topProvinces = function (year, n = 10) {
    const w = TD.D.tourism.commonMonths[String(year)] || null;
    const A = TD.agg(year, w);
    return TD.P.filter((p) => A[p.idx]).sort((a, b) => A[b.idx].total - A[a.idx].total).slice(0, n).map((p) => p.idx);
  };

  TD.image = (code) => (window.DASH_IMAGES && window.DASH_IMAGES.province ? window.DASH_IMAGES.province[String(code)] : null);
  TD.accom = (code) => TD.D.accommodation[String(code)] || null;
})();
