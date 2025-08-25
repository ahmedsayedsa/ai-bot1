// config/firebase.js

import { initializeApp, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK.
 * It constructs credentials by combining environment variables for project_id and client_email
 * with the private_key supplied securely via Secret Manager.
 */
async function initializeFirebase() {
  try {
    // Exit if the app is already initialized to prevent errors.
    if (admin.apps.length) {
      console.log('Firebase app already initialized.');
      return;
    }

    // 1. Read credentials from environment variables.
    // The private_key is securely injected by Google Cloud Run from Secret Manager.
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // 2. Validate that all required parts of the credential exist.
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️ Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY) are missing from the environment. Skipping Firebase initialization.');
      // In a production environment, if Firebase is critical, you might want to throw an error instead.
      // For now, we just skip initialization.
      return;
    }

    // 3. Construct the full credential object for Firebase.
    const credentials = {
      project_id: projectId,
      client_email: clientEmail,
      // The private_key from Secret Manager does not need the `\n` replacement.
      private_key: privateKey,
    };

    // 4. Initialize the Firebase app with the constructed credentials.
    initializeApp({
      credential: cert(credentials)
    });

    console.log('✅ Firebase initialized successfully from environment variables and Secret Manager.');

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // If Firebase is absolutely essential for the app to run, exit the process in production.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

export { initializeFirebase };
