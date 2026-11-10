(() => {
  'use strict';
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('status');
  const result = document.getElementById('result');
  const Levels = window.TankLevels;
  const requestedLevel = window.location ? new URLSearchParams(window.location.search).get('level') : null;
  let currentLevel = Levels.clone(Levels.builtInLevels[requestedLevel] || Levels.defaultLevel), editing = false;
  const world = { width: 1000, height: 1000 };
  const camera = { x: 500, y: 312.5, zoom: 1 };
  const scale = 1.5, tankRadius = 44;
  const bulletWidth = 13.8 * 1.1 * 1.25 * 1.15, bulletHeight = 6.9 * 1.1 * 1.25 * 1.15;
  const rocketFlameScale = 2;
  const bulletPairHitScale = 1.12;
  const bulletHitHalfLength = bulletWidth * 1.1 / 2;
  const bulletHitHalfWidth = bulletHeight * 1.1 / 2;
  const movementSpeed = 135, pushingSpeedRatio = .25;
  const walls = [];
  const keys = new Set();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const tank = {}, enemy = {};
  let enemies = [];
  let shells = [], smoke = [], bursts = [], embers = [], phase = 'playing';
  let active = !document.hidden, cooldown = 0, clickCooldown = 0, tread = 0, last = 0;
  let mouse = { x: 820, y: 155 }, previousStatus = '';
  let pointerTarget = { ...mouse }, aimTracking = false;
  const aimCatchupRate = 6; // Half-speed catch-up relative to a responsive 12/s smoothing rate.

  const engine = new Audio('audio/engine-heavy-loop.ogg');
  engine.loop = true; engine.preload = 'auto'; engine.volume = 0;
  const pools = Object.fromEntries(Object.entries({
    shoot: ['audio/pistol-shot.wav', 8],
    ricochet: ['audio/thud.ogg', 8],
    shieldRicochet: ['audio/thud.ogg', 8],
    impact: ['audio/tank-hit.ogg', 4],
    rocketLaunch: ['audio/rocket-launch-soft.ogg', 6]
  }).map(([name, [src, count]]) => [name, Array.from({ length: count }, () => new Audio(src))]));
  const rocketFlight = new Audio('audio/rocket-flight-soft.ogg');
  rocketFlight.loop = true; rocketFlight.volume = .055;
  const audioAssets = document.createElement('div');
  audioAssets.hidden = true;
  for (const audio of [engine, rocketFlight, ...Object.values(pools).flat()]) {
    audio.preload = 'auto';
    audio.addEventListener('error', () => console.warn('Could not load game sound:', audio.src));
    audioAssets.appendChild(audio);
  }
  document.body.appendChild(audioAssets);
  let muted = false, engineLevel = 0;
  function sound(name) {
    if (muted || !active) return;
    const audio = pools[name].find(a => a.paused || a.ended);
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = name === 'shieldRicochet' ? .55 : name === 'rocketLaunch' ? .16 : name === 'shoot' ? .5 : .65;
    audio.playbackRate = name === 'shieldRicochet' ? 1.15 : name === 'rocketLaunch' ? .8 : name === 'ricochet' ? .85 : 1;
    audio.preservesPitch = false;
    audio.play().catch(() => {});
  }
  function stopRocketAudio() { rocketFlight.pause(); }
  function syncRocketAudio() {
    const count = shells.filter(s => s.rocket && s.life > 0).length;
    if (!count || !active || editing || phase !== 'playing' || muted) { stopRocketAudio(); return; }
    rocketFlight.volume = Math.min(.08, .035 + count * .008);
    if (rocketFlight.paused) rocketFlight.play().catch(() => {});
  }
  function stopEngine() { engine.pause(); engine.volume = 0; engineLevel = 0; }
  function movementSound(moving, dt) {
    const target = moving && active && !muted ? .11 : 0;
    engineLevel += (target - engineLevel) * Math.min(1, dt * 14);
    engine.volume = engineLevel;
    if (!target && engineLevel < .002) stopEngine();
    else if (target && engine.paused) engine.play().catch(() => {});
  }
  function restart() {
    const loaded = Levels.compile(currentLevel);
    world.width = loaded.width; world.height = loaded.height;
    camera.x = world.width / 2; camera.y = world.height / 2;
    canvas.width = world.width; canvas.height = world.height;
    canvas.style.aspectRatio = `${world.width} / ${world.height}`;
    walls.splice(0, walls.length, ...loaded.walls);
    Object.assign(tank, loaded.player, { turnClearance: null, vx: 0, vy: 0 });
    Object.assign(enemy, loaded.enemies[0]);
    enemies = [enemy, ...loaded.enemies.slice(1).map(e => ({ ...e }))];
    let openingDelay = 1 + Math.random();
    for (let i = 0; i < enemies.length; i++) {
      if (i > 0) openingDelay += .6 + Math.random() * .2;
      Object.assign(enemies[i], { reload: openingDelay, openingDelay, charge: 0 });
    }
    for (const e of enemies) Object.assign(e, { vx: 0, vy: 0, tread: 0, path: [], thinkTimer: 0, burstTimer: 1.3, resting: false,
      scanTimer: .2, reactionTimer: 0, pendingThreat: null, dodgeTime: 0, dodgeCooldown: 0, dodgeX: 0, dodgeY: 0, turnClearance: null, burst: null, lastTactic: null, shieldTime: 0, shieldCooldown: 0, offenseTime: 0, shieldIdle: 0 });
    for (const e of enemies) if (Levels.aiTypes[e.type].mobile) {
      e.age = 0; e.routeSeed = Math.random() * 10000; e.preferredDistance = 300 + Math.random() * 80;
      e.routeDirections = [[0,-1],[1,0],[0,1],[-1,0]];
      for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [e.routeDirections[i],e.routeDirections[j]] = [e.routeDirections[j],e.routeDirections[i]]; }
      e.resting = true; e.burstTimer = .05 + Math.random() * .4;
    }
    shells = []; smoke = []; bursts = []; embers = []; keys.clear();
    cooldown = 0; clickCooldown = 0; tread = 0; phase = 'playing'; active = !document.hidden && !editing;
    mouse = { x: enemy.x, y: enemy.y };
    pointerTarget = { ...mouse }; aimTracking = false;
    result.hidden = true; stopEngine(); stopRocketAudio();
    for (const a of Object.values(pools).flat()) { a.pause(); a.currentTime = 0; }
  }
  document.getElementById('reset').onclick = restart;
  document.getElementById('play-again').onclick = restart;
  function aim(e) {
    if (editing) return;
    const r = canvas.getBoundingClientRect();
    pointerTarget = {
      x: ((e.clientX - r.left) / r.width * world.width - world.width / 2) / camera.zoom + camera.x,
      y: ((e.clientY - r.top) / r.height * world.height - world.height / 2) / camera.zoom + camera.y
    };
    aimTracking = true;
  }
  function updateAim(dt) {
    if (aimTracking) {
      const amount = 1 - Math.exp(-aimCatchupRate * dt);
      mouse.x += (pointerTarget.x - mouse.x) * amount;
      mouse.y += (pointerTarget.y - mouse.y) * amount;
    }
    tank.turret = Math.atan2(mouse.y - tank.y, mouse.x - tank.x);
  }
  canvas.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerdown', e => { if(editing)return; if(e.button!==0)return; canvas.focus(); active = true; aim(e); fire('click'); });
  window.addEventListener('keydown', e => {
    if (editing) return;
    if (e.target.matches?.('input,textarea,select,[contenteditable="true"]')) return;
    const k = e.key.toLowerCase();
    if (k === 'f2') { e.preventDefault(); if(!e.repeat)showCollisions=!showCollisions;return; }
    if (k === 'r' && !e.repeat) { e.preventDefault(); restart(); return; }
    if (k === ' ' && e.target.closest?.('button')) return;
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape'].includes(k)) return;
    e.preventDefault();
    if (k === 'escape') { if (!e.repeat) active = !active; keys.clear(); stopEngine(); stopRocketAudio(); return; }
    active = true; keys.add(k);
    if (k === ' ') fire();
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  function pause() { active = false; keys.clear(); stopEngine(); stopRocketAudio(); }
  window.addEventListener('blur', pause);
  window.addEventListener('focus', () => { if (!document.hidden && !editing) active = true; });
  document.addEventListener('visibilitychange', () => { if (document.hidden || editing) pause(); else active = true; });

  function rectanglesOverlap(a, b) {
    for (const angle of [a.angle, a.angle + Math.PI / 2, b.angle, b.angle + Math.PI / 2]) {
      const nx = Math.cos(angle), ny = Math.sin(angle);
      const extent = r => Math.abs(Math.cos(r.angle) * nx + Math.sin(r.angle) * ny) * r.hx +
        Math.abs(-Math.sin(r.angle) * nx + Math.cos(r.angle) * ny) * r.hy;
      if (Math.abs((b.x - a.x) * nx + (b.y - a.y) * ny) > extent(a) + extent(b)) return false;
    }
    return true;
  }
  const shellBox = (s, againstBullet = false) => ({ x: s.x, y: s.y, angle: Math.atan2(s.vy, s.vx),
    hx: bulletWidth / 2 * (againstBullet ? bulletPairHitScale : 1),
    hy: bulletHeight / 2 * (againstBullet ? bulletPairHitScale : 1) });
  const hullBox = t => ({ x: t.x, y: t.y, angle: t.hull, hx: 21 * scale, hy: 20 * scale });
  function circleWall(x, y, r, w) {
    return Math.hypot(x - clamp(x, w.x, w.x + w.width), y - clamp(y, w.y, w.y + w.height)) < r;
  }
  // Rounded hull/track footprint, inset one unit from the artwork. The barrel
  // is deliberately excluded. Twelve vertices approximate the rounded corners.
  const bodyHalfLength = 30.5, bodyHalfWidth = 29, bodyCorner = 5;
  let showCollisions = false;
  function footprint(actor, x = actor.x, y = actor.y, angle = actor.hull) {
    const c = Math.cos(angle), sn = Math.sin(angle), points = [];
    for (let corner = 0; corner < 4; corner++) {
      const a = corner * Math.PI / 2;
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (bodyHalfLength - bodyCorner);
      const cy = (corner < 2 ? 1 : -1) * (bodyHalfWidth - bodyCorner);
      for (let i = 0; i <= 2; i++) {
        const px = cx + Math.cos(a + i * Math.PI / 4) * bodyCorner;
        const py = cy + Math.sin(a + i * Math.PI / 4) * bodyCorner;
        points.push({ x: x + px * c - py * sn, y: y + px * sn + py * c });
      }
    }
    return points;
  }
  function polygonBounds(points) {
    return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
      top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
  }
  function wallPolygon(w) { return [{x:w.x,y:w.y},{x:w.x+w.width,y:w.y},{x:w.x+w.width,y:w.y+w.height},{x:w.x,y:w.y+w.height}]; }
  function polygonContact(a, b) {
    const aa = polygonBounds(a), bb = polygonBounds(b);
    if (aa.right <= bb.left + 1e-7 || aa.left >= bb.right - 1e-7 || aa.bottom <= bb.top + 1e-7 || aa.top >= bb.bottom - 1e-7) return null;
    let best = Infinity, correction = null;
    for (const polygon of [a,b]) for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i+1)%polygon.length], length = Math.hypot(q.x-p.x,q.y-p.y);
      const nx = -(q.y-p.y)/length, ny = (q.x-p.x)/length;
      const pa = a.map(v => v.x*nx+v.y*ny), pb = b.map(v => v.x*nx+v.y*ny);
      const amin = Math.min(...pa), amax = Math.max(...pa), bmin = Math.min(...pb), bmax = Math.max(...pb);
      if (amax <= bmin + 1e-7 || amin >= bmax - 1e-7) return null;
      const positive = bmax-amin, negative = amax-bmin;
      const shift = positive < negative ? positive : -negative;
      if (Math.abs(shift) < best) { best = Math.abs(shift); correction = { x:nx*shift, y:ny*shift }; }
    }
    return correction;
  }
  function tankContact(a, b, x = a.x, y = a.y, angle = a.hull) { return polygonContact(footprint(a,x,y,angle),footprint(b)); }
  function canOccupy(x, y, actor = tank, angle = actor.hull) {
    const shape = footprint(actor,x,y,angle), bounds = polygonBounds(shape);
    return bounds.left >= -1e-7 && bounds.right <= world.width+1e-7 && bounds.top >= -1e-7 && bounds.bottom <= world.height+1e-7 &&
      !walls.some(w => bounds.right>w.x&&bounds.left<w.x+w.width&&bounds.bottom>w.y&&bounds.top<w.y+w.height&&polygonContact(shape,wallPolygon(w)));
  }
  function otherTanks(actor) { return [tank,...enemies].filter(t => t !== actor && t.alive); }
  function canTankPose(actor,x,y,angle=actor.hull) {
    return canOccupy(x,y,actor,angle) && !otherTanks(actor).some(t => tankContact(actor,t,x,y,angle));
  }
  function turnTank(actor,desired) {
    const start=actor.hull,delta=angleDelta(start,desired),steps=Math.max(1,Math.ceil(Math.abs(delta)/.04));
    let safe=0;
    for(let i=1;i<=steps;i++) {
      const fraction=i/steps;
      if(canTankPose(actor,actor.x,actor.y,start+delta*fraction)){safe=fraction;continue;}
      let low=safe,high=fraction;
      for(let n=0;n<12;n++){const middle=(low+high)/2;if(canTankPose(actor,actor.x,actor.y,start+delta*middle))low=middle;else high=middle;}
      actor.hull=start+delta*low;return;
    }
    actor.hull=start+delta;
  }
  function rotationFits(actor,x,y,target) {
    const delta=angleDelta(actor.hull,target),steps=Math.max(1,Math.ceil(Math.abs(delta)/.06));
    for(let i=0;i<=steps;i++)for(const [ox,oy] of [[0,0],[.2,0],[-.2,0],[0,.2],[0,-.2]])if(!canTankPose(actor,x+ox,y+oy,actor.hull+delta*i/steps))return false;
    return true;
  }
  function findTurnClearance(actor,target) {
    // Pick the smallest safe shift that makes room for the complete turn.
    for(let radius=3;radius<=24;radius+=3) {
      let best=null,bestCost=Infinity;
      for(let i=0;i<16;i++) {
        const angle=i*Math.PI/8,x=actor.x+Math.cos(angle)*radius,y=actor.y+Math.sin(angle)*radius;
        if(!rotationFits(actor,x,y,target))continue;
        let clear=true;
        for(let t=1;t<=Math.ceil(radius/2);t++)if(!canTankPose(actor,actor.x+(x-actor.x)*t/Math.ceil(radius/2),actor.y+(y-actor.y)*t/Math.ceil(radius/2))){clear=false;break;}
        if(!clear)continue;
        const cost=radius+.25*((x-actor.x)*-Math.cos(target)+(y-actor.y)*-Math.sin(target));
        if(cost<bestCost){bestCost=cost;best={x,y,target};}
      }
      if(best)return best;
    }
    return null;
  }
  function faceTravel(actor,target,rate,dt) {
    // Treads work in both directions: choose the nearer equivalent hull angle.
    if(Math.abs(angleDelta(actor.hull,target))>Math.PI/2)target+=Math.PI;
    if(actor.turnClearance&&Math.abs(angleDelta(actor.turnClearance.target,target))>.25)actor.turnClearance=null;
    if(actor.turnClearance) {
      const p=actor.turnClearance,rx=p.x-actor.x,ry=p.y-actor.y;
      const along=rx*Math.cos(target)+ry*Math.sin(target),sx=rx-along*Math.cos(target),sy=ry-along*Math.sin(target),distance=Math.hypot(sx,sy);
      if(distance>.2){const amount=Math.min(distance,55*dt);moveTankStep(actor,sx/distance*amount,sy/distance*amount);}else actor.turnClearance=null;
      if(rotationFits(actor,actor.x,actor.y,target))actor.turnClearance=null;
    }
    const before=actor.hull,requested=clamp(angleDelta(before,target),-rate*dt,rate*dt);
    turnTank(actor,before+requested);
    if(Math.abs(angleDelta(before,actor.hull))<Math.abs(requested)*.5&&Math.abs(angleDelta(actor.hull,target))>.15&&!actor.turnClearance)actor.turnClearance=findTurnClearance(actor,target);
    return !actor.turnClearance&&Math.abs(angleDelta(actor.hull,target))<.12;
  }
  function touchesEnemy(x, y) { return enemies.some(e => e.alive && tankContact(tank,e,x,y)); }
  function canMove(x, y) { return canTankPose(tank,x,y); }
  function resolveWorld(actor,x,y) {
    for(let iteration=0;iteration<6;iteration++) {
      let bounds=polygonBounds(footprint(actor,x,y));
      if(bounds.left<0)x-=bounds.left;if(bounds.right>world.width)x-=bounds.right-world.width;
      if(bounds.top<0)y-=bounds.top;if(bounds.bottom>world.height)y-=bounds.bottom-world.height;
      let corrected=false;
      for(const wall of walls){const hit=polygonContact(footprint(actor,x,y),wallPolygon(wall));if(hit){x+=hit.x;y+=hit.y;corrected=true;}}
      if(!corrected)break;
    }
    return {x,y};
  }
  function moveTankStep(actor,dx,dy,push=false) {
    let point=resolveWorld(actor,actor.x+dx,actor.y+dy);
    const moves=new Map();
    for(const other of otherTanks(actor)) {
      const hit=tankContact(actor,other,point.x,point.y);if(!hit)continue;
      const proposed={...other,x:other.x-hit.x,y:other.y-hit.y};
      const free=push&&canOccupy(proposed.x,proposed.y,other)&&
        !otherTanks(other).some(t=>t!==actor&&tankContact(proposed,moves.has(t)?{...t,...moves.get(t)}:t));
      if(free)moves.set(other,{x:proposed.x,y:proposed.y});
      else {point.x+=hit.x;point.y+=hit.y;point=resolveWorld(actor,point.x,point.y);}
    }
    if(!canOccupy(point.x,point.y,actor))return;
    for(const other of otherTanks(actor))if(tankContact(actor,moves.has(other)?{...other,...moves.get(other)}:other,point.x,point.y))return;
    for(const [other,p] of moves)Object.assign(other,p);
    actor.x=point.x;actor.y=point.y;
  }
  function movePlayerAxis(dx,dy){moveTankStep(tank,dx,dy,true);}
  function movePlayer(dx,dy,dt) {
    const steps=Math.max(1,Math.ceil(movementSpeed*dt/2)),distance=movementSpeed*dt/steps;
    for(let i=0;i<steps;i++) {
      const ratio=touchesEnemy(tank.x+dx*distance,tank.y+dy*distance)?pushingSpeedRatio:1;
      moveTankStep(tank,dx*distance*ratio,dy*distance*ratio,true);
    }
  }
  // Swept point against an expanded wall; returns the first contact and surface normal.
  function segmentBox(x, y, dx, dy, box) {
    let enter = -Infinity, exit = Infinity, nx = 0, ny = 0;
    for (const [p, d, lo, hi, ax, ay] of [[x, dx, box.x, box.x + box.width, 1, 0], [y, dy, box.y, box.y + box.height, 0, 1]]) {
      if (Math.abs(d) < 1e-10) { if (p < lo || p > hi) return null; continue; }
      let near = (lo - p) / d, far = (hi - p) / d;
      const sign = d > 0 ? -1 : 1;
      if (near > far) [near, far] = [far, near];
      if (near > enter + 1e-8) { enter = near; nx = ax * sign; ny = ay * sign; }
      else if (Math.abs(near - enter) < 1e-8) { nx += ax * sign; ny += ay * sign; }
      exit = Math.min(exit, far);
      if (enter > exit) return null;
    }
    if (enter < -1e-8 || enter > 1 || exit < 0) return null;
    return { t: Math.max(0, enter), nx, ny };
  }
  function firstContact(s, dx, dy) {
    const speed = Math.hypot(s.vx, s.vy);
    const ex = Math.abs(s.vx / speed) * bulletHitHalfLength + Math.abs(s.vy / speed) * bulletHitHalfWidth;
    const ey = Math.abs(s.vy / speed) * bulletHitHalfLength + Math.abs(s.vx / speed) * bulletHitHalfWidth;
    let best = null;
    function consider(hit) { if (hit && hit.t >= 0 && hit.t <= 1 && (!best || hit.t < best.t)) best = hit; }
    if (dx < 0) consider({ t: (ex - s.x) / dx, nx: 1, ny: 0 });
    if (dx > 0) consider({ t: (world.width - ex - s.x) / dx, nx: -1, ny: 0 });
    if (dy < 0) consider({ t: (ey - s.y) / dy, nx: 0, ny: 1 });
    if (dy > 0) consider({ t: (world.height - ey - s.y) / dy, nx: 0, ny: -1 });
    for (const w of walls) if (w.type !== 'hole') consider(segmentBox(s.x, s.y, dx, dy, { x: w.x - ex, y: w.y - ey, width: w.width + ex * 2, height: w.height + ey * 2 }));
    for (const e of enemies) if (e.alive && e.shieldTime > 0) {
      const hit = shieldContact(s, dx, dy, e);
      if (hit) consider(hit);
    }
    return best;
  }
  function shieldContact(s, dx, dy, e) {
    const rx=s.x-e.x, ry=s.y-e.y, radius=48+bulletHitHalfLength;
    const a=dx*dx+dy*dy, dot=rx*dx+ry*dy, c=rx*rx+ry*ry-radius*radius;
    // Outgoing shots, including the protected tank's own shots, leave freely.
    if (!a || dot>=0) return null;
    const discriminant=dot*dot-a*c;
    if(discriminant<0) return null;
    const t=c<=0?0:(-dot-Math.sqrt(discriminant))/a;
    if(t<0||t>1) return null;
    const x=rx+dx*t,y=ry+dy*t,n=Math.hypot(x,y)||1;
    return {t,nx:x/n,ny:y/n,shield:e};
  }
  function reflectShot(s,contact) {
    if(contact.shield){const dot=s.vx*contact.nx+s.vy*contact.ny;s.vx-=2*dot*contact.nx;s.vy-=2*dot*contact.ny;}
    else {if(contact.nx)s.vx*=-1;if(contact.ny)s.vy*=-1;}
    s.x+=contact.nx*.02;s.y+=contact.ny*.02;
  }
  function lineOfSight(enemy = enemies[0]) {
    return !walls.some(w => w.type !== 'hole' && segmentBox(enemy.x, enemy.y, tank.x - enemy.x, tank.y - enemy.y,
      { x: w.x - 8, y: w.y - 8, width: w.width + 16, height: w.height + 16 }));
  }
  // Sweep the full shell footprint against a tank's rotated hull, including
  // a small ally safety margin and any known movement during shell travel.
  function shotTankContact(s, dx, dy, victim, elapsed, duration, padding = 0) {
    const c = Math.cos(victim.hull), sn = Math.sin(victim.hull);
    const vx = victim.vx || 0, vy = victim.vy || 0;
    const rx = s.x - victim.x - vx * elapsed, ry = s.y - victim.y - vy * elapsed;
    const x = rx * c + ry * sn, y = -rx * sn + ry * c;
    const relativeAngle = Math.atan2(s.vy, s.vx) - victim.hull;
    const hx = 21 * scale + Math.abs(Math.cos(relativeAngle)) * bulletWidth / 2 + Math.abs(Math.sin(relativeAngle)) * bulletHeight / 2 + padding;
    const hy = 20 * scale + Math.abs(Math.sin(relativeAngle)) * bulletWidth / 2 + Math.abs(Math.cos(relativeAngle)) * bulletHeight / 2 + padding;
    if (Math.abs(x) <= hx && Math.abs(y) <= hy) return 0;
    const mx = dx - vx * duration, my = dy - vy * duration;
    return segmentBox(x, y, mx * c + my * sn, -mx * sn + my * c,
      { x: -hx, y: -hy, width: hx * 2, height: hy * 2 })?.t ?? null;
  }
  function safeAIShot(shooter, speed, angle = shooter.turret) {
    const allies = enemies.filter(e => e !== shooter && e.alive);
    if (!allies.length) return true;
    const s = { x: shooter.x, y: shooter.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    let remaining = 8, elapsed = 0;
    // First segment plus the single reflected segment; the second impact ends it.
    for (let leg = 0; leg < (Levels.aiTypes[shooter.type]?.maxBounces ?? 1) + 1 && remaining > 0; leg++) {
      const contact = firstContact(s, s.vx * remaining, s.vy * remaining);
      const duration = remaining * (contact ? contact.t : 1);
      const dx = s.vx * duration, dy = s.vy * duration;
      const playerHit = tank.alive ? shotTankContact(s, dx, dy, tank, elapsed, duration) : null;
      for (const ally of allies) {
        const hit = shotTankContact(s, dx, dy, ally, elapsed, duration, 6);
        if (hit !== null && (playerHit === null || hit <= playerHit + 1e-8)) return false;
      }
      if (playerHit !== null || !contact) return true;
      if (contact.shield && contact.shield !== shooter) return false;
      s.x += dx; s.y += dy;
      elapsed += duration; remaining -= duration;
      reflectShot(s,contact);
    }
    return true;
  }
  function emitShot(owner, speed, angle = owner.turret) {
    const a = angle;
    const weapon = owner === tank ? null : Levels.aiTypes[owner.type];
    const s = { x: owner.x, y: owner.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      owner, bounces: 0, maxBounces: weapon?.maxBounces ?? 1, rocket: !!weapon?.rocket, life: 8, smokeDistance: 0 };
    // Keep the enlarged hitbox clear of its firing tank at every turret angle.
    const hullExtent = Math.abs(Math.cos(a - owner.hull)) * 21 * scale + Math.abs(Math.sin(a - owner.hull)) * 20 * scale;
    const muzzleDistance = Math.max(51, hullExtent + bulletHitHalfLength + .5);
    const dx = Math.cos(a) * muzzleDistance, dy = Math.sin(a) * muzzleDistance;
    const contact = firstContact(s, dx, dy);
    s.x += dx * (contact ? contact.t : 1); s.y += dy * (contact ? contact.t : 1);
    if (contact) bounce(s, contact);
    shells.push(s); sound(s.rocket ? 'rocketLaunch' : 'shoot');
  }
  function fire(trigger = 'held') {
    if (editing || !active || phase !== 'playing' || !tank.alive || (trigger === 'click' ? clickCooldown > 0 : cooldown > 0) || shells.filter(s => s.owner === tank && s.life > 0).length >= 5) return;
    emitShot(tank, 380); cooldown = .22; clickCooldown = .11;
  }
  function canEnemyOccupy(e,x,y) {return canTankPose(e,x,y);}
  function clearMovement(x,y,tx,ty,actor=tank) {
    const distance=Math.hypot(tx-x,ty-y),steps=Math.max(1,Math.ceil(distance/6));
    const angle=distance>0?Math.atan2(ty-y,tx-x):actor.hull;
    for(let i=0;i<=steps;i++)if(!canOccupy(x+(tx-x)*i/steps,y+(ty-y)*i/steps,actor,angle))return false;
    return true;
  }
  // Four-neighbour navigation keeps routes around cover predictable and avoids
  // cutting diagonally through the corners of walls.
  function wantsCover(e) {
    if(e.offenseTime>0) return false;
    return !e.burst && (e.reload > .8 || (e.reload <= .8 && lineOfSight(e) && !safeAIShot(e,Levels.aiTypes[e.type].shellSpeed)));
  }
  function planMobileRoute(e) {
    const columns = world.width / 100, rows = world.height / 100;
    const elite=!!Levels.aiTypes[e.type].elite,hide=elite&&wantsCover(e);
    const start = { column: Math.floor(e.x / 100), row: Math.floor(e.y / 100), previous: null, depth: 0 };
    const queue = [start], seen = new Set([`${start.column},${start.row}`]);
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i], x = (node.column + .5) * 100, y = (node.row + .5) * 100;
      const distance = Math.hypot(x - tank.x, y - tank.y);
      if (node.depth > 0 && distance >= (elite?230:170) && canEnemyOccupy(e, x, y)) {
        const visible = !walls.some(w => w.type !== 'hole' && segmentBox(x, y, tank.x - x, tank.y - y,
          { x: w.x - 8, y: w.y - 8, width: w.width + 16, height: w.height + 16 }));
        const hash = Math.sin(node.column * 127.1 + node.row * 311.7 + (e.routeSeed || 0)) * 43758.5453;
        const bias = (hash - Math.floor(hash)) * 2 - 1;
        const variation = 12 + 58 * Math.max(0, 1 - (e.age || 0) / 3);
        const score = (e.offenseTime>0 ? (visible?650:0)-distance*.5 : 0) + (hide ? (!visible?600:0) : visible?(elite?400:300):0) - Math.abs(distance - (e.preferredDistance || 340)) * .5 - node.depth * 14 + bias * variation;
        if (score > bestScore) { bestScore = score; best = node; }
      }
      for (const [dc, dr] of (e.routeDirections || [[0, -1], [1, 0], [0, 1], [-1, 0]])) {
        const column = node.column + dc, row = node.row + dr, key = `${column},${row}`;
        if (column < 0 || row < 0 || column >= columns || row >= rows || seen.has(key)) continue;
        seen.add(key);
        const nx = (column + .5) * 100, ny = (row + .5) * 100;
        if (!canEnemyOccupy(e, nx, ny) || !clearMovement(x, y, nx, ny, e)) continue;
        queue.push({ column, row, depth: node.depth + 1, previous: node });
      }
    }
    const path = [];
    while (best && best.previous) { path.unshift({ x: (best.column + .5) * 100, y: (best.row + .5) * 100 }); best = best.previous; }
    const center = { x: (start.column + .5) * 100, y: (start.row + .5) * 100 };
    if (path.length && Math.hypot(e.x - center.x, e.y - center.y) > 2) {
      if (clearMovement(e.x, e.y, center.x, center.y, e)) path.unshift(center);
      else return [];
    }
    return path;
  }
  function incomingThreat(e) {
    let nearest = null, soonest = Infinity;
    for (const s of shells) {
      if (s.life <= 0 || Math.hypot(s.x - e.x, s.y - e.y) > (Levels.aiTypes[e.type].awareness || 260)) continue;
      const speed2 = s.vx * s.vx + s.vy * s.vy;
      if (speed2 <= 0) continue;
      const time = ((e.x - s.x) * s.vx + (e.y - s.y) * s.vy) / speed2;
      if (time <= 0 || time > .75 || time >= soonest) continue;
      const miss = Math.hypot(s.x + s.vx * time - e.x, s.y + s.vy * time - e.y);
      if (miss > tankRadius + bulletHitHalfWidth + 10 || firstContact(s, s.vx * time, s.vy * time)) continue;
      nearest = s; soonest = time;
    }
    return nearest;
  }
  function shieldThreat(e) {
    for(const original of shells) {
      if(original.life<=0) continue;
      const s={...original};let remaining=Math.min(1,s.life),elapsed=0;
      for(let leg=0;leg<3&&remaining>1e-8;leg++) {
        const contact=firstContact(s,s.vx*remaining,s.vy*remaining);
        const duration=remaining*(contact?contact.t:1);
        if(shotTankContact(s,s.vx*duration,s.vy*duration,e,elapsed,duration)!==null) return true;
        if(!contact||(s.bounces||0)>=(s.maxBounces??1)) break;
        s.x+=s.vx*duration;s.y+=s.vy*duration;reflectShot(s,contact);s.bounces=(s.bounces||0)+1;
        elapsed+=duration;remaining-=duration;
      }
    }
    return false;
  }
  function activateShield(e,offensive=false) {
    e.shieldTime=3;e.shieldIdle=0;e.offenseTime=offensive?3.5:0;
    e.path=[];e.thinkTimer=0;e.pendingThreat=null;e.dodgeTime=0;
  }
  function updateShield(dt,e) {
    if(!e.alive||!Levels.aiTypes[e.type].shield) return;
    e.offenseTime=Math.max(0,(e.offenseTime||0)-dt);
    if(e.shieldTime>0) {
      const remaining=e.shieldTime-dt;e.shieldTime=Math.max(0,remaining);
      if(remaining<=0)e.shieldCooldown=Math.max(0,6+remaining);
      return;
    }
    e.shieldIdle=(e.shieldIdle||0)+dt;
    e.shieldCooldown=Math.max(0,(e.shieldCooldown||0)-dt);
    if(e.shieldCooldown>0) return;
    if(shieldThreat(e)) activateShield(e);
    else if(e.shieldIdle>=6) activateShield(e,true);
  }
  function beginDodge(e, shot) {
    const speed = Math.hypot(shot.vx, shot.vy), side = Math.random() < .5 ? 1 : -1;
    for (const sign of [side, -side]) {
      const dx = -shot.vy / speed * sign, dy = shot.vx / speed * sign;
      const x = e.x + dx * 43, y = e.y + dy * 43;
      if (canEnemyOccupy(e, x, y) && clearMovement(e.x, e.y, x, y, e)) {
        e.dodgeX = dx; e.dodgeY = dy; e.dodgeTime = .45; e.path = []; e.thinkTimer = 0; return true;
      }
    }
    return false;
  }
  function updateMobileEnemy(dt, e) {
    e.vx = 0; e.vy = 0;
    const type = Levels.aiTypes[e.type];
    if (!e.alive || !type.mobile || dt <= 0) return;
    e.age = (e.age || 0) + dt;
    if(type.elite){const tactic=wantsCover(e)?'cover':'attack';if(e.lastTactic!==tactic){e.path=[];e.thinkTimer=0;e.lastTactic=tactic;}}
    e.scanTimer -= dt; e.dodgeCooldown = Math.max(0, e.dodgeCooldown - dt);
    if (e.offenseTime>0) { e.pendingThreat=null; e.dodgeTime=0; }
    else if (e.pendingThreat) {
      e.reactionTimer -= dt;
      if (e.reactionTimer <= 0) {
        const shot = e.pendingThreat; e.pendingThreat = null; e.dodgeCooldown = type.dodgeCooldown ?? 1.5;
        if (incomingThreat(e) === shot && Math.random() < (type.dodgeChance ?? .55)) beginDodge(e, shot);
      }
    } else if (e.scanTimer <= 0 && e.dodgeCooldown === 0) {
      e.scanTimer = type.scanInterval ?? .2;
      const shot = incomingThreat(e);
      if (shot) { e.pendingThreat = shot; e.reactionTimer = type.reactionTime ?? .18; }
    }
    const ox = e.x, oy = e.y;
    let dx = 0, dy = 0, speed = type.moveSpeed * (e.shieldTime>0?1.25:1);
    if (e.dodgeTime > 0 && !(e.offenseTime>0)) {
      e.dodgeTime = Math.max(0, e.dodgeTime - dt); dx = e.dodgeX; dy = e.dodgeY; speed = 95 * (e.shieldTime>0?1.25:1);
    } else if(type.elite && !(e.offenseTime>0) && (e.burst || e.charge>0 || (wantsCover(e)&&!lineOfSight(e)))) {
      e.path=[];e.thinkTimer=0;
    } else {
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) { e.resting = !e.resting; e.burstTimer = e.resting ? .4 + Math.random() * .3 : 1.1 + Math.random() * .4; }
      e.thinkTimer -= dt;
      if (!e.resting || e.offenseTime>0) {
        if (e.thinkTimer <= 0 && (!e.path.length || Math.hypot(e.x-(Math.floor(e.x/100)+.5)*100,e.y-(Math.floor(e.y/100)+.5)*100)<1.5)) { e.path = planMobileRoute(e); e.thinkTimer = .95 + Math.random() * .3; }
        while (e.path.length && Math.hypot(e.path[0].x - e.x, e.path[0].y - e.y) < 1) e.path.shift();
        const target = e.path[0];
        if (target) {
          const distance = Math.hypot(target.x - e.x, target.y - e.y);
          dx = (target.x - e.x) / distance; dy = (target.y - e.y) / distance;
          speed = Math.min(speed, distance / dt);
        }
      }
    }
    if (dx || dy) {
      const target = Math.atan2(dy, dx);
      faceTravel(e,target,2.5,dt);
      const steps = Math.max(1, Math.ceil(speed * dt / 2)), distance = speed * dt / steps;
      for (let i = 0; i < steps; i++) {
        moveTankStep(e,dx*distance,dy*distance);
      }
      if (Math.hypot(e.x - ox, e.y - oy) < .001) { e.path = []; e.thinkTimer = 0; }
    }
    e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
    e.tread += Math.hypot(e.x - ox, e.y - oy);
  }
  function eliteAim(e,type) {
    const lead=Math.min(.45,Math.hypot(tank.x-e.x,tank.y-e.y)/type.shellSpeed*.35);
    return {x:clamp(tank.x+(tank.vx||0)*lead,30,world.width-30),y:clamp(tank.y+(tank.vy||0)*lead,30,world.height-30)};
  }
  function updateEliteWeapon(dt,e,type) {
    if(e.burst){
      e.burst.timer-=dt;e.turret=e.burst.aim;
      if(e.burst.timer<=0){
        const angle=e.burst.aim+(e.burst.index-1)*5*Math.PI/180;
        const ray={x:e.x,y:e.y,vx:Math.cos(angle)*type.shellSpeed,vy:Math.sin(angle)*type.shellSpeed};
        const wall=firstContact(ray,Math.cos(angle)*e.burst.range,Math.sin(angle)*e.burst.range);
        if(!wall&&safeAIShot(e,type.shellSpeed,angle)&&shells.filter(s=>s.owner===e&&s.life>0).length<type.shellLimit)emitShot(e,type.shellSpeed,angle);
        e.burst.index++;e.burst.timer+=.18;
        if(e.burst.index===3){e.burst=null;e.reload=type.reload;e.path=[];e.thinkTimer=0;}
      }
      return;
    }
    e.reload=Math.max(0,e.reload-dt);
    const predicted=eliteAim(e,type),angle=Math.atan2(predicted.y-e.y,predicted.x-e.x);
    e.turret+=clamp(angleDelta(e.turret,angle),-type.turnRate*dt,type.turnRate*dt);
    const ready=e.reload===0&&Math.abs(angleDelta(e.turret,angle))<.08&&lineOfSight(e)&&safeAIShot(e,type.shellSpeed)&&shells.filter(s=>s.owner===e&&s.life>0).length<type.shellLimit;
    e.charge=ready?e.charge+dt:0;
    if(e.charge>=type.chargeTime){
      e.burst={aim:e.turret,range:Math.hypot(predicted.x-e.x,predicted.y-e.y),index:0,timer:0};e.charge=0;
      updateEliteWeapon(0,e,type);
    }
  }
  function updateEnemy(dt, enemy = enemies[0]) {
    if (!enemy.alive) return;
    const type = Levels.aiTypes[enemy.type];
    if(type.elite){updateEliteWeapon(dt,enemy,type);return;}
    enemy.reload = Math.max(0, enemy.reload - dt);
    const target = Math.atan2(tank.y - enemy.y, tank.x - enemy.x);
    enemy.turret += clamp(angleDelta(enemy.turret, target), -type.turnRate * dt, type.turnRate * dt);
    const ready = enemy.reload === 0 && Math.abs(angleDelta(enemy.turret, target)) < .08 && lineOfSight(enemy) &&
      shells.filter(s => s.owner === enemy && s.life > 0).length < type.shellLimit && safeAIShot(enemy, type.shellSpeed);
    enemy.charge = ready ? enemy.charge + dt : 0;
    if (enemy.charge >= type.chargeTime) { emitShot(enemy, type.shellSpeed); enemy.reload = type.reload; enemy.charge = 0; }
  }
  function puff(x, y, big = false) {
    for (let i = 0; i < (big ? 34 : 10); i++) {
      const a = Math.random() * Math.PI * 2, speed = 12 + Math.random() * (big ? 100 : 38);
      smoke.push({ x, y, age: 0, life: (big ? .85 : .32) + Math.random() * .18,
        driftX: Math.cos(a) * speed, driftY: Math.sin(a) * speed, phase: Math.random() * Math.PI * 2,
        radius: big ? 7 : 3, growth: big ? 30 : 11, opacity: .4 });
    }
  }
  function bounce(s, contact) {
    if (s.bounces >= (s.maxBounces ?? 1)) { s.life = 0; puff(s.x, s.y); return; }
    reflectShot(s,contact);
    s.bounces++; sound(contact.shield ? 'shieldRicochet' : 'ricochet');
  }
  function trail(s, ox, oy, dt) {
    const distance = Math.hypot(s.x - ox, s.y - oy);
    if (!distance) return;
    for (let along = 3 - s.smokeDistance; along <= distance; along += 3) {
      const t = along / distance;
      smoke.push({ x: ox + (s.x - ox) * t, y: oy + (s.y - oy) * t, age: dt * (1 - t),
        life: s.rocket ? .4 : .24, driftX: (Math.random() - .5) * 16, driftY: (Math.random() - .5) * 16, phase: Math.random() * Math.PI * 2 });
    }
    s.exhaustTimer=(s.exhaustTimer||0)+dt;
    if(s.rocket&&s.exhaustTimer>=.03){
      s.exhaustTimer-=.03;
      const speed=Math.hypot(s.vx,s.vy),c=s.vx/speed,sn=s.vy/speed;
      embers.push({x:s.x-c*10,y:s.y-sn*10,vx:-c*25+(Math.random()-.5)*12,vy:-sn*25+(Math.random()-.5)*12,age:0,life:.16+Math.random()*.12});
    }
    s.smokeDistance = (s.smokeDistance + distance) % 3;
  }
  function hitTank(s, victim) {
    if(victim.shieldTime>0) return;
    s.life = 0; victim.alive = false; victim.vx = 0; victim.vy = 0; puff(victim.x, victim.y, true); sound('impact');
    bursts.push({ x: victim.x, y: victim.y, age: 0 });
  }
  function finishRound() {
    phase = tank.alive ? 'won' : 'lost'; shells = []; keys.clear(); stopEngine(); stopRocketAudio();
    document.getElementById('result-title').textContent = phase === 'won' ? 'Room cleared' : 'Tank destroyed';
    document.getElementById('result-detail').hidden = phase === 'won';
    document.getElementById('result-detail').textContent = phase === 'won' ? '' : 'One hit is all it takes. Try using the cover.';
    document.getElementById('play-again').textContent = phase === 'won' ? 'Play again' : 'Play again · R';
    result.hidden = false;
  }
  function updateEffects(dt) {
    for(const p of embers){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    embers=embers.filter(p=>p.age<p.life);
    for (const p of smoke) { p.age += dt; p.x += p.driftX * dt; p.y += p.driftY * dt; }
    smoke = smoke.filter(p => p.age < p.life);
    for (const b of bursts) b.age += dt;
    bursts = bursts.filter(b => b.age < .65);
  }
  function update(dt) {
    if (editing || !active) { stopEngine(); stopRocketAudio(); return; }
    updateEffects(dt);
    if (phase !== 'playing') { stopRocketAudio(); return; }
    cooldown = Math.max(0, cooldown - dt);
    clickCooldown = Math.max(0, clickCooldown - dt);
    const ox = tank.x, oy = tank.y;
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (dx || dy) {
      const n = Math.hypot(dx, dy); dx /= n; dy /= n;
      let target = Math.atan2(dy, dx);
      movePlayer(dx,dy,dt);
      faceTravel(tank,target,4.5,dt);
      tread += Math.hypot(tank.x - ox, tank.y - oy);
    } else tank.turnClearance=null;
    tank.vx=dt>0?(tank.x-ox)/dt:0;tank.vy=dt>0?(tank.y-oy)/dt:0;
    movementSound(Math.hypot(tank.x - ox, tank.y - oy) > .001, dt);
    updateAim(dt);
    if (keys.has(' ')) fire();
    for (const e of enemies) updateShield(dt,e);
    for (const e of enemies) updateMobileEnemy(dt, e);
    for (const e of enemies) updateEnemy(dt, e);
    const steps = Math.max(1, Math.ceil(dt * 240)), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      for (const s of shells) {
        if (s.life <= 0) continue;
        let remaining = step;
        // Split a step at wall contact so smoke never cuts across the reflected path.
        for (let segment = 0; segment < 3 && remaining > 1e-8 && s.life > 0; segment++) {
          const sx = s.x, sy = s.y, dx = s.vx * remaining, dy = s.vy * remaining;
          const contact = firstContact(s, dx, dy);
          const t = contact ? contact.t : 1;
          s.x += dx * t; s.y += dy * t; trail(s, sx, sy, remaining * t);
          remaining *= 1 - t;
          if (contact) bounce(s, contact); else break;
        }
        s.life -= step;
      }
      for (let a = 0; a < shells.length; a++) {
        const first = shells[a]; if (first.life <= 0) continue;
        for (let b = a + 1; b < shells.length; b++) {
          const second = shells[b]; if (second.life <= 0) continue;
          if (rectanglesOverlap(shellBox(first, true), shellBox(second, true))) {
            first.life = 0; second.life = 0; puff((first.x + second.x) / 2, (first.y + second.y) / 2); break;
          }
        }
      }
      for (const s of shells) if (s.life > 0) {
        for (const victim of [tank, ...enemies]) {
          if (victim.alive && rectanglesOverlap(shellBox(s), hullBox(victim))) { hitTank(s, victim); break; }
        }
      }
      if (!tank.alive || enemies.every(e => !e.alive)) { finishRound(); break; }
    }
    shells = shells.filter(s => s.life > 0);
    syncRocketAudio();
  }

  function drawHole(ctx, x, y, size) {
    const cx=x+size/2, cy=y+size/2, radius=size*.47;
    ctx.fillStyle='#a19c8d'; ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.fill();
    const shade=ctx.createRadialGradient(cx,cy+size*.12,size*.08,cx,cy,radius*.94);
    shade.addColorStop(0,'#b9b8ad'); shade.addColorStop(.75,'#c7c6ba'); shade.addColorStop(1,'#a3a396');
    ctx.fillStyle=shade; ctx.beginPath(); ctx.arc(cx,cy,radius*.92,0,Math.PI*2); ctx.fill();
  }
  function drawTank(t, isEnemy) {
    const palette = isEnemy ? Levels.aiTypes[t.type].palette : {
      tracks: '#244c7b', tread: '#6383a8', body: '#286ec9', front: '#4d93ec', barrel: '#225ba4', turret: '#3c83de', hatch: '#70a8f0'
    };
    if (!t.alive) {
      ctx.save(); ctx.translate(t.x, t.y);
      ctx.strokeStyle = isEnemy ? '#bd3d32' : '#286ec9'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-17, -17); ctx.lineTo(17, 17); ctx.moveTo(-17, 17); ctx.lineTo(17, -17); ctx.stroke();
      ctx.restore(); return;
    }
    if(t.shieldTime>0){
      ctx.save();ctx.globalAlpha=.7*Math.min(1,t.shieldTime/.6);
      ctx.fillStyle='rgba(55,155,255,.22)';ctx.strokeStyle='#479eff';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(t.x,t.y,48,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    }
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.hull); ctx.scale(scale, scale);
    for (const y of [-20, 12]) {
      ctx.fillStyle = palette.tracks; ctx.fillRect(-21, y, 42, 8);
      ctx.save(); ctx.beginPath(); ctx.rect(-21, y, 42, 8); ctx.clip(); ctx.fillStyle = palette.tread;
      for (let x = -26; x < 21; x += 7) ctx.fillRect(x + (isEnemy ? (t.tread || 0) % 7 : tread % 7), y + 1, 2, 6);
      ctx.restore();
    }
    ctx.fillStyle = palette.body; ctx.fillRect(-19, -14, 38, 28);
    ctx.fillStyle = palette.front; ctx.fillRect(5, -12, 11, 24); ctx.restore();
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.turret); ctx.scale(scale, scale);
    ctx.fillStyle = palette.barrel; ctx.fillRect(0, -4, 34, 8);
    ctx.fillStyle = palette.turret; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isEnemy && t.charge > 0 && (!Levels.aiTypes[t.type].elite || Math.floor(t.charge*12)%2===0) ? '#f0c37b' : palette.hatch;
    ctx.beginPath(); ctx.arc(-3, -3, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function render() {
    if (editing) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
    // Ground decals are always beneath walls, shells, and every living tank.
    if (!tank.alive) drawTank(tank, false);
    for (const e of enemies) if (!e.alive) drawTank(e, true);
    for (const w of walls) {
      if (w.type === 'hole') { drawHole(ctx, w.x, w.y, w.width); continue; }
      ctx.fillStyle = '#c8c7bc'; ctx.fillRect(w.x, w.y, w.width, w.height);
      ctx.fillStyle = '#e4e2d8'; ctx.fillRect(w.x, w.y, w.width, 5);
      ctx.fillStyle = '#9c9e92'; ctx.fillRect(w.x + w.width - 4, w.y + 5, 4, w.height - 5);
    }
    if (tank.alive && phase === 'playing') {
      ctx.strokeStyle = '#4386df'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2);
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(mouse.x + x * 13.5, mouse.y + y * 13.5); ctx.lineTo(mouse.x + x * 21, mouse.y + y * 21); } ctx.stroke();
    }
    for (const s of shells) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
      if(s.rocket){
        const rear=-bulletWidth/2,length=(18+Math.sin(s.life*83)*3+Math.sin(s.life*47)*2)*rocketFlameScale;
        ctx.fillStyle='#ed7b32';ctx.beginPath();ctx.moveTo(rear,-3.5*rocketFlameScale);ctx.lineTo(rear-length*.45,-2.5*rocketFlameScale);ctx.lineTo(rear-length,0);ctx.lineTo(rear-length*.5,2.5*rocketFlameScale);ctx.lineTo(rear,3.5*rocketFlameScale);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffd076';ctx.beginPath();ctx.moveTo(rear,-2.5*rocketFlameScale);ctx.lineTo(rear-length*.7,0);ctx.lineTo(rear,2.5*rocketFlameScale);ctx.closePath();ctx.fill();
        ctx.fillStyle='#fff3c2';ctx.beginPath();ctx.moveTo(rear,-1.3*rocketFlameScale);ctx.lineTo(rear-length*.35,0);ctx.lineTo(rear,1.3*rocketFlameScale);ctx.closePath();ctx.fill();
      }
      ctx.fillStyle = s.rocket ? '#217e79' : s.owner !== tank ? '#8c5539' : '#506174'; 
      const front=bulletWidth/2, rear=-front, halfHeight=bulletHeight/2;
      ctx.beginPath();ctx.moveTo(rear,-halfHeight);
      if(s.rocket){
        ctx.lineTo(front-bulletHeight*.8,-halfHeight);ctx.lineTo(front,0);ctx.lineTo(front-bulletHeight*.8,halfHeight);
      } else {
        ctx.lineTo(front-halfHeight,-halfHeight);
        ctx.arc(front-halfHeight,0,halfHeight,-Math.PI/2,Math.PI/2);
      }
      ctx.lineTo(rear,halfHeight);ctx.closePath();ctx.fill();ctx.restore();
    }
    for(const p of embers){const age=p.age/p.life;ctx.save();ctx.globalAlpha=(1-age)*.8;ctx.fillStyle=age<.5?'#ffc05a':'#da6b32';ctx.beginPath();ctx.arc(p.x,p.y,1.8*(1-age)+.4,0,Math.PI*2);ctx.fill();ctx.restore();}
    if (tank.alive) drawTank(tank, false); for (const e of enemies) if (e.alive) drawTank(e, true);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, world.width, world.height); ctx.clip();
    for (const p of smoke) {
      const age = p.age / p.life, radius = (p.radius || 2) + (p.growth || 9) * age;
      const x = p.x + Math.sin(p.phase + age * 3) * age * 2;
      const opacity = (p.opacity || .28) * Math.pow(1 - age, 1.25);
      const gradient = ctx.createRadialGradient(x, p.y, 0, x, p.y, radius);
      gradient.addColorStop(0, `rgba(125,130,137,${opacity})`); gradient.addColorStop(.5, `rgba(140,145,151,${opacity * .65})`); gradient.addColorStop(1, 'rgba(145,150,156,0)');
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    for (const b of bursts) {
      const progress = b.age / .65;
      ctx.save();
      if (b.age < .18) {
        const flash = 1 - b.age / .18, radius = 20 + b.age * 200;
        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
        glow.addColorStop(0, `rgba(255,247,208,${flash})`); glow.addColorStop(.4, `rgba(241,168,63,${flash*.75})`); glow.addColorStop(1, 'rgba(241,168,63,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(b.x, b.y, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = (1 - progress) ** 1.5; ctx.strokeStyle = '#da8c30'; ctx.lineWidth = 2.5;
      const ring = 12 + progress * 60;
      ctx.beginPath(); ctx.arc(b.x, b.y, ring, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8, near = 8 + progress * (50 + (i % 3) * 9), far = near + 17 * (1 - progress);
        ctx.beginPath(); ctx.moveTo(b.x + Math.cos(angle) * near, b.y + Math.sin(angle) * near);
        ctx.lineTo(b.x + Math.cos(angle) * far, b.y + Math.sin(angle) * far); ctx.stroke();
      }
      ctx.restore();
    }
    if(showCollisions){
      ctx.save();ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
      for(const t of [tank,...enemies])if(t.alive){const points=footprint(t);ctx.strokeStyle=t===tank?'#1767d6':'#b34044';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();}
      ctx.strokeStyle='#708056';for(const w of walls)ctx.strokeRect(w.x,w.y,w.width,w.height);ctx.restore();
    }
    ctx.restore();
    const message = phase === 'won' ? 'Room cleared' : phase === 'lost' ? 'Tank destroyed' :
      `${currentLevel.name} · ${active ? 'Playing' : 'Paused'} · ${enemies.filter(e => e.alive).length} AI remaining · ${shells.filter(s => s.owner === tank).length} / 5 shells`;
    if (message !== previousStatus) { status.textContent = message; previousStatus = message; }
  }
  function frame(time) { const dt = Math.min((time - last) / 1000 || 0, 1 / 30); last = time; update(dt); render(); requestAnimationFrame(frame); }
  window.TankGame = {
    getLevel: () => Levels.clone(currentLevel),
    setEditing(value) { editing = value; keys.clear(); active = !value && !document.hidden; stopEngine(); stopRocketAudio(); result.hidden = true; },
    loadLevel(input) { currentLevel = Levels.validate(input); editing = false; restart(); }
  };
  restart(); requestAnimationFrame(frame);
})();
