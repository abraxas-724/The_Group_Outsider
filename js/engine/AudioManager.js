// AudioManager.js
// 统一管理音效与（未来的）BGM/环境音。支持懒加载、音量控制、分类播放。
// 用法：
//   import { AudioManager } from './engine/AudioManager.js';
//   const audio = new AudioManager({ basePath: 'assets/audio/' });
//   audio.play('ui_click');
//   audio.setVolumes({ master: 0.8, amb: 0.6 });
//   audio.play('ach_unlock');
//
// 资源命名建议 (默认映射)：
//   ui_click.mp3         —— 通用点击
//   ui_hover.mp3         —— 悬停（可选）
//   ui_confirm.mp3       —— 确认 / 进入
//   ui_cancel.mp3        —— 取消 / 返回
//   save.mp3             —— 存档
//   load.mp3             —— 读档
//   achievement.mp3      —— 成就提示
//   explore_enter.mp3    —— 进入探索模式
//   explore_exit.mp3     —— 退出探索模式
//   hotspot.mp3          —— 点击热点
//   minigame_start.mp3   —— 开始小游戏
//   minigame_complete.mp3—— 小游戏完成
//   error.mp3            —— 错误/无效操作
//   bgm_main.mp3         —— 主 BGM (loop)
//   amb_loop.mp3         —— 环境氛围 (loop)
//
// 你可以通过 addMapping 或在构造时传入 customMapping 扩展。

