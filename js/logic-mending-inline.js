// 建立与父页面通信
try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:ready', gameId:'logic_mending' }, window.location.origin); } }catch{}

const toastEl = document.getElementById('toast');
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), 1800); }

// 简易连线渲染
const wires = document.getElementById('wires');
function drawWire(fromEl, toEl, color){
  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  const svgR = wires.getBoundingClientRect();
  const x1 = fr.left + fr.width - svgR.left;
  const y1 = fr.top + fr.height/2 - svgR.top;
  const x2 = tr.left - svgR.left;
  const y2 = tr.top + tr.height/2 - svgR.top;
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  const dx = Math.max(60,(x2-x1)/2);
  path.setAttribute('d',`M ${x1},${y1} C ${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`);
  path.setAttribute('fill','none');
  path.setAttribute('stroke', color||'#6ee7ff');
  path.setAttribute('stroke-width','3');
  path.setAttribute('opacity','0.9');
  wires.appendChild(path);
  return path;
}

const nStart = document.getElementById('n-start');
const nLogic = document.getElementById('n-logic');
const nGood = document.getElementById('n-good');
const nBad = document.getElementById('n-bad');
const canvas = document.getElementById('canvas');

let wire1, wire2;
function redraw(){ wires.innerHTML=''; wire1 = drawWire(nStart, nLogic, '#6ee7ff'); wire2 = drawWire(nLogic, nBad, '#ff6b6b'); }
redraw();
window.addEventListener('resize', redraw);

// 拖拽“条件判断”节点
let dragging = false, offX=0, offY=0;
nLogic.addEventListener('mousedown', e=>{
  dragging = true; offX = e.clientX - nLogic.offsetLeft; offY = e.clientY - nLogic.offsetTop; nLogic.style.cursor='grabbing';
});
window.addEventListener('mousemove', e=>{
  if(!dragging) return; nLogic.style.left = (e.clientX - offX) + 'px'; nLogic.style.top = (e.clientY - offY) + 'px'; redraw();
});
window.addEventListener('mouseup', ()=>{ dragging=false; nLogic.style.cursor='grab'; });

// 点击修复逻辑：靠近正确分支时可修复
function dist(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return Math.hypot(dx,dy); }
function center(el){ return { x: el.offsetLeft + el.offsetWidth/2, y: el.offsetTop + el.offsetHeight/2 } }
nLogic.addEventListener('click', ()=>{
  const cL = center(nLogic), cG = center(nGood);
  const near = dist(cL.x,cL.y,cG.x,cG.y) < 120;
  if(!near){ toast('太远了，把“条件判断”拖近“正确分支”再修复。'); return; }
  // 修复：把错误连线换到正确分支，并去除错误样式
  nLogic.classList.remove('err');
  redraw();
  if(wire2) wire2.setAttribute('stroke','#6ee7ff');
  drawWire(nLogic, nGood, '#6ee7ff');
  toast('逻辑修复完成');
  setTimeout(()=>{
    try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:complete', payload:{ fixed:true } }, window.location.origin); } }catch{}
  }, 450);
});

// 键盘支持 + 退出
canvas.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') doExit();
  if(e.key === 'ArrowLeft') { nLogic.style.left = (nLogic.offsetLeft - 8) + 'px'; redraw(); }
  if(e.key === 'ArrowRight'){ nLogic.style.left = (nLogic.offsetLeft + 8) + 'px'; redraw(); }
  if(e.key === 'ArrowUp')   { nLogic.style.top  = (nLogic.offsetTop  - 8) + 'px'; redraw(); }
  if(e.key === 'ArrowDown') { nLogic.style.top  = (nLogic.offsetTop  + 8) + 'px'; redraw(); }
});
canvas.focus();

function doExit(){ try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:exit' }, window.location.origin); } }catch{} }
document.getElementById('btn-exit').addEventListener('click', doExit);

// 调试完成按钮（可隐藏）
document.getElementById('btn-complete').addEventListener('click', ()=>{
  try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:complete', payload:{ fixed:true, via:'button' } }, window.location.origin); } }catch{}
});

// 接收父页面的 init
window.addEventListener('message', (e)=>{
  if(e.origin !== window.location.origin) return;
  const data = e.data || {};
  if(data.type === 'minigame:init'){
    // 可根据难度参数等初始化
    // const params = data.payload?.params || {};
  }
});
