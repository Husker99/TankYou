(() => {
  'use strict';
  const Levels = window.TankLevels, Game = window.TankGame;
  const $ = id => document.getElementById(id);
  const canvas = $('editor-canvas'), ctx = canvas.getContext('2d');
  const cellSize = 75; // About 12% smaller than the previous 85-unit editor cells.
  const previewScale = 1.5 * 85 / 100; // Preserve tank preview size as cells shrink.
  let pendingCrop = ''; 
  const draftKey = 'tank-you-editor-draft-v1', libraryKey = 'tank-you-levels-v1';
  let draft = Game.getLevel(), tool = 'player', selected = { column: 0, row: 0 };
  let undo = [], redo = [], painting = false, strokeChanged = false, strokeBefore = null, lastCell = null;
  let savedId = '', isOpen = false, storageWarning = false;
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) draft = Levels.validate(JSON.parse(saved), false);
  } catch { storageWarning = true; }
  function message(text, error = false) {
    $('editor-message').textContent = text;
    $('editor-message').classList.toggle('error', error);
  }
  function persist() {
    try {
      const value = Levels.clone(draft);
      value.name = value.name.trim() || 'Untitled level';
      localStorage.setItem(draftKey, JSON.stringify(value)); storageWarning = false;
    } catch { storageWarning = true; }
  }
  function readLibrary() {
    try {
      const data = JSON.parse(localStorage.getItem(libraryKey) || '[]');
      return Array.isArray(data) ? data.filter(v => typeof v.id === 'string' && v.level).slice(0, 100) : [];
    } catch { return []; }
  }
  function refreshLibrary() {
    const select = $('saved-levels');
    select.replaceChildren(new Option('Choose a level', ''));
    for (const [id, level] of Object.entries(Levels.builtInLevels)) select.add(new Option(`${level.name} (built-in)`, `builtin:${id}`));
    for (const entry of window.TankEncounters?.list() || []) select.add(new Option(`${entry.level.name} (Roguelike)`, `encounter:${entry.id}`));
    for (const item of readLibrary()) select.add(new Option(String(item.level.name || 'Untitled level'), item.id));
    select.value = savedId;
  }
  function sync() {
    $('level-name').value = draft.name;
    $('grid-label').textContent = `${draft.grid.columns} × ${draft.grid.rows} · Square cells`;
    $('undo-edit').disabled = !undo.length;
    $('redo-edit').disabled = !redo.length;
    canvas.width = draft.grid.columns * cellSize; canvas.height = draft.grid.rows * cellSize;
    canvas.style.aspectRatio = `${draft.grid.columns} / ${draft.grid.rows}`;
    canvas.style.width = `min(88%, ${draft.grid.columns * 8.5 * .88}%)`;
    $('grid-columns').value = draft.grid.columns; $('grid-rows').value = draft.grid.rows;
    $('crop-option').hidden = true; $('crop-grid').checked = false; pendingCrop = '';
    selected.column = Math.min(selected.column, draft.grid.columns - 1);
    selected.row = Math.min(selected.row, draft.grid.rows - 1);
    draw();
  }
  function remember(before) {
    undo.push(before); if (undo.length > 60) undo.shift(); redo = []; persist(); sync();
  }
  function replace(next) {
    const before = Levels.clone(draft);
    draft = Levels.clone(next); savedId = ''; remember(before);
  }
  function setTool(value) {
    tool = value;
    $('ai-options').hidden = tool !== 'ai';
    $('scenery-options').hidden = tool !== 'scenery';
    canvas.style.cursor = tool === 'erase' ? 'url("assets/eraser-cursor.svg") 8 25, cell' : 'cell';
    for (const button of document.querySelectorAll('[data-tool]')) button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
    draw();
  }
  for (const button of document.querySelectorAll('[data-tool]')) button.onclick = () => setTool(button.dataset.tool);
  let nameBefore = null;
  $('level-name').addEventListener('focus', () => { nameBefore = Levels.clone(draft); });
  $('level-name').addEventListener('input', () => { draft.name = $('level-name').value; persist(); });
  $('level-name').addEventListener('change', () => {
    draft.name = $('level-name').value;
    if (nameBefore && JSON.stringify(nameBefore) !== JSON.stringify(draft)) remember(nameBefore);
    nameBefore = null;
  });
  function same(a, b) { return a && b && a.column === b.column && a.row === b.row; }
  function place(cell, erase = false) {
    selected = cell;
    const before = JSON.stringify(draft);
    const ai = draft.enemies.find(e => same(e, cell));
    const wall = draft.walls.find(w => same(w, cell));
    const player = same(draft.player, cell);
    if (erase || tool === 'erase') {
      if (player) draft.player = null;
      draft.enemies = draft.enemies.filter(e => !same(e, cell));
      draft.walls = draft.walls.filter(w => !same(w, cell));
    } else if (tool === 'scenery') {
      if (player || ai) { message('Erase or move the tank before placing scenery here.', true); return false; }
      const type = $('scenery-type').value || 'solid';
      if (wall) wall.type = type; else draft.walls.push({ ...cell, type });
    } else if (tool === 'player') {
      if (wall || ai) { message('Choose an empty cell for the player start.', true); return false; }
      draft.player = { ...cell, facing: 'north' };
    } else if (tool === 'ai') {
      if (wall || player) { message('Choose an empty cell for the AI tank.', true); return false; }
      if (!ai && draft.enemies.length >= 20) { message('This room supports up to 20 AI tanks.', true); return false; }
      const value = { ...cell, type: $('ai-type').value, facing: 'north' };
      if (ai) Object.assign(ai, value); else draft.enemies.push(value);
    }
    const changed = before !== JSON.stringify(draft);
    if (changed) message(`${draft.player ? '1 player' : 'No player start'} · ${draft.enemies.length} AI · ${draft.walls.length} scenery cells`);
    draw(); return changed;
  }
  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const column = Math.floor((e.clientX - r.left) / r.width * draft.grid.columns);
    const row = Math.floor((e.clientY - r.top) / r.height * draft.grid.rows);
    if (column < 0 || row < 0 || column >= draft.grid.columns || row >= draft.grid.rows) return null;
    return { column, row };
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const cell = cellFromEvent(e); if (!cell) return;
    e.preventDefault(); canvas.focus();
    painting = tool === 'scenery' || tool === 'erase' || e.button === 2;
    strokeBefore = Levels.clone(draft); strokeChanged = false; lastCell = cell;
    canvas.setPointerCapture(e.pointerId);
    strokeChanged = place(cell, e.button === 2);
    if (!painting && strokeChanged) { remember(strokeBefore); strokeChanged = false; }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointermove', e => {
    const cell = cellFromEvent(e); if (!cell) return;
    selected = cell;
    if (painting && lastCell && !same(lastCell, cell)) {
      // Paint only square cells along horizontal/vertical steps, with no gaps.
      const p = { ...lastCell };
      while (p.column !== cell.column) { p.column += Math.sign(cell.column - p.column); strokeChanged = place({ ...p }, e.buttons === 2) || strokeChanged; }
      while (p.row !== cell.row) { p.row += Math.sign(cell.row - p.row); strokeChanged = place({ ...p }, e.buttons === 2) || strokeChanged; }
      lastCell = cell;
    }
    draw();
  });
  function endStroke() {
    if (strokeChanged && strokeBefore) remember(strokeBefore);
    painting = false; strokeChanged = false; strokeBefore = null; lastCell = null;
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);
  canvas.addEventListener('keydown', e => {
    if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', ' ', 'Delete', 'Backspace'].includes(e.key)) return;
    e.preventDefault();
    if (e.key.startsWith('Arrow')) {
      const d = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] }[e.key];
      selected = { column: Math.max(0, Math.min(draft.grid.columns - 1, selected.column + d[0])), row: Math.max(0, Math.min(draft.grid.rows - 1, selected.row + d[1])) };
    } else {
      const before = Levels.clone(draft);
      if (place(selected, e.key !== ' ')) remember(before);
    }
    draw();
  });
  $('undo-edit').onclick = () => {
    if (!undo.length) return;
    redo.push(Levels.clone(draft)); draft = undo.pop(); persist(); sync(); message('Undid last edit.');
  };
  $('redo-edit').onclick = () => {
    if (!redo.length) return;
    undo.push(Levels.clone(draft)); draft = redo.pop(); persist(); sync(); message('Redid last edit.');
  };
  $('resize-grid').onclick = () => {
    endStroke();
    const columns = Number($('grid-columns').value), rows = Number($('grid-rows').value);
    if (!Number.isInteger(columns) || columns < 5 || columns > 20 || !Number.isInteger(rows) || rows < 5 || rows > 11) {
      message('Choose 5–20 columns and 5–11 rows, using whole numbers.', true); return;
    }
    const inside = item => item.column < columns && item.row < rows;
    const removed = (draft.player && !inside(draft.player) ? 1 : 0) + draft.enemies.filter(e => !inside(e)).length + draft.walls.filter(w => !inside(w)).length;
    const key = `${columns},${rows},${removed}`;
    if (removed && (pendingCrop !== key || !$('crop-grid').checked)) {
      pendingCrop = key; $('crop-option').hidden = false; $('crop-grid').checked = false;
      message(`${removed} object${removed === 1 ? '' : 's'} would be outside this grid. Check “Remove objects” and apply again, or choose a larger size. Undo can restore cropped objects.`, true); return;
    }
    const before = Levels.clone(draft);
    draft.name = $('level-name').value;
    draft.grid.columns = columns; draft.grid.rows = rows;
    if (draft.player && !inside(draft.player)) draft.player = null;
    draft.enemies = draft.enemies.filter(inside); draft.walls = draft.walls.filter(inside);
    remember(before); message(`Resized to ${columns} × ${rows}.${removed ? ` Removed ${removed} objects; Undo restores them.` : ' Placements preserved.'}`);
  };
  $('new-level').onclick = () => { endStroke(); replace({ version: 1, name: 'Untitled level', grid: { columns: 12, rows: 9, cellSize: 100 }, player: null, enemies: [], walls: [] }); message('Blank level. Place one player start, then AI tanks and cover.'); };
  $('save-level').onclick = () => {
    try {
      draft.name = $('level-name').value;
      const level = Levels.validate(draft, false), library = readLibrary();
      if (!savedId) savedId = `level-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = { id: savedId, level }, i = library.findIndex(v => v.id === savedId);
      if (i >= 0) library[i] = record; else library.push(record);
      if (library.length > 100) throw new Error('Local library is full. Export this level as a backup.');
      localStorage.setItem(libraryKey, JSON.stringify(library)); persist(); refreshLibrary();
      message(`Saved “${level.name}” in this browser.`);
    } catch (e) { message(e.message || 'Could not save locally. Export a file instead.', true); }
  };
  $('load-saved').onclick = () => {
    const key = $('saved-levels').value;
    if(key.startsWith('encounter:')){const entry=window.TankEncounters?.get(key.slice(10));if(!entry)return;replace(Levels.validate(entry.level));message(`Loaded “${entry.level.name}”. Edit and export a copy when ready.`);return;}
    if (key.startsWith('builtin:')) {
      const level = Levels.builtInLevels[key.slice(8)];
      if (!level) return;
      replace(Levels.validate(level)); message(`Loaded “${level.name}”. Click Test level to play it.`); return;
    }
    const record = readLibrary().find(v => v.id === $('saved-levels').value);
    if (!record) { message('Choose a saved level first.', true); return; }
    try { const level = Levels.validate(record.level, false); replace(level); savedId = record.id; message(`Loaded “${level.name}”.`); }
    catch (e) { message(e.message, true); }
  };
  $('export-level').onclick = () => {
    try {
      draft.name = $('level-name').value;
      const level = Levels.validate(draft);
      const blob = new Blob([JSON.stringify(level, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = (level.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank-you-level') + '.json';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      message('Exported level file. Keep it as a backup or share it to add it to the game.');
    } catch (e) { message(e.message, true); }
  };
  $('import-level').onclick = () => $('level-file').click();
  $('level-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 100000) throw new Error('This level file is too large (maximum 100 KB).');
      const level = Levels.validate(JSON.parse(await file.text()), false);
      endStroke(); replace(level); message(`Imported “${level.name}”. Test it when you are ready.`);
    } catch (error) { message(error instanceof SyntaxError ? 'That file is not valid JSON. Your draft is unchanged.' : error.message, true); }
    e.target.value = '';
  });
  function showGame() {
    isOpen = false; $('editor-view').hidden = true; $('game-view').hidden = false;
    $('reset').hidden = false; $('open-editor').hidden = false;
  }
  $('open-editor').onclick = () => {
    isOpen = true; Game.setEditing(true);
    $('editor-view').hidden = false; $('game-view').hidden = true; $('reset').hidden = true; $('open-editor').hidden = true;
    refreshLibrary(); sync();
    message(storageWarning ? 'Local storage is unavailable or the previous draft could not be restored. Export your level to keep a backup.' : 'Draft autosaves locally. Choose a tool and a cell.', storageWarning);
  };
  $('back-game').onclick = () => { endStroke(); Game.loadLevel(Game.getLevel()); showGame(); };
  $('test-level').onclick = () => {
    try { endStroke(); draft.name = $('level-name').value;
      const level = Levels.validate(draft); persist(); Game.loadLevel(level); showGame(); }
    catch (e) { message(e.message, true); }
  };
  function previewTank(spawn, ai) {
    const palette = ai ? Levels.aiTypes[spawn.type].palette : {
      tracks: '#244c7b', body: '#286ec9', front: '#4d93ec', barrel: '#225ba4', turret: '#3c83de'
    };
    const x = (spawn.column + .5) * cellSize, y = (spawn.row + .5) * cellSize;
    const a = Levels.directions[spawn.facing];
    ctx.save();ctx.translate(x,y);ctx.scale(previewScale,previewScale);
    Levels.paintTank(ctx,palette,{hull:a,turret:a,tread:0,type:ai?spawn.type:'player'});
    ctx.restore();
  }

  function previewHole(w) {
    const x=(w.column+.5)*cellSize, y=(w.row+.5)*cellSize, radius=cellSize*.47;
    ctx.fillStyle='#a19c8d'; ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
    const shade=ctx.createRadialGradient(x,y+cellSize*.12,cellSize*.08,x,y,radius*.94);
    shade.addColorStop(0,'#b9b8ad'); shade.addColorStop(.75,'#c7c6ba'); shade.addColorStop(1,'#a3a396');
    ctx.fillStyle=shade; ctx.beginPath(); ctx.arc(x,y,radius*.92,0,Math.PI*2); ctx.fill();
  }
  function draw() {
    if (!isOpen) return;
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    for (const w of draft.walls) { if (w.type === 'hole') { previewHole(w); continue; } ctx.fillStyle = '#c8c7bc'; ctx.fillRect(w.column * cellSize, w.row * cellSize, cellSize, cellSize); ctx.fillStyle = '#e4e2d8'; ctx.fillRect(w.column * cellSize, w.row * cellSize, cellSize, 5); }
    ctx.strokeStyle = '#d5d9cf'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = 0; x <= width; x += cellSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); } for (let y = 0; y <= height; y += cellSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); } ctx.stroke();
    if (draft.player) previewTank(draft.player, false);
    for (const ai of draft.enemies) previewTank(ai, true);
    ctx.fillStyle = 'rgba(95,117,74,.12)'; ctx.fillRect(selected.column * cellSize, selected.row * cellSize, cellSize, cellSize);
    ctx.strokeStyle = '#60764b'; ctx.lineWidth = 3; ctx.strokeRect(selected.column * cellSize + 2, selected.row * cellSize + 2, cellSize - 4, cellSize - 4);
    $('cell-label').textContent = `Cell ${selected.column + 1}, ${selected.row + 1}`;
    canvas.setAttribute('aria-label', `Level editor ${draft.grid.columns} by ${draft.grid.rows} grid with square cells. Selected cell ${selected.column + 1}, ${selected.row + 1}. Arrow keys select; Space places; Delete erases.`);
  }
  setTool(tool);
  refreshLibrary();
  if (new URLSearchParams(window.location.search).get('editor') === '1') $('open-editor').onclick();
})();
