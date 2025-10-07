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
      bgm_main: 'bgm_main.mp3',
      amb_loop: 'amb_loop.mp3'
    }, opts.customMapping || {});

    // 浏览器自动播放策略：必须在首次用户交互后才能播放带声音音频。
    // 提供一次性解锁机制。
    const unlockHandler = () => {
      this.unlocked = true;
      // 尝试预热一个空的短音频（部分浏览器不需要）
      this._tryResumeContext();
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
    if (typeof master === 'number') this.masterVolume = Math.max(0, Math.min(1, master));
    if (typeof amb === 'number') this.ambVolume = Math.max(0, Math.min(1, amb));
    // 同步所有已经存在的音频
    this.cache.forEach((audio, key) => {
      if (key.startsWith('amb_') || key === 'amb_loop') audio.volume = this.masterVolume * this.ambVolume;
      else if (key.startsWith('bgm_') || key === 'bgm_main') audio.volume = this.masterVolume; // 可单独做 BGM 比例
      else audio.volume = this.masterVolume; // SFX
    });
    this.looping.forEach((audio, key) => {
      if (key.startsWith('amb_') || key === 'amb_loop') audio.volume = this.masterVolume * this.ambVolume;
      else audio.volume = this.masterVolume;
    });
  }

  // 播放一次（短音效）
  play(key, { volume = 1, allowBeforeUnlock = false } = {}) {
    if (!allowBeforeUnlock && !this.unlocked) return; // 未解锁前忽略
    const audio = this._getAudioElement(key, false);
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.volume = this._calcVolume(key) * volume;
      audio.play().catch(() => {});
    } catch {}
  }

  /**
   * 播放同一语义 key 的多个“变体”之一，减少重复感。
   * 约定文件命名：baseKey_1.mp3, baseKey_2.mp3 ... baseKey_N.mp3
   * 用法：audio.playVariant('text_tick', 4)  // 在 text_tick_1..4 中随机一个；若不存在则回退 text_tick
   */
  playVariant(baseKey, maxVariants, { volume = 1, allowBeforeUnlock = false } = {}) {
    if (!allowBeforeUnlock && !this.unlocked) return;
    const n = parseInt(maxVariants, 10);
    if (!Number.isFinite(n) || n <= 1) {
      return this.play(baseKey, { volume, allowBeforeUnlock });
    }
    // 预构建所有变体 key 列表
    const candidates = [];
    for (let i = 1; i <= n; i++) {
      const k = `${baseKey}_${i}`;
      if (this.mapping[k]) candidates.push(k);
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
    if (!audio) return;
    try {
      audio.loop = true;
      audio.volume = this._calcVolume(key);
      audio.play().catch(() => {});
      this.looping.set(key, audio);
    } catch {}
  }

  stop(key) {
    const audio = this.cache.get(key);
    if (audio) {
      try { audio.pause(); } catch {}
    }
  }

  stopAllLoops() {
    this.looping.forEach(a => { try { a.pause(); } catch {} });
    this.looping.clear();
  }

  _calcVolume(key) {
    if (key.startsWith('amb_') || key === 'amb_loop') return this.masterVolume * this.ambVolume;
    return this.masterVolume; // 其他按主音量
  }

  _getAudioElement(key, loop) {
    if (!this.mapping[key]) return null;
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
