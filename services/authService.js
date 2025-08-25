import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../utils/crypto.js';
import { 
  createUser, 
  getUserByEmail, 
  getAdminByEmail, 
  updateUserLastLogin,
  updateAdminLastLogin 
} from './firestoreService.js';
import logger from '../utils/logger.js';

export const registerUser = async (email, password, phone) => {
  try {
    // التحقق من وجود المستخدم
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }

    // تشفير كلمة المرور
    const passwordHash = await hashPassword(password);

    // إنشاء المستخدم
    const user = await createUser({
      email,
      passwordHash,
      phone,
      role: 'user'
    });

    // إنشاء الرمز المميز
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      role: user.role 
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role: user.role
      },
      token,
      refreshToken
    };
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    // البحث عن المستخدم
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // التحقق من كلمة المرور
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // تحديث آخر تسجيل دخول
    await updateUserLastLogin(user.id);

    // إنشاء الرمز المميز
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      role: user.role 
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role: user.role,
        currentPlanId: user.currentPlanId,
        planExpiresAt: user.planExpiresAt
      },
      token,
      refreshToken
    };
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

export const loginAdmin = async (email, password) => {
  try {
    // البحث عن المشرف
    const admin = await getAdminByEmail(email);
    if (!admin) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // التحقق من كلمة المرور
    const isValidPassword = await comparePassword(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // تحديث آخر تسجيل دخول
    await updateAdminLastLogin(admin.id);

    // إنشاء الرمز المميز
    const token = generateToken({ 
      userId: admin.id, 
      email: admin.email,
      role: admin.role 
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      token
    };
  } catch (error) {
    logger.error('Admin login error:', error);
    throw error;
  }
};