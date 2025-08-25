import { verifyToken } from '../utils/crypto.js';
import { getUserById } from '../services/firestoreService.js';
import logger from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مخول للوصول'
      });
    }

    const decoded = verifyToken(token);
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح'
    });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'صلاحيات المشرف مطلوبة'
      });
    }
    next();
  } catch (error) {
    logger.error('Admin authorization error:', error);
    return res.status(403).json({
      success: false,
      message: 'خطأ في التحقق من الصلاحيات'
    });
  }
};