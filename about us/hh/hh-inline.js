// Extracted scripts from inline <script> in hh.html
(function(){
  // 平滑滚动到指定区域
  function scrollToSection(id){
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({behavior:'smooth'});
  }

  // 顶部导航滚动高亮（可扩展）
  window.addEventListener('scroll',()=>{
    const scrollY = window.scrollY;
    const header = document.querySelector('header');
    if (!header) return;
    header.style.boxShadow = scrollY > 50
      ? '0 4px 12px rgba(0,0,0,.15)'
      : '0 2px 8px rgba(0,0,0,.1)';
  });

  // 绑定按钮点击
  const btn = document.getElementById('btn-about');
  if (btn) {
    btn.addEventListener('click', ()=>{
      const target = btn.getAttribute('data-target') || 'about';
      scrollToSection(target);
    });
  }
})();
