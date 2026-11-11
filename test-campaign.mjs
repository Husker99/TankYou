import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('./',import.meta.url),store=new Map();
function boot(){
 const elements={};const element=()=>({hidden:false,innerHTML:'',textContent:'',style:{},children:[],attributes:{},appendChild(child){this.children.push(child);},setAttribute(k,v){this.attributes[k]=v;}});
 const context={console,Math,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>elements[id]??=element(),createElement:element},window:{}};
 vm.runInNewContext(fs.readFileSync(new URL('levels.js',root),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(new URL('campaign.js',root),'utf8'),context);
 const C=context.window.TankCampaign;let combat=null,maps=0;
 C.configure({onMap(){maps++;},onCombat(level,options){combat={level,options};},onMenu(){}});
 return {C,elements,get combat(){return combat;},get maps(){return maps;}};
}
let passed=0;const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};
let app=boot(),C=app.C;C.newRun(123);let state=C.getState();
check(state.maxHearts===3&&state.hearts===2&&state.current==='start'&&state.status==='active','Run starts with two hearts in three slots');
check(state.nodes.length===36,'Map contains thirty-six encounter nodes');
const rows=Array.from({length:15},(_,row)=>state.nodes.filter(n=>n.row===row));
check(rows.every(r=>r.length<=4)&&rows.map(r=>r.length).join(',')==='2,2,3,2,4,3,2,1,2,3,2,4,3,2,1','Map width never exceeds four choices');
check(state.nodes.filter(n=>n.next.length===3).length===2&&state.nodes.some(n=>n.next.length===1),'Map mixes single paths with three-way branches');
let reached=new Set(['0-0','0-1']);for(const n of state.nodes)if(reached.has(n.id))for(const next of n.next)reached.add(next);
check(reached.size===36,'Every node is reachable from start');
check(state.nodes.every(n=>n.row===14||n.next.length>0),'No early dead ends');
check(state.nodes.every(n=>n.next.every(id=>state.nodes.find(x=>x.id===id)?.row===n.row+1)),'Paths only advance to next tier');
C.choose('7-0');check(C.getState().current==='start','Cannot skip to locked encounter');
C.newRun(123);check(JSON.stringify(C.getState().nodes)===JSON.stringify(state.nodes),'Seed reproduces graph encounters');
let totals={combat:0,heart:0,power:0};const categories=new Set();for(let seed=0;seed<400;seed++){C.newRun(seed);for(const n of C.getState().nodes){totals[n.type==='combat'?'combat':n.type==='heart'?'heart':'power']++;if(!['combat','heart'].includes(n.type))categories.add(n.type);}}
const total=Object.values(totals).reduce((a,b)=>a+b,0);check(Math.abs(totals.combat/total-.5)<.025&&Math.abs(totals.heart/total-.15)<.025&&Math.abs(totals.power/total-.35)<.025,'Event distribution follows fifty/fifteen/thirty-five weights');
check(categories.size===4,'All four upgrade classes can appear');
C.newRun(123);let combats=0,hearts=0,power=0;
for(let depth=0;depth<15;depth++){
 state=C.getState();const options=state.current==='start'?['0-0','0-1']:state.nodes.find(n=>n.id===state.current).next;const n=state.nodes.find(n=>n.id===options[0]);const oldHearts=state.hearts;
 C.choose(n.id);
 if(n.type==='combat'){
  combats++;check(C.inCombat()&&C.getState().pending===n.id,'Combat remains pending until victory');
  check(app.combat.level.name===app.C.getState().nodes.find(x=>x.id===n.id).levelId.replace('level-','Level '),'Combat loads selected built-in level');
  const snapshot=JSON.stringify(C.getState());C.choose(n.id);check(JSON.stringify(C.getState())===snapshot,'Repeated click cannot duplicate encounter');
  app.combat.options.onHealthChange(Math.max(1,oldHearts-1));C.finishCombat(true);C.open();
  check(C.getState().hearts===Math.max(1,oldHearts-1)&&C.getState().pending===null,'Health carries after combat and pending clears');
 }else if(n.type==='heart'){hearts++;check(C.getState().hearts===Math.min(3,oldHearts+1),'Heart heals one health up to slot capacity');}
 else{power++;check(C.getState().rewards[n.type]>0,'Category node records a requisition without defining effects');}
 check(C.getState().visited.length===depth+1,'Each resolved encounter advances one tier');
}
check(C.getState().status==='complete'&&C.getState().visited.length===15,'Completing final encounter clears only map one');
check(app.elements['campaign-summary'].innerHTML.includes('Maps 2 and 3 are coming later'),'Completion does not claim full campaign victory');
const completed=JSON.stringify(C.getState());C.choose('0-0');check(JSON.stringify(C.getState())===completed,'Completed run cannot enter more encounters');
app=boot();C=app.C;check(C.getState()?.status==='complete','Completed campaign restores from browser storage');
C.newRun(456);let pendingNode;
for(let depth=0;depth<15;depth++){state=C.getState();const ids=state.current==='start'?['0-0','0-1']:state.nodes.find(n=>n.id===state.current).next;pendingNode=state.nodes.find(n=>n.id===ids[0]);C.choose(pendingNode.id);if(C.inCombat())break;}
check(C.inCombat(),'Can enter combat in a new run');app.combat.options.onHealthChange(2);C.suspend();check(!C.inCombat()&&C.getState().pending,'Leaving combat suspends but preserves encounter');
app=boot();C=app.C;check(C.getState()?.hearts===2&&C.getState().pending===pendingNode.id,'Reload restores health and pending combat');C.open();C.choose(pendingNode.id);check(C.inCombat()&&app.combat.options.hearts===2,'Pending encounter resumes with saved hearts');C.finishCombat(false);check(C.getState().status==='lost'&&C.getState().hearts===0,'Lethal encounter ends run');
C.open();check(!app.elements['campaign-summary'].hidden,'Lost run shows summary');C.newRun(222);check(C.getState().status==='active'&&C.getState().hearts===2&&C.getState().visited.length===0,'New run resets hearts and route');
app.elements['campaign-new'].onclick();check(!app.elements['campaign-new-confirm'].hidden,'Replacing active run requests confirmation');app.elements['campaign-new-no'].onclick();check(app.elements['campaign-new-confirm'].hidden&&C.getState().seed===222,'Cancel preserves run');
store.set('tank-you-campaign-v1','{broken');app=boot();check(app.C.getState()===null,'Broken save safely falls back to fresh run');

