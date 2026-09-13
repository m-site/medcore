import { db, FieldValue, secure, user } from './_core.js';
export default async function handler(request, response) {
  secure(response); if (request.method !== 'POST') return response.status(405).json({ error: 'الطريقة غير مسموحة.' });
  const message = String(request.body?.message || '').trim();
  if (message.length < 5 || message.length > 1000) return response.status(400).json({ error: 'اكتب رسالة بين 5 و1000 حرف.' });
  try { const current = await user(request); await db().collection('feedback').add({ message, userId: current?.uid || null, createdAt: FieldValue.serverTimestamp(), status: 'new' }); response.status(201).json({ ok: true }); }
  catch { response.status(500).json({ error: 'تعذر إرسال رأيك الآن.' }); }
}
