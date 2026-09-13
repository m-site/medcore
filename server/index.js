import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { openDatabase, bootstrapAdmin, seedDemo } from './database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-me');
if (!secret) throw new Error('JWT_SECRET must be set in production.');
const db = openDatabase(path.resolve(root, process.env.DATABASE_PATH || 'data/medcore.db'));
bootstrapAdmin(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
seedDemo(db);

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || false }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

function adminOnly(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  try { req.user = jwt.verify(token, secret); if (req.user.role !== 'admin') throw new Error(); next(); }
  catch { res.status(401).json({ error: 'غير مصرح لك بهذه العملية.' }); }
}
function publicLesson(id) {
  const lesson = db.prepare('SELECT id,title,module,description,level,duration FROM lessons WHERE id = ? AND published = 1').get(id);
  if (!lesson) return null;
  lesson.questions = db.prepare('SELECT id,prompt,options_json,position FROM questions WHERE lesson_id = ? ORDER BY position').all(id)
    .map(q => ({ ...q, options: JSON.parse(q.options_json), options_json: undefined }));
  return lesson;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'medcore-api' }));
app.get('/api/lessons', (_req, res) => res.json(db.prepare('SELECT id,title,module,description,level,duration FROM lessons WHERE published = 1 ORDER BY updated_at DESC').all()));
app.get('/api/lessons/:id', (req, res) => { const lesson = publicLesson(req.params.id); lesson ? res.json(lesson) : res.status(404).json({ error: 'الدرس غير موجود.' }); });

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: true, legacyHeaders: false }), (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(10).max(128) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'بيانات الدخول غير صحيحة.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.data.email.toLowerCase());
  if (!user || !bcrypt.compareSync(input.data.password, user.password_hash)) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحين.' });
  res.json({ token: jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret, { expiresIn: '8h' }) });
});

app.post('/api/lessons/:id/attempts', (req, res) => {
  const input = z.object({ answers: z.array(z.object({ questionId: z.string().min(1).max(80), selectedIndex: z.number().int().min(0).max(7).nullable() })).min(1).max(200) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'إجابات الاختبار غير صالحة.' });
  const rows = db.prepare('SELECT id,prompt,options_json,answer_index,explanation FROM questions WHERE lesson_id = ?').all(req.params.id);
  if (!rows.length) return res.status(404).json({ error: 'الدرس غير موجود.' });
  const answers = new Map(input.data.answers.map(a => [a.questionId, a.selectedIndex]));
  const results = rows.map(q => ({ questionId: q.id, correct: answers.get(q.id) === q.answer_index, answerIndex: q.answer_index, explanation: q.explanation }));
  const score = results.filter(r => r.correct).length;
  db.prepare('INSERT INTO attempts (id,lesson_id,score,total) VALUES (?,?,?,?)').run(crypto.randomUUID(), req.params.id, score, rows.length);
  res.json({ score, total: rows.length, results });
});

app.post('/api/feedback', (req, res) => {
  const input = z.object({ message: z.string().trim().min(5).max(1000) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'اكتب رسالة بين 5 و1000 حرف.' });
  db.prepare('INSERT INTO feedback (id,message) VALUES (?,?)').run(crypto.randomUUID(), input.data.message);
  res.status(201).json({ ok: true });
});

const lessonInput = z.object({ id: z.string().regex(/^[a-z0-9-]{3,80}$/), title: z.string().trim().min(3).max(120), module: z.string().trim().min(2).max(80), description: z.string().trim().min(10).max(500), level: z.enum(['تمهيدي','متوسط','متقدم']), duration: z.number().int().min(1).max(240), published: z.boolean(), questions: z.array(z.object({ prompt: z.string().trim().min(5).max(1000), options: z.array(z.string().trim().min(1).max(300)).min(2).max(6), answerIndex: z.number().int().min(0).max(5), explanation: z.string().trim().max(1500) })).min(1).max(200) });
app.get('/api/admin/lessons', adminOnly, (_req, res) => res.json(db.prepare('SELECT id,title,module,published,updated_at FROM lessons ORDER BY updated_at DESC').all()));
app.get('/api/admin/lessons/:id', adminOnly, (req, res) => {
  const lesson = db.prepare('SELECT id,title,module,description,level,duration,published FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود.' });
  lesson.published = Boolean(lesson.published);
  lesson.questions = db.prepare('SELECT prompt,options_json,answer_index,explanation FROM questions WHERE lesson_id = ? ORDER BY position').all(lesson.id)
    .map(q => ({ prompt: q.prompt, options: JSON.parse(q.options_json), answerIndex: q.answer_index, explanation: q.explanation }));
  res.json(lesson);
});
app.post('/api/admin/lessons', adminOnly, (req, res) => {
  const input = lessonInput.safeParse(req.body); if (!input.success) return res.status(400).json({ error: 'بيانات الدرس غير صالحة.', details: input.error.flatten() });
  if (input.data.questions.some(q => q.answerIndex >= q.options.length)) return res.status(400).json({ error: 'إجابة صحيحة خارج الاختيارات.' });
  const lesson = input.data;
  const write = db.transaction(() => { db.prepare('INSERT INTO lessons (id,title,module,description,level,duration,published,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET title=excluded.title,module=excluded.module,description=excluded.description,level=excluded.level,duration=excluded.duration,published=excluded.published,updated_at=CURRENT_TIMESTAMP').run(lesson.id, lesson.title, lesson.module, lesson.description, lesson.level, lesson.duration, Number(lesson.published)); db.prepare('DELETE FROM questions WHERE lesson_id = ?').run(lesson.id); const insert = db.prepare('INSERT INTO questions (id,lesson_id,prompt,options_json,answer_index,explanation,position) VALUES (?,?,?,?,?,?,?)'); lesson.questions.forEach((q, position) => insert.run(crypto.randomUUID(), lesson.id, q.prompt, JSON.stringify(q.options), q.answerIndex, q.explanation, position)); });
  write(); res.status(201).json({ ok: true, id: lesson.id });
});
app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'حدث خطأ غير متوقع.' }); });
app.listen(port, () => console.log(`Medcore running on http://localhost:${port}`));
