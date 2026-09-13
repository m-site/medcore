import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  const value = raw.startsWith('ey') ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  try { return JSON.parse(value); }
  catch { return JSON.parse(value.replace(/("private_key"\s*:\s*")([\s\S]*?)(",\s*"client_email")/, (_, a, key, b) => a + key.replace(/\r?\n/g, '\\n') + b)); }
}

export default async function handler(_request, response) {
  try {
    const app = getApps()[0] || initializeApp({ credential: cert(credentials()) });
    const store = getFirestore(app);
    const ref = store.collection('lessons').doc('clinical-foundations');
    const initial = { id: 'clinical-foundations', title: 'أساسيات التفكير السريري', module: 'Clinical Core', description: 'تجربة قصيرة للتعرّف على أسلوب Medcore.', level: 'تمهيدي', duration: 6, published: true, createdAt: FieldValue.serverTimestamp(), questions: [{ id: 'q-1', prompt: 'ما الخطوة الأولى في التعامل مع مريض غير مستقر؟', options: ['جمع تاريخ مرضي مطوّل', 'تقييم ABCDE', 'طلب جميع التحاليل', 'كتابة التشخيص النهائي'], answerIndex: 1, explanation: 'ابدأ بتقييم ABCDE.' }] };
    const existing = await ref.get();
    if (!existing.exists || !existing.data().questions?.length) await ref.set(initial, { merge: true });
    const snapshot = await store.collection('lessons').where('published', '==', true).get();
    response.status(200).json(snapshot.docs.map(doc => { const { questions, ...lesson } = doc.data(); return lesson; }));
  } catch (error) { response.status(500).json({ error: error.message }); }
}
