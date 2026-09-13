import { getApps } from 'firebase-admin/app';

export default function handler(_request, response) {
  response.status(200).json({ ok: true, apps: getApps().length });
}
