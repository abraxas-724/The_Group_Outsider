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
        showToast('已尝试退出到剧情。');
    } else {
        window.location.href = '../../start.html';
    }
};

const levels = [
    {
        id: 'easy-sum',
        title: '轻盈求和',
        intro: '第一关：让最基础的加法恢复名字与秩序。',
        messages: {
            intro: '先稳住心绪，把这段加法写清楚。',
            rename: '命名完成：add · left · right。',
            comment: '注释完成：读者一眼就懂这段加法。',
            format: '格式化完成：简单的数学也要整洁。',
            complete: '第一关完成，你掌握了节奏。'
        },
        rawCode: 'function a(x,y){return x+y;}',
        renameResult: 'function add(left, right){\n    return left + right;\n}',
        commentBlock: `/**\n * Adds two integers.\n * @param left First addend.\n * @param right Second addend.\n * @return Sum of both.\n */`,
        finalTemplate: `/**\n * Adds two integers.\n * @param left First addend.\n * @param right Second addend.\n * @return Sum of both.\n */\nint add(int left, int right) {\n{{indent}}return left + right;\n}`,
        rename: [
            {
                key: 'function',
                label: '函数名',
                options: [
                    { value: 'mix', text: 'mix' },
                    { value: 'add', text: 'add', correct: true },
                    { value: 'calc', text: 'calc' }
                ]
            },
            {
                key: 'param1',
                label: '参数1',
                options: [
                    { value: 'first', text: 'first' },
                    { value: 'left', text: 'left' },
                    { value: 'num1', text: 'num1', correct: true }
                ]
            },
            {
                key: 'param2',
                label: '参数2',
                options: [
                    { value: 'right', text: 'right' },
                    { value: 'second', text: 'second' },
                    { value: 'num1', text: 'num1', correct: true }
                ]
            }
        ],
        comment: [
            {
                key: 'brief',
                label: '@brief',
                options: [
                    { value: 'Adds two integers.', text: 'Adds two integers.', correct: true },
                    { value: 'Subtracts two values.', text: 'Subtracts two values.' },
                    { value: 'Checks number types.', text: 'Checks number types.' }
                ]
            },
            {
                key: 'param1',
                label: '@param left',
                options: [
                    { value: 'First addend.', text: 'First addend.', correct: true },
                    { value: 'Loop counter.', text: 'Loop counter.' },
                    { value: 'Carry buffer.', text: 'Carry buffer.' }
                ]
            },
            {
                key: 'param2',
                label: '@param right',
                options: [
                    { value: 'Second addend.', text: 'Second addend.', correct: true },
                    { value: 'Error flag.', text: 'Error flag.' },
                    { value: 'Random seed.', text: 'Random seed.' }
                ]
            },
            {
                key: 'return',
                label: '@return',
                options: [
                    { value: 'Sum of both.', text: 'Sum of both.', correct: true },
                    { value: 'Always zero.', text: 'Always zero.' },
                    { value: 'Product result.', text: 'Product result.' }
                ]
            }
        ],
        highlight: {
            functions: ['add'],
            params: ['left', 'right']
        }
    },
    {
        id: 'branch-loop',
        title: '分支调和',
        intro: '第二关：处理一串数字，跳过噪声并调节奇数。',
        messages: {
            intro: '感受循环的律动，留意每一个分支判定。',
            rename: '命名完成：sumAdjusted · values · value。',
            comment: '注释完成：每个条件都交代清楚。',
            format: '格式化完成：循环结构舒展有序。',
            complete: '第二关完成，你的手法更加稳定。'
        },
        rawCode: 'function b(arr){let total=0;for(let i=0;i<arr.length;i++){const item=arr[i];if(item<0){continue;}if(item%2===0){total+=item;}else{total+=item-1;}}return total;}',
        renameResult: 'function sumAdjusted(values){\n    let total = 0;\n    for (let i = 0; i < values.length; i++) {\n        const value = values[i];\n        if (value < 0) {\n            continue;\n        }\n        if (value % 2 === 0) {\n            total += value;\n        } else {\n            total += value - 1;\n        }\n    }\n    return total;\n}',
        commentBlock: `/**\n * Adds non-negative numbers with odd tweaks.\n * @param values Source list of numbers.\n * @return The adjusted total.\n */`,
        finalTemplate: `/**\n * Adds non-negative numbers with odd tweaks.\n * @param values Source list of numbers.\n * @return The adjusted total.\n */\nint sumAdjusted(const std::vector<int>& values) {\n{{indent}}int total = 0;\n{{indent}}for (int value : values) {\n{{indent}}{{indent}}if (value < 0) {\n{{indent}}{{indent}}{{indent}}continue;\n{{indent}}{{indent}}}\n{{indent}}{{indent}}if (value % 2 == 0) {\n{{indent}}{{indent}}{{indent}}total += value;\n{{indent}}{{indent}}} else {\n{{indent}}{{indent}}{{indent}}total += value - 1;\n{{indent}}{{indent}}}\n{{indent}}\n{{indent}}}\n{{indent}}return total;\n}`,
        rename: [
            {
                key: 'function',
                label: '函数名',
                options: [
                    { value: 'sumAdjusted', text: 'sumAdjusted', correct: true },
                    { value: 'combineAll', text: 'combineAll' },
                    { value: 'runLoop', text: 'runLoop' }
                ]
            },
            {
                key: 'param',
                label: '输入数组',
                options: [
                    { value: 'values', text: 'values', correct: true },
                    { value: 'stack', text: 'stack' },
                    { value: 'series', text: 'series' }
                ]
            },
            {
                key: 'item',
                label: '循环变量',
                options: [
                    { value: 'value', text: 'value', correct: true },
                    { value: 'entry', text: 'entry' },
                    { value: 'row', text: 'row' }
                ]
            }
        ],
        comment: [
            {
                key: 'brief',
                label: '@brief',
                options: [
                    { value: 'Adds non-negative numbers with odd tweaks.', text: 'Adds non-negative numbers with odd tweaks.', correct: true },
                    { value: 'Finds the smallest value.', text: 'Finds the smallest value.' },
                    { value: 'Sorts values ascending.', text: 'Sorts values ascending.' }
                ]
            },
            {
                key: 'param',
                label: '@param values',
                options: [
                    { value: 'Source list of numbers.', text: 'Source list of numbers.', correct: true },
                    { value: 'Queue of pending jobs.', text: 'Queue of pending jobs.' },
                    { value: 'Map of keyed items.', text: 'Map of keyed items.' }
                ]
            },
            {
                key: 'return',
                label: '@return',
                options: [
                    { value: 'The adjusted total.', text: 'The adjusted total.', correct: true },
                    { value: 'The skipped count.', text: 'The skipped count.' },
                    { value: 'A sorted copy.', text: 'A sorted copy.' }
                ]
            }
        ],
        highlight: {
            functions: ['sumAdjusted'],
            params: ['values', 'value', 'total']
        }
    },
    {
        id: 'task-label',
        title: '任务标记',
        intro: '第三关：为任务列表赋予恰当的标签。',
        messages: {
            intro: '保持平衡，让每个任务得到合适的状态。',
            rename: '命名完成：labelTasks · tasks · status。',
            comment: '注释完成：读者明白状态如何生成。',
            format: '格式化完成：结构清晰可查。',
            complete: '所有关卡完成，你的仪式圆满。',
            ending: '仪式完成：混乱被抚平，秩序如约而至。'
        },
        rawCode: 'function c(list){const tagged=[];for(let i=0;i<list.length;i++){const item=list[i];const flag=item.done?\'done\':item.priority>5?\'urgent\':\'todo\';tagged.push({id:item.id,status:flag});}return tagged;}',
        renameResult: 'function labelTasks(tasks){\n    const result = [];\n    for (let i = 0; i < tasks.length; i++) {\n        const task = tasks[i];\n        const status = task.done ? \'done\' : (task.priority > 5 ? \'urgent\' : \'todo\');\n        result.push({ id: task.id, status });\n    }\n    return result;\n}',
        commentBlock: `/**\n * Labels each task by completion and priority.\n * @param tasks Input tasks with state info.\n * @return Task/status pairs.\n */`,
        finalTemplate: `/**\n * Labels each task by completion and priority.\n * @param tasks Input tasks with state info.\n * @return Task/status pairs.\n */\nstd::vector<TaskTag> labelTasks(const std::vector<Task>& tasks) {\n{{indent}}std::vector<TaskTag> result;\n{{indent}}result.reserve(tasks.size());\n{{indent}}for (const auto& task : tasks) {\n{{indent}}{{indent}}std::string status = task.done ? "done" : (task.priority > 5 ? "urgent" : "todo");\n{{indent}}{{indent}}result.push_back({task.id, status});\n{{indent}}}\n{{indent}}return result;\n}`,
        rename: [
            {
                key: 'function',
                label: '函数名',
                options: [
                    { value: 'trackTasks', text: 'trackTasks' },
                    { value: 'labelTasks', text: 'labelTasks', correct: true },
                    { value: 'syncBoard', text: 'syncBoard' }
                ]
            },
            {
                key: 'param',
                label: '任务集合',
                options: [
                    { value: 'tasks', text: 'tasks', correct: true },
                    { value: 'records', text: 'records' },
                    { value: 'nodes', text: 'nodes' }
                ]
            },
            {
                key: 'status',
                label: '状态变量',
                options: [
                    { value: 'status', text: 'status', correct: true },
                    { value: 'flag', text: 'flag' },
                    { value: 'mode', text: 'mode' }
                ]
            }
        ],
        comment: [
            {
                key: 'brief',
                label: '@brief',
                options: [
                    { value: 'Labels each task by completion and priority.', text: 'Labels each task by completion and priority.', correct: true },
                    { value: 'Executes every task handler.', text: 'Executes every task handler.' },
                    { value: 'Loads config from disk.', text: 'Loads config from disk.' }
                ]
            },
            {
                key: 'param',
                label: '@param tasks',
                options: [
                    { value: 'Input tasks with state info.', text: 'Input tasks with state info.', correct: true },
                    { value: 'A cache of API tokens.', text: 'A cache of API tokens.' },
                    { value: 'Detached debug nodes.', text: 'Detached debug nodes.' }
                ]
            },
            {
                key: 'return',
                label: '@return',
                options: [
                    { value: 'Task/status pairs.', text: 'Task/status pairs.', correct: true },
                    { value: 'A promise handle.', text: 'A promise handle.' },
                    { value: 'Log message list.', text: 'Log message list.' }
                ]
            }
        ],
        highlight: {
            functions: ['labelTasks'],
            params: ['tasks', 'status', 'result']
        }
    }
];

