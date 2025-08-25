const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const qrImage = require('qr-image');
const moment = require('moment');
const Firestore = require('@google-cloud/firestore');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// تهيئة Firestore
const firestore = new Firestore();

// متغيرات عامة
let qrCode = null;
let isConnected = false;
let botStartTime = null;
let sock = null;

// نموذج بيانات المستخدم
const userModel = {
  name: '',
  phone: '',
  subscription: {
    active: false,
    expiryDate: null
  },
  messageTemplate: 'مرحباً {name}، شكراً لاستخدامك خدماتنا. طلبك: {order}',
  messageCount: 0,
  createdAt: new Date()
};

// وظائف المساعدة
const helpers = {
  // التحقق من صلاحية الاشتراك
  isSubscriptionActive: (expiryDate) => {
    return expiryDate && new Date(expiryDate) > new Date();
  },
  
  // تنسيق التاريخ
  formatDate: (date) => {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  },
  
  // إضافة أيام لتاريخ
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
};

// إدارة جلسة الواتساب
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(process.env.SESSION_PATH);
  
  sock = makeWASocket({
    version: (await fetchLatestBaileysVersion()).version,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, {
        log: console.log
      }),
    },
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCode = qr;
      console.log('QR Code received');
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log('Connection closed. You are logged out.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      botStartTime = new Date();
      console.log('WhatsApp bot is connected!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // معالجة الرسائل الواردة
  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    
    // تجاهل الرسائل الجماعية والرسائل من البوت نفسه
    if (message.key.remoteJid === 'status@broadcast' || !message.message || message.key.fromMe) {
      return;
    }
    
    const userPhone = message.key.remoteJid.replace('@s.whatsapp.net', '');
    
    try {
      // البحث عن المستخدم في قاعدة البيانات
      const userDoc = await firestore.collection('users').doc(userPhone).get();
      
      if (!userDoc.exists) {
        // إذا لم يكن المستخدم مسجلاً، نطلب منه التسجيل
        await sock.sendMessage(message.key.remoteJid, { 
          text: 'مرحباً! أنت غير مسجل في نظامنا. يرجى التواصل مع المسؤول للتسجيل.' 
        });
        return;
      }
      
      const userData = userDoc.data();
      
      // التحقق من حالة الاشتراك
      if (!helpers.isSubscriptionActive(userData.subscription.expiryDate)) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: 'عذراً، اشتراكك منتهي. يرجى تجديد الاشتراك للمتابعة.' 
        });
        
        // تحديث حالة الاشتراك
        await firestore.collection('users').doc(userPhone).update({
          'subscription.active': false
        });
        
        return;
      }
      
      // إرسال رسالة الترحيب باستخدام القالب
      const welcomeMessage = userData.messageTemplate
        .replace('{name}', userData.name)
        .replace('{phone}', userPhone);
      
      await sock.sendMessage(message.key.remoteJid, { text: welcomeMessage });
      
      // زيادة عداد الرسائل
      await firestore.collection('users').doc(userPhone).update({
        messageCount: Firestore.FieldValue.increment(1),
        lastMessage: new Date()
      });
      
      // زيادة العداد العام للرسائل
      const statsDoc = await firestore.collection('stats').doc('messages').get();
      if (statsDoc.exists) {
        await firestore.collection('stats').doc('messages').update({
          total: Firestore.FieldValue.increment(1)
        });
      } else {
        await firestore.collection('stats').doc('messages').set({
          total: 1
        });
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
}

// APIs
// الحصول على جميع المستخدمين
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await firestore.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// إضافة/تحديث مستخدم
app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, subscriptionDays } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const expiryDate = helpers.addDays(new Date(), parseInt(subscriptionDays) || 30);
    
    const userData = {
      name,
      phone,
      subscription: {
        active: true,
        expiryDate: expiryDate,
        startedAt: new Date()
      },
      messageTemplate: 'مرحباً {name}، شكراً لاستخدامك خدماتنا. طلبك: {order}',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection('users').doc(phone).set(userData, { merge: true });
    
    res.json({ success: true, message: 'User added/updated successfully' });
  } catch (error) {
    console.error('Error adding/updating user:', error);
    res.status(500).json({ error: 'Failed to add/update user' });
  }
});

