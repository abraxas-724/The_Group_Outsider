import { SaveLoadManager, MAX_SLOTS } from './js/engine/SaveLoadManager.js';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'load' ? 'load' : 'save';
const mgr = new SaveLoadManager();

const slotsEl = document.getElementById('slots');
const badge = document.getElementById('modeBadge');
badge.textContent = mode.toUpperCase();
badge.className = 'mode-badge ' + (mode === 'load' ? 'mode-load' : 'mode-save');

function fmtTime(ts){
    if(!ts) return '---';
    const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2000);
}

function buildSlotCard(slot){
    const data = mgr.load(slot);
    const card = document.createElement('div');
    card.className = 'slot';
    card.dataset.slot = slot;
    if(!data) card.dataset.empty = 'true';
    card.innerHTML = `
        <h2>槽位 ${slot} <span class="time">${data?fmtTime(data.saveTime):'空'}</span></h2>
        <div class="node">${data?('节点: '+data.currentNodeId):'没有存档'}</div>
        <div class="slot-actions">
            ${mode==='save'?'<button class="small">保存</button>':'<button class="small">读取</button>'}
            ${data?'<button class="small delete" title="删除此槽位">删除</button>':''}
        </div>`;

    // 单击保存 / 读取
    card.querySelector('.small').addEventListener('click', (e)=>{
        e.stopPropagation();
        runAction(slot,false);
    });

    // 删除按钮
    if(data){
        const delBtn = card.querySelector('.delete');
        delBtn.addEventListener('click', (e)=>{
            e.stopPropagation();
            if(confirm(`确定删除槽位 ${slot} 吗?`)){
                mgr.delete(slot); refresh(); showToast('已删除');
            }
        });
    }

    // 卡片点击 = 行为
    card.addEventListener('click', ()=> runAction(slot,false));
    // 双击直接执行且不确认
    card.addEventListener('dblclick', ()=> runAction(slot,true));

    return card;
}

function runAction(slot,force){
    if(!window.opener || !window.opener.app){
        alert('未检测到主游戏窗口。'); return;
    }
    if(mode==='save'){
        if(!force && mgr.load(slot) && !confirm('覆盖该槽位?')) return; 
        const data = window.opener.app.buildSaveData();
        if(!data){ showToast('当前无可保存进度'); return; }
        const ok = mgr.save(slot,data);
        if(ok){ showToast(`已保存到槽位 ${slot}`); refresh(); }
    }else{
        const data = mgr.load(slot);
        if(!data){ showToast('槽位为空'); return; }
        if(!force && !confirm('读取该槽位并覆盖当前进度?')) return;
        window.opener.app.loadGame(slot); // 内部已有提示
    }
}

function refresh(){
    slotsEl.innerHTML='';
    for(let i=1;i<=MAX_SLOTS;i++) slotsEl.appendChild(buildSlotCard(i));
}

document.getElementById('refresh-btn').addEventListener('click', refresh);
document.getElementById('close-btn').addEventListener('click', ()=> window.close());

refresh();
