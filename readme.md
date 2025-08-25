# WhatsApp Bot Dashboard مع تكامل Easy Order

بوت واتساب متكامل مع لوحة تحكم ونظام إدارة المستخدمين ودعم webhooks لـ Easy Order.

## 🌟 الميزات

### ✅ الميزات المكتملة:
- **بوت واتساب شغال** باستخدام Baileys ومتصّل بـ Firestore
- **عرض QR Code** في السيرفر بدلاً من التيرمنال
- **إعادة الاتصال التلقائي** عند انقطاع الاتصال
- **إدارة شاملة للمستخدمين**:
  - API لإضافة/تحديث المستخدمين
  - API لعرض جميع المستخدمين
  - دعم الاشتراكات مع تواريخ الانتهاء
  - رسائل ترحيب مخصصة لكل مستخدم
- **واجهات ويب متكاملة**:
  - `/` - الصفحة الرئيسية مع حالة البوت والإحصائيات
  - `/admin` - لوحة الإدارة الشاملة
  - `/user` - صفحة المستخدم مع معلومات الاشتراك وإحصائيات
- **Webhook لـ Easy Order** - استقبال ومعالجة الطلبات تلقائياً
- **إحصائيات مفصلة** - تتبع الرسائل والطلبات والمستخدمين
- **QR Code شخصي** لكل مستخدم
- **API Key** مخصص لكل مستخدم

### 🔧 إعدادات الإنتاج:
- **جاهز للنشر على Google Cloud Run**
- **يدعم المتغيرات البيئية**
- **معالجة الأخطاء وإعادة الاتصال التلقائي**

## 🚀 التشغيل

### المتطلبات:
1. Node.js v16 أو أحدث
2. حساب Firebase مع Firestore
3. ملف `serviceAccountKey.json` من Firebase

### التثبيت:

```bash
# استنساخ المشروع
git clone <repository-url>
cd whatsapp-bot-dashboard

# تثبيت التبعيات
npm install

# إنشاء مجلد public (إذا لم يكن موجوداً)
mkdir -p public

# نسخ ملف Firebase Service Account
# احصل على الملف من Firebase Console > Project Settings > Service Accounts
cp path/to/your/serviceAccountKey.json ./

# تشغيل السيرفر
npm start
```

### التشغيل في وضع التطوير:

```bash
npm run dev
```

## 🌐 الواجهات

### الصفحة الرئيسية (`/`)
- عرض حالة البوت (متصل/غير متصل)
- QR Code للاتصال بواتساب
- إحصائيات عامة (المستخدمين، الرسائل، الطلبات)
- تحديث تلقائي كل 5 ثوان

### لوحة الإدارة (`/admin`)
- **تسجيل الدخول**: `admin` / `admin123` (يرجى تغيير كلمة المرور)
- إضافة/تحديث المستخدمين
- تحديد مدة الاشتراك بالأيام
- تخصيص رسائل الترحيب
- عرض وإدارة جميع المستخدمين
- إحصائيات شاملة
- البحث والتصفية

### صفحة المستخدم (`/user`)
- **تسجيل الدخول** برقم الهاتف
- عرض حالة الاشتراك وتاريخ الانتهاء
- إحصائيات شخصية (الرسائل المرسلة، الطلبات)
- **API Key** و **Webhook URL** مخصص
- **QR Code شخصي** للواتساب
- إمكانية تحميل ومشاركة QR Code

## 🔗 API Endpoints

### إدارة المستخدمين
```bash
# إضافة/تحديث مستخدم
POST /api/users
{
  "phoneNumber": "966501234567",
  "name": "أحمد محمد",
  "status": "active",
  "daysToAdd": 30,
  "welcomeMessage": "مرحباً بك! 👋"
}

# عرض جميع المستخدمين
GET /api/users

# عرض مستخدم محدد
GET /api/user/966501234567

# حذف مستخدم
DELETE /api/users/966501234567

# تحديث رسالة الترحيب
POST /api/template
{
  "phoneNumber": "966501234567",
  "welcomeMessage": "رسالة جديدة"
}
```

### حالة البوت والإحصائيات
```bash
# حالة البوت
GET /api/status

# الإحصائيات العامة
GET /api/stats

# تسجيل دخول المستخدم
POST /api/user/login
{
  "phoneNumber": "966501234567"
}
```

### Webhook لـ Easy Order
```bash
# استقبال طلب من Easy Order
POST /webhook/easyorder/{API_KEY}
{
  "customerName": "محمد أحمد",
  "customerPhone": "966501234567",
  "totalAmount": "150.00",
  "orderItems": [...],
  "notes": "ملاحظات إضافية"
}
```

## 🔧 إعداد Firebase

