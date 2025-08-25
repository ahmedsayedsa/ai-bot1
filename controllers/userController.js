import { 
  getUserById, 
  getUserSubscription, 
  getPlanById,
  getAllPlans 
} from '../services/firestoreService.js';
import { 
  createUserSubscription, 
  cancelSubscription, 
  getUserUsage 
} from '../services/subscriptionService.js';
import { generateQRCode, getDeviceStatus, linkDevice } from '../services/whatsappService.js';
import logger from '../utils/logger.js';

export const getProfile = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // جلب تفاصيل الخطة الحالية
    let currentPlan = null;
    if (user.currentPlanId) {
      currentPlan = await getPlanById(user.currentPlanId);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        currentPlan,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات'
    });
  }
};

export const getSubscription = async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.user.id);
    
    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'لا يوجد اشتراك نشط'
      });
    }

    // جلب تفاصيل الخطة
    const plan = await getPlanById(subscription.planId);

    res.json({
      success: true,
      subscription: {
        ...subscription,
        plan
      }
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الاشتراك'
    });
  }
};

export const subscribe = async (req, res) => {
  try {
    const { planId } = req.validatedBody;
    
    const subscription = await createUserSubscription(req.user.id, planId);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاشتراك بنجاح، في انتظار الدفع',
      subscription
    });
  } catch (error) {
    logger.error('Subscribe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const cancelUserSubscription = async (req, res) => {
  try {
    await cancelSubscription(req.user.id);
    
    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك بنجاح'
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getUsage = async (req, res) => {
  try {
    const usage = await getUserUsage(req.user.id);
    
    res.json({
      success: true,
      usage
    });
  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الاستخدام'
    });
  }
};

export const getQRCode = async (req, res) => {
  try {
    const qrCodeDataURL = await generateQRCode(req.user.id);
    
    res.json({
      success: true,
      qrCode: qrCodeDataURL
    });
  } catch (error) {
    logger.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء رمز QR'
    });
  }
};

export const getWhatsAppStatus = async (req, res) => {
  try {
    const status = await getDeviceStatus(req.user.id);
    
    res.json({
      success: true,
      whatsapp: status
    });
  } catch (error) {
    logger.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة واتساب'
    });
  }
};

export const linkWhatsApp = async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    
    await linkDevice(req.user.id, deviceInfo);
    
    res.json({
      success: true,
      message: 'تم ربط الجهاز بنجاح'
    });
  } catch (error) {
    logger.error('Link WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في ربط الجهاز'
    });
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await getAllPlans();
    
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الخطط'
    });
  }
};