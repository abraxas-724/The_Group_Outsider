/* 粒子背景系统 */
const particlesCanvas = document.getElementById('particles-canvas');
if (particlesCanvas) {
    const particlesCtx = particlesCanvas.getContext('2d');
    const particlesArray = [];
    const numberOfParticles = 100;

    const resizeParticlesCanvas = () => {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    };

    class Particle {
        constructor() {
            this.reset(true);
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 1 - 1;
            this.speedY = Math.random() * 1 - 1;
        }

        reset(initial = false) {
            if (initial) {
                this.x = Math.random() * particlesCanvas.width;
                this.y = Math.random() * particlesCanvas.height;
            } else {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * window.innerHeight;
            }
            this.color = `hsl(${Math.random() * 60 + 180}, 70%, 50%)`;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > particlesCanvas.width) this.x = 0;
            if (this.x < 0) this.x = particlesCanvas.width;
            if (this.y > particlesCanvas.height) this.y = 0;
            if (this.y < 0) this.y = particlesCanvas.height;
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const connectParticles = () => {
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                const dx = particlesArray[a].x - particlesArray[b].x;
                const dy = particlesArray[a].y - particlesArray[b].y;
                const distance = dx * dx + dy * dy;
                if (distance < (particlesCanvas.width / 15) * (particlesCanvas.height / 15)) {
                    const opacityValue = 1 - (distance / 10000);
                    particlesCtx.strokeStyle = `rgba(100, 200, 255, ${opacityValue})`;
                    particlesCtx.lineWidth = 0.5;
                    particlesCtx.beginPath();
                    particlesCtx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    particlesCtx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    particlesCtx.stroke();
                }
            }
        }
    };

    const animateParticles = () => {
        particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw(particlesCtx);
        }
        connectParticles();
        requestAnimationFrame(animateParticles);
    };

    resizeParticlesCanvas();
    window.addEventListener('resize', resizeParticlesCanvas);
    window.addEventListener('orientationchange', resizeParticlesCanvas);

    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }

    animateParticles();
}

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

const completeGame = (payload = {}) => {
    postToParent({
        type: 'minigame:complete',
        payload: {
            ...payload,
            gameId: 'logic_mending'
        }
    });
};

const exitToMenu = () => {
    if (hasParent) {
        postToParent({ type: 'minigame:exit' });
    } else {
        window.location.href = '../../start.html';
    }
};

postToParent({ type: 'minigame:ready', gameId: 'logic_mending' });

const btnReturn = document.getElementById('btnReturn');
if (btnReturn) {
    btnReturn.addEventListener('click', () => {
        exitToMenu();
    });
}

const overlayMessageDefault = document.getElementById('overlayMessage');
if (!hasParent && overlayMessageDefault) {
    overlayMessageDefault.hidden = false;
    overlayMessageDefault.textContent = '独立模式：点击“返回主菜单”可回到开始界面。';
}

const gameStats = {
    totalLevels: 0,
    levelsCleared: 0,
    failures: 0
};

let autoCompleteMode = false;

/* ========================= 1. 基础初始化 ========================= */
const canvas = document.getElementById('gameCanvas');
const WW = 10000, WH = 10000;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (typeof Matter === 'undefined') {
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');
    const overlayMessage = document.getElementById('overlayMessage');
    const btnRestart = document.getElementById('btnRestart');
    if (overlay && overlayText && btnRestart) {
        overlayText.innerText = '⚙️ Matter.js 未加载';
        btnRestart.innerText = '刷新重试';
        btnRestart.onclick = () => location.reload();
        overlay.style.display = 'flex';
    }
    if (overlayMessage) {
        overlayMessage.hidden = false;
        overlayMessage.textContent = '请确认网络可访问 jsDelivr CDN，或改为本地引入 matter.min.js。';
    }
    throw new Error('Matter.js 未加载');
}

