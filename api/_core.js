import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  const value = raw.startsWith('ey') ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  try { return JSON.parse(value); }
  catch { return JSON.parse(value.replace(/("private_key"\s*:\s*")([\s\S]*?)(",\s*"client_email")/, (_, a, key, b) => a + key.replace(/\r?\n/g, '\\n') + b)); }
}

export function db() {
  const app = getApps()[0] || initializeApp({ credential: cert(credentials()) });
  return getFirestore(app);
}

export { FieldValue };

export function secure(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
}

export async function user(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try { return await getAuth().verifyIdToken(token); } catch { return null; }
}

export async function admin(request) {
  const current = await user(request);
  return current?.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase() ? current : null;
}

export async function seed(store = db()) {
  const ref = store.collection('lessons').doc('clinical-foundations');
  const doc = await ref.get();
  if (doc.exists && doc.data().questions?.length >= 3) return;
  await ref.set({
    id: 'clinical-foundations', title: 'أساسيات التفكير السريري', module: 'Clinical Core',
    description: 'جلسة تأسيسية تضعك في طريقة تفكير طبي منظمة.', level: 'تمهيدي', duration: 12, published: true,
    updatedAt: FieldValue.serverTimestamp(),
    questions: [
      { id: 'abcde', part: 'الطوارئ', prompt: 'ما الخطوة الأولى مع مريض غير مستقر؟', options: ['تاريخ مرضي مطوّل', 'تقييم ABCDE', 'كل التحاليل', 'التشخيص النهائي'], answerIndex: 1, explanation: 'ابدأ دائماً بتقييم مجرى الهواء والتنفس والدورة الدموية والوعي والتعرّض.' },
      { id: 'decision', part: 'التفكير السريري', prompt: 'أي سؤال سريري مفيد فعلاً؟', options: ['غامض بلا هدف', 'يغيّر القرار أو يستبعد احتمالاً مهماً', 'يتكرر في كل حالة', 'لا يرتبط بالفحص'], answerIndex: 1, explanation: 'السؤال الجيد يقرّبك من قرار علاجي أو تشخيصي واضح.' },
      { id: 'document', part: 'سلامة المريض', prompt: 'متى توثّق المعلومة المهمة؟', options: ['نهاية اليوم', 'عند تذكّرها', 'فور جمعها والتحقق منها', 'بعد خروج المريض'], answerIndex: 2, explanation: 'التوثيق المبكر والدقيق يقلل فقد المعلومات والأخطاء.' }
    ]
  }, { merge: true });
}
