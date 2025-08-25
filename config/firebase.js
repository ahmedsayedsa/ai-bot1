import admin from 'firebase-admin';
import { config } from './env.js';

// تهيئة Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    projectId: config.firebase.projectId,
  });
}

export const db = admin.firestore();
export const auth = admin.auth();

// إعداد Firestore
db.settings({
  timestampsInSnapshots: true,
});

export default admin;