const { Engine, Render, Runner, Bodies, Body, World, Mouse, MouseConstraint, Events, Query } = Matter;
const engine = Engine.create();
const world = engine.world;
const runner = Runner.create();
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: canvas.width,
        height: canvas.height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: window.devicePixelRatio
    }
});
Render.run(render);
Runner.run(runner, engine);

const camera = { x: 0, y: 0 };
function updateCamera() {
    const { position } = player;
    camera.x = Math.max(0, Math.min(position.x - canvas.width / 2, WW - canvas.width));
    camera.y = Math.max(0, Math.min(position.y - canvas.height / 2, WH - canvas.height));
    render.options.hasBounds = true;
    Render.lookAt(render, {
        min: { x: camera.x, y: camera.y },
        max: { x: camera.x + canvas.width, y: camera.y + canvas.height }
    });
}

/* ========================= 2. 资源加载 ========================= */
const TEX = {};
['dirt', 'ore', 'danger', 'goal', 'moveDanger'].forEach(name => {
    const img = new Image();
    img.src = `assets/${name}.png`;
    img.onerror = () => img.failed = true;
    TEX[name] = img;
});
TEX.j = TEX.dirt;

const patterns = {};
Promise.all(Object.values(TEX).map(img => {
    return new Promise(res => {
        if (img.complete) res(img);
        else { img.onload = () => res(img); img.onerror = res; }
    });
})).then(() => {
    Object.keys(TEX).forEach(k => {
        if (!TEX[k].failed) patterns[k] = render.context.createPattern(TEX[k], 'repeat');
    });
});

/* ========================= 3. 玩家 ========================= */
const player = Bodies.rectangle(120, WH - 300, 80, 48, {
    frictionAir: 0.01, friction: 0.001, restitution: 0,
    label: 'player',
    chamfer: { radius: 6 },
    render: { fillStyle: '#ff7f50', strokeStyle: '#fff', lineWidth: 2 }
});
World.add(world, player);

/* ========================= 4. 边界 ========================= */
World.add(world, [
    Bodies.rectangle(WW / 2, WH - 20, WW, 40, { isStatic: true, label: 'ground' }),
    Bodies.rectangle(-20, WH / 2, 40, WH, { isStatic: true }),
    Bodies.rectangle(WW + 20, WH / 2, 40, WH, { isStatic: true })
]);

/* ========================= 5. 隐形安全地面 ========================= */
let safeGround;

/* ========================= 6. 解析CSV ========================= */
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const last = lines[lines.length - 1].trim();
    let failMsg = '💀 你失败了！';
    if (last && last.split(',').length === 1) {
        failMsg = last.replace(/^"|"$/g, '');
        lines.pop();
    }
    return { map: lines.map(r => r.split(',').map(c => c.trim())), failMsg };
}

/* ========================= 7. 方块样式 ========================= */
const fallbackColor = {
    dirt: '#C0C3C0',
    ore: '#C0C0C0',
    danger: '#ff0000',
    goal: 'rgba(0,255,0,0.15)',
    moveDanger: 'rgba(220,20,60,0.9)',
    j: '#C0C9C9'
};

/* ========================= 8. 建图 ========================= */
const blocks = [];
let mapLibrary = [];

const triggerAutoComplete = () => {
    if (!mapLibrary.length) return false;
    completeGame({
        totalLevels: mapLibrary.length,
        levelsCleared: mapLibrary.length,
        failures: 0,
        passed: true,
        autoComplete: true
    });
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');
    const btnRestart = document.getElementById('btnRestart');
    if (overlay && overlayText && btnRestart) {
        overlayText.innerText = '✅ 剧情需求：已自动修复节点';
        btnRestart.innerText = '返回主菜单';
        btnRestart.onclick = () => exitToMenu();
        overlay.style.display = 'flex';
    }
    return true;
};
let currentLevel = 0;
const BLOCK = 80;
const moveDangerList = [];
const MOVE_SPEED = 2 * BLOCK / 60;

