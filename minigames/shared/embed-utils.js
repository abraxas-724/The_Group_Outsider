/**
 * 通用嵌入模式处理工具。
 * 用法（在各小游戏 script.js 顶部）：
 *   import { applyEmbedBehavior, isEmbedded } from '../shared/embed-utils.js';
 *   applyEmbedBehavior('code-beat', { exitSelectors: ['#exitGame', '#backToStory'] });
 */

export const isEmbedded = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('embed')) {
      return true;
    }
    if (window.parent && window.parent !== window) {
      return true;
    }
  } catch (_) {}
  return false;
})();

/**
 * 为小游戏应用嵌入模式逻辑。
 * @param {string} gameId - 统一的游戏标识。
 * @param {{exitSelectors:string[], onSkip?:Function}} options
 */
export function applyEmbedBehavior(gameId, { exitSelectors = [], onSkip } = {}) {
  if (!isEmbedded) {
    return; // 独立模式不改动
  }

  // 确保页面可滚动
  ensureScrollableRoot();

  const SKIP_TEXT = '跳过';
  const ORIGINAL_TEXT_MAP = new WeakMap();

  exitSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      if (!(btn instanceof HTMLElement)) {
        return;
      }
      ORIGINAL_TEXT_MAP.set(btn, btn.textContent);
      // 只在文本确实包含“返回”时替换，避免误伤其它按钮
      if (btn.textContent && /返回/.test(btn.textContent)) {
        btn.textContent = SKIP_TEXT;
      }
      btn.dataset.originalLabel = ORIGINAL_TEXT_MAP.get(btn) || '';
      btn.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        // 发送跳过消息给父页面
        try {
          window.parent.postMessage({ type: 'minigame:skip', game: gameId }, '*');
        } catch (_) {}
        if (typeof onSkip === 'function') {
          try { onSkip(); } catch (e) { console.warn(e); }
        }
      }, { once: false });
    });
  });
}

function ensureScrollableRoot() {
  const html = document.documentElement;
  const { body } = document;
  // 移除可能的 overflow: hidden 内联或类
  [html, body].forEach(el => {
    if (!el) {
      return;
    }
    const style = getComputedStyle(el);
    if (style.overflowY === 'hidden') {
      el.style.overflowY = 'auto';
    }
    if (style.overflow === 'hidden') {
      el.style.overflow = 'auto';
    }
    if (style.height === '100vh' || style.height === '100%') {
      // 允许根据内容撑开
      if (!el.style.minHeight) {
        el.style.minHeight = '100%';
      }
      if (!el.style.height || /100(vh|%)/.test(el.style.height)) {
        el.style.height = 'auto';
      }
    }
  });
}
