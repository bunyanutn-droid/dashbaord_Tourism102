#!/usr/bin/env python3
"""
Python back-end for the dashboard (standard library only - nothing to install).

  python server.py [port]        ->  http://localhost:8000

Endpoints
  GET  /api/health                 status + file timestamps
  GET  /api/dataset                the analysis dataset (data/dataset.json, built by pipeline/build_data.py)
  GET  /api/geo                    province boundaries (GeoJSON, simplified)
  GET  /api/upload/<kind>          rows the user uploaded earlier  (kind = airport | budget)
  POST /api/upload/<kind>          save rows {"source": "...", "rows": [...]} (validated, persisted in data/uploads/)
  DELETE /api/upload/<kind>        remove the saved upload
  POST /api/refresh-cpi            download CPI from the ministry API (slow, background) then rebuild; GET = progress
  POST /api/rebuild                re-run pipeline/build_data.py (after you put new files in raw/)
Everything else is served as static files. No secret keys exist in the front-end; the CPI API is
called only from pipeline/fetch_cpi.py (server side).
"""
import json
import os
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
UPLOADS = os.path.join(DATA, "uploads")
KINDS = {"airport": ["code", "year", "passengers"], "budget": ["code", "year", "budget"]}
os.makedirs(UPLOADS, exist_ok=True)


def valid_rows(kind, rows):
    need = KINDS[kind]
    if not isinstance(rows, list) or not rows or len(rows) > 5000:
        return False
    for r in rows:
        if not isinstance(r, dict):
            return False
        for k in need:
            v = r.get(k)
            if isinstance(v, bool) or not isinstance(v, (int, float)):
                return False
    return True


CPI = {"running": False, "log": "", "files": 0}
_lock = threading.Lock()


def _refresh_cpi():
    """fetch_cpi.py (ministry API, slow) then build_data.py, in a background thread."""
    try:
        for script in ("fetch_cpi.py", "build_data.py"):
            r = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "pipeline", script)], capture_output=True, text=True, encoding="utf-8", errors="replace")
            CPI["log"] += "[%s exit %d]\n%s\n" % (script, r.returncode, (r.stdout + r.stderr)[-1500:])
    finally:
        CPI["running"] = False


def cpi_files():
    d = os.path.join(ROOT, "raw", "cpi")
    return len(os.listdir(d)) if os.path.isdir(d) else 0


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # ---- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file_json(self, path):
        if not os.path.exists(path):
            return self.send_json({"error": "missing file - run python pipeline/build_data.py"}, 404)
        data = open(path, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def kind(self):
        k = self.path.split("?")[0].rsplit("/", 1)[-1]
        return k if k in KINDS else None

    # ---- routes
    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/health":
            ds = os.path.join(DATA, "dataset.json")
            return self.send_json({"ok": os.path.exists(ds), "dataset_modified": os.path.getmtime(ds) if os.path.exists(ds) else None,
                                   "uploads": [k for k in KINDS if os.path.exists(os.path.join(UPLOADS, k + ".json"))]})
        if p == "/api/refresh-cpi":
            return self.send_json({"running": CPI["running"], "files": cpi_files(), "expected": 462, "log": CPI["log"][-3000:]})
        if p == "/api/dataset":
            return self.send_file_json(os.path.join(DATA, "dataset.json"))
        if p == "/api/geo":
            path = os.path.join(DATA, "provinces.geo.js")
            if not os.path.exists(path):
                return self.send_json({"error": "missing"}, 404)
            txt = open(path, encoding="utf-8").read()
            return self.send_json(json.loads(txt[txt.index("=") + 1:].rstrip().rstrip(";")))
        if p.startswith("/api/upload/"):
            k = self.kind()
            if not k:
                return self.send_json({"error": "unknown kind"}, 404)
            return self.send_file_json(os.path.join(UPLOADS, k + ".json")) if os.path.exists(os.path.join(UPLOADS, k + ".json")) else self.send_json(None)
        if p.startswith("/api/"):
            return self.send_json({"error": "not found"}, 404)
        return super().do_GET()

    def do_POST(self):
        p = self.path.split("?")[0]
        if p == "/api/refresh-cpi":
            with _lock:
                if CPI["running"]:
                    return self.send_json({"ok": True, "running": True})
                CPI.update(running=True, log="")
            threading.Thread(target=_refresh_cpi, daemon=True).start()
            return self.send_json({"ok": True, "running": True}, 202)
        if p == "/api/rebuild":
            r = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "pipeline", "build_data.py")], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
            return self.send_json({"ok": r.returncode == 0, "log": (r.stdout + r.stderr)[-4000:]}, 200 if r.returncode == 0 else 500)
        if p.startswith("/api/upload/"):
            k = self.kind()
            if not k:
                return self.send_json({"error": "unknown kind"}, 404)
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > 5_000_000:
                return self.send_json({"error": "body size"}, 413)
            try:
                body = json.loads(self.rfile.read(n).decode("utf-8"))
            except Exception:  # noqa: BLE001
                return self.send_json({"error": "invalid JSON"}, 400)
            if not valid_rows(k, body.get("rows")):
                return self.send_json({"error": "rows must be numeric: " + ", ".join(KINDS[k])}, 400)
            out = {"source": str(body.get("source", ""))[:200], "loaded": body.get("loaded"), "rows": body["rows"],
                   "unmatched": body.get("unmatched", [])[:50], "badRows": body.get("badRows", [])[:50]}
            json.dump(out, open(os.path.join(UPLOADS, k + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
            return self.send_json({"ok": True, "rows": len(out["rows"])})
        return self.send_json({"error": "not found"}, 404)

    def do_DELETE(self):
        k = self.kind() if self.path.startswith("/api/upload/") else None
        if not k:
            return self.send_json({"error": "not found"}, 404)
        f = os.path.join(UPLOADS, k + ".json")
        if os.path.exists(f):
            os.remove(f)
        return self.send_json({"ok": True})

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")   # always revalidate, so rebuilt data/*.js is never stale
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print("Dashboard on http://localhost:%d  (Ctrl+C to stop)" % port)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
