import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations and middleware
import { config } from './config/env.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { cspOverride } from './middlewares/cspOverride.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for Cloud Run
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // سنطبق CSP الخاصة بنا
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' ? 
    [config.app.baseUrl] : 
    ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Apply CSP override (must be after static files)
app.use(cspOverride);

// Rate limiting for API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'الخدمة تعمل بشكل طبيعي',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/user.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/user.html'));
});

// Handle 404 for API routes
app.use('/api/*', notFound);

// Catch all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/user.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 User Portal: ${config.app.baseUrl}/user`);
  logger.info(`👨‍💼 Admin Panel: ${config.app.baseUrl}/admin`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;