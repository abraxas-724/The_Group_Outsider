// Root service worker stub that imports the real implementation under js/sw.js
// 这样保持注册路径 sw.js 简洁，同时可在 js/ 下组织源码。
// 如果需要切换版本只需修改 js/sw.js 内的 CACHE_VERSION 或这里加上 query bust。
importScripts('./js/sw.js');