export class AudioManager {
  constructor(opts = {}) {
    this.basePath = opts.basePath || 'assets/audio/';
    this.masterVolume = 0.8; // 0 ~ 1
    this.ambVolume = 0.6;
    this.unlocked = false; // 是否已通过用户手势解锁播放
    this.cache = new Map(); // key -> HTMLAudioElement
    this.looping = new Map(); // key -> HTMLAudioElement (loop audios)

    // 默认关键名到文件名映射
    this.mapping = Object.assign({
      ui_click: 'ui_click.mp3',
      ui_hover: 'ui_hover.mp3',
      ui_confirm: 'ui_confirm.mp3',
      ui_cancel: 'ui_cancel.mp3',
      save: 'save.mp3',
      load: 'load.mp3',
      achievement: 'achievement.mp3',
      explore_enter: 'explore_enter.mp3',
      explore_exit: 'explore_exit.mp3',
      hotspot: 'hotspot.mp3',
      minigame_start: 'minigame_start.mp3',
      minigame_complete: 'minigame_complete.mp3',
      error: 'error.mp3',
      // 新增：对话系统相关
      text_tick: 'text_tick.mp3',       // 文本逐字打印的轻微打字机音（节流播放）
      dialogue_advance: 'dialogue_advance.mp3', // 对话推进到下一句/节点
      sfx_keyboard: 'sfx_keyboard.mp3', // 键盘敲击声（一次性）
      bgm_start: 'bgm_start.mp3',
      bgm_main: 'bgm_main.mp3',
      amb_loop: 'amb_loop.mp3'
    }, opts.customMapping || {});

    // 浏览器自动播放策略：必须在首次用户交互后才能播放带声音音频。
    // 提供一次性解锁机制。
    const unlockHandler = () => {
      this.unlocked = true;
      // 尝试预热一个空的短音频（部分浏览器不需要）
      this._tryResumeContext();
      try {
        // 广播一个解锁事件，便于外部在真正解锁后再触发播放，避免监听顺序竞争
        const evt = new CustomEvent('audio_unlocked');
        window.dispatchEvent(evt);
      } catch { }
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
  }

  addMapping(key, filename) {
    this.mapping[key] = filename;
  }

  setVolumes({ master, amb }) {
    if (typeof master === 'number') {
      this.masterVolume = Math.max(0, Math.min(1, master));
    }
    if (typeof amb === 'number') {
      this.ambVolume = Math.max(0, Math.min(1, amb));
    }
    // 同步所有已经存在的音频
    this.cache.forEach((audio, key) => {
      if (key.startsWith('amb_') || key === 'amb_loop') {
        audio.volume = this.masterVolume * this.ambVolume;
      } else if (key.startsWith('bgm_') || key === 'bgm_main') {
        audio.volume = this.masterVolume; // 可单独做 BGM 比例
      } else {
        audio.volume = this.masterVolume; // SFX
      }
    });
    this.looping.forEach((audio, key) => {
      if (key.startsWith('amb_') || key === 'amb_loop') {
        audio.volume = this.masterVolume * this.ambVolume;
      } else {
        audio.volume = this.masterVolume;
      }
    });
  }

  // 播放一次（短音效）
  play(key, { volume = 1, allowBeforeUnlock = false } = {}) {
    if (!allowBeforeUnlock && !this.unlocked) {
      return; // 未解锁前忽略
    }
    const audio = this._getAudioElement(key, false);
    if (!audio) {
      return;
    }
    try {
      audio.currentTime = 0;
      audio.volume = this._calcVolume(key) * volume;
      audio.play().catch(() => { });
    } catch { }
  }

  /**
   * 播放一次性音效，并在播放期间临时降低当前 BGM 音量（duck），结束后恢复。
   * @param {string} key - SFX 的映射 key
   * @param {object} opts
   * @param {number} [opts.volume=1] - SFX 音量（相对 master）
   * @param {boolean} [opts.allowBeforeUnlock=false] - 未解锁时是否强行播放（通常保持 false）
   * @param {number} [opts.duckBy=0.6] - 将 BGM 音量按比例降低到原来的 duckBy（0~1）
   * @param {number} [opts.duckTo] - 将 BGM 直调到该绝对值（0~1）。若提供优先生效。
   * @param {number} [opts.duckMs=120] - BGM 淡出到 duck 音量的时长（ms）
   * @param {number} [opts.restoreMs=240] - BGM 恢复到原音量的时长（ms）
   * @param {number} [opts.minMs=300] - 若无法可靠获取 SFX 时长，最短维持 duck 的时长（ms）
   */
  playWithDuck(key, { volume = 1, allowBeforeUnlock = false, duckBy = 0.6, duckTo, duckMs = 120, restoreMs = 240, minMs = 300 } = {}) {
    if (!allowBeforeUnlock && !this.unlocked) {
      return; // 与 play 一致：未解锁前不做
    }
    // 获取当前 BGM
    const bgmKey = this._currentBgmKey;
    const bgmAudio = bgmKey ? this.cache.get(bgmKey) : null;
    const bgmOrigVol = bgmAudio ? bgmAudio.volume : 0;
    let restoreTimer = null;
    try {
      if (bgmAudio) {
        const target = (typeof duckTo === 'number') ? Math.max(0, Math.min(1, duckTo)) : Math.max(0, Math.min(1, bgmOrigVol * duckBy));
        if (target < bgmOrigVol) {
          this._fade(bgmAudio, bgmOrigVol, target, duckMs);
        }
      }
    } catch { }

    // 播放 SFX（独立一次性）
    const sfx = this._getAudioElement(key, false);
    if (!sfx) {
      // 如果没有音源，尽量恢复 BGM
      if (bgmAudio && bgmOrigVol != null) this._fade(bgmAudio, bgmAudio.volume, bgmOrigVol, restoreMs);
      return;
    }
    try {
      sfx.currentTime = 0;
      sfx.volume = Math.max(0, Math.min(1, this._calcVolume(key) * volume));
      const onEnded = () => {
        try { sfx.removeEventListener('ended', onEnded); } catch { }
        if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
        if (bgmAudio && bgmOrigVol != null) {
          this._fade(bgmAudio, bgmAudio.volume, bgmOrigVol, restoreMs);
        }
      };
      sfx.addEventListener('ended', onEnded, { once: true });
      // 双保险：极短 SFX 或无法触发 ended 时，按最短时长恢复
      restoreTimer = setTimeout(() => {
        try { sfx.removeEventListener('ended', onEnded); } catch { }
        if (bgmAudio && bgmOrigVol != null) {
          this._fade(bgmAudio, bgmAudio.volume, bgmOrigVol, restoreMs);
        }
      }, Math.max(0, minMs));
      sfx.play().catch(() => { onEnded(); });
    } catch {
      // 失败时也恢复 BGM
      if (bgmAudio && bgmOrigVol != null) this._fade(bgmAudio, bgmAudio.volume, bgmOrigVol, restoreMs);
    }
  }

  /**
   * 播放同一语义 key 的多个“变体”之一，减少重复感。
   * 约定文件命名：baseKey_1.mp3, baseKey_2.mp3 ... baseKey_N.mp3
   * 用法：audio.playVariant('text_tick', 4)  // 在 text_tick_1..4 中随机一个；若不存在则回退 text_tick
   */
  playVariant(baseKey, maxVariants, { volume = 1, allowBeforeUnlock = false } = {}) {
    if (!allowBeforeUnlock && !this.unlocked) {
      return;
    }
    const n = parseInt(maxVariants, 10);
    if (!Number.isFinite(n) || n <= 1) {
      return this.play(baseKey, { volume, allowBeforeUnlock });
    }
    // 预构建所有变体 key 列表
    const candidates = [];
    for (let i = 1; i <= n; i++) {
      const k = `${baseKey}_${i}`;
      if (this.mapping[k]) {
        candidates.push(k);
      }
    }
    // 若 mapping 中无显式列出变体，仍尝试文件是否存在（懒加载失败会被忽略）
    if (candidates.length === 0) {
      // 回退 baseKey
      return this.play(baseKey, { volume, allowBeforeUnlock });
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return this.play(pick, { volume, allowBeforeUnlock });
  }

  // 播放循环音频（如 BGM / 环境）
  playLoop(key) {
    const audio = this._getAudioElement(key, true);
    if (!audio) {
      return;
    }
    try {
      audio.loop = true;
      audio.volume = this._calcVolume(key);
      audio.play().catch(() => { });
      this.looping.set(key, audio);
    } catch { }
  }

  stop(key) {
    const audio = this.cache.get(key);
    if (audio) {
      try { audio.pause(); } catch { }
    }
  }

  stopAllLoops() {
    this.looping.forEach(a => { try { a.pause(); } catch { } });
    this.looping.clear();
  }

  /**
   * 淡出并停止当前 BGM（若存在）。
   * @param {object} opts
   * @param {number} [opts.fadeOut=900] - 淡出时长(ms)
   */
  stopBgm({ fadeOut = 900 } = {}) {
    try {
      const prevKey = this._currentBgmKey;
      if (!prevKey) return;
      const old = this.cache.get(prevKey);
      if (!old) {
        this._currentBgmKey = null;
        if (this.looping.has(prevKey)) this.looping.delete(prevKey);
        return;
      }
      this._fade(old, old.volume, 0, fadeOut, () => {
        try { old.pause(); } catch { }
        if (this.looping.has(prevKey)) this.looping.delete(prevKey);
        this._currentBgmKey = null;
      });
    } catch { }
  }

  /**
   * 高级：播放（或切换）BGM，带淡入淡出。避免多个 BGM 叠加。
   * @param {string} key - 目标 BGM key (需在 mapping 中映射文件) 如 'bgm_start'
   * @param {object} opts
   * @param {number} [opts.fadeIn=1200] - 淡入时长(ms)
   * @param {number} [opts.fadeOut=900] - 之前 BGM 淡出时长(ms)
   * @param {string} [opts.fallback] - 如果 key 不存在则使用的后备 key
   * @param {boolean} [opts.loop=true] - 是否循环
   * @param {number} [opts.targetVolume=1] - 在 master 基础上的相对倍数 0~1
   */
  playBgm(key, { fadeIn = 1200, fadeOut = 900, fallback, loop = true, targetVolume = 1 } = {}) {
    if (!this.unlocked) {
      // 未解锁：记录一个待播操作；在 unlockHandler 后由外部再次调用更加简单，这里直接静默返回
      return;
    }
    if (!this.mapping[key]) {
      if (fallback && this.mapping[fallback]) {
        key = fallback;
      } else {
        return;
      }
    }
    if (this._currentBgmKey === key) {
      return; // 已经在播
    }

    const prevKey = this._currentBgmKey;
    this._currentBgmKey = key;
    const newAudio = this._getAudioElement(key, true);
    if (!newAudio) {
      return;
    }
    try {
      newAudio.loop = !!loop;
      const baseVol = this._calcVolume(key) * targetVolume;
      newAudio.volume = 0; // 先置 0 做淡入
      newAudio.play().catch(() => { });
      this.looping.set(key, newAudio);
      // 淡出旧的
      if (prevKey && prevKey !== key) {
        const old = this.cache.get(prevKey);
        if (old) {
          this._fade(old, old.volume, 0, fadeOut, () => {
            try { old.pause(); } catch { }
            if (this.looping.has(prevKey)) {
              this.looping.delete(prevKey);
            }
          });
        }
      }
      // 保险：淡出停止其他遗留的 BGM（key 以 'bgm' 开头且不是当前 key）
      try {
        this.looping.forEach((a, k) => {
          if (k !== key && /^bgm/i.test(k)) {
            const from = a.volume;
            this._fade(a, from, 0, Math.min(fadeOut, 900), () => { try { a.pause(); } catch { } this.looping.delete(k); });
          }
        });
      } catch { }
      // 淡入新的
      this._fade(newAudio, 0, baseVol, fadeIn);
    } catch { }
  }

  /** 内部淡入淡出工具 */
  _fade(audioEl, from, to, duration = 1000, onDone) {
    try {
      const start = performance.now();
      const delta = to - from;
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // 使用 easeInOutQuad 使曲线更柔顺
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        audioEl.volume = Math.max(0, Math.min(1, from + delta * eased));
        if (t < 1) {
          requestAnimationFrame(step);
        } else if (onDone) {
          onDone();
        }
      };
      requestAnimationFrame(step);
    } catch {
      if (onDone) {
        onDone();
      }
    }
  }

  _calcVolume(key) {
    if (key.startsWith('amb_') || key === 'amb_loop') {
      return this.masterVolume * this.ambVolume;
    }
    return this.masterVolume; // 其他按主音量
  }

  _getAudioElement(key, loop) {
    if (!this.mapping[key]) {
      return null;
    }
    if (!this.cache.has(key)) {
      const src = this.basePath + this.mapping[key];
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = this._calcVolume(key);
      this.cache.set(key, audio);
    }
    return this.cache.get(key);
  }

  _tryResumeContext() {
    // 针对使用 Web Audio API 的情况，这里暂时保留占位；目前使用 <audio> 不需要
  }
}
