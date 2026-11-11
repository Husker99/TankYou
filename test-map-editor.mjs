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
let passed=0;const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};let playedMap=null;
hooks={onOpen(){},onPlay(map){playedMap=map;},onBack(){}};
window.TankMapEditor.open();check(Maps.validate(draft).rows===15,'Template has fifteen rows');
check(draft.nodes.every(n=>n.column<3),'Template fits three columns');
check($('map-editor-board').style.height==='2520px','Tall editor allows scrolling rather than shrinking nodes');
$('map-new').onclick();check(draft.rows===15&&!draft.nodes.length,'Blank map has fifteen rows');
for(let row=0;row<15;row++){$('map-event').value=row===0?'combat':'refill';$('map-combat-level').value='level-1';setTool('place');cell(row,0);}
setTool('place');$('map-event').value='ache';cell(0,2);check(draft.nodes.some(n=>n.column===2),'Third column supports encounter placement');setTool('erase');cell(0,2);
for(let row=0;row<14;row++){setTool('connect');cell(row,0);cell(row+1,0);}
check(Maps.validate(draft).nodes.length===15,'All fifteen rows connect into a playable route');
$('map-name').value='Custom Campaign';$('map-save').onclick();check(library()[0].map.rows===15,'Save preserves fifteen rows');const saved=savedId;
$('map-new').onclick();$('map-saved').value=saved;$('map-load').onclick();check(draft.nodes.length===15,'Load restores tall map');
$('map-export').onclick();const exported=JSON.parse(await exportedMap.text());check(exported.rows===15&&exported.nodes[1].type==='refill','Export preserves tall graph');
$('map-play').onclick();check(playedMap.rows===15,'Play uses fifteen-row map');
let options;Campaign.configure({onMap(){},onCombat(level,opts){options=opts;}});Campaign.startMap(playedMap);Campaign.choose('0-0');options.onHealthChange(1);Campaign.finishCombat(true);Campaign.choose('1-0');check(Campaign.getState().hearts===3,'Refill still heals all hearts');for(let row=2;row<15;row++)Campaign.choose(row+'-0');check(Campaign.getState().status==='complete','Run completes at row fifteen');
$('map-file').files=[{size:100,text:async()=>JSON.stringify(exported)}];await $('map-file').onchange({target:$('map-file')});check(draft.rows===15,'Import preserves tall map');
const stable=JSON.stringify(draft);$('map-file').files=[{size:100,text:async()=>'{broken'}];await $('map-file').onchange({target:$('map-file')});check(JSON.stringify(draft)===stable,'Bad import preserves draft');
setTool('erase');cell(5,0);check(!draft.nodes.some(n=>n.id==='5-0')&&!draft.nodes.find(n=>n.id==='4-0').next.length,'Erase removes incoming connections');$('map-undo').onclick();check(Maps.validate(draft),'Undo restores valid route');$('map-redo').onclick();playedMap=null;$('map-play').onclick();check(!playedMap,'Broken route cannot play');
const legacy={version:1,kind:'tank-you-map',name:'Old Map',rows:2,nodes:[{id:'0-0',row:0,column:0,type:'combat',levelId:'level-1',next:['1-0']},{id:'1-0',row:1,column:0,type:'refill',levelId:'random',next:[]}]};replace(legacy);check(draft.rows===15&&Maps.validate(draft).nodes.length===15,'Legacy map extends to fifteen rows with connected encounters');
let invalid=false;const tooWide=Maps.template();tooWide.nodes[0].column=3;try{Maps.validate(tooWide);}catch{invalid=true;}check(invalid,'Fourth column is rejected');
invalid=false;const skipped=Maps.template();skipped.nodes[0].next=['14-2'];try{Maps.validate(skipped);}catch{invalid=true;}check(invalid,'Skipped row connection is rejected');
console.log(passed+' roguelike map editor checks passed');
})();
`;
await vm.runInNewContext(fs.readFileSync(new URL('map-editor.js',root),'utf8').replace(/\}\)\(\);\s*$/,tests+'\n})();'),context);
// Reopen the persisted campaign in a new module context, with its map definition.
const context2={...context,window:{TankLevels:context.window.TankLevels,TankMaps:context.window.TankMaps}};
vm.runInNewContext(fs.readFileSync(new URL('campaign.js',root),'utf8'),context2);
if(context2.window.TankCampaign.getState()?.customMap?.name!=='Custom Campaign')throw Error('Custom map save did not restore');
console.log('Custom campaign save restored');
