const isFile = window.location.protocol === 'file:' || window.location.origin === 'null';
const parentOrigin = isFile ? '*' : window.location.origin;
const hasParent = (() => {
    try {
        return window.parent && window.parent !== window;
    } catch {
        return false;
    }
})();

const postToParent = (message) => {
    if (!hasParent) return;
    try {
        window.parent.postMessage(message, parentOrigin);
    } catch (err) {
        console.warn('无法通知父级窗口:', err);
    }
};

const toastEl = document.getElementById('toast');
let toastTimer = null;
const showToast = (text) => {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
};

const exitToMenu = () => {
    if (hasParent) {
        postToParent({ type: 'minigame:exit' });
        showToast('已尝试退出到剧情');
    } else {
        window.location.href = '../../start.html';
    }
};

const stageIndexEl = document.getElementById('stageIndex');
const stageTitleEl = document.getElementById('stageTitle');
const stageDescEl = document.getElementById('stageDescription');
const stageInstructionEl = document.getElementById('stageInstruction');
const stageContentEl = document.getElementById('stageContent');
const progressSummaryEl = document.getElementById('progressSummary');
const phaseListEl = document.getElementById('phaseList');
const summaryPanel = document.getElementById('summaryPanel');
const summaryNarrativeEl = document.getElementById('summaryNarrative');
const summaryMergesEl = document.getElementById('summaryMerges');
const summaryChainsEl = document.getElementById('summaryChains');
const summaryFlowEl = document.getElementById('summaryFlow');
const startButton = document.getElementById('startButton');
const continueButton = document.getElementById('continueButton');
const restartButton = document.getElementById('restartButton');
const exitButton = document.getElementById('exitGame');
const replayButton = document.getElementById('replayButton');
const backToStoryButton = document.getElementById('backToStory');

const STAGES = [
    {
        id: 'merge',
        title: '合并同类项',
        description: '冗余的黑色模块盘踞在底层架构之上。将它们拖拽到回炉区，压缩成唯一的洁白核心。',
        instruction: '拖拽黑色模块到净化区。一次吸收同类的三个碎片即可重铸白色模块。',
        init: () => initMergeStage()
    },
    {
        id: 'chains',
        title: '切断硬编码',
        description: '深红色的锁链让模块之间彼此拖拽。切断它们，再用灵活的接口重新接驳。',
        instruction: '按住锁链切断硬编码，再将接口令牌拖拽到指定插槽完成替换。',
        init: () => initChainStage()
    },
    {
        id: 'flow',
        title: '理顺数据流',
        description: '数据像黑色血管般缠绕。旋转节点，让信号沿最短路径流向终端。',
        instruction: '点击节点旋转通路，当所有节点转为洁白发光，即表示路径顺畅。',
        init: () => initFlowStage()
    }
];

const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const mergeClusters = [
    {
        id: 'render-loop',
        title: '渲染循环簇',
        fragments: ['RenderLoop_backup_final.js', 'renderLoop_copy(1).js', 'renderLoop_FINAL_v7.js'],
        clean: 'Render Loop Core'
    },
    {
        id: 'auth-gateway',
        title: '授权网关碎片',
        fragments: ['AuthCheck_temp.patch', 'quickAuth_hotfix.js', 'LOGIN_AUTH_FINAL_FINAL.js'],
        clean: 'Auth Gateway Service'
    },
    {
        id: 'metric-sampler',
        title: '指标采样残渣',
        fragments: ['metricsCollector_v2_copy.js', 'Metrics-Collector-fast.js', 'metricsCollector-temp.js'],
        clean: 'Metric Sampler'
    }
];

const chainSpecs = [
    {
        id: 'ui-overlay',
        label: 'UI Overlay → Input Router',
        source: 'UIOverlay.jsx',
        target: 'InputRouter.js',
        interface: 'EventAdapter'
    },
    {
        id: 'inventory',
        label: 'Inventory API → Player Cache',
        source: 'InventoryApi.ts',
        target: 'PlayerCacheStore.ts',
        interface: 'DependencyBridge'
    },
    {
        id: 'reporting',
        label: 'Reporting Service → Dashboard',
        source: 'ReportingService.py',
        target: 'RealtimeDashboard.vue',
        interface: 'StreamingGateway'
    }
];

