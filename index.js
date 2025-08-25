const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// إعداد Express
app.use(express.json());
app.use(express.static('public'));

// مسارات قاعدة البيانات
const DB_PATH = path.join(__dirname, 'database.json');
const USERS_PATH = path.join(__dirname, 'users.json');
const STATS_PATH = path.join(__dirname, 'stats.json');

// قاعدة البيانات الافتراضية
const defaultDB = {
    users: {},
    botStats: {
        totalMessages: 0,
        totalConnections: 0,
        lastConnection: new Date().toISOString(),
        status: 'offline',
        startTime: new Date().toISOString()
    },
    orders: {},
    settings: {
        adminUsername: 'admin',
        adminPassword: 'admin123',
        botName: 'WhatsApp Bot Dashboard',
        welcomeMessage: 'مرحباً بك! 👋'
    }
};

// دوال قاعدة البيانات
class JSONDatabase {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.data = null;
    }

    async init() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            this.data = JSON.parse(data);
            console.log('✅ Database loaded successfully');
        } catch (error) {
            console.log('📦 Creating new database...');
            this.data = defaultDB;
            await this.save();
        }
    }

    async save() {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('💾 Database saved');
        } catch (error) {
            console.error('❌ Error saving database:', error);
        }
    }

    // إدارة المستخدمين
    async addUser(phoneNumber, userData) {
        this.data.users[phoneNumber] = {
            phoneNumber,
            name: userData.name || 'مستخدم جديد',
            status: userData.status || 'active',
            createdAt: new Date().toISOString(),
            endDate: userData.endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            messageCount: userData.messageCount || 0,
            totalOrders: userData.totalOrders || 0,
            welcomeMessage: userData.welcomeMessage || this.data.settings.welcomeMessage,
            lastMessageDate: userData.lastMessageDate || null,
            apiKey: userData.apiKey || this.generateApiKey(),
            ...userData
        };
        await this.save();
        return this.data.users[phoneNumber];
    }

    async getUser(phoneNumber) {
        return this.data.users[phoneNumber] || null;
    }

    async getAllUsers() {
        return Object.values(this.data.users);
    }

    async updateUser(phoneNumber, updates) {
        if (this.data.users[phoneNumber]) {
            this.data.users[phoneNumber] = {
                ...this.data.users[phoneNumber],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            await this.save();
            return this.data.users[phoneNumber];
        }
        return null;
    }

    async deleteUser(phoneNumber) {
        if (this.data.users[phoneNumber]) {
            delete this.data.users[phoneNumber];
            await this.save();
            return true;
        }
        return false;
    }

    // إدارة الطلبات
    async addOrder(orderData) {
        const orderId = `order_${Date.now()}`;
        this.data.orders[orderId] = {
            id: orderId,
            createdAt: new Date().toISOString(),
            status: 'received',
            ...orderData
        };
        await this.save();
        return this.data.orders[orderId];
    }

    async getOrders(userId = null) {
        const orders = Object.values(this.data.orders);
        return userId ? orders.filter(o => o.userId === userId) : orders;
    }

    // الإحصائيات
    async updateStats(updates) {
        this.data.botStats = {
            ...this.data.botStats,
            ...updates,
            lastUpdate: new Date().toISOString()
        };
        await this.save();
        return this.data.botStats;
    }

    async getStats() {
        const totalUsers = Object.keys(this.data.users).length;
        const activeUsers = Object.values(this.data.users).filter(u => u.status === 'active').length;
        const totalOrders = Object.keys(this.data.orders).length;
        const todayMessages = this.getTodayMessages();

        return {
            totalUsers,
            activeUsers,
            totalOrders,
            todayMessages,
            ...this.data.botStats
        };
    }

    getTodayMessages() {
        const today = new Date().toDateString();
        return Object.values(this.data.users).reduce((total, user) => {
            const lastMsg = user.lastMessageDate;
            if (lastMsg && new Date(lastMsg).toDateString() === today) {
                return total + (user.messageCount || 0);
            }
            return total;
        }, 0);
    }

    // إعدادات البوت
    async updateSettings(updates) {
        this.data.settings = {
            ...this.data.settings,
            ...updates
        };
        await this.save();
        return this.data.settings;
    }

    getSettings() {
        return this.data.settings;
    }

    // مولد API Key
    generateApiKey() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
}

