import { nsKey } from './UserContext.js';
export class DialogueEngine {
    constructor(scriptPath, gameApp) {
        this.scriptPath = scriptPath;
        this.gameApp = gameApp; // 直接持有GameApp的引用
        this.script = null;
        this.characters = null;
        this.gameState = {};
        this.currentNode = null;

        // UI 元素引用
        this.dialogueBox = document.getElementById('dialogue-box');
        this.speakerName = document.getElementById('speaker-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.centeredChoices = document.getElementById('centered-choices');
        // 选项点击并发防抖锁
        this.choiceLocked = false;

        this.isTyping = false;
        this.settings = { textSpeed: 35, skipRead: false, autoMode: false, autoInterval: 1800 };
        this.readNodes = new Set(JSON.parse(localStorage.getItem(nsKey('readNodes')) || '[]'));
        this.typingInterval = null;
        this.dialogueBox.addEventListener('click', () => {
            if (this.currentNode && this.currentNode.type === 'dialogue') {
                this.advance();
            }
        });
    }

    async loadScript() {
        // ... (加载脚本的逻辑与上一版完全相同)
        try {
            const response = await fetch(this.scriptPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.script = data.nodes;
            this.characters = data.characters;
            return data.start_node;
        } catch (error) {
            console.error("无法加载或解析剧本文件:", error);
            this.gameApp.handleError(error);
        }
    }

    async start() {
        const startNodeId = await this.loadScript();
        if (startNodeId) this._showNode(startNodeId);
    }

    advance() {
        // 若游戏被标记为暂停（例如打开存/读档面板），则不推进
        if (this.gameApp && this.gameApp.dialoguePaused) return;
        if (this.isTyping) { this._skipTyping(); return; }
        if (this.currentNode && this.currentNode.type === 'dialogue' && this.currentNode.next) {
            this._showNode(this.currentNode.next);
        }
    }

    _showNode(nodeId) {
        const node = this.script.find(n => n.id === nodeId);
        if (!node) {
            this.dialogueBox.classList.add('hidden');
            this.centeredChoices.classList.add('hidden'); // 同时隐藏选项
            return;
        }
        this.currentNode = node;

        switch (node.type) {
            case 'dialogue':
                this._handleDialogueNode(node);
                break;
            case 'choice':
                this._handleChoiceNode(node);
                break;
            case 'showCharacter':
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.showCharacter === 'function') {
                    this.gameApp.showCharacter(node);
                }
                if (node.next) this._showNode(node.next);
                break;
            case 'hideCharacter':
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.hideCharacter === 'function') {
                    this.gameApp.hideCharacter(node);
                }
                if (node.next) this._showNode(node.next);
                break;
            case 'changeBackground': {
                // 切换背景；可配置点击继续或延时继续
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.changeBackground === 'function') {
                    this.gameApp.changeBackground(node);
                }
                const waitForClick = !!node.waitForClick;
                const delay = typeof node.delay === 'number' ? node.delay : 0;
                if (waitForClick) {
                    const advanceAfterClick = () => {
                        try { this.gameApp?.hideClickContinueHint?.(); } catch { }
                        if (node.next) this._showNode(node.next);
                    };
                    try { this.gameApp?.showClickContinueHint?.(node.clickHint || '点击继续'); } catch { }
                    const target = (this.gameApp && this.gameApp.backgroundEl) ? this.gameApp.backgroundEl : document.body;
                    target.addEventListener('click', advanceAfterClick, { once: true });
                } else if (node.next) {
                    if (delay > 0) setTimeout(() => this._showNode(node.next), delay);
                    else this._showNode(node.next);
                }
                break;
            }
            case 'startExploration':
                // 进入探索模式：隐藏全部对话 / 选项，交给 GameApp 管理交互点
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.startExploration === 'function') {
                    this.gameApp.startExploration(node);
                }
                break;
            case 'startMinigame':
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.startMinigame === 'function') {
                    this.gameApp.startMinigame(node, () => {
                        if (node.next) this._showNode(node.next);
                    });
                } else if (node.next) {
                    // 若未实现小游戏，直接跳过
                    this._showNode(node.next);
                }
                break;
            case 'branch': {
                // 数值/布尔条件分支
                const cases = Array.isArray(node.cases) ? node.cases : [];
                let target = null;
                for (const c of cases) {
                    if (this._evalAll(c.when)) { target = c.next; break; }
                }
                if (!target) target = node.default || node.next || null;
                if (target) this._showNode(target);
                break;
            }
            case 'fadeToBlack':
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
                if (this.gameApp && typeof this.gameApp.fadeToBlack === 'function') {
                    this.gameApp.fadeToBlack(node, () => {
                        if (node.next) this._showNode(node.next);
                    });
                } else if (node.next) {
                    this._showNode(node.next);
                }
                break;
            default:
                this.dialogueBox.classList.add('hidden');
                this.centeredChoices.classList.add('hidden');
        }
    }

    _handleDialogueNode(node) {
        this.centeredChoices.classList.add('hidden');
        this.centeredChoices.innerHTML = '';
        this.dialogueBox.classList.remove('hidden');
        if (node.character) {
            // 映射角色代号到显示名称（scripts.json -> characters 字段）
            let displayName = node.character;
            if (this.characters && this.characters[node.character]) {
                displayName = this.characters[node.character];
            }
            // 若旁白可选择隐藏名称，可根据需求切换：这里仍然显示映射后的“旁白”
            this.speakerName.textContent = displayName || '';
            this.speakerName.style.display = displayName ? 'block' : 'none';
        } else {
            this.speakerName.textContent = '';
            this.speakerName.style.display = 'none';
        }
        const alreadyRead = this.readNodes.has(node.id);
        if (alreadyRead && this.settings.skipRead) {
            this._skipTyping();
            this.dialogueText.textContent = node.text;
            this.isTyping = false;
            this._queueAutoAdvance();
        } else {
            this._typewriter(node.text, alreadyRead);
        }
        this.readNodes.add(node.id);
        localStorage.setItem(nsKey('readNodes'), JSON.stringify(Array.from(this.readNodes)));
        if (this.gameApp && typeof this.gameApp.setActiveCharacter === 'function') {
            this.gameApp.setActiveCharacter(node.character);
        }
    }

    _handleChoiceNode(node) {
        this._skipTyping();
        this.dialogueBox.classList.add('hidden');
        this.centeredChoices.classList.remove('hidden');
        this.centeredChoices.innerHTML = '';
        this.choiceLocked = false;
        const shouldShow = (expr) => this._evalAll(expr);
        // 修复：当 hideIf 未定义时，不应将其视为 true；仅当提供 hideIf 且条件成立时才隐藏
        const passFilter = (opt) => {
            const showPass = (opt.showIf ? shouldShow(opt.showIf) : true);
            const hidePass = (opt.hideIf ? !shouldShow(opt.hideIf) : true);
            return showPass && hidePass;
        };
        (node.options || []).filter(passFilter).forEach(option => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = option.text;
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.choiceLocked) return; // 防止短时间多次触发
                this.choiceLocked = true;
                // 锁定所有按钮
                this.centeredChoices.querySelectorAll('button').forEach(b => {
                    b.disabled = true;
                    if (b !== button) b.classList.add('choice-faded');
                });
                // 设置/清理/切换 flag
                if (option.setFlag) this.gameState[option.setFlag] = true;
                if (Array.isArray(option.setFlags)) option.setFlags.forEach(f => { if (f) this.gameState[f] = true; });
                if (option.clearFlag) delete this.gameState[option.clearFlag];
                if (Array.isArray(option.clearFlags)) option.clearFlags.forEach(f => { if (f) delete this.gameState[f]; });
                if (option.toggleFlag) this.gameState[option.toggleFlag] = !this.gameState[option.toggleFlag];
                // 数值增减/设置：inc/dec/add/sub/set
                // inc 与 add 等价；dec 与 sub 等价
                if (option.inc) this._applyIncDec(option.inc, +1);
                if (option.add) this._applyIncDec(option.add, +1);
                if (option.dec) this._applyIncDec(option.dec, -1);
                if (option.sub) this._applyIncDec(option.sub, -1);
                if (option.set) this._applySet(option.set);
                setTimeout(() => {
                    this.centeredChoices.classList.add('hidden');
                    this.centeredChoices.innerHTML = '';
                    this._showNode(option.next);
                }, 50);
            }, { once: false });
            this.centeredChoices.appendChild(button);
        });
    }

    // 解析条件：支持
    // - 字符串：'flag' / '!flag' / 'counter>=3' / 'score<2' / 'x==1' / 'y!=0'
    // - 数组：所有条件均需满足
    _evalAll(expr) {
        if (!expr) return true;
        const list = Array.isArray(expr) ? expr : [expr];
        return list.every(c => this._evalCond(c));
    }

    _evalCond(cond) {
        if (typeof cond !== 'string') return false;
        const s = cond.trim();
        // 比较运算
        const m = s.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
        if (m) {
            const [, key, op, numStr] = m;
            const left = Number(this.gameState?.[key] ?? 0);
            const right = Number(numStr);
            switch (op) {
                case '==': return left === right;
                case '!=': return left !== right;
                case '>=': return left >= right;
                case '<=': return left <= right;
                case '>': return left > right;
                case '<': return left < right;
            }
        }
        // 布尔存在/不存在
        if (s.startsWith('!')) { const key = s.slice(1); return !this.gameState?.[key]; }
        return !!this.gameState?.[s];
    }

    // 应用增减：支持
    // - 字符串: 'logical' 或 'a,b' 或 'logical=2'
    // - 数组: ['logical','score=2']
    // - 对象: { logical: 1, score: 2 }
    _applyIncDec(spec, sign = +1) {
        const applyOne = (k, v) => {
            const key = String(k).trim();
            const delta = Number(v);
            const cur = Number(this.gameState?.[key] ?? 0);
            const next = cur + sign * (Number.isFinite(delta) ? delta : 1);
            this.gameState[key] = next;
        };
        const parseToken = (tok) => {
            if (typeof tok !== 'string') return null;
            const t = tok.trim();
            if (!t) return null;
            const eq = t.indexOf('=');
            if (eq >= 0) { const k = t.slice(0, eq).trim(); const v = t.slice(eq + 1).trim(); return [k, parseFloat(v)]; }
            return [t, 1];
        };
        if (typeof spec === 'string') {
            const parts = spec.split(',');
            parts.forEach(p => { const kv = parseToken(p); if (kv) applyOne(kv[0], kv[1]); });
        } else if (Array.isArray(spec)) {
            spec.forEach(p => {
                if (typeof p === 'string') { const kv = parseToken(p); if (kv) applyOne(kv[0], kv[1]); }
                else if (p && typeof p === 'object') { Object.entries(p).forEach(([k, v]) => applyOne(k, v)); }
            });
        } else if (spec && typeof spec === 'object') {
            Object.entries(spec).forEach(([k, v]) => applyOne(k, v));
        }
    }

    // 应用设置：支持
    // - 字符串: 'logical=3,score=1'
    // - 数组: ['a=1','b=2'] 或 [{a:1},{b:2}]
    // - 对象: { logical: 3, score: 1 }
    _applySet(spec) {
        const applyOne = (k, v) => {
            const key = String(k).trim();
            const val = (typeof v === 'number') ? v : parseFloat(v);
            this.gameState[key] = Number.isFinite(val) ? val : v;
        };
        const parseToken = (tok) => {
            if (typeof tok !== 'string') return null;
            const t = tok.trim();
            if (!t) return null;
            const eq = t.indexOf('=');
            if (eq < 0) return null;
            const k = t.slice(0, eq).trim();
            const v = t.slice(eq + 1).trim();
            return [k, v];
        };
        if (typeof spec === 'string') {
            const parts = spec.split(',');
            parts.forEach(p => { const kv = parseToken(p); if (kv) applyOne(kv[0], kv[1]); });
        } else if (Array.isArray(spec)) {
            spec.forEach(p => {
                if (typeof p === 'string') { const kv = parseToken(p); if (kv) applyOne(kv[0], kv[1]); }
                else if (p && typeof p === 'object') { Object.entries(p).forEach(([k, v]) => applyOne(k, v)); }
            });
        } else if (spec && typeof spec === 'object') {
            Object.entries(spec).forEach(([k, v]) => applyOne(k, v));
        }
    }

    _typewriter(text, alreadyRead = false) {
        // ... (打字机效果逻辑与上一版完全相同)
        this._skipTyping();
        this.dialogueText.textContent = '';
        this.isTyping = true;
        let charIndex = 0;
        const baseDelay = Math.max(5, this.settings.textSpeed || 35);
        const interval = alreadyRead && this.settings.skipRead ? 0 : baseDelay;
        this.typingInterval = setInterval(() => {
            if (charIndex < text.length) {
                this.dialogueText.textContent += text.charAt(charIndex);
                charIndex++;
            } else { this._skipTyping(); }
        }, interval);
    }

    _skipTyping() {
        if (this.isTyping) {
            clearInterval(this.typingInterval);
            this.isTyping = false;
            if (this.currentNode && this.currentNode.type === 'dialogue') {
                this.dialogueText.textContent = this.currentNode.text;
            }
            // 打字完成后如果自动模式开启则排队
            this._queueAutoAdvance();
        }
    }

    applySettings(s) {
        this.settings = { ...this.settings, ...s };
    }

    _queueAutoAdvance() {
        if (!this.settings.autoMode) return;
        if (!this.currentNode || this.currentNode.type !== 'dialogue') return;
        clearTimeout(this._autoTimer);
        const delay = Math.max(400, this.settings.autoInterval || 1800);
        this._autoTimer = setTimeout(() => {
            if (this.isTyping) return; // 若仍在打字则不推进
            this.advance();
        }, delay);
    }
}