const SVG_NS = 'http://www.w3.org/2000/svg';

const FLOW_STATES = {
    straight: [
        { angle: 0, directions: ['left', 'right'] },
        { angle: 90, directions: ['up', 'down'] }
    ],
    corner: [
        { angle: 0, directions: ['right', 'down'] },
        { angle: 90, directions: ['down', 'left'] },
        { angle: 180, directions: ['left', 'up'] },
        { angle: 270, directions: ['up', 'right'] }
    ],
    tee: [
        { angle: 0, directions: ['left', 'right', 'up'] },
        { angle: 90, directions: ['up', 'down', 'left'] },
        { angle: 180, directions: ['left', 'right', 'down'] },
        { angle: 270, directions: ['up', 'down', 'right'] }
    ]
};

const FLOW_PIPE_PATHS = {
    straight: 'M18 50 L82 50',
    corner: 'M50 50 L82 50 M50 50 L50 82',
    tee: 'M18 50 L82 50 M50 50 L50 18'
};

const createPipeSvg = (type) => {
    const pathData = FLOW_PIPE_PATHS[type];
    if (!pathData) return null;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('flow-pipe');
    svg.style.pointerEvents = 'none';

    const basePath = document.createElementNS(SVG_NS, 'path');
    basePath.setAttribute('class', 'flow-path flow-path--base');
    basePath.setAttribute('d', pathData);
    basePath.setAttribute('fill', 'none');
    basePath.setAttribute('stroke-linecap', 'round');
    basePath.setAttribute('stroke-width', '12');

    const activePath = document.createElementNS(SVG_NS, 'path');
    activePath.setAttribute('class', 'flow-path flow-path--active');
    activePath.setAttribute('d', pathData);
    activePath.setAttribute('fill', 'none');
    activePath.setAttribute('stroke-linecap', 'round');
    activePath.setAttribute('stroke-width', '12');

    svg.append(basePath, activePath);
    return svg;
};

const state = {
    stageIndex: -1,
    clearedStages: new Set(),
    stageCompletePending: false,
    mergesAbsorbed: 0,
    connectorsPlaced: 0,
    flowMoves: 0
};

const results = {
    merges: 0,
    chains: 0,
    flowEfficiency: 0,
    flowMoves: 0,
    passed: false
};

let currentStageCleanup = null;
let lastResults = null;

const phaseItems = (() => {
    const map = new Map();
    phaseListEl?.querySelectorAll('li[data-stage]').forEach((li) => {
        map.set(li.dataset.stage, li);
    });
    return map;
})();

const refreshPhaseList = () => {
    STAGES.forEach((stage, idx) => {
        const item = phaseItems.get(stage.id);
        if (!item) return;
        item.classList.remove('active', 'cleared');
        if (state.clearedStages.has(stage.id)) {
            item.classList.add('cleared');
        } else if (idx === state.stageIndex) {
            item.classList.add('active');
        }
    });
};

const updateProgressSummary = () => {
    if (state.stageIndex < 0) {
        progressSummaryEl.textContent = '待启动';
        return;
    }
    const parts = [
        `${results.merges}/${mergeClusters.length} 组模块归并`,
        `${results.chains}/${chainSpecs.length} 条接口替换`,
        results.flowEfficiency > 0 ? `${results.flowEfficiency}% 数据效率` : '数据效率待测'
    ];
    progressSummaryEl.textContent = parts.join(' · ');
};

const resetGame = () => {
    if (currentStageCleanup) {
        currentStageCleanup();
        currentStageCleanup = null;
    }
    state.stageIndex = -1;
    state.clearedStages.clear();
    state.stageCompletePending = false;
    state.mergesAbsorbed = 0;
    state.connectorsPlaced = 0;
    state.flowMoves = 0;
    results.merges = 0;
    results.chains = 0;
    results.flowEfficiency = 0;
    results.flowMoves = 0;
    lastResults = null;

    stageIndexEl.textContent = '0';
    stageTitleEl.textContent = '初始化';
    stageDescEl.textContent = '准备进入代码库的深渊……';
    stageInstructionEl.textContent = '点击开始，深呼吸，稳住感官。';
    stageContentEl.innerHTML = '';
    stageContentEl.classList.add('empty');
    continueButton.hidden = true;
    startButton.disabled = false;
    restartButton.disabled = false;
    document.body.dataset.phase = 'idle';
    refreshPhaseList();
    updateProgressSummary();
    summaryPanel.classList.remove('show');
    summaryPanel.setAttribute('aria-hidden', 'true');
};

