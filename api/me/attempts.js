import { db, secure, user } from '../_core.js';
export default async function handler(request, response) {
  secure(response); const current = await user(request);
  if (!current) return response.status(401).json({ error: 'سجّل دخولك أولاً.' });
  try { const rows = await db().collection('users').doc(current.uid).collection('attempts').orderBy('createdAt', 'desc').limit(50).get(); response.json(rows.docs.map(d => ({ id: d.id, ...d.data() }))); }
  catch { response.status(500).json({ error: 'تعذر تحميل تقدّمك.' }); }
}
