// 恢复主题
(function(){
  try {
    const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}');
    if(saved.theme){ document.body.setAttribute('data-theme', saved.theme); }
  } catch {}
})();
// 背景粒子/线条动画 (简化版)
(function(){
  const c = document.getElementById('bg-canvas');
  if(!c) return; const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1; let w,h; function resize(){ w=window.innerWidth; h=window.innerHeight; c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'; ctx.scale(dpr,dpr);} resize(); window.addEventListener('resize', resize);
  const nodes = Array.from({length:42},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*0.4,vy:(Math.random()-.5)*0.4}));
  // 随机渐变颜色：currentHue 向 targetHue 平滑逼近，达到后换新目标
  let currentHue = Math.random()*360;
  let targetHue = Math.random()*360;
  let hueSpeed = 0.008; // 越大变化越快 (0.005~0.02)
  function pickTarget(){ targetHue = Math.random()*360; }
  function lerpHue(){
    // 最短角度方向
    let diff = (targetHue - currentHue + 540) % 360 - 180; // 归一到[-180,180]
    currentHue += diff * hueSpeed * 60/60; // 基于帧率（假设60fps）
    if(Math.abs(diff) < 0.5) pickTarget();
  }
  function step(){
    lerpHue();
    const nodeHue = (currentHue + 32) % 360;
    ctx.clearRect(0,0,w,h); ctx.lineWidth=1;
    for(let i=0;i<nodes.length;i++){ const n=nodes[i]; n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>w) n.vx*=-1; if(n.y<0||n.y>h) n.vy*=-1; }
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j]; const dx=a.x-b.x,dy=a.y-b.y; const dist=Math.hypot(dx,dy);
        if(dist<150){ const alpha=1-dist/150; ctx.strokeStyle=`hsla(${currentHue.toFixed(1)},70%,55%,${(alpha*0.32).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      }
    }
    for(const n of nodes){ ctx.fillStyle=`hsla(${nodeHue.toFixed(1)},70%,60%,0.85)`; ctx.beginPath(); ctx.arc(n.x,n.y,2.2,0,Math.PI*2); ctx.fill(); }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

// 登录逻辑
(function(){
  const userInput = document.getElementById('login-user');
  const passInput = document.getElementById('login-pass');
  const msg = document.getElementById('login-msg');
  const loginBtn = document.getElementById('btn-login');
  function getUserRecord(u){
    try { return JSON.parse(localStorage.getItem(`groupOutsider:user:${u}`)||'null'); } catch { return null; }
  }
  function setCurrentUser(u){ try { sessionStorage.setItem('groupOutsiderCurrentUser', u); } catch{} }
  loginBtn.addEventListener('click', ()=>{
    const u = userInput.value.trim(); const p = passInput.value;
    if(!u || !p){ msg.textContent='请填写账号与密码'; msg.style.color='var(--clr-danger)'; return; }
    // 先查新结构
    const rec = getUserRecord(u);
    // 兼容旧结构（仅一个账号）
    const legacyUser = localStorage.getItem('registeredUser');
    const legacyPwd = localStorage.getItem('registeredPwd');
    const ok = rec ? (rec.pass === p) : (legacyUser && u===legacyUser && p===legacyPwd);
    if(ok){
      setCurrentUser(u);
      msg.textContent='登录成功，正在进入...'; msg.style.color='var(--clr-accent)';
      document.body.classList.add('page-exit');
      setTimeout(()=>{ window.location.href='start.html'; },600);
    } else {
      msg.textContent='账号或密码错误'; msg.style.color='var(--clr-danger)';
    }
  });
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click', e=>{ const target=btn.getAttribute('data-jump'); document.body.classList.add('page-exit'); setTimeout(()=>{ window.location.href=target; },600); }));
})();
