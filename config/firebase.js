import admin from 'firebase-admin';
import { config } from './env.js';

const { projectId, clientEmail, privateKey } = config.firebase;

if (!projectId || !clientEmail || !privateKey) {
  console.warn('⚠️ Firebase credentials are missing or incomplete. Skipping Firebase initialization.');
} else if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'), // مهم جدًا لتحويل \n لأسطر فعلية
    }),
    projectId,
  });
}

export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;

if (db) {
  db.settings({ timestampsInSnapshots: true });
}

export default admin;
