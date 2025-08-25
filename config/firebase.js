// المكان المحتمل: config/firebase.js

import { initializeApp, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

// دالة لتهيئة Firebase
async function initializeFirebase() {
  try {
    // تحقق إذا كان التطبيق قد تم تهيئته بالفعل
    if (admin.apps.length) {
      console.log('Firebase app already initialized.');
      return;
    }

    // بناء كائن الاعتماد من متغيرات البيئة
    const firebaseCredentials = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID, // هذا الحقل ليس لديك، لكنه ليس إلزاميًا دائمًا
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // <-- مهم جدًا: استبدال \n
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID, // هذا الحقل ليس لديك، لكنه ليس إلزاميًا دائمًا
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    // تحقق من وجود المتغيرات الأساسية
    if (!firebaseCredentials.project_id || !firebaseCredentials.client_email || !firebaseCredentials.private_key ) {
      console.warn('⚠️ Firebase credentials are missing or incomplete from environment variables. Skipping Firebase initialization.');
      return; // لا توقف التطبيق، فقط تخطى التهيئة
    }

    // تهيئة تطبيق Firebase باستخدام الاعتمادات المجمعة
    initializeApp({
      credential: cert(firebaseCredentials)
    });

    console.log('✅ Firebase initialized successfully from environment variables.');

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // في بيئة الإنتاج، قد ترغب في إيقاف التطبيق إذا كان Firebase ضروريًا
    // process.exit(1); 
  }
}

// تصدير الدالة لاستخدامها في server.js
export { initializeFirebase };
