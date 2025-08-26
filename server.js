/**
 * Main Server File
 * WhatsApp Subscription Bot - Cloud Run Ready
 * --- Converted to ES Modules (ESM) ---
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url'; // Helper for __dirname in ESM

// Import configurations and utilities
import env from './config/env.js';
import logger from './utils/logger.js';
import { initializeFirebase } from './config/firebase.js';

// Import middlewares using ESM syntax
import { apiLimiter, authLimiter } from './middlewares/rateLimit.js'; // Correctly import named exports
import errorHandler from './middlewares/errorHandler.js';
import cspOverride from './middlewares/cspOverride.js';

// Import routes using ESM syntax
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';

// Recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || env.PORT || 8080;
        this.host = '0.0.0.0';
        this.server = null;

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
        } ));

        // CORS configuration
        this.app.use(cors({
            origin: env.NODE_ENV === 'production' 
                ? [env.FRONTEND_URL] 
                : ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        } ));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Apply general rate limiting to all API requests
        this.app.use('/api/', apiLimiter);

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

        // Apply the more strict authLimiter only to auth routes
        this.app.use('/api/auth', authLimiter, authRoutes);
        
        // Other API routes
        this.app.use('/api/user', userRoutes);
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/payments', paymentsRoutes);

        // Serve HTML files with CSP override where needed
        this.app.get('/admin', cspOverride, (req, res) => {
            res.sendFile(path.join(__dirname, '../public/admin.html'));
        });

        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });

        this.app.get('/register', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/register.html'));
        });

        this.app.get('/user', cspOverride, (req, res) => {
            res.sendFile(path.join(__dirname, '../public/user.html'));
        });

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
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
            if (this.server) {
                this.server.close(() => {
                    logger.info('Process terminated');
                    process.exit(0);
                });
            }
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            if (this.server) {
                this.server.close(() => {
                    logger.info('Process terminated');
                    process.exit(0);
                });
            }
        });
    }

    async start() {
        try {
            // Initialize Firebase
            await initializeFirebase();
            logger.info('Firebase initialized successfully');

            // Start server
            this.server = this.app.listen(this.port, this.host, () => {
                logger.info(`🚀 Server running on http://${this.host}:${this.port}`, {
                    environment: env.NODE_ENV,
                    port: this.port,
                    timestamp: new Date( ).toISOString()
                });
            });

            return this.server;
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start server
const server = new Server();
server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
});

// Export the server class for potential testing
export default Server;
