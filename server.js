/**
 * Main Server File
 * WhatsApp Subscription Bot
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import configurations and utilities
const env = require('./config/env');
const logger = require('./utils/logger');
const { initializeFirebase } = require('./config/firebase');

// Import middlewares
const rateLimitMiddleware = require('./middlewares/rateLimit');
const errorHandler = require('./middlewares/errorHandler');
const cspOverride = require('./middlewares/cspOverride');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

class Server {
    constructor() {
        this.app = express();
        this.port = env.PORT;
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddlewares() {
        // Security middlewares
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

        // CORS configuration
        this.app.use(cors({
            origin: env.NODE_ENV === 'production' 
                ? [env.FRONTEND_URL] 
                : ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Rate limiting
        this.app.use(rateLimitMiddleware);

        // Static files
        this.app.use(express.static(path.join(__dirname, '../public'), {
            maxAge: env.NODE_ENV === 'production' ? '1d' : '0',
            etag: true,
            lastModified: true
        }));

        // Request logging
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
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: env.NODE_ENV,
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/user', userRoutes);
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/payments', paymentsRoutes);

        // CSP override for specific routes
        this.app.use('/admin.html', cspOverride);
        this.app.use('/user.html', cspOverride);

        // Serve HTML files
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });

        this.app.get('/register', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/register.html'));
        });

        this.app.get('/user', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/user.html'));
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/admin.html'));
        });

        // 404 handler
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
        // Global error handler
        this.app.use(errorHandler);

        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Unhandled rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });
        });
    }

    async start() {
        try {
            // Initialize Firebase
            await initializeFirebase();
            logger.info('Firebase initialized successfully');

            // Start server
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                logger.info(`Server running on port ${this.port}`, {
                    environment: env.NODE_ENV,
                    port: this.port,
                    timestamp: new Date().toISOString()
                });
            });

            return this.server;
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new Server();
    server.start().catch((error) => {
        logger.error('Server startup failed:', error);
        process.exit(1);
    });
}

module.exports = Server;