// Inline UI init extracted from game.html
// - Save/Load bar: stopPropagation and S&L mini toggle

document.addEventListener('DOMContentLoaded', ()=>{
  const bar = document.getElementById('dialogue-save-load-bar');
  if(bar){
    bar.querySelectorAll('button').forEach(btn=> btn.addEventListener('click', e=> e.stopPropagation()));
  }
  const settingsBtn = document.getElementById('open-settings');
  if(settingsBtn){
    settingsBtn.addEventListener('click', e=>{ e.stopPropagation(); window.app && window.app.openSettingsOverlay(); });
  }
  const slToggle = document.getElementById('sl-toggle');
  const slMini = document.getElementById('sl-mini');
  if(slToggle && slMini){
    slToggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      const showing = slMini.classList.toggle('show');
      if(showing){
        slMini.classList.remove('hidden');
        slToggle.classList.add('open');
      } else {
        slToggle.classList.remove('open');
        setTimeout(()=> slMini.classList.add('hidden'), 220);
      }
    });
    document.addEventListener('click', (e)=>{
      if(!slMini.classList.contains('show')) return;
      if(!slMini.contains(e.target) && e.target!==slToggle){
        slMini.classList.remove('show');
        slToggle.classList.remove('open');
        setTimeout(()=> slMini.classList.add('hidden'), 200);
      }
    });
  }
});
