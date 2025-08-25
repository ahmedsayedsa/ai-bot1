async function doLogin(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  const r = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){ document.getElementById('loginBox').style.display='none'; document.getElementById('adminUI').style.display='block'; loadUsers(); loadStatus(); }
  else alert('بيانات غير صحيحة');
  return false;
}
async function logout(){
  await fetch('/api/admin/logout',{method:'POST'});
  location.reload();
}
async function loadUsers(){
  const r = await fetch('/api/users');
  if(r.status===401){ document.getElementById('loginBox').style.display='block'; document.getElementById('adminUI').style.display='none'; return; }
  const j = await r.json();
  const tbody = document.querySelector('#tbl tbody');
  tbody.innerHTML='';
  j.items.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name||''}</td>
      <td>${u.phone}</td>
      <td><span class="badge ${u.status==='active'?'bg-success':'bg-secondary'}">${u.status}</span></td>
      <td>${u.endDate||''}</td>
      <td>${u.messagesSent||0}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="delUser('${u.phone}')">حذف</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
async function saveUser(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  ['durationDays'].forEach(k=>{ if(body[k]==='') delete body[k]; });
  const r = await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  alert(r.ok?'تم الحفظ':'خطأ'); if(r.ok){ e.target.reset(); loadUsers(); }
  return false;
}
async function delUser(phone){
  if(!confirm('تأكيد الحذف؟')) return;
  const r = await fetch('/api/users?phone='+encodeURIComponent(phone),{method:'DELETE'});
  if(r.ok) loadUsers(); else alert('خطأ بالحذف');
}
async function updateTemplate(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  const r = await fetch('/api/template',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  alert(r.ok?'تم الحفظ':'خطأ'); return false;
}
async function loadStatus(){
  const r = await fetch('/api/status'); const j = await r.json();
  status.textContent = j.connected ? 'متصل' : 'غير متصل';
  uptime.textContent = j.uptimeSeconds;
  total.textContent = j.globalMessagesSent;
}
document.getElementById('userForm')?.addEventListener('submit', saveUser);
