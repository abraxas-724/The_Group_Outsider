import { nsKey } from './UserContext.js';
export const SAVE_GAME_PREFIX = 'groupOutsiderSave_';
export const MAX_SLOTS = 6;

export class SaveLoadManager {
    constructor() {
        
    }

    // 保存数据到指定槽位
    save(slot, saveData) {
        if (slot < 1 || slot > MAX_SLOTS) {
            console.error(`无效的存档槽位: ${slot}`);
            return false;
        }
        try {
            const jsonString = JSON.stringify(saveData);
            localStorage.setItem(nsKey(`${SAVE_GAME_PREFIX}${slot}`), jsonString);
            console.log(`游戏已保存到槽位 ${slot}`);
            return true;
        } catch (error) {
            console.error(`保存到槽位 ${slot} 失败:`, error);
            return false;
        }
    }

    // 从指定槽位读取数据
    load(slot) {
        if (slot < 1 || slot > MAX_SLOTS) return null;
    const jsonString = localStorage.getItem(nsKey(`${SAVE_GAME_PREFIX}${slot}`));
        if (!jsonString) return null;

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`读取槽位 ${slot} 失败:`, error);
            return null;
        }
    }
    
    // 删除指定槽位的存档
    delete(slot) {
        if (slot < 1 || slot > MAX_SLOTS) return;
    localStorage.removeItem(nsKey(`${SAVE_GAME_PREFIX}${slot}`));
        console.log(`存档槽位 ${slot} 已删除。`);
    }

    // 获取所有存档槽位的信息（用于显示）
    getAllSlots() {
        const slots = [];
        for (let i = 1; i <= MAX_SLOTS; i++) {
            slots.push({
                slot: i,
                data: this.load(i)
            });
        }
        return slots;
    }

    // 生成摘要（可用于存档菜单展示）
    static summarize(saveData) {
        if (!saveData) return '空槽位';
        const time = new Date(saveData.saveTime || Date.now());
        const hh = String(time.getHours()).padStart(2,'0');
        const mm = String(time.getMinutes()).padStart(2,'0');
        return `${hh}:${mm} 节点:${saveData.currentNodeId}`;
    }
}