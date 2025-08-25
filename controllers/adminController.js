import { 
  getAdminStats, 
  getAllUsers, 
  getUserById, 
  updateUser,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanById
} from '../services/firestoreService.js';
import { generateQRCode } from '../services/whatsappService.js';
import logger from '../utils/logger.js';

export const getStats = async (req, res) => {
  try {
    const stats = await getAdminStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات'
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const users = await getAllUsers(parseInt(limit), offset);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: users.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين'
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم'
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.validatedBody;
    
    const updatedUser = await updateUser(id, { status });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة المستخدم بنجاح',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة المستخدم'
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

export const createNewPlan = async (req, res) => {
  try {
    const planData = req.validatedBody;
    const plan = await createPlan(planData);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخطة بنجاح',
      plan
    });
  } catch (error) {
    logger.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الخطة'
    });
  }
};

export const updateExistingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.validatedBody;
    
    const updatedPlan = await updatePlan(id, updateData);
    
    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'الخطة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الخطة بنجاح',
      plan: updatedPlan
    });
  } catch (error) {
    logger.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الخطة'
    });
  }
};

export const deletePlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deletePlan(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'الخطة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الخطة بنجاح'
    });
  } catch (error) {
    logger.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الخطة'
    });
  }
};

export const getServiceQR = async (req, res) => {
  try {
    const qrCodeDataURL = await generateQRCode('admin', true);
    
    res.json({
      success: true,
      qrCode: qrCodeDataURL
    });
  } catch (error) {
    logger.error('Get service QR error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء رمز QR للخدمة'
    });
  }
};