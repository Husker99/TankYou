import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('./',import.meta.url),store=new Map();
function boot(){const elements={};function element(){const node={value:'',checked:false,disabled:false,children:[],classList:{toggle(){}},appendChild(child){this.children.push(child);}};Object.defineProperty(node,'id',{get(){return this._id;},set(id){this._id=id;elements[id]=this;}});return node;}
 const context={window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById(id){if(!elements[id]){const node=element();node.id=id;}return elements[id];},createElement:element}};
 for(const file of ['upgrades.js','test-loadout.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
 return {L:context.window.TankTestLoadout,e:elements};
}
let passed=0;const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};let app=boot();
const toggle=(id,value)=>{app.e['test-upgrade-'+id].checked=value;app.e['test-upgrade-'+id].onchange();};
const stacks=(id,value)=>{app.e['test-upgrade-'+id].value=value;app.e['test-upgrade-'+id].onchange();};
check(app.L.getOptions().hearts===2&&app.L.getOptions().maxHearts===3&&app.L.getOptions().testLoadout,'Test loadout starts at two of three hearts');
check(app.e['test-upgrade-favored'].disabled&&app.e['test-upgrade-swivel'].disabled,'Prerequisite upgrades start disabled');
toggle('blessing',true);check(!app.e['test-upgrade-favored'].disabled&&!app.e['test-upgrade-hero'].disabled,'Blessing enables shield upgrades');toggle('favored',true);toggle('hero',true);toggle('blessing',false);check(!app.L.getOptions().upgrades.favored&&!app.L.getOptions().upgrades.hero,'Removing prerequisite removes dependent upgrades');
toggle('lithe',true);toggle('swivel',true);toggle('executor',true);check(app.L.getOptions().upgrades.swivel&&app.L.getOptions().upgrades.executor,'Lethe prerequisites and dependent selections work');
stacks('forged',9);stacks('rockets',9);check(app.L.getOptions().upgrades.forged===3&&app.L.getOptions().upgrades.rockets===3,'Test stack counts obey upgrade caps');
stacks('defy',2);check(app.L.getOptions().maxHearts===5&&app.L.getOptions().hearts===2,'Defy Death adds slots without healing test tank');app.e['test-full-health'].onclick();check(app.L.getOptions().hearts===5,'Full health fills current capacity');stacks('defy',0);check(app.L.getOptions().hearts===3,'Reducing capacity clamps starting health');
const options=app.L.getOptions();options.upgrades.rockets=0;check(app.L.getOptions().upgrades.rockets===3,'Game receives a copy of selected upgrades');
app=boot();check(app.L.getOptions().upgrades.rockets===3&&app.L.getOptions().upgrades.swivel,'Selections survive browser reload');app.e['test-reset-loadout'].onclick();check(app.L.getOptions().hearts===2&&!Object.values(app.L.getOptions().upgrades).some(Boolean),'Reset restores unupgraded test tank');
console.log(passed+' test loadout checks passed');
