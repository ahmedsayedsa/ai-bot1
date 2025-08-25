import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';

// Users Collection
export const createUser = async (userData) => {
  try {
    const userRef = db.collection('users').doc();
    const user = {
      id: userRef.id,
      ...userData,
      status: 'trial',
      currentPlanId: null,
      planExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await userRef.set(user);
    return user;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    return snapshot.empty ? null : snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error getting user by email:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    await db.collection('users').doc(userId).update({
      ...updateData,
      updatedAt: new Date()
    });
    return await getUserById(userId);
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
};

export const updateUserLastLogin = async (userId) => {
  try {
    await db.collection('users').doc(userId).update({
      lastLoginAt: new Date()
    });
  } catch (error) {
    logger.error('Error updating last login:', error);
  }
};

// Admins Collection
export const getAdminByEmail = async (email) => {
  try {
    const snapshot = await db.collection('admins')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    return snapshot.empty ? null : snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error getting admin by email:', error);
    throw error;
  }
};

export const updateAdminLastLogin = async (adminId) => {
  try {
    await db.collection('admins').doc(adminId).update({
      lastLoginAt: new Date()
    });
  } catch (error) {
    logger.error('Error updating admin last login:', error);
  }
};

// Plans Collection
export const getAllPlans = async () => {
  try {
    const snapshot = await db.collection('plans').orderBy('price', 'asc').get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    logger.error('Error getting plans:', error);
    throw error;
  }
};

export const getPlanById = async (planId) => {
  try {
    const doc = await db.collection('plans').doc(planId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.error('Error getting plan by ID:', error);
    throw error;
  }
};

export const createPlan = async (planData) => {
  try {
    const planRef = db.collection('plans').doc();
    const plan = {
      id: planRef.id,
      ...planData,
      createdAt: new Date()
    };
    
    await planRef.set(plan);
    return plan;
  } catch (error) {
    logger.error('Error creating plan:', error);
    throw error;
  }
};

export const updatePlan = async (planId, updateData) => {
  try {
    await db.collection('plans').doc(planId).update({
      ...updateData,
      updatedAt: new Date()
    });
    return await getPlanById(planId);
  } catch (error) {
    logger.error('Error updating plan:', error);
    throw error;
  }
};

export const deletePlan = async (planId) => {
  try {
    await db.collection('plans').doc(planId).delete();
    return true;
  } catch (error) {
    logger.error('Error deleting plan:', error);
    throw error;
  }
};

// Subscriptions Collection
export const createSubscription = async (subscriptionData) => {
  try {
    const subRef = db.collection('subscriptions').doc();
    const subscription = {
      id: subRef.id,
      ...subscriptionData,
      createdAt: new Date()
    };
    
    await subRef.set(subscription);
    return subscription;
  } catch (error) {
    logger.error('Error creating subscription:', error);
    throw error;
  }
};

export const getUserSubscription = async (userId) => {
  try {
    const snapshot = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', 'in', ['active', 'pending'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    return snapshot.empty ? null : snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error getting user subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (subscriptionId, updateData) => {
  try {
    await db.collection('subscriptions').doc(subscriptionId).update({
      ...updateData,
      updatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    throw error;
  }
};

// Payments Collection
export const createPayment = async (paymentData) => {
  try {
    const paymentRef = db.collection('payments').doc();
    const payment = {
      id: paymentRef.id,
      ...paymentData,
      createdAt: new Date()
    };
    
    await paymentRef.set(payment);
    return payment;
  } catch (error) {
    logger.error('Error creating payment:', error);
    throw error;
  }
};

export const updatePayment = async (paymentId, updateData) => {
  try {
    await db.collection('payments').doc(paymentId).update({
      ...updateData,
      updatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error updating payment:', error);
    throw error;
  }
};

// WhatsApp Sessions Collection
export const getWhatsAppSession = async (userId) => {
  try {
    const doc = await db.collection('whatsappSessions').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.error('Error getting WhatsApp session:', error);
    throw error;
  }
};

export const updateWhatsAppSession = async (userId, sessionData) => {
  try {
    await db.collection('whatsappSessions').doc(userId).set({
      id: userId,
      userId,
      ...sessionData,
      lastSyncAt: new Date()
    }, { merge: true });
  } catch (error) {
    logger.error('Error updating WhatsApp session:', error);
    throw error;
  }
};

// Admin Statistics
export const getAdminStats = async () => {
  try {
    const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('subscriptions').get(),
      db.collection('payments').where('status', '==', 'completed').get()
    ]);

    const totalRevenue = paymentsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    return {
      totalUsers: usersSnapshot.size,
      activeSubscriptions: subscriptionsSnapshot.docs.filter(doc => 
        doc.data().status === 'active'
      ).length,
      totalRevenue,
      totalPayments: paymentsSnapshot.size
    };
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    throw error;
  }
};

export const getAllUsers = async (limit = 50, offset = 0) => {
  try {
    const snapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
};