import { SaveLoadManager, SAVE_GAME_PREFIX, MAX_SLOTS } from './engine/SaveLoadManager.js';
import { DialogueEngine } from './engine/DialogueEngine.js';
import { AchievementManager } from './engine/AchievementManager.js';
import { nsKey } from './engine/UserContext.js';

const LOAD_FROM_SLOT_KEY = 'groupOutsiderLoadFromSlot';

class GameApp {
    constructor() {
        this.dialogueEngine = new DialogueEngine('./data/scripts.json', this);
        this.saveLoadManager = new SaveLoadManager();
        this.backgroundEl = document.getElementById('scene-background');
        this.characterLayer = document.getElementById('character-layer');
        this.characters = {};
        this.preloadedImages = new Map(); // 预加载的图片缓存

        // 绑定内嵌存/读档与设置面板的 DOM 引用
        this.inlineOverlay = document.getElementById('inline-save-load');
        this.slTitle = document.getElementById('sl-title');
        this.slCloseBtn = document.getElementById('sl-close');
        this.slRefreshBtn = document.getElementById('sl-refresh');
        this.slotsContainer = document.getElementById('sl-slots');
        this.settingsBtnInline = document.getElementById('open-settings');
        this.settingsOverlay = document.getElementById('settings-overlay');

        // 明确定义小游戏
        this.minigames = {
            code_zen_garden: {
                url: 'minigames/code-zen-garden/index.html',
                title: '代码禅院 (Code Zen Garden)',
                mode: 'iframe',
                desc: '通过命名、注释与格式，将混乱的函数打磨成一件艺术品。',
                difficulty: 'Zen',
                duration: '≈ 2 分钟',
                controls: '鼠标点击 / 选择'
            },
            code_beat: {
                url: 'minigames/code-beat/index.html',
                title: '代码节拍 (Code Beat)',
                mode: 'iframe',
                desc: '跟随节拍输入代码，让噪音降级为秩序。',
                difficulty: 'Focus',
                duration: '≈ 2 分钟',
                controls: '键盘空格 / J 键'
            },
            great_refactoring: {
                url: 'minigames/great-refactoring/index.html',
                title: '大重构 (The Great Refactoring)',
                mode: 'iframe',
                desc: '深入代码库的深渊，合并冗余、切断硬编码、理顺数据流。',
                difficulty: 'Architect',
                duration: '≈ 3 分钟',
                controls: '鼠标拖拽 / 点击 / 键盘回车',
                fullscreen: true
            },
            // 噪音过滤小游戏
            noise_filtering: { url: 'minigames/noise-filtering/index.html', title: '噪音过滤 (Noise Filtering)', mode: 'iframe' },
            logic_mending: { url: 'minigames/logic-mending/index.html', title: '逻辑修复 (Logic Mending)', mode: 'iframe' }
        };

        // **【修复】实例化成就系统**
        this.achievements = new AchievementManager(this);

        // 异步预加载角色立绘，不阻塞游戏启动
        setTimeout(() => this.preloadCharacterImages(), 100);
    }

    init() {
        console.log("游戏应用初始化...");

        // 添加错误捕获
        window.addEventListener('error', (e) => {
            console.error('游戏初始化错误:', e.error);
        });

        try {
            // 首先获取并验证DOM元素
            this.backgroundEl = document.getElementById('scene-background');
            this.characterLayer = document.getElementById('character-layer');
            this.uiLayer = document.getElementById('ui-layer');
            this.dialogueBox = document.getElementById('dialogue-box');
            this.speakerName = document.getElementById('speaker-name');
            this.dialogueText = document.getElementById('dialogue-text');

            // 验证关键元素
            if (!this.backgroundEl) {
                throw new Error('scene-background 元素未找到');
            }
            console.log('✅ scene-background 元素已找到:', this.backgroundEl);

            // 确保背景元素有正确的样式
            this.backgroundEl.style.display = 'block';
            this.backgroundEl.style.width = '100%';
            this.backgroundEl.style.height = '100%';
            this.backgroundEl.style.objectFit = 'cover';
            this.backgroundEl.style.position = 'absolute';
            this.backgroundEl.style.top = '0';
            this.backgroundEl.style.left = '0';

            if (!this.characterLayer) {
                throw new Error('character-layer 元素未找到');
            }

            if (!this.dialogueBox) {
                throw new Error('dialogue-box 元素未找到');
            }

            // **【简化】** 拦截_showNode，现在只为通知成就系统
            if (this.dialogueEngine && typeof this.dialogueEngine._showNode === 'function') {
                const __origShowNode = this.dialogueEngine._showNode.bind(this.dialogueEngine);
                this.dialogueEngine._showNode = (nodeId) => {
                    // 若存在延迟读档请求，屏蔽自动 start() 触发的起始节点显示，等待读档接管
                    if (this._deferredLoadSlot) {
                        return; // 抑制开场节点，避免覆盖即将加载的存档节点
                    }
                    // 每次显示节点，都通知成就系统
                    this.achievements?.onNodeShown?.(nodeId);
                    // 执行原始的显示逻辑
                    const ret = __origShowNode(nodeId);
                    // 节点钩子：ACT3_SCENE4_42 出现后，渲染边缘模糊/晃动遮罩；其它节点则清理
                    try {
                        if (nodeId === 'ACT3_SCENE4_42') {
                            this._showEdgeAnomalyOverlay({ gotoNode: 'ACT3_SCENE5_SETUP', noise: true });
                        } else {
                            this._removeEdgeAnomalyOverlay();
                        }
                    } catch { }
                    return ret;
                };
            }

            this.achievements.init();

            // 读取待加载槽位（来自开始页）并先缓存，避免异步竞态
            const pendingSlot = sessionStorage.getItem(LOAD_FROM_SLOT_KEY);
            if (pendingSlot) {
                this._deferredLoadSlot = parseInt(pendingSlot, 10) || null;
                sessionStorage.removeItem(LOAD_FROM_SLOT_KEY);
            }

            // 确保背景元素有默认背景
            if (this.backgroundEl) {
                this.backgroundEl.src = 'assets/images/scenes/black.png';
                console.log('✅ 设置默认起始背景: black.png');
            }

            this.dialogueEngine.start();
            this._wireInlineSaveLoad();
            this._wireQuickKeys();
            // ... (其他init代码) ...
            this._loadSettings();
            this._listenSettingsChanges();
            this._wireInlineSettings();
            this._initMobileOrientationGuard();

            console.log("✅ 游戏核心初始化完成！");

        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            alert('游戏启动失败: ' + error.message + '\n请刷新页面重试');
            return; // 如果初始化失败，直接返回，不执行后续代码
        }
        // 若有延迟读档需求，等待剧本加载完毕后再跳转到存档节点
        if (this._deferredLoadSlot) {
            console.log('检测到延迟加载槽位:', this._deferredLoadSlot);
            const slot = this._deferredLoadSlot;
            const saved = this.saveLoadManager.load(slot);
            const targetId = saved?.currentNodeId || null;
            console.log('延迟加载目标节点:', targetId);
            const tryLoad = () => {
                const scriptReady = this.dialogueEngine && Array.isArray(this.dialogueEngine.script);
                const nodeReady = scriptReady && (targetId ? this.dialogueEngine.script.some(n => n.id === targetId) : true);
                console.log('加载状态检查:', { scriptReady, nodeReady, scriptLength: this.dialogueEngine?.script?.length });
                if (scriptReady && nodeReady) {
                    this._deferredLoadSlot = null;
                    console.log('开始执行延迟加载');
                    this.loadGame(slot);
                } else {
                    setTimeout(tryLoad, 60);
                }
            };
            tryLoad();
        }
    }

