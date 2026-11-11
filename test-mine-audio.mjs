import fs from 'node:fs';
import vm from 'node:vm';
let tones=0,noise=0,passed=0;
const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
const node=()=>({frequency:param,gain:param,connect(){},disconnect(){},start(){},stop(){}});
let audioContext;
const context={console,Math,window:{AudioContext:class{
 constructor(){audioContext=this;this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};}
 createOscillator(){tones++;return node();}createGain(){return node();}createBiquadFilter(){return node();}
 createBuffer(channels,length){return {getChannelData(){return new Float32Array(length);}};}
 createBufferSource(){noise++;return node();}
}}};
vm.runInNewContext(fs.readFileSync(new URL('./mine-audio.js',import.meta.url),'utf8'),context);
const check=(ok,name)=>{if(!ok)throw Error(name);passed++;};
context.window.TankMineAudio.play('place');check(tones===2&&noise===0,'Placement plays short mechanical tones');
context.window.TankMineAudio.play('fuse');check(tones===3&&noise===0,'Fuse plays warning tick');
context.window.TankMineAudio.play('explode');check(tones===4&&noise===1,'Explosion combines low boom and filtered noise');
context.window.TankMineAudio.play('explode');check(noise===1,'Simultaneous chain explosions avoid audio overload');
audioContext.currentTime=.1;context.window.TankMineAudio.play('explode');check(noise===2,'Later explosion plays normally');
delete context.window.AudioContext;context.window.TankMineAudio.play('place');check(tones===5,'Unsupported audio stays safe');
console.log(passed+' mine audio checks passed');
