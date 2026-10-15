// WellLife backend: Express + a JSON file for storage (no database to install).
// Run: npm install && npm start  ->  http://localhost:3000
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");
const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Lightweight health check for deployment platforms.
app.get("/health", (_req, res) => res.json({ ok: true, app: "WellLife" }));

/* ---------- Static content (Solution: reminders, short lessons, trusted support) ---------- */
const HABITS = [
  { id: "sleep", label: "Sleep 7+ hours", tip: "Set a fixed bedtime and keep screens away 30 minutes before." },
  { id: "move", label: "Move for 20 minutes", tip: "A walk, skipping, a sport, or stretching all count." },
  { id: "water", label: "Drink 6-8 glasses of water", tip: "Keep a bottle at your desk and refill it at each break." },
  { id: "breathe", label: "Take 5 calm breaths", tip: "Breathe in for 4 counts, out for 6. Do it before a test or when stressed." },
  { id: "talk", label: "Talk to someone you trust", tip: "Even a short chat with a friend or family member helps." },
];

const LESSONS = [
  { id: "l-sleep", topic: "sleep", title: "Why sleep matters for exams", minutes: 2,
    body: "Your brain stores what you studied while you sleep. Going to bed at the same time each night, even on weekends, helps you fall asleep faster. If you can't sleep after 20 minutes, get up, dim the lights, and read something calm until you feel sleepy." },
  { id: "l-move", topic: "exercise", title: "Small movement, big mood", minutes: 2,
    body: "You don't need a gym. Ten minutes of brisk walking can lift your mood and help you focus. Try moving for a few minutes after every hour of study. Pick something you enjoy so it is easy to repeat tomorrow." },
  { id: "l-water", topic: "hydration", title: "Hydration and focus", minutes: 1,
    body: "Even mild dehydration can cause headaches and make it harder to concentrate. Drink water regularly through the day instead of waiting until you feel thirsty. Pale yellow urine is a simple sign you are drinking enough." },
  { id: "l-stress", topic: "emotional", title: "When stress feels too big", minutes: 3,
    body: "Stress before exams is normal. Try this: name what you feel, breathe out slowly six times, and write down the one next small step. If worry stays for weeks, affects your sleep or appetite, or you feel hopeless, please talk to a counsellor, teacher, or someone you trust." },
  { id: "l-routine", topic: "routine", title: "Build a habit that sticks", minutes: 2,
    body: "Start with one habit and make it tiny. Attach it to something you already do, like drinking water right after brushing your teeth. Tick it off daily. Missing a day is fine; just restart the next day." },
];

// Verify these numbers for your region before launch and add local counsellors/partners.
const SUPPORT = [
  { id: "telemanas", name: "Tele-MANAS (Government of India)", contact: "14416", note: "Free, 24x7 mental health support in many languages." },
  { id: "icall", name: "iCall (TISS)", contact: "9152987821", note: "Counselling by trained professionals (check current hours)." },
  { id: "school", name: "Your school or college counsellor", contact: "", note: "Ask your student affairs office for the counsellor's timings." },
];