    // ===== 移动端横屏提示 / 尝试锁定横屏 =====
    _initMobileOrientationGuard() {
        // 创建提示层（仅创建一次）
        let ov = document.getElementById('rotate-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'rotate-overlay';
            ov.innerHTML = `
                <div class="ro-panel">
                    <div class="ro-icon">📱↻</div>
                    <h3>建议横屏游玩</h3>
                    <p>请将设备旋转到横向以获得更佳体验。</p>
                    <div class="ro-actions">
                        <button class="ro-btn" id="ro-try-lock">尝试横屏</button>
                        <button class="ro-btn" id="ro-dismiss">我知道了</button>
                    </div>
                </div>`;
            document.body.appendChild(ov);
        }
        const canUseSO = screen.orientation && typeof screen.orientation.lock === 'function';
        const tryLock = async () => {
            try {
                if (!canUseSO) return false;
                await screen.orientation.lock('landscape');
                return true;
            } catch (e) {
                // 大多数移动浏览器需要用户交互才能锁屏，这里静默失败
                return false;
            }
        };
        const isPortrait = () => window.matchMedia('(orientation: portrait)').matches;
        const update = () => {
            const needGuard = isPortrait();
            ov.classList.toggle('show', needGuard);
        };
        // 事件绑定
        const btnLock = document.getElementById('ro-try-lock');
        const btnDismiss = document.getElementById('ro-dismiss');
        btnLock && btnLock.addEventListener('click', async () => { await tryLock(); update(); }, { passive: true });
        btnDismiss && btnDismiss.addEventListener('click', () => ov.classList.remove('show'), { passive: true });
        // 初次与后续更新
        update();
        window.addEventListener('orientationchange', update);
        window.matchMedia('(orientation: portrait)').addEventListener('change', update);
    }

