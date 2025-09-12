import { SaveLoadManager } from './engine/SaveLoadManager.js';
import { AchievementManager } from './engine/AchievementManager.js';
import { getCurrentUser, nsKey } from './engine/UserContext.js';

// 定义一个常量，用于在页面间传递读档信息
const LOAD_FROM_SLOT_KEY = 'groupOutsiderLoadFromSlot';

class StartMenuApp {
    constructor() {
        this.saveLoadManager = new SaveLoadManager();
    // 在开始菜单也复用成就系统（仅用于展示当前解锁状态）
    this.achManager = new AchievementManager(null);
    this.achManager.init();
        
        // 获取所有需要操作的HTML元素
        this.startNewGameButton = document.getElementById('start-new-game');
        this.loadMenuButton = document.getElementById('load-game-menu');
    this.achievementsButton = document.getElementById('achievements-button');
    this.aboutButton = document.getElementById('about-button');
    this.miniGameButton = document.getElementById('mini-game-button');
    this.settingsButton = document.getElementById('open-settings');
        
        this.overlay = document.getElementById('save-load-overlay');
        this.slotList = document.getElementById('slot-list');
        this.closeButton = document.getElementById('close-button');
        this.menuTitle = document.getElementById('menu-title');
        
        // 绑定所有按钮的点击事件
        this._bindEvents();
    }
    
    _bindEvents() {
        // 点击“开始新游戏”
        this.startNewGameButton.addEventListener('click', () => {
            // 清除可能存在的读档指令
            sessionStorage.removeItem(LOAD_FROM_SLOT_KEY);
            // 跳转到游戏页面
            window.location.href = 'game.html';
        });

        // 点击“读取存档”
        this.loadMenuButton.addEventListener('click', () => this.openLoadMenu());
    this.achievementsButton.addEventListener('click', () => this.openAchievements());
    this.aboutButton.addEventListener('click', () => this.openAbout());
    this.miniGameButton.addEventListener('click', () => this.openMiniGame());
        if(this.settingsButton){
            this.settingsButton.addEventListener('click', ()=> this.openSettings());
        }
        // 兜底：任何具有 data-jump 的按钮统一处理（避免以后再忘绑）
        document.querySelectorAll('[data-jump]').forEach(btn=>{
            btn.addEventListener('click', e=>{
                const target = btn.getAttribute('data-jump');
                if(!target) return;
                // 简单淡出效果（若需要）
                document.body.classList.add('page-exit');
                setTimeout(()=>{ window.location.href = target; }, 300);
            });
        });
        // 点击关闭按钮
        this.closeButton.addEventListener('click', () => this.closeMenu());
        // 监听存档槽位列表中的点击
        this.slotList.addEventListener('click', (event) => this.handleSlotClick(event));
    }

    openAchievements() {
        // 在开始页直接弹出与游戏内一致的“行为记录”面板
        this.achManager.openOverlay();
    }

    openAbout() {
        // 使用已有 we 页面结构（假设 about us 页整合为 about.html）
        window.location.href = 'about us.html';
    }

    openMiniGame() {
        window.location.href = 'mini-game.html';
    }

