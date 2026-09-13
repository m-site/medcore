import { getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export default function handler(_request, response) {
  response.status(200).json({ ok: true, apps: getApps().length, firestore: Boolean(FieldValue && getFirestore) });
}
