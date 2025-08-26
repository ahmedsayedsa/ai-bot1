/**
 * Middleware to override Content Security Policy (CSP) for specific routes.
 * This allows using external libraries like Bootstrap and Chart.js on certain pages.
 * Converted to ES Modules (ESM).
 */

const cspOverride = (req, res, next) => {
  // إزالة أي CSP headers موجودة مسبقاً لضمان عدم وجود تعارض
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  
  // تطبيق سياسة CSP المخصصة التي تسمح بالمكتبات الخارجية
  const cspDirectives = [
    "default-src 'self'",
    // السماح بالسكريبتات من مصادر موثوقة (CDNs)
    "script-src 'self' https://cdn.jsdelivr.net https://code.jquery.com https://stackpath.bootstrapcdn.com https://cdnjs.cloudflare.com",
    "script-src-attr 'none'",
    // السماح بالأنماط (CSS ) من مصادر موثوقة (CDNs)
    "style-src 'self' https://cdn.jsdelivr.net https://stackpath.bootstrapcdn.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    // السماح بالخطوط من مصادر موثوقة (CDNs )
    "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ' );

  // تعيين الـ header الجديد
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // الانتقال إلى الـ middleware التالي
  next();
};

// نقوم بتصدير الدالة كتصدير افتراضي لتتوافق مع server.js
export default cspOverride;
