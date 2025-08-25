import Joi from 'joi';

// مخططات التحقق
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      'any.required': 'كلمة المرور مطلوبة'
    }),
    phone: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).required().messages({
      'string.pattern.base': 'رقم الهاتف غير صحيح',
      'any.required': 'رقم الهاتف مطلوب'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب'
    }),
    password: Joi.string().required().messages({
      'any.required': 'كلمة المرور مطلوبة'
    })
  }),

  subscribe: Joi.object({
    planId: Joi.string().required().messages({
      'any.required': 'معرف الخطة مطلوب'
    })
  }),

  createPlan: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'اسم الخطة مطلوب'
    }),
    price: Joi.number().positive().required().messages({
      'number.positive': 'السعر يجب أن يكون رقماً موجباً',
      'any.required': 'السعر مطلوب'
    }),
    currency: Joi.string().length(3).default('USD'),
    periodDays: Joi.number().integer().positive().required().messages({
      'number.positive': 'مدة الخطة يجب أن تكون رقماً موجباً',
      'any.required': 'مدة الخطة مطلوبة'
    }),
    features: Joi.array().items(Joi.string()).default([])
  }),

  updateUserStatus: Joi.object({
    status: Joi.string().valid('active', 'expired', 'trial').required().messages({
      'any.only': 'الحالة يجب أن تكون: active, expired, أو trial',
      'any.required': 'الحالة مطلوبة'
    })
  })
};

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    req.validatedBody = value;
    next();
  };
};