C=app.C;let heartStart;for(let seed=0;seed<100;seed++){C.newRun(seed);heartStart=C.getState().nodes.find(n=>n.row===0&&n.type==='heart');if(heartStart)break;}
C.choose(heartStart.id);check(C.getState().hearts===3&&C.getState().maxHearts===3,'Heart encounter cannot exceed default three slots');
check((app.elements['campaign-hearts'].innerHTML.match(/heart-slot filled/g)||[]).length===3&&!app.elements['campaign-hearts'].innerHTML.includes('♥ 3'),'Map shows three heart icons instead of numeric counter');
let savedSlots=JSON.parse(store.get('tank-you-campaign-v1'));savedSlots.maxHearts=5;savedSlots.hearts=4;store.set('tank-you-campaign-v1',JSON.stringify(savedSlots));app=boot();app.C.open();check((app.elements['campaign-hearts'].innerHTML.match(/heart-slot /g)||[]).length===5&&app.elements['campaign-hearts'].attributes['aria-label']==='4 of 5 hearts','Heart display supports future extra slots');
delete savedSlots.maxHearts;savedSlots.hearts=6;store.set('tank-you-campaign-v1',JSON.stringify(savedSlots));app=boot();check(app.C.getState().maxHearts===3&&app.C.getState().hearts===3,'Older uncapped saves migrate to three slots');
C=app.C;C.open();
check(app.elements['campaign-board'].style.height==='2520px','Campaign map is twice its prior height');
const displayed=app.elements['campaign-board'].children.at(-1),sourceNode=C.getState().nodes.at(-1);check(displayed.style.left===((450+(sourceNode.x-450)*.5)/9)+'%','Map columns render at half their former horizontal distance');
const legend=app.elements['campaign-legend'].innerHTML;check(legend.indexOf('Boss')>legend.indexOf('Combat')&&legend.indexOf('Boss')<legend.indexOf('+1 Heart'),'Boss follows Combat in legend');check(C.icon('lethe').includes('m13 5'),'Lethe icon uses forward speed chevrons');
check(app.elements['campaign-board'].innerHTML.includes('vector-effect="non-scaling-stroke"'),'Route dashes and widths stay uniform when map is stretched');
console.log(`${passed} campaign checks passed`);
