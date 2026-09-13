import { db, secure, seed } from './_core.js';

export default async function handler(_request, response) {
  try {
    secure(response); const store = db(); await seed(store);
    const snapshot = await store.collection('lessons').where('published', '==', true).get();
    response.status(200).json(snapshot.docs.map(doc => { const { questions, ...lesson } = doc.data(); return lesson; }));
  } catch (error) { response.status(500).json({ error: error.message }); }
}
