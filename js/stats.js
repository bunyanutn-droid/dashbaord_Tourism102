/* Small statistics helpers - every statistic on the dashboard is computed here from the loaded data. */
(function () {
  const TD = (window.TD = window.TD || {});
  const clean = (xs, ys) => {
    const X = [], Y = [];
    for (let i = 0; i < xs.length; i++) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) { X.push(xs[i]); Y.push(ys[i]); }
    }
    return [X, Y];
  };
  function pearson(xs, ys) {
    const [X, Y] = clean(xs, ys);
    const n = X.length;
    if (n < 3) return null;
    const mx = X.reduce((a, b) => a + b, 0) / n, my = Y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = X[i] - mx, dy = Y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
  }
  function ranks(a) {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    for (let i = 0; i < idx.length;) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  }
  function spearman(xs, ys) {
    const [X, Y] = clean(xs, ys);
    if (X.length < 3) return null;
    return pearson(ranks(X), ranks(Y));
  }
  /** two-sided p-value for H0: rho=0 via t distribution (normal approx. for the incomplete beta is avoided: use exact via numerical integration) */
  function pValue(r, n) {
    if (r === null || n < 4) return null;
    const t = Math.abs(r) * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
    const df = n - 2;
    // integrate Student-t pdf from t to infinity (Simpson on a transformed range)
    const lg = (z) => { // log-gamma (Lanczos)
      const c = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
      if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z);
      z -= 1; let x = 0.99999999999980993;
      for (let i = 0; i < 8; i++) x += c[i] / (z + i + 1);
      const tt = z + 7.5;
      return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(tt) - tt + Math.log(x);
    };
    const coef = Math.exp(lg((df + 1) / 2) - lg(df / 2)) / Math.sqrt(df * Math.PI);
    const pdf = (x) => coef * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
    const upper = Math.max(t + 60, t * 10);
    const N = 4000, h = (upper - t) / N;
    let s = pdf(t) + pdf(upper);
    for (let i = 1; i < N; i++) s += pdf(t + i * h) * (i % 2 ? 4 : 2);
    return Math.min(1, 2 * (s * h) / 3);
  }
  const sorted = (a) => a.filter(Number.isFinite).sort((x, y) => x - y);
  function quantile(a, q) {
    const s = sorted(a);
    if (!s.length) return null;
    const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  const median = (a) => quantile(a, 0.5);
  const mean = (a) => { const s = a.filter(Number.isFinite); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };
  const sum = (a) => a.reduce((x, y) => x + (Number.isFinite(y) ? y : 0), 0);
  /** rank of each value (1 = largest) */
  function rankDesc(values) {
    const o = values.map((v, i) => [v, i]).sort((p, q) => q[0] - p[0]);
    const r = new Array(values.length);
    o.forEach((p, k) => (r[p[1]] = k + 1));
    return r;
  }
  TD.stats = { pearson, spearman, pValue, quantile, median, mean, sum, rankDesc, log10: (v) => (v > 0 ? Math.log10(v) : NaN) };
})();
