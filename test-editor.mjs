import fs from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';
import { URLSearchParams } from 'node:url';
const root = new URL('./', import.meta.url);
const store = new Map(), elements = {};
const drawing = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
function element(id = '') {
  return { value: id === 'ai-type' ? 'sentry' : id === 'spawn-facing' ? 'north' : '', hidden: false, style: {}, dataset: {}, listeners: {}, options: [],
    classList: { toggle() {} }, addEventListener(event, fn) { this.listeners[event] = fn; }, setAttribute() {}, focus() {}, setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 1000 }; }, getContext() { return drawing; },
    replaceChildren(...items) { this.options = items; }, add(item) { this.options.push(item); }, click() { this.onclick?.(); }, remove() {} };
}
const tools = ['player', 'ai', 'scenery', 'erase'].map(name => ({ ...element(), dataset: { tool: name } }));
const context = {
  console, Math, Blob, URLSearchParams, store, setTimeout: fn => fn(),
  URL: { createObjectURL(blob) { context.exportedBlob = blob; return 'blob:test'; }, revokeObjectURL() {} },
  Option: class { constructor(label, value) { this.label = label; this.value = value; } },
  localStorage: { getItem(k) { return store.get(k) || null; }, setItem(k, v) { store.set(k, v); } },
  document: { getElementById(id) { return elements[id] ??= element(id); }, querySelectorAll() { return tools; }, createElement: element, body: { appendChild() {} } },
  window: { location: { search: '' } }
};
vm.runInNewContext(fs.readFileSync(new URL('levels.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('encounters.js', root), 'utf8'), context);
context.window.TankGame = { getLevel() { return context.window.TankLevels.clone(context.window.TankLevels.defaultLevel); }, setEditing(v) { context.editing = v; }, loadLevel(v) { context.played = context.window.TankLevels.validate(v); } };
const tests = `
return (async()=>{
let passed=0;const check=(ok,name)=>{if(!ok)throw new Error(name);passed++;};
$('open-editor').onclick();check(isOpen&&editing===true,'Editor pauses gameplay');
$('new-level').onclick();check(!draft.player&&!draft.enemies.length&&!draft.walls.length,'New blank board');
$('test-level').onclick();check($('editor-message').textContent.includes('player'),'Missing player blocks test');
setTool('player');place({column:1,row:8});check(draft.player.column===1,'Places player start');place({column:2,row:8});check(draft.player.column===2,'Player start is unique and relocates');
setTool('scenery');const before=JSON.stringify(draft);check(!place({column:2,row:8})&&JSON.stringify(draft)===before,'Wall cannot overwrite player');
setTool('ai');place({column:8,row:1});place({column:7,row:1});check(draft.enemies.length===2&&draft.enemies.every(e=>e.facing==='north'),'AI placements always start north');
place({column:8,row:1});check(draft.enemies.length===2&&draft.enemies[0].facing==='north','Clicking existing AI updates properties');
const snapshot=Levels.clone(draft);setTool('scenery');place({column:3,row:4});remember(snapshot);check(undo.length>0,'Edit enters undo history');
$('undo-edit').onclick();check(draft.walls.length===0,'Undo restores level');$('redo-edit').onclick();check(draft.walls.length===1,'Redo restores edit');
setTool('erase');place({column:7,row:1});check(draft.enemies.length===1,'Erase removes selected AI only');
$('level-name').value='Saved test';$('save-level').onclick();check(readLibrary()[0].level.name==='Saved test','Save reads latest name');
const id=savedId;$('new-level').onclick();$('saved-levels').value=id;$('load-saved').onclick();check(draft.name==='Saved test'&&draft.enemies.length===1,'Saved level loads placements');
$('export-level').onclick();const exported=JSON.parse(await exportedBlob.text());check(exported.name==='Saved test'&&exported.version===1,'Export emits valid named level');
const importValue=Levels.clone(Levels.defaultLevel);importValue.name='Imported test';$('level-file').files=[{size:100,text:async()=>JSON.stringify(importValue)}];await $('level-file').listeners.change({target:$('level-file')});check(draft.name==='Imported test','Import loads JSON level');
const safe=JSON.stringify(draft);$('level-file').files=[{size:100,text:async()=>'{broken'}];await $('level-file').listeners.change({target:$('level-file')});check(JSON.stringify(draft)===safe,'Malformed import preserves draft');
$('level-file').files=[{size:100001,text:async()=>''}];await $('level-file').listeners.change({target:$('level-file')});check(JSON.stringify(draft)===safe,'Oversized import preserves draft');
$('test-level').onclick();check(played.name==='Imported test'&&!isOpen,'Test launches the draft');
$('open-editor').onclick();check(draft.name==='Imported test'&&draft.enemies.length===1,'Returning from playtest preserves editor draft');
check(store.has(draftKey),'Draft autosaves locally');
const noStorage=localStorage.setItem;localStorage.setItem=()=>{throw new Error('Storage blocked')};persist();check(storageWarning,'Storage failure is detected');localStorage.setItem=noStorage;
$('new-level').onclick();setTool('scenery');
canvas.listeners.pointerdown({button:0,pointerId:1,clientX:125,clientY:166.67,preventDefault(){}});
canvas.listeners.pointermove({buttons:1,clientX:375,clientY:166.67});canvas.listeners.pointerup();
check(draft.walls.length===4,'Drag paints contiguous wall cells');$('undo-edit').onclick();check(draft.walls.length===0,'One undo removes an entire paint stroke');$('redo-edit').onclick();
canvas.listeners.pointerdown({button:2,pointerId:2,clientX:125,clientY:166.67,preventDefault(){}});canvas.listeners.pointerup();check(draft.walls.length===3,'Right click erases a cell');

$('new-level').onclick();check(draft.grid.columns===12&&draft.grid.rows===9,'New levels default to 12 by 9');check(canvas.width===12*75&&canvas.height===9*75,'Editor cells are about 12 percent smaller again');
setTool('player');place({column:1,row:1});setTool('ai');place({column:4,row:4});
$('grid-columns').value='20';$('grid-rows').value='11';$('resize-grid').onclick();check(draft.grid.columns===20&&draft.grid.rows===11&&draft.enemies.length===1,'Maximum resize preserves placements');
$('grid-columns').value='5';$('grid-rows').value='5';$('resize-grid').onclick();check(draft.grid.columns===5&&draft.grid.rows===5&&draft.enemies.length===1,'Minimum resize preserves in-bounds placements');
$('grid-columns').value='21';$('grid-rows').value='11';$('resize-grid').onclick();check(draft.grid.columns===5,'Width above maximum rejected');
$('grid-columns').value='5';$('grid-rows').value='4';$('resize-grid').onclick();check(draft.grid.rows===5,'Height below minimum rejected');
$('grid-columns').value='5';$('grid-rows').value='12';$('resize-grid').onclick();check(draft.grid.rows===5,'Height above maximum rejected');
$('grid-columns').value='5.5';$('grid-rows').value='5';$('resize-grid').onclick();check(draft.grid.columns===5,'Fractional dimensions rejected');
$('new-level').onclick();setTool('player');place({column:10,row:8});$('grid-columns').value='5';$('grid-rows').value='5';$('resize-grid').onclick();check(draft.grid.columns===12&&draft.player&&!$('crop-option').hidden,'Cropping requires explicit choice');
$('crop-grid').checked=true;$('resize-grid').onclick();check(draft.grid.columns===5&&!draft.player,'Confirmed crop removes outside spawn');$('undo-edit').onclick();check(draft.grid.columns===12&&draft.player.column===10,'Undo restores size and cropped spawn');
const rectangular=Levels.clone(Levels.defaultLevel);rectangular.grid.columns=5;rectangular.grid.rows=11;rectangular.player={column:0,row:0,facing:'north'};rectangular.enemies=[{column:4,row:10,type:'sentry',facing:'south'}];rectangular.walls=[];check(Levels.compile(rectangular).height===1100,'Tall narrow rectangular levels compile');
$('new-level').onclick();setTool('ai');$('ai-type').value='brown';place({column:3,row:3});check(draft.enemies[0].type==='brown'&&draft.enemies[0].facing==='north','Editor places north-facing Brown tanks');$('ai-type').value='sentry';place({column:3,row:3});check(draft.enemies.length===1&&draft.enemies[0].type==='sentry','Editor switches existing AI type without duplicate spawn');
setTool('erase');check(canvas.style.cursor.includes('eraser-cursor.svg'),'Erase tool uses eraser cursor');setTool('scenery');check(canvas.style.cursor==='cell','Other tools restore placement cursor');check(34*previewScale>cellSize/2,'Tank cannon extends beyond its grid square');
setTool('ai');$('ai-type').value='teal';place({column:3,row:3});check(draft.enemies.length===1&&draft.enemies[0].type==='teal','Editor can place or change existing tank to Teal');
$('ai-type').value='elite';place({column:3,row:3});check(draft.enemies.length===1&&draft.enemies[0].type==='elite','Level editor can place or update Black Elite tanks');

setTool('player');check($('ai-options').hidden&&$('scenery-options').hidden,'Player tool hides both type dropdowns');
setTool('ai');check(!$('ai-options').hidden&&$('scenery-options').hidden,'AI tool shows only AI dropdown');
setTool('scenery');check($('ai-options').hidden&&!$('scenery-options').hidden,'Scenery tool shows only scenery dropdown');
$('scenery-type').value='hole';const holeBefore=Levels.clone(draft);place({column:4,row:4});remember(holeBefore);
check(draft.walls.find(w=>w.column===4&&w.row===4)?.type==='hole','Scenery places hole');
$('undo-edit').onclick();check(!draft.walls.some(w=>w.column===4&&w.row===4),'Undo removes hole');$('redo-edit').onclick();
check(draft.walls.some(w=>w.type==='hole'),'Redo restores hole');
setTool('player');check(!place({column:4,row:4}),'Cannot place tank on hole');
setTool('scenery');$('scenery-type').value='solid';place({column:4,row:4});check(draft.walls.filter(w=>w.column===4&&w.row===4).length===1&&draft.walls.at(-1).type==='solid','Scenery changes hole to wall without duplicates');
$('scenery-type').value='hole';place({column:4,row:4});$('save-level').onclick();check(readLibrary().some(v=>v.level.walls.some(w=>w.type==='hole')),'Saving preserves holes');
setTool('erase');check($('ai-options').hidden&&$('scenery-options').hidden,'Erase hides dropdowns');place({column:4,row:4});check(!draft.walls.some(w=>w.type==='hole'),'Erase removes hole');
setTool('ai');$('ai-type').value='red';place({column:3,row:3});check(draft.enemies[0].type==='red','Editor places Red Charge tanks');check(Levels.validate(draft,false).enemies[0].type==='red','Editor exports Red Charge type');
setTool('ai');$('ai-type').value='pink';place({column:3,row:3});check(draft.enemies[0].type==='pink'&&Levels.validate(draft,false).enemies[0].type==='pink','Editor places and exports Pink Flamethrower tanks');

refreshLibrary();check($('saved-levels').options.filter(o=>o.value.startsWith('encounter:')).length===12,'Editor load menu includes all Roguelike encounters and bosses');
for(const encounterId of ['1a2','1b3','1boss2']){const entry=window.TankEncounters.get(encounterId);$('saved-levels').value='encounter:'+encounterId;$('load-saved').onclick();check(JSON.stringify(draft)===JSON.stringify(Levels.validate(entry.level)),'Editor loads Roguelike encounter '+encounterId);draft.name='Edited copy';check(entry.level.name!=='Edited copy','Editing draft does not mutate bundled encounter '+encounterId);}
console.log(passed+' editor workflow checks passed');
})();
`;
await vm.runInNewContext(fs.readFileSync(new URL('editor.js', root), 'utf8').replace(/\}\)\(\);\s*$/, tests + '\n})();'), context);