function createMapFromArray(mapArr, offsetX = 0, offsetY = WH - mapArr.length * BLOCK) {
    blocks.forEach(b => World.remove(world, b));
    if (safeGround) World.remove(world, safeGround);
    blocks.length = 0;
    moveDangerList.length = 0;

    for (let y = 0; y < mapArr.length; y++) {
        for (let x = 0; x < mapArr[y].length; x++) {
            const type = mapArr[y][x];
            if (type === '' || type === ' ') continue;

            let label = 'dirt', tex = 'dirt';
            if (type === 'o') { label = 'ore'; tex = 'ore'; }
            if (type === 'R') { label = 'danger'; tex = 'danger'; }
            if (type === 'g') { label = 'goal'; tex = 'goal'; }
            if (type === 'M') { label = 'moveDanger'; tex = 'moveDanger'; }
            if (type === 'm') { label = 'moveDanger'; tex = 'moveDanger'; }
            if (type === 'j') { label = 'j'; tex = 'j'; }

            const opts = {
                isStatic: type !== 'M',
                label,
                render: {
                    fillStyle: patterns[tex] || fallbackColor[tex],
                    strokeStyle: '#000',
                    lineWidth: 1
                }
            };
            if (label === 'goal') opts.isSensor = true;

            const b = Bodies.rectangle(
                offsetX + x * BLOCK + BLOCK / 2,
                offsetY + y * BLOCK + BLOCK / 2,
                BLOCK, BLOCK, opts
            );
            blocks.push(b);
            if (label === 'moveDanger') {
                b._moveCenterX = b.position.x;
                b._moveRange = 2 * BLOCK;
                b._moveDir = 1;
                moveDangerList.push(b);
            }
        }
    }

    safeGround = Bodies.rectangle(WW / 2, WH + 40, WW, 80, { isStatic: true, render: { visible: false } });
    World.add(world, [safeGround, ...blocks]);
}

/* ========================= 9. 关卡加载 ========================= */
function loadLevel(idx) {
    if (idx >= mapLibrary.length) {
        document.getElementById('overlayText').innerText = '🏆 全部通关！';
        document.getElementById('btnRestart').innerText = '重新开始';
        document.getElementById('btnRestart').onclick = () => location.reload();
        document.getElementById('overlay').style.display = 'flex';
        return;
    }
    const { map, failMsg } = parseCSV(mapLibrary[idx]);
    createMapFromArray(map);
    Body.setPosition(player, { x: 120, y: WH - 300 });
    Body.setVelocity(player, { x: 0, y: 0 });
    currentLevel = idx;
    document.getElementById('level').innerText = `${currentLevel + 1} / ${mapLibrary.length}`;
    window.currentFailMsg = failMsg;
    window.gameOver = false;
    controlLoop();
}

/* ========================= 10. 鼠标挖土（粒子特效） ========================= */
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, { mouse });
World.add(world, mouseConstraint);

const particles = [];
let lastJBlock = null; // 记录最近一次被点击的j块中心

function createParticles(x, y, count, color, isDeadly = false) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 10 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40;
        const left = x + Math.cos(angle) * distance - size / 2;
        const top = y + Math.sin(angle) * distance - size / 2;
        particle.style.left = `${left}px`;
        particle.style.top = `${top}px`;
        particle.style.background = color;
        particle.style.position = 'fixed';
        particle.style.pointerEvents = 'none';
        particle.style.borderRadius = '50%';
        document.body.appendChild(particle);
        particles.push({
            element: particle,
            x: left,
            y: top,
            vx: Math.cos(angle) * (Math.random() * 3 + 1),
            vy: Math.sin(angle) * (Math.random() * 3 + 1),
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            isDeadly
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;
        if (p.life <= 0) {
            p.element.remove();
            particles.splice(i, 1);
            continue;
        }
        p.element.style.left = `${p.x}px`;
        p.element.style.top = `${p.y}px`;
        p.element.style.opacity = p.life;
    }

    // j块粒子未消失完时，玩家进入80px内则失败
    if (lastJBlock) {
        const stillHave = particles.some(p => p.isDeadly);
        if (stillHave &&
            Math.hypot(player.position.x - lastJBlock.x, player.position.y - lastJBlock.y) <= 280) {
            endGame(false);
            lastJBlock = null;
        }
        if (!stillHave) lastJBlock = null;
    }

    requestAnimationFrame(updateParticles);
}
updateParticles();

