// config/firebase.js
import { initializeApp, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

// هذا هو المسار الافتراضي الذي سيقوم Cloud Run بوضع السر فيه
const SERVICE_ACCOUNT_PATH = '/etc/secrets/firebase-key/serviceAccountKey.json';

async function initializeFirebase() {
  try {
    // لا تقم بالتهيئة إذا كان التطبيق مهيأ بالفعل
    if (admin.apps.length) {
      return;
    }

    // تهيئة التطبيق مباشرة من ملف JSON الذي يوفره Secret Manager
    initializeApp({
      credential: cert(SERVICE_ACCOUNT_PATH)
    });

    console.log('✅ Firebase initialized successfully from Secret Manager.');

  } catch (error) {
    console.error(`❌ Firebase initialization failed. Could not find or parse the service account file at ${SERVICE_ACCOUNT_PATH}.`, error);
    // في بيئة الإنتاج، من الأفضل إيقاف التطبيق إذا كانت تهيئة Firebase إلزامية
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
  }
}

export { initializeFirebase };