// إنشاء قاعدة البيانات
const db = new JSONDatabase(DB_PATH);

// تهيئة قاعدة البيانات
async function initDatabase() {
    await db.init();
    
    // إضافة بيانات تجريبية إذا كانت قاعدة البيانات فارغة
    const users = await db.getAllUsers();
    if (users.length === 0) {
        console.log('🎯 Adding sample data...');
        
        await db.addUser('966501234567', {
            name: 'أحمد محمد',
            status: 'active',
            messageCount: 25,
            totalOrders: 5,
            welcomeMessage: 'مرحباً أحمد! 👋 كيف يمكنني مساعدتك اليوم؟'
        });

        await db.addUser('966509876543', {
            name: 'فاطمة علي',
            status: 'active',
            messageCount: 12,
            totalOrders: 2,
            welcomeMessage: 'أهلاً وسهلاً فاطمة! 😊'
        });

        await db.addUser('966555123456', {
            name: 'محمد خالد',
            status: 'inactive',
            messageCount: 8,
            totalOrders: 1
        });

        // إضافة طلبات تجريبية
        await db.addOrder({
            userId: '966501234567',
            customerName: 'أحمد محمد',
            customerPhone: '966501234567',
            totalAmount: '150.00',
            orderItems: ['منتج 1', 'منتج 2'],
            notes: 'طلب عاجل'
        });

        console.log('✅ Sample data added successfully');
    }

    // تحديث حالة البوت
    await db.updateStats({
        status: 'online',
        lastConnection: new Date().toISOString(),
        totalConnections: (await db.getStats()).totalConnections + 1
    });
}

