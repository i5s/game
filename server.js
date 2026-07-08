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

// ---- Persistent data API ----
app.get('/api/students', (req, res) => res.json(readData()));
app.post('/api/student', (req, res) => {
    let { name, score, days } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    let data = readData();
    if (!data[name]) data[name] = { score: 0, days: {} };
    if (score !== undefined) data[name].score = Math.max(0, score);
    if (days !== undefined) data[name].days = days;
    writeData(data);
    res.json({ ok: true });
});
app.delete('/api/student/:name', (req, res) => {
    let data = readData();
    delete data[decodeURIComponent(req.params.name)];
    writeData(data);
    res.json({ ok: true });
});
app.delete('/api/all', (req, res) => {
    writeData({});
    res.json({ ok: true });
});
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

// ================================================================
//  GOLD ROUND (الذهب من كهوت) — real‑time game engine
// ================================================================

const GOLD_QUESTIONS = [
    { q: "ما الجهاز الذي يستخدمه المصور لتصوير الفيديو؟", opts: ["كاميرا", "ميكروويف", "خلاط", "غسالة"], correct: 0 },
    { q: "ما اسم الشخص الذي يقرأ الأخبار على التلفاز؟", opts: ["مذيع", "طباخ", "سائق", "نجار"], correct: 0 },
    { q: "ماذا نستخدم لتسجيل الصوت؟", opts: ["ميكروفون", "مطرقة", "مقص", "مسطرة"], correct: 0 },
    { q: "أين نشاهد الأخبار اليومية؟", opts: ["تلفاز", "ثلاجة", "سرير", "خزانة"], correct: 0 },
    { q: "ما معنى كلمة Broadcast؟", opts: ["بث", "طبخ", "بناء", "زراعة"], correct: 0 },
    { q: "أي من هذه أدوات التصوير؟", opts: ["حامل ثلاثي (ترايبود)", "ممحاة", "دباسة", "مفك"], correct: 0 },
    { q: "ماذا يفعل المونتير؟", opts: ["يركب المشاهد", "يطبخ الطعام", "يقود سيارة", "يزرع شجرة"], correct: 0 },
    { q: "ما معنى كلمة Ingest في الإعلام؟", opts: ["استيراد المادة", "حذف المادة", "طباعة المادة", "تلوين المادة"], correct: 0 },
    { q: "من هو المسؤول عن إخراج النشرة؟", opts: ["مخرج", "مصور", "طباخ", "سباك"], correct: 0 },
    { q: "أين تخزَّن المواد المصورة بعد التصوير؟", opts: ["قسم الإنجست", "المطبخ", "غرفة النوم", "الحديقة"], correct: 0 },
    { q: "ما معنى كلمة Studio؟", opts: ["استوديو", "مدرسة", "مستشفى", "مكتبة"], correct: 0 },
    { q: "ما شكل الضوء الذي يستخدمه المصور؟", opts: ["لمبة تصوير", "شمعة", "مصباح جيب", "ليزر"], correct: 0 },
    { q: "ما اسم الأغنية التي تفتتح النشرة؟", opts: ["شارة البداية", "أغنية نوم", "نشيد وطني", "أغنية حزينة"], correct: 0 },
    { q: "ما الجهاز الذي يعرض الصورة للمشاهدين؟", opts: ["شاشة عرض", "فرن", "غسالة", "مكنسة"], correct: 0 },
    { q: "ماذا يحتاج المذيع قبل الظهور على الهواء؟", opts: ["ميكروفون", "قبعة", "نظارة شمس", "حقيبة"], correct: 0 },
    { q: "ما معنى كلمة Montage؟", opts: ["مونتاج (تركيب)", "طبخ", "سباحة", "رسم"], correct: 0 },
    { q: "كيف نرسل الخبر للمشاهدين؟", opts: ["عبر البث المباشر", "بالسيارة", "بالبريد", "بالقطار"], correct: 0 },
    { q: "ما أول خطوة في إنتاج الخبر؟", opts: ["التصوير الميداني", "المونتاج", "البث", "النوم"], correct: 0 },
    { q: "من الذي يقف خلف الكاميرا؟", opts: ["مصور", "مذيع", "ضيف", "مشاهد"], correct: 0 },
    { q: "ما اسم البرنامج الذي نستخدمه لتحرير الفيديو؟", opts: ["برنامج مونتاج", "آلة حاسبة", "متصفح", "لعبة"], correct: 0 },
];

// In-memory game state
let game = {
    phase: 'idle',      // idle | question | answered | choice | result
    round: 0,
    question: null,
    options: [],
    correctIndex: -1,
    answers: {},        // { name: { answerIdx, time } }
    winner: null,
    winnerTime: null,
    choiceMade: null,   // { action, target, points }
    resultMsg: '',
    startAt: 0,
    timerSec: 15,
    securePlayers: [],  // names with "secure first place" active
};

