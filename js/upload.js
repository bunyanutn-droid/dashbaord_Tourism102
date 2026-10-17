/* Upload of REAL data the dashboard could not fetch itself (airport traffic, provincial tourism budget).
   CSV (Papa Parse) or Excel (SheetJS). Rows are matched to provinces by name; unmatched names are reported, never guessed. */
(function () {
  const TD = window.TD;
  const SPECS = {
    airport: {
      title: "สถิติท่าอากาศยาน (ผู้โดยสาร/เที่ยวบิน) รายจังหวัด",
      cols: ["province", "year", "passengers", "flights"],
      aliases: { province: ["province", "จังหวัด"], year: ["year", "ปี", "ปี ค.ศ.", "ปีค.ศ."], passengers: ["passengers", "ผู้โดยสาร", "จำนวนผู้โดยสาร"], flights: ["flights", "เที่ยวบิน", "จำนวนเที่ยวบิน"] },
      required: ["province", "year", "passengers"],
      sample: "province,year,passengers,flights\nภูเก็ต,2022,<ตัวเลขจริงจากต้นทาง>,<ตัวเลขจริงจากต้นทาง>\n",
    },
    budget: {
      title: "งบประมาณพัฒนาการท่องเที่ยวรายจังหวัด",
      cols: ["province", "year", "budget"],
      aliases: { province: ["province", "จังหวัด"], year: ["year", "ปี", "ปี ค.ศ.", "ปีค.ศ."], budget: ["budget", "งบประมาณ", "งบประมาณ (บาท)", "งบประมาณ(บาท)"] },
      required: ["province", "year", "budget"],
      sample: "province,year,budget\nเชียงใหม่,2022,<ตัวเลขจริงจากเอกสารงบประมาณ>\n",
    },
  };
  TD.UPLOAD_SPECS = SPECS;
  const normName = (s) => String(s || "").replace(/\s/g, "").replace("ํา", "ำ").replace(/^จ\.|^จังหวัด/, "");
  const num = (v) => { const n = Number(String(v).replace(/[,\s]/g, "")); return Number.isFinite(n) ? n : NaN; };

  function pickCols(header, spec) {
    const map = {};
    Object.keys(spec.aliases).forEach((k) => {
      const i = header.findIndex((h) => spec.aliases[k].some((a) => String(h).trim().toLowerCase() === a.toLowerCase()));
      if (i >= 0) map[k] = i;
    });
    return map;
  }

  function ingest(kind, grid, fileName) {
    const spec = SPECS[kind];
    if (!grid.length) throw new Error("ไฟล์ว่างเปล่า");
    const header = grid[0];
    const cm = pickCols(header, spec);
    const miss = spec.required.filter((k) => cm[k] === undefined);
    if (miss.length) throw new Error("ไม่พบคอลัมน์ที่จำเป็น: " + miss.map((k) => spec.aliases[k][0] + " / " + spec.aliases[k][1]).join(", ") + " (พบหัวคอลัมน์: " + header.join(", ") + ")");
    const rows = [], unmatched = new Set(), bad = [];
    grid.slice(1).forEach((r, n) => {
      if (r.every((c) => c === "" || c === null || c === undefined)) return;
      const p = TD.byName[normName(r[cm.province])] || TD.P.find((q) => normName(q.th) === normName(r[cm.province]));
      if (!p) { unmatched.add(String(r[cm.province])); return; }
      let year = num(r[cm.year]);
      if (year > 2400) year -= 543;                                   // accept Buddhist-era years, convert to CE
      const rec = { code: p.code, year };
      let ok = Number.isFinite(year);
      spec.cols.slice(2).forEach((c) => { if (cm[c] !== undefined) { rec[c] = num(r[cm[c]]); } });
      spec.required.slice(2).forEach((c) => { if (!Number.isFinite(rec[c])) ok = false; });
      if (ok) rows.push(rec); else bad.push(n + 2);
    });
    if (!rows.length) throw new Error("ไม่มีแถวที่ใช้ได้ (ชื่อจังหวัดไม่ตรง หรือตัวเลขไม่ใช่ตัวเลข)");
    TD.extra[kind] = { rows, source: fileName, unmatched: [...unmatched], badRows: bad, loaded: new Date().toISOString().slice(0, 10) };
    if (TD.backend) {   // persist through the Python back-end so the data survives a page reload
      fetch("/api/upload/" + kind, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(TD.extra[kind]) }).catch(() => {});
    }
    return TD.extra[kind];
  }

  TD.attachUpload = function (host, kind) {
    const spec = SPECS[kind];
    host.innerHTML = `<div class="drop"><b>อัปโหลดข้อมูลจริง: ${spec.title}</b><br>
      รองรับ .csv / .xlsx — คอลัมน์ที่ต้องมี: <code>${spec.cols.join(", ")}</code> (ปีเป็น ค.ศ. หรือ พ.ศ. ก็ได้; ชื่อจังหวัดภาษาไทย)<br>
      <input type="file" accept=".csv,.xlsx,.xls" aria-label="เลือกไฟล์ ${spec.title}"> <button type="button" class="btn alt tpl">ดาวน์โหลดแม่แบบหัวคอลัมน์</button>
      <div class="msg" role="status"></div></div>`;
    const msg = host.querySelector(".msg");
    host.querySelector(".tpl").onclick = () => TD.downloadCSV("template_" + kind + ".csv", spec.cols, []);
    host.querySelector("input").addEventListener("change", (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      msg.className = "msg"; msg.textContent = "กำลังอ่านไฟล์…";
      const done = (grid) => {
        try {
          const r = ingest(kind, grid, file.name);
          msg.className = "msg ok";
          msg.textContent = `โหลดสำเร็จ ${r.rows.length} แถว` + (r.unmatched.length ? ` · ชื่อจังหวัดที่จับคู่ไม่ได้ (ไม่ถูกนำมาใช้): ${r.unmatched.slice(0, 8).join(", ")}` : "") + (r.badRows.length ? ` · ข้ามแถวที่ตัวเลขไม่ถูกต้อง: ${r.badRows.slice(0, 8).join(", ")}` : "");
          TD.render();
        } catch (e) { msg.className = "msg err"; msg.textContent = "อ่านไฟล์ไม่ได้: " + e.message; }
      };
      const fail = (e) => { msg.className = "msg err"; msg.textContent = "อ่านไฟล์ไม่ได้: " + (e && e.message ? e.message : e); };
      if (/\.csv$/i.test(file.name)) {
        Papa.parse(file, { skipEmptyLines: true, complete: (res) => done(res.data), error: fail, encoding: "UTF-8" });
      } else {
        const fr = new FileReader();
        fr.onerror = () => fail(fr.error);
        fr.onload = () => { try { const wb = XLSX.read(fr.result, { type: "array" }); done(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" })); } catch (e) { fail(e); } };
        fr.readAsArrayBuffer(file);
      }
    });
  };
})();
