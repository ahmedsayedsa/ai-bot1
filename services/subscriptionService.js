import { 
  createSubscription, 
  getUserSubscription, 
  updateSubscription,
  getPlanById,
  updateUser 
} from './firestoreService.js';
import logger from '../utils/logger.js';

export const createUserSubscription = async (userId, planId) => {
  try {
    // التحقق من وجود الخطة
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('الخطة المحددة غير موجودة');
    }

    // التحقق من وجود اشتراك نشط
    const existingSubscription = await getUserSubscription(userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('يوجد اشتراك نشط بالفعل');
    }

    // حساب تاريخ الانتهاء
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + (plan.periodDays * 24 * 60 * 60 * 1000));

    // إنشاء الاشتراك
    const subscription = await createSubscription({
      userId,
      planId,
      status: 'pending',
      startedAt: startDate,
      expiresAt: expiryDate,
      renewalMethod: 'manual'
    });

    return subscription;
  } catch (error) {
    logger.error('Error creating subscription:', error);
    throw error;
  }
};

export const activateSubscription = async (subscriptionId) => {
  try {
    await updateSubscription(subscriptionId, {
      status: 'active'
    });

    // تحديث حالة المستخدم
    const subscription = await getUserSubscription(subscriptionId);
    if (subscription) {
      await updateUser(subscription.userId, {
        status: 'active',
        currentPlanId: subscription.planId,
        planExpiresAt: subscription.expiresAt
      });
    }

    return true;
  } catch (error) {
    logger.error('Error activating subscription:', error);
    throw error;
  }
};

export const cancelSubscription = async (userId) => {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      throw new Error('لا يوجد اشتراك نشط');
    }

    await updateSubscription(subscription.id, {
      status: 'canceled'
    });

    return true;
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    throw error;
  }
};

export const getUserUsage = async (userId) => {
  try {
    // Mock usage data - يمكن تطويرها لاحقاً
    const currentMonth = new Date().getMonth();
    const messagesUsed = Math.floor(Math.random() * 500); // مؤقت
    
    const user = await getUserById(userId);
    const plan = user.currentPlanId ? await getPlanById(user.currentPlanId) : null;
    
    const messageLimit = plan ? (plan.features.find(f => f.includes('messages')) || '1000 رسالة').match(/\d+/)?.[0] || 1000 : 100;

    return {
      messagesUsed,
      messageLimit: parseInt(messageLimit),
      messagesRemaining: parseInt(messageLimit) - messagesUsed,
      currentPeriod: {
        start: new Date(new Date().getFullYear(), currentMonth, 1),
        end: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      }
    };
  } catch (error) {
    logger.error('Error getting user usage:', error);
    throw error;
  }
};