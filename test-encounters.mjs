import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('./',import.meta.url),store=new Map(),elements={};
const element=()=>({style:{},attributes:{},hidden:false,innerHTML:'',textContent:'',children:[],classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},appendChild(child){this.children.push(child);}});
const context={console,Math:Object.create(Math),window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>elements[id]??=element(),createElement:element}};
for(const file of ['levels.js','maps.js','encounters.js','campaign.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const E=context.window.TankEncounters,C=context.window.TankCampaign,L=context.window.TankLevels,M=context.window.TankMaps;
let passed=0;const check=(ok,label)=>{if(!ok)throw Error(label);passed++;};
for(let map=1;map<=3;map++){check(E.bankFor(map,0)==map+'a'&&E.bankFor(map,7)==map+'a','First eight rows use early bank for map '+map);check(E.bankFor(map,8)==map+'b'&&E.bankFor(map,14)==map+'b','Last seven rows use late bank for map '+map);}
check(E.banks['1a'].map(e=>e.id).join(',')==='1a1,1a2,1a3,1a4,1a5','All five uploaded 1a encounters are registered');
for(const entry of E.banks['1a'])check(L.compile(entry.level).enemies.length>0,entry.id+' is playable');
check(E.banks['1b'].map(e=>e.id).join(',')==='1b1,1b2,1b3,1b4,1b5','All five uploaded 1b encounters are registered');
for(const entry of E.banks['1b'])check(L.compile(entry.level).enemies.length>0,entry.id+' is playable');
check(E.banks['1boss'].map(e=>e.id).join(',')==='1boss1,1boss2','Both uploaded Map 1 bosses are registered');
for(const entry of E.banks['1boss'])check(L.compile(entry.level).enemies.length>0,entry.id+' is playable');
context.Math.random=()=>0;check(E.pick('1boss').id==='1boss1','Random boss selection can choose first uploaded fight');context.Math.random=()=>.99;check(E.pick('1boss').id==='1boss2','Random boss selection can choose second uploaded fight');
E.banks['1boss'].splice(0);E.banks['1b'].splice(0);E.banks['1a'].splice(0);check(E.pick('1a')===null,'Empty bank has no substitute encounters');
const map={version:1,kind:'tank-you-map',name:'Bank Test',rows:15,columns:3,mapNumber:1,nodes:Array.from({length:15},(_,row)=>({id:row+'-1',row,column:1,type:row===0||row===8?'combat':'heart',levelId:'random',next:row===14?[]:[row+1+'-1']}))};
let combat=null;C.configure({onMap(){},onCombat(level,options){combat={level,options};}});C.startMap(map);C.choose('0-1');check(!C.inCombat()&&!C.getState().pending&&!elements['campaign-bank-notice'].hidden,'Missing bank reports issue without consuming encounter');
for(const id of ['1a1','1a2','1b1','2a1','2b1','3a1','3b1']){const level=L.clone(L.defaultLevel);level.name=id;E.banks[id.slice(0,2)].push({id,level});}
context.Math.random=()=>0;C.choose('0-1');check(C.inCombat()&&combat.level.name==='1a1','Map 1 early combat picks from 1a bank');C.suspend();C.open();context.Math.random=()=>.99;C.choose('0-1');check(combat.level.name==='1a1','Resuming encounter preserves selected combat instead of rerolling');C.finishCombat(true);for(let row=1;row<8;row++)C.choose(row+'-1');C.choose('8-1');check(combat.level.name==='1b1','Map 1 row nine switches to 1b');
check(E.pick('1a','1a1').id==='1a2','Multiple encounters avoid immediate repeat');
for(const number of [2,3]){C.startMap({...map,mapNumber:number});C.choose('0-1');check(combat.level.name===number+'a1','Map '+number+' picks its own bank');C.finishCombat(true);for(let row=1;row<8;row++)C.choose(row+'-1');C.choose('8-1');check(combat.level.name===number+'b1','Map '+number+' switches to its late bank');}
const template=M.template();check(template.columns===3&&template.nodes.every(n=>n.column<3),'Map template uses exactly three possible columns');
const old={...map,columns:undefined,nodes:map.nodes.map(n=>({...n,id:n.row+'-2',column:2,next:n.next.map(id=>id.split('-')[0]+'-2')}))};const migrated=M.expand(old);check(migrated.nodes.every(n=>n.column===1)&&M.validate(migrated),'Legacy five-column center maps to new center without losing routes');
C.newRun(123,null);check(C.getState().nodes.every(n=>n.column<3)&&Array.from({length:15},(_,row)=>C.getState().nodes.filter(n=>n.row===row).length).every(n=>n<=3),'Generated maps also stay three wide');

C.startMap(map);C.choose('0-1');C.finishCombat(true);for(let row=1;row<8;row++)C.choose(row+'-1');C.choose('8-1');C.finishCombat(true);for(let row=9;row<15;row++)C.choose(row+'-1');
check(C.getState().status==='active','Final normal row does not clear map before boss');C.choose('boss');check(!C.inCombat()&&elements['campaign-bank-notice'].textContent.includes('1boss'),'Missing boss bank blocks exit with a clear notice');
const bossLevel=L.clone(L.defaultLevel);bossLevel.name='1boss1';E.banks['1boss'].push({id:'1boss1',level:bossLevel});C.choose('boss');check(C.inCombat()&&combat.level.name==='1boss1','Exit launches selected map boss');C.suspend();C.open();C.choose('boss');check(combat.level.name==='1boss1','Boss selection survives resume');C.finishCombat(true);check(C.getState().status==='complete'&&C.getState().current==='boss','Only boss victory clears map');
vm.runInNewContext(fs.readFileSync(new URL('campaign.js',root),'utf8'),context);check(context.window.TankCampaign.getState()?.current==='boss','Completed boss route restores correctly');
vm.runInNewContext(fs.readFileSync(new URL('campaign-maps.js',root),'utf8'),context);context.window.TankCampaign.configure({onMap(){}});context.window.TankCampaign.openDefault();check(context.window.TankCampaign.getState().customMap?.name==='Map 1a'&&context.window.TankCampaign.getState().nodes.length===22,'Roguelike opens supplied Map 1a');
console.log(passed+' encounter bank checks passed');
