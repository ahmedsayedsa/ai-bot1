const express = require('express');
const { makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const admin = require('firebase-admin');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// تهيئة Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// متغيرات عامة
let sock;
let qrCodeString = '';
let isConnected = false;
let connectionStatus = 'Disconnected';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// دالة لإنشاء اتصال واتساب
async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        qrCodeString = await QRCode.toDataURL(qr);
        console.log('QR Code generated');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        
        isConnected = false;
        connectionStatus = 'Disconnected';
        
        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connected successfully!');
        isConnected = true;
        connectionStatus = 'Connected';
        qrCodeString = '';
        
        // حفظ إحصائيات الاتصال
        await updateBotStats();
      }
    });

    // معالجة الرسائل الواردة
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && message.message) {
        const from = message.key.remoteJid;
        const phoneNumber = from.split('@')[0];
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';

        // التحقق من المستخدم في قاعدة البيانات
        const userDoc = await db.collection('users').doc(phoneNumber).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // التحقق من صلاحية الاشتراك
          if (userData.status === 'active' && new Date(userData.endDate) > new Date()) {
            // إرسال رسالة الترحيب المخصصة
            if (userData.welcomeMessage) {
              await sendMessage(from, userData.welcomeMessage);
            }
            
            // تحديث إحصائيات الرسائل
            await updateMessageStats(phoneNumber);
          } else {
            // إرسال رسالة انتهاء الاشتراك
            await sendMessage(from, '⚠️ عذراً، اشتراكك منتهي الصلاحية. يرجى تجديد اشتراكك.');
          }
        } else {
          // رسالة للمستخدمين غير المسجلين
          await sendMessage(from, '🚫 عذراً، هذا الرقم غير مسجل في النظام.');
        }
      }
    });

  } catch (error) {
    console.error('Error connecting to WhatsApp:', error);
    setTimeout(connectToWhatsApp, 10000);
  }
}

