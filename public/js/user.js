async function doLogin(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  const r = await fetch('/api/user/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){ document.getElementById('loginBox').style.display='none'; document.getElementById('userUI').style.display='block'; loadMe(); loadQR(); }
  else alert('لم يتم تسجيل الدخول');
  return false;
}
async function logout(){
  await fetch('/api/user/logout',{method:'POST'});
  location.reload();
}
async function loadMe(){
  const r = await fetch('/api/me');
  if(r.status===401){ document.getElementById('loginBox').style.display='block'; document.getElementById('userUI').style.display='none'; return; }
  const j = await r.json();
  document.getElementById('webhook').textContent = j.webhook;
  if(j.user){
    status.textContent = j.user.status;
    endDate.textContent = j.user.endDate || '-';
    sent.textContent = j.user.messagesSent || 0;
    document.querySelector('#tmplForm textarea').value = j.user.messageTemplate || '';
  } else {
    status.textContent = 'لا يوجد حساب';
    endDate.textContent = '-';
    sent.textContent = '0';
  }
  bot.textContent = j.bot.connected ? 'متصل' : 'غير متصل';
  uptime.textContent = j.bot.uptimeSeconds;
}
async function loadQR(){
  const r = await fetch('/api/qr.png');
  const img = document.getElementById('qr');
  if(r.status===204){ img.style.display='none'; return; }
  const blob = await r.blob(); const url = URL.createObjectURL(blob);
  img.style.display='block'; img.src = url;
}
async function saveTemplate(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  const r = await fetch('/api/me/template',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  alert(r.ok?'تم الحفظ':'خطأ');
  return false;
}
