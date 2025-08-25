# استخدم إصدار Node.js الرسمي كصورة أساسية
FROM node:20-alpine

# أنشئ مجلد التطبيق
WORKDIR /app

# انسخ ملفات package.json و package-lock.json
COPY package*.json ./

# ثبّت الاعتماديات الخاصة بالإنتاج فقط
# استخدام npm ci يضمن تثبيت نفس الإصدارات الموجودة في package-lock.json
RUN npm ci --only=production && npm cache clean --force

# انسخ باقي ملفات التطبيق
# استخدام .dockerignore يضمن عدم نسخ الملفات غير الضرورية مثل node_modules
COPY . .

# --------------------------------------------------------------------
# تم تحويل الأسطر التالية إلى تعليقات لأنها تسبب مشاكل في Cloud Run
# RUN addgroup -g 1001 -S nodejs && \
#     adduser -S nextjs -u 1001 && \
#     chown -R nextjs:nodejs /app
# USER nextjs
# --------------------------------------------------------------------

# Cloud Run يوفر متغير البيئة PORT تلقائيًا
# EXPOSE 8080 هو مجرد توثيق، لكن من الجيد إبقاؤه
EXPOSE 8080

# --------------------------------------------------------------------
# تم تعطيل HEALTHCHECK الخاص بـ Docker للاعتماد على آلية Cloud Run
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD node healthcheck.js
# --------------------------------------------------------------------


# الأمر الذي سيتم تشغيله لبدء التطبيق
# هذا الأمر صحيح ويجب أن يعمل الآن
# ... (كل الأسطر الأخرى كما هي) ...

# بدلاً من استخدام npm start، قم بتشغيل node مباشرة
CMD ["node", "src/server.js"]
