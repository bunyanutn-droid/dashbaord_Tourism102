#!/usr/bin/env python3
"""
Python back-end for the dashboard (standard library only - nothing to install).

  python server.py [port]        ->  http://localhost:8000

Endpoints
  GET  /api/health      status + timestamp of the built dataset
  GET  /api/dataset     the analysis dataset (data/dataset.json, built by pipeline/build_data.py)
  GET  /api/geo         province boundaries (GeoJSON, simplified)
  POST /api/rebuild     re-run pipeline/build_data.py (after you put new files in raw/)
Everything else is served as static files.
"""
import json
import os
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file_json(self, path):
        if not os.path.exists(path):
            return self.send_json({"error": "missing file - run python pipeline/build_data.py"}, 404)
        data = open(path, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/health":
            ds = os.path.join(DATA, "dataset.json")
            return self.send_json({"ok": os.path.exists(ds), "dataset_modified": os.path.getmtime(ds) if os.path.exists(ds) else None})
        if p == "/api/dataset":
            return self.send_file_json(os.path.join(DATA, "dataset.json"))
        if p == "/api/geo":
            path = os.path.join(DATA, "provinces.geo.js")
            if not os.path.exists(path):
                return self.send_json({"error": "missing"}, 404)
            txt = open(path, encoding="utf-8").read()
            return self.send_json(json.loads(txt[txt.index("=") + 1:].rstrip().rstrip(";")))
        if p.startswith("/api/"):
            return self.send_json({"error": "not found"}, 404)
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] == "/api/rebuild":
            r = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "pipeline", "build_data.py")], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
            return self.send_json({"ok": r.returncode == 0, "log": (r.stdout + r.stderr)[-4000:]}, 200 if r.returncode == 0 else 500)
        return self.send_json({"error": "not found"}, 404)

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
