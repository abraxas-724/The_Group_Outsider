export class EventEmitter {
    constructor() {
        this.events = {};
    }

    // 订阅事件
    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
    }

    // 发布/广播事件
    emit(eventName, ...args) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(listener => listener(...args));
        }
    }
}