/* ---------- Tiny JSON store ---------- */
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { checkins: [], lessonsDone: [] }; }
}
function save(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const day = (d = new Date()) => d.toISOString().slice(0, 10);
const validUser = (u) => typeof u === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(u);

/* ---------- Routes ---------- */
app.get("/api/habits", (_req, res) => res.json(HABITS));
app.get("/api/lessons", (_req, res) => res.json(LESSONS));
app.get("/api/support", (_req, res) => res.json(SUPPORT));

// Mood + habit check-in. One per user per day (re-posting updates today's entry).
app.post("/api/checkins", (req, res) => {
  const { userId, mood, habits = [], note = "" } = req.body || {};
  if (!validUser(userId)) return res.status(400).json({ error: "userId is missing or invalid." });
  if (!Number.isInteger(mood) || mood < 1 || mood > 5)
    return res.status(400).json({ error: "mood must be a whole number from 1 to 5." });
  const ids = HABITS.map((h) => h.id);
  const done = [...new Set(habits)].filter((h) => ids.includes(h));
  const db = load();
  const date = day();
  const entry = { userId, date, mood, habits: done, note: String(note).slice(0, 280), at: new Date().toISOString() };
  const i = db.checkins.findIndex((c) => c.userId === userId && c.date === date);
  if (i >= 0) db.checkins[i] = entry; else db.checkins.push(entry);
  save(db);
  // Gentle nudge: low mood two days running -> point to support (frontend shows it).
  const recent = db.checkins.filter((c) => c.userId === userId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const needsSupport = mood <= 2 && recent.length === 2 && recent.every((c) => c.mood <= 2);
  res.json({ ok: true, entry, needsSupport });
});

app.post("/api/lessons/:id/complete", (req, res) => {
  const { userId } = req.body || {};
  if (!validUser(userId)) return res.status(400).json({ error: "userId is missing or invalid." });
  if (!LESSONS.some((l) => l.id === req.params.id)) return res.status(404).json({ error: "Lesson not found." });
  const db = load();
  if (!db.lessonsDone.some((l) => l.userId === userId && l.lessonId === req.params.id)) {
    db.lessonsDone.push({ userId, lessonId: req.params.id, date: day() });
    save(db);
  }
  res.json({ ok: true });
});

// Personal summary: today's entry, streak, last 7 days, lessons done.
app.get("/api/summary", (req, res) => {
  const userId = req.query.userId;
  if (!validUser(userId)) return res.status(400).json({ error: "userId is missing or invalid." });
  const db = load();
  const mine = db.checkins.filter((c) => c.userId === userId);
  const byDate = Object.fromEntries(mine.map((c) => [c.date, c]));
  const week = [];
  for (let n = 6; n >= 0; n--) {
    const d = day(new Date(Date.now() - n * 864e5));
    week.push({ date: d, mood: byDate[d]?.mood ?? null, habits: byDate[d]?.habits.length ?? 0 });
  }
  let streak = 0;
  for (let n = byDate[day()] ? 0 : 1; ; n++) {
    if (byDate[day(new Date(Date.now() - n * 864e5))]) streak++; else break;
  }
  res.json({
    today: byDate[day()] || null,
    streak,
    week,
    habitTotal: HABITS.length,
    lessonsDone: db.lessonsDone.filter((l) => l.userId === userId).map((l) => l.lessonId),
  });
});

// Aggregate metrics from the lean canvas (anonymous, for school dashboards).
app.get("/api/metrics", (_req, res) => {
  const db = load();
  const since = (n) => day(new Date(Date.now() - n * 864e5));
  const active = (from, to) =>
    new Set(db.checkins.filter((c) => c.date > from && c.date <= to).map((c) => c.userId));
  const wau = active(since(7), day()).size;
  // Four-week retention: users first seen 4+ weeks ago who were active in the last 7 days.
  const first = {};
  db.checkins.forEach((c) => { if (!first[c.userId] || c.date < first[c.userId]) first[c.userId] = c.date; });
  const cohort = Object.keys(first).filter((u) => first[u] <= since(28));
  const retained = cohort.filter((u) => active(since(7), day()).has(u)).length;
  const last7 = db.checkins.filter((c) => c.date > since(7));
  const avg = (a) => (a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : null);
  res.json({
    weeklyActiveUsers: wau,
    fourWeekRetention: cohort.length ? +(retained / cohort.length).toFixed(2) : null,
    lessonCompletions: db.lessonsDone.length,
    checkinsLast7Days: last7.length,
    avgMoodLast7Days: avg(last7.map((c) => c.mood)),
    avgHabitsPerCheckin: avg(last7.map((c) => c.habits.length)),
  });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));
app.listen(PORT, () => console.log(`WellLife running at http://localhost:${PORT}`));