// تحديث قالب الرسالة
app.post('/api/template', async (req, res) => {
  try {
    const { phone, template } = req.body;
    
    if (!phone || !template) {
      return res.status(400).json({ error: 'Phone and template are required' });
    }
    
    await firestore.collection('users').doc(phone).update({
      messageTemplate: template,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// حالة البوت
app.get('/api/status', (req, res) => {
  res.json({
    connected: isConnected,
    hasQR: !!qrCode,
    uptime: botStartTime ? new Date() - botStartTime : 0
  });
});

// الحصول على QR Code
app.get('/api/qr', (req, res) => {
  if (!qrCode) {
    return res.status(404).json({ error: 'QR code not available' });
  }
  
  try {
    const qrBuffer = qrImage.imageSync(qrCode, { type: 'png' });
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': qrBuffer.length
    });
    res.end(qrBuffer);
  } catch (error) {
    res.json({ qr: qrCode });
  }
});

// Webhook لاستقبال الطلبات من Easy Order
app.post('/api/webhook/easyorder', async (req, res) => {
  try {
    const { customerPhone, orderDetails } = req.body;
    
    if (!customerPhone || !orderDetails) {
      return res.status(400).json({ error: 'Customer phone and order details are required' });
    }
    
    // البحث عن المستخدم
    const userDoc = await firestore.collection('users').doc(customerPhone).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // التحقق من حالة الاشتراك
    if (!helpers.isSubscriptionActive(userData.subscription.expiryDate)) {
      return res.status(403).json({ error: 'User subscription has expired' });
    }
    
    // إرسال رسالة الواتساب
    const message = userData.messageTemplate
      .replace('{name}', userData.name)
      .replace('{order}', JSON.stringify(orderDetails));
    
    if (sock && isConnected) {
      await sock.sendMessage(`${customerPhone}@s.whatsapp.net`, { text: message });
      
      // تحديث عداد الرسائل
      await firestore.collection('users').doc(customerPhone).update({
        messageCount: Firestore.FieldValue.increment(1),
        lastMessage: new Date()
      });
      
      // زيادة العداد العام للرسائل
      const statsDoc = await firestore.collection('stats').doc('messages').get();
      if (statsDoc.exists) {
        await firestore.collection('stats').doc('messages').update({
          total: Firestore.FieldValue.increment(1)
        });
      }
      
      res.json({ success: true, message: 'Order notification sent successfully' });
    } else {
      res.status(500).json({ error: 'WhatsApp bot is not connected' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Routes للواجهات
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.post('/user/login', async (req, res) => {
  const { phone } = req.body;
  
  try {
    const userDoc = await firestore.collection('users').doc(phone).get();
    
    if (userDoc.exists) {
      res.json({ success: true, user: userDoc.data() });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Subscription Bot</title>
      <link href="/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 800px; }
        .card { margin-bottom: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="text-center mb-4">
          <h1>WhatsApp Subscription Bot</h1>
          <p class="lead">نظام إدارة الاشتراكات والطلبات عبر واتساب</p>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body text-center">
                <h5 class="card-title">لوحة الإدارة</h5>
                <p class="card-text">للمسؤولين لإدارة المستخدمين والاشتراكات</p>
                <a href="/admin" class="btn btn-primary">الدخول إلى لوحة الإدارة</a>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-body text-center">
                <h5 class="card-title">لوحة المستخدم</h5>
                <p class="card-text">للمستخدمين للتحقق من حالة اشتراكهم</p>
                <a href="/user" class="btn btn-success">الدخول إلى لوحة المستخدم</a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mt-4">
          <div class="card-body text-center">
            <h5 class="card-title">حالة البوت</h5>
            <div id="botStatus">جاري التحقق...</div>
            <div id="qrCode" class="mt-3"></div>
          </div>
        </div>
      </div>
      
      <script>
        // تحديث حالة البوت
        async function updateBotStatus() {
          try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            const statusElement = document.getElementById('botStatus');
            statusElement.innerHTML = status.connected 
              ? '<span class="badge bg-success">متصل</span>' 
              : '<span class="badge bg-danger">غير متصل</span>';
            
            if (!status.connected && status.hasQR) {
              const qrResponse = await fetch('/api/qr');
              const qrBlob = await qrResponse.blob();
              const qrUrl = URL.createObjectURL(qrBlob);
              
              document.getElementById('qrCode').innerHTML = `
                <p>امسح QR Code للاتصال:</p>
                <img src="${qrUrl}" width="200" height="200">
              `;
            } else {
              document.getElementById('qrCode').innerHTML = '';
            }
          } catch (error) {
            console.error('Error fetching bot status:', error);
          }
        }
        
        // تحديث الحالة كل 5 ثوان
        updateBotStatus();
        setInterval(updateBotStatus, 5000);
      </script>
    </body>
    </html>
  `);
});

// معالجة الأخطاء 404
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - الصفحة غير موجودة</title>
      <link href="/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
      <div class="container text-center mt-5">
        <h1>404</h1>
        <p>الصفحة التي تبحث عنها غير موجودة.</p>
        <a href="/" class="btn btn-primary">العودة إلى الصفحة الرئيسية</a>
      </div>
    </body>
    </html>
  `);
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectToWhatsApp();
});