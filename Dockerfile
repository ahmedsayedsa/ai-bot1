# 1. ابدأ من صورة Node.js الرسمية
FROM node:20-alpine

# 2. أنشئ مجلد العمل
WORKDIR /app

# 3. انسخ كل ملفات المشروع (بما في ذلك test-server.js)
COPY . .

# 4. عرّف الأمر الذي سيتم تشغيله (ملف الاختبار البسيط)
CMD ["node", "test-server.js"]
