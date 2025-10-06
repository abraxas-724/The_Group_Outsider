import { applyEmbedBehavior, isEmbedded } from '../shared/embed-utils.js';

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
    if (!hasParent) {
        return;
    }
    try {
        window.parent.postMessage(message, parentOrigin);
    } catch (err) {
        console.warn('无法通知父级窗口:', err);
    }
};

const toastEl = document.getElementById('toast');
let toastTimer = null;
const showToast = (text) => {
    if (!toastEl) {
        return;
    }
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

const PERFECT_WINDOW = 180;
const GOOD_WINDOW = 360;

const patterns = [
    {
        id: 'warmup',
        title: 'Warm-up Loop',
        bpm: 84,
        beats: 8,
        lines: [
            'int focus = 0;',
            'for (int i = 0; i < 4; ++i) {',
            '    focus += tempo[i];',
            '}'
        ]
    },
    {
        id: 'branch',
        title: 'Branch Balance',
        bpm: 92,
        beats: 10,
        lines: [
            'if (tick % 2 == 0) {',
            '    buffer.push_back(mainTick);',
            '} else {',
            '    buffer.push_back(calmTick);',
            '}'
        ]
    },
    {
        id: 'labeling',
        title: 'Task Label Flow',
        bpm: 96,
        beats: 12,
        lines: [
            'TaskTag tag;',
            'tag.state = done ? "cool" : "pending";',
            'tag.offset = clamp(noise, 0, limit);',
            'return tag;'
        ]
    }
];

patterns.forEach((pattern) => {
    pattern.interval = 60000 / pattern.bpm;
});

const totalBeats = patterns.reduce((sum, pattern) => sum + pattern.beats, 0);

const metronomeArm = document.getElementById('metronomeArm');
const beatPulse = document.getElementById('beatPulse');
const patternTitle = document.getElementById('patternTitle');
const codeLines = document.getElementById('codeLines');
const statusLabel = document.getElementById('statusLabel');
const beatCounter = document.getElementById('beatCounter');
const scorePerfectEl = document.getElementById('scorePerfect');
const scoreGoodEl = document.getElementById('scoreGood');
const scoreMissEl = document.getElementById('scoreMiss');
const accuracyLabel = document.getElementById('accuracyLabel');
const feedbackEl = document.getElementById('feedback');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const exitButton = document.getElementById('exitGame');
const replayButton = document.getElementById('replayButton');
const backToStoryButton = document.getElementById('backToStory');
const summaryPanel = document.getElementById('summaryPanel');
const summaryTitle = document.getElementById('summaryTitle');
const summaryBody = document.getElementById('summaryBody');

const audioCtx = (() => {
    if (typeof window.AudioContext === 'function') {
        return new AudioContext();
    }
    if (typeof window.webkitAudioContext === 'function') {
        return new window.webkitAudioContext();
    }
    return null;
})();

const score = { perfect: 0, good: 0, miss: 0 };
let patternIndex = 0;
let currentPattern = null;
let currentBeatIndex = 0;
let awaitingInput = false;
let lastBeatTime = 0;
let beatTimer = null;
let isRunning = false;
let isPaused = false;
let processedBeats = 0;
let swingLeft = true;
let lastResults = null;

const playTick = () => {
    if (!audioCtx) {
        return;
    }
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
        console.warn('tick 声音生成失败:', err);
    }
};

const updateScoreboard = () => {
    scorePerfectEl.textContent = String(score.perfect);
    scoreGoodEl.textContent = String(score.good);
    scoreMissEl.textContent = String(score.miss);
    const weighted = score.perfect + score.good * 0.6;
    const accuracy = totalBeats > 0 ? Math.max(0, Math.min(100, Math.round((weighted / totalBeats) * 100))) : 0;
    accuracyLabel.textContent = `${accuracy}%`;
    return accuracy;
};

const resetHighlights = () => {
    codeLines.querySelectorAll('span').forEach((span) => span.classList.remove('active'));
};

const highlightLine = (lineIndex) => {
    const spans = codeLines.querySelectorAll('span');
    spans.forEach((span, idx) => {
        span.classList.toggle('active', idx === lineIndex);
    });
};