    openSettings(){
        if(!this.settingsOverlay){ this._initSettingsOverlay(); }
        this._syncSettingsControls();
        this.settingsOverlay.classList.remove('sl-hidden');
    // 只绑定一次扩展按钮（主题功能已移除）
    if(!this._settingsExtendedBound){
            const muteBtn = document.getElementById('st-audio-mute');
            muteBtn && muteBtn.addEventListener('click',()=>{
                const s = this._loadSettingsObj(); s.volMaster=0; s.volAmb=0; localStorage.setItem('groupOutsiderSettings', JSON.stringify(s)); this._syncSettingsControls();
            });
            const resetBtn = document.getElementById('st-reset-default');
            resetBtn && resetBtn.addEventListener('click',()=>{
                if(confirm('恢复默认设置?')){ const s={textSpeed:35,skipRead:false,autoMode:false,autoInterval:1800,volMaster:80,volAmb:60,theme:'default'}; localStorage.setItem('groupOutsiderSettings', JSON.stringify(s)); this._syncSettingsControls(); }
            });
            const clearAllBtn = document.getElementById('st-clear-all');
            clearAllBtn && clearAllBtn.addEventListener('click',()=>{
                const u = getCurrentUser();
                if(confirm(`清除此账号的数据? (用户: ${u})`)){
                    // 清理当前用户命名空间数据：存档、成就、已读
                    for(let i=1;i<=6;i++) localStorage.removeItem(nsKey('groupOutsiderSave_'+i));
                    localStorage.removeItem(nsKey('achievements'));
                    localStorage.removeItem(nsKey('readNodes'));
                    // 设置对所有用户共享，保留；如果需要每用户设置，可改为 nsKey('settings') 并迁移
                    // 账号列表与密码不在此处删除，避免误删其他账号
                    this._syncSettingsControls();
                    alert('已清除当前账号的数据');
                }
            });
            this._settingsExtendedBound = true;
        }
    }

    /* ================= 内嵌设置支持 ================= */
    _initSettingsOverlay(){
        this.settingsOverlay = document.getElementById('settings-overlay');
        if(!this.settingsOverlay){ console.warn('缺少 settings-overlay'); return; }
        const get = id=> document.getElementById(id);
        this.stCtrls = {
            textSpeed: get('st-text-speed'), textSpeedVal:get('st-text-speed-val'),
            skipRead:get('st-skip-read'), autoMode:get('st-auto-mode'),
            autoInterval:get('st-auto-interval'), autoIntervalVal:get('st-auto-interval-val'),
            volMaster:get('st-vol-master'), volAmb:get('st-vol-amb'),
            clearRead:get('st-clear-read'),
            logout:get('st-return'),
            close:get('st-close'), close2:get('st-close-2')
        };
        const saveNow = ()=> this._persistSettings();
        this.stCtrls.textSpeed?.addEventListener('input',()=>{ this.stCtrls.textSpeedVal.textContent=this.stCtrls.textSpeed.value; saveNow(); });
        this.stCtrls.skipRead?.addEventListener('change',saveNow);
        this.stCtrls.autoMode?.addEventListener('change',saveNow);
        this.stCtrls.autoInterval?.addEventListener('input',()=>{ this.stCtrls.autoIntervalVal.textContent=this.stCtrls.autoInterval.value; saveNow(); });
        this.stCtrls.volMaster?.addEventListener('input',saveNow);
        this.stCtrls.volAmb?.addEventListener('input',saveNow);
    // 主题控件已移除
    this.stCtrls.clearRead?.addEventListener('click',()=>{ if(confirm('清除已读节点标记?')){ localStorage.removeItem(nsKey('readNodes')); alert('已清除已读标记'); } });
        // 退出登录：返回首页
        this.stCtrls.logout?.addEventListener('click',()=>{
            try{ sessionStorage.removeItem(LOAD_FROM_SLOT_KEY); }catch{}
            window.location.href = 'index.html';
        });
        [this.stCtrls.close,this.stCtrls.close2].forEach(b=> b&& b.addEventListener('click',()=> this.closeSettingsOverlay()));
        document.addEventListener('keydown',(e)=>{ // ESC 关闭设置
            if(e.key==='Escape' && this.settingsOverlay && !this.settingsOverlay.classList.contains('sl-hidden')) this.closeSettingsOverlay();
        });
    }