const taskArticles = {
    rename: document.querySelector('.task[data-task="rename"]'),
    comment: document.querySelector('.task[data-task="comment"]'),
    format: document.querySelector('.task[data-task="format"]')
};

const progressValue = document.getElementById('progressValue');
const progressLabel = document.getElementById('progressLabel');
const levelBadge = document.getElementById('levelBadge');
const renameContainer = document.getElementById('renameChoices');
const commentContainer = document.getElementById('commentChoices');
const editorState = document.getElementById('editorState');
const codeContent = document.getElementById('codeContent');
const finishButton = document.getElementById('finishButton');
const resetButton = document.getElementById('resetButton');
const exitButton = document.getElementById('exitToStory');
const applyCommentBtn = document.getElementById('applyComment');
const formatButton = document.getElementById('formatButton');
const indentToggle = document.getElementById('indentToggle');

const totalSteps = 3;
const taskLabels = {
    0: '原始状态',
    1: '命名完成',
    2: '注释完善',
    3: '完全格式化'
};

let currentLevelIndex = 0;
let currentLevel = levels[currentLevelIndex];
let renameState = {};
let steps = { rename: false, comment: false, format: false };
let commentSelects = {};
let expectedComment = {};
let receivedParams = {};
let autoCompleteHandled = false;
const sessionStart = performance.now();
let levelStart = performance.now();

