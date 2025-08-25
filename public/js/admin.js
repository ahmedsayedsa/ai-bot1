/**
 * Admin Dashboard JavaScript
 * CSP-Safe - No inline events
 */

class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.currentPage = 'dashboard';
        
        // DOM elements
        this.adminNameSpan = document.getElementById('adminName');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.navItems = document.querySelectorAll('.nav-item');
        this.contentSections = document.querySelectorAll('.content-section');
        this.loadingDiv = document.getElementById('loading');
        this.errorDiv = document.getElementById('error');
        
        // Dashboard stats
        this.totalUsersSpan = document.getElementById('totalUsers');
        this.activeSubscriptionsSpan = document.getElementById('activeSubscriptions');
        this.totalRevenueSpan = document.getElementById('totalRevenue');
        this.pendingPaymentsSpan = document.getElementById('pendingPayments');
        
        // Tables
        this.usersTableBody = document.getElementById('usersTableBody');
        this.subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
        this.paymentsTableBody = document.getElementById('paymentsTableBody');
        
        this.init();
    }

    async init() {
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
        await this.verifyAdminAccess();
        await this.loadDashboardData();
    }

    setupEventListeners() {
        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
        
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.switchPage(page);
            });
        });
        
        // Refresh buttons
        const refreshBtns = document.querySelectorAll('.refresh-btn');
        refreshBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        });
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
                localStorage.removeItem('authToken');
                this.redirectToLogin();
                return null;
            }
            
            if (response.status === 403) {
                this.showError('ليس لديك صلاحية للوصول لهذه الصفحة');
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }

    async verifyAdminAccess() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/auth/verify');
            
            if (response && response.ok) {
                const data = await response.json();
                if (data.user.role !== 'admin') {
                    window.location.href = '/user.html';
                    return;
                }
                
                if (this.adminNameSpan) {
                    this.adminNameSpan.textContent = data.user.name;
                }
            }
        } catch (error) {
            console.error('Error verifying admin access:', error);
            this.redirectToLogin();
        }
    }

    switchPage(page) {
        // Update navigation
        this.navItems.forEach(item => {
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update content
        this.contentSections.forEach(section => {
            if (section.id === `${page}Section`) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
        
        this.currentPage = page;
        
        // Load page-specific data
        switch (page) {
            case 'users':
                this.loadUsersData();
                break;
            case 'subscriptions':
                this.loadSubscriptionsData();
                break;
            case 'payments':
                this.loadPaymentsData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            this.hideError();
            
            const response = await this.makeAuthenticatedRequest('/api/admin/dashboard');
            
            if (response && response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.stats);
            } else {
                this.showError('حدث خطأ في تحميل بيانات لوحة التحكم');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('حدث خطأ في الاتصال');
        } finally {
            this.showLoading(false);
        }
    }

    updateDashboardStats(stats) {
        if (this.totalUsersSpan) {
            this.totalUsersSpan.textContent = stats.totalUsers || 0;
        }
        if (this.activeSubscriptionsSpan) {
            this.activeSubscriptionsSpan.textContent = stats.activeSubscriptions || 0;
        }
        if (this.totalRevenueSpan) {
            this.totalRevenueSpan.textContent = `${stats.totalRevenue || 0} جنيه`;
        }
        if (this.pendingPaymentsSpan) {
            this.pendingPaymentsSpan.textContent = stats.pendingPayments || 0;
        }
    }

    async loadUsersData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/users');
            
            if (response && response.ok) {
                const data = await response.json();
                this.renderUsersTable(data.users);
            }
        } catch (error) {
            console.error('Error loading users data:', error);
        }
    }

    renderUsersTable(users) {
        if (!this.usersTableBody) return;
        
        this.usersTableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td><span class="status-${user.status}">${user.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.editUser('${user.id}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteUser('${user.id}')">حذف</button>
                </td>
            `;
            this.usersTableBody.appendChild(row);
        });
    }

    async loadSubscriptionsData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/subscriptions');
            
            if (response && response.ok) {
                const data = await response.json();
                this.renderSubscriptionsTable(data.subscriptions);
            }
        } catch (error) {
            console.error('Error loading subscriptions data:', error);
        }
    }

    renderSubscriptionsTable(subscriptions) {
        if (!this.subscriptionsTableBody) return;
        
        this.subscriptionsTableBody.innerHTML = '';
        
        subscriptions.forEach(sub => {
            const row = document.createElement('tr');
            const expiryDate = new Date(sub.expiryDate);
            const isExpired = expiryDate < new Date();
            
            row.innerHTML = `
                <td>${sub.userName}</td>
                <td>${sub.userEmail}</td>
                <td>${sub.planType}</td>
                <td><span class="status-${sub.status}">${this.getStatusText(sub.status)}</span></td>
                <td>${expiryDate.toLocaleDateString('ar-EG')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.extendSubscription('${sub.id}')">تمديد</button>
                    <button class="btn btn-sm btn-warning" onclick="adminDashboard.suspendSubscription('${sub.id}')">إيقاف</button>
                </td>
            `;
            this.subscriptionsTableBody.appendChild(row);
        });
    }

    async loadPaymentsData() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/payments');
            
            if (response && response.ok) {
                const data = await response.json();
                this.renderPaymentsTable(data.payments);
            }
        } catch (error) {
            console.error('Error loading payments data:', error);
        }
    }

    renderPaymentsTable(payments) {
        if (!this.paymentsTableBody) return;
        
        this.paymentsTableBody.innerHTML = '';
        
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.userName}</td>
                <td>${payment.amount} جنيه</td>
                <td>${payment.method}</td>
                <td><span class="status-${payment.status}">${this.getPaymentStatusText(payment.status)}</span></td>
                <td>${new Date(payment.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                    ${payment.status === 'pending' ? 
                        `<button class="btn btn-sm btn-success" onclick="adminDashboard.approvePayment('${payment.id}')">موافقة</button>
                         <button class="btn btn-sm btn-danger" onclick="adminDashboard.rejectPayment('${payment.id}')">رفض</button>` 
                        : '-'
                    }
                </td>
            `;
            this.paymentsTableBody.appendChild(row);
        });
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'نشط',
            'expired': 'منتهي',
            'suspended': 'موقوف'
        };
        return statusMap[status] || status;
    }

    getPaymentStatusText(status) {
        const statusMap = {
            'pending': 'في الانتظار',
            'completed': 'مكتمل',
            'failed': 'فشل',
            'cancelled': 'ملغي'
        };
        return statusMap[status] || status;
    }

    // Action methods (to be called from inline onclick - will be replaced with event delegation)
    async editUser(userId) {
        // Implementation for editing user
        console.log('Edit user:', userId);
    }

    async deleteUser(userId) {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            // Implementation for deleting user
            console.log('Delete user:', userId);
        }
    }

    async extendSubscription(subscriptionId) {
        // Implementation for extending subscription
        console.log('Extend subscription:', subscriptionId);
    }

    async suspendSubscription(subscriptionId) {
        // Implementation for suspending subscription
        console.log('Suspend subscription:', subscriptionId);
    }

    async approvePayment(paymentId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/admin/payments/${paymentId}/approve`, {
                method: 'POST'
            });
            
            if (response && response.ok) {
                this.loadPaymentsData(); // Refresh table
                this.loadDashboardData(); // Refresh stats
            }
        } catch (error) {
            console.error('Error approving payment:', error);
        }
    }

    async rejectPayment(paymentId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/admin/payments/${paymentId}/reject`, {
                method: 'POST'
            });
            
            if (response && response.ok) {
                this.loadPaymentsData(); // Refresh table
                this.loadDashboardData(); // Refresh stats
            }
        } catch (error) {
            console.error('Error rejecting payment:', error);
        }
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    }
}

// Global instance for inline event handlers (temporary solution)
let adminDashboard;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});