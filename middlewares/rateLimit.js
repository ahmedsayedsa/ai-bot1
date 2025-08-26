import rateLimit from 'express-rate-limit';

// ملاحظة: افترضت أنك ستمرر الإعدادات من ملف آخر
// إذا لم يكن لديك ملف config، يمكنك كتابة القيم مباشرة هنا.

// Limiter عام للـ API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد 100 طلب لكل IP خلال 15 دقيقة
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Limiter مخصص لصفحات المصادقة (تسجيل الدخول، التسجيل)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // حد 5 محاولات فقط لكل IP
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ملاحظة: لم نعد نستخدم module.exports هنا
// بدلاً من ذلك، نقوم بتصدير كل limiter باسمه