    /* ================= 保存 / 读取 内嵌面板 ================= */
    _wireInlineSaveLoad() {
        const saveBtn = document.getElementById('save-menu-button');
        const loadBtn = document.getElementById('load-menu-button');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sm = document.getElementById('sl-mini');
                if (!sm || !sm.classList.contains('show')) return; // 未展开时忽略点击
                this.openInlinePanel('save');
                this._hideMiniSL();
            });
        } else { console.warn('未找到保存按钮'); }
        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sm = document.getElementById('sl-mini');
                if (!sm || !sm.classList.contains('show')) return; // 未展开时忽略点击
                this.openInlinePanel('load');
                this._hideMiniSL();
            });
        } else { console.warn('未找到读取按钮'); }
        if (this.slRefreshBtn) { this.slRefreshBtn.addEventListener('click', () => this._renderSlots()); }
        if (this.slCloseBtn) { this.slCloseBtn.addEventListener('click', () => this.closeInlinePanel()); }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.inlineOverlay.classList.contains('sl-hidden')) this.closeInlinePanel();
            else if (e.key === 'Escape' && this.settingsOverlay && !this.settingsOverlay.classList.contains('sl-hidden')) this.closeSettingsOverlay();
            else if (e.key === 'Escape') {
                const ach = document.getElementById('ach-overlay');
                if (ach && !ach.classList.contains('sl-hidden')) this.achievements.closeOverlay();
            }
        });
    }
    _hideMiniSL() {
        const mini = document.getElementById('sl-mini');
        if (mini && mini.classList.contains('show')) { mini.classList.remove('show'); setTimeout(() => mini.classList.add('hidden'), 200); }
    }

    openInlinePanel(mode = 'save') {
        if (!this.inlineOverlay) { console.error('缺少 inline-save-load 容器'); return; }
        this.currentSLMode = mode;
        if (this.slTitle) this.slTitle.textContent = mode === 'save' ? '存档' : '读取';
        this.inlineOverlay.classList.remove('sl-hidden');
        this.dialoguePaused = true; // 暂停推进
        // 暂时禁用对话框点击
        const dlg = document.getElementById('dialogue-box');
        if (dlg) { dlg.dataset.pe = dlg.style.pointerEvents || ''; dlg.style.pointerEvents = 'none'; }
        this._renderSlots();
    }

    closeInlinePanel() {
        if (this.inlineOverlay) this.inlineOverlay.classList.add('sl-hidden');
        this.dialoguePaused = false;
        // 恢复对话框点击
        const dlg = document.getElementById('dialogue-box');
        if (dlg) { dlg.style.pointerEvents = dlg.dataset.pe || 'auto'; delete dlg.dataset.pe; }
    }

    /* ================= 内嵌设置 ================= */
    _wireInlineSettings() {
        if (this.settingsBtnInline) {
            this.settingsBtnInline.addEventListener('click', (e) => { e.stopPropagation(); this.openSettingsOverlay(); });
        }
        if (this.settingsOverlay) {
            const closeBtns = ['st-close', 'st-close-2'];
            closeBtns.forEach(id => { const b = document.getElementById(id); b && b.addEventListener('click', () => this.closeSettingsOverlay()); });
            // 阻止点击 panel 冒泡退出推进
            this.settingsOverlay.querySelector('.sl-panel')?.addEventListener('click', e => e.stopPropagation());
            // 绑定控件
            this._bindSettingsControls();
        }
    }

    openSettingsOverlay() {
        if (!this.settingsOverlay) return;
        this.settingsOverlay.classList.remove('sl-hidden');
        this.dialoguePaused = true;
        // 初始化控件值
        this._syncSettingsControls();
        // 如果存在扩展按钮(静音/重置/清除全部/主题 swatch)绑定一次
        if (!this._settingsExtendedBound) {
            const muteBtn = document.getElementById('st-audio-mute');
            muteBtn && muteBtn.addEventListener('click', () => {
                const s = this.currentSettings || {}; s.volMaster = 0; s.volAmb = 0; localStorage.setItem('groupOutsiderSettings', JSON.stringify(s)); this._loadSettings(); this._syncSettingsControls();
            });
            const resetBtn = document.getElementById('st-reset-default');
            resetBtn && resetBtn.addEventListener('click', () => {
                if (confirm('恢复默认设置?')) { const s = { textSpeed: 35, skipRead: false, autoMode: false, autoInterval: 1800, volMaster: 80, volAmb: 60, theme: 'default' }; localStorage.setItem('groupOutsiderSettings', JSON.stringify(s)); this._loadSettings(); this._syncSettingsControls(); }
            });
            const clearAllBtn = document.getElementById('st-clear-all');
            clearAllBtn && clearAllBtn.addEventListener('click', () => {
                if (confirm('清除当前账号的存档/成就/已读?')) {
                    for (let i = 1; i <= 6; i++) localStorage.removeItem(nsKey('groupOutsiderSave_' + i));
                    localStorage.removeItem(nsKey('achievements'));
                    localStorage.removeItem(nsKey('readNodes'));
                    // 设置仍为全局；如需每用户设置，可迁移为 nsKey('settings')
                    this._loadSettings(); this._syncSettingsControls(); alert('已清除当前账号的数据');
                }
            });
            this._settingsExtendedBound = true;
        }
    }
    closeSettingsOverlay() {
        if (!this.settingsOverlay) return;
        this.settingsOverlay.classList.add('sl-hidden');
        this.dialoguePaused = false;
    }

    _bindSettingsControls() {
        const g = (id) => document.getElementById(id);
        this.ctrl = {
            textSpeed: g('st-text-speed'),
            textSpeedVal: g('st-text-speed-val'),
            skipRead: g('st-skip-read'),
            autoMode: g('st-auto-mode'),
            autoInterval: g('st-auto-interval'),
            // 补充自动间隔显示数值的引用，避免后续事件中访问未定义
            autoIntervalVal: g('st-auto-interval-val'),
            // 新增：对话框透明度
            dlgOpacity: g('st-dlg-opacity'),
            dlgOpacityVal: g('st-dlg-opacity-val'),
            volMaster: g('st-vol-master'),
            volAmb: g('st-vol-amb'),
            clearRead: g('st-clear-read'),
            return: g('st-return')
        };
        const saveNow = () => this._persistInlineSettings();
        if (this.ctrl.textSpeed) this.ctrl.textSpeed.addEventListener('input', () => { this.ctrl.textSpeedVal.textContent = this.ctrl.textSpeed.value; saveNow(); });
        if (this.ctrl.skipRead) this.ctrl.skipRead.addEventListener('change', saveNow);
        if (this.ctrl.autoMode) this.ctrl.autoMode.addEventListener('change', saveNow);
        if (this.ctrl.autoInterval) this.ctrl.autoInterval.addEventListener('input', () => { this.ctrl.autoIntervalVal.textContent = this.ctrl.autoInterval.value; saveNow(); });
        if (this.ctrl.dlgOpacity) this.ctrl.dlgOpacity.addEventListener('input', () => { if (this.ctrl.dlgOpacityVal) this.ctrl.dlgOpacityVal.textContent = this.ctrl.dlgOpacity.value; saveNow(); });
        if (this.ctrl.volMaster) this.ctrl.volMaster.addEventListener('input', saveNow);
        if (this.ctrl.volAmb) this.ctrl.volAmb.addEventListener('input', saveNow);
        if (this.ctrl.return) this.ctrl.return.addEventListener('click', () => {
            try { sessionStorage.removeItem(LOAD_FROM_SLOT_KEY); } catch { }
            window.location.href = 'start.html';
        });
        // 主题控件已删除，无需事件
        if (this.ctrl.clearRead) this.ctrl.clearRead.addEventListener('click', () => {
            if (confirm('清除已读节点标记?')) {
                localStorage.removeItem('groupOutsiderReadNodes');
                alert('已清除已读标记');
            }
        });
    }

    _syncSettingsControls() {
        const s = this.currentSettings || {};
        if (!this.ctrl) return;
        if (this.ctrl.textSpeed) { this.ctrl.textSpeed.value = s.textSpeed ?? 35; this.ctrl.textSpeedVal.textContent = this.ctrl.textSpeed.value; }
        if (this.ctrl.skipRead) this.ctrl.skipRead.checked = !!s.skipRead;
        if (this.ctrl.autoMode) this.ctrl.autoMode.checked = !!s.autoMode;
        if (this.ctrl.autoInterval) { this.ctrl.autoInterval.value = s.autoInterval ?? 1800; this.ctrl.autoIntervalVal.textContent = this.ctrl.autoInterval.value; }
        if (this.ctrl.dlgOpacity) { const v = (typeof s.dlgOpacity === 'number' ? s.dlgOpacity : 0.8); this.ctrl.dlgOpacity.value = String(v); if (this.ctrl.dlgOpacityVal) this.ctrl.dlgOpacityVal.textContent = String(v); }
        if (this.ctrl.volMaster) this.ctrl.volMaster.value = s.volMaster ?? 80;
        if (this.ctrl.volAmb) this.ctrl.volAmb.value = s.volAmb ?? 60;
        // 主题控件已删除
    }

    _persistInlineSettings() {
        const s = {
            textSpeed: parseInt(this.ctrl.textSpeed.value, 10),
            skipRead: this.ctrl.skipRead.checked,
            autoMode: this.ctrl.autoMode.checked,
            autoInterval: parseInt(this.ctrl.autoInterval.value, 10),
            dlgOpacity: this.ctrl.dlgOpacity ? parseFloat(this.ctrl.dlgOpacity.value) : (this.currentSettings?.dlgOpacity ?? 0.8),
            volMaster: parseInt(this.ctrl.volMaster.value, 10),
            volAmb: parseInt(this.ctrl.volAmb.value, 10),
            theme: this.ctrl.theme ? this.ctrl.theme.value : (this.currentSettings?.theme || 'default')
        };
        this.currentSettings = s;
        localStorage.setItem('groupOutsiderSettings', JSON.stringify(s));
        // 立即应用
        this.dialogueEngine.applySettings({
            textSpeed: s.textSpeed,
            skipRead: s.skipRead,
            autoMode: s.autoMode,
            autoInterval: s.autoInterval
        });
        this._applyVolumes(s);
        this._applyDialogueOpacity(s);
        if (this.ctrl.theme) document.body.setAttribute('data-theme', s.theme); // 兼容旧数据
    }

    _renderSlots() {
        if (!this.slotsContainer) return;
        this.slotsContainer.innerHTML = '';
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const data = this.saveLoadManager.load(i);
            const slotEl = document.createElement('div');
            slotEl.className = 'sl-slot';
            slotEl.dataset.slot = i;
            if (!data) slotEl.dataset.empty = 'true';
            const bgThumb = data && data.currentBackground ? data.currentBackground : '';
            slotEl.innerHTML = `
                <div class=\"sl-thumb\" style=\"${bgThumb ? `background-image:url('${bgThumb}')` : ''}\"></div>
                <h3>槽位 ${i} <span class=\"sl-time\">${data ? this._fmtTime(data.saveTime) : '空'}</span></h3>
                <div class=\"sl-node\">${data ? ('节点: ' + data.currentNodeId) : '没有存档'}</div>
                <div class=\"sl-actions\">
                    <button class=\"sl-btn act-main\">${this.currentSLMode === 'save' ? '保存' : '读取'}</button>
                    ${data ? '<button class=\"sl-btn delete\" data-del=\"1\">删除</button>' : ''}
                </div>`;
            // 主操作
            slotEl.querySelector('.act-main').addEventListener('click', (e) => { e.stopPropagation(); this._slotAction(i, false); });
            // 删除
            if (data) {
                const delBtn = slotEl.querySelector('[data-del]');
                delBtn && delBtn.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('删除该槽位?')) { this.saveLoadManager.delete(i); this._renderSlots(); } });
            }
            // 单 / 双击
            slotEl.addEventListener('click', () => this._slotAction(i, false));
            slotEl.addEventListener('dblclick', () => this._slotAction(i, true));
            this.slotsContainer.appendChild(slotEl);
        }
    }

    _slotAction(slot, force) {
        if (this.currentSLMode === 'save') {
            const existing = this.saveLoadManager.load(slot);
            if (existing && !force && !confirm('覆盖该槽位?')) return;
            const data = this.buildSaveData();
            if (!data) { alert('当前无可保存进度'); return; }
            if (this.saveLoadManager.save(slot, data)) {
                this._renderSlots();
                alert(`已保存到槽位 ${slot}`);
                // 成就打点
                this.achievements.onSaved();
            }
        } else {
            const data = this.saveLoadManager.load(slot);
            if (!data) { alert('槽位为空'); return; }
            if (!force && !confirm('读取该槽位并覆盖当前进度?')) return;
            this.loadGame(slot);
            this.closeInlinePanel();
        }
    }

    _fmtTime(ts) {
        if (!ts) return '---';
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    _wireQuickKeys() {
        const quickSaveBtn = document.getElementById('quick-save');
        const quickLoadBtn = document.getElementById('quick-load');
        // 行为记录（成就）按钮：点击打开面板；首次点击提示快捷键 J
        const achBtn = document.getElementById('open-achievements');
        if (achBtn) {
            achBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.achievements.openOverlay();
                const hinted = localStorage.getItem('achHintedJ');
                if (!hinted) { this._notify('提示：按 J 可快速打开/关闭“行为记录”'); localStorage.setItem('achHintedJ', '1'); }
            });
        }

        if (quickSaveBtn) quickSaveBtn.addEventListener('click', (e) => { e.stopPropagation(); this._quickSave(); });
        if (quickLoadBtn) quickLoadBtn.addEventListener('click', (e) => { e.stopPropagation(); this._quickLoad(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5') { e.preventDefault(); this._quickSave(); }
            if (e.key === 'F9') { e.preventDefault(); this._quickLoad(); }
            // S / L 快捷键 (避免输入框内触发)
            if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
                if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                e.preventDefault(); this._quickSave();
            }
            if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
                if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                e.preventDefault(); this._quickLoad();
            }
            // J 打开/关闭成就面板
            if ((e.key === 'j' || e.key === 'J') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const ach = document.getElementById('ach-overlay');
                if (ach && !ach.classList.contains('sl-hidden')) this.achievements.closeOverlay();
                else this.achievements.openOverlay();
            }
        });
    }

    _quickSave() {
        const data = this.buildSaveData();
        if (!data) { alert('当前无可保存进度'); return; }
        if (this.saveLoadManager.save(1, data)) {
            console.log('快速保存到槽位1');
            this._notify('已快速保存到槽位 1');
            // 成就打点
            this.achievements.onQuickSaved();
            this.achievements.onSaved();
        }
    }

    _quickLoad() {
        const d = this.saveLoadManager.load(1);
        if (!d) { alert('槽位1为空'); return; }
        this.loadGame(1);
    }

    /* ================== 设置集成 ================== */
    _loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem('groupOutsiderSettings') || '{}');
            this.currentSettings = s;
            this.dialogueEngine.applySettings({
                textSpeed: s.textSpeed ?? 35,
                skipRead: !!s.skipRead,
                autoMode: !!s.autoMode,
                autoInterval: s.autoInterval ?? 1800
            });
            this._applyVolumes(s);
            this._applyDialogueOpacity(s);
        } catch (e) { console.warn('读取设置失败', e); }
    }

    _applyVolumes(s) {
        // 未来可整合音频总线，目前仅存占位逻辑
        this.masterVolume = (s.volMaster ?? 80) / 100;
        this.ambVolume = (s.volAmb ?? 60) / 100;
        // 示例: 若背景音乐 audio 元素存在
        const bgm = document.getElementById('bgm-audio');
        if (bgm) { bgm.volume = this.masterVolume; }
    }

    _applyDialogueOpacity(s) {
        try {
            const v = typeof s.dlgOpacity === 'number' ? s.dlgOpacity : 0.8;
            const dlg = document.getElementById('dialogue-box');
            if (dlg) {
                // 直接设置背景透明度；如改为 CSS 变量，可替换为 setProperty
                // 以 style0.css 的默认背景为基准：rgba(17,24,39,0.9)
                dlg.style.backgroundColor = `rgba(17, 24, 39, ${v})`;
            }
        } catch { }
    }

    _listenSettingsChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'groupOutsiderSettings') {
                this._loadSettings();
            }
        });
    }

    // --- 被DialogueEngine直接调用的方法 ---

    changeBackground(node) {
        try {
            console.log('🖼️ 正在更换背景为:', node.imagePath);

            if (!this.backgroundEl) {
                console.error('❌ backgroundEl 未找到!');
                return;
            }

            console.log('✅ backgroundEl 存在:', this.backgroundEl);

            // 场景切换前隐藏上一个场景所有角色（支持未来通过 node.keepCharacters 控制保留）
            if (!node.keepCharacters) {
                for (const id in this.characters) {
                    const el = this.characters[id];
                    if (el) el.classList.add('hidden');
                }
            }
            // 规范化为绝对 URL，避免在不同 base 下解析异常
            const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : window.location.href;
            let url = node.imagePath;
            console.log('🔗 解析前路径:', url);
            console.log('🔗 Base URL:', base);
            try { url = new URL(node.imagePath, base).toString(); } catch (e) {
                console.warn('URL 解析失败，使用原路径:', e);
            }
            console.log('🔗 解析后URL:', url);

            // 渐隐旧背景
            this.backgroundEl.style.opacity = '0.3';
            console.log('🎭 设置背景透明度为 0.3');

            // 预加载后再切换，确保显示正确图片
            const probe = new Image();
            probe.onload = () => {
                console.log('✅ 背景图加载成功，设置src:', url);
                this.backgroundEl.src = url;
                this.backgroundEl.style.opacity = '1';
                console.log('🎭 背景设置完成，透明度已恢复为 1');
            };
            probe.onerror = (e) => {
                console.error('❌ 背景图片加载失败:', url, e);
                // 即使加载失败也要尝试显示，可能是缓存问题
                this.backgroundEl.src = url;
                this.backgroundEl.style.opacity = '1';
                console.log('⚠️ 强制设置背景，即使加载失败');
            };
            probe.src = url;
            console.log('🔄 开始预加载背景图片:', url);
        } catch (e) {
            console.error('❌ 切换背景异常:', e);
            if (this.backgroundEl) {
                this.backgroundEl.src = node?.imagePath || '';
                this.backgroundEl.style.opacity = '1';
            }
        }
    }

    /* ================= 探索模式 ================= */
    startExploration(node) {
        console.log('进入探索模式', node);
        this.explorationMode = true;
        this.explorationConfig = node;
        // 缺省后续节点兼容：优先 node.next，其次 explorationNext，再次固定示例
        this.explorationNext = node.next || node.explorationNext || 'ACT1_SCENE3_START';
        // 提示层
        if (!this.exploreHint) {
            this.exploreHint = document.createElement('div');
            this.exploreHint.id = 'explore-hint';
            this.exploreHint.innerHTML = node.noBlankExit ? '探索中：点击交互区域' : '探索中：点击交互区域 · 点击空白处背景继续';
            this.exploreHint.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);color:#fff;font:600 14px/1.2 \'Segoe UI\',Roboto,Arial,monospace;padding:8px 14px;background:rgba(17,24,39,.78);backdrop-filter:blur(6px) saturate(140%);border:1px solid rgba(255,255,255,.18);border-radius:999px;z-index:420;pointer-events:none;box-shadow:0 8px 24px -12px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05) inset;letter-spacing:.5px;';
            document.body.appendChild(this.exploreHint);
        } else {
            this.exploreHint.innerHTML = node.noBlankExit ? '探索中：点击交互区域' : '探索中：点击交互区域 · 点击空白处背景继续';
        }
        this.exploreHint.classList.remove('hidden');

        const uiLayer = document.getElementById('ui-layer');
        // 若定义了热点，创建热点图层
        if (Array.isArray(node.hotspots) && node.hotspots.length) {
            // 创建或清空热点层
            if (!this.hotspotLayer) {
                this.hotspotLayer = document.createElement('div');
                this.hotspotLayer.id = 'hotspot-layer';
                this.hotspotLayer.style.cssText = 'position:absolute;inset:0;z-index:320;pointer-events:auto;';
                uiLayer.appendChild(this.hotspotLayer);
            }
            this.hotspotLayer.innerHTML = '';
            this.hotspotLayer.style.pointerEvents = 'auto';
            // 记录当前热点以便窗口缩放时重新布局
            this._hsItems = [];
            this._hsCoordsRef = node.coordsRef || 'container'; // 'container' | 'image'
            // 点击空白处可退出到 exitNext（若配置）
            if (!node.noBlankExit) {
                this._hotspotBlankHandler = (e) => {
                    if (e.target === this.hotspotLayer) {
                        const tgt = node.exitNext || this.explorationNext;
                        this.endExploration(tgt);
                    }
                };
                this.hotspotLayer.addEventListener('click', this._hotspotBlankHandler);
            } else {
                this._hotspotBlankHandler = null;
            }

            // 渲染热点（支持百分比坐标）
            node.hotspots.forEach(hs => {
                const el = document.createElement('div');
                el.className = 'hotspot';
                // 先记录源数据，具体定位延后统一计算（便于窗口变化时重排）
                el.dataset.x = String(hs.x ?? 0);
                el.dataset.y = String(hs.y ?? 0);
                el.dataset.w = String(hs.w ?? 10);
                el.dataset.h = String(hs.h ?? 10);
                if (hs.label) {
                    const lab = document.createElement('div');
                    lab.className = 'hs-label';
                    lab.textContent = hs.label;
                    el.appendChild(lab);
                }
                el.title = hs.tooltip || hs.label || '';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // 记录标记
                    if (hs.setFlag) { this.dialogueEngine.gameState[hs.setFlag] = true; this.achievements.markFlag(hs.setFlag); }
                    // 成就：任意热点交互
                    this.achievements.markHotspotClick();
                    // once：点击后禁用
                    if (hs.once) { el.style.pointerEvents = 'none'; el.style.opacity = '.35'; }
                    // 进入后续
                    if (hs.next) { this.endExploration(hs.next); }
                    else if (node.advanceOnAny) { this.endExploration(this.explorationNext); }
                });
                this.hotspotLayer.appendChild(el);
                // 保存以供重排
                this._hsItems.push({ el, hs });
            });

            // 初始定位 + 绑定窗口变化
            this._positionHotspots();
            this._onResizeHotspots = () => this._positionHotspots();
            window.addEventListener('resize', this._onResizeHotspots);
            // 若参照原图但图片尚未加载，待加载完成后再定位一次
            if (this._hsCoordsRef === 'image' && this.backgroundEl && (!this.backgroundEl.naturalWidth || !this.backgroundEl.naturalHeight)) {
                this._onBgLoadForHs = () => {
                    this._positionHotspots();
                    this.backgroundEl.removeEventListener('load', this._onBgLoadForHs);
                    this._onBgLoadForHs = null;
                };
                this.backgroundEl.addEventListener('load', this._onBgLoadForHs);
            }
        } else {
            // 兼容旧版：点击任意位置继续
            if (!this.exploreOverlay) {
                this.exploreOverlay = document.createElement('div');
                this.exploreOverlay.id = 'explore-overlay';
                this.exploreOverlay.style.cssText = 'position:fixed;inset:0;z-index:410;cursor:pointer;';
                document.body.appendChild(this.exploreOverlay);
            }
            this.exploreOverlay.classList.remove('hidden');
            this.exploreOverlay.style.pointerEvents = 'auto';
            this._exploreClickHandler = (e) => {
                if (!this.explorationMode) return;
                this.endExploration();
            };
            this.exploreOverlay.addEventListener('click', this._exploreClickHandler, { once: true });
        }
    }

    endExploration(gotoNodeId) {
        if (!this.explorationMode) return;
        console.log('结束探索模式，进入节点', gotoNodeId || this.explorationNext);
        this.explorationMode = false;
        if (this.exploreOverlay) { this.exploreOverlay.classList.add('hidden'); }
        if (this.exploreOverlay) { this.exploreOverlay.style.pointerEvents = 'none'; }
        this._exploreClickHandler = null;
        // 清理热点层
        if (this.hotspotLayer) {
            this.hotspotLayer.removeEventListener('click', this._hotspotBlankHandler || (() => { }));
            this._hotspotBlankHandler = null;
            this.hotspotLayer.innerHTML = '';
            this.hotspotLayer.style.pointerEvents = 'none';
        }
        // 解绑窗口重排监听
        if (this._onResizeHotspots) { window.removeEventListener('resize', this._onResizeHotspots); this._onResizeHotspots = null; }
        this._hsItems = null;
        if (this.exploreHint) this.exploreHint.classList.add('hidden');
        const nextId = gotoNodeId || this.explorationNext;
        if (nextId) { this.dialogueEngine._showNode(nextId); }
    }

    /* ================= 小游戏占位 ================= */
    startMinigame(node, done) {
        const def = this.minigames[node.gameId];
        if (!def) { console.error('未注册的小游戏:', node.gameId); done && done(); return; }
        // 记录当前小游戏 id 以便完成后打点
        this._currentMinigameId = node.gameId;
        this._openMinigame(def, node.params || {}, () => { done && done(); });
    }

    _ensureMinigameOverlay() {
        let ov = document.getElementById('minigame-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'minigame-overlay';
            document.body.appendChild(ov);
        }
        // 若存在占位元素但未注入内容，则补全结构
        if (!ov.querySelector('#mg-panel')) {
            ov.innerHTML = `
                <div id="mg-panel">
                    <div id="mg-header">
                        <div id="mg-title">Mini Game</div>
                        <div id="mg-actions">
                            <button id="mg-skip" title="这就不行了？">跳过</button>
                        </div>
                    </div>
                    <div id="mg-preface" style="display:none;">
                        <div class="mg-top">
                            <div id="mg-desc"></div>
                            <div class="mg-actions"><button id="mg-start" class="sl-btn">开始</button></div>
                            <div id="mg-meta" class="mg-meta"></div>
                        </div>
                    </div>
                    <div id="mg-body">
                        <iframe id="mg-frame" src="about:blank" allow="gamepad *; fullscreen;" referrerpolicy="no-referrer"></iframe>
                        <button id="mg-floating-skip" class="mg-skip-floating" title="这就不行了？" aria-label="跳过">跳过</button>
                    </div>
                </div>`;
            // 已移除右上角关闭按钮（✕）
        }
        return ov;
    }

    _openMinigame(def, params, onDone) {
        this._minigameDone = onDone;
        const ov = this._ensureMinigameOverlay();
        const isFullscreen = !!def.fullscreen || params.fullscreen === true;
        ov.classList.toggle('fullscreen', isFullscreen);
        let frame = ov.querySelector('#mg-frame');
        const titleEl = ov.querySelector('#mg-title');
        if (titleEl) titleEl.textContent = def.title || 'Mini Game';
        // 头部跳过按钮：为避免与浮动按钮重复，统一隐藏
        const skipBtn = ov.querySelector('#mg-skip');
        if (skipBtn) {
            skipBtn.style.display = 'none';
        }
        // 浮动跳过按钮（游戏窗口右上角）：仅对 logic_mending 显示
        const floatSkipBtn = ov.querySelector('#mg-floating-skip');
        if (floatSkipBtn) {
            const canSkip = (this._currentMinigameId === 'logic_mending');
            floatSkipBtn.style.display = canSkip ? '' : 'none';
            floatSkipBtn.onclick = () => this._closeMinigame({ reason: 'exit', payload: { skipped: true } });
            floatSkipBtn.setAttribute('title', '这就不行了？');
            floatSkipBtn.setAttribute('aria-label', '跳过');
        }
        // 暂停剧情推进
        this.dialoguePaused = true;
        // 先显示说明，再加载 iframe
        const preface = ov.querySelector('#mg-preface');
        const descEl = ov.querySelector('#mg-desc');
        const metaEl = ov.querySelector('#mg-meta');
        const startBtn = ov.querySelector('#mg-start');
        const bodyEl = ov.querySelector('#mg-body');
        // 注意：在 file:// 场景下，window.location.origin 可能为 'null' 或不可用，需使用 document.baseURI 作为基准
        const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : window.location.href;
        const buildUrl = () => {
            const u = new URL(def.url, base);
            if (params) { Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v))); }
            return u.toString();
        };
        // 打开遮罩
        ov.classList.add('show');
        if (preface && descEl && startBtn && bodyEl) {
            // 填充说明文案：优先 node.params，其次 def.desc，最后默认
            const customDesc = (params && (params.desc || params.description)) || def.desc || '准备开始小游戏。';
            descEl.textContent = customDesc;
            // 填充元信息 chips
            if (metaEl) {
                const chips = [];
                const difficulty = (params && params.difficulty) || def.difficulty || 'Normal';
                const duration = (params && params.duration) || def.duration || '≈ 1-2 分钟';
                // 根据小游戏选择默认操作提示
                let controls = (params && params.controls) || def.controls || '';
                if (!controls) {
                    if (this._currentMinigameId === 'noise_filtering') controls = '鼠标拖拽/释放';
                    else if (this._currentMinigameId === 'logic_mending') controls = 'WASD / 方向键';
                    else controls = '按提示操作';
                }
                const skippable = (this._currentMinigameId === 'logic_mending');
                const mk = (icon, txt) => `<span class="mg-chip"><span class="i">${icon}</span>${txt}</span>`;
                chips.push(mk('🎯', `难度: ${difficulty}`));
                chips.push(mk('⏱️', `时长: ${duration}`));
                chips.push(mk('🎮', `操作: ${controls}`));
                if (skippable) chips.push(mk('⤴️', '可跳过'));
                metaEl.innerHTML = chips.join('');
            }
            preface.style.display = '';
            bodyEl.style.display = 'none';
            // 说明阶段：隐藏跳过按钮（避免误触）
            if (skipBtn) skipBtn.style.visibility = 'hidden';
            if (floatSkipBtn) floatSkipBtn.style.visibility = 'hidden';
            // 点击开始后再加载 iframe，并注册消息监听
            startBtn.onclick = () => {
                if (!frame) { this._ensureMinigameOverlay(); frame = ov.querySelector('#mg-frame'); }
                if (frame) { frame.src = buildUrl(); }
                this._mgMsgHandler = (e) => {
                    const isFile = window.location.protocol === 'file:' || window.location.origin === 'null';
                    if (!isFile && e.origin !== window.location.origin) return;
                    const data = e.data || {};
                    if (data.type === 'minigame:ready') {
                        try {
                            const target = isFile ? '*' : window.location.origin;
                            frame && frame.contentWindow.postMessage({ type: 'minigame:init', payload: { gameId: data.gameId || null, params } }, target);
                        } catch { }
                    } else if (data.type === 'minigame:complete') {
                        this._closeMinigame({ reason: 'complete', payload: data.payload });
                    } else if (data.type === 'minigame:exit') {
                        this._closeMinigame({ reason: 'exit' });
                    }
                };
                window.addEventListener('message', this._mgMsgHandler);
                preface.style.display = 'none';
                bodyEl.style.display = '';
                // 进入小游戏后：若允许跳过则显示
                if (skipBtn && skipBtn.style.display !== 'none') skipBtn.style.visibility = 'visible';
                if (floatSkipBtn && floatSkipBtn.style.display !== 'none') floatSkipBtn.style.visibility = 'visible';
                // 支持 ESC 退出
                const onEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); this._closeMinigame({ reason: 'exit' }); document.removeEventListener('keydown', onEsc); } };
                document.addEventListener('keydown', onEsc);
            };
            // 键盘 Enter 直接开始
            const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); startBtn?.click(); } };
            preface.addEventListener('keydown', onKey, { once: true });
        } else {
            // 回退：无前置区则直接加载
            if (!frame) { this._ensureMinigameOverlay(); frame = ov.querySelector('#mg-frame'); }
            if (frame) { frame.src = buildUrl(); }
            this._mgMsgHandler = (e) => {
                const isFile = window.location.protocol === 'file:' || window.location.origin === 'null';
                if (!isFile && e.origin !== window.location.origin) return;
                const data = e.data || {};
                if (data.type === 'minigame:ready') {
                    try {
                        const target = isFile ? '*' : window.location.origin;
                        frame && frame.contentWindow.postMessage({ type: 'minigame:init', payload: { gameId: data.gameId || null, params } }, target);
                    } catch { }
                } else if (data.type === 'minigame:complete') {
                    this._closeMinigame({ reason: 'complete', payload: data.payload });
                } else if (data.type === 'minigame:exit') {
                    this._closeMinigame({ reason: 'exit' });
                }
            };
            window.addEventListener('message', this._mgMsgHandler);
        }
    }

    _closeMinigame(result) {
        const ov = document.getElementById('minigame-overlay');
        const frame = ov?.querySelector('#mg-frame');
        if (frame) { frame.src = 'about:blank'; }
        if (ov) { ov.classList.remove('show'); ov.classList.remove('fullscreen'); }
        window.removeEventListener('message', this._mgMsgHandler || (() => { }));
        this._mgMsgHandler = null;
        const cb = this._minigameDone; this._minigameDone = null;
        // 恢复剧情
        this.dialoguePaused = false;
        // 成就：小游戏完成
        if (result?.reason === 'complete') {
            this._notify('小游戏完成');
            try { this.achievements.markMinigameComplete(this._currentMinigameId, result?.payload); } catch { }
        }
        cb && cb(result);
    }

    /* ================= 渐隐到黑 ================= */
    fadeToBlack(node, done) {
        let overlay = document.getElementById('fade-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fade-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .6s;z-index:400;';
            document.body.appendChild(overlay);
        }
        requestAnimationFrame(() => { overlay.style.opacity = 1; });
        setTimeout(() => { done && done(); }, (node.duration || 1000));
    }

    /* ================= 点击继续提示 ================= */
    showClickContinueHint(text = '点击继续') {
        if (!this.clickHintEl) {
            this.clickHintEl = document.createElement('div');
            this.clickHintEl.id = 'click-continue-hint';
            this.clickHintEl.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);padding:10px 18px;font:600 16px/1.3 monospace;color:#fff;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.2);border-radius:12px;letter-spacing:1px;z-index:430;animation:fadePulse 2.2s ease-in-out infinite;';
            this.clickHintEl.innerHTML = text;
            document.body.appendChild(this.clickHintEl);
            // 动画样式只需注入一次
            if (!document.getElementById('click-hint-style')) {
                const style = document.createElement('style');
                style.id = 'click-hint-style';
                style.textContent = '@keyframes fadePulse {0%,100%{opacity:.25}50%{opacity:1}}';
                document.head.appendChild(style);
            }
        } else {
            this.clickHintEl.innerHTML = text;
            this.clickHintEl.classList.remove('hidden');
        }
    }

    hideClickContinueHint() {
        if (this.clickHintEl) {
            this.clickHintEl.classList.add('hidden');
        }
    }

    showCharacter(node) {
        console.log('正在显示角色:', node);
        let charEl = this.characters[node.charId];
        if (!charEl) {
            charEl = document.createElement('img');
            charEl.id = `char-${node.charId.toLowerCase()}`;
            charEl.classList.add('character', 'hidden');
            this.characterLayer.appendChild(charEl);
            this.characters[node.charId] = charEl;
        }

        // 使用预加载的图片或直接设置src
        const imagePath = `assets/images/characters/${node.charId.toLowerCase()}-neutral.png`;
        if (this.preloadedImages.has(imagePath)) {
            // 使用预加载的图片，避免重新加载
            charEl.src = this.preloadedImages.get(imagePath).src;
        } else {
            // 如果没有预加载，直接设置src（会重新加载）
            charEl.src = imagePath;
        }

        charEl.classList.remove('pos-left', 'pos-center', 'pos-right');
        if (node.position) {
            charEl.classList.add(node.position);
        }

        setTimeout(() => charEl.classList.remove('hidden'), 50);
    }

    hideCharacter(node) {
        console.log('正在隐藏角色:', node);
        const charEl = this.characters[node.charId];
        if (charEl) {
            charEl.classList.add('hidden');
        }
    }

    // ======= 特效：边缘模糊 + 轻微晃动（点击进入隐藏分支） =======
    _showEdgeAnomalyOverlay(opts = {}) {
        const gotoNode = opts.gotoNode || 'ACT3_SCENE5_SETUP';
        if (this._edgeOv) {
            return; // 避免重复创建
        }
        // 容器
        const ov = document.createElement('div');
        ov.id = 'edge-anomaly';
        if (opts.noise) {
            ov.classList.add('with-noise');
        }
        // 四个边缘可点击区域
        const mkEdge = (cls) => {
            const d = document.createElement('div');
            d.className = 'edge ' + cls;
            d.setAttribute('role', 'button');
            d.setAttribute('aria-label', '进入隐藏分支');
            // 仅边缘捕获点击，不影响中央对话框点击推进
            d.addEventListener('click', (e) => {
                e.stopPropagation();
                try { this._removeEdgeAnomalyOverlay(); } catch { }
                // 跳转到隐藏分支节点
                if (gotoNode) {
                    this.dialogueEngine?._showNode(gotoNode);
                }
            });
            return d;
        };
        ov.appendChild(mkEdge('top'));
        ov.appendChild(mkEdge('bottom'));
        ov.appendChild(mkEdge('left'));
        ov.appendChild(mkEdge('right'));
        // 可选：添加细微噪点层（纯 CSS 背景 + 叠加混合）
        if (opts.noise) {
            const noise = document.createElement('div');
            noise.className = 'noise';
            ov.appendChild(noise);
        }
        document.body.appendChild(ov);
        this._edgeOv = ov;
    }

    _removeEdgeAnomalyOverlay() {
        if (this._edgeOv && this._edgeOv.parentNode) {
            try { this._edgeOv.parentNode.removeChild(this._edgeOv); } catch { }
        }
        this._edgeOv = null;
    }


    setActiveCharacter(activeCharId) {
        // 遍历所有当前在场上的角色
        for (const charId in this.characters) {
            const charEl = this.characters[charId];
            if (charEl) {
                // 如果这个角色是当前说话者
                if (charId === activeCharId) {
                    // 移除 .inactive 类，让他“点亮”
                    charEl.classList.remove('inactive');
                } else {
                    // 如果不是说话者
                    // 添加 .inactive 类，让他“变暗”
                    charEl.classList.add('inactive');
                }
            }
        }
    }

    buildSaveData() {
        if (!this.dialogueEngine.currentNode) return null;
        const d = {
            saveTime: Date.now(),
            currentNodeId: this.dialogueEngine.currentNode.id,
            gameStateFlags: this.dialogueEngine.gameState,
            settingsSnapshot: this.dialogueEngine.settings,
            currentBackground: this.backgroundEl?.src || '',
            charactersOnScreen: []
        };
        for (const charId in this.characters) {
            const el = this.characters[charId];
            if (el && !el.classList.contains('hidden')) {
                let position = 'pos-center';
                if (el.classList.contains('pos-left')) position = 'pos-left';
                if (el.classList.contains('pos-right')) position = 'pos-right';
                d.charactersOnScreen.push({ charId, position });
            }
        }
        return d;
    }

    saveGame(slot) {
        if (!slot) slot = 1;
        if (slot < 1 || slot > MAX_SLOTS) { alert('无效槽位'); return false; }
        const data = this.buildSaveData();
        if (!data) { alert('当前无可保存进度'); return false; }
        const ok = this.saveLoadManager.save(slot, data);
        if (ok) {
            alert(`已保存到槽位 ${slot}`);
            // 成就打点
            this.achievements.onSaved();
        }
        return ok;
    }

    loadGame(slot) {
        if (!slot) slot = 1;
        const data = this.saveLoadManager.load(slot);
        if (!data) { alert('槽位为空'); return false; }
        if (!data.currentNodeId) { alert('存档损坏'); return false; }
        this.backgroundEl.src = data.currentBackground || '';
        this.characterLayer.innerHTML = '';
        this.characters = {};
        (data.charactersOnScreen || []).forEach(cd => this.showCharacter(cd));
        this.dialogueEngine.gameState = data.gameStateFlags || {};
        if (data.settingsSnapshot) { this.dialogueEngine.applySettings(data.settingsSnapshot); }
        this.dialogueEngine._showNode(data.currentNodeId);
        alert(`已读取槽位 ${slot}`);
        return true;
    }

    getSaveData(slot) {
        const jsonString = localStorage.getItem(nsKey(`${SAVE_GAME_PREFIX}${slot}`));
        if (jsonString) {
            try {
                return JSON.parse(jsonString);
            } catch {
                return null;
            }
        }
        return null;
    }

    deleteSave(slot) {
        localStorage.removeItem(nsKey(`${SAVE_GAME_PREFIX}${slot}`));
        console.log(`存档槽位 ${slot} 已删除。`);
    }

    handleError(error) {
        document.body.innerHTML = `<h1>游戏加载失败</h1><p>${error.message}</p>`;
    }

    // **【修复】确保 _notify 方法存在，用于显示弹窗**
    _notify(msg) {
        try {
            let cont = document.getElementById('toast-container');
            if (!cont) {
                cont = document.createElement('div');
                cont.id = 'toast-container';
                document.body.appendChild(cont);
            }
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = `<div class="icon">🏆</div><div class="msg">${msg}</div>`;
            cont.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('out');
                setTimeout(() => toast.remove(), 260);
            }, 3200);
        } catch (e) {
            console.log(msg); // 降级处理
        }
    }

    // 预加载角色立绘（异步、非阻塞）
    preloadCharacterImages() {
        // 实际存在的角色列表
        const availableCharacters = [
            'hui', 'lin', 'mo', 'yang'
        ];

        console.log('🚀 后台预加载角色立绘...');

        // 分批预加载，避免一次性请求过多
        availableCharacters.forEach((charId, index) => {
            setTimeout(() => {
                const imagePath = `assets/images/characters/${charId.toLowerCase()}-neutral.png`;

                // 创建Image对象进行预加载
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.set(imagePath, img);
                    console.log(`✅ 预加载完成: ${charId}`);
                };
                img.onerror = () => {
                    console.log(`⚠️ 预加载失败: ${charId} (跳过)`);
                };

                // 开始加载
                img.src = imagePath;
            }, index * 200); // 每个角色延迟200ms加载，避免网络拥塞
        });

        console.log(`📦 预加载队列: ${availableCharacters.length} 个角色`);
    }
}