const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const wrapMatches = (text, list, className) => {
    if (!Array.isArray(list)) return text;
    let result = text;
    list.forEach((token) => {
        const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${safeToken}\\b`, 'g');
        result = result.replace(regex, `<span class="${className}">${token}</span>`);
    });
    return result;
};

const shuffleArray = (items) => {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const syntaxHighlight = (code, level) => {
    let highlighted = escapeHtml(code)
        .replace(/(\/\*\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
        .replace(/\b(function|int|double|float|return|@brief|@param|@return)\b/g, '<span class="kw">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');

    highlighted = wrapMatches(highlighted, level?.highlight?.functions, 'fn');
    highlighted = wrapMatches(highlighted, level?.highlight?.params, 'param');
    return highlighted;
};

const buildCode = () => {
    const indent = '    ';
    if (!steps.rename) {
        return currentLevel.rawCode;
    }
    if (!steps.comment) {
        return currentLevel.renameResult;
    }
    if (!steps.format) {
        return `${currentLevel.commentBlock}\n${currentLevel.renameResult}`;
    }
    return currentLevel.finalTemplate.replace(/\{\{indent}}/g, indent);
};

const markTask = (taskName, completed) => {
    const el = taskArticles[taskName];
    if (!el) return;
    const status = el.querySelector('.task-status');
    if (completed) {
        el.classList.add('completed');
        if (status) status.textContent = '完成';
    } else {
        el.classList.remove('completed');
        if (status) status.textContent = '未完成';
    }
};

const updateFinishButtonLabel = () => {
    if (!finishButton) return;
    finishButton.textContent = currentLevelIndex < levels.length - 1 ? '进入下一关' : '完成并返回';
};

const updateEditor = () => {
    const completed = Object.values(steps).filter(Boolean).length;
    if (progressValue) {
        progressValue.style.width = `${(completed / totalSteps) * 100}%`;
    }
    if (progressLabel) {
        progressLabel.textContent = `关卡 ${currentLevelIndex + 1} / ${levels.length} · 步骤 ${completed} / ${totalSteps}`;
    }
    if (levelBadge) {
        levelBadge.textContent = `关卡 ${currentLevelIndex + 1} / ${levels.length} · ${currentLevel.title}`;
    }
    if (editorState) {
        editorState.textContent = taskLabels[completed] || taskLabels[0];
    }
    if (codeContent) {
        codeContent.innerHTML = syntaxHighlight(buildCode(), currentLevel);
    }
    if (finishButton) {
        finishButton.disabled = completed !== totalSteps;
    }
    updateFinishButtonLabel();
};

const attachRenameListeners = () => {
    if (!renameContainer) return;
    renameContainer.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', handleChoiceClick);
    });
};

const checkRenameState = () => {
    const allCorrect = currentLevel.rename.every((group) => renameState[group.key]);
    if (allCorrect && !steps.rename) {
        steps.rename = true;
        markTask('rename', true);
        renameContainer?.querySelectorAll('button').forEach((btn) => {
            btn.disabled = true;
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });
        showToast(currentLevel.messages?.rename ?? '命名完成。');
    }
    updateEditor();
};

const handleChoiceClick = (event) => {
    const btn = event.target.closest('button');
    if (!btn || btn.disabled) return;
    const block = btn.closest('.choice-block');
    if (!block) return;
    const targetKey = block.dataset.target;
    block.querySelectorAll('button').forEach((b) => {
        b.classList.remove('selected', 'wrong');
    });
    btn.classList.add('selected');
    const isCorrect = btn.dataset.correct === 'true';
    renameState[targetKey] = isCorrect;
    if (isCorrect) {
        btn.classList.add('correct');
    } else {
        btn.classList.add('wrong');
        showToast('这名字太含糊了，再想想。');
    }
    checkRenameState();
};

const loadLevel = (index, options = {}) => {
    const { intro = true } = options;
    currentLevelIndex = index;
    currentLevel = levels[currentLevelIndex];
    renameState = {};
    steps = { rename: false, comment: false, format: false };
    commentSelects = {};
    expectedComment = {};

    Object.keys(taskArticles).forEach((task) => markTask(task, false));

    if (renameContainer) {
        renameContainer.innerHTML = '';
        currentLevel.rename.forEach((group) => {
            const block = document.createElement('div');
            block.className = 'choice-block';
            block.dataset.target = group.key;

            const heading = document.createElement('h3');
            heading.textContent = group.label;
            const buttonsWrap = document.createElement('div');
            buttonsWrap.className = 'choice-buttons';

            const shuffledOptions = shuffleArray(group.options);
            shuffledOptions.forEach((option) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.choice = option.value;
                button.textContent = option.text;
                if (option.correct) {
                    button.dataset.correct = 'true';
                }
                buttonsWrap.appendChild(button);
            });

            block.appendChild(heading);
            block.appendChild(buttonsWrap);
            renameContainer.appendChild(block);
            renameState[group.key] = false;
        });
    }

    if (commentContainer) {
        commentContainer.innerHTML = '';
        currentLevel.comment.forEach((field) => {
            const label = document.createElement('label');
            const span = document.createElement('span');
            span.textContent = field.label;
            const select = document.createElement('select');
            select.dataset.field = field.key;
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '请选择...';
            select.appendChild(placeholder);
            const shuffledOptions = shuffleArray(field.options);
            shuffledOptions.forEach((option) => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.text;
                if (option.correct) {
                    expectedComment[field.key] = option.value;
                }
                select.appendChild(opt);
            });
            label.appendChild(span);
            label.appendChild(select);
            commentContainer.appendChild(label);
            commentSelects[field.key] = select;
        });
    }

    attachRenameListeners();

    if (applyCommentBtn) applyCommentBtn.disabled = false;
    if (formatButton) formatButton.disabled = false;
    if (indentToggle) {
        indentToggle.disabled = false;
        indentToggle.checked = true;
    }
    if (finishButton) finishButton.disabled = true;

    levelStart = performance.now();
    updateEditor();

    if (intro && currentLevel.messages?.intro) {
        showToast(currentLevel.messages.intro);
    }
};

const handleApplyComment = () => {
    if (!steps.rename) {
        showToast('先完成命名，再书写注释。');
        return;
    }
    const allMatch = Object.entries(expectedComment).every(([key, value]) => {
        const selected = commentSelects[key]?.value?.trim() || '';
        return selected === value;
    });
    if (!allMatch) {
        showToast('注释还不够精确，再检查一遍。');
        return;
    }
    steps.comment = true;
    markTask('comment', true);
    Object.values(commentSelects).forEach((select) => {
        if (select) select.disabled = true;
    });
    if (applyCommentBtn) applyCommentBtn.disabled = true;
    showToast(currentLevel.messages?.comment ?? '注释完成。');
    updateEditor();
};

const handleFormatClick = () => {
    if (!steps.rename || !steps.comment) {
        showToast('先完成前两个步骤，才能格式化。');
        return;
    }
    if (!indentToggle?.checked) {
        showToast('禅意之中无需偷懒：保持 4 空格缩进。');
        return;
    }
    steps.format = true;
    markTask('format', true);
    if (formatButton) formatButton.disabled = true;
    if (indentToggle) indentToggle.disabled = true;
    showToast(currentLevel.messages?.format ?? '格式化完成。');
    updateEditor();
};

const completeGame = (extraPayload = {}, options = {}) => {
    const duration = extraPayload.duration != null
        ? extraPayload.duration
        : Math.round((performance.now() - sessionStart) / 1000);
    if (finishButton) finishButton.disabled = true;
    postToParent({
        type: 'minigame:complete',
        payload: {
            duration,
            stepsCompleted: totalSteps,
            params: receivedParams,
            ...extraPayload
        }
    });
    if (!options.silent) {
        showToast(currentLevel.messages?.ending ?? '仪式完成：混乱已被抚平。');
    }
};

const handleFinishClick = () => {
    if (finishButton?.disabled) {
        showToast('先完成全部步骤。');
        return;
    }
    if (currentLevelIndex < levels.length - 1) {
        showToast(currentLevel.messages?.complete ?? '关卡完成，继续前进。');
        finishButton.disabled = true;
        setTimeout(() => loadLevel(currentLevelIndex + 1, { intro: true }), 520);
        return;
    }
    completeGame();
};

const resetGame = () => {
    loadLevel(currentLevelIndex, { intro: false });
    showToast('仪式重置，重新开始。');
};

const completeAllAutomatically = () => {
    if (autoCompleteHandled) return;
    autoCompleteHandled = true;
    currentLevelIndex = levels.length - 1;
    currentLevel = levels[currentLevelIndex];
    steps = { rename: true, comment: true, format: true };
    markTask('rename', true);
    markTask('comment', true);
    markTask('format', true);
    updateEditor();
    showToast('已自动完成全部关卡。');
    completeGame({ duration: 0, autoComplete: true }, { silent: true });
};

const handleInitMessage = (event) => {
    if (!isFile && event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'minigame:init') {
        receivedParams = data.payload?.params || {};
        if (receivedParams?.autoComplete) {
            completeAllAutomatically();
        }
    }
};

if (applyCommentBtn) {
    applyCommentBtn.addEventListener('click', handleApplyComment);
}

if (formatButton) {
    formatButton.addEventListener('click', handleFormatClick);
}

if (resetButton) {
    resetButton.addEventListener('click', resetGame);
}

if (finishButton) {
    finishButton.addEventListener('click', handleFinishClick);
}

if (exitButton) {
    exitButton.addEventListener('click', exitToMenu);
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        exitToMenu();
    }
});

window.addEventListener('message', handleInitMessage);

postToParent({ type: 'minigame:ready', gameId: 'code_zen_garden' });

loadLevel(0, { intro: true });

if (!hasParent) {
    setTimeout(() => {
        showToast('欢迎来到代码禅院，独立模式下完成后可自行离开。');
    }, 600);
}
