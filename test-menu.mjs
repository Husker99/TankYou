import fs from 'node:fs';
import vm from 'node:vm';
import { URLSearchParams } from 'node:url';
const elements = {}, listeners = {}, tracks = [];
function element() { return { style: {}, options: [], classList:{toggle(){}}, replaceChildren(...items){this.options=items;this.value=items[0]?.value||'';}, add(item){this.options.push(item);}, attributes: {}, setAttribute(key,value) { this.attributes[key]=value; }, hidden: false, textContent: '', children: [], appendChild(child) { this.children.push(child); } }; }
let pausedGame = false, played = null, playedOptions = null, openedEditor = false;
const campaignStore=new Map(),timers=new Map();let timerSequence=0;
const context = {
  setTimeout(fn,ms){const id=++timerSequence;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  console, URLSearchParams, structuredClone, Option:class{constructor(label,value){this.label=label;this.value=value;}}, Math: Object.create(Math),
  localStorage:{getItem:k=>campaignStore.get(k)||null,setItem:(k,v)=>campaignStore.set(k,v)},
  Audio: class {
    constructor(src) { this.src = src; this.paused = true; this.listeners = {}; tracks.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    play() { this.paused = false; this.listeners.play?.(); return Promise.resolve(); }
    pause() { this.paused = true; this.listeners.pause?.(); }
  },
  document: { hidden: false, getElementById(id) { return elements[id] ??= element(); }, createElement: element, querySelectorAll:()=>[], body: element(), addEventListener(name, fn) { listeners[name] = fn; } },
  window: { location: { search: '' }, addEventListener() {} }
};
const root = new URL('./', import.meta.url);
vm.runInNewContext(fs.readFileSync(new URL('levels.js', root), 'utf8'), context);
context.window.TankGame = { setEditing(value) { pausedGame = value; }, loadLevel(level, options) { playedOptions=options; played = level; pausedGame = false; } };
context.document.getElementById('open-editor').onclick = () => { openedEditor = true; pausedGame = true; elements['editor-view'].hidden = false; };
vm.runInNewContext(fs.readFileSync(new URL('maps.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('encounters.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('upgrades.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('campaign.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('map-editor.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('menu.js', root), 'utf8'), context);
await Promise.resolve();
let passed = 0;
const check = (condition, name) => { if (!condition) throw new Error(name); passed++; };
check(!elements['menu-view'].hidden && elements['game-view'].hidden && pausedGame, 'Landing menu pauses and hides combat');
check(tracks[0].paused&&elements['menu-music'].attributes['aria-pressed']==='true'&&elements['menu-music'].attributes['aria-label']==='Unmute music','Menu music starts muted by default');
elements['menu-music'].onclick();await Promise.resolve();
check(tracks[0].volume === .25 && tracks[0].loop, 'Theme loops at 25 percent volume');
check(elements['menu-levels'].children.map(b => b.textContent).join(',') === 'Level 1,Level 2,Level 3,Level 4,Level 5,Level 6,Level 7,Level 8,Level 9,Level 10,Level 11', 'Menu lists exactly the eleven supplied levels');
check(!elements['menu-home'].hidden&&elements['quick-play-view'].hidden,'Home initially hides level selection');
const initialTrack=tracks[0].src;
elements['menu-quick-play'].onclick();check(elements['menu-home'].hidden&&!elements['quick-play-view'].hidden&&pausedGame,'Quick Play opens separate level screen while combat stays paused');
check(!tracks[0].paused&&tracks[0].src===initialTrack,'Quick Play keeps menu music playing without restarting');
elements['quick-play-back'].onclick();check(!elements['menu-home'].hidden&&elements['quick-play-view'].hidden,'Back returns to three main buttons');
elements['menu-quick-play'].onclick();
elements['menu-levels'].children[2].onclick();
check(played.name === 'Level 3' && !elements['game-view'].hidden && elements['menu-view'].hidden, 'Level button opens chosen level');
check(tracks[0].paused, 'Menu music stops during gameplay');
elements['home-logo'].onclick();
check(!elements['menu-view'].hidden && pausedGame && !tracks[0].paused, 'Tank You logo returns to menu and resumes music');
check(!elements['menu-home'].hidden&&elements['quick-play-view'].hidden,'Logo returns to main menu rather than level selection');
elements['menu-music'].onclick();
check(tracks[0].paused, 'Music toggle mutes theme');
check(elements['menu-music'].attributes['aria-pressed']==='true'&&elements['menu-music'].attributes['aria-label']==='Unmute music','Muted icon has accessible unmute action');
listeners.pointerdown({ target: {} });
check(tracks[0].paused, 'Muted music stays muted after interaction');
elements['menu-music'].onclick();
check(!tracks[0].paused && tracks[0].volume === .25, 'Music toggle resumes at intended volume');
check(elements['menu-music'].attributes['aria-pressed']==='false'&&elements['menu-music'].attributes['aria-label']==='Mute music','Playing icon has accessible mute action');
elements['menu-editor'].onclick();
check(!elements['editor-choice-view'].hidden&&elements['editor-view'].hidden,'Level Editor first presents Map or Level choices');elements['choose-level-editor'].onclick();
check(openedEditor && tracks[0].paused && elements['menu-view'].hidden, 'Editor button opens editor and stops menu music');
elements['home-logo'].onclick(); context.document.hidden = true; listeners.visibilitychange();
check(tracks[0].paused, 'Hidden page pauses theme');
context.document.hidden = false; listeners.visibilitychange();
check(!tracks[0].paused, 'Visible menu resumes theme');
context.Math.random = () => .1; elements['home-logo'].onclick();
check(tracks[0].src === 'audio/menu-messing-around.m4a', 'Lower 25 percent selects alternate track');
context.Math.random = () => .25; elements['home-logo'].onclick();
check(tracks[0].src === 'audio/menu-theme.m4a', 'Other 75 percent selects original track');
context.Math.random = () => .01; listeners.pointerdown({ target: {} });
check(tracks[0].src === 'audio/menu-theme.m4a', 'Interaction does not reroll music during menu visit');
check(tracks[0].volume === .25, 'Both menu tracks use 25 percent volume');

elements['menu-levels'].children[0].onclick();context.window.TankGame.onRoundEnd({won:true});
check(!elements['quick-play-result'].hidden&&!elements['result-next-level'].disabled,'Quick Play victory exposes level selection and next level');
elements['result-next-level'].onclick();check(played.name==='Level 2'&&elements['quick-play-result'].hidden,'Next Level advances and clears victory actions');
context.window.TankGame.onRoundEnd({won:false});check(!elements['quick-play-result'].hidden&&!elements['result-next-level'].disabled,'Loss exposes Level Select and Next Level');check(elements['result-title'].textContent==='Room Failed'&&elements['play-again'].textContent==='Try Again','Quick Play defeat has failure title and retry label');check(elements['game-header'].hidden,'Quick Play battlefield hides top bar');elements['result-next-level'].onclick();check(played.name==='Level 3','Next Level also advances after failure');context.window.TankGame.onRoundEnd({won:false});
context.window.TankGame.onRoundEnd({won:true});elements['result-level-select'].onclick();check(!elements['menu-view'].hidden&&!elements['quick-play-view'].hidden&&elements['menu-home'].hidden&&pausedGame,'Level Select returns directly to Quick Play menu');
elements['menu-levels'].children.at(-1).onclick();context.window.TankGame.onRoundEnd({won:true});check(elements['result-next-level'].disabled&&!elements['quick-play-result'].hidden,'Final level disables Next Level while preserving Level Select');
const lastPlayed=played;elements['result-next-level'].onclick();check(played===lastPlayed,'Final level cannot advance past end of list');
elements['menu-editor'].onclick();context.window.TankGame.onRoundEnd({won:true});check(elements['quick-play-result'].hidden,'Editor playtest victory does not expose Quick Play controls');

elements['menu-roguelike'].onclick();check(!elements['campaign-view'].hidden&&elements['menu-view'].hidden&&pausedGame,'Roguelike button opens campaign map with combat paused');
const Campaign=context.window.TankCampaign;Campaign.newRun(123);
for(let depth=0;depth<8&&!Campaign.inCombat();depth++){const r=Campaign.getState();const ids=r.current==='start'?r.nodes.filter(n=>n.row===0).map(n=>n.id):r.nodes.find(n=>n.id===r.current).next;Campaign.choose(ids[0]);if(Campaign.getState().pendingUpgrade)Campaign.takeUpgrade(Campaign.getState().pendingUpgrade.offers[0]);}
check(Campaign.inCombat()&&!elements['game-view'].hidden&&elements['campaign-view'].hidden&&playedOptions.campaign&&playedOptions.hearts===2,'Campaign node loads combat with campaign health');
check(elements.reset.hidden&&elements['open-editor'].hidden,'Campaign combat hides room reset and editor buttons');
context.window.TankGame.onRoundEnd({won:true});check(elements['campaign-result'].hidden&&!elements['campaign-victory-summary'].hidden&&elements['quick-play-result'].hidden&&elements['play-again'].hidden,'Campaign victory shows automatic summary instead of continuation button');
check([...timers.values()].some(t=>t.ms===1500),'Campaign victory lasts 1.5 seconds');
const savedInCombat=Campaign.inCombat;Campaign.inCombat=()=>true;listeners.click({preventDefault(){},stopImmediatePropagation(){}});check(!timers.size&&!elements['campaign-view'].hidden,'Click anywhere skips victory and cancels automatic return');context.window.TankGame.onRoundEnd({won:true});Campaign.inCombat=savedInCombat;
const victoryTimer=[...timers.entries()].find(([,t])=>t.ms===1500);timers.delete(victoryTimer[0]);victoryTimer[1].fn();check(!elements['campaign-view'].hidden&&elements['game-view'].hidden&&pausedGame,'Victory automatically returns to campaign map');
for(let depth=0;depth<8&&!Campaign.inCombat();depth++){const r=Campaign.getState();if(r.status!=='active')break;const ids=r.current==='start'?r.nodes.filter(n=>n.row===0).map(n=>n.id):r.nodes.find(n=>n.id===r.current).next;Campaign.choose(ids[0]);if(Campaign.getState().pendingUpgrade)Campaign.takeUpgrade(Campaign.getState().pendingUpgrade.offers[0]);}
elements['home-logo'].onclick();check(!Campaign.inCombat()&&!elements['menu-view'].hidden,'Home suspends campaign encounter safely');
elements['menu-levels'].children[0].onclick();context.window.TankGame.onRoundEnd({won:true});check(!elements['quick-play-result'].hidden,'Quick Play victory remains separate after leaving campaign');

elements['menu-editor'].onclick();elements['choose-map-editor'].onclick();check(!elements['map-editor-view'].hidden&&elements['editor-choice-view'].hidden&&elements['game-header'].hidden,'Map choice opens map editor');
elements['map-play'].onclick();check(!elements['campaign-view'].hidden&&elements['map-editor-view'].hidden&&Campaign.getState().customMap?.name==='Untitled Map','Play Map launches authored map and hides editor');
elements['campaign-back'].onclick();elements['menu-editor'].onclick();elements['choose-map-editor'].onclick();elements['map-editor-back'].onclick();check(!elements['editor-choice-view'].hidden&&elements['map-editor-view'].hidden,'Map editor Back returns to Map or Level chooser');

elements['editor-choice-back'].onclick();elements['menu-quick-play'].onclick();elements['quick-play-roguelike'].onclick();check(!elements['roguelike-levels-view'].hidden&&elements['quick-play-view'].hidden&&elements['roguelike-levels-empty'].hidden&&elements['roguelike-level-list'].children.length===12,'Quick Play lists all twelve uploaded Roguelike Levels');elements['roguelike-levels-back'].onclick();check(!elements['quick-play-view'].hidden&&elements['roguelike-levels-view'].hidden,'Roguelike Levels Back returns to Quick Play');

const styxMap=context.window.TankMaps.template();styxMap.nodes.filter(n=>n.row===0).forEach(n=>n.type='stygian');Campaign.startMap(styxMap);Campaign.choose(Campaign.getState().nodes.find(n=>n.row===0).id);check(!elements['upgrade-view'].hidden&&elements['campaign-view'].hidden&&pausedGame,'Styx node opens dedicated upgrade screen and pauses combat');
const offered=Campaign.getState().pendingUpgrade.offers[0];Campaign.takeUpgrade(offered);check(elements['upgrade-view'].hidden&&!elements['campaign-view'].hidden,'Selecting upgrade returns to campaign map');

// Leaving a victory screen cancels its pending automatic return.
for(let step=0;step<15&&!Campaign.inCombat();step++){const r=Campaign.getState();if(r.status!=='active')break;const options=r.pendingUpgrade?[r.pendingUpgrade.nodeId]:r.current==='start'?r.nodes.filter(n=>n.row===0).map(n=>n.id):r.nodes.find(n=>n.id===r.current).next;Campaign.choose(options[0]);if(Campaign.getState().pendingUpgrade)Campaign.takeUpgrade(Campaign.getState().pendingUpgrade.offers[0]);}
if(Campaign.inCombat()){context.window.TankGame.onRoundEnd({won:true});check([...timers.values()].some(t=>t.ms===1500),'Second victory schedules return');elements['home-logo'].onclick();check(![...timers.values()].some(t=>t.ms===1500),'Navigation cancels stale victory timeout');}

const campaignBeforeTesting=JSON.stringify(Campaign.getState());context.window.TankTestLoadout={getOptions(){return {testLoadout:true,hearts:2,maxHearts:4,upgrades:{blessing:1,defy:1}};}};elements['roguelike-level-list'].children[0].onclick();check(playedOptions.testLoadout&&playedOptions.upgrades.blessing,'Roguelike Quick Play applies test upgrade selection');check(JSON.stringify(Campaign.getState())===campaignBeforeTesting,'Test fight does not mutate campaign progress or upgrades');context.window.TankGame.onRoundEnd({won:true});check(!elements['quick-play-result'].hidden&&!timers.size,'Test victory retains manual Quick Play controls without automatic campaign return');elements['result-next-level'].onclick();check(playedOptions.testLoadout&&playedOptions.upgrades.blessing,'Next encounter retains test loadout');elements['menu-levels'].children[0].onclick();check(playedOptions===undefined,'Regular Quick Play does not receive test upgrades');
elements['menu-quick-play'].onclick();elements['menu-home-logo'].onclick();check(!elements['menu-home'].hidden&&elements['quick-play-view'].hidden,'Main logo returns from Quick Play selection to home');
console.log(`${passed} menu checks passed`);
