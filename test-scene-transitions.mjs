import fs from 'node:fs';import vm from 'node:vm';
let callback,plays=0,cancels=0,reduced=false,passed=0;
const battlefield={hidden:true},veil={animate(frames,options){if(options.duration!==180)throw Error('Transition must remain brief');plays++;return {cancel(){cancels++;}};}};
const context={window:{matchMedia:()=>({matches:reduced})},document:{getElementById:id=>id==='game-view'?battlefield:veil},MutationObserver:class{constructor(fn){callback=fn;}observe(){}}};
vm.runInNewContext(fs.readFileSync(new URL('./scene-transitions.js',import.meta.url),'utf8'),context);
const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};
callback();check(plays===0,'Menu-only navigation does not animate');battlefield.hidden=false;callback();check(plays===1,'Entering battlefield transitions');callback();check(plays===1,'Repeated attribute mutation does not replay transition');battlefield.hidden=true;callback();check(plays===2&&cancels===1,'Leaving battlefield transitions and cancels previous animation');reduced=true;battlefield.hidden=false;callback();check(plays===2,'Reduced motion disables transition');
console.log(passed+' scene transition checks passed');
