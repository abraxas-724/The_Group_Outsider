document.addEventListener('DOMContentLoaded', () => {
    const wordBoard = document.getElementById('wordBoard');
    const taskList = document.getElementById('taskList');
    const trash = document.getElementById('trash');
    const trashImage = document.getElementById('trashImage');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const startButton = document.getElementById('startButton');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayMessage = document.getElementById('overlayMessage');
    const returnButton = document.getElementById('returnButton');

    const technicalWords = ["渲染管线", "API", "数据库", "算法", "后端", "前端", "云计算", "框架", "版本控制", "函数"];
    const emotionalWords = ["梦想", "酷炫", "爱", "灵感", "激情", "幸福", "痛苦", "挑战", "友谊", "冒险"];
    let allWords = []; // 存储词汇DOM元素
    let score = 0;
    let time = 60;
    let timer;
    let isGameRunning = false;

    // 获取随机位置 (新版本，会检查重叠)
    const getNonOverlappingPosition = (newWordWidth, newWordHeight) => {
        const boardRect = wordBoard.getBoundingClientRect();
        const padding = 10; // 词汇之间的最小间距
        let x, y;
        let isOverlapping;
        let attempts = 0;
        const maxAttempts = 500; // 防止无限循环，设置最大尝试次数

        do {
            isOverlapping = false;
            x = Math.random() * (boardRect.width - newWordWidth - padding * 2) + padding;
            y = Math.random() * (boardRect.height - newWordHeight - padding * 2) + padding;

            const newRect = {
                left: x,
                top: y,
                right: x + newWordWidth,
                bottom: y + newWordHeight
            };

            for (const existingWordDiv of allWords) {
                // 如果是正在拖拽的词汇（或尚未完全放置的），忽略它
                if (existingWordDiv.dataset.dragging === 'true') continue; 
                
                const existingRect = {
                    left: existingWordDiv.offsetLeft,
                    top: existingWordDiv.offsetTop,
                    right: existingWordDiv.offsetLeft + existingWordDiv.offsetWidth,
                    bottom: existingWordDiv.offsetTop + existingWordDiv.offsetHeight
                };

                // 检查是否重叠 (AABB 碰撞检测)
                if (!(newRect.right + padding < existingRect.left || 
                      newRect.left > existingRect.right + padding || 
                      newRect.bottom + padding < existingRect.top || 
                      newRect.top > existingRect.bottom + padding)) {
                    isOverlapping = true;
                    break;
                }
            }
            attempts++;
        } while (isOverlapping && attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            console.warn("未能找到不重叠的位置，部分词汇可能重叠。");
        }
        return { x, y };
    };

    // 生成词汇
    const createWord = (text, type) => {
        const wordDiv = document.createElement('div');
        wordDiv.textContent = text;
        wordDiv.classList.add('word');
        wordDiv.dataset.type = type;
        
        // 暂时添加到DOM以获取其尺寸，然后移除
        wordBoard.appendChild(wordDiv); 
        const wordWidth = wordDiv.offsetWidth;
        const wordHeight = wordDiv.offsetHeight;
        wordBoard.removeChild(wordDiv); // 移除，因为 getNonOverlappingPosition 还需要它

        const { x, y } = getNonOverlappingPosition(wordWidth, wordHeight);
        wordDiv.style.left = `${x}px`;
        wordDiv.style.top = `${y}px`;

        allWords.push(wordDiv); // 先添加到 allWords 列表
        wordBoard.appendChild(wordDiv); // 再添加到DOM

        makeDraggable(wordDiv);
    };

    // 生成所有词汇
    const generateWords = () => {
        wordBoard.innerHTML = '';
        allWords = []; // 清空词汇列表

        const allWordData = [
            ...technicalWords.map(word => ({ text: word, type: 'technical' })),
            ...emotionalWords.map(word => ({ text: word, type: 'emotional' }))
        ].sort(() => 0.5 - Math.random());

        // 逐个生成词汇，确保不重叠
        for (const data of allWordData) {
            createWord(data.text, data.type);
        }
    };

    // 拖拽功能
    const makeDraggable = (element) => {
        let isDragging = false;
        let initialMousePos = { x: 0, y: 0 };
        let initialElementPos = { x: 0, y: 0 };

        element.addEventListener('mousedown', (e) => {
            if (!isGameRunning) return;
            isDragging = true;
            element.style.zIndex = 10;
            element.dataset.dragging = 'true'; // 标记正在拖拽

            initialMousePos.x = e.clientX;
            initialMousePos.y = e.clientY;
            initialElementPos.x = element.offsetLeft;
            initialElementPos.y = element.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - initialMousePos.x;
            const dy = e.clientY - initialMousePos.y;
            
            const newX = initialElementPos.x + dx;
            const newY = initialElementPos.y + dy;
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;

            checkDropZone(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            element.style.zIndex = 1;
            delete element.dataset.dragging; // 移除拖拽标记

            const targetZone = getTargetZone(e.clientX, e.clientY);
            
            if (targetZone) {
                handleDrop(element, targetZone);
            } else {
                element.style.left = `${initialElementPos.x}px`;
                element.style.top = `${initialElementPos.y}px`;
            }
            
            taskList.classList.remove('hover');
            trash.classList.remove('hover');
        });
    };

    // ... (getTargetZone, checkDropZone, handleDrop, startGame, endGame 等函数保持不变)

    // 检查鼠标是否在投放区域
    const getTargetZone = (x, y) => {
        const taskListRect = taskList.getBoundingClientRect();
        const trashRect = trash.getBoundingClientRect();
        if (x > taskListRect.left && x < taskListRect.right && y > taskListRect.top && y < taskListRect.bottom) {
            return 'taskList';
        }
        if (x > trashRect.left && x < trashRect.right && y > trashRect.top && y < trashRect.bottom) {
            return 'trash';
        }
        return null;
    };

    // 高亮投放区域
    const checkDropZone = (x, y) => {
        const taskListRect = taskList.getBoundingClientRect();
        const trashRect = trash.getBoundingClientRect();
        taskList.classList.remove('hover');
        trash.classList.remove('hover');
        if (x > taskListRect.left && x < taskListRect.right && y > taskListRect.top && y < taskListRect.bottom) {
            taskList.classList.add('hover');
        } else if (x > trashRect.left && x < trashRect.right && y > trashRect.top && y < trashRect.bottom) {
            trash.classList.add('hover');
        }
    };

    // 处理拖拽结果
    const handleDrop = (wordDiv, zone) => {
        const type = wordDiv.dataset.type;
        let points = 0;

        if (zone === 'taskList' && type === 'technical') {
            points = 10;
        } else if (zone === 'trash' && type === 'emotional') {
            points = 10;
            // 如果正确回收了一个感性词汇，改变回收站图片
            trashImage.src = 'assets/trash-full.png'; 
        } else {
            points = -5; // 错误分类
        }

        score += points;
        scoreDisplay.textContent = score;

        // 移除词汇
        wordBoard.removeChild(wordDiv);
        allWords = allWords.filter(w => w !== wordDiv);

        if (allWords.length === 0) {
            endGame();
        }
    };

    // 游戏开始
    const startGame = () => {
        isGameRunning = true;
        score = 0;
        time = 60;
        scoreDisplay.textContent = score;
        timeDisplay.textContent = time;
        overlay.style.display = 'none';

        // 每次游戏开始时，重置回收站图片
        trashImage.src = 'assets/trash.png';

        generateWords();

        timer = setInterval(() => {
            time--;
            timeDisplay.textContent = time;
            if (time <= 0) {
                endGame();
            }
        }, 1000);
    };

    // 游戏结束
    const endGame = () => {
        isGameRunning = false;
        clearInterval(timer);
        overlay.style.display = 'flex';
        overlayTitle.textContent = "游戏结束";
        overlayMessage.textContent = `你的最终分数是: ${score} 分。`;
        startButton.textContent = "重新开始";
        // 显示返回剧情按钮
        if (returnButton) {
            returnButton.classList.remove('hidden');
        }
        // 通知父窗口：可选择在此直接上报完成
        try {
            const target = (window.location.protocol === 'file:' || window.location.origin === 'null') ? '*' : window.location.origin;
            window.parent && window.parent.postMessage({ type: 'minigame:complete', payload: { score } }, target);
        } catch {}
    };

    // 绑定开始按钮事件
    startButton.addEventListener('click', () => {
        startGame();
    });

    // 返回剧情：显式退出（不计完成），父页面会关闭覆盖层
    if (returnButton) {
        returnButton.addEventListener('click', () => {
            try {
                const target = (window.location.protocol === 'file:' || window.location.origin === 'null') ? '*' : window.location.origin;
                window.parent && window.parent.postMessage({ type: 'minigame:exit' }, target);
            } catch {}
        });
    }

    // —— 与父页面的消息协议 ——
    // 通知父页面：小游戏就绪，可接收 init
    try {
        const target = (window.location.protocol === 'file:' || window.location.origin === 'null') ? '*' : window.location.origin;
        window.parent && window.parent.postMessage({ type: 'minigame:ready', gameId: 'noise_filtering' }, target);
    } catch {}

    // 接收父页面发送的初始化参数，如难度、时间等
    window.addEventListener('message', (e) => {
        const isFile = window.location.protocol === 'file:' || window.location.origin === 'null';
        if (!isFile && e.origin !== window.location.origin) return;
        const data = e.data || {};
        if (data.type === 'minigame:init') {
            const payload = data.payload || {};
            const params = payload.params || {};
            // 可用 params.time 自定义倒计时等
            if (typeof params.time === 'number' && params.time > 0) {
                time = Math.floor(params.time);
                timeDisplay.textContent = time;
            }
        }
    });
});