1. إنشاء مشروع جديد في [Firebase Console](https://console.firebase.google.com)
2. تفعيل Firestore Database
3. إنشاء Service Account:
   - اذهب إلى Project Settings > Service Accounts
   - انقر على "Generate new private key"
   - احفظ الملف باسم `serviceAccountKey.json`
4. ضبط قواعد Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🚀 النشر على Google Cloud Run

### إعداد Google Cloud SDK:
```bash
# تسجيل الدخول
gcloud auth login

# تحديد المشروع
gcloud config set project YOUR_PROJECT_ID

# تفعيل الخدمات المطلوبة
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### النشر:
```bash
# بناء ونشر التطبيق
gcloud run deploy whatsapp-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10

# أو استخدام الأمر المختصر
npm run deploy
```

### مراقبة التطبيق:
```bash
# عرض اللوجز
gcloud run logs tail --service=whatsapp-bot

# أو
npm run logs
```

## 📁 هيكل المشروع

```
whatsapp-bot-dashboard/
├── server.js                 # الملف الرئيسي للسيرفر
├── package.json              # إعدادات المشروع والتبعيات
├── app.yaml                  # إعدادات Google App Engine
├── serviceAccountKey.json    # مفتاح Firebase (لا يجب رفعه لـ Git)
├── public/                   # ملفات الواجهة
│   ├── index.html           # الصفحة الرئيسية
│   ├── admin.html           # لوحة الإدارة
│   └── user.html            # صفحة المستخدم
├── auth_info_baileys/        # ملفات المصادقة لواتساب
└── README.md                 # هذا الملف
```

## 🗄️ هيكل قاعدة البيانات (Firestore)

### مجموعة `users`:
```javascript
{
  "966501234567": {
    "name": "أحمد محمد",
    "phoneNumber": "966501234567",
    "status": "active",
    "endDate": "2024-02-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "welcomeMessage": "مرحباً بك! 👋",
    "messageCount": 25,
    "totalOrders": 5,
    "apiKey": "abc123...",
    "lastMessageDate": "2024-01-20T14:30:00Z"
  }
}
```

### مجموعة `orders`:
```javascript
{
  "order_1705123456789": {
    "userId": "966501234567",
    "customerName": "محمد أحمد",
    "customerPhone": "966509876543",
    "totalAmount": "150.00",
    "orderItems": [...],
    "status": "received",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### مجموعة `botStats`:
```javascript
{
  "general": {
    "lastConnection": "2024-01-15T10:30:00Z",
    "totalConnections": 15,
    "totalMessages": 1250,
    "status": "online"
  }
}
```

## 🛠️ التخصيص والتطوير

### تغيير بيانات الإدارة:
في ملف `admin.html`، غيّر المتغيرات:
```javascript
const ADMIN_USERNAME = 'your_username';
const ADMIN_PASSWORD = 'your_secure_password';
```

### إضافة ميزات جديدة:
1. أضف الـ API endpoints الجديدة في `server.js`
2. أنشئ الواجهات المطلوبة في مجلد `public/`
3. حدّث قواعد البيانات في Firestore حسب الحاجة

### دمج مع أنظمة أخرى:
يمكنك إضافة webhooks إضافية لأنظمة أخرى:
```javascript
app.post('/webhook/custom/:apiKey', async (req, res) => {
  // معالجة البيانات المخصصة
});
```

## 🔒 الأمان

- **لا ترفع** ملف `serviceAccountKey.json` إلى Git
- **غيّر بيانات الإدارة** الافتراضية
- **استخدم HTTPS** في الإنتاج
- **راجع قواعد Firestore** لتقييد الوصول حسب الحاجة

## 📋 قائمة المهام

### ✅ مكتمل:
- [x] إعداد بوت واتساب مع Baileys
- [x] اتصال بـ Firestore
- [x] عرض QR Code في السيرفر
- [x] إعادة الاتصال التلقائي
- [x] إدارة المستخدمين والاشتراكات
- [x] واجهات الويب الثلاث
- [x] Webhook لـ Easy Order
- [x] إحصائيات شاملة
- [x] QR Code شخصي للمستخدمين
- [x] API Key مخصص لكل مستخدم

### 🔄 تحت التطوير:
- [ ] نظام إشعارات متقدم
- [ ] دعم الرسائل الوسائطية
- [ ] نظام القوالب المتقدم
- [ ] تقارير مفصلة
- [ ] دعم متعدد اللغات

## 🐛 استكشاف الأخطاء

### مشاكل شائعة:

1. **خطأ في الاتصال بواتساب**:
   - تأكد من إجراء المسح السريع للـ QR Code
   - احذف مجلد `auth_info_baileys` وأعد تشغيل السيرفر

2. **خطأ في Firebase**:
   - تأكد من صحة ملف `serviceAccountKey.json`
   - راجع قواعد Firestore

3. **مشاكل في النشر**:
   - تأكد من تفعيل خدمات Google Cloud المطلوبة
   - راجع إعدادات المشروع في `app.yaml`

## 📞 الدعم والمساعدة

في حالة واجهت أي مشاكل:
1. راجع اللوجز: `npm run logs`
2. تأكد من سلامة إعدادات Firebase
3. راجع حالة الاتصال في الصفحة الرئيسية

---

**مطور المشروع**: [Your Name]  
**تاريخ آخر تحديث**: يناير 2024  
**النسخة**: 1.0.0