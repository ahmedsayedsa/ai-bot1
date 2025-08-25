document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("loginBtn");
    const refreshQRBtn = document.getElementById("refreshQR");
    const loginSection = document.getElementById("login-section");
    const qrSection = document.getElementById("qr-section");
    const qrImage = document.getElementById("qrImage");

    // تسجيل الدخول
    loginBtn.addEventListener("click", async function () {
        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value.trim();

        if (!email || !password) {
            alert("من فضلك أدخل البريد وكلمة المرور");
            return;
        }

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) throw new Error("فشل تسجيل الدخول");

            const data = await res.json();
            console.log("تم تسجيل الدخول:", data);

            loginSection.classList.add("d-none");
            qrSection.classList.remove("d-none");

            loadQR();
        } catch (err) {
            alert("خطأ في تسجيل الدخول");
            console.error(err);
        }
    });

    // تحديث كود الـ QR
    refreshQRBtn.addEventListener("click", loadQR);

    async function loadQR() {
        try {
            const res = await fetch("/api/admin/qr");
            if (!res.ok) throw new Error("فشل تحميل الكود");

            const blob = await res.blob();
            qrImage.src = URL.createObjectURL(blob);
        } catch (err) {
            alert("خطأ في تحميل الكود");
            console.error(err);
        }
    }
});