// 启动游戏
const app = new GameApp();
app.init();

// 将 app 实例暴露到全局，便于调试
window.app = app;

// ============ 内部辅助：热点定位（容器/原图双坐标系） ============
GameApp.prototype._positionHotspots = function () {
    if (!this.hotspotLayer || !Array.isArray(this._hsItems)) return;
    const layerRect = this.hotspotLayer.getBoundingClientRect();
    const contW = layerRect.width;
    const contH = layerRect.height;

    const ref = this._hsCoordsRef || 'container';
    const imgEl = this.backgroundEl;
    const imgNW = imgEl?.naturalWidth || 0;
    const imgNH = imgEl?.naturalHeight || 0;

    // 计算 cover 映射所需参数（当以原图为参照时）
    let scale = 1, dispW = contW, dispH = contH, offX = 0, offY = 0;
    if (ref === 'image' && imgNW > 0 && imgNH > 0) {
        const sx = contW / imgNW;
        const sy = contH / imgNH;
        scale = Math.max(sx, sy);
        dispW = imgNW * scale;
        dispH = imgNH * scale;
        offX = (dispW - contW) / 2;
        offY = (dispH - contH) / 2;
    }

    // 将每个热点定位到像素坐标，避免百分比取整误差，并支持原图参照
    this._hsItems.forEach(({ el }) => {
        const xPerc = parseFloat(el.dataset.x || '0');
        const yPerc = parseFloat(el.dataset.y || '0');
        const wPerc = parseFloat(el.dataset.w || '10');
        const hPerc = parseFloat(el.dataset.h || '10');

        let leftPx = 0, topPx = 0, widthPx = 0, heightPx = 0;
        if (ref === 'image' && imgNW > 0 && imgNH > 0) {
            // 百分比基于原图尺寸
            const imgX = (xPerc / 100) * imgNW * scale;
            const imgY = (yPerc / 100) * imgNH * scale;
            const imgW = (wPerc / 100) * imgNW * scale;
            const imgH = (hPerc / 100) * imgNH * scale;
            leftPx = imgX - offX;
            topPx = imgY - offY;
            widthPx = imgW;
            heightPx = imgH;
        } else {
            // 直接基于容器百分比
            leftPx = (xPerc / 100) * contW;
            topPx = (yPerc / 100) * contH;
            widthPx = (wPerc / 100) * contW;
            heightPx = (hPerc / 100) * contH;
        }

        // 应用像素定位
        el.style.left = leftPx + 'px';
        el.style.top = topPx + 'px';
        el.style.width = widthPx + 'px';
        el.style.height = heightPx + 'px';
    });
}

