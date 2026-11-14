(() => {
  'use strict';
  const $ = id => document.getElementById(id), Levels = window.TankLevels;
  const storageKey = 'tank-you-campaign-v1';
  const classes = ['stygian','lethe','phleg','ache'];
  const labels = { combat:'Combat', heart:'+1 Heart', refill:'Refill All Hearts', stygian:'Armor', lethe:'Mobility', phleg:'Armaments', ache:'Gunnery', boss:'Boss' };
  const counts = [2,2,3,2,4,3,2,1,2,3,2,4,3,2,1];
  const links = [ [[0],[1]], [[0,1,2],[2]], [[0],[0],[1]], [[0,1,2],[3]], [[0],[1],[1],[2]], [[0],[0,1],[1]], [[0],[0]], [[0,1]], [[0,1],[1,2]], [[0],[0,1],[1]], [[0,1],[2,3]], [[0],[0,1],[1,2],[2]], [[0],[0,1],[1]], [[0],[0]] ];
  let run = null, hooks = {}, fighting = false, storageFailed = false;
  function randomSource(seed) { let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}; }
  function graph(seed,rows=15,legacy=false) {
    if(window.TankMaps&&!legacy){
      const random=randomSource(seed),levels=Object.keys(Levels.builtInLevels);
      return window.TankMaps.template().nodes.map(n=>{
        const roll=random(),type=roll<.5?'combat':roll<.65?'heart':classes[Math.floor(random()*4)];
        const low=Math.floor(n.row/15*Math.max(0,levels.length-3));
        return {...n,type,levelId:levels[Math.min(levels.length-1,low+Math.floor(random()*Math.min(3,levels.length)))],x:135+n.column*315,y:780-n.row*644/14};
      });
    }
    const random=randomSource(seed), levels=Object.keys(Levels.builtInLevels), nodes=[];
    for(let row=0;row<rows;row++) for(let column=0;column<counts[row];column++) {
      const roll=random(),type=roll<.5?'combat':roll<.65?'heart':classes[Math.floor(random()*4)];
      const low=Math.floor(row/rows*Math.max(0,levels.length-3));
      const levelId=levels[Math.min(levels.length-1,low+Math.floor(random()*Math.min(3,levels.length)))];
      nodes.push({id:`${row}-${column}`,row,column,type,levelId,x:counts[row]===1?450:180+column*540/(counts[row]-1),y:780-row*644/(rows-1),
        next:row===rows-1?[]:links[row][column].map(c=>`${row+1}-${c}`)});
    }
    return nodes;
  }
  function starts() { return run.nodes.filter(n=>n.row===0).map(n=>n.id); }
  function lastRow() { return Math.max(...run.nodes.map(n=>n.row)); }
  function node(id) { return id==='boss'?{id:'boss',row:lastRow()+1,column:1,type:'boss',x:450,y:47,next:[]}:run?.nodes.find(n=>n.id===id); }
  function available() { return !run||run.status!=='active'?[]:run.pending?[run.pending]:run.pendingUpgrade?[run.pendingUpgrade.nodeId]:run.current==='start'?starts():window.TankEncounters&&run.current!=='boss'&&node(run.current).row===lastRow()?['boss']:node(run.current).next; }
  function save() {
    if(!run)return;
    try { const {nodes,...data}=run;localStorage.setItem(storageKey,JSON.stringify(data));storageFailed=false; }
    catch { storageFailed=true; }
  }
  function restore() {
    try {
      const data=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(!data||data.version!==1||!Number.isInteger(data.seed)||!Number.isInteger(data.hearts)||data.hearts<0||data.hearts>1000||!Array.isArray(data.visited)||!['active','complete','lost'].includes(data.status))return;
      const customMap=data.customMap?window.TankMaps.validate(data.customMap):null;
      const nodes=customMap?window.TankMaps.compile(customMap,data.seed):graph(data.seed,data.generatedRows||8,data.layoutVersion!==3),byId=id=>id==='boss'?{id:'boss',row:Math.max(...nodes.map(n=>n.row))+1,type:'boss',next:[]}:nodes.find(n=>n.id===id),initial=nodes.filter(n=>n.row===0).map(n=>n.id);
      const nextFrom=id=>window.TankEncounters&&id!=='boss'&&byId(id)?.row===Math.max(...nodes.map(n=>n.row))?['boss']:byId(id)?.next||[];let current='start';
      for(const id of data.visited){if(!(current==='start'?initial:nextFrom(current)).includes(id))return;current=id;}
      if(data.current!==current||!classes.every(c=>Number.isInteger(data.rewards?.[c])&&data.rewards[c]>=0&&data.rewards[c]<=30))return;
      if(data.pending&&(!(current==='start'?initial:nextFrom(current)).includes(data.pending)||!['combat','boss'].includes(byId(data.pending)?.type)))return;
      if(data.status==='active'&&data.hearts===0)return;
      if(data.status==='complete'&&current!=='boss'&&byId(current)?.row!==Math.max(...nodes.map(n=>n.row)))return;
      if(data.pendingUpgrade){
        const pending=data.pendingUpgrade,U=window.TankUpgrades;
        if(!U||!['stygian','lethe','phleg','ache'].includes(byId(pending.nodeId)?.type)||!(current==='start'?initial:nextFrom(current)).includes(pending.nodeId)||!Array.isArray(pending.offers)||pending.offers.length>2||pending.offers.some(id=>!U.definitions[id]))return;
      }
      const maxHearts=data.maxHearts??3;
      if(!Number.isInteger(maxHearts)||maxHearts<1||maxHearts>1000)return;
      run={...data,nodes,customMap,upgrades:window.TankUpgrades?.normalize(data.upgrades)||{},maxHearts,hearts:Math.min(data.hearts,maxHearts)};
    } catch { /* An unusable local save leaves a fresh run available. */ }
  }
  function newRun(seed = Math.floor(Math.random()*4294967296),customMap = run?.customMap || window.TankMaps?.defaultMap || null) {
    if(customMap)customMap=window.TankMaps.validate(customMap);
    run={version:1,seed,customMap,layoutVersion:3,generatedRows:15,nodes:customMap?window.TankMaps.compile(customMap,seed):graph(seed),current:'start',visited:[],hearts:2,maxHearts:3,upgrades:{},abilityState:{},pendingUpgrade:null,rewards:Object.fromEntries(classes.map(c=>[c,0])),pending:null,pendingEncounter:null,lastEncounter:null,mapNumber:customMap?.mapNumber||1,status:'active',message:'Choose a blue-outlined encounter to begin your advance.'};
    fighting=false;save();show();
  }
  function icon(type) {
    const paths={
      combat:'<path d="m8 24 2 2 15-15 2-7-7 2-15 15 2 2-4 4 2 2 4-4 2 2 2-2-4-4Z"/>',
      heart:'<path d="M16 28C9 22 2 17 2 10 2 2 12 1 16 8 20 1 30 2 30 10c0 7-7 12-14 18Z"/>',
      refill:'<circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6h8v6h6v8h-6v6h-8v-6H6v-8h6Z"/>',
      stygian:'<path d="M16 2 29 7v9c0 7-7 12-13 15C10 28 3 23 3 16V7Z"/>',
      lethe:'<path d="m13 5 11 11-11 11h7l11-11L20 5Z"/><path d="m2 8 8 8-8 8h7l8-8-8-8Z"/><path d="M0 10h5M0 16h8M0 22h5" fill="none" stroke="currentColor" stroke-width="2"/>',
      phleg:'<path d="m3 12 24-7 2 7-23 7Zm7 6-7 10H0l7-12Zm7 2 12 7-1 3-14-8Z"/><circle cx="17" cy="22" r="7"/><circle cx="17" cy="22" r="3" fill="#eee2cd"/>',
      ache:'<circle cx="14" cy="20" r="11"/><path d="m17 9 3-5c3-4 6 4 9 0" fill="none" stroke="currentColor" stroke-width="3"/><path d="m28 1 1 2 3-1-2 3 2 2-4-1-2 3 1-4-3-1 4-1Z"/>',
      boss:'<path d="M4 13C4-1 28-1 28 13v7l-5 3v7h-4v-5h-2v5h-4v-5h-2v5H7v-7l-3-3Z"/><circle cx="10" cy="13" r="4" fill="#eee2cd"/><circle cx="22" cy="13" r="4" fill="#eee2cd"/><path d="m16 17-3 5h6Z" fill="#eee2cd"/>',
      tank:'<rect x="4" y="4" width="5" height="25" rx="1" fill="#49382c"/><rect x="23" y="4" width="5" height="25" rx="1" fill="#49382c"/><path d="M9 5h14v23H9Z"/><circle cx="16" cy="16" r="7" fill="#428de0"/><path d="M14 0h4v16h-4Z"/>'
    };
    return `<svg class="campaign-icon" viewBox="0 0 32 32" aria-hidden="true">${paths[type]||paths.combat}</svg>`;
  }
  function show() {
    if(!run){newRun();return;}
    fighting=false;if(run.pendingUpgrade&&window.TankUpgrades){showUpgrades();return;}$('campaign-bank-notice').hidden=true;$('campaign-new-confirm').hidden=true;hooks.onMap?.();render();
  }
  function completeNode(n,message) {
    run.current=n.id;run.visited.push(n.id);run.pending=null;run.pendingEncounter=null;run.message=message;
    if(n.id==='boss'||(!window.TankEncounters&&n.row===lastRow())){run.status='complete';run.message='Map 1 cleared. Your tank made it through the first campaign map.';}
    save();render();
  }
  function choose(id) {
    if(fighting||!available().includes(id))return;
    const n=node(id);
    if(n.type==='combat'||n.type==='boss'){
      let level=Levels.builtInLevels[n.levelId];
      if(window.TankEncounters){
        const bank=n.type==='boss'?`${run.mapNumber||1}boss`:window.TankEncounters.bankFor(run.mapNumber||run.customMap?.mapNumber||1,n.row,lastRow()+1);
        const encounter=run.pending===id&&run.pendingEncounter?window.TankEncounters.get(run.pendingEncounter):window.TankEncounters.pick(bank,run.lastEncounter);
        if(!encounter){$('campaign-bank-notice').hidden=false;$('campaign-bank-notice').textContent=`No encounters have been uploaded to bank ${bank} yet.`;return;}
        level=encounter.level;run.pendingEncounter=encounter.id;run.lastEncounter=encounter.id;
      }
      $('campaign-bank-notice').hidden=true;
      run.abilityState={};run.pending=id;save();fighting=true;
      hooks.onCombat?.(level,{upgrades:run.upgrades||{},abilityState:run.abilityState||{},onAbilityChange:state=>{run.abilityState=state;save();},hearts:run.hearts,maxHearts:run.maxHearts,onHealthChange:health=>{run.hearts=health;save();}});
    } else if(n.type==='refill'){
      run.hearts=run.maxHearts;completeNode(n,'All hearts refilled.');
    } else if(n.type==='heart'){
      const full=run.hearts>=run.maxHearts;
      run.hearts=Math.min(run.maxHearts,run.hearts+1);completeNode(n,full?'Hearts are already full. Choose your next encounter.':'Gained 1 heart. Choose your next encounter.');
    } else if(['stygian','lethe','phleg','ache'].includes(n.type)&&window.TankUpgrades){
      run.pendingUpgrade=run.pendingUpgrade||{nodeId:n.id,offers:window.TankUpgrades.offers(run.upgrades||{},n.type)};save();showUpgrades();
    } else {
      run.rewards[n.type]++;completeNode(n,`${labels[n.type]} requisition collected. Upgrade effects are coming later.`);
    }
  }
  function showUpgrades(){
    const U=window.TankUpgrades,pending=run.pendingUpgrade;
    if(!pending||!node(pending.nodeId)||!['stygian','lethe','phleg','ache'].includes(node(pending.nodeId).type))return;
    hooks.onUpgrade?.();$('upgrade-title').textContent=labels[node(pending.nodeId).type];$('upgrade-choices').replaceChildren();
    if(!pending.offers.length){const button=document.createElement('button');button.textContent='All upgrades acquired — Continue';button.onclick=()=>{const n=node(pending.nodeId);run.pendingUpgrade=null;run.rewards[n.type]++;completeNode(n,'');show();};$('upgrade-choices').appendChild(button);}
    for(const id of pending.offers){
      const def=U.definitions[id];if(!def)continue;
      const button=document.createElement('button');button.className='upgrade-card';button.type='button';
      const title=document.createElement('h3');title.textContent=def.name;
      const detail=document.createElement('p');detail.textContent=def.description;
      button.appendChild(title);button.appendChild(detail);button.onclick=()=>takeUpgrade(id);$('upgrade-choices').appendChild(button);
    }
  }
  function takeUpgrade(id){
    const U=window.TankUpgrades,pending=run?.pendingUpgrade,def=U?.definitions[id];
    if(!pending||!pending.offers.includes(id)||!def)return;
    run.upgrades=U.normalize(run.upgrades);
    if((def.category||'stygian')!==node(pending.nodeId).type||(def.limit&&run.upgrades[id]>=def.limit)||(!def.repeatable&&run.upgrades[id])||(def.requires&&!run.upgrades[def.requires]))return;
    run.upgrades[id]=(run.upgrades[id]||0)+1;
    if(id==='defy')run.maxHearts++;
    const n=node(pending.nodeId);run.pendingUpgrade=null;run.rewards[n.type]++;completeNode(n,'Upgrade acquired.');show();
  }
  $('upgrade-menu-back').onclick=()=>hooks.onMenu?.();
  function finishCombat(won) {
    if(!fighting||!run.pending)return;
    fighting=false;
    if(won)completeNode(node(run.pending),'Combat cleared. Choose your next encounter.');
    else {run.hearts=0;run.status='lost';run.message='Your run has ended. Start a new run to try another route.';save();}
  }
  function render() {
    $('campaign-progress').textContent=`Map ${run.mapNumber||run.customMap?.mapNumber||1} / 3`;
    $('campaign-view').setAttribute('aria-label',run.customMap?.name||'Campaign Map');
    const options=available(),visited=new Set(run.visited),board=$('campaign-board');
    board.style.height=`${Math.max(650,(lastRow()+1)*84)*2}px`;
    Levels.renderHearts($('campaign-hearts'),run.hearts,run.maxHearts);
    $('campaign-message').textContent=(run.pending&&run.status==='active'?'An encounter is in progress. Select its blue node to resume combat.':run.message)+(storageFailed?' Progress could not be saved in this browser.':'');
    $('campaign-rewards').innerHTML=classes.map(c=>`<div class="campaign-reward">${icon(c)}<span>${c==='stygian'?'Armor':labels[c]} × ${run.rewards[c]}</span></div>`).join('');
    if(window.TankUpgrades){const list=$('campaign-upgrades');list.replaceChildren();for(const [id,count]of Object.entries(run.upgrades||{}))if(count&&window.TankUpgrades.definitions[id]){const item=document.createElement('div');item.textContent=window.TankUpgrades.definitions[id].name+(count>1?` × ${count}`:'');list.appendChild(item);}}
    let lines='';
    const mapX=x=>450+(x-450)*.5;
    const edge=(from,to,reachable,done)=>{from={...from,x:mapX(from.x)};to={...to,x:mapX(to.x)};lines+=`<path d="M${from.x} ${from.y} L${to.x} ${to.y}" vector-effect="non-scaling-stroke" fill="none" stroke="${reachable?'#287bc0':done?'#778653':'#858466'}" stroke-width="${reachable?4:2.5}" stroke-dasharray="9 7" opacity="${reachable||done?1:.6}"/>`;};
    const start={x:450,y:867};for(const id of starts())edge(start,node(id),run.current==='start'&&options.includes(id),visited.has(id));
    for(const n of run.nodes)for(const next of n.next)edge(n,node(next),run.current===n.id&&options.includes(next),visited.has(n.id)&&visited.has(next));
    for(const end of run.nodes.filter(n=>n.row===lastRow()))edge(end,{x:450,y:47},options.includes('boss'),run.status==='complete');
    board.innerHTML=`<svg class="campaign-routes" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true"><path d="M760 0C620 180 830 300 750 430S610 600 730 900" fill="none" stroke="#939f8b" stroke-width="18" opacity=".18"/><g stroke="#8f9474" stroke-width="1" fill="none" opacity=".15"><path d="M10 130Q180 10 250 190T80 380T180 600T0 800"/><path d="M10 150Q150 35 225 195T65 370T160 610T0 820"/></g>${lines}</svg><span class="campaign-start" style="left:50%;top:96.3%">${icon('tank')} START</span><span class="campaign-goal" style="left:50%;top:1.5%">${run.status==='complete'?'Map cleared':'Boss'}</span>`;
    for(const n of [...run.nodes,...(window.TankEncounters?[node('boss')]:[])]){
      const button=document.createElement('button');const selectable=options.includes(n.id);
      button.type='button';button.className='campaign-node'+(n.type==='boss'?' boss-node':'')+(selectable?' reachable':'')+(visited.has(n.id)?' visited':'')+(run.current===n.id?' current':'');
      button.style.left=`${mapX(n.x)/9}%`;button.style.top=`${n.y/9}%`;button.style.color=n.type==='boss'?'#000':['combat'].includes(n.type)?'#303a2d':['heart','refill'].includes(n.type)?'#be3f2c':'#237bb5';
      button.disabled=!selectable;button.innerHTML=icon(n.type);
      const text=`Row ${n.row+1}: ${labels[n.type]}${visited.has(n.id)?' — completed':selectable?' — available':' — unavailable'}`;
      button.setAttribute('aria-label',text);button.title=text;button.onclick=()=>choose(n.id);board.appendChild(button);
    }
    const scroll=$('campaign-scroll');const target=options.length?node(options[0]):node(run.current);
    if(typeof board.offsetHeight==='number')scroll.scrollTop=target?target.y/900*board.offsetHeight-scroll.clientHeight*.65:scroll.scrollHeight;
    const summary=$('campaign-summary');summary.hidden=run.status==='active';
    if(!summary.hidden){summary.innerHTML=run.status==='complete'?'<h3>Map 1 cleared!</h3><p>Maps 2 and 3 are coming later. The full campaign is not complete yet.</p>':'<h3>Run ended</h3><p>Start a new run to chart another course.</p>';}
  }
  $('campaign-legend').innerHTML=['combat','boss','heart','refill','stygian','lethe','phleg','ache'].map(type=>{const label=labels[type];return `<div class="campaign-legend-row" style="color:${type==='boss'?'#000':type==='combat'?'#303a2d':['heart','refill'].includes(type)?'#be3f2c':'#237bb5'}">${icon(type)}<span>${label}</span></div>`;}).join('');
  $('campaign-back').onclick=()=>{fighting=false;save();hooks.onMenu?.();};
  $('campaign-home-logo').onclick=()=>$('campaign-back').onclick();
  $('campaign-new').onclick=()=>{if(run?.status==='active')$('campaign-new-confirm').hidden=false;else newRun();};
  $('campaign-new-yes').onclick=()=>newRun();$('campaign-new-no').onclick=()=>{$('campaign-new-confirm').hidden=true;};
  function toggleLegend(collapsed) {
    $('campaign-sidebar').hidden=collapsed;
    $('campaign-show-legend').hidden=!collapsed;
    $('campaign-layout').classList.toggle('legend-collapsed',collapsed);
    (collapsed?$('campaign-show-legend'):$('campaign-hide-legend')).focus?.();
  }
  $('campaign-hide-legend').onclick=()=>toggleLegend(true);
  $('campaign-show-legend').onclick=()=>toggleLegend(false);
  restore();
  window.TankCampaign={configure(value){hooks=value;},takeUpgrade,open:show,openDefault(){const map=window.TankMaps?.defaultMap;if(map&&JSON.stringify(run?.customMap)!==JSON.stringify(map))newRun(Math.floor(Math.random()*4294967296),map);else show();},newRun,startMap(map){newRun(Math.floor(Math.random()*4294967296),map);},icon,choose,finishCombat,suspend(){fighting=false;save();},inCombat:()=>fighting,getState:()=>run?JSON.parse(JSON.stringify(run)):null};
})();
