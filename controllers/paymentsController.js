import { 
  createPayment, 
  updatePayment, 
  getUserSubscription,
  updateSubscription,
  updateUser,
  getPlanById
} from '../services/firestoreService.js';
import { activateSubscription } from '../services/subscriptionService.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

export const createCheckout = async (req, res) => {
  try {
    const { planId, subscriptionId } = req.body;
    
    // التحقق من وجود الخطة
    const plan = await getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الخطة غير موجودة'
      });
    }

    // إنشاء سجل الدفع
    const payment = await createPayment({
      userId: req.user.id,
      subscriptionId,
      planId,
      provider: config.payment.provider,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      meta: {
        planName: plan.name,
        userEmail: req.user.email
      }
    });

    // في التطبيق الحقيقي، هنا سيتم إنشاء checkout session مع مزود الدفع
    const checkoutData = {
      paymentId: payment.id,
      amount: plan.price,
      currency: plan.currency,
      description: `اشتراك ${plan.name}`,
      // Mock checkout URL - في التطبيق الحقيقي سيكون من Stripe/Paymob
      checkoutUrl: `${config.app.baseUrl}/mock-payment?payment=${payment.id}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 دقيقة
    };

    res.json({
      success: true,
      message: 'تم إنشاء عملية الدفع بنجاح',
      checkout: checkoutData
    });
  } catch (error) {
    logger.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء عملية الدفع'
    });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    // في التطبيق الحقيقي، هنا سيتم التحقق من توقيع الـ webhook
    const { paymentId, status, transactionId, metadata } = req.body;
    
    logger.info('Payment webhook received:', { paymentId, status });

    // تحديث حالة الدفع
    await updatePayment(paymentId, {
      status,
      transactionId,
      processedAt: new Date(),
      webhookData: req.body
    });

    // إذا تم الدفع بنجاح، تفعيل الاشتراك
    if (status === 'completed' || status === 'success') {
      // جلب بيانات الدفع
      const payment = await getPaymentById(paymentId);
      if (payment && payment.subscriptionId) {
        // تفعيل الاشتراك
        await activateSubscription(payment.subscriptionId);
        
        logger.info('Subscription activated:', { 
          subscriptionId: payment.subscriptionId,
          userId: payment.userId 
        });
      }
    }

    res.json({
      success: true,
      message: 'تم معالجة الـ webhook بنجاح'
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة الـ webhook'
    });
  }
};

// Mock payment completion for testing
export const mockPaymentComplete = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // محاكاة إكمال الدفع - للاختبار فقط
    await handleWebhook({
      body: {
        paymentId,
        status: 'completed',
        transactionId: `mock_${Date.now()}`,
        metadata: {}
      }
    }, res);
  } catch (error) {
    logger.error('Mock payment completion error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في محاكاة الدفع'
    });
  }
};

// Helper function to get payment by ID
const getPaymentById = async (paymentId) => {
  try {
    const doc = await db.collection('payments').doc(paymentId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.error('Error getting payment by ID:', error);
    throw error;
  }
};