    _loadSettingsObj(){
        try { return JSON.parse(localStorage.getItem('groupOutsiderSettings')||'{}'); } catch{ return {}; }
    }
    _persistSettings(){
        const prev = this._loadSettingsObj();
        const s = {
            textSpeed: parseInt(this.stCtrls.textSpeed.value,10),
            skipRead: this.stCtrls.skipRead.checked,
            autoMode: this.stCtrls.autoMode.checked,
            autoInterval: parseInt(this.stCtrls.autoInterval.value,10),
            volMaster: parseInt(this.stCtrls.volMaster.value,10),
            volAmb: parseInt(this.stCtrls.volAmb.value,10),
            theme: prev.theme || 'default'
        };
        localStorage.setItem('groupOutsiderSettings', JSON.stringify(s));
        if(s.theme) document.body.setAttribute('data-theme', s.theme);
    }
    _syncSettingsControls(){
        const s = this._loadSettingsObj();
        if(this.stCtrls.textSpeed){ this.stCtrls.textSpeed.value = s.textSpeed ?? 35; this.stCtrls.textSpeedVal.textContent=this.stCtrls.textSpeed.value; }
        if(this.stCtrls.skipRead) this.stCtrls.skipRead.checked = !!s.skipRead;
        if(this.stCtrls.autoMode) this.stCtrls.autoMode.checked = !!s.autoMode;
        if(this.stCtrls.autoInterval){ this.stCtrls.autoInterval.value = s.autoInterval ?? 1800; this.stCtrls.autoIntervalVal.textContent=this.stCtrls.autoInterval.value; }
        if(this.stCtrls.volMaster) this.stCtrls.volMaster.value = s.volMaster ?? 80;
        if(this.stCtrls.volAmb) this.stCtrls.volAmb.value = s.volAmb ?? 60;
    // 主题控件已移除，保持 body 现有 data-theme
    }
    closeSettingsOverlay(){
        this.settingsOverlay?.classList.add('sl-hidden');
    }

    
    // 打开读取存档菜单
    openLoadMenu() {
    this.menuTitle.textContent = '读取存档';
    this.overlay.classList.add('sl-mode-load');
    this._populateSlots();
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden','false');
    }

    // 关闭菜单
    closeMenu() {
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden','true');
    }
    
    // 动态生成存档槽位
    _populateSlots() {
        this.slotList.innerHTML = '';
        const allSlots = this.saveLoadManager.getAllSlots();
        allSlots.forEach(slotInfo => {
            const slot = slotInfo.slot;
            const slotData = slotInfo.data;
            const el = document.createElement('div');
            el.className = 'sl-slot';
            if(!slotData){
                el.dataset.empty = 'true';
            }
            const timeStr = slotData ? new Date(slotData.saveTime).toLocaleString() : '空槽';
            // 缩略图：使用存档中的背景路径（与游戏内一致字段 currentBackground）
            const bgThumb = slotData && slotData.currentBackground ? slotData.currentBackground : '';
            const thumb = `<div class=\"sl-thumb\" style=\"${bgThumb?`background-image:url('${bgThumb.replace(/"/g,'\\"')}')`:''}\"></div>`;
            const title = `<h3><span>槽位 ${slot}</span><span class="sl-time">${timeStr}</span></h3>`;
            const nodeLine = slotData ? `<div class=\"sl-node\">节点: ${(slotData.currentNodeId||slotData.nodeId||'').slice(0,60)}</div>` : `<div class=\"sl-node\" style=\"opacity:.55;\">(暂无数据)</div>`;
            let actions = '';
            if(slotData){
                actions = `<div class="sl-actions">`+
                          `<button class="sl-btn load-btn" data-slot="${slot}">读取</button>`+
                          `<button class="sl-btn delete delete-btn" data-slot="${slot}">删除</button>`+
                          `</div>`;
            }
            el.innerHTML = thumb + title + nodeLine + actions;
            this.slotList.appendChild(el);
        });
    }

    // 处理在槽位上的点击事件
    handleSlotClick(event) {
        const target = event.target.closest('button');
        if(!target) return;
        if (!target.dataset.slot) return;
        const slot = target.dataset.slot;
        if (target.classList.contains('load-btn')) {
            sessionStorage.setItem(LOAD_FROM_SLOT_KEY, slot);
            window.location.href = 'game.html';
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`确定要永久删除存档槽位 ${slot} 吗？此操作无法撤销。`)) {
                this.saveLoadManager.delete(slot);
                this._populateSlots();
            }
        }
    }
}

// 启动开始菜单应用
new StartMenuApp();