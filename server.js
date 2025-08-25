/**
 * Main Server File
 * WhatsApp Subscription Bot
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Config & utils
const env = require('./config/env');
const logger = require('./utils/logger');
// st { initializeFirebase } = require('./config/firebase');

// Middlewares
const rateLimitMiddleware = require('./middlewares/rateLimit');
const errorHandler = require('./middlewares/errorHandler');
const cspOverride = require('./middlewares/cspOverride');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8080;
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
        }));

        this.app.use(cors({
            origin: env.NODE_ENV === 'production'
                ? [env.FRONTEND_URL]
                : ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        this.app.use(compression());

        this.app.use((req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            next();
        });

        this.app.use(rateLimitMiddleware);

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

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.server.close(() => process.exit(0));
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.server.close(() => process.exit(0));
        });
    }

    async start() {
        // تجهيز الـ middlewares والـ routes قبل التشغيل
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();

        // شغّل السيرفر فورًا عشان Cloud Run يعدّي الـ health check
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${this.port}`, {
                environment: env.NODE_ENV,
                port: this.port,
                timestamp: new Date().toISOString()
            });
        });

        // تهيئة Firebase في الخلفية
        //y {
       ///  await initializeFirebase();
       ///  logger.info('✅ Firebase initialized successfully');
       // catch (error) {
       //   logger.error('❌ Firebase initialization failed:', error);
      //}

        return this.server;
    }
}

if (require.main === module) {
    const server = new Server();
    server.start().catch((error) => {
        logger.error('Server startup failed:', error);
        process.exit(1);
    });
}

module.exports = Server;
