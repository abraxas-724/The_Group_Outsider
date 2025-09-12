// Extracted from inline <script> in soon.html
(function(){
  // 主题切换
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {}
    const icon = themeToggle.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = body.getAttribute('data-theme') || 'light';
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  // 初始化主题
  const savedTheme = (function(){
    try { return localStorage.getItem('theme'); } catch { return null; }
  })() || 'light';
  setTheme(savedTheme);

  // 添加打字机效果
  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    const originalText = subtitle.innerHTML;
    subtitle.innerHTML = '';
    let i = 0;
    function typeWriter() {
      if (i < originalText.length) {
        subtitle.innerHTML = originalText.substring(0, i + 1);
        i++;
        setTimeout(typeWriter, 100);
      }
    }
    setTimeout(typeWriter, 500);
  }

  // 鼠标跟随效果
  document.addEventListener('mousemove', (e) => {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: var(--primary-color);
      border-radius: 50%;
      pointer-events: none;
      opacity: 0.1;
      left: ${e.clientX - 10}px;
      top: ${e.clientY - 10}px;
      animation: fadeOut 1s forwards;
    `;
    document.body.appendChild(cursor);
    setTimeout(() => cursor.remove(), 1000);
  });

  // 添加CSS动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut { to { opacity: 0; transform: scale(0); } }
  `;
  document.head.appendChild(style);
})();
