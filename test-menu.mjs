import fs from 'node:fs';
import vm from 'node:vm';
import { URLSearchParams } from 'node:url';
const elements = {}, listeners = {}, tracks = [];
function element() { return { attributes: {}, setAttribute(key,value) { this.attributes[key]=value; }, hidden: false, textContent: '', children: [], appendChild(child) { this.children.push(child); } }; }
let pausedGame = false, played = null, openedEditor = false;
const context = {
  console, URLSearchParams, Math: Object.create(Math),
  Audio: class {
    constructor(src) { this.src = src; this.paused = true; this.listeners = {}; tracks.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    play() { this.paused = false; this.listeners.play?.(); return Promise.resolve(); }
    pause() { this.paused = true; this.listeners.pause?.(); }
  },
  document: { hidden: false, getElementById(id) { return elements[id] ??= element(); }, createElement: element, body: element(), addEventListener(name, fn) { listeners[name] = fn; } },
  window: { location: { search: '' }, addEventListener() {} }
};
const root = new URL('./', import.meta.url);
vm.runInNewContext(fs.readFileSync(new URL('levels.js', root), 'utf8'), context);
context.window.TankGame = { setEditing(value) { pausedGame = value; }, loadLevel(level) { played = level; pausedGame = false; } };
context.document.getElementById('open-editor').onclick = () => { openedEditor = true; pausedGame = true; elements['editor-view'].hidden = false; };
vm.runInNewContext(fs.readFileSync(new URL('menu.js', root), 'utf8'), context);
await Promise.resolve();
let passed = 0;
const check = (condition, name) => { if (!condition) throw new Error(name); passed++; };
check(!elements['menu-view'].hidden && elements['game-view'].hidden && pausedGame, 'Landing menu pauses and hides combat');
check(tracks[0].volume === .25 && tracks[0].loop, 'Theme loops at 25 percent volume');
check(elements['menu-levels'].children.map(b => b.textContent).join(',') === 'Level 1,Level 2,Level 3,Level 4,Level 5,Level 6,Level 7,Level 8,Level 9,Level 10', 'Menu lists exactly the ten supplied levels');
elements['menu-levels'].children[2].onclick();
check(played.name === 'Level 3' && !elements['game-view'].hidden && elements['menu-view'].hidden, 'Level button opens chosen level');
check(tracks[0].paused, 'Menu music stops during gameplay');
elements['home-logo'].onclick();
check(!elements['menu-view'].hidden && pausedGame && !tracks[0].paused, 'Tank You logo returns to menu and resumes music');
elements['menu-music'].onclick();
check(tracks[0].paused, 'Music toggle mutes theme');
check(elements['menu-music'].attributes['aria-pressed']==='true'&&elements['menu-music'].attributes['aria-label']==='Unmute music','Muted icon has accessible unmute action');
listeners.pointerdown({ target: {} });
check(tracks[0].paused, 'Muted music stays muted after interaction');
elements['menu-music'].onclick();
check(!tracks[0].paused && tracks[0].volume === .25, 'Music toggle resumes at intended volume');
check(elements['menu-music'].attributes['aria-pressed']==='false'&&elements['menu-music'].attributes['aria-label']==='Mute music','Playing icon has accessible mute action');
elements['menu-editor'].onclick();
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
console.log(`${passed} menu checks passed`);
