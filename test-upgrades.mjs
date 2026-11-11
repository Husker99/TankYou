import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('./',import.meta.url),store=new Map();
function boot(){const elements={};const element=()=>({hidden:false,style:{},innerHTML:'',textContent:'',children:[],classList:{toggle(){}},setAttribute(){},replaceChildren(...items){this.children=items;},appendChild(v){this.children.push(v);}});
 const context={console,Math:Object.create(Math),window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>elements[id]??=element(),createElement:element}};
 for(const file of ['levels.js','maps.js','encounters.js','upgrades.js','campaign.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
 let scene='',combat=null;context.window.TankCampaign.configure({onMap(){scene='map';},onUpgrade(){scene='upgrades';},onCombat(level,options){scene='combat';combat={level,options};},onMenu(){scene='menu';}});
 return {context,elements,U:context.window.TankUpgrades,C:context.window.TankCampaign,get scene(){return scene;},get combat(){return combat;}};
}
let passed=0;const check=(ok,label)=>{if(!ok)throw Error(label);passed++;};let app=boot(),{U,C}=app;
for(let i=0;i<50;i++){const offers=U.offers({});check(offers.length===2&&new Set(offers).size===2&&offers.every(id=>['blessing','defy','stun'].includes(id)),'New run offers two eligible upgrades '+i);}
check(U.offers({blessing:1,favored:1,hero:1,stun:1,grasp:1}).every(id=>id==='defy'),'Defy Death remains available after all unique upgrades');
const map={version:1,kind:'tank-you-map',name:'Upgrade Test',columns:3,rows:15,mapNumber:1,nodes:Array.from({length:15},(_,row)=>({id:row+'-1',row,column:1,type:row===7?'combat':row===8?'lethe':'stygian',levelId:'random',next:row===14?[]:[row+1+'-1']}))};
app.context.Math.random=()=>0;C.startMap(map);C.choose('0-1');check(app.elements['upgrade-choices'].children.length===2,'Styx opens two-choice menu');
const pending=JSON.stringify(C.getState().pendingUpgrade);C.choose('1-1');check(JSON.stringify(C.getState().pendingUpgrade)===pending&&C.getState().visited.length===0,'Upgrade must be chosen before route advances');
C.takeUpgrade('grasp');check(C.getState().visited.length===0,'Unqualified upgrade cannot be selected');
app=boot();C=app.C;app.context.Math.random=()=>0;C.open();check(JSON.stringify(C.getState().pendingUpgrade)===pending,'Pending choices survive browser reload without reroll');
C.takeUpgrade('blessing');check(C.getState().upgrades.blessing===1&&C.getState().visited.length===1&&app.scene==='map','Choosing Blessing grants it and advances route');
C.choose('1-1');check(C.getState().pendingUpgrade.offers.join(',')==='favored,hero','Shield prerequisite unlocks Favored and Hero');C.takeUpgrade('favored');
C.choose('2-1');C.takeUpgrade('hero');check(C.getState().upgrades.favored&&C.getState().upgrades.hero,'Both shield upgrades can be acquired');
C.choose('3-1');C.takeUpgrade('stun');C.choose('4-1');check(C.getState().pendingUpgrade.offers.includes('grasp'),'Stun unlocks Deaths Grasp');C.takeUpgrade('grasp');
C.choose('5-1');C.takeUpgrade('defy');check(C.getState().maxHearts===4&&C.getState().hearts===2,'Defy Death adds capacity without healing');
C.choose('6-1');C.takeUpgrade('defy');check(C.getState().maxHearts===5&&C.getState().upgrades.defy===2,'Defy Death repeats');
C.choose('7-1');check(app.combat.options.upgrades.blessing&&app.combat.options.upgrades.grasp&&app.combat.options.maxHearts===5,'Combat receives all run upgrades and capacity');
app.combat.options.onAbilityChange({shieldTime:0,shieldCooldown:8,stunCooldown:2,stunArmed:false});C.finishCombat(true);C.choose('8-1');check(app.elements['upgrade-title'].textContent==='Lethe','Lethe opens its own upgrade menu');C.takeUpgrade(C.getState().pendingUpgrade.offers[0]);check(C.getState().rewards.lethe===1&&C.getState().current==='8-1','Lethe choice grants upgrade and advances route');
app=boot();C=app.C;check(C.getState().upgrades.defy===2&&C.getState().abilityState.shieldCooldown===8,'Upgrades and cooldown state persist');C.newRun(42,null);check(!C.getState().upgrades.blessing&&C.getState().maxHearts===3,'New run clears upgrades and extra capacity');

for(let i=0;i<30;i++){const options=U.offers({},'lethe');check(options.length===2&&new Set(options).size===2&&options.every(id=>['forged','rockets','lithe'].includes(id)),'Lethe initial offers respect prerequisites '+i);}
check(U.offers({forged:3,rockets:3,lithe:1,swivel:1,executor:1},'lethe').length===0,'Exhausted Lethe pool does not offer capped upgrades');
check(U.normalize({forged:7,rockets:8,lithe:4}).forged===3&&U.normalize({rockets:8}).rockets===3,'Repeatable Lethe upgrades clamp to three stacks');
app=boot();C=app.C;app.context.Math.random=()=>0;const letheMap={...map,nodes:map.nodes.map(n=>({...n,type:'lethe'}))};C.startMap(letheMap);
for(let row=0;row<3;row++){C.choose(row+'-1');C.takeUpgrade('forged');}
check(C.getState().upgrades.forged===3,'Forged Treads can be chosen three times');C.choose('3-1');check(!C.getState().pendingUpgrade.offers.includes('forged'),'Forged Treads stops appearing at three stacks');C.takeUpgrade('lithe');
C.choose('4-1');check(C.getState().pendingUpgrade.offers.includes('swivel'),'Lithe unlocks Swivel Shield');C.takeUpgrade('swivel');
C.choose('5-1');check(C.getState().pendingUpgrade.offers.includes('executor'),'Lithe unlocks Executor');C.takeUpgrade('executor');
check(C.getState().upgrades.lithe&&C.getState().upgrades.swivel&&C.getState().upgrades.executor,'All prerequisite Lethe abilities can be acquired');
check(U.offers({},'phleg').every(id=>['typhon','forgiveness'].includes(id)),'Phleg hides dependent mine upgrades before Typhon');
check(U.definitions.protector.requires==='typhon'&&U.definitions.fires.requires==='typhon','Mine improvements require Typhon');
app=boot();C=app.C;app.context.Math.random=()=>0;const phlegMap={...map,nodes:map.nodes.map(n=>({...n,type:'phleg'}))};C.startMap(phlegMap);C.choose('0-1');check(C.getState().pendingUpgrade.offers.includes('typhon'),'Phleg encounter opens upgrade choices');C.takeUpgrade('typhon');C.choose('1-1');check(C.getState().pendingUpgrade.offers.includes('protector'),'Typhon unlocks Protector offer');C.takeUpgrade('protector');check(C.getState().upgrades.typhon&&C.getState().upgrades.protector,'Phleg selections persist in campaign');
console.log(passed+' upgrade checks passed');
