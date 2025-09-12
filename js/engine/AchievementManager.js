import { nsKey } from './UserContext.js';
export class AchievementManager {
  constructor(app, defs) {
    this.app = app;
    this.storageKey = 'achievements';
    this.state = {
      unlocked: {},            // 已解锁的成就
      progress: {              // 玩家进度计数器
        saves: 0,
        quickSaves: 0,
        nodes: new Set(),       // 访问过的节点ID
        flags: new Set(),       // 获得的标记
        hotspotClicks: 0,
        minigamesCompleted: new Set(), // 完成的小游戏ID
        minigamePerfects: 0,           // 小游戏完美通关次数
        argumentParseFailStreak: 0     // “论点解析”连续失败计数
      }
    };

    // **所有成就都在这里定义**
    this.defs = defs || [
      // —— 通用基础 ——
      { id: 'first_save', title: '初次存档 (First Save)', desc: '第一次保存游戏', icon: '💾' },
      { id: 'first_interaction', title: '好奇心 (Curiosity)', desc: '在探索中点击过任意交互热点', icon: '🖱️' },
      { id: 'minigame_first', title: '初试身手 (First Mini Game)', desc: '完成任意一次小游戏', icon: '🏆' },
      { id: 'quick_saver_5', title: '手速达人 (Quick Saver)', desc: '使用快速保存达到 5 次', icon: '⚡' },

      // —— 结局类 Assertions ——
      { id: 'ending_outsider', title: '【局外人】(The Outsider)', desc: '向宇宙温柔的冷漠敞开怀抱。', icon: '🌌' },
      { id: 'ending_compat', title: '【兼容性补丁】(Compatibility Patch)', desc: '尝试编译一个全新的、充满Bug的系统——“人”。', icon: '🧩' },
      { id: 'ending_prison', title: '【完美的囚笼】(The Perfect Prison)', desc: '构筑了一个没有出口的、逻辑自洽的宇宙。', icon: '🧱' },

      // —— 行为类 Logs（隐藏） ——
      { id: 'first_principles', title: '【第一性原理】(First Principles)', desc: '对一个被默认为真的公理提出了质疑。', icon: '❓' },
      { id: 'universe_1_2hz', title: '【1.2Hz的宇宙】(The 1.2Hz Universe)', desc: '在混乱的噪音中，发现了一个稳定、可预测的规律。', icon: '🔦' },
      { id: 'performance_opt', title: '【性能优化】(Performance Optimization)', desc: '拒绝了一个将导致系统性能下降的进程。', icon: '🚫🍺' },
      { id: 'silent_push', title: '【静默推送】(Silent Push)', desc: '修正了一个错误，但未启动通信协议。', icon: '🤐' },
      { id: 'tyranny_order', title: '【秩序的暴政】(The Tyranny of Order)', desc: '以牺牲系统当前可用性为代价，达成了结构的绝对完美。', icon: '🏛️' },
      { id: 'sisyphus_code', title: '【西西弗斯代码】(Code of Sisyphus)', desc: '在荒诞、重复的苦役中，找到了存在的节奏与掌控感。', icon: '🗿' },
      { id: 'successful_failure', title: '【一次成功的失败】(A Successful Failure)', desc: '手术很成功，但病人死了。', icon: '🩺' },
      { id: 'parse_error', title: '【无效解析】(Parse Error)', desc: '试图用语法分析器去理解诗歌。', icon: '🧠' },

      // —— 早期留存（可选显示） ——

    ];
  }

