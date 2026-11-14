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
  aiTypes.pink = { ...aiTypes.elite, label: 'Orange (Flamethrower)', flamethrower: true, reload: 1.8,
    palette: { ...aiTracks, body: '#e17b2b', front: '#ffb45f', barrel: '#96451d', turret: '#ef8b37', hatch: '#ffd394' } };
  aiTypes.gold = { ...aiTypes.elite, label:'Gold (Elite)', gold:true, chargeDuration:3.5, turnRate:8, reload:.22, chargeTime:0, shellLimit:5, dodgeChance:1, reactionTime:0, scanInterval:.04, dodgeCooldown:0, awareness:900,
    palette:{...aiTracks,body:'#d8ae37',front:'#ffe08a',barrel:'#9d751f',turret:'#ecc653',hatch:'#fff2b0'}};
  aiTypes.grey = { ...aiTypes.elite, label:'Grey (Armored)', armored:true, health:3, reload:1.8, chargeDuration:3.5,
    palette:{...aiTracks,body:'#7c8585',front:'#b9c0bd',barrel:'#505c5f',turret:'#929c9d',hatch:'#d3d8cc'}};
  aiTypes.duplicator = { ...aiTypes.elite, label:'Pink (Duplicator)', duplicator:true,
    palette:{...aiTracks,body:'#d96ca5',front:'#f4add1',barrel:'#964568',turret:'#e689b9',hatch:'#ffd3e9'}};
  aiTypes.violet={...aiTypes.elite,label:'Violet (Disruptor)',disruptor:true,moveSpeed:65,shellSpeed:160,reload:3.4,shellLimit:2,maxBounces:0,
    palette:{...aiTracks,body:'#7952a0',front:'#b594cf',barrel:'#4b3969',turret:'#946bb6',hatch:'#dac3ed'}};
  aiTypes.purple={...aiTypes.elite,label:'Purple (Mortar)',mortar:true,armored:true,health:3,moveSpeed:50,turnRate:1,reload:4.5,shellLimit:1,
    palette:{...aiTracks,body:'#76526f',front:'#af91a8',barrel:'#4f384e',turret:'#946d89',hatch:'#ddc0d1'}};
  aiTypes.navy={...aiTypes.elite,label:'Navy (Sniper)',sniper:true,dodgeChance:.9,reactionTime:.02,scanInterval:.04,dodgeCooldown:.5,awareness:450,moveSpeed:45,turnRate:1.6,shellSpeed:950,reload:3.6,chargeTime:.85,shellLimit:1,maxBounces:0,
    palette:{...aiTracks,body:'#283e69',front:'#5b7299',barrel:'#1c2e4c',turret:'#3c5783',hatch:'#a9bdd8'}};
  aiTypes.wallSentry={...aiTypes.sentry,label:'Standard Sentry',mounted:true};
  aiTypes.wallRocket={...aiTypes.teal,label:'Rocket Sentry',mounted:true,mobile:false};
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
    const zoom=input.zoom??100;
    if(!Number.isFinite(zoom)||zoom<60||zoom>100)throw new Error('Choose a level zoom between 60% and 100%.');
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
        if ((!Object.hasOwn(aiTypes, item.type)||aiTypes[item.type].mounted)) throw new Error('Choose Tan (Stationary), Brown (Mobile), Teal (Rocket), Black (Elite), Red (Charge), Orange (Flamethrower), Gold (Elite), Grey (Armored), Pink (Duplicator), Violet (Disruptor), Purple (Mortar), or Navy (Sniper) for AI tanks.');
        value.type = item.type;
      }
      return value;
    }
    const player = input.player == null ? null : spawn(input.player, false);
    const enemies = input.enemies.map(e => spawn(e, true));
    const sceneryCells=new Set();
    const walls = input.walls.map(w => {
      const key=w&&`${w.column},${w.row}`;
      if(sceneryCells.has(key))throw new Error('Only one scenery type can occupy a cell.');sceneryCells.add(key);
      // Ground terrain can share a square with a starting tank.
      const prior=w?.type==='mud'&&occupied.has(key);if(prior)occupied.delete(key);
      const value = cell(w);if(prior)occupied.add(key);
      if (!['solid', 'hole', 'sentry', 'rocketSentry', 'mud'].includes(w.type)) throw new Error('Choose Wall, Hole, Standard Sentry, Rocket Sentry, or Mud for scenery.');
      return { ...value, type: w.type };
    });
    if (playable && !player) throw new Error('Place one player starting location before testing.');
    if (playable && !enemies.length) throw new Error('Place at least one AI tank before testing.');
    return { version: 1, name: input.name.trim(), zoom, grid: { columns: g.columns, rows: g.rows, cellSize: 100 }, player, enemies, walls };
  }
  function compile(input) {
    const level = validate(input);
    const point = s => ({ x: (s.column + .5) * level.grid.cellSize, y: (s.row + .5) * level.grid.cellSize,
      hull: directions[s.facing], turret: directions[s.facing], alive: true, ...(s.type ? { type: s.type } : {}) });
    return { zoom:level.zoom, width: level.grid.columns * 100, height: level.grid.rows * 100, player: point(level.player), enemies: [...level.enemies.map(point),...level.walls.filter(w=>['sentry','rocketSentry'].includes(w.type)).map(w=>({...point({...w,facing:'north'}),type:w.type==='sentry'?'wallSentry':'wallRocket',mounted:true}))],
      mud:level.walls.filter(w=>w.type==='mud').map(w=>({...w,x:w.column*100,y:w.row*100,width:100,height:100})),
      walls: level.walls.filter(w=>w.type!=='mud').map(w => ({ x: w.column * 100, y: w.row * 100, width: 100, height: 100, type: w.type })) };
  }
  function paintMud(ctx,cells,size=100,arena={}){
    const keys=new Set(cells.map(c=>`${c.column},${c.row}`));
    const walls=new Set((arena.walls||[]).filter(w=>w.type!=='hole'&&w.type!=='mud').map(w=>`${w.column??w.x/100},${w.row??w.y/100}`));
    const has=(c,r)=>keys.has(`${c},${r}`)||walls.has(`${c},${r}`)||(Number.isFinite(arena.columns)&&(c<0||c>=arena.columns))||(Number.isFinite(arena.rows)&&(r<0||r>=arena.rows));
    const hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
    for(const cell of cells){const c=cell.column,r=cell.row,x=c*size,y=r*size,seed=c+r*31;
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#ad9471';ctx.beginPath();
      const corners=[[0,0],[size,0],[size,size],[0,size]],neighbors=[has(c,r-1),has(c+1,r),has(c,r+1),has(c-1,r)];
      for(let edge=0;edge<4;edge++){const a=corners[edge],b=corners[(edge+1)%4];if(edge===0)ctx.moveTo(a[0],a[1]);
        for(let j=1;j<=10;j++){const t=j/10,inset=neighbors[edge]||j===10?0:(2+hash(seed+edge*11+j)*4)*size/100;
          ctx.lineTo(a[0]+(b[0]-a[0])*t-(b[1]-a[1])/size*inset,a[1]+(b[1]-a[1])*t+(b[0]-a[0])/size*inset);}}
      ctx.closePath();ctx.fill();
      for(let i=0;i<5;i++){ctx.fillStyle=i%2?'rgba(94,72,48,.13)':'rgba(131,105,70,.14)';ctx.beginPath();ctx.ellipse(size*(.17+hash(seed*9+i)*.66),size*(.17+hash(seed*7+i+51)*.66),size*(.06+hash(seed+i)*.11),size*.035,hash(seed+i+7)*2,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(87,66,43,.13)';ctx.lineWidth=size*.012;for(let i=0;i<3;i++){const px=size*(.2+hash(seed+i+81)*.6),py=size*(.2+hash(seed+i+91)*.6);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+size*.14,py+size*.035);ctx.stroke();}ctx.restore();
    }
  }
  function paintSentry(ctx,rocket=false,angle=-Math.PI/2,recoil=0){
    const p=aiTypes[rocket?'wallRocket':'wallSentry'].palette;
    ctx.save();ctx.fillStyle='#535b56';ctx.strokeStyle='#a4aaa0';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(const a of [Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4]){ctx.fillStyle='#c7c9ba';ctx.beginPath();ctx.arc(Math.cos(a)*21,Math.sin(a)*21,2.5,0,Math.PI*2);ctx.fill();}
    ctx.rotate(angle);ctx.fillStyle=p.barrel;ctx.fillRect(0-recoil*5,-6,79,12);ctx.fillStyle=p.front;ctx.fillRect(27-recoil*5,-5,44,3);ctx.fillStyle='#263731';ctx.fillRect(72-recoil*5,-8,8,16);
    ctx.fillStyle=p.turret;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.front;ctx.stroke();ctx.fillStyle=p.hatch;ctx.beginPath();ctx.arc(-5,-4,7,0,Math.PI*2);ctx.fill();ctx.restore();
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
    if((pose.type==='grey'||pose.type==='purple')){
      plate(-21,-15,42,30,palette.body);plate(-20,-15,10,30,palette.front);plate(10,-15,11,30,palette.front);
      ctx.fillStyle='#52605f';for(const x of [-18,16])for(const y of [-11,10])ctx.fillRect(x,y,3,2);
    }
    if(pose.type==='gold'){
      ctx.fillStyle='#fff1a678';ctx.beginPath();ctx.moveTo(-17,-13);ctx.lineTo(-9,-13);ctx.lineTo(13,13);ctx.lineTo(5,13);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#fff4b5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-15,-13);ctx.lineTo(16,-13);ctx.stroke();
    }
    if(pose.damage){ctx.strokeStyle='#303a37';ctx.lineWidth=1.4;for(let i=0;i<pose.damage;i++){ctx.beginPath();ctx.moveTo(-16+i*14,-12);ctx.lineTo(-12+i*12,-3);ctx.lineTo(-16+i*12,2);ctx.lineTo(-7+i*10,11);ctx.stroke();}ctx.fillStyle='#3f484455';ctx.fillRect(-18,-12,pose.damage*9,23);}
    ctx.fillStyle=mix(palette.body,.2);ctx.beginPath();ctx.moveTo(8,-12);ctx.lineTo(17,-10);ctx.lineTo(17,10);ctx.lineTo(8,12);ctx.closePath();ctx.fill();
    ctx.fillStyle=mix(palette.body,-.32);for(let y=-7;y<=7;y+=3.5)ctx.fillRect(-16,y,5,1.3);
    ctx.fillStyle=mix(palette.body,.48);for(const x of [-15,14])for(const y of [-10,10]){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}
    if(pose.type==='elite'||pose.type==='red'||pose.type==='pink'||pose.type==='gold'||(pose.type==='grey'||pose.type==='purple')){ctx.strokeStyle=mix(palette.body,.6);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(10,-7);ctx.lineTo(14,0);ctx.lineTo(10,7);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.rotate(pose.turret);
    const recoil=Math.max(0,Math.min(1,pose.recoil||0))*3,barrelLength=pose.type==='purple'?25:34;

    plate(0,pose.type==='purple'?-6:-4,barrelLength-recoil,pose.type==='purple'?12:8,palette.barrel);
    ctx.fillStyle=mix(palette.barrel,.35);ctx.fillRect(15-recoil,-4,3,8);
    ctx.fillStyle=mix(palette.barrel,-.5);ctx.fillRect(barrelLength-2-recoil,-2.5,2,5);
    if(pose.type==='teal'){ctx.fillStyle='#82d3cb';ctx.fillRect(26-recoil,-4,2.5,8);}

    ctx.fillStyle=mix(palette.turret,-.25);ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=palette.turret;ctx.beginPath();ctx.arc(-.7,-1,10.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=mix(palette.turret,.35);ctx.lineWidth=1;ctx.beginPath();ctx.arc(-.5,-.7,10,-Math.PI*.9,-Math.PI*.1);ctx.stroke();
    if((pose.type==='grey'||pose.type==='purple')){ctx.strokeStyle='#d5d9cd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,12,Math.PI*.15,Math.PI*1.1);ctx.stroke();if(pose.damage){ctx.strokeStyle='#384341';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-8,-6);ctx.lineTo(-2,1);ctx.lineTo(7,5);if(pose.damage>1){ctx.moveTo(-5,7);ctx.lineTo(5,-7);}ctx.stroke();}}
    if(pose.type==='gold'){const glint=.5+.5*Math.sin((pose.glintTime||0)*2);ctx.fillStyle=`rgba(255,250,195,${.5+.5*glint})`;ctx.beginPath();ctx.moveTo(5,-10);ctx.lineTo(6.5,-6);ctx.lineTo(11,-5);ctx.lineTo(6.5,-4);ctx.lineTo(5,0);ctx.lineTo(3.5,-4);ctx.lineTo(0,-5);ctx.lineTo(3.5,-6);ctx.closePath();ctx.fill();}
    if(pose.type==='navy'&&pose.warning){ctx.fillStyle='#d6eeff';ctx.beginPath();ctx.moveTo(34,-9);ctx.lineTo(37,-3);ctx.lineTo(45,0);ctx.lineTo(37,3);ctx.lineTo(34,9);ctx.lineTo(31,3);ctx.lineTo(26,0);ctx.lineTo(31,-3);ctx.closePath();ctx.fill();}
    if(pose.type==='pink')drawFlameEmblem(ctx,0,0,15,pose.heat||0);
    else if(pose.type==='red'){
      ctx.strokeStyle=pose.heat?'#9ce3ff':mix(palette.turret,.65);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(5,-6);ctx.lineTo(5,1);ctx.quadraticCurveTo(4,5,0,7);ctx.quadraticCurveTo(-4,5,-5,1);ctx.closePath();ctx.stroke();
    }else if(pose.type==='violet'){ctx.strokeStyle='#e9ccff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();}else if(pose.type==='duplicator'){ctx.strokeStyle='#ffe2f1';ctx.lineWidth=1.3;ctx.strokeRect(-6,-5,8,8);ctx.strokeRect(-2,-1,8,8);}else{
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
  window.TankLevels = { paintMud, paintSentry, paintTank, drawFlameEmblem, renderHearts, directions, aiTypes, defaultLevel, builtInLevels, clone, validate, compile };
})();