const goToStage = (index) => {
    if (index < 0 || index >= STAGES.length) return;
    if (currentStageCleanup) {
        currentStageCleanup();
        currentStageCleanup = null;
    }

    state.stageIndex = index;
    state.stageCompletePending = false;

    const stage = STAGES[index];
    stageIndexEl.textContent = String(index + 1);
    stageTitleEl.textContent = stage.title;
    stageDescEl.textContent = stage.description;
    stageInstructionEl.textContent = stage.instruction;
    stageContentEl.innerHTML = '';
    stageContentEl.classList.remove('empty');
    document.body.dataset.phase = stage.id;
    continueButton.hidden = true;

    refreshPhaseList();
    updateProgressSummary();

    const cleanup = stage.init();
    if (typeof cleanup === 'function') {
        currentStageCleanup = cleanup;
    }
};

const completeStage = (message = '阶段完成') => {
    const stage = STAGES[state.stageIndex];
    state.clearedStages.add(stage.id);
    state.stageCompletePending = true;
    refreshPhaseList();
    showToast(message);

    if (state.stageIndex >= STAGES.length - 1) {
        finalizeGame();
        return;
    }

    stageInstructionEl.textContent = '阶段净化完成。点击“继续巡检”进入下一重。';
    continueButton.hidden = false;
    continueButton.focus({ preventScroll: true });
};

const finalizeGame = () => {
    document.body.dataset.phase = 'complete';
    state.stageCompletePending = false;
    continueButton.hidden = true;
    stageInstructionEl.textContent = '黑色噪音彻底消散，纯白架构重新站稳。';

    const efficiency = results.flowEfficiency || Math.max(72, 100 - state.flowMoves * 6);
    results.flowEfficiency = efficiency;
    results.flowMoves = state.flowMoves;
    results.passed = results.merges >= mergeClusters.length && results.chains >= chainSpecs.length && efficiency >= 70;

    summaryNarrativeEl.textContent = results.passed
        ? '黑色有机体化为数据的尘埃，系统重新呼吸。'
        : '结构趋于稳定，但仍有细小噪音需日后再访。';
    summaryMergesEl.textContent = `${results.merges} 组`;
    summaryChainsEl.textContent = `${results.chains} 条`;
    summaryFlowEl.textContent = `${efficiency}%`;

    summaryPanel.classList.add('show');
    summaryPanel.setAttribute('aria-hidden', 'false');

    lastResults = {
        merges: results.merges,
        chains: results.chains,
        flowEfficiency: efficiency,
        flowMoves: results.flowMoves,
        passed: results.passed,
        totalStages: STAGES.length
    };
};

const startGame = () => {
    startButton.disabled = true;
    goToStage(0);
};

const handleContinue = () => {
    if (!state.stageCompletePending) return;
    const nextIndex = state.stageIndex + 1;
    if (nextIndex < STAGES.length) {
        goToStage(nextIndex);
    }
};

const completeGame = (payload = {}) => {
    postToParent({
        type: 'minigame:complete',
        payload: {
            ...payload,
            gameId: 'great_refactoring'
        }
    });
};

const handleExit = () => {
    exitToMenu();
};

const handleReturnToStory = () => {
    if (!lastResults) {
        finalizeGame();
    }
    completeGame(lastResults || {});
    exitToMenu();
};

const handleReplay = () => {
    summaryPanel.classList.remove('show');
    summaryPanel.setAttribute('aria-hidden', 'true');
    resetGame();
    startGame();
};