const renderPattern = (pattern) => {
    patternTitle.textContent = `${pattern.title} · ${pattern.bpm} BPM`;
    const frag = document.createDocumentFragment();
    pattern.lines.forEach((line) => {
        const span = document.createElement('span');
        span.textContent = line;
        frag.appendChild(span);
    });
    codeLines.innerHTML = '';
    codeLines.appendChild(frag);
};

const updateBeatCounter = (current, total) => {
    beatCounter.textContent = `${current} / ${total}`;
};

const setFeedback = (text, mode = '') => {
    feedbackEl.textContent = text;
    feedbackEl.className = 'feedback';
    if (mode) {
        feedbackEl.classList.add(mode);
    }
};

const registerJudgement = (type) => {
    score[type] += 1;
    const accuracy = updateScoreboard();
    if (type === 'perfect') {
        setFeedback('PERFECT', 'perfect');
    } else if (type === 'good') {
        setFeedback('GOOD', 'good');
    } else {
        setFeedback('MISS', 'miss');
    }
    return accuracy;
};

const handleMiss = () => {
    if (!awaitingInput) {
        return;
    }
    awaitingInput = false;
    registerJudgement('miss');
};

const animateBeat = (pattern) => {
    if (metronomeArm) {
        const angle = swingLeft ? -26 : 26;
        metronomeArm.style.transform = `rotate(${angle}deg)`;
        swingLeft = !swingLeft;
    }
    if (beatPulse) {
        beatPulse.classList.add('active');
        setTimeout(() => beatPulse.classList.remove('active'), 200);
    }
    if (pattern.lines.length > 0) {
        const highlightIndex = currentBeatIndex % pattern.lines.length;
        highlightLine(highlightIndex);
    }
};

const clearTimer = () => {
    if (beatTimer) {
        clearTimeout(beatTimer);
        beatTimer = null;
    }
};

const stopRun = () => {
    clearTimer();
    awaitingInput = false;
    isRunning = false;
    isPaused = false;
};

const resetGame = () => {
    stopRun();
    score.perfect = 0;
    score.good = 0;
    score.miss = 0;
    patternIndex = 0;
    processedBeats = 0;
    currentBeatIndex = 0;
    lastResults = null;
    swingLeft = true;
    updateScoreboard();
    updateBeatCounter(0, totalBeats);
    statusLabel.textContent = '等待开始';
    patternTitle.textContent = '未开始';
    codeLines.innerHTML = '';
    setFeedback('按下开始，聆听节拍');
    if (metronomeArm) {
        metronomeArm.style.transform = 'rotate(0deg)';
    }
    pauseButton.textContent = '暂停节拍';
    pauseButton.disabled = true;
    startButton.disabled = false;
    summaryPanel.classList.remove('show');
};

const finishSession = () => {
    stopRun();
    statusLabel.textContent = '节拍结束';
    pauseButton.disabled = true;
    startButton.disabled = false;
    const accuracy = updateScoreboard();
    const passed = accuracy >= 60 && score.miss <= Math.floor(totalBeats * 0.4);
    summaryTitle.textContent = passed ? '节奏稳定' : '节奏失衡';
    summaryBody.textContent = passed
        ? '噪音退去，逻辑重新回到了掌控之中。你已经准备好回到战场。'
        : '节奏仍有些杂音。可以选择重新调整，或带着这份余热继续前进。';
    summaryPanel.classList.add('show');
    lastResults = {
        perfect: score.perfect,
        good: score.good,
        miss: score.miss,
        totalBeats,
        accuracy,
        passed
    };
};

const proceedToNextPattern = () => {
    if (patternIndex >= patterns.length) {
        finishSession();
        return;
    }
    currentPattern = patterns[patternIndex];
    currentBeatIndex = 0;
    renderPattern(currentPattern);
    statusLabel.textContent = `小节 ${patternIndex + 1} · ${currentPattern.title}`;
    highlightLine(-1);
    setTimeout(() => runBeat(0), 420);
};

const runBeat = (index) => {
    if (!isRunning || isPaused) {
        currentBeatIndex = index;
        return;
    }
    if (index > 0 && awaitingInput) {
        handleMiss();
    }
    if (index >= currentPattern.beats) {
        if (awaitingInput) {
            handleMiss();
        }
        processedBeats += currentPattern.beats;
        patternIndex += 1;
        setTimeout(() => proceedToNextPattern(), 520);
        return;
    }
    awaitingInput = true;
    currentBeatIndex = index;
    lastBeatTime = performance.now();
    animateBeat(currentPattern);
    playTick();
    updateBeatCounter(processedBeats + index + 1, totalBeats);
    beatTimer = setTimeout(() => runBeat(index + 1), currentPattern.interval);
};

