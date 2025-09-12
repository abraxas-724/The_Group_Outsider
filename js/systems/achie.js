window.addEventListener('DOMContentLoaded', () => {
    /* 你的 JS */
 
const cards = document.querySelectorAll(".card");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const totalCards = cards.length;
let radius = 180;
let currentAngle = 0;
let autoRotateInterval = null;
const autoRotateDelay = 800;

// 定义一个函数positionCards，用于定位卡片的位置，参数animate表示是否需要动画效果
function positionCards(animate = false) {
    cards.forEach((card, index) => {
        // 计算每个卡片的角度
        var angle = (index / totalCards) * 360 + currentAngle;
        const x = radius * Math.cos(angle * Math.PI / 180);
        const z = radius * Math.sin(angle * Math.PI / 180);
        console.log(x, z, angle);

        if (animate) {
            // 如果animate为true，则使用gsap.to()方法进行动画过渡
            gsap.to(card, {
                x: x,
                z: z,
                rotationY: -angle,
                transformOrigin: "center",
                duration: 0.3,
                ease: "power2.inOut",
            });
        } else {
            // 如果animate为false，则使用gsap.set()方法直接设置位置
            gsap.set(card, {
                x: x,
                z: z,
                rotationY: -angle,
                transformOrigin: "center",
            });
        }
    });
}

cards.forEach((card, index) => {
    gsap.from(card, {
        scale: 0,
        opacity: 0,
        y: 100,
        rotationX: 45,
        delay: index * 0.1,
        duration: 1,
        ease: "power3.out",
    });
});

setTimeout(() => positionCards(false), 1500);

// 更新轮播图函数，根据传入的方向参数，改变当前角度
function updateCarousel(direction) {
    if (direction === "next") {
        currentAngle += 360 / totalCards;
    } else if (direction === "prev") {
        currentAngle -= 360 / totalCards;
    }
    currentAngle %= 360;

    // 调用positionCards重新定位卡片
    positionCards(true);
}

function pauseAutoRotation(temp ) {
    // 清除自动旋转的定时器
    clearInterval(autoRotateInterval);
    if (temp) {
        // 如果temp为true，则3秒后重新开始自动旋转
        setTimeout(startAutoRotation, 10000);
    }
}

// 定义一个函数，用于开始自动旋转
function startAutoRotation() {
    // 清除自动旋转的定时器
    clearInterval(autoRotateInterval);
    // 设置自动旋转的定时器，每隔autoRotateDelay毫秒执行一次updateCarousel函数，参数为"next"
    autoRotateInterval = setInterval(() => {
        updateCarousel("next");
    }, autoRotateDelay);
}

nextBtn.addEventListener("click", () => {
    pauseAutoRotation(true);
    updateCarousel("next");
});

prevBtn.addEventListener("click", () => {
    pauseAutoRotation(true);
    updateCarousel("prev");
});

cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
        gsap.to(card, {
            scale: 1.1,
            z: "*=1.2",
            duration: 0.3,
            ease: "power2.out",
        });
    });
    card.addEventListener("mouseleave", () => {
        gsap.to(card, {
            scale: 1,
            z: "-=50",
            duration: 0.3,
            ease: "power2.out",
        });
    });
});

// 函数adjustRadius用于调整半径
function adjustRadius() {
    // 根据窗口宽度判断新的半径
    const newRadius = window.innerWidth <= 768 ? 300 : 400;
    if (newRadius !== radius) {
        radius = newRadius;
        positionCards(true);
    }
}

window.addEventListener("resize", adjustRadius);
window.addEventListener("DOMContentLoaded", adjustRadius);

startAutoRotation();

});