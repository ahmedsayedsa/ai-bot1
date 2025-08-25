FROM node:20-alpine

# تثبيت مكتبات أساسية
RUN apk add --no-cache bash libc6-compat

WORKDIR /app

# نسخ ملفات الـ package أولاً للاستفادة من الـ cache
COPY package*.json ./

# تثبيت الـ dependencies
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; else npm ci; fi

# نسخ باقي الكود
COPY . .

# لو فيه build script
# RUN npm run build

# المنفذ اللي Cloud Run بيستخدمه
EXPOSE 8080

# تشغيل السيرفر
#MD ["node", "src/server.js"]
CMD ["node", "test-server.js"]

