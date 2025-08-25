import express from 'express';
import { createCheckout, handleWebhook, mockPaymentComplete } from '../controllers/paymentsController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// إنشاء checkout (يتطلب مصادقة)
router.post('/checkout', authenticateToken, createCheckout);

// Webhook للدفع (بدون مصادقة - يأتي من مزود الدفع)
router.post('/webhook', handleWebhook);

// Mock payment completion للاختبار
router.post('/mock-complete/:paymentId', mockPaymentComplete);

export default router;