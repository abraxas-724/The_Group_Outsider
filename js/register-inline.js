// 恢复主题
(function(){
    try { const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); if(saved.theme){ document.body.setAttribute('data-theme', saved.theme); } } catch {}
})();
// 复用背景动画
(function(){
    const c = document.getElementById('bg-canvas');
    if(!c) return; const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1; let w,h; function resize(){ w=window.innerWidth; h=window.innerHeight; c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'; ctx.scale(dpr,dpr);} resize(); window.addEventListener('resize', resize);
    const nodes = Array.from({length:40},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*0.4,vy:(Math.random()-.5)*0.4}));
    let currentHue = Math.random()*360;
    let targetHue = Math.random()*360;
    const hueSpeed = 0.01;
    function pickTarget(){ targetHue = Math.random()*360; }
    function lerpHue(){ let diff=(targetHue-currentHue+540)%360-180; currentHue+=diff*hueSpeed; if(Math.abs(diff)<0.6) pickTarget(); }
    function step(){
        lerpHue();
        const nodeHue=(currentHue+30)%360;
        ctx.clearRect(0,0,w,h);
        for(const n of nodes){ n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>w) n.vx*=-1; if(n.y<0||n.y>h) n.vy*=-1; }
        for(let i=0;i<nodes.length;i++){ for(let j=i+1;j<nodes.length;j++){ const a=nodes[i],b=nodes[j]; const dx=a.x-b.x,dy=a.y-b.y; const dist=Math.hypot(dx,dy); if(dist<150){ const alpha=1-dist/150; ctx.strokeStyle=`hsla(${currentHue.toFixed(1)},70%,55%,${(alpha*0.34).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } } }
        for(const n of nodes){ ctx.fillStyle=`hsla(${nodeHue.toFixed(1)},70%,60%,0.85)`; ctx.beginPath(); ctx.arc(n.x,n.y,2.15,0,Math.PI*2); ctx.fill(); }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
})();

// 注册逻辑
(function(){
    const user = document.getElementById('reg-user');
    const pass = document.getElementById('reg-pass');
    const pass2 = document.getElementById('reg-pass2');
    const msg = document.getElementById('reg-msg');
    const btn = document.getElementById('btn-register');
    function setMsg(t,c){ msg.textContent=t; msg.style.color = c || 'var(--clr-text-mid)'; }
    btn.addEventListener('click',()=>{
        const u = user.value.trim(); const p = pass.value; const p2 = pass2.value;
        if(!(u&&p&&p2)){ setMsg('请完整填写', 'var(--clr-danger)'); return; }
        if(p!==p2){ setMsg('两次密码不一致', 'var(--clr-danger)'); return; }
        if(p.length < 4){ setMsg('密码至少 4 位', 'var(--clr-danger)'); return; }
        // 多账号：按用户名存储
        const key = `groupOutsider:user:${u}`;
        const existRec = localStorage.getItem(key);
        if(existRec){ setMsg('账号已存在', 'var(--clr-danger)'); return; }
        localStorage.setItem(key, JSON.stringify({ user:u, pass:p, createdAt: Date.now() }));
        // 兼容旧键（仅用于老逻辑过渡）：不覆盖已有
        const legacyUser = localStorage.getItem('registeredUser');
        if(!legacyUser){ localStorage.setItem('registeredUser', u); localStorage.setItem('registeredPwd', p); }
        // 设置当前用户
        try{ sessionStorage.setItem('groupOutsiderCurrentUser', u); }catch{}
        setMsg('注册成功，正在返回登录…', 'var(--clr-accent)');
        document.body.classList.add('page-exit');
        setTimeout(()=>{ window.location.href='index.html'; },650);
    });
})();