// دالة إرسال الرسائل
async function sendMessage(to, message) {
  try {
    if (sock && isConnected) {
      await sock.sendMessage(to, { text: message });
      console.log(`Message sent to ${to}: ${message}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

// تحديث إحصائيات البوت
async function updateBotStats() {
  try {
    const statsRef = db.collection('botStats').doc('general');
    await statsRef.set({
      lastConnection: new Date().toISOString(),
      totalConnections: admin.firestore.FieldValue.increment(1),
      status: 'online'
    }, { merge: true });
  } catch (error) {
    console.error('Error updating bot stats:', error);
  }
}

// تحديث إحصائيات الرسائل
async function updateMessageStats(phoneNumber) {
  try {
    const userRef = db.collection('users').doc(phoneNumber);
    await userRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      lastMessageDate: new Date().toISOString()
    });

    // تحديث الإحصائيات العامة
    const statsRef = db.collection('botStats').doc('general');
    await statsRef.update({
      totalMessages: admin.firestore.FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error updating message stats:', error);
  }
}

// =================== ROUTES ===================

// الصفحة الرئيسية - عرض حالة البوت
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الإدارة
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// صفحة المستخدم
app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// API للحصول على حالة البوت
app.get('/api/status', (req, res) => {
  res.json({
    connected: isConnected,
    status: connectionStatus,
    qrCode: qrCodeString,
    timestamp: new Date().toISOString()
  });
});

// API لإدارة المستخدمين
app.post('/api/users', async (req, res) => {
  try {
    const { phoneNumber, name, status, daysToAdd, welcomeMessage } = req.body;

    if (!phoneNumber || !name) {
      return res.status(400).json({ error: 'Phone number and name are required' });
    }

    // حساب تاريخ انتهاء الاشتراك
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (daysToAdd || 30));

    const userData = {
      phoneNumber,
      name,
      status: status || 'active',
      endDate: endDate.toISOString(),
      createdAt: new Date().toISOString(),
      welcomeMessage: welcomeMessage || 'مرحباً بك! 👋',
      messageCount: 0,
      apiKey: crypto.randomBytes(32).toString('hex')
    };

    await db.collection('users').doc(phoneNumber).set(userData, { merge: true });

    res.json({ 
      success: true, 
      message: 'User added/updated successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error managing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API لعرض جميع المستخدمين
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API لحذف مستخدم
app.delete('/api/users/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    await db.collection('users').doc(phoneNumber).delete();
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API لتحديث رسالة الترحيب
app.post('/api/template', async (req, res) => {
  try {
    const { phoneNumber, welcomeMessage } = req.body;

    if (!phoneNumber || !welcomeMessage) {
      return res.status(400).json({ error: 'Phone number and welcome message are required' });
    }

    await db.collection('users').doc(phoneNumber).update({
      welcomeMessage,
      updatedAt: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: 'Welcome message updated successfully' 
    });
  } catch (error) {
    console.error('Error updating welcome message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API لبيانات مستخدم محدد
app.get('/api/user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const userDoc = await db.collection('users').doc(phoneNumber).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const isExpired = new Date(userData.endDate) < new Date();
    
    res.json({
      user: {
        ...userData,
        isExpired,
        daysLeft: isExpired ? 0 : Math.ceil((new Date(userData.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API لتسجيل دخول المستخدم
app.post('/api/user/login', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const userDoc = await db.collection('users').doc(phoneNumber).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const isExpired = new Date(userData.endDate) < new Date();

    res.json({
      success: true,
      user: {
        ...userData,
        isExpired,
        daysLeft: isExpired ? 0 : Math.ceil((new Date(userData.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook لـ Easy Order
app.post('/webhook/easyorder/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    const orderData = req.body;

    // البحث عن المستخدم بواسطة API Key
    const usersSnapshot = await db.collection('users').where('apiKey', '==', apiKey).get();
    
    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'Invalid API key' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const phoneNumber = userDoc.id;

    // التحقق من صلاحية الاشتراك
    if (userData.status !== 'active' || new Date(userData.endDate) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired' });
    }

    // حفظ الطلب في قاعدة البيانات
    const orderId = `order_${Date.now()}`;
    await db.collection('orders').doc(orderId).set({
      ...orderData,
      userId: phoneNumber,
      createdAt: new Date().toISOString(),
      status: 'received'
    });

    // إرسال رسالة واتساب للعميل
    const customerPhone = orderData.customerPhone;
    const orderMessage = `🛍️ طلب جديد!\n\n` +
                        `📋 رقم الطلب: ${orderId}\n` +
                        `👤 العميل: ${orderData.customerName || 'غير محدد'}\n` +
                        `💰 المبلغ: ${orderData.totalAmount || 'غير محدد'}\n` +
                        `📱 الهاتف: ${customerPhone}\n\n` +
                        `✅ تم استلام طلبك بنجاح وسيتم التواصل معك قريباً.`;

    if (customerPhone) {
      const whatsappNumber = customerPhone.includes('@') ? customerPhone : `${customerPhone}@s.whatsapp.net`;
      await sendMessage(whatsappNumber, orderMessage);
    }

    // تحديث إحصائيات المستخدم
    await db.collection('users').doc(phoneNumber).update({
      totalOrders: admin.firestore.FieldValue.increment(1),
      lastOrderDate: new Date().toISOString()
    });

    res.json({
      success: true,
      orderId,
      message: 'Order received and WhatsApp message sent successfully'
    });

  } catch (error) {
    console.error('Error processing Easy Order webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API للإحصائيات العامة
app.get('/api/stats', async (req, res) => {
  try {
    const statsDoc = await db.collection('botStats').doc('general').get();
    const statsData = statsDoc.exists ? statsDoc.data() : {};
    
    // حساب عدد المستخدمين النشطين
    const activeUsersSnapshot = await db.collection('users')
      .where('status', '==', 'active')
      .where('endDate', '>', new Date().toISOString())
      .get();

    // حساب إجمالي المستخدمين
    const totalUsersSnapshot = await db.collection('users').get();

    // حساب إجمالي الطلبات
    const ordersSnapshot = await db.collection('orders').get();

    res.json({
      botStatus: isConnected ? 'online' : 'offline',
      totalUsers: totalUsersSnapshot.size,
      activeUsers: activeUsersSnapshot.size,
      totalMessages: statsData.totalMessages || 0,
      totalOrders: ordersSnapshot.size,
      lastConnection: statsData.lastConnection,
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
  console.log(`Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`User Panel: http://localhost:${PORT}/user`);
  
  // بدء الاتصال بواتساب
  connectToWhatsApp();
});

// معالجة إغلاق التطبيق
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (sock) {
    await sock.logout();
  }
  process.exit(0);
});