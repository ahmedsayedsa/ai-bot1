/**
 * Registration page JavaScript
 * CSP-safe implementation
 */

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const whatsappNumberInput = document.getElementById('whatsappNumber');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    const subscribeNewsletterCheckbox = document.getElementById('subscribeNewsletter');
    const registerButton = document.getElementById('registerButton');
    const buttonText = registerButton.querySelector('.button-text');
    const buttonLoader = registerButton.querySelector('.loader');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Password strength elements
    const strengthProgress = document.getElementById('strengthProgress');
    const strengthText = document.getElementById('strengthText');

    // Form validation rules
    const validationRules = {
        firstName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            messages: {
                required: 'الاسم الأول مطلوب',
                minLength: 'الاسم يجب أن يكون حرفين على الأقل',
                maxLength: 'الاسم لا يمكن أن يزيد عن 50 حرف'
            }
        },
        lastName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            messages: {
                required: 'الاسم الأخير مطلوب',
                minLength: 'الاسم يجب أن يكون حرفين على الأقل',
                maxLength: 'الاسم لا يمكن أن يزيد عن 50 حرف'
            }
        },
        email: {
            required: true,
            type: 'email',
            messages: {
                required: 'البريد الإلكتروني مطلوب',
                email: 'يرجى إدخال بريد إلكتروني صحيح'
            }
        },
        whatsappNumber: {
            required: false,
            type: 'phone',
            messages: {
                phone: 'رقم الواتساب غير صحيح'
            }
        },
        password: {
            required: true,
            minLength: 8,
            custom: (value) => {
                const strength = Utils.getPasswordStrength(value);
                return strength.score >= 3 || 'كلمة المرور ضعيفة. يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام';
            },
            messages: {
                required: 'كلمة المرور مطلوبة',
                minLength: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
            }
        },
        confirmPassword: {
            required: true,
            custom: (value) => {
                return value === passwordInput.value || 'كلمة المرور غير متطابقة';
            },
            messages: {
                required: 'تأكيد كلمة المرور مطلوب'
            }
        },
        agreeTerms: {
            required: true,
            custom: (value) => {
                return agreeTermsCheckbox.checked || 'يجب الموافقة على الشروط والأحكام';
            },
            messages: {
                required: 'يجب الموافقة على الشروط والأحكام'
            }
        }
    };

    // Initialize form validator
    const validator = new FormValidator(registerForm, validationRules);
    
    // Override validation callbacks
    validator.onValid = handleRegister;
    validator.onInvalid = () => {
        showError('يرجى تصحيح الأخطاء المعروضة');
    };

    // Handle registration submission
    async function handleRegister() {
        const formData = validator.getFormData();
        
        try {
            showLoading(true);
            hideMessages();

            const response = await apiClient.post(CONFIG.ENDPOINTS.REGISTER, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                whatsappNumber: formData.whatsappNumber || null,
                password: formData.password,
                subscribeNewsletter: formData.subscribeNewsletter === 'on'
            });

            if (response.success) {
                showSuccess('تم إنشاء الحساب بنجاح! جاري إعادة التوجيه...');
                
                // Clear form
                validator.reset();
                
                // Redirect to login after delay
                setTimeout(() => {
                    window.location.href = '/login.html?message=' + encodeURIComponent('تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول');
                }, 2000);

            } else {
                showError(response.message || 'فشل إنشاء الحساب');
            }

        } catch (error) {
            console.error('Registration error:', error);
            showError(getErrorMessage(error));
        } finally {
            showLoading(false);
        }
    }

    // Password strength indicator
    function setupPasswordStrength() {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = Utils.getPasswordStrength(password);
            
            // Update progress bar
            strengthProgress.className = `strength-progress ${strength.class}`;
            strengthText.textContent = strength.label;
            strengthText.className = `strength-text ${strength.class}`;
        });
    }

    // Show loading state
    function showLoading(show) {
        registerButton.disabled = show;
        registerButton.classList.toggle('loading', show);
        
        if (show) {
            buttonText.style.opacity = '0';
            buttonLoader.classList.remove('hidden');
        } else {
            buttonText.style.opacity = '1';
            buttonLoader.classList.add('hidden');
        }
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        
        // Auto hide after 7 seconds
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 7000);
    }

    // Show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    // Hide all messages
    function hideMessages() {
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
    }

    // Get user-friendly error message
    function getErrorMessage(error) {
        if (error.message) {
            // Map common errors to Arabic
            const errorMap = {
                'Email already exists': 'البريد الإلكتروني مستخدم بالفعل',
                'Invalid email format': 'تنسيق البريد الإلكتروني غير صحيح',
                'Password too weak': 'كلمة المرور ضعيفة',
                'Phone number invalid': 'رقم الهاتف غير صحيح',
                'Network Error': 'خطأ في الشبكة. يرجى التحقق من الاتصال',
                'Validation failed': 'فشل التحقق من البيانات'
            };

            return errorMap[error.message] || error.message;
        }

        return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
    }

    // Enhanced form interactions
    function setupFormInteractions() {
        // Auto-focus first field
        firstNameInput.focus();

        // Handle Enter key
        const formInputs = [
            firstNameInput, lastNameInput, emailInput, 
            whatsappNumberInput, passwordInput, confirmPasswordInput
        ];

        formInputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Move to next field or submit
                    const nextInput = formInputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                    } else if (!registerButton.disabled) {
                        registerForm.dispatchEvent(new Event('submit'));
                    }
                }
            });
        });

        // Real-time email availability check
        let emailCheckTimeout;
        emailInput.addEventListener('input', () => {
            clearTimeout(emailCheckTimeout);
            
            if (Utils.isValidEmail(emailInput.value)) {
                emailCheckTimeout = setTimeout(async () => {
                    await checkEmailAvailability(emailInput.value);
                }, 1000);
            }
        });

        // WhatsApp number formatting
        whatsappNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Add country code if not present
            if (value && !value.startsWith('20') && !value.startsWith('966') && !value.startsWith('971')) {
                value = '20' + value; // Default to Egypt
            }
            
            // Format the number
            if (value) {
                e.target.value = '+' + value;
            }
        });

        // Password confirmation real-time validation
        confirmPasswordInput.addEventListener('input', () => {
            validator.validateField('confirmPassword');
        });

        // Terms and conditions link
        const termsLinks = document.querySelectorAll('a[href="/terms.html"], a[href="/privacy.html"]');
        termsLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('href');
                window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
            });
        });
    }

    // Check email availability
    async function checkEmailAvailability(email) {
        try {
            const response = await apiClient.get('/api/auth/check-email', { email });
            
            const emailError = document.getElementById('emailError');
            if (!response.available) {
                emailError.textContent = 'البريد الإلكتروني مستخدم بالفعل';
                emailError.classList.add('show');
                emailInput.classList.add('error');
            } else if (emailError.textContent === 'البريد الإلكتروني مستخدم بالفعل') {
                emailError.classList.remove('show');
                emailInput.classList.remove('error');
            }
        } catch (error) {
            // Ignore network errors for availability check
            console.warn('Email availability check failed:', error);
        }
    }

    // Handle form submission tracking
    function setupAnalytics() {
        registerForm.addEventListener('submit', () => {
            // Track registration attempt
            if (typeof gtag !== 'undefined') {
                gtag('event', 'sign_up', {
                    method: 'email'
                });
            }
        });
    }

    // Initialize page
    function init() {
        setupPasswordStrength();
        setupFormInteractions();
        setupAnalytics();
        
        // Hide loading if user navigated back
        showLoading(false);
        
        // Check if user is already logged in
        if (AppState.isLoggedIn) {
            const redirectUrl = AppState.currentUser?.role === 'admin' ? '/admin.html' : '/user.html';
            window.location.href = redirectUrl;
            return;
        }
        
        // Focus management
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !firstNameInput.value) {
                firstNameInput.focus();
            }
        });
    }

    // Start the application
    init();
});