const handleInitMessage = (event) => {
    if (!isFile && event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'minigame:init') {
        if (data.payload?.params?.autoComplete) {
            const payload = {
                merges: mergeClusters.length,
                chains: chainSpecs.length,
                flowEfficiency: 100,
                flowMoves: 0,
                passed: true,
                autoComplete: true,
                totalStages: STAGES.length
            };
            results.merges = mergeClusters.length;
            results.chains = chainSpecs.length;
            results.flowEfficiency = 100;
            results.flowMoves = 0;
            results.passed = true;
            finalizeGame();
            completeGame(payload);
            startButton.disabled = true;
            continueButton.hidden = true;
            stageInstructionEl.textContent = '剧情要求自动完成，本次净化略过操作。';
            lastResults = payload;
        }
    }
};

/* ---------- 阶段一：合并同类项 ---------- */

const initMergeStage = () => {
    state.mergesAbsorbed = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'merge-wrapper';

    const pool = document.createElement('div');
    pool.className = 'merge-pool';

    const zone = document.createElement('div');
    zone.className = 'merge-zone';

    const mergeStatus = document.createElement('div');
    mergeStatus.className = 'merge-status';
    mergeStatus.textContent = '将黑色模块拖入此处压缩冗余。';

    const mergeOutput = document.createElement('div');
    mergeOutput.className = 'merge-output';

    zone.append(mergeStatus, mergeOutput);
    wrapper.append(pool, zone);
    stageContentEl.append(wrapper);

    const clusterOrder = shuffleArray([...mergeClusters.map((c) => c.id)]);
    let activeClusterIndex = 0;

    const clusterState = new Map();
    mergeClusters.forEach((cluster) => {
        const fragments = shuffleArray([...cluster.fragments]);
        clusterState.set(cluster.id, { ...cluster, progress: 0, fragments });
    });

    const cards = [];
    clusterOrder.forEach((clusterId) => {
        const cluster = clusterState.get(clusterId);
        cluster.fragments.forEach((fragment, idx) => {
            const card = document.createElement('div');
            card.className = 'module-card';
            card.draggable = true;
            card.dataset.cluster = clusterId;
            card.dataset.cardId = `${clusterId}-${idx}`;
            card.textContent = fragment;

            card.addEventListener('dragstart', (event) => {
                if (!isClusterActive(clusterId)) {
                    event.preventDefault();
                    showToast('先完成当前重构，再处理下一簇。');
                    return;
                }
                event.dataTransfer.setData('text/x-refactor-card', card.dataset.cardId);
                event.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dblclick', () => {
                if (!isClusterActive(clusterId)) {
                    showToast('请先完成当前簇的重构。');
                    return;
                }
                processCard(card);
            });

            cards.push(card);
        });
    });

    shuffleArray(cards).forEach((card) => pool.append(card));

    const currentClusterId = () => clusterOrder[Math.min(activeClusterIndex, clusterOrder.length - 1)];
    const isClusterActive = (clusterId) => clusterId === currentClusterId();
    const advanceCluster = () => {
        activeClusterIndex += 1;
    };

    if (clusterOrder.length) {
        const firstCluster = clusterState.get(currentClusterId());
        stageInstructionEl.textContent = `优先处理：${firstCluster?.title || '当前簇'}`;
        mergeStatus.textContent = `${firstCluster?.title || '当前簇'} · 0/${firstCluster?.fragments.length || 0}`;
    }

    const processCard = (card) => {
        if (!card || card.dataset.state === 'absorbed') return;
        const clusterId = card.dataset.cluster;
        const cluster = clusterState.get(clusterId);
        if (!cluster) return;
        if (!isClusterActive(clusterId)) {
            showToast('请先完成当前簇的净化。');
            return;
        }

        card.dataset.state = 'absorbed';
        card.style.pointerEvents = 'none';
        setTimeout(() => {
            card.remove();
        }, 180);

        cluster.progress += 1;
        mergeStatus.textContent = `${cluster.title} · ${cluster.progress}/${cluster.fragments.length}`;

        if (cluster.progress === cluster.fragments.length) {
            results.merges += 1;
            updateProgressSummary();
            const cleanModule = document.createElement('div');
            cleanModule.className = 'clean-module';
            cleanModule.textContent = cluster.clean;
            mergeOutput.append(cleanModule);
            showToast(`${cluster.title} 已重构`);
            advanceCluster();
            const nextClusterId = currentClusterId();
            const nextCluster = clusterState.get(nextClusterId);
            if (nextCluster) {
                stageInstructionEl.textContent = `继续净化：${nextCluster.title}`;
                mergeStatus.textContent = `${nextCluster.title} · ${nextCluster.progress}/${nextCluster.fragments.length}`;
            }
        }

        const allCleared = Array.from(clusterState.values()).every((entry) => entry.progress >= entry.fragments.length);
        if (allCleared) {
            stageInstructionEl.textContent = '冗余模块全部收束，系统回归洁白。';
            setTimeout(() => completeStage('冗余模块全部收束。'), 460);
        } else {
            stageInstructionEl.textContent = `继续吸收剩余的黑色碎片（${results.merges}/${mergeClusters.length}）`;
        }
    };

    zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('hover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('hover');
    });

    zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('hover');
        const cardId = event.dataTransfer.getData('text/x-refactor-card');
        if (!cardId) return;
        const card = pool.querySelector(`[data-card-id="${cardId}"]`);
        if (card) {
            if (!isClusterActive(card.dataset.cluster)) {
                showToast('请先完成当前簇的净化。');
                return;
            }
            processCard(card);
        }
    });

    return () => {
        zone.replaceWith(zone.cloneNode(false));
    };
};