  init() {
    this._load();
    this._ensureOverlay();
    // 可选：如果页面存在按钮 #open-achievements，则绑定打开面板
    const btn = document.getElementById('open-achievements');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); this.openOverlay(); });
  }

  // --- 各种操作的触发器 ---

  // 每次保存时调用
  onSaved() {
    this.state.progress.saves++;
    this._maybeUnlock('first_save'); // 条件: 第一次保存
    this._persist();
    this._renderList();
  }

  // 每次快速保存时调用
  onQuickSaved() {
    this.state.progress.quickSaves++;
    if (this.state.progress.quickSaves >= 5) {
      this._maybeUnlock('quick_saver_5'); // 条件: 达到5次
    }
    this.onSaved(); // 快速保存也算一次普通保存
  }

  // 每次显示新节点时调用
  onNodeShown(nodeId) {
    if (!nodeId || this.state.progress.nodes.has(nodeId)) return;

    this.state.progress.nodes.add(nodeId);

    // **在这里检查特定节点是否触发成就**
    switch (nodeId) {

      // —— 行为类（第一次会议）——
      case 'ACT1_SCENE1_BRANCH_B_LIN_HIDES':
        // 选择“为什么要变色？”
        this._maybeUnlock('first_principles');
        break;
      case 'ACT1_SCENE1_BRANCH_C_HUI_HIDES':
        // 保持沉默，观察日光灯
        this._maybeUnlock('universe_1_2hz');
        break;
      case 'ACT1_SCENE1_BRANCH_F_LIN_HIDES':
        // 以影响效率为由拒绝喝酒
        this._maybeUnlock('performance_opt');
        break;

      // —— Act2：静默推送 / 大重构 ——
      case 'ACT2_LIN_PC_RESOLVE_02':
        // 修了琳的 Bug 但未告知
        this._maybeUnlock('silent_push');
        break;
      case 'ACT2_SCENE3_02':
        // 大重构完成的“纯白秩序”画面
        this._maybeUnlock('tyranny_order');
        break;

      // —— Act3：答辩被叫停 ——
      case 'ACT3_SCENE4_02':
        // 陈教授打断“够了”
        this._maybeUnlock('successful_failure');
        break;

      // —— 结局触发点 ——
      case 'ACT3_TRUE_END':
        this._maybeUnlock('ending_outsider');
        break;
      case 'ACT3_HAPPY_END':
        this._maybeUnlock('ending_compat');
        break;
      case 'ACT3_BAD_END':
        this._maybeUnlock('ending_prison');
        break;
    }

    // 检查复杂成就
    if (this.state.progress.nodes.size >= 5) {
      this._maybeUnlock('explorer');
    }

    this._persist();
  }

  // 每次点击热点时调用
  markHotspotClick() {
    this.state.progress.hotspotClicks++;
    this._maybeUnlock('first_interaction'); // 条件: 第一次点击
    this._persist();
  }

  // 每次获得flag时调用 (如果需要基于flag的成就)
  markFlag(flagName) {
    if (!flagName || this.state.progress.flags.has(flagName)) return;
    this.state.progress.flags.add(flagName);
    this._persist();
  }

  // 每次完成小游戏时调用
  markMinigameComplete(gameId, payload) {
    this._maybeUnlock('minigame_first'); // 条件: 完成任意小游戏

    if (gameId) this.state.progress.minigamesCompleted.add(gameId);

    // 若小游戏报告“完美”结果，则判定为“西西弗斯代码”
    try {
      const perfect = payload?.perfect === true || String(payload?.score || '').toLowerCase() === 'perfect';
      if (perfect) {
        this.state.progress.minigamePerfects++;
        this._maybeUnlock('sisyphus_code');
      }
    } catch { }

    this._persist();
    this._renderList();
  }

  // 针对“论点解析”小游戏（占位）。当连续失败达到阈值时解锁。
  recordArgumentParseFail() {
    this.state.progress.argumentParseFailStreak++;
    if (this.state.progress.argumentParseFailStreak >= 3) {
      this._maybeUnlock('parse_error');
    }
    this._persist();
  }

  resetArgumentParseFail() {
    this.state.progress.argumentParseFailStreak = 0;
    this._persist();
  }

  // --- 核心解锁与存取逻辑 ---

  isUnlocked(id) {
    return !!this.state.unlocked[id];
  }

  unlock(id, extra) {
    if (this.isUnlocked(id)) return false;

    this.state.unlocked[id] = { at: Date.now(), extra };
    const def = this.defs.find(d => d.id === id);

    try {
      const title = def ? def.title : id;
      this.app?._notify?.(`成就解锁：${title}`);
    } catch { }

    this._renderList();
    this._persist(); // 解锁后立即保存
    return true;
  }

  _maybeUnlock(id) {
    if (!this.isUnlocked(id)) {
      this.unlock(id);
    }
  }

  _persist() {
    // 为了能JSON序列化，将Set转为Array
    const stateToSave = {
      ...this.state,
      progress: {
        ...this.state.progress,
        nodes: Array.from(this.state.progress.nodes),
        flags: Array.from(this.state.progress.flags),
        minigamesCompleted: Array.from(this.state.progress.minigamesCompleted)
      }
    };
    localStorage.setItem(nsKey(this.storageKey), JSON.stringify(stateToSave));
  }

  _load() {
    try {
      const s = JSON.parse(localStorage.getItem(nsKey(this.storageKey)) || '{}');
      if (s && typeof s === 'object') {
        this.state.unlocked = s.unlocked || {};
        const loadedProgress = s.progress || {};
        // 从Array恢复为Set
        this.state.progress = {
          saves: loadedProgress.saves || 0,
          quickSaves: loadedProgress.quickSaves || 0,
          hotspotClicks: loadedProgress.hotspotClicks || 0,
          nodes: new Set(loadedProgress.nodes || []),
          flags: new Set(loadedProgress.flags || []),
          minigamesCompleted: new Set(loadedProgress.minigamesCompleted || []),
          minigamePerfects: loadedProgress.minigamePerfects || 0,
          argumentParseFailStreak: loadedProgress.argumentParseFailStreak || 0
        };
      }
    } catch { }
  }

  // --- 简易面板UI ---
  _ensureOverlay() {
    if (document.getElementById('ach-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'ach-overlay';
    ov.className = 'sl-hidden'; // 复用 sl-hidden 样式开关
    ov.style.cssText = 'position:fixed;inset:0;z-index:460;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);backdrop-filter:blur(4px);';
    ov.innerHTML = `
  <div id="ach-panel" class="sl-panel" style="width:min(92vw,900px);max-height:86vh;overflow:auto;background:rgba(17,24,39,.78);color:#e5e7eb;border:1px solid rgba(255,255,255,.18);border-radius:14px;box-shadow:0 10px 28px -8px rgba(0,0,0,.6);padding:16px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <h3 style="margin:0;font:600 16px/1.2 'Segoe UI',Roboto,Arial;">行为记录</h3>
          <button id="ach-close" class="sl-btn" style="padding:6px 10px;border-radius:8px;">关闭</button>
        </div>
  <div id="ach-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;"></div>
      </div>
    `;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) this.closeOverlay(); });
    ov.querySelector('#ach-close').addEventListener('click', () => this.closeOverlay());
    // 支持 ESC 关闭（开始页/游戏内通用）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('ach-overlay');
        if (overlay && !overlay.classList.contains('sl-hidden')) this.closeOverlay();
      }
    }, { passive: true });
    // 首次渲染
    this._renderList();
  }

  _renderList() {
    const list = document.getElementById('ach-list');
    if (!list) return;
    list.innerHTML = '';
    this.defs.forEach(def => {
      const unlocked = !!this.state.unlocked[def.id];
      const at = unlocked ? new Date(this.state.unlocked[def.id].at) : null;
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;background:rgba(255,255,255,' + (unlocked ? '.08' : '.03') + ');opacity:' + (unlocked ? '1' : '.65') + ';';
      card.innerHTML = `
        <div style="font-size:20px">${def.icon || '🏅'}</div>
        <div style="font:600 14px/1.3 'Segoe UI',Roboto;">${def.title}</div>
        <div style="font:12px/1.4 'Segoe UI',Roboto;opacity:.86">${def.desc || ''}</div>
        <div style="font:12px/1.4 'Segoe UI',Roboto;opacity:.7;margin-top:6px;">${unlocked ? ('解锁于：' + this._fmt(at)) : '未解锁'}</div>
      `;
      list.appendChild(card);
    });
  }

  _fmt(d) {
    if (!d) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  openOverlay() {
    this._ensureOverlay();
    const ov = document.getElementById('ach-overlay');
    ov && ov.classList.remove('sl-hidden');
  }

  closeOverlay() {
    const ov = document.getElementById('ach-overlay');
    ov && ov.classList.add('sl-hidden');
  }
}