// 处理节点显示逻辑，支持跳转到其他页面
function showNode(nodeId) {
    const node = app.dialogueEngine.getNode(nodeId);
    if (!node) {
        console.error('节点未找到:', nodeId);
        return;
    }
    console.log('显示节点:', nodeId, node);

    // —— 成就/标记：剧本内联触发（进入该节点即触发）——
    try {
        // 解锁成就：支持 unlockAchievements:[], achievements:[], unlockAchievement:"id"
        const unlocks =
            node.unlockAchievements ||
            node.achievements ||
            (node.unlockAchievement ? [node.unlockAchievement] : []);
        if (Array.isArray(unlocks)) {
            unlocks.forEach(id => { if (id) app.achievements?.unlock(id); });
        }

        // 标记 flags：支持 markFlags:[], markFlag:"flagName"
        const marks = node.markFlags || (node.markFlag ? [node.markFlag] : []);
        if (Array.isArray(marks)) {
            marks.forEach(f => { if (f) app.achievements?.markFlag(f); });
        }

        // 可选：显隐面板（仅在剧本明确要求时）
        if (node.showAchievements === true) app.achievements?.openOverlay();
        if (node.hideAchievements === true) app.achievements?.closeOverlay();
    } catch (e) {
        console.warn('应用成就指令失败:', e);
    }

    // 先处理特殊类型节点
    switch (node.type) {
        // ...existing code...

        // 新增：纯“成就节点”，只做解锁/标记后跳转，不展示对白
        case 'achievement': {
            try {
                const unlock = node.unlock || node.unlockAchievements || node.achievements || [];
                (Array.isArray(unlock) ? unlock : [unlock]).forEach(id => { if (id) app.achievements?.unlock(id); });
                const flags = node.flags || node.markFlags || (node.markFlag ? [node.markFlag] : []);
                (Array.isArray(flags) ? flags : [flags]).forEach(f => { if (f) app.achievements?.markFlag(f); });
                if (node.showAchievements === true) app.achievements?.openOverlay();
                if (node.hideAchievements === true) app.achievements?.closeOverlay();
            } catch (e) {
                console.warn('成就节点处理失败:', e);
            }
            const nextId = node.next || node.goto;
            if (nextId) { showNode(nextId); return; }
            break;
        }
    }

    // 继续执行默认的节点显示逻辑
    app.dialogueEngine._showNode(nodeId);
}