Events.on(mouseConstraint, 'mousedown', e => {
    const worldMouse = { x: e.mouse.position.x + camera.x, y: e.mouse.position.y + camera.y };
    const clicked = Query.point(blocks, worldMouse);
    if (!clicked.length) return;
    const b = clicked[0];
    const rect = render.canvas.getBoundingClientRect();
    const screenX = rect.left + e.mouse.position.x * (rect.width / render.canvas.width);
    const screenY = rect.top + e.mouse.position.y * (rect.height / render.canvas.height);
    if (b.label === 'dirt') {
        createParticles(screenX, screenY, 50, '#C0C0C0', false);
        removeBlock(b);
    } else if (b.label === 'j') {
        lastJBlock = { x: b.position.x, y: b.position.y };
        createParticles(screenX, screenY, 150, '#ff0022', true);
        removeBlock(b);
    }
});

function removeBlock(b) {
    World.remove(world, b);
    const idx = blocks.indexOf(b);
    if (idx > -1) blocks.splice(idx, 1);
}

/* ========================= 11. 地面检测 ========================= */
function isOnGround() {
    const start = { x: player.position.x, y: player.position.y + 40 };
    const end = { x: start.x, y: start.y + 2 };
    return Query.ray(blocks, start, end).length > 0 ||
        Query.ray([safeGround], start, end).length > 0;
}

/* ========================= 12. 键盘控制 ========================= */
const keys = {};
const cheatCode = ['KeyS', 'KeyJ', 'KeyX', 'KeyC', 'KeyZ', 'KeyS', 'KeyJ', 'KeyX', 'KeyC', 'KeyZ'];
let codeIndex = 0;
window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
        exitToMenu();
        return;
    }
    keys[e.code] = true;
    if (window.gameOver && e.code === 'KeyR') {
        document.getElementById('btnRestart').click();
    }
    else if (e.code === 'KeyR' && e.shiftKey) {
        endGame(false);
    }
    if (e.code === cheatCode[codeIndex]) {
        codeIndex++;
        if (codeIndex === cheatCode.length) {
            endGame(true);
            codeIndex = 0;
        }
    } else {
        codeIndex = 0;
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);
const JUMP_SPEED = 18;
let lastJumpTime = 0;
const JUMP_COOLDOWN = 800;

function controlLoop() {
    if (window.gameOver) return;
    const { velocity } = player;
    let vx = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) vx = -3.0;
    if (keys['KeyD'] || keys['ArrowRight']) vx = 3.0;
    Body.setVelocity(player, { x: vx, y: velocity.y });
    const now = Date.now();
    if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && isOnGround() && (now - lastJumpTime >= JUMP_COOLDOWN || lastJumpTime === 0)) {
        Body.setVelocity(player, { x: velocity.x, y: -JUMP_SPEED });
        lastJumpTime = now;
    }
    document.getElementById('coordinates').textContent =
        `X: ${Math.floor(player.position.x)}, Y: ${Math.floor(player.position.y)}`;
    updateCamera();
    requestAnimationFrame(controlLoop);
}

/* ========================= 13. 胜负判定 ========================= */
Events.on(engine, 'beforeUpdate', () => {
    if (window.gameOver) return;
    for (const b of moveDangerList) {
        const dest = b._moveCenterX + b._moveDir * b._moveRange;
        if (Math.abs(b.position.x - dest) < 2) b._moveDir *= -1;
        Body.setPosition(b, { x: b.position.x + b._moveDir * MOVE_SPEED, y: b.position.y });
    }
    const goals = blocks.filter(b => b.label === 'goal');
    const dangers = blocks.filter(b => ['danger', 'moveDanger'].includes(b.label));
    if (Query.collides(player, goals).length) endGame(true);
    if (Query.collides(player, dangers).length) endGame(false);
});

