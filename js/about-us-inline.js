// 恢复主题
(function () {
  try { const saved = JSON.parse(localStorage.getItem('groupOutsiderSettings') || '{}'); if (saved.theme) { document.body.setAttribute('data-theme', saved.theme); } } catch { }
})();
// 返回按钮逻辑：优先 history.back；若无历史则跳到 start.html 或 index.html
(() => {
  const btn = document.getElementById('back-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // 试图 start.html，不存在则 fallback index.html
        fetch('start.html', { method: 'HEAD' }).then(r => {
          location.href = r.ok ? 'start.html' : 'index.html';
        }).catch(() => location.href = 'index.html');
      }
    });
  }
})();

// 新团队卡片渲染
(function () {
  const members = [
    { name: '史雨函', role: '项目经理、美工、程序员', page: 'about us/Syhhomepage/index.html', avatar: 'assets/images/about us/1.png' },
    { name: '翟一舟', role: '技术总监、程序员', page: 'about us/zyz/geren.html', avatar: 'assets/images/about us/2.png' },
    { name: '杨舒童', role: '美工、UI设计', page: 'about us/yst/杨舒童个人主页.html', avatar: 'assets/images/about us/3.png' },
    { name: '黄昊', role: 'CIO、程序员', page: 'about us/hh/hh.html', avatar: 'assets/images/about us/4.png' },
    { name: '李子豪', role: '主程序员', page: 'about us/lzh/index.html', avatar: 'assets/images/about us/5.png' },
    { name: '王妤文', role: 'UI设计、视频剪辑', page: 'about us/wyw/wyw.html', avatar: 'assets/images/about us/6.png' }
  ];
  const fallback = 'assets/images/about us/1.png';
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  const fragment = document.createDocumentFragment();
  members.forEach((m, idx) => {
    const li = document.createElement('div');
    li.className = 'team-card';
    li.setAttribute('role', 'listitem');
    const a = document.createElement('a');
    a.href = m.page;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', `${m.name} · 打开个人主页 (新窗口)`);

    const wrap = document.createElement('div');
    wrap.className = 'avatar-wrap';
    const img = document.createElement('img');
    img.decoding = 'async';
    img.loading = idx < 3 ? 'eager' : 'lazy';
    img.src = m.avatar;
    img.alt = m.name;
    img.onerror = () => { img.onerror = null; img.src = fallback; };
    wrap.appendChild(img);

    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = m.name;

    const role = document.createElement('div');
    role.className = 'member-role';
    role.textContent = m.role;

    a.append(wrap, name, role);
    li.appendChild(a);
    fragment.appendChild(li);
  });
  grid.appendChild(fragment);
})();
