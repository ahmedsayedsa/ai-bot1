/**
 * Register Page JavaScript
 * CSP-Safe - No inline events
 */

class RegisterManager {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.phoneInput = document.getElementById('phone');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorDiv = document.getElementById('error');
        this.successDiv = document.getElementById('success');
        this.loadingDiv = document.getElementById('loading');
        
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        // Real-time validation
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('blur', this.validatePasswordMatch.bind(this));
        }
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
        }
        if (this.successDiv) {
            this.successDiv.style.display = 'none';
        }
    }

    showSuccess(message) {
        if (this.successDiv) {
            this.successDiv.textContent = message;
            this.successDiv.style.display = 'block';
        }
        if (this.errorDiv) {
            this.errorDiv.style.display = 'none';
        }
    }

    hideMessages() {
        if (this.errorDiv) this.errorDiv.style.display = 'none';
        if (this.successDiv) this.successDiv.style.display = 'none';
    }

    showLoading(show = true) {
        if (this.loadingDiv) {
            this.loadingDiv.style.display = show ? 'block' : 'none';
        }
        if (this.submitBtn) {
            this.submitBtn.disabled = show;
            this.submitBtn.textContent = show ? 'جاري إنشاء الحساب...' : 'إنشاء حساب';
        }
    }

    validatePasswordMatch() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showError('كلمات المرور غير متطابقة');
            return false;
        }
        return true;
    }

    validateForm() {
        const name = this.nameInput.value.trim();
        const email = this.emailInput.value.trim();
        const phone = this.phoneInput.value.trim();
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (!name || !email || !phone || !password || !confirmPassword) {
            this.showError('يرجى ملء جميع الحقول');
            return false;
        }

        if (password.length < 6) {
            this.showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return false;
        }

        if (!this.validatePasswordMatch()) {
            return false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('صيغة البريد الإلكتروني غير صحيحة');
            return false;
        }

        // Validate phone format (Egyptian format)
        const phoneRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            this.showError('صيغة رقم الهاتف غير صحيحة');
            return false;
        }

        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.hideMessages();
        this.showLoading(true);

        const formData = {
            name: this.nameInput.value.trim(),
            email: this.emailInput.value.trim(),
            phone: this.phoneInput.value.trim(),
            password: this.passwordInput.value
        };

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('تم إنشاء الحساب بنجاح! سيتم توجيهك لصفحة تسجيل الدخول...');
                
                // Reset form
                this.form.reset();
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showError(data.message || 'حدث خطأ في إنشاء الحساب');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى');
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});