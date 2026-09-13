import { db, FieldValue, secure, seed, user } from '../../../_core.js';

export default async function handler(request, response) {
  secure(response);
  if (request.method !== 'POST') return response.status(405).json({ error: 'الطريقة غير مسموحة.' });
  try {
    const store = db(); await seed(store);
    const lesson = (await store.collection('lessons').doc(request.query.id).get()).data();
    if (!lesson?.published) return response.status(404).json({ error: 'الدرس غير موجود.' });
    const supplied = new Map((request.body?.answers || []).map(a => [a.questionId, a.selectedIndex]));
    const results = lesson.questions.map(q => ({ questionId: q.id, correct: supplied.get(q.id) === q.answerIndex, explanation: q.explanation }));
    const score = results.filter(r => r.correct).length;
    const current = await user(request);
    if (current) await store.collection('users').doc(current.uid).collection('attempts').add({ lessonId: lesson.id, lessonTitle: lesson.title, score, total: results.length, createdAt: FieldValue.serverTimestamp() });
    response.status(200).json({ score, total: results.length, results, saved: Boolean(current) });
  } catch { response.status(500).json({ error: 'تعذر تصحيح الاختبار الآن.' }); }
}
