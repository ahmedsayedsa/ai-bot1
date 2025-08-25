import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  },
  
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'stripe',
    secret: process.env.PAYMENT_PROVIDER_SECRET,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  },
  
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:8080',
    name: process.env.APP_NAME || 'نظام إدارة اشتراكات واتساب',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
};

// التحقق من المتغيرات المطلوبة
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'JWT_SECRET'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`متغير البيئة ${varName} مطلوب`);
  }
}