/* ---------- 阶段二：切断硬编码 ---------- */

const initChainStage = () => {
    state.connectorsPlaced = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'chains-wrapper';

    const board = document.createElement('div');
    board.className = 'chain-board';

    const pool = document.createElement('div');
    pool.className = 'interface-pool';

    const poolTitle = document.createElement('h4');
    poolTitle.textContent = '接口池';
    const tokensWrap = document.createElement('div');
    tokensWrap.className = 'connector-tokens';

    pool.append(poolTitle, tokensWrap);

    const chainState = {
        cut: 0,
        replaced: 0
    };

    const totalChains = chainSpecs.length;
    const randomizedChains = shuffleArray(chainSpecs);

    const updateInstruction = () => {
        if (chainState.cut < totalChains) {
            stageInstructionEl.textContent = `已切断 ${chainState.cut}/${totalChains} 条锁链，继续按住剩余锁链完成切割。`;
        } else if (chainState.replaced < totalChains) {
            stageInstructionEl.textContent = '所有锁链已断开，将接口令牌拖入每个模块之间的插槽。';
        }
    };

    randomizedChains.forEach((spec) => {
        const row = document.createElement('div');
        row.className = 'chain-row';
        row.dataset.chainId = spec.id;
        row.dataset.state = 'armed';

        const left = document.createElement('div');
        left.className = 'module-block';
        left.textContent = spec.source;

        const link = document.createElement('button');
        link.className = 'chain-link';
        link.type = 'button';
        link.title = '按住以切断硬编码锁链';

        const right = document.createElement('div');
        right.className = 'module-block';
        right.textContent = spec.target;

        const slot = document.createElement('div');
        slot.className = 'connector-slot';
        slot.textContent = '锁链未切断';
        slot.dataset.expected = spec.id;

        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = `${spec.label}`;

        row.append(left, link, right, slot, hint);
        board.append(row);

        let holdTimer = null;

        const cutChain = () => {
            if (row.dataset.state === 'cut') return;
            row.dataset.state = 'cut';
            chainState.cut += 1;
            slot.classList.add('ready');
            slot.textContent = '锁链已切断，等待接口接入';
            showToast(`${spec.interface} 的接入窗口已开启`);
            updateInstruction();
            if (chainState.cut === totalChains) {
                stageInstructionEl.textContent = '锁链全部断开，将接口拖入相应插槽完成替换。';
            }
        };

        link.addEventListener('pointerdown', (event) => {
            if (row.dataset.state === 'cut') return;
            link.setPointerCapture(event.pointerId);
            row.dataset.state = 'armed';
            holdTimer = setTimeout(() => {
                cutChain();
                holdTimer = null;
            }, 420);
        });

        const clearHold = (event) => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            try {
                link.releasePointerCapture(event.pointerId);
            } catch {
                /* ignore */
            }
        };

        link.addEventListener('pointerup', clearHold);
        link.addEventListener('pointerleave', clearHold);

        slot.addEventListener('dragover', (event) => {
            if (slot.classList.contains('ready') && !slot.classList.contains('filled')) {
                event.preventDefault();
                slot.classList.add('hover');
            }
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('hover');
        });

        slot.addEventListener('drop', (event) => {
            event.preventDefault();
            slot.classList.remove('hover');
            if (!slot.classList.contains('ready')) {
                showToast('先切断这条锁链');
                return;
            }
            if (slot.classList.contains('filled')) {
                showToast('接口已接入');
                return;
            }
            const tokenId = event.dataTransfer.getData('text/x-interface-token');
            if (!tokenId) return;
            if (tokenId !== slot.dataset.expected) {
                showToast('接口规格不匹配');
                return;
            }
            const token = tokensWrap.querySelector(`[data-token-id="${tokenId}"]`);
            if (!token) return;
            token.dataset.state = 'used';
            token.draggable = false;
            token.remove();
            slot.classList.add('filled');
            slot.textContent = `接口 ${spec.interface} 已接入`;
            chainState.replaced += 1;
            state.connectorsPlaced = chainState.replaced;
            results.chains = chainState.replaced;
            updateProgressSummary();
            showToast(`${spec.interface} 接入成功`);
            if (chainState.replaced === totalChains) {
                stageInstructionEl.textContent = '硬编码全部替换完成，噪音进一步减弱。';
                setTimeout(() => completeStage('接口全部替换完毕。'), 520);
            }
        });
    });

    const randomizedTokens = shuffleArray(chainSpecs);

    randomizedTokens.forEach((spec) => {
        const token = document.createElement('div');
        token.className = 'interface-token';
        token.textContent = spec.interface;
        token.draggable = true;
        token.dataset.tokenId = spec.id;
        token.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/x-interface-token', token.dataset.tokenId);
            event.dataTransfer.effectAllowed = 'move';
        });
        tokensWrap.append(token);
    });

    wrapper.append(board, pool);
    stageContentEl.append(wrapper);

    updateInstruction();

    return () => {
        /* no persistent listeners outside element scope */
    };
};

