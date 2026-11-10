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
      dodgeChance: .75, reactionTime: .08, scanInterval: .15, dodgeCooldown: 1.15, awareness: 320,
      palette: { ...aiTracks, body: '#252d29', front: '#535f57', barrel: '#171d19', turret: '#354139', hatch: '#8c9d90' } }
  };
  aiTypes.red = { ...aiTypes.elite, label: 'Red (Charge)', shield: true,
    palette: { ...aiTracks, body: '#e7352b', front: '#ff7660', barrel: '#a51e20', turret: '#f24738', hatch: '#ffb08a' } };
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
  const builtInLevels = { "level-1": level1, "level-2": level2, "level-3": level3, "level-4": level4, "level-5": level5, "level-6": level6, "level-7": level7, "level-8": level8, "level-9": level9, "level-10": level10 };
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
        if (!Object.hasOwn(aiTypes, item.type)) throw new Error('Choose Tan (Stationary), Brown (Mobile), Teal (Rocket), Black (Elite), or Red (Charge) for AI tanks.');
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
  window.TankLevels = { directions, aiTypes, defaultLevel, builtInLevels, clone, validate, compile };
})();
