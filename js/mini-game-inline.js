// 若被嵌入到父页面，通过 postMessage 建立通信
try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:ready', gameId:'code_zen_garden' }, window.location.origin); } }catch{}

const canvas = document.getElementById('miniCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const player = {x:50,y:50,size:26,color:'#c961de',speed:4};
const target = {x:320,y:200,size:20,color:'#29cc5f'};
let collected = 0;

function rand(min,max){return Math.random()*(max-min)+min;}

function resetTarget(){
  target.x = rand(20, canvas.width-40);
  target.y = rand(20, canvas.height-40);
}

function update(){
  // 逻辑后续可扩展
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // player
  ctx.fillStyle=player.color;ctx.fillRect(player.x,player.y,player.size,player.size);
  // target
  ctx.fillStyle=target.color;ctx.fillRect(target.x,target.y,target.size,target.size);
  ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('已收集: '+collected,10,20);
}

function loop(){update();draw();requestAnimationFrame(loop);} loop();

window.addEventListener('keydown',e=>{
  switch(e.key){
    case 'ArrowUp': player.y-=player.speed; break;
    case 'ArrowDown': player.y+=player.speed; break;
    case 'ArrowLeft': player.x-=player.speed; break;
    case 'ArrowRight': player.x+=player.speed; break;
    case 'Escape':
      try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:exit' }, window.location.origin); } }catch{}
      break;
  }
  // 边界
  player.x=Math.max(0,Math.min(canvas.width-player.size,player.x));
  player.y=Math.max(0,Math.min(canvas.height-player.size,player.y));
  // 碰撞
  if(Math.abs(player.x-target.x)<player.size && Math.abs(player.y-target.y)<player.size){
    collected++;resetTarget();
    localStorage.setItem('ach_mini_collect', collected);
    status.textContent = '收集成功次数: '+collected;
  }
  if(collected>=5 && !localStorage.getItem('ach_mini_master')){
    localStorage.setItem('ach_mini_master','1');
    status.textContent += ' | 成就解锁: 小游戏新手';
    // 通知父页面小游戏完成
    try{ if(window.parent && window.parent !== window){ window.parent.postMessage({ type:'minigame:complete', payload:{ collected } }, window.location.origin); } }catch{}
  }
});
