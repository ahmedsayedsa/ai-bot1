/**
 * Login Page JavaScript
 * CSP-Safe - No inline events
 */

class LoginManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorDiv = document.getElementById('error');
        this.loadingDiv = document.getElementById('loading');
        
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        // Check if already logged in
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Redirect based on role
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/user.html';
                    }
                }
            } catch (error) {
                // Token invalid, continue with login
                localStorage.removeItem('authToken');
            }
        }
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
        }
    }

    hideError() {
        if (this.errorDiv) {
            this.errorDiv.style.display = 'none';
        }
    }

    showLoading(show = true) {
        if (this.loadingDiv) {
            this.loadingDiv.style.display = show ? 'block' : 'none';
        }
        if (this.submitBtn) {
            this.submitBtn.disabled = show;
            this.submitBtn.textContent = show ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        if (!email || !password) {
            this.showError('يرجى ملء جميع الحقول');
            return;
        }

        this.hideError();
        this.showLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                localStorage.setItem('authToken', data.token);
                
                // Redirect based on role
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/user.html';
                }
            } else {
                this.showError(data.message || 'حدث خطأ في تسجيل الدخول');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى');
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});