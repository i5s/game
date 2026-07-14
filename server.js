const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());

// ---- Data helpers ----
const BANK_NAME = '🏦 بنك النقاط';
function ensureBank(data) {
    if (!data[BANK_NAME]) data[BANK_NAME] = { score: 1000, days: {}, group: '0', isBank: true };
    return data;
}
function readData() {
    let data;
    try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { data = {}; }
    return ensureBank(data);
}
function writeData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
function findWeakest(data, excludeName) {
    let weakest = null, min = Infinity;
    for (let n in data) {
        if (n === excludeName) continue;
        if (data[n].isBank) continue;
        let s = data[n].score || 0;
        if (s < min) { min = s; weakest = n; }
    }
    return weakest;
}

// ---- Persistent data API ----
app.get('/api/students', (req, res) => res.json(readData()));
app.post('/api/student', (req, res) => {
    let { name, score, days, group } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    let data = readData();
    if (!data[name]) data[name] = { score: 0, days: {}, group: '1' };
    if (score !== undefined) data[name].score = Math.max(0, score);
    if (days !== undefined) data[name].days = days;
    if (group !== undefined) data[name].group = group;
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
//  منافسة الذهب — real‑time competition engine
//  40 questions (10 per day), group‑filtered targeting
// ================================================================

const GOLD_QUESTIONS_BY_DAY = {
  1: [ // يوم 1: مسار المواد الإعلامية
    { q: "ما الجهاز الذي يستخدمه المصور لتصوير الفيديو؟", opts: ["كاميرا", "ميكروويف", "خلاط", "غسالة"], correct: 0 },
    { q: "ما اسم الشخص الذي يقرأ الأخبار على التلفاز؟", opts: ["مذيع", "طباخ", "سائق", "نجار"], correct: 0 },
    { q: "ماذا نستخدم لتسجيل الصوت؟", opts: ["ميكروفون", "مطرقة", "مقص", "مسطرة"], correct: 0 },
    { q: "أين نشاهد الأخبار اليومية؟", opts: ["تلفاز", "ثلاجة", "سرير", "خزانة"], correct: 0 },
    { q: "ما معنى كلمة Broadcast؟", opts: ["بث", "طبخ", "بناء", "زراعة"], correct: 0 },
    { q: "أي من هذه أدوات التصوير؟", opts: ["حامل ثلاثي", "ممحاة", "دباسة", "مفك"], correct: 0 },
    { q: "ماذا يفعل المونتير؟", opts: ["يركب المشاهد", "يطبخ الطعام", "يقود سيارة", "يزرع شجرة"], correct: 0 },
    { q: "ما معنى كلمة Ingest؟", opts: ["استيراد المادة", "حذف المادة", "طباعة المادة", "تلوين المادة"], correct: 0 },
    { q: "من المسؤول عن إخراج النشرة؟", opts: ["مخرج", "مصور", "طباخ", "سباك"], correct: 0 },
    { q: "ما اسم برنامج تحرير الفيديو؟", opts: ["برنامج مونتاج", "آلة حاسبة", "متصفح", "لعبة"], correct: 0 },
  ],
  2: [ // يوم 2: مهندس استوديو البث
    { q: "ما الجهاز الذي يخلط الصوت والفيديو؟", opts: ["ميكسر", "مكنسة", "مكواة", "محمصة"], correct: 0 },
    { q: "ماذا نسمي الشاشة التي يقرأ منها المذيع؟", opts: ["Teleprompter", "تلفاز", "كمبيوتر", "آيباد"], correct: 0 },
    { q: "ما معنى كلمة Live؟", opts: ["بث مباشر", "تسجيل", "تصوير", "مونتاج"], correct: 0 },
    { q: "ماذا يفعل مهندس الاستوديو؟", opts: ["يتحكم بالأجهزة", "يطبخ", "يقود", "يسبح"], correct: 0 },
    { q: "ما الذي نرتديه لمنع صوت الهواء أثناء التسجيل؟", opts: ["طوق الصوت (Windscreen)", "خوذة", "نظارة", "قفازات"], correct: 0 },
    { q: "أين يجلس المذيع في الاستوديو؟", opts: ["خلف المنصة", "في المطبخ", "في السيارة", "على السرير"], correct: 0 },
    { q: "ما معنى كلمة Cue؟", opts: ["إشارة البدء", "إشارة نهاية", "توقف", "انتظار"], correct: 0 },
    { q: "ماذا نستخدم للإضاءة في الاستوديو؟", opts: ["لمبات تصوير", "شمعة", "مصباح جيب", "ليزر"], correct: 0 },
    { q: "كم عدد الكاميرات في الاستوديو الصغير؟", opts: ["2-3 كاميرات", "10 كاميرات", "كاميرا واحدة", "50 كاميرا"], correct: 0 },
    { q: "ما معنى كلمة Replay؟", opts: ["إعادة المشهد", "تصوير جديد", "حذف", "تسليم"], correct: 0 },
  ],
  3: [ // يوم 3: كابتن طيران الدرون
    { q: "ما اسم الطائرة بدون طيار؟", opts: ["درون", "سيارة", "قطار", "دراجة"], correct: 0 },
    { q: "ماذا يعني GPS؟", opts: ["تحديد المواقع", "سرعة الريح", "ارتفاع", "وزن"], correct: 0 },
    { q: "أين يمنع طيران الدرون؟", opts: ["قرب المطارات", "فوق البحر", "فوق الجبال", "فوق الحقل"], correct: 0 },
    { q: "ما أول خطوة قبل الإقلاع؟", opts: ["فحص البطارية", "التصوير", "الهبوط", "النوم"], correct: 0 },
    { q: "ماذا يعني FPV؟", opts: ["كاميرا الرؤية المباشرة", "جهاز تحكم", "بطارية", "ريشة"], correct: 0 },
    { q: "ما نوع بطارية الدرون؟", opts: ["LiPo", "AA", "AAA", "بطارية سيارة"], correct: 0 },
    { q: "كم عدد ريشات الدرون الرباعي؟", opts: ["4", "2", "6", "8"], correct: 0 },
    { q: "ماذا يفعل كابتن الدرون؟", opts: ["يقود الدرون", "يطبخ", "يسبح", "يرسم"], correct: 0 },
    { q: "ما الجهاز الذي يتحكم بالدرون؟", opts: ["جهاز تحكم", "ميكروويف", "تلفاز", "ثلاجة"], correct: 0 },
    { q: "ماذا نصور بالدرون؟", opts: ["مناظر جوية", "طعام", "ملابس", "سيارات"], correct: 0 },
  ],
  4: [ // يوم 4: كاشف ومولد الـ AI
    { q: "ماذا يعني AI؟", opts: ["ذكاء اصطناعي", "طائرة", "سيارة", "قطار"], correct: 0 },
    { q: "ما اسم الأداة التي تولد الصور بالنص؟", opts: ["مولد صور AI", "غسالة", "مكنسة", "خلاط"], correct: 0 },
    { q: "هل يستطيع AI كتابة الأخبار؟", opts: ["نعم", "لا", "أحياناً", "مستحيل"], correct: 0 },
    { q: "ما معنى كلمة Prompt؟", opts: ["الأمر النصي", "طائرة", "كاميرا", "بطارية"], correct: 0 },
    { q: "كيف نصنع صورة بالـ AI؟", opts: ["نكتب وصفاً", "نصور بالجوال", "نرسم", "نشتري"], correct: 0 },
    { q: "ما فائدة الـ AI في الإعلام؟", opts: ["يساعد بالإنتاج", "يأكل", "ينام", "يمشي"], correct: 0 },
    { q: "هل كل صور AI حقيقية؟", opts: ["لا, بعضها مولّد", "نعم, كلها حقيقية", "نصفها", "مافي"], correct: 0 },
    { q: "ما معنى Training في AI؟", opts: ["تدريب النموذج", "طبخ", "نوم", "ركض"], correct: 0 },
    { q: "هل يستطيع AI كشف الأخبار المزيفة؟", opts: ["نعم", "لا", "مستحيل", "أحياناً"], correct: 0 },
    { q: "ما اسم تطبيق لتوليد الفيديو بالـ AI؟", opts: ["Sora", "Excel", "Word", "PowerPoint"], correct: 0 },
  ],
};

// In-memory game state
let game = {
    phase: 'idle',      // idle | question | answered | choice | result
    round: 0,
    day: 1,
    qIndex: 0,          // question number within current session (resets on end)
    sessionActive: false,
    question: null,
    options: [],
    correctIndex: -1,
    answers: {},        // { name: { answerIdx, time, group } }
    winner: null,
    winnerTime: null,
    winnerGroup: null,
    choiceMade: null,
    resultMsg: '',
    startAt: 0,
    timerSec: 15,
    securePlayers: [],
    usedQuestions: { 1: [], 2: [], 3: [], 4: [] },
};

// Called by "next" — keeps session alive, qIndex unchanged
function resetGame() {
    game.phase = 'idle';
    game.round = 0;
    game.question = null;
    game.options = [];
    game.correctIndex = -1;
    game.answers = {};
    game.winner = null;
    game.winnerTime = null;
    game.winnerGroup = null;
    game.choiceMade = null;
    game.resultMsg = '';
    game.startAt = 0;
    game.securePlayers = [];
}

// Called by "end" — full session reset, show thank you
function endSession() {
    game.phase = 'ended';
    game.sessionActive = false;
    game.round = 0;
    game.qIndex = 0;
    game.question = null;
    game.options = [];
    game.correctIndex = -1;
    game.answers = {};
    game.winner = null;
    game.winnerTime = null;
    game.winnerGroup = null;
    game.choiceMade = null;
    game.resultMsg = '';
    game.startAt = 0;
    game.securePlayers = [];
    game.usedQuestions = { 1: [], 2: [], 3: [], 4: [] };
}

function pickQuestion(day) {
    let pool = GOLD_QUESTIONS_BY_DAY[day] || GOLD_QUESTIONS_BY_DAY[1];
    if (!game.usedQuestions[day]) game.usedQuestions[day] = [];
    let used = game.usedQuestions[day];
    let available = pool.map((_, i) => i).filter(i => !used.includes(i));
    if (available.length === 0) {
        // All questions for this day used — reset and reuse
        used = [];
        available = pool.map((_, i) => i);
    }
    let idx = available[Math.floor(Math.random() * available.length)];
    used.push(idx);
    game.usedQuestions[day] = used;
    let q = pool[idx];
    // Shuffle options so the correct answer isn't always first
    let items = q.opts.map((t, i) => ({ t, c: i === q.correct }));
    for (let i = items.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    game.day = day;
    game.question = q.q;
    game.options = items.map(x => x.t);
    game.correctIndex = items.findIndex(x => x.c);
    game.answers = {};
    game.winner = null;
    game.winnerTime = null;
    game.winnerGroup = null;
    game.choiceMade = null;
    game.resultMsg = '';
    game.startAt = Date.now();
}

function sanitisedGame() {
    let s = {
        phase: game.phase,
        round: game.round,
        day: game.day,
        qIndex: game.qIndex,
        sessionActive: game.sessionActive,
        question: game.question,
        options: game.options,
        winner: game.winner,
        winnerGroup: game.winnerGroup,
        choiceMade: game.choiceMade,
        resultMsg: game.resultMsg,
        timerSec: game.timerSec,
        startAt: game.startAt,
        securePlayers: game.securePlayers,
        answerCount: Object.keys(game.answers).length,
    };
    if (game.phase === 'question') {
        s.correctIndex = -1;
    } else {
        s.correctIndex = game.correctIndex;
        s.answers = game.answers;
    }
    return s;
}

// ---- منافسة الذهب API ----

app.get('/api/game', (req, res) => res.json(sanitisedGame()));

app.post('/api/game/start', (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: 'teacher name required' });
    let day = req.body.day || 1;
    if (game.phase === 'ended') game.qIndex = 0; // fresh session
    game.round++;
    game.qIndex++;
    game.sessionActive = true;
    pickQuestion(day);
    game.phase = 'question';
    res.json({ ok: true, round: game.round, qIndex: game.qIndex, day });
});

app.post('/api/game/advance', (req, res) => {
    let day = req.body.day || game.day || 1;
    resetGame();
    if (game.phase === 'ended') game.qIndex = 0;
    game.round++;
    game.qIndex++;
    game.sessionActive = true;
    pickQuestion(day);
    game.phase = 'question';
    res.json({ ok: true, round: game.round, qIndex: game.qIndex, day });
});

app.post('/api/game/answer', (req, res) => {
    let { name, answer } = req.body;
    if (!name || answer === undefined) return res.status(400).json({ error: 'name & answer required' });
    if (game.phase !== 'question') return res.json({ ok: false, reason: 'no_question' });
    if (game.answers[name]) return res.json({ ok: false, reason: 'already_answered' });

    let data = readData();
    let student = data[name] || { score: 0, days: {}, group: '1' };
    if (!data[name]) { data[name] = { score: 0, days: {}, group: '1' }; }

    game.answers[name] = { answerIdx: answer, time: Date.now(), group: student.group };

    let isCorrect = (answer === game.correctIndex);
    if (isCorrect) {
        // Speed-based scoring: faster reaction = more points (100 max, 10 min).
        // Question stays open so EVERY correct answer scores; fastest becomes winner.
        let elapsed = (Date.now() - game.startAt) / 1000;
        let pts = Math.max(10, Math.min(100, Math.round(100 - (elapsed / 30) * 90)));
        data[name].score = (data[name].score || 0) + pts;
        game.answers[name].points = pts;
        if (!game.winner) {
            game.winner = name;
            game.winnerTime = Date.now();
            game.winnerGroup = student.group;
        }
        writeData(data);
        return res.json({ ok: true, correct: true, points: pts, winner: game.winner, phase: game.phase });
    }
    writeData(data);
    res.json({ ok: true, correct: false, winner: game.winner, phase: game.phase });
});

app.post('/api/game/choice', (req, res) => {
    let { name, action } = req.body;
    if (game.winner !== name) return res.status(400).json({ error: 'not_winner' });
    if (game.phase !== 'answered' && game.phase !== 'question') return res.json({ ok: false, reason: 'wrong_phase' });

    let data = readData();
    let points = 30;
    let msg = '';
    let bank = data[BANK_NAME];

    if (action === 'secure') {
        if (!game.securePlayers.includes(name)) game.securePlayers.push(name);
        msg = `🔒 ${name} أمّن مركزه!`;
        game.phase = 'result';
        game.choiceMade = { action, target: name, points: 0 };
        game.resultMsg = msg;
        writeData(data);
        return res.json({ ok: true });
    }

    if (action === 'deduct') {
        let taken = Math.min(points, bank.score || 0);
        bank.score = (bank.score || 0) - taken;
        data[name].score = (data[name].score || 0) + taken;
        msg = `🗡️ ${name} أخذ ${taken} نقطة من البنك!`;
    } else if (action === 'give') {
        let weakest = findWeakest(data, name);
        if (weakest) {
            let taken = Math.min(points, bank.score || 0);
            bank.score = (bank.score || 0) - taken;
            data[weakest].score = (data[weakest].score || 0) + points;
            msg = `🎁 ${name} أعطى ${points} نقطة لـ ${weakest} (الأضعف)!`;
        } else {
            msg = `🎁 ${name} أراد يعطي لكن ما في أضعف!`;
        }
    }

    game.phase = 'result';
    game.choiceMade = { action, points };
    game.resultMsg = msg;
    writeData(data);
    res.json({ ok: true });
});

// POST /api/score — manual score edit (admin)
app.post('/api/score', (req, res) => {
    let { name, score } = req.body;
    if (!name || score === undefined) return res.status(400).json({ error: 'name & score required' });
    let data = readData();
    if (!data[name]) return res.status(404).json({ error: 'student not found' });
    data[name].score = Math.max(0, parseInt(score) || 0);
    writeData(data);
    res.json({ ok: true, name, score: data[name].score });
});

app.post('/api/game/next', (req, res) => {
    resetGame();
    res.json({ ok: true });
});

app.post('/api/game/end', (req, res) => {
    endSession();
    res.json({ ok: true });
});

// ---- Static files & SPA catch-all ----
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(express.static(__dirname));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ---- Ensure bank exists on disk at startup ----
writeData(readData());

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
║  🏆  منافسة الذهب                           ║
╚══════════════════════════════════════════════╝
    `);
});