/* ---------- 阶段三：理顺数据流 ---------- */

const initFlowStage = () => {
    state.flowMoves = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'flow-wrapper';

    const board = document.createElement('div');
    board.className = 'flow-board';

    const description = document.createElement('div');
    description.className = 'flow-description';
    const descTitle = document.createElement('h4');
    descTitle.textContent = '数据流提示';
    const descCopy = document.createElement('p');
    descCopy.textContent = '旋转节点让光流直达终端。节点转为洁白光晕，表示路径已经被净化。';
    const descList = document.createElement('ul');
    descList.innerHTML = '<li>入口 → 冗余栈 → 调度主干 → 缓存出口 → 终端</li><li>尽量减少旋转次数，提高效率。</li>';
    description.append(descTitle, descCopy, descList);

    const flowNodes = [
        { id: 'start', row: 0, col: 0, type: 'start', label: '入口' },
        { id: 'node-a', row: 0, col: 1, type: 'corner', states: FLOW_STATES.corner, stateIndex: 2, correctIndex: 1, label: '冗余栈' },
        { id: 'void-0', row: 0, col: 2, type: 'void' },
        { id: 'void-1', row: 1, col: 0, type: 'void' },
        { id: 'node-b', row: 1, col: 1, type: 'straight', states: FLOW_STATES.straight, stateIndex: 0, correctIndex: 1, label: '调度主干' },
        { id: 'node-c', row: 1, col: 2, type: 'corner', states: FLOW_STATES.corner, stateIndex: 2, correctIndex: 1, label: '日志支线' },
        { id: 'void-2', row: 2, col: 0, type: 'void' },
        { id: 'node-d', row: 2, col: 1, type: 'corner', states: FLOW_STATES.corner, stateIndex: 0, correctIndex: 3, label: '缓存出口' },
        { id: 'end', row: 2, col: 2, type: 'end', label: '终端' }
    ];

    const GRID_ROWS = 3;
    const GRID_COLS = 3;

    const nodeMap = new Map();
    flowNodes.forEach((node) => nodeMap.set(`${node.row}-${node.col}`, node));

    for (let row = 0; row < GRID_ROWS; row += 1) {
        for (let col = 0; col < GRID_COLS; col += 1) {
            const node = nodeMap.get(`${row}-${col}`);
            if (!node) {
                const voidEl = document.createElement('div');
                voidEl.className = 'flow-node locked';
                voidEl.dataset.shape = 'void';
                board.append(voidEl);
                continue;
            }

            const el = document.createElement('div');
            el.className = 'flow-node';
            el.dataset.shape = node.type;
            if (node.type === 'start' || node.type === 'end') {
                el.classList.add(node.type === 'start' ? 'start' : 'end');
                const mark = document.createElement('div');
                mark.className = 'flow-node-endpoint';
                mark.textContent = node.type === 'start' ? '起' : '终';
                el.append(mark);
            } else if (node.type === 'void') {
                el.classList.add('locked');
            } else {
                node.states = Array.isArray(node.states) && node.states.length ? node.states : (FLOW_STATES[node.type] || []);
                if (!node.states.length) {
                    node.states = [{ angle: 0, directions: [] }];
                }
                if (!Number.isInteger(node.stateIndex)) {
                    node.stateIndex = 0;
                }
                node.stateIndex = ((node.stateIndex % node.states.length) + node.states.length) % node.states.length;
                if (!Number.isInteger(node.correctIndex) || node.correctIndex < 0 || node.correctIndex >= node.states.length) {
                    node.correctIndex = 0;
                }

                const pipeSvg = createPipeSvg(node.type);
                if (pipeSvg) {
                    node.pipeEl = pipeSvg;
                    el.append(pipeSvg);
                }

                el.title = `旋转 ${node.label}`;
                el.setAttribute('role', 'button');
                el.setAttribute('tabindex', '0');
                el.addEventListener('click', () => {
                    rotateNode(node);
                });
                el.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        rotateNode(node);
                    }
                });
            }
            node.element = el;
            updateNodeVisual(node);
            board.append(el);
        }
    }

    wrapper.append(board, description);
    stageContentEl.append(wrapper);

    function rotateNode(node) {
        if (!node.states || !node.states.length || !node.element) return;
        node.stateIndex = (node.stateIndex + 1) % node.states.length;
        state.flowMoves += 1;
        updateNodeVisual(node);
        checkSolved();
    }

    function updateNodeVisual(node) {
        if (!node.element) return;
        if (!node.states || !node.states.length) {
            node.element.classList.toggle('locked', node.type !== 'start' && node.type !== 'end');
            return;
        }
        const index = ((node.stateIndex % node.states.length) + node.states.length) % node.states.length;
        node.stateIndex = index;
        const stateDef = node.states[index];
        if (node.pipeEl) {
            node.pipeEl.style.transform = `rotate(${stateDef.angle}deg)`;
        }
        node.element.dataset.state = String(index);
        const correct = index === node.correctIndex;
        node.element.classList.toggle('flow-node--correct', correct);
    }

    function checkSolved() {
        const solved = flowNodes.every((node) => {
            if (!node.states || !node.states.length) return true;
            return node.stateIndex === node.correctIndex;
        });
        if (solved) {
            results.flowEfficiency = Math.max(72, 100 - state.flowMoves * 6);
            updateProgressSummary();
            stageInstructionEl.textContent = '数据流归于最短路径，黑色血管萎缩殆尽。';
            setTimeout(() => completeStage('数据流回归最短路径。'), 560);
        } else {
            stageInstructionEl.textContent = `旋转节点，减少折返。当前调整次数：${state.flowMoves}`;
        }
    }

    return () => {
        /* nothing to clean explicitly */
    };
};

/* ---------- 事件绑定 ---------- */

startButton?.addEventListener('click', startGame);
continueButton?.addEventListener('click', handleContinue);
restartButton?.addEventListener('click', () => {
    resetGame();
});
exitButton?.addEventListener('click', handleExit);
replayButton?.addEventListener('click', handleReplay);
backToStoryButton?.addEventListener('click', handleReturnToStory);

window.addEventListener('message', handleInitMessage);

postToParent({ type: 'minigame:ready', gameId: 'great_refactoring' });

resetGame();

if (!hasParent) {
    setTimeout(() => {
        showToast('独立模式：退出时会返回主菜单页面。');
    }, 600);
}
