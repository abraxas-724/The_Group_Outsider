
let last = 0;
window.addEventListener('scroll', () => {
  const current = window.scrollY;
  const nav = document.getElementById('navbar');
  current > last ? nav.classList.add('hidden') : nav.classList.remove('hidden');
  last = current;
});


function toggleDetail(card){
  card.classList.toggle('active');
}





particlesJS('particles-js', {
  particles: {
    number: { value: 70 },
    color: { value: '#4f46e5' },
    shape: { type: 'circle' },
    opacity: { value: 0.4 },
    size: { value: 4 },
    line_linked: {
      enable: true,
      distance: 150,
      color: '#4f46e5',
      opacity: 0.25,
      width: 1
    },
    move: {
      enable: true,
      speed: 3,
      direction: 'none',
      random: true,
      out_mode: 'out'
    }
  },
  interactivity: {
    detect_on: 'canvas',
    events: {
      onhover: { enable: true, mode: 'grab' },
      onclick: { enable: true, mode: 'push' }
    }
  }
});




/*轮播图*/
new Swiper('.swiper', {
  loop: true,
  autoplay: { delay: 3000, disableOnInteraction: false },
  pagination: { el: '.swiper-pagination', clickable: true },
  navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  effect: 'coverflow',
  coverflowEffect: {
    rotate: 50,
    stretch: 0,
    depth: 100,
    modifier: 1,
    slideShadows: true
  }
});