function endGame(win) {
    window.gameOver = true;
    const overlay = document.getElementById('overlay');
    const btn = document.getElementById('btnRestart');
    const hint = document.getElementById('overlayMessage');
    if (hint) {
        hint.hidden = true;
        hint.textContent = '';
    }
    if (!win) {
        gameStats.failures += 1;
        document.getElementById('overlayText').innerText = window.currentFailMsg || '💀 你失败了！';
        btn.innerText = '重开本关(R)';
        btn.onclick = () => { overlay.style.display = 'none'; loadLevel(currentLevel); };
    } else {
        gameStats.levelsCleared = Math.max(gameStats.levelsCleared, currentLevel + 1);
        document.getElementById('overlayText').innerText = '🎉 通关！';
        btn.innerText = '下一关(R)';
        btn.onclick = () => { overlay.style.display = 'none'; loadLevel(currentLevel + 1); };
        if (gameStats.totalLevels > 0 && currentLevel + 1 >= gameStats.totalLevels) {
            completeGame({
                totalLevels: gameStats.totalLevels,
                levelsCleared: gameStats.levelsCleared,
                failures: gameStats.failures,
                passed: true
            });
        }
    }
    overlay.style.display = 'flex';
}

/* ========================= 14. 异步加载地图 ========================= */
async function loadMaps() {
    try {
        const response = await fetch('maps.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`maps.json 请求失败: ${response.status}`);
        const config = await response.json();
        const levelEntries = Array.isArray(config.levels) ? config.levels : [];
        if (!levelEntries.length) throw new Error('maps.json 中没有关卡配置');

        const mapPromises = levelEntries.map(async (lv) => {
            const res = await fetch(lv.file, { cache: 'no-store' });
            if (!res.ok) throw new Error(`无法加载地图 ${lv.file}: ${res.status}`);
            return res.text();
        });

        mapLibrary = await Promise.all(mapPromises);
        gameStats.totalLevels = mapLibrary.length;

        console.info(`已加载 ${mapLibrary.length} 个地图`, levelEntries.map(lv => lv.name || lv.file));

        if (!mapLibrary.length) throw new Error('未成功加载任何地图文件');

        if (autoCompleteMode && triggerAutoComplete()) {
            return;
        }

        loadLevel(0);
    } catch (error) {
        console.error('加载关卡失败:', error);
        const overlay = document.getElementById('overlay');
        const overlayText = document.getElementById('overlayText');
        const btn = document.getElementById('btnRestart');
        const hint = document.getElementById('overlayMessage');
        if (hint) {
            const helpText = isFile
                ? '浏览器在直接双击本地文件时会拒绝读取 ./maps/*.csv。请使用本地静态服务器（例如 VS Code Live Server、`npx http-server` 或 `python -m http.server`）后再次打开本页面。'
                : `详细信息：${error.message || '未知错误'}`;
            hint.textContent = helpText;
            hint.hidden = false;
        }
        if (overlay && overlayText && btn) {
            overlayText.innerText = '⚠️ 无法读取关卡数据';
            btn.innerText = isFile ? '我知道了，稍后重试' : '重试加载';
            btn.onclick = () => {
                overlay.style.display = 'none';
                loadMaps();
            };
            overlay.style.display = 'flex';
        }
    }
}

const handleInitMessage = (event) => {
    if (!isFile && event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'minigame:init') {
        if (data.payload?.params?.autoComplete) {
            autoCompleteMode = true;
            triggerAutoComplete();
        }
    }
};

window.addEventListener('message', handleInitMessage);
loadMaps();
