// config/firebase.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

// --- تهيئة المتغيرات ---
// سنقوم بتعريف المتغيرات هنا لتكون متاحة في نطاق الملف كله
let db;
let auth;

/**
 * Initializes the Firebase Admin SDK and exports the necessary services.
 */
async function initializeFirebase() {
  try {
    if (admin.apps.length) {
      console.log('Firebase app already initialized.');
      // إذا كان مهيأ بالفعل، فقط قم بتعيين المتغيرات
      db = getFirestore();
      auth = getAuth();
      return;
    }

    // بناء الاعتمادات من متغيرات البيئة + Secret Manager
    const credentials = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };

    // التحقق من وجود الاعتمادات
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
      console.warn('⚠️ Firebase credentials missing. Skipping initialization.');
      return;
    }

    // تهيئة التطبيق
    initializeApp({
      credential: cert(credentials)
    });

    // --- تعيين المتغيرات بعد التهيئة ---
    db = getFirestore();
    auth = getAuth();

    console.log('✅ Firebase initialized successfully.');

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// --- التصدير (Export) ---
// قم بتصدير المتغيرات مباشرة، بالإضافة إلى دالة التهيئة
export { initializeFirebase, db, auth };
