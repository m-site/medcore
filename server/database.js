import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, module TEXT NOT NULL, description TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'متوسط', duration INTEGER NOT NULL DEFAULT 10,
      published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL, options_json TEXT NOT NULL, answer_index INTEGER NOT NULL,
      explanation TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Keep write operations atomic while using Node's built-in SQLite driver.
  db.transaction = callback => () => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = callback();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  return db;
}

export function bootstrapAdmin(db, email, password) {
  if (!email || !password) return false;
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (!exists) db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email.toLowerCase(), bcrypt.hashSync(password, 12), 'admin');
  return true;
}

export function seedDemo(db) {
  if (db.prepare('SELECT count(*) AS count FROM lessons').get().count) return;
  const lesson = { id: 'clinical-foundations', title: 'أساسيات التفكير السريري', module: 'Clinical Core', description: 'تجربة قصيرة للتعرّف على أسلوب Medcore.', level: 'تمهيدي', duration: 6 };
  db.prepare('INSERT INTO lessons (id,title,module,description,level,duration,published) VALUES (@id,@title,@module,@description,@level,@duration,1)').run(lesson);
  const questions = [
    ['q-1', 'ما الخطوة الأولى في التعامل مع مريض غير مستقر؟', ['جمع تاريخ مرضي مطوّل', 'تقييم ABCDE', 'طلب جميع التحاليل', 'كتابة التشخيص النهائي'], 1, 'تقييم مجرى الهواء والتنفس والدورة الدموية أولاً يحمي المريض من التأخير.'],
    ['q-2', 'أي اختيار يصف سؤالاً سريرياً جيداً؟', ['غامض ومفتوح بلا هدف', 'مرتبط بالمشكلة ويغيّر القرار', 'لا يرتبط بالفحص', 'يتكرر في كل حالة'], 1, 'السؤال الجيد يقرّبك من قرار سريري أو يستبعد احتمالاً مهماً.'],
    ['q-3', 'متى توثّق المعلومة المهمة؟', ['بعد نهاية اليوم', 'عند تذكّرها فقط', 'فور جمعها والتحقق منها', 'بعد خروج المريض'], 2, 'التوثيق المبكر والدقيق يقلل فقد المعلومات والأخطاء.']
  ];
  const insert = db.prepare('INSERT INTO questions (id,lesson_id,prompt,options_json,answer_index,explanation,position) VALUES (?,?,?,?,?,?,?)');
  questions.forEach(([id,prompt,options,answer,explanation], position) => insert.run(id, lesson.id, prompt, JSON.stringify(options), answer, explanation, position));
}
