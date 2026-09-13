import { db, secure, seed } from '../../_core.js';
export default async function handler(request, response) {
  secure(response);
  try { const store = db(); await seed(store); const doc = await store.collection('lessons').doc(request.query.id).get(); if (!doc.exists || !doc.data().published) return response.status(404).json({ error: 'الدرس غير موجود.' }); const { questions = [], ...lesson } = doc.data(); response.json({ ...lesson, questions: questions.map(({ answerIndex, explanation, ...question }) => question) }); }
  catch { response.status(500).json({ error: 'تعذر تحميل الدرس.' }); }
}
