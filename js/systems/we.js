
let progress = 50;
let startX = 0;
let active = 0;
let isDown = false;


const speedWheel = 0.15; // ↓ 再次降低滚轮敏感度（原0.62 -> 0.35）
const speedDrag = -0.035; // ↓ 再次降低拖动系数（原-0.05 -> -0.035）

// 获取items
const items = document.querySelectorAll(".carousel-item");

// 获取z-index
const getZindex = (array, index) =>
  array.map((_, i) =>
    index === i
      ? array.length
      : array.length - Math.abs(index - i)
  );

// 预先给每个卡片写入索引变量，供 CSS (var(--index)) 使用
items.forEach((it,i)=>it.style.setProperty('--index', i));

// 显示当前的 card：根据 active 计算层级与位移变量
const displayItems = (item, index, active) => {
  const zIndex = getZindex([...items], active)[index];
  item.style.setProperty('--zIndex', zIndex);
  // 使用整数差值，便于在 CSS 中做成明确分段的位移/旋转
  item.style.setProperty('--active', index - active);
};

//上一模块触发时的动画效果
const animate = () => {
  progress = Math.max(0, Math.min(progress, 100));
  active = Math.floor((progress / 100) * (items.length - 1));
  items.forEach((item, index) => displayItems(item, index, active));
  items.forEach((el, i) => el.classList.toggle('active', i === active));/*滑到当前图片时图片特效，露出底部景*/
};
animate();

// 点击card跳到个人主页网页
const urls = [
    "about us\\Syhhomepage\\index.html",
    "about us\\zyz\\geren.html",
    "about us\\yst\\杨舒童个人主页.html",
    "about us\\hh\\hh.html",
    "about us\\lzh\\index.html",
    "about us\\wyw\\wyw.html"
  ];
items.forEach((item, i) => {
    item.addEventListener("click", () => {
      window.open(urls[i], "_blank"); 
    });
  });






// 对鼠标动作的监听事件

const handleWheel = (e) => {
  const wheelProgress = e.deltaY * speedWheel;
  progress = progress + wheelProgress;
  animate();
};

const handleMouseMove = (e) => {
  if (!isDown) return;
  const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  const mouseProgress = (x - startX) * speedDrag;
  progress = progress + mouseProgress;
  startX = x;
  animate();
};

const handleMouseDown = (e) => {
  isDown = true;
  startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
};

const handleMouseUp = () => {
  isDown = false;
};

document.addEventListener("mousewheel", handleWheel);
document.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);
document.addEventListener("touchstart", handleMouseDown);
document.addEventListener("touchmove", handleMouseMove);
document.addEventListener("touchend", handleMouseUp);