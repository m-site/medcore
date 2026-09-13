import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(_request, response) {
  try {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    const app = getApps()[0] || initializeApp({ credential: cert(credentials) });
    const firestore = getFirestore(app);
    await firestore.collection('_health').doc('ping').get();
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
