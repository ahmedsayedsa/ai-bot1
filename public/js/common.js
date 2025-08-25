/**
 * Common JavaScript utilities
 * CSP-Safe shared functions
 */

// Global utilities
window.AppUtils = {
    // Format date to Arabic
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format currency
    formatCurrency: function(amount) {
        return `${amount} جنيه مصري`;
    },

    // Show toast notification
    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    },

    // Validate Egyptian phone number
    validatePhone: function(phone) {
        const phoneRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
        return phoneRegex.test(phone);
    },

    // Validate email
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Copy to clipboard
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('تم النسخ بنجاح', 'success');
        }).catch(() => {
            this.showToast('فشل في النسخ', 'error');
        });
    }
};

// Add toast CSS if not exists
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast-info { background-color: #2196F3; }
        .toast-success { background-color: #4CAF50; }
        .toast-warning { background-color: #FF9800; }
        .toast-error { background-color: #f44336; }
    `;
    document.head.appendChild(style);
}