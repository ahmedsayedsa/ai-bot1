let currentUser = null;

// تسجيل الدخول
document.getElementById('userLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('userPhoneLogin').value;
    
    try {
        const response = await fetch('/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            document.getElementById('userLoginSection').classList.add('d-none');
            document.getElementById('userInfoSection').classList.remove('d-none');
            updateUserInfo();
            updateUserQR();
        } else {
            alert('فشل تسجيل الدخول: ' + result.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('حدث خطأ أثناء تسجيل الدخول');
    }
});

// تحديث معلومات المستخدم
function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userPhone').textContent = currentUser.phone;
    document.getElementById('userMessageCount').textContent = currentUser.messageCount || 0;
    document.getElementById('userMessageTemplate').textContent = currentUser.messageTemplate || 'مرحباً {name}، شكراً لاستخدامك خدماتنا. طلبك: {order}';
    
    // حالة الاشتراك
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const expiryDate = currentUser.subscription.expiryDate ? 
        new Date(currentUser.subscription.expiryDate.seconds * 1000) : null;
    
    const isActive = expiryDate && expiryDate > new Date();
    
    if (isActive) {
        subscriptionStatus.innerHTML = '<span class="badge bg-success">نشط</span>';
        document.getElementById('subscriptionExpiry').textContent = expiryDate.toLocaleDateString('ar-SA');
    } else {
        subscriptionStatus.innerHTML = '<span class="badge bg-danger">منتهي</span>';
        document.getElementById('subscriptionExpiry').textContent = 'غير متوفر';
    }
    
    // رابط Webhook
    document.getElementById('webhookUrl').value = `${window.location.origin}/api/webhook/easyorder?phone=${currentUser.phone}`;
}

// تحديث QR Code
async function updateUserQR() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        if (!status.connected) {
            const qrResponse = await fetch('/api/qr');
            if (qrResponse.ok) {
                const qrBlob = await qrResponse.blob();
                const qrUrl = URL.createObjectURL(qrBlob);
                
                document.getElementById('userQrCode').innerHTML = `
                    <img src="${qrUrl}" width="200" height="200">
                `;
            }
        } else {
            document.getElementById('userQrCode').innerHTML = `
                <div class="alert alert-success">البوت متصل وجاهز للاستقبال</div>
            `;
        }
    } catch (error) {
        console.error('Error updating QR code:', error);
    }
}

// نسخ رابط Webhook
function copyWebhookUrl() {
    const webhookUrl = document.getElementById('webhookUrl');
    webhookUrl.select();
    document.execCommand('copy');
    alert('تم نسخ الرابط إلى الحافظة');
}