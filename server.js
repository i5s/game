const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());

// ---- Data helpers ----
function readData() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function writeData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

// ---- API: list all students ----
app.get('/api/students', (req, res) => res.json(readData()));

// ---- API: get/update one student ----
app.post('/api/student', (req, res) => {
    let { name, score, days } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    let data = readData();
    if (!data[name]) data[name] = { score: 0, days: {} };
    if (score !== undefined) data[name].score = score;
    if (days !== undefined) data[name].days = days;
    writeData(data);
    res.json({ ok: true });
});

// ---- API: delete one student ----
app.delete('/api/student/:name', (req, res) => {
    let data = readData();
    delete data[decodeURIComponent(req.params.name)];
    writeData(data);
    res.json({ ok: true });
});

// ---- API: delete all data ----
app.delete('/api/all', (req, res) => {
    writeData({});
    res.json({ ok: true });
});

// ---- API: get server IP for QR ----
app.get('/api/ip', (req, res) => {
    const nets = os.networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal && name !== 'lo0') {
                ip = net.address;
                break;
            }
        }
        if (ip !== 'localhost') break;
    }
    res.json({ ip, port: PORT, url: `http://${ip}:${PORT}` });
});

// ---- Serve static files & SPA catch-all ----
app.use(express.static(__dirname));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🚀  إعلامي المستقبل  SERVER  🚀           ║
╠══════════════════════════════════════════════╣
║  http://localhost:${PORT}                    ║
║  http://<YOUR_IP>:${PORT}  (for students)    ║
║                                              ║
║  📺  Display:  http://localhost:${PORT}/     ║
║  ⚙️   Admin:    http://localhost:${PORT}/    ║
╚══════════════════════════════════════════════╝
    `);
});
