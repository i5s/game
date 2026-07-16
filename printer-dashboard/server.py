"""
خادم Flask للوحة تحكم الطابعات.
يدمج Bambu Lab و Snapmaker U1 في صفحة ويب واحدة،
مع زر "اطبع على الكل" وزر تتبع الحالة لكل طابعة.
"""

import os
import json
from flask import Flask, render_template_string, jsonify, request

from config import PRINTERS, FLASK_HOST, FLASK_PORT
from bambu_connector import BambuConnector
from snapmaker_connector import SnapmakerU1Connector

app = Flask(__name__)

# بناء الموصلات
connectors = {}


def build_connectors():
    for p in PRINTERS:
        if not p.get("enabled", True):
            continue
        if p["type"] == "bambu":
            connectors[p["id"]] = BambuConnector(p)
        elif p["type"] == "snapmaker_u1":
            connectors[p["id"]] = SnapmakerU1Connector(p)


build_connectors()


@app.route("/")
def index():
    return render_template_string(DASHBOARD_HTML)


@app.route("/api/printers")
def api_printers():
    result = []
    for p in PRINTERS:
        if not p.get("enabled", True):
            continue
        conn = connectors.get(p["id"])
        status = conn.get_status() if conn else {"online": False}
        result.append({
            "id": p["id"],
            "name": p["name"],
            "type": p["type"],
            **status,
        })
    return jsonify(result)


@app.route("/api/printers/<pid>/status")
def api_status(pid):
    conn = connectors.get(pid)
    if not conn:
        return jsonify({"error": "طابعة غير معروفة"}), 404
    return jsonify(conn.get_status())


@app.route("/api/print_all", methods=["POST"])
def api_print_all():
    data = request.get_json(silent=True) or {}
    gcode = data.get("gcode", "")
    if not gcode or not os.path.exists(gcode):
        return jsonify({"error": "مسار ملف G-code غير صحيح"}), 400
    results = []
    for pid, conn in connectors.items():
        ok, msg = conn.start_print(gcode)
        results.append({"id": pid, "ok": ok, "msg": msg})
    return jsonify(results)


@app.route("/api/printers/<pid>/print", methods=["POST"])
def api_print_one(pid):
    conn = connectors.get(pid)
    if not conn:
        return jsonify({"error": "طابعة غير معروفة"}), 404
    data = request.get_json(silent=True) or {}
    gcode = data.get("gcode", "")
    if not gcode or not os.path.exists(gcode):
        return jsonify({"error": "مسار ملف G-code غير صحيح"}), 400
    ok, msg = conn.start_print(gcode)
    return jsonify({"ok": ok, "msg": msg})


DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>لوحة الطابعات</title>
<style>
  body { font-family: system-ui; background:#0f1117; color:#e6e6e6; margin:0; padding:20px; }
  h1 { font-size:22px; }
  .grid { display:flex; gap:16px; flex-wrap:wrap; }
  .card { background:#1a1d27; border:1px solid #2a2e3a; border-radius:12px; padding:16px; width:300px; }
  .card h2 { margin:0 0 8px; font-size:18px; }
  .status { font-size:14px; color:#9aa0ad; margin:4px 0; }
  .online { color:#3ad07a; }
  .offline { color:#ff6b6b; }
  button { background:#3a6df0; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; margin-top:8px; }
  button:disabled { background:#444; cursor:not-allowed; }
  input[type=text] { width:100%; padding:8px; border-radius:8px; border:1px solid #2a2e3a; background:#0f1117; color:#fff; margin-top:8px; }
  .big { background:#3ad07a; font-size:16px; padding:12px 20px; }
</style>
</head>
<body>
  <h1>لوحة تحكم الطابعات</h1>
  <div class="grid" id="grid"></div>
  <hr style="border-color:#2a2e3a; margin:20px 0;">
  <div>
    <input type="text" id="gcode" placeholder="مسار ملف G-code مثال: /path/to/model.gcode">
    <button class="big" onclick="printAll()">اطبع على الكل</button>
  </div>

<script>
async function load() {
  const res = await fetch('/api/printers');
  const printers = await res.json();
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  printers.forEach(p => {
    const online = p.online ? 'online' : 'offline';
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h2>${p.name}</h2>
      <div class="status ${online}">${p.online ? 'متصل' : 'غير متصل'}</div>
      <div class="status">الحالة: ${p.status || '-'}</div>
      ${p.progress != null ? `<div class="status">التقدم: ${p.progress}%</div>` : ''}
      ${p.task_name ? `<div class="status">المهمة: ${p.task_name}</div>` : ''}
      ${p.note ? `<div class="status" style="color:#ffb347">${p.note}</div>` : ''}
      <button onclick="printOne('${p.id}')">اطبع على هذه</button>
    `;
    grid.appendChild(div);
  });
}
async function printAll() {
  const gcode = document.getElementById('gcode').value;
  const res = await fetch('/api/print_all', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({gcode})
  });
  const r = await res.json();
  alert(JSON.stringify(r, null, 2));
  load();
}
async function printOne(pid) {
  const gcode = document.getElementById('gcode').value;
  const res = await fetch('/api/printers/'+pid+'/print', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({gcode})
  });
  const r = await res.json();
  alert(JSON.stringify(r, null, 2));
  load();
}
load();
setInterval(load, 5000);
</script>
</body>
</html>
"""


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)