const handleHit = () => {
    if (!isRunning || isPaused || !awaitingInput) {
        return;
    }
    const delta = Math.abs(performance.now() - lastBeatTime);
    awaitingInput = false;
    if (delta <= PERFECT_WINDOW) {
        registerJudgement('perfect');
    } else if (delta <= GOOD_WINDOW) {
        registerJudgement('good');
    } else {
        registerJudgement('miss');
    }
};

const startSession = async () => {
    resetGame();
    if (audioCtx && audioCtx.state === 'suspended') {
        try {
            await audioCtx.resume();
        } catch (err) {
            console.warn('音频上下文恢复失败:', err);
        }
    }
    startButton.disabled = true;
    pauseButton.disabled = false;
    statusLabel.textContent = '节拍准备中';
    isRunning = true;
    isPaused = false;
    processedBeats = 0;
    patternIndex = 0;
    setFeedback('保持呼吸，感受滴答');
    setTimeout(() => proceedToNextPattern(), 680);
};

const togglePause = () => {
    if (!isRunning) {
        return;
    }
    if (!isPaused) {
        isPaused = true;
        clearTimer();
        awaitingInput = false;
        pauseButton.textContent = '继续节拍';
        statusLabel.textContent = '节拍暂停';
        setFeedback('暂停中，随时继续');
        showToast('节拍已暂停');
    } else {
        isPaused = false;
        pauseButton.textContent = '暂停节拍';
        statusLabel.textContent = `小节 ${patternIndex + 1} · ${currentPattern.title}`;
        setFeedback('节拍继续');
        showToast('节拍继续');
        runBeat(currentBeatIndex);
    }
};

const completeGame = (payload = {}) => {
    postToParent({
        type: 'minigame:complete',
        payload: {
            ...payload,
            gameId: 'code_beat'
        }
    });
};

const handleReplay = () => {
    summaryPanel.classList.remove('show');
    startSession();
};

const handleReturnToStory = () => {
    if (!lastResults) {
        lastResults = {
            perfect: score.perfect,
            good: score.good,
            miss: score.miss,
            totalBeats,
            accuracy: updateScoreboard(),
            passed: false
        };
    }
    completeGame(lastResults);
    exitToMenu();
};

const handleExit = () => {
    exitToMenu();
};

const handleInitMessage = (event) => {
    if (!isFile && event.origin !== window.location.origin) {
        return;
    }
    const data = event.data || {};
    if (data.type === 'minigame:init' && data.payload?.params?.autoComplete) {
            const payload = {
                perfect: totalBeats,
                good: 0,
                miss: 0,
                totalBeats,
                accuracy: 100,
                passed: true,
                autoComplete: true
            };
            completeGame(payload);
            summaryTitle.textContent = '自动完成';
            summaryBody.textContent = '剧情要求自动完成，本轮节奏默认通过。';
            summaryPanel.classList.add('show');
            lastResults = payload;
            stopRun();
            startButton.disabled = true;
            pauseButton.disabled = true;
            setFeedback('自动完成模式');
    }
};

if (startButton) {
    startButton.addEventListener('click', startSession);
}

if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
}

if (exitButton) {
    exitButton.addEventListener('click', handleExit);
}

if (replayButton) {
    replayButton.addEventListener('click', handleReplay);
}

if (backToStoryButton) {
    backToStoryButton.addEventListener('click', handleReturnToStory);
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'KeyJ') {
        event.preventDefault();
        handleHit();
        return;
    }
    if (event.code === 'Escape') {
        exitToMenu();
    }
});

window.addEventListener('blur', () => {
    if (isRunning && !isPaused) {
        togglePause();
    }
});

window.addEventListener('message', handleInitMessage);

postToParent({ type: 'minigame:ready', gameId: 'code_beat' });

resetGame();

if (!hasParent) {
    setTimeout(() => {
        showToast('独立模式：完成后可手动关闭窗口。');
    }, 600);
}

// 嵌入模式下替换“返回主菜单”为“跳过”
applyEmbedBehavior('code_beat', { exitSelectors: ['#exitGame', '#backToStory'] });
