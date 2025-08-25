/**
 * Main Server File
 * WhatsApp Subscription Bot
 */

// --- استيراد الوحدات (ESM Syntax) ---
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';

// --- Config & utils ---
// ملاحظة: تأكد من أن هذه الملفات تستخدم `export` بدلاً من `module.exports`
import env from './config/env.js';
import logger from './utils/logger.js';
import { initializeFirebase } from './config/firebase.js';

// --- Middlewares ---
import rateLimitMiddleware from './middlewares/rateLimit.js';
import errorHandler from './middlewares/errorHandler.js';
import cspOverride from './middlewares/cspOverride.js';

// --- Routes ---
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';

// --- بديل لـ __dirname في ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8080;
        this.server = null; // لتعريف متغير السيرفر
    }

    setupMiddlewares() {
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false
        } ));

        this.app.use(cors({
            origin: env.NODE_ENV === 'production'
                ? [env.FRONTEND_URL]
                : ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        } ));

        this.app.use(compression());

        this.app.use((req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            next();
        });

        this.app.use(rateLimitMiddleware);

        // استخدام المتغير __dirname الجديد
        this.app.use(express.static(path.join(__dirname, '../public'), {
            maxAge: env.NODE_ENV === 'production' ? '1d' : '0',
            etag: true,
            lastModified: true
        }));

        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            next();
        });
    }

    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: env.NODE_ENV,
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/user', userRoutes);
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/payments', paymentsRoutes);

        this.app.post('/api/login', (req, res) => {
            const { email, password } = req.body;
            if (email === 'test@example.com' && password === '123456') {
                res.json({
                    success: true,
                    message: 'Login successful',
                    token: 'JWT_TOKEN_HERE'
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
        });

        this.app.use('/admin.html', cspOverride);
        this.app.use('/user.html', cspOverride);

        // استخدام المتغير __dirname الجديد
        this.app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
        this.app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/register.html')));
        this.app.get('/user', (req, res) => res.sendFile(path.join(__dirname, '../public/user.html')));
        this.app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));

        this.app.use('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({
                    success: false,
                    message: 'API endpoint not found'
                });
            } else {
                res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
            }
        });
    }

    setupErrorHandling() {
        this.app.use(errorHandler);

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        const shutdown = () => {
            logger.info('Shutdown signal received, shutting down gracefully');
            if (this.server) {
                this.server.close(() => {
                    logger.info('Server closed.');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }

    async start() {
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();

        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${this.port}`, {
                environment: env.NODE_ENV,
                port: this.port,
                timestamp: new Date().toISOString()
            });
        });

        try {
            await initializeFirebase();
            logger.info('✅ Firebase initialized successfully');
        } catch (error) {
            logger.error('❌ Firebase initialization failed:', error);
        }

        return this.server;
    }
}

// --- تشغيل السيرفر ---
const server = new Server();
server.start().catch((error) => {
    // هذا السطر هو الذي كان يسبب الخطأ الأصلي ويجب أن يعمل الآن
    logger.error('Server startup failed:', error);
    process.exit(1);
});

// --- تصدير الكلاس (اختياري، مفيد للاختبارات) ---
export default Server;
