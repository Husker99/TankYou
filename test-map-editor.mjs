import fs from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';
const root=new URL('./',import.meta.url),store=new Map(),elements={};
function element(id=''){
 return {value:id==='map-event'?'combat':'',hidden:false,innerHTML:'',textContent:'',style:{},attributes:{},children:[],options:[],classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},appendChild(c){this.children.push(c);},replaceChildren(...items){this.options=items;this.value=items[0]?.value||'';},add(item){this.options.push(item);},click(){this.onclick?.();},remove(){}};
}
const tools=['place','connect','erase'].map(v=>({...element(),dataset:{mapTool:v}}));
const context={console,store,Math,structuredClone,Blob,setTimeout:fn=>fn(),Option:class{constructor(label,value){this.label=label;this.value=value;}},URL:{createObjectURL(blob){context.exportedMap=blob;return 'blob:map';},revokeObjectURL(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>elements[id]??=element(id),querySelectorAll:()=>tools,createElement:element,body:element()},window:{}};
for(const file of ['levels.js','maps.js','campaign.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const tests=`
return (async()=>{
let passed=0;const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};
let playedMap=null;hooks={onOpen(){},onPlay(map){playedMap=map;},onBack(){}};
window.TankMapEditor.open();check(Maps.validate(draft).nodes.length===19,'Template is a valid playable map');
check($('map-combat-level').options.length===12,'Combat selector includes random plus eleven supplied levels');
$('map-new').onclick();check(!draft.nodes.length&&draft.rows===8,'New blank clears encounters');
$('map-rows').value='2';$('map-resize').onclick();check(draft.rows===2,'Row count can be changed');
$('map-event').value='combat';$('map-combat-level').value='level-1';cell(0,0);check(draft.nodes[0].levelId==='level-1','Place combat with specific level');
$('map-event').value='refill';cell(1,0);check(draft.nodes[1].type==='refill','Place refill-all-hearts encounter');
setTool('connect');cell(0,0);cell(1,0);check(draft.nodes[0].next[0]==='1-0','Connect consecutive rows');
cell(1,0);check(draft.nodes[0].next.length===0,'Click existing pair removes connection');cell(1,0);source=null;
check(Maps.validate(draft).nodes.length===2,'Connected two-row map is playable');
const stable=JSON.stringify(draft);setTool('connect');cell(1,0);check(source===null&&JSON.stringify(draft)===stable,'Cannot start a connection from final row');
setTool('place');$('map-event').value='ache';cell(1,1);setTool('connect');cell(0,0);cell(1,1);check(draft.nodes[0].next.length===2,'Add a branch');
$('map-undo').onclick();check(draft.nodes[0].next.length===1,'Undo removes branch');$('map-redo').onclick();check(draft.nodes[0].next.length===2,'Redo restores branch');
setTool('erase');cell(1,1);check(!draft.nodes.some(n=>n.id==='1-1')&&draft.nodes[0].next.length===1,'Erase removes incoming paths too');
$('map-name').value='Custom Campaign';$('map-save').onclick();check(library()[0].map.name==='Custom Campaign','Save map locally');
const saved=savedId;$('map-new').onclick();$('map-saved').value=saved;$('map-load').onclick();check(draft.name==='Custom Campaign'&&draft.nodes.length===2,'Load saved custom map');
$('map-export').onclick();const exported=JSON.parse(await exportedMap.text());check(exported.kind==='tank-you-map'&&exported.nodes[1].type==='refill','Export preserves graph and refill encounter');
$('map-play').onclick();check(playedMap.name==='Custom Campaign','Play Map passes validated custom map');
let options=null;Campaign.configure({onMap(){},onCombat(level,opts){options=opts;check(level.name==='Level 1','Custom combat uses assigned level');}});Campaign.startMap(playedMap);
check(Campaign.getState().nodes.length===2&&Campaign.getState().customMap.name==='Custom Campaign','Custom graph launches as a roguelike run');
Campaign.choose('0-0');options.onHealthChange(1);Campaign.finishCombat(true);Campaign.choose('1-0');check(Campaign.getState().hearts===3&&Campaign.getState().status==='complete','Refill restores all hearts to capacity and custom final row completes map');
$('map-file').files=[{size:100,text:async()=>JSON.stringify(exported)}];await $('map-file').onchange({target:$('map-file')});check(draft.name==='Custom Campaign','Import accepts map JSON');
const unchanged=JSON.stringify(draft);$('map-file').files=[{size:100,text:async()=>'{broken'}];await $('map-file').onchange({target:$('map-file')});check(JSON.stringify(draft)===unchanged,'Bad import preserves draft');
$('map-template').onclick();$('map-rows').value='4';$('map-resize').onclick();check(draft.rows===4&&draft.nodes.every(n=>n.row<4&&n.next.every(id=>Number(id.split('-')[0])<4)),'Resize crops nodes and stale connections');$('map-undo').onclick();check(draft.rows===8&&Maps.validate(draft),'Undo restores cropped routes');
$('map-new').onclick();playedMap=null;$('map-play').onclick();check(playedMap===null,'Incomplete map cannot start run');
let invalid=false;const bad=Maps.template();bad.nodes[0].next=['7-1'];try{Maps.validate(bad);}catch{invalid=true;}check(invalid,'Validation rejects skipped rows');
invalid=false;const tooWide=Maps.template();tooWide.nodes[0].column=4;try{Maps.validate(tooWide);}catch{invalid=true;}check(invalid,'Validation rejects fifth position');
invalid=false;const deadEnd=Maps.template();deadEnd.nodes[0].next=[];try{Maps.validate(deadEnd);}catch{invalid=true;}check(invalid,'Validation rejects dead ends');
invalid=false;const duplicate=Maps.template();duplicate.nodes.push({...duplicate.nodes[0]});try{Maps.validate(duplicate);}catch{invalid=true;}check(invalid,'Validation rejects duplicate nodes');
invalid=false;const tooMany=Maps.template();tooMany.nodes[0].next=['1-0','1-1','1-2','1-3'];try{Maps.validate(tooMany);}catch{invalid=true;}check(invalid,'Validation rejects four outgoing choices');
check(store.has(draftKey),'Map draft autosaves');
console.log(passed+' roguelike map editor checks passed');
})();
`;
await vm.runInNewContext(fs.readFileSync(new URL('map-editor.js',root),'utf8').replace(/\}\)\(\);\s*$/,tests+'\n})();'),context);
// Reopen the persisted campaign in a new module context, with its map definition.
const context2={...context,window:{TankLevels:context.window.TankLevels,TankMaps:context.window.TankMaps}};
vm.runInNewContext(fs.readFileSync(new URL('campaign.js',root),'utf8'),context2);
if(context2.window.TankCampaign.getState()?.customMap?.name!=='Custom Campaign')throw Error('Custom map save did not restore');
console.log('Custom campaign save restored');