// API Routes

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Bot Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.95); padding: 30px; border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .status { padding: 20px; background: #e8f5e8; border-radius: 10px; margin: 20px 0; }
        .buttons { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        .btn { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 WhatsApp Bot Dashboard</h1>
            <p>لوحة تحكم شاملة لإدارة بوت واتساب</p>
        </div>
        
        <div class="status">
            <h3>📊 حالة النظام</h3>
            <div id="systemStatus">
                <p><strong>حالة البوت:</strong> <span id="botStatus">🔄 جاري التحقق...</span></p>
                <p><strong>آخر تحديث:</strong> <span id="lastUpdate">${new Date().toLocaleString('ar-SA')}</span></p>
            </div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <h3>👥 إجمالي المستخدمين</h3>
                <div style="font-size: 2em; font-weight: bold;" id="totalUsers">0</div>
            </div>
            <div class="stat-card">
                <h3>✅ المستخدمين النشطين</h3>
                <div style="font-size: 2em; font-weight: bold;" id="activeUsers">0</div>
            </div>
            <div class="stat-card">
                <h3>📨 الرسائل اليوم</h3>
                <div style="font-size: 2em; font-weight: bold;" id="todayMessages">0</div>
            </div>
            <div class="stat-card">
                <h3>🛒 إجمالي الطلبات</h3>
                <div style="font-size: 2em; font-weight: bold;" id="totalOrders">0</div>
            </div>
        </div>

        <div class="buttons">
            <a href="/admin-direct.html" class="btn btn-primary">🛠️ لوحة الإدارة</a>
            <a href="/user.html" class="btn btn-success">👤 صفحة المستخدم</a>
            <a href="/api/users" class="btn btn-info">📋 عرض البيانات</a>
        </div>
    </div>

    <script>
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                
                document.getElementById('totalUsers').textContent = stats.totalUsers;
                document.getElementById('activeUsers').textContent = stats.activeUsers;
                document.getElementById('todayMessages').textContent = stats.todayMessages;
                document.getElementById('totalOrders').textContent = stats.totalOrders;
                document.getElementById('botStatus').textContent = stats.status === 'online' ? '✅ متصل' : '❌ غير متصل';
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ar-SA');
                
            } catch (error) {
                console.error('خطأ في تحميل الإحصائيات:', error);
                document.getElementById('botStatus').textContent = '❌ خطأ في الاتصال';
            }
        }

        // تحميل الإحصائيات عند تحميل الصفحة
        loadStats();
        
        // تحديث تلقائي كل 30 ثانية
        setInterval(loadStats, 30000);
    </script>
</body>
</html>
    `);
});

// API المستخدمين
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في تحميل المستخدمين' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { phoneNumber, name, status, daysToAdd, welcomeMessage } = req.body;
        
        if (!phoneNumber || !name) {
            return res.status(400).json({ 
                success: false, 
                message: 'رقم الهاتف والاسم مطلوبان' 
            });
        }

        const endDate = new Date(Date.now() + (daysToAdd || 30) * 24 * 60 * 60 * 1000).toISOString();
        
        const user = await db.addUser(phoneNumber, {
            name,
            status: status || 'active',
            endDate,
            welcomeMessage
        });

        res.json({ 
            success: true, 
            message: 'تم إضافة/تحديث المستخدم بنجاح',
            user 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'خطأ في إضافة المستخدم: ' + error.message 
        });
    }
});

app.get('/api/user/:phoneNumber', async (req, res) => {
    try {
        const user = await db.getUser(req.params.phoneNumber);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'المستخدم غير موجود' });
        }
    } catch (error) {
        res.status(500).json({ error: 'خطأ في البحث عن المستخدم' });
    }
});

app.delete('/api/users/:phoneNumber', async (req, res) => {
    try {
        const deleted = await db.deleteUser(req.params.phoneNumber);
        if (deleted) {
            res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
        } else {
            res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في حذف المستخدم' });
    }
});

// API الإحصائيات
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في تحميل الإحصائيات' });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json({ 
            connected: stats.status === 'online',
            status: stats.status,
            lastConnection: stats.lastConnection 
        });
    } catch (error) {
        res.status(500).json({ connected: false, status: 'error' });
    }
});

// API الطلبات
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await db.getOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في تحميل الطلبات' });
    }
});

// Webhook لـ Easy Order
app.post('/webhook/easyorder/:apiKey', async (req, res) => {
    try {
        const { apiKey } = req.params;
        const orderData = req.body;

        // البحث عن المستخدم بـ API Key
        const users = await db.getAllUsers();
        const user = users.find(u => u.apiKey === apiKey);

        if (!user) {
            return res.status(401).json({ error: 'API Key غير صحيح' });
        }

        // إضافة الطلب
        const order = await db.addOrder({
            userId: user.phoneNumber,
            apiKey,
            ...orderData
        });

        // تحديث إحصائيات المستخدم
        await db.updateUser(user.phoneNumber, {
            totalOrders: (user.totalOrders || 0) + 1,
            lastOrderDate: new Date().toISOString()
        });

        console.log(`📦 طلب جديد من ${user.name}: ${orderData.totalAmount}`);

        res.json({ 
            success: true, 
            message: 'تم استقبال الطلب بنجاح',
            orderId: order.id 
        });

    } catch (error) {
        console.error('خطأ في webhook:', error);
        res.status(500).json({ error: 'خطأ في معالجة الطلب' });
    }
});

// تسجيل دخول المستخدم
app.post('/api/user/login', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const user = await db.getUser(phoneNumber);
        
        if (user) {
            res.json({ 
                success: true, 
                user: {
                    ...user,
                    // إخفاء معلومات حساسة
                    apiKey: user.apiKey ? `****${user.apiKey.slice(-4)}` : null
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'رقم الهاتف غير مسجل' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في تسجيل الدخول' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            dbStatus: 'connected',
            totalUsers: stats.totalUsers
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

// بدء الخادم
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Access at: http://localhost:${PORT}`);
            console.log(`📊 Admin panel: http://localhost:${PORT}/admin-direct.html`);
            console.log(`👤 User panel: http://localhost:${PORT}/user.html`);
            console.log(`💾 Database: ${DB_PATH}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// معالجة إشارات النظام
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await db.updateStats({ 
        status: 'offline',
        lastConnection: new Date().toISOString() 
    });
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM, shutting down...');
    await db.updateStats({ 
        status: 'offline',
        lastConnection: new Date().toISOString() 
    });
    process.exit(0);
});

// بدء الخادم
startServer();