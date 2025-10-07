// shared-audio-init.js
// 在非游戏主页面(登录/注册/关于等)快速启用 AudioManager 的基础点击音效与 BGM 支持。
import { AudioManager } from './engine/AudioManager.js';

// 单例暴露（可选调试）
window.__sharedAudio = window.__sharedAudio || new AudioManager({ basePath: 'assets/audio/' });
const audio = window.__sharedAudio;

// 读取设置同步音量
(function syncVolumes(){
  try { const s = JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); audio.setVolumes({ master:(s.volMaster??80)/100, amb:(s.volAmb??60)/100 }); } catch {}
})();

// 全局 UI 声音
(function bindUi(){
  if (window.__uiSfxBound) return; window.__uiSfxBound = true;
  const selector = 'button, .sl-btn, [data-sfx]';
  document.addEventListener('click', e => {
    const el = e.target.closest(selector); if(!el) return; if(el.dataset.sfx==='none') return;
    const key = el.dataset.sfx || 'ui_click'; audio.play(key);
  });
  // 悬停
  let lastHoverEl = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest(selector); if(!el) return; if(el === lastHoverEl) return; lastHoverEl = el;
    if(el.dataset.sfxHover === 'none') return;
    const hk = el.dataset.sfxHover || 'ui_hover';
    audio.play(hk);
  }, { passive:true });
  document.addEventListener('keydown', e => {
    if(e.key==='Enter'){ const el=document.activeElement; if(el && (el.matches?.('button, .sl-btn')||el.getAttribute?.('role')==='button')) audio.play('ui_confirm'); }
    else if(e.key==='Escape'){ audio.play('ui_cancel'); }
  });
})();

// 可选：背景音乐（存在文件时才会真正播）
if(!window.__sharedMenuBgm){
  window.__sharedMenuBgm = true;
  audio.playLoop('bgm_main');
}