function resetGame() {
    game.phase = 'idle';
    game.round = 0;
    game.question = null;
    game.options = [];
    game.correctIndex = -1;
    game.answers = {};
    game.winner = null;
    game.winnerTime = null;
    game.choiceMade = null;
    game.resultMsg = '';
    game.startAt = 0;
    game.securePlayers = [];
}

function pickQuestion() {
    let q = GOLD_QUESTIONS[Math.floor(Math.random() * GOLD_QUESTIONS.length)];
    game.question = q.q;
    game.options = [...q.opts];
    game.correctIndex = q.correct;
    game.answers = {};
    game.winner = null;
    game.winnerTime = null;
    game.choiceMade = null;
    game.resultMsg = '';
    game.startAt = Date.now();
}

// Sanitise state for clients (hide correct answer during question phase)
function sanitisedGame() {
    let s = {
        phase: game.phase,
        round: game.round,
        question: game.question,
        options: game.options,
        winner: game.winner,
        choiceMade: game.choiceMade,
        resultMsg: game.resultMsg,
        timerSec: game.timerSec,
        startAt: game.startAt,
        securePlayers: game.securePlayers,
        answerCount: Object.keys(game.answers).length,
    };
    if (game.phase === 'question') {
        s.correctIndex = -1; // hidden
    } else {
        s.correctIndex = game.correctIndex;
    }
    return s;
}

// ---- GAME API ----

// GET /api/game — current state (student & display poll this)
app.get('/api/game', (req, res) => res.json(sanitisedGame()));

// POST /api/game/start — teacher starts a round (from display)
app.post('/api/game/start', (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: 'teacher name required' });
    game.round++;
    pickQuestion();
    game.phase = 'question';
    res.json({ ok: true, round: game.round });
});

// POST /api/game/answer — student submits
app.post('/api/game/answer', (req, res) => {
    let { name, answer } = req.body;
    if (!name || answer === undefined) return res.status(400).json({ error: 'name & answer required' });
    if (game.phase !== 'question') return res.json({ ok: false, reason: 'no_question' });
    if (game.answers[name]) return res.json({ ok: false, reason: 'already_answered' });

    game.answers[name] = { answerIdx: answer, time: Date.now() };

    // Ensure student exists in data
    let data = readData();
    if (!data[name]) data[name] = { score: 0, days: {} };
    writeData(data);

    // Check if it's the first correct answer
    if (answer === game.correctIndex && !game.winner) {
        game.winner = name;
        game.winnerTime = Date.now();
        game.phase = 'answered';
        // Award points for being first correct
        data[name].score = (data[name].score || 0) + 50;
        writeData(data);
    }

    res.json({ ok: true, phase: game.phase, winner: game.winner });
});

// POST /api/game/choice — winner chooses action
app.post('/api/game/choice', (req, res) => {
    let { name, action, target } = req.body;
    if (game.winner !== name) return res.status(400).json({ error: 'not_winner' });
    if (game.phase !== 'answered') return res.json({ ok: false, reason: 'wrong_phase' });

    let data = readData();
    let points = 30;
    let msg = '';

    if (action === 'secure') {
        if (!game.securePlayers.includes(name)) game.securePlayers.push(name);
        msg = `🔒 ${name} أمّن مركزه! ما أحد يقدر يخصمه أو يسرق منه بالجولة الجاية.`;
        game.phase = 'result';
        game.choiceMade = { action, target: name, points: 0 };
        game.resultMsg = msg;
        writeData(data);
        return res.json({ ok: true });
    }

    if (!target || !data[target]) return res.status(400).json({ error: 'invalid_target' });

    if (action === 'deduct') {
        data[target].score = Math.max(0, (data[target].score || 0) - points);
        msg = `🗡️ ${name} خصم ${points} نقطة من ${target}!`;
    } else if (action === 'steal') {
        let stolen = Math.min(points, data[target].score || 0);
        data[target].score = Math.max(0, (data[target].score || 0) - stolen);
        data[name].score = (data[name].score || 0) + stolen;
        msg = `💰 ${name} سرق ${stolen} نقطة من ${target}!`;
    }

    game.phase = 'result';
    game.choiceMade = { action, target, points };
    game.resultMsg = msg;
    writeData(data);
    res.json({ ok: true });
});

// POST /api/game/next — teacher starts next round
app.post('/api/game/next', (req, res) => {
    resetGame();
    res.json({ ok: true });
});

// POST /api/game/end — teacher ends gold round session
app.post('/api/game/end', (req, res) => {
    resetGame();
    res.json({ ok: true });
});

// ---- Static files & SPA catch-all ----
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
║  🏆  Gold:     /?display + start button      ║
╚══════════════════════════════════════════════╝
    `);
});
