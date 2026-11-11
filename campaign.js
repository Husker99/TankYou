(() => {
  'use strict';
  const $ = id => document.getElementById(id), Levels = window.TankLevels;
  const storageKey = 'tank-you-campaign-v1';
  const classes = ['stygian','lethe','phleg','ache'];
  const labels = { combat:'Combat', heart:'+1 Heart', refill:'Refill All Hearts', stygian:'Stygian / Styx', lethe:'Lethe', phleg:'Phleg', ache:'Ache' };
  const counts = [2,2,3,2,4,3,2,1];
  const links = [ [[0],[1]], [[0,1,2],[2]], [[0],[0],[1]], [[0,1,2],[3]], [[0],[1],[1],[2]], [[0],[0,1],[1]], [[0],[0]] ];
  let run = null, hooks = {}, fighting = false, storageFailed = false;
  function randomSource(seed) { let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}; }
  function graph(seed) {
    const random=randomSource(seed), levels=Object.keys(Levels.builtInLevels), nodes=[];
    for(let row=0;row<counts.length;row++) for(let column=0;column<counts[row];column++) {
      const roll=random(),type=roll<.5?'combat':roll<.65?'heart':classes[Math.floor(random()*4)];
      const low=Math.floor(row/8*Math.max(0,levels.length-3));
      const levelId=levels[Math.min(levels.length-1,low+Math.floor(random()*Math.min(3,levels.length)))];
      nodes.push({id:`${row}-${column}`,row,column,type,levelId,x:counts[row]===1?450:180+column*540/(counts[row]-1),y:780-row*92,
        next:row===7?[]:links[row][column].map(c=>`${row+1}-${c}`)});
    }
    return nodes;
  }
  function starts() { return run.nodes.filter(n=>n.row===0).map(n=>n.id); }
  function lastRow() { return Math.max(...run.nodes.map(n=>n.row)); }
  function node(id) { return run?.nodes.find(n=>n.id===id); }
  function available() { return !run||run.status!=='active'?[]:run.pending?[run.pending]:run.current==='start'?starts():node(run.current).next; }
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
      const nodes=customMap?window.TankMaps.compile(customMap,data.seed):graph(data.seed),byId=id=>nodes.find(n=>n.id===id),initial=nodes.filter(n=>n.row===0).map(n=>n.id);let current='start';
      for(const id of data.visited){if(!(current==='start'?initial:byId(current).next).includes(id))return;current=id;}
      if(data.current!==current||!classes.every(c=>Number.isInteger(data.rewards?.[c])&&data.rewards[c]>=0&&data.rewards[c]<=30))return;
      if(data.pending&&(!(current==='start'?initial:byId(current).next).includes(data.pending)||byId(data.pending)?.type!=='combat'))return;
      if(data.status==='active'&&data.hearts===0)return;
      if(data.status==='complete'&&byId(current)?.row!==Math.max(...nodes.map(n=>n.row)))return;
      const maxHearts=data.maxHearts??3;
      if(!Number.isInteger(maxHearts)||maxHearts<1||maxHearts>30)return;
      run={...data,nodes,customMap,maxHearts,hearts:Math.min(data.hearts,maxHearts)};
    } catch { /* An unusable local save leaves a fresh run available. */ }
  }
  function newRun(seed = Math.floor(Math.random()*4294967296),customMap = run?.customMap || null) {
    if(customMap)customMap=window.TankMaps.validate(customMap);
    run={version:1,seed,customMap,nodes:customMap?window.TankMaps.compile(customMap,seed):graph(seed),current:'start',visited:[],hearts:3,maxHearts:3,rewards:Object.fromEntries(classes.map(c=>[c,0])),pending:null,status:'active',message:'Choose a blue-outlined encounter to begin your advance.'};
    fighting=false;save();show();
  }
  function icon(type) {
    const paths={
      combat:'<path d="m8 24 2 2 15-15 2-7-7 2-15 15 2 2-4 4 2 2 4-4 2 2 2-2-4-4Z"/>',
      heart:'<path d="M16 28C9 22 2 17 2 10 2 2 12 1 16 8 20 1 30 2 30 10c0 7-7 12-14 18Z"/>',
      refill:'<circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6h8v6h6v8h-6v6h-8v-6H6v-8h6Z"/>',
      stygian:'<path d="M16 2 29 7v9c0 7-7 12-13 15C10 28 3 23 3 16V7Z"/>',
      lethe:'<rect x="1" y="8" width="30" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="16" r="4"/><circle cx="23" cy="16" r="4"/><path d="M4 6v4m7-4v3m10-3v3m7-3v4M4 22v4m7-3v3m10-3v3m7-4v4"/></g>',
      phleg:'<path d="m3 12 24-7 2 7-23 7Zm7 6-7 10H0l7-12Zm7 2 12 7-1 3-14-8Z"/><circle cx="17" cy="22" r="7"/><circle cx="17" cy="22" r="3" fill="#eee2cd"/>',
      ache:'<circle cx="14" cy="20" r="11"/><path d="m17 9 3-5c3-4 6 4 9 0" fill="none" stroke="currentColor" stroke-width="3"/><path d="m28 1 1 2 3-1-2 3 2 2-4-1-2 3 1-4-3-1 4-1Z"/>',
      tank:'<rect x="4" y="4" width="5" height="25" rx="1" fill="#49382c"/><rect x="23" y="4" width="5" height="25" rx="1" fill="#49382c"/><path d="M9 5h14v23H9Z"/><circle cx="16" cy="16" r="7" fill="#428de0"/><path d="M14 0h4v16h-4Z"/>'
    };
    return `<svg class="campaign-icon" viewBox="0 0 32 32" aria-hidden="true">${paths[type]||paths.combat}</svg>`;
  }
  function show() {
    if(!run){newRun();return;}
    fighting=false;$('campaign-new-confirm').hidden=true;hooks.onMap?.();render();
  }
  function completeNode(n,message) {
    run.current=n.id;run.visited.push(n.id);run.pending=null;run.message=message;
    if(n.row===lastRow()){run.status='complete';run.message='Map 1 cleared. Your tank made it through the first campaign map.';}
    save();render();
  }
  function choose(id) {
    if(fighting||!available().includes(id))return;
    const n=node(id);
    if(n.type==='combat'){
      run.pending=id;save();fighting=true;
      hooks.onCombat?.(Levels.builtInLevels[n.levelId],{hearts:run.hearts,maxHearts:run.maxHearts,onHealthChange:health=>{run.hearts=health;save();}});
    } else if(n.type==='refill'){
      run.hearts=run.maxHearts;completeNode(n,'All hearts refilled.');
    } else if(n.type==='heart'){
      const full=run.hearts>=run.maxHearts;
      run.hearts=Math.min(run.maxHearts,run.hearts+1);completeNode(n,full?'Hearts are already full. Choose your next encounter.':'Gained 1 heart. Choose your next encounter.');
    } else {
      run.rewards[n.type]++;completeNode(n,`${labels[n.type]} requisition collected. Upgrade effects are coming later.`);
    }
  }
  function finishCombat(won) {
    if(!fighting||!run.pending)return;
    fighting=false;
    if(won)completeNode(node(run.pending),'Combat cleared. Choose your next encounter.');
    else {run.hearts=0;run.status='lost';run.message='Your run has ended. Start a new run to try another route.';save();}
  }
  function render() {
    $('campaign-title').textContent=run.customMap?.name||'Campaign Map';
    const options=available(),visited=new Set(run.visited),board=$('campaign-board');
    Levels.renderHearts($('campaign-hearts'),run.hearts,run.maxHearts);
    $('campaign-message').textContent=(run.pending&&run.status==='active'?'An encounter is in progress. Select its blue node to resume combat.':run.message)+(storageFailed?' Progress could not be saved in this browser.':'');
    $('campaign-rewards').innerHTML=classes.map(c=>`<div class="campaign-reward">${icon(c)}<span>${c==='stygian'?'Styx':labels[c]} × ${run.rewards[c]}</span></div>`).join('');
    let lines='';
    const edge=(from,to,reachable,done)=>{lines+=`<path d="M${from.x} ${from.y} L${to.x} ${to.y}" fill="none" stroke="${reachable?'#287bc0':done?'#778653':'#858466'}" stroke-width="${reachable?4:2.5}" stroke-dasharray="9 7" opacity="${reachable||done?1:.6}"/>`;};
    const start={x:450,y:867};for(const id of starts())edge(start,node(id),run.current==='start'&&options.includes(id),visited.has(id));
    for(const n of run.nodes)for(const next of n.next)edge(n,node(next),run.current===n.id&&options.includes(next),visited.has(n.id)&&visited.has(next));
    for(const end of run.nodes.filter(n=>n.row===lastRow()))edge(end,{x:450,y:47},run.status==='complete',false);
    board.innerHTML=`<svg class="campaign-routes" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true"><path d="M760 0C620 180 830 300 750 430S610 600 730 900" fill="none" stroke="#939f8b" stroke-width="18" opacity=".18"/><g stroke="#8f9474" stroke-width="1" fill="none" opacity=".15"><path d="M10 130Q180 10 250 190T80 380T180 600T0 800"/><path d="M10 150Q150 35 225 195T65 370T160 610T0 820"/></g>${lines}</svg><span class="campaign-start" style="left:50%;top:96.3%">${icon('tank')} START</span><span class="campaign-goal" style="left:50%;top:5.2%">${run.status==='complete'?'Map 1 cleared':'Map 2'}</span>`;
    for(const n of run.nodes){
      const button=document.createElement('button');const selectable=options.includes(n.id);
      button.type='button';button.className='campaign-node'+(selectable?' reachable':'')+(visited.has(n.id)?' visited':'')+(run.current===n.id?' current':'');
      button.style.left=`${n.x/9}%`;button.style.top=`${n.y/9}%`;button.style.color=n.type==='combat'?'#303a2d':['heart','refill'].includes(n.type)?'#be3f2c':'#237bb5';
      button.disabled=!selectable;button.innerHTML=icon(n.type);
      const text=`Row ${n.row+1}: ${labels[n.type]}${visited.has(n.id)?' — completed':selectable?' — available':' — unavailable'}`;
      button.setAttribute('aria-label',text);button.title=text;button.onclick=()=>choose(n.id);board.appendChild(button);
    }
    const summary=$('campaign-summary');summary.hidden=run.status==='active';
    if(!summary.hidden){summary.innerHTML=run.status==='complete'?'<h3>Map 1 cleared!</h3><p>Maps 2 and 3 are coming later. The full campaign is not complete yet.</p>':'<h3>Run ended</h3><p>Start a new run to chart another course.</p>';}
  }
  $('campaign-legend').innerHTML=Object.entries(labels).map(([type,label])=>`<div class="campaign-legend-row" style="color:${type==='combat'?'#303a2d':['heart','refill'].includes(type)?'#be3f2c':'#237bb5'}">${icon(type)}<span>${label}</span></div>`).join('');
  $('campaign-back').onclick=()=>{fighting=false;save();hooks.onMenu?.();};
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
  window.TankCampaign={configure(value){hooks=value;},open:show,newRun,startMap(map){newRun(Math.floor(Math.random()*4294967296),map);},icon,choose,finishCombat,suspend(){fighting=false;save();},inCombat:()=>fighting,getState:()=>run?JSON.parse(JSON.stringify(run)):null};
})();
