/**
 * Environment variables configuration.
 * Loads variables from .env file and exports them.
 * Converted to ES Modules (ESM).
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const env = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 8080,

  // Frontend URL for CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Session and JWT secrets
  SESSION_SECRET: process.env.SESSION_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',

  // Admin credentials
  ADMIN_USER: process.env.ADMIN_USER,
  ADMIN_PASS: process.env.ADMIN_PASS,

  // Firebase Credentials (ensure they are set in the environment )
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  
  // Add any other environment variables you need
};

// Export the configuration object as the default export
export default env;
