/* ========================= 1. 基础初始化 ========================= */
const canvas = document.getElementById('gameCanvas');
const WW = 10000, WH = 10000;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const { Engine, Render, Runner, Bodies, Body, World, Mouse, MouseConstraint, Events, Query } = Matter;
const engine = Engine.create();
const world  = engine.world;
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
['dirt','ore','danger','goal','moveDanger'].forEach(name => {
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
    chamfer: { radius: 6},
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
                b._moveRange   = 2 * BLOCK;
                b._moveDir     = 1;
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
        const left = x + Math.cos(angle) * distance - size/2;
        const top = y + Math.sin(angle) * distance - size/2;
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
    const screenY = rect.top  + e.mouse.position.y * (rect.height / render.canvas.height);
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
    const end   = { x: start.x, y: start.y + 2 };
    return Query.ray(blocks, start, end).length > 0 ||
           Query.ray([safeGround], start, end).length > 0;
}

/* ========================= 12. 键盘控制 ========================= */
const keys = {};
const cheatCode = ['KeyS', 'KeyJ', 'KeyX', 'KeyC', 'KeyZ','KeyS', 'KeyJ', 'KeyX', 'KeyC', 'KeyZ'];
let codeIndex = 0;
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (window.gameOver && e.code === 'KeyR') {
        document.getElementById('btnRestart').click();
    }
    else if(e.code === 'KeyR' && e.shiftKey) {
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
window.addEventListener('keyup',   e => keys[e.code] = false);
const JUMP_SPEED = 18;
let lastJumpTime = 0;
const JUMP_COOLDOWN = 800;

function controlLoop() {
    if (window.gameOver) return;
    const { velocity } = player;
    let vx = 0;
    if (keys['KeyA'] || keys['ArrowLeft'])  vx = -3.0;
    if (keys['KeyD'] || keys['ArrowRight']) vx =  3.0;
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
    const goals   = blocks.filter(b => b.label === 'goal');
    const dangers = blocks.filter(b => ['danger','moveDanger'].includes(b.label));
    if (Query.collides(player, goals).length)   endGame(true);
    if (Query.collides(player, dangers).length) endGame(false);
});

function endGame(win) {
    window.gameOver = true;
    const overlay = document.getElementById('overlay');
    const btn     = document.getElementById('btnRestart');
    if (!win) {
        document.getElementById('overlayText').innerText = window.currentFailMsg || '💀 你失败了！';
        btn.innerText = '重开本关(R)';
        btn.onclick = () => { overlay.style.display = 'none'; loadLevel(currentLevel); };
    } else {
        document.getElementById('overlayText').innerText = '🎉 通关！';
        btn.innerText = '下一关(R)';
        btn.onclick = () => { overlay.style.display = 'none'; loadLevel(currentLevel + 1); };
    }
    overlay.style.display = 'flex';
}

/* ========================= 14. 异步加载地图 ========================= */
async function loadMaps() {
    try {
        const config = await fetch('maps.json').then(r => r.json());
        const mapPromises = config.levels.map(lv => fetch(lv.file).then(r => r.text()));
        mapLibrary = await Promise.all(mapPromises);
        if (mapLibrary.length) loadLevel(0);
        else console.error('maps.json 中没有找到任何关卡文件');
    } catch (e) { console.error('加载地图时出错:', e); }
}
loadMaps();