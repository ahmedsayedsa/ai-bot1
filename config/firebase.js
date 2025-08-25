// config/firebase.js
import { initializeApp, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

async function initializeFirebase() {
  try {
    if (admin.apps.length) {
      return;
    }

    // 1. اقرأ متغيرات البيئة
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY; // سيتم توفيره بواسطة Secret Manager

    // 2. تحقق من وجود جميع المتغيرات المطلوبة
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️ Firebase credentials (project_id, client_email, or private_key) are missing from environment. Skipping Firebase initialization.');
      return;
    }

    // 3. قم ببناء كائن الاعتماد
    const credentials = {
      project_id: projectId,
      client_email: clientEmail,
      // لا حاجة لاستبدال \n هنا لأن Secret Manager يسلمها بشكل صحيح
      private_key: privateKey, 
    };

    // 4. تهيئة التطبيق
    initializeApp({
      credential: cert(credentials)
    });

    console.log('✅ Firebase initialized successfully from env vars and Secret Manager.');

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

export { initializeFirebase };
