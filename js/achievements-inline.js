// 恢复主题
(function(){
  try { const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); if(saved.theme){ document.body.setAttribute('data-theme', saved.theme); } } catch {}
})();

// 返回按钮逻辑（与关于我们页一致）
(function(){
  const btn=document.getElementById('back-btn');
  if(!btn) return;
  btn.addEventListener('click',()=>{
    if(window.history.length>1){
      window.history.back();
    }else{
      fetch('start.html',{method:'HEAD'}).then(r=>{
        location.href = r.ok ? 'start.html' : 'index.html';
      }).catch(()=>location.href='index.html');
    }
  });
})();

// 简单成就数据示例，可改为从 localStorage 或脚本加载
(function(){
  const achievements = [
    { id:'a1', title:'第一步', desc:'开始游戏一次', icon:'assets/images/about us/1.png', unlocked: !!localStorage.getItem('ach_first_start') },
    { id:'a2', title:'探索者', desc:'阅读10个剧情节点', icon:'assets/images/about us/2.png', unlocked: !!localStorage.getItem('ach_nodes_10') },
    { id:'a3', title:'分支选择', desc:'完成一个分支结局', icon:'assets/images/about us/3.png', unlocked: !!localStorage.getItem('ach_branch_end') },
    { id:'a4', title:'收藏家', desc:'解锁5个成就', icon:'assets/images/about us/4.png', unlocked: false },
  ];

  const carousel = document.getElementById('achievement-carousel');
  if(!carousel) return;
  achievements.forEach(a=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-content"><h3 class=\"title\">${a.title}</h3><p style='font-size:14px;color:#222;'>${a.desc}</p><p style='margin-top:8px;font-weight:700;color:${a.unlocked?'#0a7a1b':'#aa2222'}'>${a.unlocked?'已解锁':'未解锁'}</p></div>`;
    if(!a.unlocked){card.style.filter='grayscale(1) opacity(.55)';}
    carousel.appendChild(card);
  });
})();
