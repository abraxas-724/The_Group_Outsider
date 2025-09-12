// Extracted from settings.html
(function(){
  // 背景动画复用
  (function(){
    const c = document.getElementById('bg-canvas'); if(!c) return; const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio||1; let w,h; function resize(){w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px'; ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);} resize(); addEventListener('resize',resize);
    const nodes = Array.from({length:48},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.38,vy:(Math.random()-.5)*.38}));
    function step(){ctx.clearRect(0,0,w,h); for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;} for(let i=0;i<nodes.length;i++){for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];const dx=a.x-b.x,dy=a.y-b.y;const dist=Math.hypot(dx,dy); if(dist<155){const alpha=1-dist/155;ctx.strokeStyle='rgba(59,130,246,'+(alpha*.25)+')';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}} for(const n of nodes){ctx.fillStyle='rgba(201,97,222,.68)';ctx.beginPath();ctx.arc(n.x,n.y,2.1,0,Math.PI*2);ctx.fill();} requestAnimationFrame(step);} step();})();
  // 强制一次回流以确保级联动画顺序更稳定（避免某些浏览器合并帧）
  requestAnimationFrame(()=>{
    document.querySelectorAll('.cascading-enter').forEach(el=>{ el.style.willChange='transform,opacity'; });
  });

  // 主题方案
  const THEMES = {
    default: {"--clr-accent":"#3b82f6","--clr-accent-alt":"#c961de"},
    amber: {"--clr-accent":"#f59e0b","--clr-accent-alt":"#fbbf24"},
    emerald: {"--clr-accent":"#10b981","--clr-accent-alt":"#34d399"},
    crimson: {"--clr-accent":"#dc2626","--clr-accent-alt":"#f87171"}
  };

  function applyTheme(key){
    const t = THEMES[key]||THEMES.default;
    for(const k in t) document.documentElement.style.setProperty(k,t[k]);
    document.body.setAttribute('data-theme', key);
    try { const s = loadSettings(); s.theme = key; saveSettings(s); } catch {}
  }

  // 读取 / 保存设置
  const STORAGE_KEY = 'groupOutsiderSettings';
  function loadSettings(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}; } catch { return {}; } }
  function saveSettings(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  const state = loadSettings();

  // 控件引用
  const textSpeed = document.getElementById('text-speed');
  const textSpeedVal = document.getElementById('text-speed-val');
  const themeSelect = document.getElementById('theme-select');
  const skipRead = document.getElementById('skip-read');
  const autoMode = document.getElementById('auto-mode');
  const autoInterval = document.getElementById('auto-interval');
  const autoIntervalVal = document.getElementById('auto-interval-val');
  const volMaster = document.getElementById('vol-master');
  const volAmb = document.getElementById('vol-amb');

  // 初始化值
  if(textSpeed){ textSpeed.value = state.textSpeed ?? 35; textSpeedVal.textContent = textSpeed.value; }
  if(autoInterval){ autoInterval.value = state.autoInterval ?? 1800; autoIntervalVal.textContent = autoInterval.value; }
  if(volMaster) volMaster.value = state.volMaster ?? 80; if(volAmb) volAmb.value = state.volAmb ?? 60;
  if(skipRead) skipRead.checked = !!state.skipRead; if(autoMode) autoMode.checked = !!state.autoMode;
  if(themeSelect){ themeSelect.value = state.theme || 'default'; applyTheme(themeSelect.value); }

  // 监听交互
  if(textSpeed) textSpeed.addEventListener('input',()=> textSpeedVal.textContent=textSpeed.value);
  if(autoInterval) autoInterval.addEventListener('input',()=> autoIntervalVal.textContent=autoInterval.value);
  if(themeSelect) themeSelect.addEventListener('change',()=> applyTheme(themeSelect.value));

  // 保存
  const saveBtn = document.getElementById('btn-save');
  if(saveBtn) saveBtn.addEventListener('click',()=>{
    const newState = {
      textSpeed: textSpeed ? parseInt(textSpeed.value,10) : undefined,
      autoInterval: autoInterval ? parseInt(autoInterval.value,10) : undefined,
      volMaster: volMaster ? parseInt(volMaster.value,10) : undefined,
      volAmb: volAmb ? parseInt(volAmb.value,10) : undefined,
      skipRead: skipRead ? skipRead.checked : undefined,
      autoMode: autoMode ? autoMode.checked : undefined,
      theme: themeSelect ? themeSelect.value : undefined
    };
    // 清理掉 undefined 字段，避免污染存储
    Object.keys(newState).forEach(k=> newState[k]===undefined && delete newState[k]);
    saveSettings(newState);
    // 简单保存反馈
    const old = saveBtn.textContent; saveBtn.textContent='已保存'; saveBtn.disabled=true; setTimeout(()=>{ saveBtn.textContent=old; saveBtn.disabled=false; },1200);
  });

  // 返回
  const backBtn = document.getElementById('btn-back');
  if(backBtn) backBtn.addEventListener('click',()=>{ document.body.classList.add('page-exit'); setTimeout(()=>{ history.back(); },550); });

  // 清除数据
  const clearBtn = document.getElementById('btn-clear-data');
  if(clearBtn) clearBtn.addEventListener('click',()=>{
    if(!confirm('仅清除当前账号的本地数据? (存档/成就/已读标记)')) return;
    try{
      const user = sessionStorage.getItem('groupOutsiderCurrentUser') || '_guest';
      const ns = (s)=> `groupOutsider:${user}:${s}`;
      for(let i=1;i<=6;i++) localStorage.removeItem(ns('groupOutsiderSave_'+i));
      localStorage.removeItem(ns('achievements'));
      localStorage.removeItem(ns('readNodes'));
    }catch{}
    alert('已清除当前账号的数据。');
  });
})();
