(() => {
  'use strict';
  const U=window.TankUpgrades,$=id=>document.getElementById(id),key='tank-you-test-loadout-v1';
  let selected=U.normalize(),hearts=2;
  function clean(){selected=U.normalize(selected);for(const [id,def]of Object.entries(U.definitions))if(def.requires&&!selected[def.requires])selected[id]=0;hearts=Math.max(1,Math.min(3+(selected.defy||0),Math.floor(hearts)||2));}
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){selected=saved.upgrades||{};hearts=saved.hearts;clean();}}catch{}
  function save(){try{localStorage.setItem(key,JSON.stringify({upgrades:selected,hearts}));}catch{}}
  function sync(){
    clean();const max=3+(selected.defy||0);$('test-health').value=hearts;$('test-health').max=max;$('test-capacity').textContent=`/ ${max} hearts`;
    for(const [id,def]of Object.entries(U.definitions)){
      const input=$('test-upgrade-'+id);input.disabled=!!def.requires&&!selected[def.requires];
      if(def.repeatable)input.value=selected[id];else input.checked=!!selected[id];
      $('test-row-'+id).classList?.toggle('unavailable',input.disabled);
    }
  }
  for(const category of ['stygian','lethe','phleg']){
    const container=$('test-loadout-'+category);
    for(const [id,def]of Object.entries(U.definitions))if((def.category||'stygian')===category){
      const row=document.createElement('label');row.id='test-row-'+id;row.className='test-upgrade-row';row.title=def.description;
      const name=document.createElement('span');name.textContent=def.name+(def.requires?' · needs '+U.definitions[def.requires].name:'');
      const input=document.createElement('input');input.id='test-upgrade-'+id;input.type=def.repeatable?'number':'checkbox';
      if(def.repeatable){input.min=0;input.max=def.limit||997;input.step=1;}
      input.onchange=()=>{selected[id]=def.repeatable?Math.max(0,Math.min(def.limit||997,Math.floor(Number(input.value))||0)):input.checked?1:0;sync();save();};
      row.appendChild(name);row.appendChild(input);container.appendChild(row);
    }
  }
  $('test-health').onchange=()=>{hearts=Number($('test-health').value);sync();save();};
  $('test-full-health').onclick=()=>{hearts=3+(selected.defy||0);sync();save();};
  $('test-reset-loadout').onclick=()=>{selected=U.normalize();hearts=2;sync();save();};
  sync();
  window.TankTestLoadout={getOptions(){clean();return {testLoadout:true,upgrades:{...selected},hearts,maxHearts:3+(selected.defy||0)};}};
})();
