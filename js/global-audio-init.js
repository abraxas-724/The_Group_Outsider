// global-audio-init.js
// 统一为所有普通页面（登录/注册/成就/设置独立页/外部菜单/小游戏等）注入基础 UI 点击与悬停音效。
// 个人介绍网站 (about us/ 下面的个人主页) 按需求不注入，可不引用此文件。
import { AudioManager } from './engine/AudioManager.js';

if (!window.__globalAudio) {
  window.__globalAudio = new AudioManager({ basePath: 'assets/audio/' });
  // 同步已有设置音量
  try {
    const s = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}');
    window.__globalAudio.setVolumes({ master:(s.volMaster??80)/100, amb:(s.volAmb??60)/100 });
  } catch {}
}
const audio = window.__globalAudio;

// 若页面已经有 shared-audio-init / startMenu / main 等，不重复绑定
if (!window.__globalUiDelegated) {
  window.__globalUiDelegated = true;
  // 扩展的统一选择器：常见可交互元素 + data-sfx
  const selector = [
    'button', 'a[href]', '[role=button]', '.sl-btn', '.dlg-sl-btn', '.mini-actions button',
    'input[type=button]', 'input[type=submit]', '[data-sfx]'
  ].join(', ');

  document.addEventListener('click', e => {
    const el = e.target.closest(selector); if(!el) return;
    if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('#')) return; // 锚点不播放或按需调整
    if (el.dataset && el.dataset.sfx === 'none') return;
    const key = (el.dataset && el.dataset.sfx) || 'ui_click';
    audio.play(key);
  });

  let lastHover = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest(selector); if(!el) return;
    if (el === lastHover) return; lastHover = el;
    if (el.dataset && el.dataset.sfxHover === 'none') return;
    const hk = (el.dataset && el.dataset.sfxHover) || 'ui_hover';
    audio.play(hk);
  }, { passive:true });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const el = document.activeElement;
      if (el && (el.matches?.(selector) || el.getAttribute?.('role')==='button')) {
        audio.play((el.dataset && el.dataset.sfx) || 'ui_confirm');
      }
    } else if (e.key === 'Escape') {
      audio.play('ui_cancel');
    }
  });
}

// 可选：页面可调用 window.__globalAudio.play('key') 直接使用
export {}; // 保持 ESModule 形式