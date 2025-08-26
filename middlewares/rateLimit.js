import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
module.exports = limiter; //