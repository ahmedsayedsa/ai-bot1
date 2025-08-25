let isLoggedIn = false;

// تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLoggedIn = true;
            document.getElementById('loginSection').classList.add('d-none');
            showSection('users');
            loadUsers();
            loadStats();
        } else {
            alert('فشل تسجيل الدخول: ' + result.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('حدث خطأ أثناء تسجيل الدخول');
    }
});

// تسجيل الخروج
function logout() {
    isLoggedIn = false;
    document.getElementById('loginSection').classList.remove('d-none');
    document.querySelectorAll('#usersSection, #statsSection, #botStatusSection').forEach(section => {
        section.classList.add('d-none');
    });
}

// عرض القسم المحدد
function showSection(sectionName) {
    if (!isLoggedIn) return;
    
    document.querySelectorAll('#usersSection, #statsSection, #botStatusSection').forEach(section => {
        section.classList.add('d-none');
    });
    
    document.getElementById(sectionName + 'Section').classList.remove('d-none');
    
    if (sectionName === 'botStatus') {
        updateBotStatus();
    }
}

// تحميل المستخدمين
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            const statusBadge = user.subscription.active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-danger">منتهي</span>';
            
            const expiryDate = user.subscription.expiryDate ? 
                new Date(user.subscription.expiryDate.seconds * 1000).toLocaleDateString('ar-SA') : 
                'غير محدد';
            
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${statusBadge}</td>
                <td>${expiryDate}</td>
                <td>${user.messageCount || 0}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser('${user.phone}', '${user.name}')">تعديل</button>
                    <button class="btn btn-sm btn-info" onclick="editTemplate('${user.phone}', '${user.messageTemplate}')">قالب</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.phone}')">حذف</button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// تحميل الإحصائيات
async function loadStats() {
    try {
        // في التطبيق الحقيقي، سنقوم بجمع الإحصائيات من Firestore
        const usersResponse = await fetch('/api/users');
        const users = await usersResponse.json();
        
        document.getElementById('totalUsers').textContent = users.length;
        
        const activeUsers = users.filter(user => user.subscription.active).length;
        document.getElementById('activeUsers').textContent = activeUsers;
        
        const totalMessages = users.reduce((sum, user) => sum + (user.messageCount || 0), 0);
        document.getElementById('totalMessages').textContent = totalMessages;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// تحديث حالة البوت
async function updateBotStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        const statusElement = document.getElementById('connectionStatus');
        statusElement.innerHTML = status.connected ? 
            '<span class="badge bg-success">البوت متصل</span>' : 
            '<span class="badge bg-danger">البوت غير متصل</span>';
        
        if (!status.connected) {
            const qrResponse = await fetch('/api/qr');
            if (qrResponse.ok) {
                const qrBlob = await qrResponse.blob();
                const qrUrl = URL.createObjectURL(qrBlob);
                
                document.getElementById('adminQrCode').innerHTML = `
                    <p>امسح QR Code للاتصال:</p>
                    <img src="${qrUrl}" width="200" height="200">
                `;
            }
        } else {
            document.getElementById('adminQrCode').innerHTML = '';
        }
    } catch (error) {
        console.error('Error updating bot status:', error);
    }
}

// إضافة/تعديل مستخدم
function editUser(phone, name) {
    document.getElementById('editUserId').value = phone;
    document.getElementById('userName').value = name || '';
    document.getElementById('userPhone').value = phone || '';
    document.getElementById('userPhone').readOnly = !!phone;
    
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

// حفظ المستخدم
async function saveUser() {
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const subscriptionDays = document.getElementById('subscriptionDays').value;
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, subscriptionDays })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم حفظ المستخدم بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
            loadStats();
        } else {
            alert('فشل حفظ المستخدم: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('حدث خطأ أثناء حفظ المستخدم');
    }
}

// تعديل القالب
function editTemplate(phone, template) {
    document.getElementById('templatePhone').value = phone;
    document.getElementById('messageTemplate').value = template || 'مرحباً {name}، شكراً لاستخدامك خدماتنا. طلبك: {order}';
    
    const modal = new bootstrap.Modal(document.getElementById('templateModal'));
    modal.show();
}

// حفظ القالب
async function saveTemplate() {
    const phone = document.getElementById('templatePhone').value;
    const template = document.getElementById('messageTemplate').value;
    
    try {
        const response = await fetch('/api/template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, template })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم حفظ القالب بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('templateModal')).hide();
            loadUsers();
        } else {
            alert('فشل حفظ القالب: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving template:', error);
        alert('حدث خطأ أثناء حفظ القالب');
    }
}

// حذف المستخدم
async function deleteUser(phone) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
        // في التطبيق الحقيقي، سنقوم بتنفيذ عملية الحذف من Firestore
        alert('سيتم تنفيذ عملية الحذف في التطبيق الكامل');
        loadUsers();
        loadStats();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('حدث خطأ أثناء حذف المستخدم');
    }
}