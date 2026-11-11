(() => {
  'use strict';
  const directions = { north: -Math.PI / 2, east: 0, south: Math.PI / 2, west: Math.PI };
  const aiTracks = { tracks: '#49382c', tread: '#91755d' };
  const aiTypes = {
    sentry: { label: 'Tan (Stationary)', turnRate: .85, shellSpeed: 240, reload: 2, chargeTime: .7, shellLimit: 2,
      palette: { ...aiTracks, body: '#c49b62', front: '#e0bb82', barrel: '#947342', turret: '#b38a53', hatch: '#ebcda1' } },
    brown: { label: 'Brown (Mobile)', turnRate: .85, shellSpeed: 240, reload: 2, chargeTime: .7, shellLimit: 2, mobile: true, moveSpeed: 78,
      palette: { ...aiTracks, body: '#795037', front: '#a77a54', barrel: '#573b2b', turret: '#8c6040', hatch: '#bf956d' } },
    teal: { label: 'Teal (Rocket)', turnRate: .85, shellSpeed: 634.8, reload: 2, chargeTime: .7, shellLimit: 2, mobile: true, moveSpeed: 78, rocket: true, maxBounces: 0,
      palette: { ...aiTracks, body: '#278b86', front: '#59b7ae', barrel: '#1b615d', turret: '#319d95', hatch: '#85d3c9' } },
    elite: { label: 'Black (Elite)', turnRate: 1.05, shellSpeed: 240, reload: 2, chargeTime: .05, shellLimit: 3, mobile: true, moveSpeed: 78, elite: true,
      dodgeChance: .75, reactionTime: .03, scanInterval: .05, dodgeCooldown: .7, awareness: 320,
      palette: { ...aiTracks, body: '#252d29', front: '#535f57', barrel: '#171d19', turret: '#354139', hatch: '#8c9d90' } }
  };
  aiTypes.red = { ...aiTypes.elite, label: 'Red (Charge)', shield: true,
    palette: { ...aiTracks, body: '#e7352b', front: '#ff7660', barrel: '#a51e20', turret: '#f24738', hatch: '#ffb08a' } };
  aiTypes.pink = { ...aiTypes.elite, label: 'Pink (Flamethrower)', flamethrower: true, reload: 1.8,
    palette: { ...aiTracks, body: '#e15a9b', front: '#ff94c9', barrel: '#a82e6e', turret: '#ee73b2', hatch: '#ffd0e6' } };
  const level1 = {"version":1,"name":"Level 1","grid":{"columns":12,"rows":8,"cellSize":100},"player":{"column":1,"row":4,"facing":"north"},"enemies":[{"column":9,"row":4,"facing":"north","type":"sentry"}],"walls":[{"column":6,"row":2,"type":"solid"},{"column":6,"row":3,"type":"solid"},{"column":6,"row":4,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":6,"row":6,"type":"solid"},{"column":3,"row":1,"type":"solid"},{"column":3,"row":2,"type":"solid"}]};
  const level2 = {"version":1,"name":"Level 2","grid":{"columns":12,"rows":8,"cellSize":100},"player":{"column":1,"row":2,"facing":"north"},"enemies":[{"column":4,"row":2,"facing":"north","type":"sentry"},{"column":10,"row":4,"facing":"north","type":"sentry"},{"column":8,"row":3,"facing":"north","type":"sentry"},{"column":3,"row":6,"facing":"north","type":"sentry"}],"walls":[{"column":3,"row":1,"type":"solid"},{"column":3,"row":2,"type":"solid"},{"column":3,"row":3,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":6,"row":4,"type":"solid"},{"column":6,"row":3,"type":"solid"},{"column":6,"row":2,"type":"solid"}]};
  const level5 = {"version":1,"name":"Level 5","grid":{"columns":12,"rows":8,"cellSize":100},"player":{"column":4,"row":3,"facing":"north"},"enemies":[{"column":10,"row":4,"facing":"north","type":"sentry"},{"column":10,"row":2,"facing":"north","type":"sentry"},{"column":9,"row":6,"facing":"north","type":"sentry"},{"column":7,"row":6,"facing":"north","type":"sentry"},{"column":5,"row":6,"facing":"north","type":"sentry"},{"column":3,"row":6,"facing":"north","type":"sentry"},{"column":1,"row":6,"facing":"north","type":"sentry"},{"column":8,"row":1,"facing":"north","type":"sentry"}],"walls":[]};
  const level3 = {"version":1,"name":"Level 3","grid":{"columns":12,"rows":8,"cellSize":100},"player":{"column":2,"row":4,"facing":"north"},"enemies":[{"column":6,"row":4,"facing":"north","type":"brown"},{"column":9,"row":3,"facing":"north","type":"sentry"}],"walls":[{"column":4,"row":2,"type":"solid"},{"column":4,"row":3,"type":"solid"},{"column":4,"row":4,"type":"solid"},{"column":4,"row":5,"type":"solid"}]};
  const level4 = {"version":1,"name":"Level 4","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":6,"row":7,"facing":"north"},"enemies":[{"column":2,"row":2,"facing":"north","type":"brown"},{"column":2,"row":4,"facing":"north","type":"brown"},{"column":10,"row":2,"facing":"north","type":"brown"},{"column":10,"row":4,"facing":"north","type":"brown"}],"walls":[{"column":4,"row":5,"type":"solid"},{"column":5,"row":5,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":7,"row":5,"type":"solid"},{"column":8,"row":5,"type":"solid"}]};
  const level6 = {"version":1,"name":"Level 6","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":2,"row":4,"facing":"north"},"enemies":[{"column":9,"row":2,"facing":"north","type":"teal"},{"column":9,"row":5,"facing":"north","type":"teal"}],"walls":[{"column":5,"row":6,"type":"solid"},{"column":6,"row":6,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":5,"row":1,"type":"solid"},{"column":4,"row":1,"type":"solid"},{"column":4,"row":2,"type":"solid"}]};
  const level7 = {"version":1,"name":"Level 7","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":1,"row":2,"facing":"north"},"enemies":[{"column":9,"row":6,"facing":"north","type":"elite"},{"column":10,"row":2,"facing":"north","type":"elite"},{"column":4,"row":5,"facing":"north","type":"brown"}],"walls":[{"column":7,"row":7,"type":"solid"},{"column":7,"row":6,"type":"solid"},{"column":7,"row":5,"type":"solid"},{"column":7,"row":4,"type":"solid"},{"column":8,"row":4,"type":"solid"},{"column":9,"row":4,"type":"solid"}]};
  const level8 = {"version":1,"name":"Level 8","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":0,"row":7,"facing":"north"},"enemies":[{"column":10,"row":7,"facing":"north","type":"brown"},{"column":12,"row":3,"facing":"north","type":"teal"},{"column":7,"row":4,"facing":"north","type":"teal"},{"column":3,"row":3,"facing":"north","type":"teal"},{"column":4,"row":7,"facing":"north","type":"sentry"},{"column":6,"row":6,"facing":"north","type":"brown"},{"column":0,"row":2,"facing":"north","type":"elite"},{"column":4,"row":0,"facing":"north","type":"elite"},{"column":6,"row":1,"facing":"north","type":"elite"},{"column":8,"row":0,"facing":"north","type":"elite"},{"column":10,"row":1,"facing":"north","type":"elite"}],"walls":[{"column":0,"row":5,"type":"solid"},{"column":1,"row":5,"type":"solid"},{"column":2,"row":5,"type":"solid"},{"column":3,"row":5,"type":"solid"},{"column":4,"row":5,"type":"solid"},{"column":5,"row":5,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":7,"row":5,"type":"solid"},{"column":8,"row":5,"type":"solid"},{"column":9,"row":5,"type":"solid"},{"column":12,"row":2,"type":"solid"},{"column":11,"row":2,"type":"solid"},{"column":10,"row":2,"type":"solid"},{"column":9,"row":2,"type":"solid"},{"column":8,"row":2,"type":"solid"},{"column":7,"row":2,"type":"solid"},{"column":6,"row":2,"type":"solid"},{"column":5,"row":2,"type":"solid"},{"column":4,"row":2,"type":"solid"},{"column":3,"row":2,"type":"solid"}]};
  const level9 = {"version":1,"name":"Level 9","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":2,"row":4,"facing":"north"},"enemies":[{"column":0,"row":6,"facing":"north","type":"sentry"},{"column":0,"row":1,"facing":"north","type":"sentry"},{"column":5,"row":6,"facing":"north","type":"sentry"},{"column":5,"row":1,"facing":"north","type":"sentry"},{"column":11,"row":4,"facing":"north","type":"elite"},{"column":11,"row":3,"facing":"north","type":"elite"},{"column":12,"row":3,"facing":"north","type":"elite"},{"column":12,"row":4,"facing":"north","type":"elite"},{"column":11,"row":5,"facing":"north","type":"teal"},{"column":11,"row":2,"facing":"north","type":"teal"},{"column":10,"row":7,"facing":"north","type":"brown"},{"column":10,"row":0,"facing":"north","type":"brown"}],"walls":[{"column":2,"row":5,"type":"hole"},{"column":3,"row":5,"type":"hole"},{"column":4,"row":5,"type":"hole"},{"column":5,"row":5,"type":"hole"},{"column":6,"row":5,"type":"hole"},{"column":7,"row":5,"type":"hole"},{"column":8,"row":5,"type":"hole"},{"column":9,"row":5,"type":"hole"},{"column":9,"row":2,"type":"hole"},{"column":8,"row":2,"type":"hole"},{"column":7,"row":2,"type":"hole"},{"column":10,"row":5,"type":"solid"},{"column":10,"row":4,"type":"solid"},{"column":10,"row":3,"type":"solid"},{"column":10,"row":2,"type":"solid"},{"column":6,"row":2,"type":"hole"},{"column":5,"row":2,"type":"hole"},{"column":4,"row":2,"type":"hole"},{"column":3,"row":2,"type":"hole"},{"column":2,"row":2,"type":"hole"},{"column":1,"row":5,"type":"hole"},{"column":1,"row":2,"type":"hole"}]};
  const level10 = {"version":1,"name":"Level 10","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":5,"row":4,"facing":"north"},"enemies":[{"column":7,"row":7,"facing":"north","type":"red"},{"column":5,"row":0,"facing":"north","type":"red"},{"column":1,"row":4,"facing":"north","type":"red"}],"walls":[{"column":3,"row":5,"type":"hole"},{"column":4,"row":5,"type":"hole"},{"column":5,"row":5,"type":"hole"},{"column":6,"row":5,"type":"hole"},{"column":7,"row":5,"type":"hole"},{"column":8,"row":5,"type":"hole"},{"column":9,"row":5,"type":"hole"},{"column":9,"row":2,"type":"hole"},{"column":8,"row":2,"type":"hole"},{"column":7,"row":2,"type":"hole"},{"column":6,"row":2,"type":"hole"},{"column":5,"row":2,"type":"hole"},{"column":4,"row":2,"type":"hole"},{"column":3,"row":2,"type":"hole"},{"column":3,"row":4,"type":"solid"},{"column":3,"row":3,"type":"solid"}]};
  const level11 = {"version":1,"name":"Level 11","grid":{"columns":13,"rows":8,"cellSize":100},"player":{"column":2,"row":5,"facing":"north"},"enemies":[{"column":8,"row":7,"facing":"north","type":"red"},{"column":2,"row":1,"facing":"north","type":"red"},{"column":9,"row":2,"facing":"north","type":"red"},{"column":6,"row":1,"facing":"north","type":"elite"},{"column":11,"row":4,"facing":"north","type":"elite"}],"walls":[{"column":2,"row":3,"type":"solid"},{"column":3,"row":3,"type":"solid"},{"column":4,"row":3,"type":"solid"},{"column":4,"row":4,"type":"solid"},{"column":5,"row":4,"type":"solid"},{"column":6,"row":4,"type":"solid"},{"column":6,"row":5,"type":"solid"},{"column":7,"row":5,"type":"solid"},{"column":8,"row":5,"type":"solid"},{"column":1,"row":3,"type":"hole"},{"column":0,"row":3,"type":"hole"}]};
  const builtInLevels = { "level-1": level1, "level-2": level2, "level-3": level3, "level-4": level4, "level-5": level5, "level-6": level6, "level-7": level7, "level-8": level8, "level-9": level9, "level-10": level10, "level-11": level11 };
  const defaultLevel = level1;
  const clone = level => JSON.parse(JSON.stringify(level));
  function validate(input, playable = true) {
    if (!input || typeof input !== 'object' || input.version !== 1) throw new Error('This is not a supported Tank You level (version 1).');
    const g = input.grid;
    if (!g || !Number.isInteger(g.columns) || g.columns < 5 || g.columns > 20 || !Number.isInteger(g.rows) || g.rows < 5 || g.rows > 11 || g.cellSize !== 100) throw new Error('Use 5–20 columns and 5–11 rows. Each cell is square (100 world units).');
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 60) throw new Error('Give the level a name of 1–60 characters.');
    if (!Array.isArray(input.enemies) || input.enemies.length > 20 || !Array.isArray(input.walls) || input.walls.length > g.columns * g.rows) throw new Error('A level can contain up to 20 AI tanks and one wall per cell.');
    const occupied = new Set();
    function cell(item) {
      if (!item || !Number.isInteger(item.column) || !Number.isInteger(item.row) || item.column < 0 || item.row < 0 || item.column >= g.columns || item.row >= g.rows) throw new Error('Every object must occupy a cell inside the grid.');
      const key = `${item.column},${item.row}`;
      if (occupied.has(key)) throw new Error('Objects cannot share the same cell.');
      occupied.add(key);
      return { column: item.column, row: item.row };
    }
    function spawn(item, ai) {
      const value = cell(item);
      // Normalize old saved/imported directions to the fixed north-facing start.
      value.facing = 'north';
      if (ai) {
        if (!Object.hasOwn(aiTypes, item.type)) throw new Error('Choose Tan (Stationary), Brown (Mobile), Teal (Rocket), Black (Elite), Red (Charge), or Pink (Flamethrower) for AI tanks.');
        value.type = item.type;
      }
      return value;
    }
    const player = input.player == null ? null : spawn(input.player, false);
    const enemies = input.enemies.map(e => spawn(e, true));
    const walls = input.walls.map(w => {
      const value = cell(w);
      if (!['solid', 'hole'].includes(w.type)) throw new Error('Choose Wall or Hole for scenery.');
      return { ...value, type: w.type };
    });
    if (playable && !player) throw new Error('Place one player starting location before testing.');
    if (playable && !enemies.length) throw new Error('Place at least one AI tank before testing.');
    return { version: 1, name: input.name.trim(), grid: { columns: g.columns, rows: g.rows, cellSize: 100 }, player, enemies, walls };
  }
  function compile(input) {
    const level = validate(input);
    const point = s => ({ x: (s.column + .5) * level.grid.cellSize, y: (s.row + .5) * level.grid.cellSize,
      hull: directions[s.facing], turret: directions[s.facing], alive: true, ...(s.type ? { type: s.type } : {}) });
    return { width: level.grid.columns * 100, height: level.grid.rows * 100, player: point(level.player), enemies: level.enemies.map(point),
      walls: level.walls.map(w => ({ x: w.column * 100, y: w.row * 100, width: 100, height: 100, type: w.type })) };
  }
  function drawFlameEmblem(ctx,x,y,size,heat=0){
    ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);
    ctx.fillStyle=heat>0?'#ffb841':'#6b2046';ctx.shadowColor='#ff9933';ctx.shadowBlur=heat*12;
    ctx.beginPath();ctx.moveTo(1,-10);ctx.quadraticCurveTo(9,-3,8,3);ctx.quadraticCurveTo(7,11,0,10);ctx.quadraticCurveTo(-10,9,-7,0);ctx.lineTo(-3,-5);ctx.quadraticCurveTo(-5,2,-1,2);ctx.quadraticCurveTo(3,1,1,-10);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle=heat>0?'#fff1a2':'#ff9b48';ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(7,8,0,8);ctx.quadraticCurveTo(-5,7,1,0);ctx.fill();ctx.restore();
  }
  function paintTank(ctx,palette,pose){
    const mix=(hex,amount)=>{const n=parseInt(hex.slice(1),16),target=amount>0?255:0,t=Math.abs(amount);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v+(target-v)*t).toString(16).padStart(2,'0')).join('');};
    const plate=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.fillStyle=mix(color,.25);ctx.fillRect(x,y,w,1.5);ctx.fillRect(x,y,1,h);ctx.fillStyle=mix(color,-.28);ctx.fillRect(x,y+h-1.5,w,1.5);ctx.fillRect(x+w-1,y,1,h);};
    ctx.save();ctx.rotate(pose.hull);
    for(const y of [-20,12]){
      plate(-21,y,42,8,palette.tracks);
      ctx.save();ctx.beginPath();ctx.rect(-20,y+1,40,6);ctx.clip();
      for(let x=-27;x<24;x+=6){const offset=x+(pose.tread||0)%6;ctx.fillStyle=palette.tread||mix(palette.tracks,.3);ctx.fillRect(offset,y+1,2,6);ctx.fillStyle=mix(palette.tracks,-.3);ctx.fillRect(offset+2,y+1,1,6);}
      ctx.restore();
    }
    plate(-19,-14,38,28,palette.body);
    ctx.fillStyle=mix(palette.body,.2);ctx.beginPath();ctx.moveTo(8,-12);ctx.lineTo(17,-10);ctx.lineTo(17,10);ctx.lineTo(8,12);ctx.closePath();ctx.fill();
    ctx.fillStyle=mix(palette.body,-.32);for(let y=-7;y<=7;y+=3.5)ctx.fillRect(-16,y,5,1.3);
    ctx.fillStyle=mix(palette.body,.48);for(const x of [-15,14])for(const y of [-10,10]){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}
    if(pose.type==='elite'||pose.type==='red'||pose.type==='pink'){ctx.strokeStyle=mix(palette.body,.6);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(10,-7);ctx.lineTo(14,0);ctx.lineTo(10,7);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.rotate(pose.turret);
    const recoil=Math.max(0,Math.min(1,pose.recoil||0))*3;

    plate(0,-4,34-recoil,8,palette.barrel);
    ctx.fillStyle=mix(palette.barrel,.35);ctx.fillRect(15-recoil,-4,3,8);
    ctx.fillStyle=mix(palette.barrel,-.5);ctx.fillRect(32-recoil,-2.5,2,5);
    if(pose.type==='teal'){ctx.fillStyle='#82d3cb';ctx.fillRect(26-recoil,-4,2.5,8);}

    ctx.fillStyle=mix(palette.turret,-.25);ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=palette.turret;ctx.beginPath();ctx.arc(-.7,-1,10.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=mix(palette.turret,.35);ctx.lineWidth=1;ctx.beginPath();ctx.arc(-.5,-.7,10,-Math.PI*.9,-Math.PI*.1);ctx.stroke();
    if(pose.type==='pink')drawFlameEmblem(ctx,0,0,15,pose.heat||0);
    else if(pose.type==='red'){
      ctx.strokeStyle=pose.heat?'#9ce3ff':mix(palette.turret,.65);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(5,-6);ctx.lineTo(5,1);ctx.quadraticCurveTo(4,5,0,7);ctx.quadraticCurveTo(-4,5,-5,1);ctx.closePath();ctx.stroke();
    }else{
      ctx.fillStyle=pose.warning?'#f0c37b':palette.hatch||mix(palette.turret,.4);ctx.beginPath();ctx.arc(-3,-3,4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=mix(palette.turret,-.35);ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=mix(palette.turret,-.25);ctx.fillRect(-5.5,-3.5,5,1);
    }
    ctx.restore();
  }
  function renderHearts(element, hearts, maxHearts = 3) {
    element.setAttribute('role','img');
    element.setAttribute('aria-label',`${hearts} of ${maxHearts} hearts`);
    element.innerHTML=Array.from({length:maxHearts},(_,i)=>`<svg class="heart-slot ${i<hearts?'filled':'empty'}" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28C9 22 2 17 2 10 2 2 12 1 16 8 20 1 30 2 30 10c0 7-7 12-14 18Z"/></svg>`).join('');
  }
  window.TankLevels = { paintTank, drawFlameEmblem, renderHearts, directions, aiTypes, defaultLevel, builtInLevels, clone, validate, compile };
})();
