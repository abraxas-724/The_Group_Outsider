// 恢复主题
(function(){
  try { const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); if(saved.theme){ document.body.setAttribute('data-theme', saved.theme); } } catch {}
})();
// 返回按钮逻辑：优先 history.back；若无历史则跳到 start.html 或 index.html
(()=>{
  const btn=document.getElementById('back-btn');
  if(btn){
    btn.addEventListener('click',()=>{
      if(window.history.length>1){
        window.history.back();
      }else{
        // 试图 start.html，不存在则 fallback index.html
        fetch('start.html',{method:'HEAD'}).then(r=>{
          location.href = r.ok ? 'start.html' : 'index.html';
        }).catch(()=>location.href='index.html');
      }
    });
  }
})();

// 轮播与成员网格构建
(function(){
  const itemCount = 6;
  const container = document.querySelector('.container');
  if(!container) return;
  const carousel = document.createElement('div');
  carousel.classList.add('carousel');
  carousel.style.setProperty('--items', itemCount);

  const bgTexts = ['史雨函', '翟一舟', '杨舒童', '黄昊', '李子豪', '王昱文'];

  for (let i = 0; i < itemCount; i++) {
    const item = document.createElement('div');
    item.classList.add('carousel-item');
    const hue = (i * 55) % 360; // 均匀分布色相
    item.style.setProperty('--hue', hue);

    const txt = document.createElement('p');
    txt.classList.add('bg-text');
    txt.textContent = bgTexts[i];

    const box = document.createElement('div');
    box.classList.add('carousel-box');

    const img = document.createElement('img');
    img.src = `./assets/images/about us/${i + 1}.png`;

    box.appendChild(img);
    item.append(txt, box);
    carousel.appendChild(item);
  }

  container.appendChild(carousel);

  const members = [
    {name:'史雨函', page:'about us/Syhhomepage/index.html', avatar:'assets/images/about us/1.png'},
    {name:'翟一舟', page:'about us/zyz/geren.html',            avatar:'assets/images/about us/2.png'},
    {name:'杨舒童', page:'about us/yst/杨舒童个人主页.html',      avatar:'assets/images/about us/3.png'},
    {name:'黄昊',  page:'about us/hh/hh.html',                 avatar:'assets/images/about us/4.png'},
    {name:'李子豪', page:'about us/lzh/index.html',             avatar:'assets/images/about us/5.png'},
    {name:'王昱文', page:'about us/wyw/wyw.html',               avatar:'assets/images/about us/6.png'},
  ];
  const fallback = 'assets/images/about us/1.png';
  const grid = document.getElementById('team-grid');
  if(grid){
    members.forEach(m=>{
      const a=document.createElement('a');
      a.href=m.page; a.target='_blank'; a.style.cssText='display:block;text-decoration:none;color:#eee;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);padding:12px;border-radius:18px;overflow:hidden;backdrop-filter:blur(6px);transition:.4s;';
      a.innerHTML=`<div style="position:relative;width:100%;aspect-ratio:1/1;border-radius:14px;overflow:hidden;margin-bottom:10px;">
          <img src="${m.avatar}" alt="${m.name}" onerror="this.onerror=null;this.src='${fallback}'" style="width:100%;height:100%;object-fit:cover;">
          </div><div style='text-align:center;font-weight:600;letter-spacing:1px;'>${m.name}</div>`;
      a.addEventListener('mouseenter',()=>a.style.transform='translateY(-6px)');
      a.addEventListener('mouseleave',()=>a.style.transform='translateY(0)');
      grid.appendChild(a);
    });
  }

  // 提示自动淡出（5秒）
  setTimeout(()=>{
    const hint=document.getElementById('drag-hint');
    hint && (hint.style.opacity='0', hint.style.transform='translate(-50%, -8px)');
  },5000);
})();
