// Extracted from start.html inline scripts
// Restore theme and run background canvas animation

(function restoreTheme(){
  try { const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); if(saved.theme){ document.body.setAttribute('data-theme', saved.theme); } } catch {}
})();

(function bgAnim(){
  const c = document.getElementById('bg-canvas');
  if(!c) return; const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1; let w,h;
  function resize(){ w=window.innerWidth; h=window.innerHeight; c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'; ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);} resize(); window.addEventListener('resize', resize);
  const nodes = Array.from({length:50},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*0.35,vy:(Math.random()-.5)*0.35}));
  let currentHue = Math.random()*360;
  let targetHue = Math.random()*360;
  const hueSpeed = 0.008;
  function pickTarget(){ targetHue = Math.random()*360; }
  function lerpHue(){ let diff = (targetHue - currentHue + 540)%360 -180; currentHue += diff * hueSpeed; if(Math.abs(diff)<0.5) pickTarget(); }
  function step(){
    lerpHue();
    const nodeHue = (currentHue + 36)%360;
    ctx.clearRect(0,0,w,h); ctx.lineWidth=1;
    for(let i=0;i<nodes.length;i++){ const n=nodes[i]; n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>w) n.vx*=-1; if(n.y<0||n.y>h) n.vy*=-1; }
    for(let i=0;i<nodes.length;i++){ for(let j=i+1;j<nodes.length;j++){ const a=nodes[i],b=nodes[j]; const dx=a.x-b.x,dy=a.y-b.y; const dist=Math.hypot(dx,dy); if(dist<160){ const alpha=1-dist/160; ctx.strokeStyle=`hsla(${currentHue.toFixed(1)},70%,55%,${(alpha*0.32).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } } }
    for(const n of nodes){ ctx.fillStyle=`hsla(${nodeHue.toFixed(1)},70%,60%,0.85)`; ctx.beginPath(); ctx.arc(n.x,n.y,2.2,0,Math.PI*2); ctx.fill(); }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
