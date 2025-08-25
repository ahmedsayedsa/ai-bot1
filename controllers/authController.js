import { registerUser, loginUser, loginAdmin } from '../services/authService.js';
import { getUserById } from '../services/firestoreService.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  try {
    const { email, password, phone } = req.validatedBody;
    
    const result = await registerUser(email, password, phone);
    
    // تعيين JWT في Cookie
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: result.user
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    
    const result = await loginUser(email, password);
    
    // تعيين JWT في Cookie
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: result.user
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    
    const result = await loginAdmin(email, password);
    
    // تعيين JWT في Cookie
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    });

    res.json({
      success: true,
      message: 'تم تسجيل دخول المشرف بنجاح',
      admin: result.admin
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('authToken');
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الخروج'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role: user.role,
        currentPlanId: user.currentPlanId,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات'
    });
  }
};