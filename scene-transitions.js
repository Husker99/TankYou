(() => {
  'use strict';
  const battlefield=document.getElementById('game-view'),veil=document.getElementById('scene-transition');
  if(!battlefield||!veil||typeof MutationObserver==='undefined')return;
  let wasVisible=!battlefield.hidden,animation;
  new MutationObserver(()=>{
    const visible=!battlefield.hidden;if(visible===wasVisible)return;wasVisible=visible;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    animation?.cancel();animation=veil.animate([{opacity:.72},{opacity:0}],{duration:180,easing:'ease-out'});
  }).observe(battlefield,{attributes:true,attributeFilter:['hidden']});
})();
