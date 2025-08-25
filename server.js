/**
 * Express server for WhatsApp Subscription Bot
 * Optimized for Google Cloud Run deployment
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import configurations and utilities
const { config } = require('./config/env');
const logger = require('./utils/logger');

// Import middlewares
const rateLimitMiddleware = require('./middlewares/rateLimit');
const authMiddleware = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const cspOverride = require('./middlewares/cspOverride');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

// Import services for initialization
const { initializeFirestore } = require('./services/firestoreService');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || config.server.port || 8080;
        this.host = process.env.HOST || '0.0.0.0'; // Important for Cloud Run
        this.server = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            logger.info('Initializing server...');

            // Initialize Firestore connection
            await initializeFirestore();
            logger.info('Firestore initialized successfully');

            // Setup Express app
            await this.setupMiddlewares();
            await this.setupRoutes();
            await this.setupErrorHandling();
            
            logger.info('Server initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize server:', error);
            throw error;
        }
    }

    async setupMiddlewares() {
        // Trust proxy for Cloud Run
        this.app.set('trust proxy', 1);

        // Security headers with CSP
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.whatsapp.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // CORS configuration
        const corsOptions = {
            origin: process.env.NODE_ENV === 'production' 
                ? [config.app.baseUrl, /\.run\.app$/] 
                : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['X-Total-Count']
        };
        this.app.use(cors(corsOptions));

        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Rate limiting
        this.app.use(rateLimitMiddleware);

        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path} - ${req.ip}`, {
                userAgent: req.get('User-Agent'),
                referer: req.get('Referer')
            });
            next();
        });

        // Static files with cache headers
        this.app.use(express.static(path.join(__dirname, '../public'), {
            maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
            etag: true,
            lastModified: true,
            setHeaders: (res, path) => {
                if (path.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                } else if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
                    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
                }
            }
        }));

        // CSP override for specific routes
        this.app.use('/admin*', cspOverride);
    }

    async setupRoutes() {
        // Health check endpoint for Cloud Run
        this.app.get('/health', (req, res) => {
            if (this.isShuttingDown) {
                return res.status(503).json({ 
                    status: 'shutting down',
                    timestamp: new Date().toISOString()
                });
            }
            
            res.status(200).json({ 
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // Readiness probe for Cloud Run
        this.app.get('/ready', async (req, res) => {
            try {
                // Check database connection
                const { testConnection } = require('./services/firestoreService');
                await testConnection();
                
                res.status(200).json({
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                    services: {
                        database: 'healthy',
                        firebase: 'connected'
                    }
                });
            } catch (error) {
                logger.error('Readiness check failed:', error);
                res.status(503).json({
                    status: 'not ready',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // API routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/user', authMiddleware.authenticate, userRoutes);
        this.app.use('/api/admin', authMiddleware.authenticate, authMiddleware.requireAdmin, adminRoutes);
        this.app.use('/api/payments', authMiddleware.authenticate, paymentsRoutes);

        // Serve HTML pages
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });

        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });

        this.app.get('/register', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/register.html'));
        });

        this.app.get('/admin', authMiddleware.authenticate, authMiddleware.requireAdmin, (req, res) => {
            res.sendFile(path.join(__dirname, '../public/admin.html'));
        });

        this.app.get('/user', authMiddleware.authenticate, (req, res) => {
            res.sendFile(path.join(__dirname, '../public/user.html'));
        });

        // Catch-all route for SPA
        this.app.get('*', (req, res) => {
            // Check if it's an API route that doesn't exist
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({
                    success: false,
                    message: 'API endpoint not found'
                });
            }
            
            // For all other routes, serve the login page
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            const error = new Error(`Route ${req.originalUrl} not found`);
            error.statusCode = 404;
            next(error);
        });

        // Global error handler
        this.app.use(errorHandler);

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            this.gracefulShutdown('uncaughtException');
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown('unhandledRejection');
        });

        // Handle termination signals
        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM signal');
            this.gracefulShutdown('SIGTERM');
        });

        process.on('SIGINT', () => {
            logger.info('Received SIGINT signal');
            this.gracefulShutdown('SIGINT');
        });
    }

    async start() {
        try {
            await this.initialize();

            this.server = this.app.listen(this.port, this.host, () => {
                logger.info(`🚀 Server running on http://${this.host}:${this.port}`);
                logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`🔒 Security headers enabled`);
                logger.info(`📱 WhatsApp Bot API ready`