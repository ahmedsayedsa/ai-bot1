/**
 * User Dashboard JavaScript
 * CSP-Safe - No inline events
 */

class UserDashboard {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = null;
        this.subscription = null;
        
        // DOM elements
        this.userNameSpan = document.getElementById('userName');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.subscriptionStatus = document.getElementById('subscriptionStatus');
        this.subscriptionExpiry = document.getElementById('subscriptionExpiry');
        this.subscribeBtn = document.getElementById('subscribeBtn');
        this.renewBtn = document.getElementById('renewBtn');
        this.loadingDiv = document.getElementById('loading');
        this.errorDiv = document.getElementById('error');
        
        this.init();
    }

    async init() {
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
        await this.loadUserData();
        await this.loadSubscriptionData();
    }

    setupEventListeners() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
        
        if (this.subscribeBtn) {
            this.subscribeBtn.addEventListener('click', this.handleSubscribe.bind(this));
        }
        
        if (this.renewBtn) {
            this.renewBtn.addEventListener('click', this.handleRenew.bind(this));
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
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
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('authToken');
                this.redirectToLogin();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }

    async loadUserData() {
        try {
            this.showLoading(true);
            
            const response = await this.makeAuthenticatedRequest('/api/user/profile');
            
            if (response && response.ok) {
                const data = await response.json();
                this.user = data.user;
                
                if (this.userNameSpan) {
                    this.userNameSpan.textContent = this.user.name;
                }
            } else {
                this.showError('حدث خطأ في تحميل بيانات المستخدم');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('حدث خطأ في الاتصال');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSubscriptionData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/user/subscription');
            
            if (response && response.ok) {
                const data = await response.json();
                this.subscription = data.subscription;
                this.updateSubscriptionUI();
            } else {
                // No subscription found
                this.updateSubscriptionUI();
            }
        } catch (error) {
            console.error('Error loading subscription data:', error);
            this.showError('حدث خطأ في تحميل بيانات الاشتراك');
        }
    }

    updateSubscriptionUI() {
        if (!this.subscription) {
            // No subscription
            if (this.subscriptionStatus) {
                this.subscriptionStatus.textContent = 'غير مشترك';
                this.subscriptionStatus.className = 'status-inactive';
            }
            if (this.subscriptionExpiry) {
                this.subscriptionExpiry.textContent = '-';
            }
            if (this.subscribeBtn) {
                this.subscribeBtn.style.display = 'inline-block';
            }
            if (this.renewBtn) {
                this.renewBtn.style.display = 'none';
            }
        } else {
            // Has subscription
            const isActive = this.subscription.status === 'active';
            const expiryDate = new Date(this.subscription.expiryDate);
            const now = new Date();
            const isExpired = expiryDate < now;
            
            if (this.subscriptionStatus) {
                if (isActive && !isExpired) {
                    this.subscriptionStatus.textContent = 'نشط';
                    this.subscriptionStatus.className = 'status-active';
                } else {
                    this.subscriptionStatus.textContent = 'منتهي الصلاحية';
                    this.subscriptionStatus.className = 'status-expired';
                }
            }
            
            if (this.subscriptionExpiry) {
                this.subscriptionExpiry.textContent = expiryDate.toLocaleDateString('ar-EG');
            }
            
            if (this.subscribeBtn) {
                this.subscribeBtn.style.display = 'none';
            }
            if (this.renewBtn) {
                this.renewBtn.style.display = 'inline-block';
            }
        }
    }

    async handleSubscribe() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/payments/create-subscription', {
                method: 'POST',
                body: JSON.stringify({
                    planType: 'monthly' // Default plan
                })
            });
            
            if (response && response.ok) {
                const data = await response.json();
                // Redirect to payment page or show payment modal
                if (data.paymentUrl) {
                    window.location.href = data.paymentUrl;
                } else {
                    this.showError('حدث خطأ في إنشاء رابط الدفع');
                }
            } else {
                const errorData = await response.json();
                this.showError(errorData.message || 'حدث خطأ في إنشاء الاشتراك');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            this.showError('حدث خطأ في الاتصال');
        }
    }

    async handleRenew() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/payments/renew-subscription', {
                method: 'POST'
            });
            
            if (response && response.ok) {
                const data = await response.json();
                if (data.paymentUrl) {
                    window.location.href = data.paymentUrl;
                } else {
                    this.showError('حدث خطأ في إنشاء رابط الدفع');
                }
            } else {
                const errorData = await response.json();
                this.showError(errorData.message || 'حدث خطأ في تجديد الاشتراك');
            }
        } catch (error) {
            console.error('Renew error:', error);
            this.showError('حدث خطأ في الاتصال');
        }
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UserDashboard();
});