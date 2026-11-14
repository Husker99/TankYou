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
  const bulletWidth = 13.8 * 1.1 * 1.25 * 1.15, bulletHeight = 6.9 * 1.1 * 1.25 * 1.15 * 1.05;
  const rocketFlameScale = 2;
  const flameRange=600, flameHalfAngle=Math.asin(100/600);
  const flameExtensionTime=1.7/.85, flameHoldTime=.9;
  const bulletContactLength=bulletWidth*.9;
  const bulletPairHitScale = 1.12;
  const bulletHitHalfLength = bulletContactLength * 1.1 / 2;
  const bulletHitHalfWidth = bulletHeight * 1.1 / 2;
  const movementSpeed = 135, pushingSpeedRatio = .25;
  const walls = [];
  const keys = new Set();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const tank = {}, enemy = {};
  let enemies = [];
  let shells = [], smoke = [], bursts = [], embers = [], phase = 'playing';
  const mortarFlightTime=1.2/.8/.9,mortarBlastRadius=100*Math.sqrt(.9);
  let mortars=[];
  let deathSequence=null,hitImpacts=[];
  let mud=[],groundCanvas=null,groundMarks=[],muzzleFlashes=[];
  let mines=[], mineBlasts=[], mineCooldown=0, mineClock=0;
  const mineRadius=63*.8/2, mineArmDuration=2.1;
  let playerUpgrades={}, abilityState={}, waves=[], abilitySaveKey='', abilityHudKey='';
  let countdown = 0;
  let campaignCombat = null, playerHearts = 1, hitGrace = 0;
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
    explosion: ['audio/death-options/01-heavy-thump.wav', 6],
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
    audio.volume = name === 'explosion' ? .55 : name === 'shieldRicochet' ? .55 : name === 'rocketLaunch' ? .16 : name === 'shoot' ? .5 : .65;
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
    const muddy=moving&&inMud(tank);
    engine.playbackRate=muddy?.88:1;
    if(muddy)mineSound('mud');
    const target = moving && active && !muted ? (muddy?.085:.11) : 0;
    engineLevel += (target - engineLevel) * Math.min(1, dt * 14);
    engine.volume = engineLevel;
    if (!target && engineLevel < .002) stopEngine();
    else if (target && engine.paused) engine.play().catch(() => {});
  }
  function beginCountdown(){
    countdown=3;const overlay=document.getElementById('combat-countdown');overlay.hidden=false;overlay.textContent='3';if(!muted)window.TankUIAudio?.countdown();
  }
  function restart() {
    const loaded = Levels.compile(currentLevel);
    document.getElementById('game-header').hidden=!!campaignCombat&&!campaignCombat.testLoadout;
    playerUpgrades=campaignCombat?.upgrades||{};
    abilityState={disruptTime:0,shieldTime:0,shieldCooldown:0,stunCooldown:0,stunArmed:false,smartArmed:false,smartCooldown:0,dashTime:0,dashCooldown:0,swivelTime:0};
    mortars=[];deathSequence=null;hitImpacts=[];tank.hitFlash=0;
    groundCanvas=null;groundMarks=[];muzzleFlashes=[];tank.trackDistance=0;
    mines=[];mineBlasts=[];mineCooldown=0;mineClock=0;
    waves=[];abilitySaveKey='';abilityHudKey='';
    if(campaignCombat?.testLoadout)campaignCombat.hearts=campaignCombat.testStartingHearts;
    playerHearts = campaignCombat ? campaignCombat.hearts : 1; hitGrace = 0;
    document.getElementById('combat-hearts').hidden = !campaignCombat;
    Levels.renderHearts(document.getElementById('combat-hearts'),playerHearts,campaignCombat?.maxHearts||3);
    document.getElementById('campaign-result').hidden = true;
    document.getElementById('play-again').hidden = false;
    world.width = loaded.width; world.height = loaded.height;
    camera.x = world.width / 2; camera.y = world.height / 2;camera.zoom=loaded.zoom/100;
    canvas.width = world.width; canvas.height = world.height;
    canvas.style.aspectRatio = `${world.width} / ${world.height}`;
    walls.splice(0, walls.length, ...loaded.walls);mud=loaded.mud||[];
    Object.assign(tank, loaded.player, { shieldTime:abilityState.shieldTime,swivelTime:0,shieldRadius:48*(playerUpgrades.hero?Math.SQRT2:1),turnClearance: null, recoil:0, vx: 0, vy: 0 });
    Object.assign(enemy, loaded.enemies[0]);
    enemies = [enemy, ...loaded.enemies.slice(1).map(e => ({ ...e }))];
    let nextDupFamily=0;
    for (let i = 0; i < enemies.length; i++) {
      const openingDelay = Math.random();
      Object.assign(enemies[i], {dupFamily:Levels.aiTypes[enemies[i].type].duplicator?++nextDupFamily:null,dupAge:0,dupClock:0,dupAt:Levels.aiTypes[enemies[i].type].duplicator?Math.random()*8.5:0,dupDone:false,dupPending:false,dupRetry:0,dupCastTime:0,dupSpawnTime:0,dupOrigin:null, disruptTime:0,health:Levels.aiTypes[enemies[i].type].health||1,fireGrace:0,hitFlash:0, reload: openingDelay, openingDelay, firstShot:true, turret:Math.atan2(tank.y-enemies[i].y,tank.x-enemies[i].x), charge: 0 });
    }
    for (const e of enemies) Object.assign(e, { vx: 0, vy: 0, tread: 0, path: [], thinkTimer: 0, burstTimer: 1.3, resting: false,
      scanTimer: Levels.aiTypes[e.type].scanInterval ?? .2, reactionTimer: 0, pendingThreat: null, dodgeTime: 0, dodgeCooldown: 0, dodgeX: 0, dodgeY: 0, turnClearance: null, burst: null, lastTactic: null, shieldTime: 0, shieldCooldown: 0, offenseTime: 0, shieldIdle: 0, bankPlan: null, bankScanTimer: 0, stunTime:0,stunVisualAge:0,goldScan:0,goldDX:0,goldDY:0,goldEvading:false,intercepting:false,greyCharging:false,chargeClock:0,goldLeadNext:null,lastGoldShotLed:false,chargeStart:(Levels.aiTypes[e.type].chargeDuration>0)?Math.random()*(10-Levels.aiTypes[e.type].chargeDuration):0, recoil:0, flame: null, flameCooldown: Levels.aiTypes[e.type].flamethrower ? e.openingDelay : 0 });
    for (const e of enemies) if (Levels.aiTypes[e.type].mobile) {
      e.age = 0; e.routeSeed = Math.random() * 10000; e.preferredDistance = e.type==='grey'?220:Levels.aiTypes[e.type].mortar||Levels.aiTypes[e.type].sniper?440:300 + Math.random() * 80;
      e.routeDirections = [[0,-1],[1,0],[0,1],[-1,0]];
      for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [e.routeDirections[i],e.routeDirections[j]] = [e.routeDirections[j],e.routeDirections[i]]; }
      e.resting = true; e.burstTimer = .05 + Math.random() * .4;
    }
    shells = []; smoke = []; bursts = []; embers = []; keys.clear();
    cooldown = 0; clickCooldown = 0; tread = 0; phase = 'playing'; active = !document.hidden && !editing;
    mouse = { x: enemy.x, y: enemy.y };
    pointerTarget = { ...mouse }; aimTracking = false;
    result.hidden = true; document.getElementById('quick-play-result').hidden = true; stopEngine(); stopRocketAudio();
    for (const a of Object.values(pools).flat()) { a.pause(); a.currentTime = 0; }
    updateAbilityHud();
    beginCountdown();
  }
  document.getElementById('reset').onclick = () => { if (!campaignCombat||campaignCombat.testLoadout) restart(); };
  document.getElementById('play-again').onclick = () => { if (!campaignCombat||campaignCombat.testLoadout) restart(); };
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
    if(k===' '){e.preventDefault();if(!e.repeat)dropMine();return;}
    if(k==='shift'){e.preventDefault();if(!e.repeat)activateLithe();return;}
    if(k==='e'){e.preventDefault();if(!e.repeat)armSmartBullet();return;}
    if(k==='q'){e.preventDefault();if(!e.repeat)activatePlayerAbilities();return;}
    if (k === 'f2') { e.preventDefault(); if(!e.repeat)showCollisions=!showCollisions;return; }
    if (k === 'r' && !e.repeat) { e.preventDefault(); if (!campaignCombat||campaignCombat.testLoadout) restart(); return; }
    if (k === ' ' && e.target.closest?.('button')) return;
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape'].includes(k)) return;
    e.preventDefault();
    if (k === 'escape') { if (!e.repeat) active = !active; keys.clear(); stopEngine(); stopRocketAudio(); return; }
    active = true; keys.add(k);

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
  const shellLengthScale=s=>(s.sniper?1.4:1)*(s.lengthScale||1);
  const shellWidthScale=s=>s.widthScale||1;
  const shellBox = (s, againstBullet = false) => ({ x: s.x, y: s.y, angle: Math.atan2(s.vy, s.vx),
    hx: bulletContactLength * shellLengthScale(s) / 2 * (againstBullet ? bulletPairHitScale : 1),
    hy: bulletHeight * shellWidthScale(s) / 2 * (againstBullet ? bulletPairHitScale : 1) });
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
  function inMud(actor){return mud.some(m=>actor.x>=m.x&&actor.x<m.x+m.width&&actor.y>=m.y&&actor.y<m.y+m.height);}
  function moveTankStep(actor,dx,dy,push=false) {
    if(inMud(actor)){dx*=.65;dy*=.65;}
    let point=resolveWorld(actor,actor.x+dx,actor.y+dy);
    const moves=new Map();
    for(const other of otherTanks(actor)) {
      const hit=tankContact(actor,other,point.x,point.y);if(!hit)continue;
      const proposed={...other,x:other.x-hit.x,y:other.y-hit.y};
      const free=push&&!(other.stunTime>0)&&canOccupy(proposed.x,proposed.y,other)&&
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
    const speed=playerMovementSpeed(),steps=Math.max(1,Math.ceil(speed*dt/2)),distance=speed*dt/steps;
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
  function mountWall(actor,w){return actor?.mounted&&Math.abs(actor.x-(w.x+w.width/2))<1&&Math.abs(actor.y-(w.y+w.height/2))<1;}
  function combatEnemies(){return enemies.filter(e=>!e.mounted);}
  function firstContact(s, dx, dy) {
    const speed = Math.hypot(s.vx, s.vy), halfLength=bulletHitHalfLength*shellLengthScale(s),halfWidth=bulletHitHalfWidth*shellWidthScale(s);
    const ex = Math.abs(s.vx / speed) * halfLength + Math.abs(s.vy / speed) * halfWidth;
    const ey = Math.abs(s.vy / speed) * halfLength + Math.abs(s.vx / speed) * halfWidth;
    let best = null;
    function consider(hit) { if (hit && hit.t >= 0 && hit.t <= 1 && (!best || hit.t < best.t)) best = hit; }
    if (dx < 0) consider({ t: (ex - s.x) / dx, nx: 1, ny: 0 });
    if (dx > 0) consider({ t: (world.width - ex - s.x) / dx, nx: -1, ny: 0 });
    if (dy < 0) consider({ t: (ey - s.y) / dy, nx: 0, ny: 1 });
    if (dy > 0) consider({ t: (world.height - ey - s.y) / dy, nx: 0, ny: -1 });
    for (const w of walls) if (w.type !== 'hole'&&!(mountWall(s.owner,w)&&s.x>=w.x-ex&&s.x<=w.x+w.width+ex&&s.y>=w.y-ey&&s.y<=w.y+w.height+ey)) consider(segmentBox(s.x, s.y, dx, dy, { x: w.x - ex, y: w.y - ey, width: w.width + ex * 2, height: w.height + ey * 2 }));
    for (const e of [tank,...enemies]) if (e.alive && (e.shieldTime > 0 || (e===tank&&e.swivelTime>0))) {
      const hit = shieldContact(s, dx, dy, e);
      if (hit) consider(hit);
    }
    return best;
  }
  function shieldContact(s, dx, dy, e) {
    const rx=s.x-e.x, ry=s.y-e.y, radius=(e===tank&&!(e.shieldTime>0)?48:(e.shieldRadius||48))+bulletHitHalfLength*shellLengthScale(s);
    const a=dx*dx+dy*dy, dot=rx*dx+ry*dy, c=rx*rx+ry*ry-radius*radius;
    // Outgoing shots, including the protected tank's own shots, leave freely.
    if (!a || dot>=0) return null;
    const discriminant=dot*dot-a*c;
    if(discriminant<0) return null;
    const t=c<=0?0:(-dot-Math.sqrt(discriminant))/a;
    if(t<0||t>1) return null;
    const x=rx+dx*t,y=ry+dy*t,n=Math.hypot(x,y)||1;
    const partial=e===tank&&!(e.shieldTime>0);
    if(partial&&Math.abs(angleDelta(tank.turret,Math.atan2(y,x)))>Math.PI/2+1e-8)return null;
    return {t,nx:x/n,ny:y/n,shield:e,partial};
  }
  function reflectShot(s,contact) {
    if(contact.shield){const dot=s.vx*contact.nx+s.vy*contact.ny;s.vx-=2*dot*contact.nx;s.vy-=2*dot*contact.ny;}
    else {if(contact.nx)s.vx*=-1;if(contact.ny)s.vy*=-1;}
    s.x+=contact.nx*.02;s.y+=contact.ny*.02;
  }
  function lineOfSight(enemy = enemies[0]) {
    return !walls.some(w => w.type !== 'hole' && !mountWall(enemy,w) && segmentBox(enemy.x, enemy.y, tank.x - enemy.x, tank.y - enemy.y,
      { x: w.x - 8, y: w.y - 8, width: w.width + 16, height: w.height + 16 }));
  }
  // Sweep the full shell footprint against a tank's rotated hull, including
  // a small ally safety margin and any known movement during shell travel.
  function shotTankContact(s, dx, dy, victim, elapsed, duration, padding = 0) {
    const c = Math.cos(victim.hull), sn = Math.sin(victim.hull);
    const vx = victim.vx || 0, vy = victim.vy || 0;
    const rx = s.x - victim.x - vx * elapsed, ry = s.y - victim.y - vy * elapsed;
    const x = rx * c + ry * sn, y = -rx * sn + ry * c;
    const relativeAngle = Math.atan2(s.vy, s.vx) - victim.hull,contactLength=bulletContactLength*shellLengthScale(s),contactWidth=bulletHeight*shellWidthScale(s);
    const hx = 21 * scale + Math.abs(Math.cos(relativeAngle)) * contactLength / 2 + Math.abs(Math.sin(relativeAngle)) * contactWidth / 2 + padding;
    const hy = 20 * scale + Math.abs(Math.sin(relativeAngle)) * contactLength / 2 + Math.abs(Math.cos(relativeAngle)) * contactWidth / 2 + padding;
    if (Math.abs(x) <= hx && Math.abs(y) <= hy) return 0;
    const mx = dx - vx * duration, my = dy - vy * duration;
    return segmentBox(x, y, mx * c + my * sn, -mx * sn + my * c,
      { x: -hx, y: -hy, width: hx * 2, height: hy * 2 })?.t ?? null;
  }
  function safeAIShot(shooter, speed, angle = shooter.turret) {
    const allies = enemies.filter(e => e !== shooter && e.alive&&!e.mounted);
    if (!allies.length) return true;
    const s = { owner:shooter,x: shooter.x, y: shooter.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
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
      if(contact.shield===tank&&(contact.partial||!playerUpgrades.favored))return true;
      if (contact.shield && contact.shield !== tank && contact.shield !== shooter) return false;
      s.x += dx; s.y += dy;
      elapsed += duration; remaining -= duration;
      reflectShot(s,contact);
    }
    return true;
  }
  // A bank candidate must hit one real wall, then reach the target before
  // another obstacle. Use the same expanded-wall geometry as live projectiles.
  function traceBankShot(e,angle,target,requireHit=true,range=0) {
    const speed=Levels.aiTypes[e.type].shellSpeed;
    const shot={x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed};
    const first=firstContact(shot,shot.vx*8,shot.vy*8);
    if(!first||first.shield) return null;
    const duration=8*first.t;
    if(shotTankContact(shot,shot.vx*duration,shot.vy*duration,target,0,duration)!==null)return null;
    shot.x+=shot.vx*duration;shot.y+=shot.vy*duration;reflectShot(shot,first);
    const remaining=8-duration;if(remaining<=0)return null;
    const second=firstContact(shot,shot.vx*remaining,shot.vy*remaining);
    const legTime=remaining*(second?second.t:1);
    const hit=shotTankContact(shot,shot.vx*legTime,shot.vy*legTime,target,0,legTime);
    if(requireHit&&hit===null)return null;
    if(!requireHit&&speed*(duration+legTime)<range-2)return null;
    return {angle,bank:true,range:requireHit?speed*(duration+legTime*hit):range};
  }
  function findBankShot(e,target) {
    const type=Levels.aiTypes[e.type];
    if(!['sentry','elite','red','pink','gold','grey','duplicator'].includes(e.type)||(type.maxBounces??1)<1)return null;
    const faces=[{axis:'x',value:0},{axis:'x',value:world.width},{axis:'y',value:0},{axis:'y',value:world.height}];
    for(const w of walls)if(w.type!=='hole')faces.push({axis:'x',value:w.x},{axis:'x',value:w.x+w.width},{axis:'y',value:w.y},{axis:'y',value:w.y+w.height});
    let best=null;
    for(const face of faces){
      // Reflect the target across the face. Correct the face for the rotated
      // shell's thickness before testing the candidate against the whole room.
      let angle=Math.atan2(target.y-e.y,target.x-e.x);
      for(let i=0;i<5;i++){
        const ex=Math.abs(Math.cos(angle))*bulletHitHalfLength+Math.abs(Math.sin(angle))*bulletHitHalfWidth;
        const ey=Math.abs(Math.sin(angle))*bulletHitHalfLength+Math.abs(Math.cos(angle))*bulletHitHalfWidth;
        const offset=face.axis==='x'?ex:ey;
        const plane=face.value+Math.sign(e[face.axis]-face.value)*offset;
        angle=Math.atan2((face.axis==='y'?2*plane-target.y:target.y)-e.y,(face.axis==='x'?2*plane-target.x:target.x)-e.x);
      }
      const plan=traceBankShot(e,angle,target);
      if(plan&&(!best||plan.range<best.range)&&safeAIShot(e,type.shellSpeed,angle))best=plan;
    }
    return best;
  }
  function enemyShotPlan(e,dt) {
    const type=Levels.aiTypes[e.type],point=type.elite?eliteAim(e,type):tank;
    const target={...tank,x:point.x,y:point.y,vx:0,vy:0};
    if(lineOfSight(e))return {angle:Math.atan2(point.y-e.y,point.x-e.x),range:Math.hypot(point.x-e.x,point.y-e.y),bank:false,target};
    if(!['sentry','elite','red','pink','gold','grey','duplicator'].includes(e.type))return null;
    e.bankScanTimer=(e.bankScanTimer||0)-dt;
    if(e.bankScanTimer<=0){e.bankPlan=findBankShot(e,target);e.bankScanTimer=.2;}
    const plan=e.bankPlan&&traceBankShot(e,e.bankPlan.angle,target);
    return plan?{...plan,target}:null;
  }
  function emitShot(owner, speed, angle = owner.turret) {
    const a = angle;owner.recoil=.11;
    const weapon = owner === tank ? null : Levels.aiTypes[owner.type];
    const s = { x: owner.x, y: owner.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      owner, bounces: 0, maxBounces: weapon?.maxBounces ?? 1, sniper:!!weapon?.sniper, disruptor:!!weapon?.disruptor, rocket: !!weapon?.rocket, life: 8, smokeDistance: 0 };
    if(owner===tank){
      s.lengthScale=playerUpgrades.heavy?1.2:1;s.widthScale=playerUpgrades.heavy?1.5:1;
      if(abilityState.smartArmed){s.smart=true;s.bulletShield=1;s.maxBounces=0;s.smartDistance=0;s.trackingScale=2**(playerUpgrades.tracking||0);s.smartTarget=smartTarget(s);abilityState.smartArmed=false;abilityState.smartCooldown=3;publishAbilities(true);}
    }
    // Keep the enlarged hitbox clear of its firing tank at every turret angle.
    const hullExtent = Math.abs(Math.cos(a - owner.hull)) * 21 * scale + Math.abs(Math.sin(a - owner.hull)) * 20 * scale;
    const muzzleDistance = Math.max(owner.mounted?84:51, hullExtent + bulletHitHalfLength*shellLengthScale(s) + .5);
    const dx = Math.cos(a) * muzzleDistance, dy = Math.sin(a) * muzzleDistance;
    const contact = firstContact(s, dx, dy);
    s.x += dx * (contact ? contact.t : 1); s.y += dy * (contact ? contact.t : 1);
    if (contact) bounce(s, contact);
    if(owner===tank)s.playerRocketStacks=playerUpgrades.rockets||0;
    muzzleFlashes.push({x:owner.x+dx,y:owner.y+dy,angle:a,age:0,sniper:s.sniper});
    shells.push(s);if(s.sniper)mineSound('sniper');else if(s.disruptor)mineSound('disrupt');else sound(s.rocket ? 'rocketLaunch' : 'shoot');
  }
  function fire(trigger = 'held') {
    if (countdown > 0 || editing || !active || phase !== 'playing' || !tank.alive || (trigger === 'click' ? clickCooldown > 0 : cooldown > 0) || playerShotCount() >= playerAmmoLimit()) return;
    if(abilityState.stunArmed){tank.recoil=.11;waves.push({owner:tank,hostile:false,x:tank.x,y:tank.y,angle:tank.turret,distance:0,life:1,hits:new Set()});abilityState.stunArmed=false;sound('rocketLaunch');publishAbilities(true);}else emitShot(tank, playerBulletSpeed()); cooldown = .22*playerReloadScale(); clickCooldown = .11*playerReloadScale();
  }
  function cancelBulletPair(first,second){
    const firstProtected=first.bulletShield>0,secondProtected=second.bulletShield>0;
    for(const [s,protectedShot] of [[first,firstProtected],[second,secondProtected]]){
      if(protectedShot)s.bulletShield--;else s.life=0;
    }
    if(firstProtected||secondProtected)sound('shieldRicochet');
    puff((first.x+second.x)/2,(first.y+second.y)/2);
    // Two protected rounds may overlap for several simulation steps. Treat
    // that overlap as one contact until they have separated.
    if(first.life>0&&second.life>0){(first.shieldContacts||=new Set()).add(second);(second.shieldContacts||=new Set()).add(first);}
  }
  function playerAmmoLimit(){return playerUpgrades.ammo?7:5;}
  function playerReloadScale(){return .7**(playerUpgrades.reload||0);}
  function armSmartBullet(){
    if(!playerUpgrades.smart||!campaignCombat||abilityState.disruptTime>0||editing||!active||countdown>0||phase!=='playing'||!tank.alive||abilityState.smartCooldown>0)return;
    abilityState.smartArmed=true;abilityState.stunArmed=false;publishAbilities(true);
  }
  function smartTarget(s){
    const angle=Math.atan2(s.vy,s.vx),cone=Math.atan(1/6)*1.5*s.trackingScale;let target=null,best=Infinity;
    for(const e of enemies){const dx=e.x-s.x,dy=e.y-s.y,distance=Math.hypot(dx,dy);
      if(e.alive&&!e.mounted&&distance<=600&&Math.abs(angleDelta(angle,Math.atan2(dy,dx)))<=cone&&!walls.some(w=>w.type!=='hole'&&segmentBox(s.x,s.y,dx,dy,w))&&distance<best){target=e;best=distance;}
    }return target;
  }
  function steerSmartBullet(s,dt){
    if(!s.smart||s.life<=0)return;
    const speed=Math.hypot(s.vx,s.vy),distance=Math.min(speed*dt,Math.max(0,600-s.smartDistance));
    if(distance>0&&s.smartTarget?.alive){
      const angle=Math.atan2(s.vy,s.vx),desired=Math.atan2(s.smartTarget.y-s.y,s.smartTarget.x-s.x),turn=2*Math.atan(1/6)/600*1.5*s.trackingScale*distance;
      const next=angle+clamp(angleDelta(angle,desired),-turn,turn);s.vx=Math.cos(next)*speed;s.vy=Math.sin(next)*speed;
    }
    s.smartDistance+=speed*dt;
  }
  function playerMovementSpeed(){return movementSpeed*(1+.1*(playerUpgrades.forged||0))*(abilityState.dashTime>0?2.5:1);}
  function playerBulletSpeed(){return 380*(1+.2*(playerUpgrades.rockets||0))*(abilityState.dashTime>0&&playerUpgrades.executor?1.2:1);}
  function activateLithe(){
    if(!playerUpgrades.lithe||abilityState.disruptTime>0||!campaignCombat||editing||!active||countdown>0||phase!=='playing'||!tank.alive||abilityState.dashTime>0||abilityState.dashCooldown>0)return;
    abilityState.dashTime=1;if(playerUpgrades.swivel){abilityState.swivelTime=2.1;tank.swivelTime=2.1;}publishAbilities(true);
  }
  function playerShotCount(){return shells.filter(s=>s.owner===tank&&s.life>0).length+waves.filter(w=>w.life>0&&!w.hostile).length;}
  function publishAbilities(force=false){
    if(!campaignCombat){updateAbilityHud();return;}
    const key=[Math.ceil(abilityState.shieldTime),Math.ceil(abilityState.shieldCooldown),Math.ceil(abilityState.stunCooldown),abilityState.stunArmed,abilityState.smartArmed,Math.ceil(abilityState.smartCooldown),Math.ceil(abilityState.dashTime),Math.ceil(abilityState.dashCooldown),Math.ceil(abilityState.swivelTime)].join(':');
    if(force||key!==abilitySaveKey){abilitySaveKey=key;campaignCombat.abilityState={...abilityState};campaignCombat.onAbilityChange?.({...abilityState});}
    updateAbilityHud();
  }
  function activatePlayerAbilities(){
    if(!campaignCombat||abilityState.disruptTime>0||editing||!active||countdown>0||phase!=='playing'||!tank.alive)return;
    if(playerUpgrades.blessing&&abilityState.shieldTime<=0&&abilityState.shieldCooldown<=0){abilityState.shieldTime=playerUpgrades.favored?4:2.5;tank.shieldTime=abilityState.shieldTime;}
    if(playerUpgrades.stun&&!abilityState.stunArmed&&abilityState.stunCooldown<=0){abilityState.stunArmed=true;abilityState.smartArmed=false;abilityState.stunCooldown=6;}
    publishAbilities(true);
  }
  function updateAbilityHud(){
    const disruption=document.getElementById('disruption-status');disruption.hidden=!(abilityState.disruptTime>0);const jamText='Abilities jammed · '+Math.ceil(abilityState.disruptTime||0)+'s';if(disruption.textContent!==jamText)disruption.textContent=jamText;
    const hud=document.getElementById('ability-hud'),enabled=!!campaignCombat&&!!(playerUpgrades.blessing||playerUpgrades.stun||playerUpgrades.lithe||playerUpgrades.typhon||playerUpgrades.smart);
    hud.hidden=!enabled;document.getElementById('arena-wrap').classList?.toggle('has-abilities',enabled);
    if(!enabled){hud.innerHTML='';return;}
    const cards=[];
    function card(name,time,total,active,armed,path,key='Q',armedLabel='ARMED'){const ready=time<=0;const progress=active?time/total:1-time/total;
      cards.push(`<div class="ability-card ${active?'active':armed?'armed':''}" role="img" aria-label="${name}: ${armed?armedLabel:active?'active':ready?'ready':Math.ceil(time)+' seconds remaining'}"><div class="ability-dial" style="--progress:${Math.round(clamp(progress,0,1)*360)}deg"><svg viewBox="0 0 32 32" aria-hidden="true">${path}</svg></div><div>${armed?armedLabel:active?Math.ceil(time)+'s':ready?'READY':Math.ceil(time)+'s'}</div><div>${key} · ${name}</div></div>`);}
    if(playerUpgrades.blessing)card('Shield',abilityState.shieldTime||abilityState.shieldCooldown,abilityState.shieldTime?(playerUpgrades.favored?4:2.5):13,abilityState.shieldTime>0,false,'<path d="M16 2 29 7v9c0 7-7 12-13 15C10 28 3 23 3 16V7Z"/>');
    if(playerUpgrades.stun)card('Stun',abilityState.stunCooldown,6,false,abilityState.stunArmed,'<path d="M18 1 4 18h10l-2 13 16-19H18Z"/>');
    if(playerUpgrades.smart)card('Smart Bullet',abilityState.smartCooldown,3,false,abilityState.smartArmed,'<path d="M4 25Q4 8 23 8l-6-5m6 5-6 5" fill="none" stroke="currentColor" stroke-width="3"/>','E');
    if(playerUpgrades.lithe)card('Dash',abilityState.dashTime||abilityState.dashCooldown,abilityState.dashTime?1:6,abilityState.dashTime>0,false,'<path d="M2 11h28v13H2Z"/><path d="m9 2 7 7 7-7" fill="none" stroke="currentColor" stroke-width="3"/>','SHIFT');
    if(playerUpgrades.typhon)card('Mines',mineCooldown,playerUpgrades.fires?1.5:3,false,mines.length>=mineCapacity(),'<circle cx="16" cy="18" r="10"/><path d="M16 1v6M2 8l5 5m23-5-5 5" stroke="currentColor" stroke-width="3"/>','SPACE',mines.length+'/'+mineCapacity()+' DEPLOYED');
    const html=cards.join('');if(html!==abilityHudKey){abilityHudKey=html;hud.innerHTML=html;}
  }
  function applyShieldContact(){
    if(!tank.alive||!playerUpgrades.hero||!(tank.shieldTime>0))return;
    for(const e of enemies)if(e.alive){const box=hullBox(e),c=Math.cos(e.hull),sn=Math.sin(e.hull),dx=tank.x-e.x,dy=tank.y-e.y,x=dx*c+dy*sn,y=-dx*sn+dy*c;
      if(Math.hypot(x-clamp(x,-box.hx,box.hx),y-clamp(y,-box.hy,box.hy))<=tank.shieldRadius)hitTank({life:1},e);
    }
  }
  function updatePlayerAbilities(dt){
    abilityState.disruptTime=Math.max(0,(abilityState.disruptTime||0)-dt);
    if(campaignCombat){
      if(abilityState.shieldTime>0){const remaining=abilityState.shieldTime-dt;abilityState.shieldTime=Math.max(0,remaining);if(remaining<=0)abilityState.shieldCooldown=Math.max(0,13+remaining);}
      else abilityState.shieldCooldown=Math.max(0,abilityState.shieldCooldown-dt);
      if(abilityState.dashTime>0){const remaining=abilityState.dashTime-dt;abilityState.dashTime=Math.max(0,remaining);if(remaining<=0)abilityState.dashCooldown=Math.max(0,6+remaining);}
      else abilityState.dashCooldown=Math.max(0,abilityState.dashCooldown-dt);
      abilityState.swivelTime=Math.max(0,abilityState.swivelTime-dt);tank.swivelTime=abilityState.swivelTime;
      abilityState.smartCooldown=Math.max(0,(abilityState.smartCooldown||0)-dt);abilityState.stunCooldown=Math.max(0,abilityState.stunCooldown-dt);tank.shieldTime=abilityState.shieldTime;
    }
    for(const e of enemies){e.disruptTime=Math.max(0,(e.disruptTime||0)-dt);e.fireGrace=Math.max(0,(e.fireGrace||0)-dt);e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.stunTime=Math.max(0,(e.stunTime||0)-dt);if(e.stunTime>0)e.stunVisualAge=(e.stunVisualAge||0)+dt;}
    for(const wave of waves)if(wave.life>0){
      wave.distance=Math.min(flameRange,wave.distance+Levels.aiTypes.teal.shellSpeed*(wave.hostile?.6:1)*dt);
      const emitter={x:wave.x,y:wave.y,flame:{angle:wave.angle,age:1.7}};
      const origin=flameOrigin(emitter);
      if(wave.hostile){
        if(tank.alive&&!wave.hits.has(tank)&&Math.hypot(tank.x-origin.x,tank.y-origin.y)>=wave.distance-90&&flameTouches(emitter,hullBox(tank),wave.distance)){
          wave.hits.add(tank);hitTank({life:1,disruptor:true,sourceX:origin.x,sourceY:origin.y},tank);
        }
      }else for(const e of enemies)if(e.alive&&!e.mounted&&!wave.hits.has(e)&&Math.hypot(e.x-origin.x,e.y-origin.y)>=wave.distance-90&&flameTouches(emitter,hullBox(e),wave.distance)){
        wave.hits.add(e);e.stunTime=playerUpgrades.grasp?4:1;e.vx=0;e.vy=0;e.stunVisualAge=0;e.pendingThreat=null;
      }
      if(wave.distance>=flameRange)wave.life=0;
    }
    waves=waves.filter(w=>w.life>0);publishAbilities();
  }
  function drawEnergyWaves(){
    for(const w of waves){const origin={x:w.x+Math.cos(w.angle)*51,y:w.y+Math.sin(w.angle)*51};ctx.save();ctx.strokeStyle=w.hostile?'#c18af0':'#7bdfff';ctx.fillStyle=w.hostile?'rgba(170,87,222,.26)':'rgba(92,178,255,.24)';ctx.lineWidth=4;ctx.shadowColor=w.hostile?'#a86be3':'#65bcff';ctx.shadowBlur=12;ctx.beginPath();
      for(let i=0;i<=40;i++){const a=w.angle-flameHalfAngle+flameHalfAngle*2*i/40,d=flameDistance(origin,a,w.distance);const x=origin.x+Math.cos(a)*d,y=origin.y+Math.sin(a)*d;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
      ctx.stroke();for(let i=40;i>=0;i--){const a=w.angle-flameHalfAngle+flameHalfAngle*2*i/40,d=flameDistance(origin,a,Math.max(.01,w.distance-35));ctx.lineTo(origin.x+Math.cos(a)*d,origin.y+Math.sin(a)*d);}ctx.closePath();ctx.fill();ctx.restore();
    }
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
  function allyCrowding(e,x,y){
    let cost=0;
    for(const ally of enemies)if(ally!==e&&ally.alive){
      const distance=Math.hypot(x-ally.x,y-ally.y);if(distance>=125)continue;
      if(walls.some(w=>segmentBox(x,y,ally.x-x,ally.y-y,w)))continue;
      cost+=clamp((125-distance)/65,0,1)**2;
    }return Math.min(cost,2.5);
  }
  function spacedDirection(e,dx,dy,speed){
    if(!(dx||dy)||e.dodgeTime>0||e.goldEvading||e.flame||e.type==='gold'&&e.greyCharging)return {dx,dy};
    let sx=0,sy=0;
    for(const ally of enemies)if(ally!==e&&ally.alive){
      const x=e.x-ally.x,y=e.y-ally.y,d=Math.hypot(x,y);if(d<1||d>=125||walls.some(w=>segmentBox(e.x,e.y,-x,-y,w)))continue;
      const weight=clamp((125-d)/65,0,1);sx+=x/d*weight;sy+=y/d*weight;
    }
    const length=Math.hypot(sx,sy);if(length<.01)return {dx,dy};
    const weight=.28/Math.max(1,length),bx=dx+sx*weight,by=dy+sy*weight,n=Math.hypot(bx,by);if(!n)return {dx,dy};
    const nx=bx/n,ny=by/n,look=speed*.25,x=e.x+nx*look,y=e.y+ny*look;
    // Only accept spacing that improves room, remains traversable, and does not
    // introduce a worse bullet threat. Otherwise retain the original route.
    if(nx*dx+ny*dy<.85||!canEnemyOccupy(e,x,y)||!clearMovement(e.x,e.y,x,y,e)||!safeBulletMovement(e,nx*speed,ny*speed)||allyCrowding(e,x,y)>=allyCrowding(e,e.x+dx*look,e.y+dy*look)-.001)return {dx,dy};
    return {dx:nx,dy:ny};
  }
  function wantsCover(e) {
    if(e.offenseTime>0||e.type==='grey') return false;
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
      if (node.depth > 0 && distance >= (e.greyCharging?65:e.type==='grey'?170:elite?230:170) && canEnemyOccupy(e, x, y)) {
        const visible = !walls.some(w => w.type !== 'hole' && segmentBox(x, y, tank.x - x, tank.y - y,
          { x: w.x - 8, y: w.y - 8, width: w.width + 16, height: w.height + 16 }));
        const hash = Math.sin(node.column * 127.1 + node.row * 311.7 + (e.routeSeed || 0)) * 43758.5453;
        const bias = (hash - Math.floor(hash)) * 2 - 1;
        const variation = 12 + 58 * Math.max(0, 1 - (e.age || 0) / 3);
        const score = e.type==='gold'&&e.greyCharging ? -distance*8-node.depth*3 : (e.greyCharging?-distance*4:e.offenseTime>0 ? (visible?650:0)-distance*.5 : 0) + (hide ? (!visible?600:0) : visible?(elite?400:300):0) - Math.abs(distance - (e.preferredDistance || 340)) * .5 - node.depth * 14 + bias * variation - allyCrowding(e,x,y)*65;
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
    // Snipers anticipate their own movement and the next ricochet, rather than
    // waiting until a shell is pointing straight at their current position.
    if(Levels.aiTypes[e.type].sniper){
      let nearest=null,soonest=Infinity;
      for(const shot of shells){
        if(shot.life<=0||Math.hypot(shot.x-e.x,shot.y-e.y)>Levels.aiTypes[e.type].awareness)continue;
        for(const leg of bulletForecast(shot,.85)){
          const hit=shotTankContact(leg,leg.vx*leg.duration,leg.vy*leg.duration,{...e,vx:e.vx||0,vy:e.vy||0},leg.start,leg.duration,4);
          if(hit!==null&&leg.start+hit*leg.duration<soonest){soonest=leg.start+hit*leg.duration;nearest=shot;}
        }
      }
      return nearest;
    }
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
        if(!contact||(contact.shield===tank&&(contact.partial||!playerUpgrades.favored))||(s.bounces||0)>=(s.maxBounces??1)) break;
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
    if(e.shieldCooldown>0||e.stunTime>0||e.disruptTime>0) return;
    if(shieldThreat(e)) activateShield(e);
    else if(e.shieldIdle>=6) activateShield(e,true);
  }
  function movementThreatTime(e,vx,vy,horizon=.55){
    let soonest=Infinity;
    for(const original of shells){
      if(original.life<=0)continue;
      if(Math.hypot(original.x-e.x,original.y-e.y)>(Math.hypot(original.vx,original.vy)+Math.hypot(vx,vy))*horizon+tankRadius+bulletHitHalfLength+6)continue;
      const s={...original};let remaining=Math.min(horizon,s.life),elapsed=0;
      for(let leg=0;leg<3&&remaining>1e-8;leg++){
        const contact=firstContact(s,s.vx*remaining,s.vy*remaining),duration=remaining*(contact?contact.t:1);
        const hit=shotTankContact(s,s.vx*duration,s.vy*duration,{...e,vx,vy},elapsed,duration,3);
        if(hit!==null){soonest=Math.min(soonest,elapsed+hit*duration);break;}
        if(!contact||(contact.shield===tank&&(contact.partial||!playerUpgrades.favored))||(s.bounces||0)>=(s.maxBounces??1))break;
        s.x+=s.vx*duration;s.y+=s.vy*duration;reflectShot(s,contact);s.bounces=(s.bounces||0)+1;elapsed+=duration;remaining-=duration;
      }
    }
    return soonest;
  }
  function safeBulletMovement(e,vx,vy){
    if(e.shieldTime>0)return true;
    const moving=movementThreatTime(e,vx,vy);
    return moving===Infinity||moving>=movementThreatTime(e,0,0)-.02;
  }
  function beginDodge(e, shot) {
    const speed = Math.hypot(shot.vx, shot.vy), side = Math.random() < .5 ? 1 : -1;
    let best=null;
    const candidates=[];
    for(const sign of [side,-side])for(const offset of (Levels.aiTypes[e.type].sniper?[0,-Math.PI/4,Math.PI/4]:[0])){
      const angle=Math.atan2(shot.vy,shot.vx)+sign*Math.PI/2+offset;
      candidates.push({dx:Math.cos(angle),dy:Math.sin(angle)});
    }
    for (const {dx,dy} of candidates) {
      const x = e.x + dx * 43, y = e.y + dy * 43;
      if (canEnemyOccupy(e, x, y) && clearMovement(e.x, e.y, x, y, e) && safeBulletMovement(e,dx*95,dy*95)) {
        const safety=movementThreatTime(e,dx*95,dy*95,Levels.aiTypes[e.type].sniper?.85:.55),crowding=allyCrowding(e,x,y);if(!best||safety>best.safety||safety===best.safety&&crowding<best.crowding)best={dx,dy,safety,crowding};
      }
    }
    if(best){e.dodgeX=best.dx;e.dodgeY=best.dy;e.dodgeTime=.45;e.path=[];e.thinkTimer=0;return true;}
    return false;
  }
  function bulletForecast(original,horizon=1.1){
    const legs=[],s={...original};let elapsed=0,remaining=Math.min(horizon,s.life);
    for(let leg=0;leg<3&&remaining>1e-8;leg++){
      const contact=firstContact(s,s.vx*remaining,s.vy*remaining),duration=remaining*(contact?contact.t:1);
      legs.push({...s,start:elapsed,duration,shot:original});
      if(!contact||(contact.shield===tank&&(contact.partial||!playerUpgrades.favored))||(s.bounces||0)>=(s.maxBounces??1))break;
      s.x+=s.vx*duration;s.y+=s.vy*duration;reflectShot(s,contact);s.bounces=(s.bounces||0)+1;elapsed+=duration;remaining-=duration;
    }return legs;
  }
  function goldThreats(e){
    const threats=[];
    for(const s of shells)if(s.life>0&&Math.hypot(s.x-e.x,s.y-e.y)<Math.hypot(s.vx,s.vy)*1.1+100){
      const legs=bulletForecast(s);let time=Infinity;
      for(const leg of legs){const hit=shotTankContact(leg,leg.vx*leg.duration,leg.vy*leg.duration,{...e,vx:e.vx||0,vy:e.vy||0},leg.start,leg.duration,3);if(hit!==null)time=Math.min(time,leg.start+hit*leg.duration);}
      if(time<Infinity)threats.push({shot:s,legs,time});
    }return threats.sort((a,b)=>a.time-b.time);
  }
  function updateGoldMovement(dt,e){
    const type=Levels.aiTypes.gold,speed=type.moveSpeed,ox=e.x,oy=e.y;
    e.goldScan=(e.goldScan||0)-dt;
    if(e.goldScan<=0){
      e.goldScan=.04;
      const forecast=shells.filter(s=>s.life>0&&Math.hypot(s.x-e.x,s.y-e.y)<Math.hypot(s.vx,s.vy)*1.1+200).flatMap(s=>bulletForecast(s));
      const risk=(vx,vy)=>{let first=Infinity;for(const leg of forecast){const hit=shotTankContact(leg,leg.vx*leg.duration,leg.vy*leg.duration,{...e,vx,vy},leg.start,leg.duration,3);if(hit!==null)first=Math.min(first,leg.start+hit*leg.duration);}return first;};
      const danger=risk(0,0),movingDanger=risk(e.vx||0,e.vy||0);
      if((danger<Infinity||movingDanger<Infinity)&&!(e.offenseTime>0)){
        let best=null;
        for(let i=-1;i<16;i++){
          const angle=i*Math.PI/8,dx=i<0?0:Math.cos(angle),dy=i<0?0:Math.sin(angle),x=e.x+dx*speed*.65,y=e.y+dy*speed*.65;
          if(!canEnemyOccupy(e,x,y)||!clearMovement(e.x,e.y,x,y,e))continue;
          const safety=risk(dx*speed,dy*speed),score=(safety===Infinity?2000:safety*1000)+(dx*(e.goldDX||0)+dy*(e.goldDY||0))*8-Math.abs(Math.hypot(x-tank.x,y-tank.y)-320)*.01-allyCrowding(e,x,y)*4;
          if(!best||safety>best.safety||safety===best.safety&&score>best.score)best={dx,dy,score,safety};
        }
        e.goldDX=best?.dx||0;e.goldDY=best?.dy||0;e.goldEvading=true;e.path=[];
      }else{
        e.goldEvading=false;e.thinkTimer-=.04;
        const playerDistance=Math.hypot(tank.x-e.x,tank.y-e.y),closing=Math.max(0,playerDistance-70);
        const chargeGoal=playerDistance?{x:e.x+(tank.x-e.x)/playerDistance*closing,y:e.y+(tank.y-e.y)/playerDistance*closing}:null;
        if(e.greyCharging&&chargeGoal&&clearMovement(e.x,e.y,chargeGoal.x,chargeGoal.y,e)){
          e.path=closing>2?[chargeGoal]:[];
        }else{
          const atCenter=Math.hypot(e.x-(Math.floor(e.x/100)+.5)*100,e.y-(Math.floor(e.y/100)+.5)*100)<5;
          if(!e.path?.length||e.thinkTimer<=0&&atCenter){e.path=planMobileRoute(e);e.thinkTimer=.4;}
        }
        while(e.path.length&&Math.hypot(e.path[0].x-e.x,e.path[0].y-e.y)<5)e.path.shift();
        const p=e.path[0],distance=p?Math.hypot(p.x-e.x,p.y-e.y):0;e.goldDX=distance?(p.x-e.x)/distance:0;e.goldDY=distance?(p.y-e.y)/distance:0;
      }
    }
    const spaced=spacedDirection(e,e.goldDX||0,e.goldDY||0,speed),dx=spaced.dx,dy=spaced.dy;if(dx||dy){faceTravel(e,Math.atan2(dy,dx),4.5,dt);const steps=Math.max(1,Math.ceil(speed*dt/2));for(let i=0;i<steps;i++)moveTankStep(e,dx*speed*dt/steps,dy*speed*dt/steps);}
    if((dx||dy)&&Math.hypot(e.x-ox,e.y-oy)<.001){e.path=[];e.goldScan=0;}
    e.vx=(e.x-ox)/dt;e.vy=(e.y-oy)/dt;e.tread+=Math.hypot(e.x-ox,e.y-oy);stampTracks(e,ox,oy);
  }
  function goldIntercept(e,type){
    for(const threat of goldThreats(e))if(threat.time<.8){
      for(const leg of threat.legs){
        const point=t=>({x:leg.x+leg.vx*(t-leg.start),y:leg.y+leg.vy*(t-leg.start)});
        const gap=t=>{const p=point(t);return Math.hypot(p.x-e.x,p.y-e.y)-51-type.shellSpeed*t;};
        let low=Math.max(.005,leg.start),high=Math.min(leg.start+leg.duration,threat.time);
        if(high<=low||gap(low)<0||gap(high)>0)continue;
        for(let i=0;i<18;i++){const mid=(low+high)/2;if(gap(mid)>0)low=mid;else high=mid;}
        const p=point(high),angle=Math.atan2(p.y-e.y,p.x-e.x),turn=Math.abs(angleDelta(e.turret,angle))/type.turnRate;
        if(turn>Math.max(.025,high*.65))continue;
        const ray={x:e.x,y:e.y,vx:Math.cos(angle)*type.shellSpeed,vy:Math.sin(angle)*type.shellSpeed},distance=Math.hypot(p.x-e.x,p.y-e.y),wall=firstContact(ray,Math.cos(angle)*distance,Math.sin(angle)*distance);
        if((!wall||wall.t>=.99)&&safeAIShot(e,type.shellSpeed,angle))return {angle,threat,time:high};
      }
    }return null;
  }
  function predictedPlayerPoint(time){
    const dx=(tank.vx||0)*time,dy=(tank.vy||0)*time;let fraction=1;
    for(const w of walls){const hit=segmentBox(tank.x,tank.y,dx,dy,{x:w.x-31,y:w.y-30,width:w.width+62,height:w.height+60});if(hit)fraction=Math.min(fraction,hit.t);}
    return {x:clamp(tank.x+dx*fraction,31,world.width-31),y:clamp(tank.y+dy*fraction,30,world.height-30)};
  }
  function goldLeadPoint(e,speed){
    const x=tank.x-e.x,y=tank.y-e.y,vx=tank.vx||0,vy=tank.vy||0;
    const a=vx*vx+vy*vy-speed*speed,b=2*(x*vx+y*vy-51*speed),c=x*x+y*y-51*51;
    let roots=[];
    if(Math.abs(a)<1e-8){if(Math.abs(b)>1e-8)roots=[-c/b];}
    else {const d=b*b-4*a*c;if(d>=0)roots=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)];}
    let time=Math.min(...roots.filter(t=>t>=0&&t<=8));if(!Number.isFinite(time))return {x:tank.x,y:tank.y};
    let point=predictedPlayerPoint(time);
    for(let i=0;i<6;i++){time=Math.max(0,(Math.hypot(point.x-e.x,point.y-e.y)-51)/speed);point=predictedPlayerPoint(time);}
    return point;
  }
  function goldOffensivePlan(e,dt){
    if(e.goldLeadNext==null)e.goldLeadNext=Math.random()<.5;
    const speed=Levels.aiTypes.gold.shellSpeed,point=e.goldLeadNext?goldLeadPoint(e,speed):{x:tank.x,y:tank.y},target={...tank,...point,vx:0,vy:0};
    const angle=Math.atan2(point.y-e.y,point.x-e.x),range=Math.hypot(point.x-e.x,point.y-e.y),ray={x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed};
    const obstruction=firstContact(ray,Math.cos(angle)*range,Math.sin(angle)*range);
    if(!obstruction||obstruction.t>=.999)return {angle,range,bank:false,target};
    e.bankScanTimer=(e.bankScanTimer||0)-dt;
    if(e.bankScanTimer<=0){
      let aim=target,plan=findBankShot(e,aim);
      // A bank shot must lead over its full two-leg travel distance.
      if(e.goldLeadNext)for(let i=0;i<3&&plan;i++){aim={...target,...predictedPlayerPoint(Math.max(0,(plan.range-51)/speed))};plan=findBankShot(e,aim);}
      e.bankPlan=plan?{...plan,target:aim}:null;e.bankScanTimer=.2;
    }
    const bank=e.bankPlan&&traceBankShot(e,e.bankPlan.angle,e.bankPlan.target);
    return bank?{...bank,target:e.bankPlan.target}:null;
  }
  function updateGoldWeapon(dt,e,type){
    e.reload=Math.max(0,e.reload-dt);
    const defense=goldIntercept(e,type),plan=defense||goldOffensivePlan(e,dt);if(!plan)return;
    e.turret+=clamp(angleDelta(e.turret,plan.angle),-type.turnRate*dt,type.turnRate*dt);
    if(e.reload>0||Math.abs(angleDelta(e.turret,plan.angle))>.045||shells.filter(s=>s.owner===e&&s.life>0).length>=5)return;
    if(!safeAIShot(e,type.shellSpeed,plan.angle)||plan.bank&&!traceBankShot(e,plan.angle,plan.target))return;
    emitShot(e,type.shellSpeed,plan.angle);e.firstShot=false;e.reload=defense?.11:.22;e.intercepting=!!defense;if(!defense){e.lastGoldShotLed=e.goldLeadNext;e.goldLeadNext=null;e.bankPlan=null;e.bankScanTimer=0;}
  }
  function updateGreyCharge(dt,e){
    if(e.disruptTime>0){e.greyCharging=false;e.offenseTime=0;e.path=[];return;}
    const duration=Levels.aiTypes[e.type].chargeDuration;
    if(e.chargeClock===undefined){e.chargeClock=0;e.chargeStart=Math.random()*(10-duration);}
    e.chargeClock+=dt;
    while(e.chargeClock>=10){e.chargeClock-=10;e.chargeStart=Math.random()*(10-duration);}
    const charging=e.chargeClock>=e.chargeStart&&e.chargeClock<e.chargeStart+duration;
    if(charging!==e.greyCharging){e.path=[];e.thinkTimer=0;e.goldScan=0;}
    e.greyCharging=charging;e.offenseTime=charging?duration:0;
  }
  function duplicationSpot(e){
    for(const radius of [68,80,96,112])for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,x=e.x+Math.cos(angle)*radius,y=e.y+Math.sin(angle)*radius;
      if(canEnemyOccupy(e,x,y)&&clearMovement(e.x,e.y,x,y,e))return {x,y};
    }return null;
  }
  function duplicateTank(e){
    if((e.dupAge||0)+1e-8<3)return false;
    if(enemies.filter(t=>t.alive&&t.dupFamily===e.dupFamily).length>=12)return false;
    const spot=duplicationSpot(e);if(!spot)return false;
    const clone={...e,...spot,vx:0,vy:0,health:1,alive:true,reload:Math.random(),firstShot:true,charge:0,burst:null,path:[],thinkTimer:0,resting:false,burstTimer:.1,
      scanTimer:.05,reactionTimer:0,pendingThreat:null,dodgeTime:0,dodgeCooldown:0,turnClearance:null,bankPlan:null,bankScanTimer:0,stunTime:0,stunVisualAge:0,fireGrace:0,hitFlash:0,recoil:0,tread:0,trackDistance:0,age:0,
      routeSeed:Math.random()*10000,routeDirections:(e.routeDirections||[[0,-1],[1,0],[0,1],[-1,0]]).map(d=>[...d]),
      dupAge:0,dupClock:0,dupAt:Math.random()*8.5,dupDone:false,dupPending:false,dupRetry:0,dupCastTime:0,dupSpawnTime:.45,dupOrigin:{x:e.x,y:e.y}};
    e.dupCastTime=.45;e.vx=0;e.vy=0;e.dupPending=false;e.dupDone=true;enemies.push(clone);return true;
  }
  function updateDuplicators(dt){
    for(const e of [...enemies])if(e.alive&&Levels.aiTypes[e.type].duplicator){
      e.dupAge=(e.dupAge||0)+dt;
      if(e.dupCastTime>0)e.dupCastTime=Math.max(0,e.dupCastTime-dt);
      if(e.dupSpawnTime>0){e.dupSpawnTime=Math.max(0,e.dupSpawnTime-dt);continue;}
      if(e.stunTime>0||e.disruptTime>0)continue;
      e.dupClock+=dt;e.dupRetry=Math.max(0,(e.dupRetry||0)-dt);
      while(e.dupClock>=8.5){e.dupClock-=8.5;e.dupAt=Math.random()*8.5;e.dupDone=false;}
      if(!e.dupDone&&e.dupClock>=e.dupAt){e.dupPending=true;e.dupDone=true;}
      if(e.dupAge+1e-8>=3&&e.dupPending&&e.dupCastTime<=0&&e.dupRetry<=0){if(!duplicateTank(e))e.dupRetry=.25;}
    }
  }
  function drawDuplicationEffects(){
    for(const e of enemies)if(e.alive&&(e.dupCastTime>0||e.dupSpawnTime>0)){
      const remaining=e.dupSpawnTime||e.dupCastTime,progress=1-remaining/.45;ctx.save();ctx.strokeStyle=`rgba(238,117,190,${(1-progress)*.8})`;ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(e.x,e.y,29+progress*22+i*5,0,Math.PI*2);ctx.stroke();}
      if(e.dupSpawnTime>0&&e.dupOrigin){ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(e.dupOrigin.x,e.dupOrigin.y);ctx.quadraticCurveTo((e.dupOrigin.x+e.x)/2,(e.dupOrigin.y+e.y)/2-25,e.x,e.y);ctx.stroke();}
      ctx.restore();
    }
  }
  function updateMobileEnemy(dt, e) {
    e.vx = 0; e.vy = 0;
    const type = Levels.aiTypes[e.type];
    if (!e.alive || e.stunTime>0 || e.dupSpawnTime>0 || e.dupCastTime>0 || !type.mobile || dt <= 0) return;
    e.age = (e.age || 0) + dt;
    if(type.chargeDuration>0)updateGreyCharge(dt,e);
    if(type.gold){updateGoldMovement(dt,e);return;}
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
    if(e.flame){e.path=[];e.thinkTimer=0;e.pendingThreat=null;e.dodgeTime=0;}
    else if (e.dodgeTime > 0 && !(e.offenseTime>0)) {
      e.dodgeTime = Math.max(0, e.dodgeTime - dt); dx = e.dodgeX; dy = e.dodgeY; speed = 95 * (e.shieldTime>0?1.25:1);
    } else if(type.elite && e.type!=='grey' && !(e.offenseTime>0) && (e.burst || e.charge>0 || (wantsCover(e)&&!lineOfSight(e)))) {
      e.path=[];e.thinkTimer=0;
    } else {
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) { e.resting = !e.resting; e.burstTimer = e.resting ? .4 + Math.random() * .3 : 1.1 + Math.random() * .4; }
      e.thinkTimer -= dt;
      if (!e.resting || e.offenseTime>0 || e.type==='grey') {
        if (e.thinkTimer <= 0 && (!e.path.length || Math.hypot(e.x-(Math.floor(e.x/100)+.5)*100,e.y-(Math.floor(e.y/100)+.5)*100)<1.5)) { e.path = planMobileRoute(e); e.thinkTimer = e.type==='grey'?.45:.95 + Math.random() * .3; }
        while (e.path.length && Math.hypot(e.path[0].x - e.x, e.path[0].y - e.y) < 1) e.path.shift();
        const target = e.path[0];
        if (target) {
          const distance = Math.hypot(target.x - e.x, target.y - e.y);
          dx = (target.x - e.x) / distance; dy = (target.y - e.y) / distance;
          speed = Math.min(speed, distance / dt);
        }
      }
    }
    ({dx,dy}=spacedDirection(e,dx,dy,speed));
    if ((dx || dy) && !safeBulletMovement(e,dx*speed,dy*speed)){dx=0;dy=0;e.path=[];e.thinkTimer=0;e.dodgeTime=0;}
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
    stampTracks(e,ox,oy);
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
        const clear=e.burst.bank?!!traceBankShot(e,angle,{...tank,vx:0,vy:0},false,e.burst.range):!wall;
        if(clear&&safeAIShot(e,type.shellSpeed,angle)&&shells.filter(s=>s.owner===e&&s.life>0).length<type.shellLimit)emitShot(e,type.shellSpeed,angle);
        e.burst.index++;e.burst.timer+=.18;
        if(e.burst.index===3){e.burst=null;e.reload=type.reload;e.path=[];e.thinkTimer=0;}
      }
      return;
    }
    e.reload=Math.max(0,e.reload-dt);
    const plan=enemyShotPlan(e,dt),predicted=eliteAim(e,type),angle=plan?plan.angle:Math.atan2(predicted.y-e.y,predicted.x-e.x);
    e.turret+=clamp(angleDelta(e.turret,angle),-type.turnRate*dt,type.turnRate*dt);
    const ready=!!plan&&e.reload===0&&Math.abs(angleDelta(e.turret,angle))<.08&&(!plan.bank||!!traceBankShot(e,e.turret,plan.target))&&safeAIShot(e,type.shellSpeed)&&shells.filter(s=>s.owner===e&&s.life>0).length<type.shellLimit;
    e.charge=ready?e.charge+dt:0;
    if(e.charge>=(e.firstShot?Math.min(.12,type.chargeTime):type.chargeTime)){
      e.firstShot=false;e.burst={aim:e.turret,range:plan.range,bank:plan.bank,index:0,timer:0};e.charge=0;
      updateEliteWeapon(0,e,type);
    }
  }
  function flameOrigin(e){return {x:e.x+Math.cos(e.flame.angle)*51,y:e.y+Math.sin(e.flame.angle)*51};}
  function flameReach(e){return e.flame?24+(flameRange-24)*clamp(e.flame.age/flameExtensionTime,0,1):0;}
  function flameDistance(origin,angle,range=flameRange){
    const dx=Math.cos(angle)*range,dy=Math.sin(angle)*range;let length=range;
    for(const w of walls)if(w.type!=='hole'){
      if(origin.x>=w.x&&origin.x<=w.x+w.width&&origin.y>=w.y&&origin.y<=w.y+w.height)return 0;
      const hit=segmentBox(origin.x,origin.y,dx,dy,w);if(hit)length=Math.min(length,hit.t*range);
    }
    for(const [p,d,limit]of [[origin.x,dx,world.width],[origin.y,dy,world.height]]){
      const t=d>0?(limit-p)/d:d<0?-p/d:Infinity;if(t>=0)length=Math.min(length,t*range);
    }
    return length;
  }
  // Cast rays at a rectangle's angular extrema as well as the cone edges.
  // The visible cone and damage use the same wall-limited ray distances.
  function flameTouches(e,box,reach=null){
    if(!e.flame)return false;
    const range=reach??flameReach(e),origin=flameOrigin(e),a=e.flame.angle,c=Math.cos(box.angle),sn=Math.sin(box.angle);
    const candidates=[a-flameHalfAngle,a,a+flameHalfAngle,Math.atan2(box.y-origin.y,box.x-origin.x)];
    for(const x of [-box.hx,box.hx])for(const y of [-box.hy,box.hy])candidates.push(Math.atan2(box.y+x*sn+y*c-origin.y,box.x+x*c-y*sn-origin.x));
    for(const angle of candidates){
      if(Math.abs(angleDelta(a,angle))>flameHalfAngle+1e-8)continue;
      const rx=origin.x-box.x,ry=origin.y-box.y,dx=Math.cos(angle)*range,dy=Math.sin(angle)*range;
      const hit=segmentBox(rx*c+ry*sn,-rx*sn+ry*c,dx*c+dy*sn,-dx*sn+dy*c,{x:-box.hx,y:-box.hy,width:box.hx*2,height:box.hy*2});
      const inside=Math.abs(rx*c+ry*sn)<=box.hx&&Math.abs(-rx*sn+ry*c)<=box.hy;
      if(inside||(hit&&hit.t*range<flameDistance(origin,angle,range)-.01))return true;
    }
    return false;
  }
  function updateFlamethrower(dt,e){
    if(e.flame){
      e.turret=e.flame.angle;e.flame.time-=dt;e.flame.age+=dt;
      if(e.flame.time<=0){e.flame=null;e.flameCooldown=5;}
      return true;
    }
    e.flameCooldown=Math.max(0,(e.flameCooldown||0)-dt);
    const angle=Math.atan2(tank.y-e.y,tank.x-e.x),origin={x:e.x+Math.cos(angle)*51,y:e.y+Math.sin(angle)*51};
    const muzzleBlocked=walls.some(w=>w.type!=='hole'&&segmentBox(e.x,e.y,origin.x-e.x,origin.y-e.y,w));
    if(e.flameCooldown===0&&tank.alive&&!muzzleBlocked&&Math.hypot(tank.x-origin.x,tank.y-origin.y)<=flameRange&&lineOfSight(e)){
      e.flame={phase:'fire',time:flameExtensionTime+flameHoldTime,age:0,angle};e.turret=angle;e.charge=0;e.burst=null;e.pendingThreat=null;e.dodgeTime=0;e.path=[];return true;
    }
    return false;
  }
  function applyFlames(){
    for(const e of enemies)if(e.alive&&!(e.stunTime>0)&&e.flame?.phase==='fire'){
      for(const s of shells)if(s.life>0&&flameTouches(e,shellBox(s))){s.life=0;puff(s.x,s.y);}
      if(tank.alive&&flameTouches(e,hullBox(tank)))hitTank({life:1,sourceX:e.x,sourceY:e.y,fireDamage:true},tank);
    }
  }
  function drawFlamethrower(e){
    if(!e.alive||e.stunTime>0||!e.flame)return;
    const origin=flameOrigin(e),f=e.flame,range=flameReach(e);
    ctx.save();ctx.beginPath();ctx.moveTo(origin.x,origin.y);
    for(let i=0;i<=60;i++){const angle=f.angle-flameHalfAngle+2*flameHalfAngle*i/60,length=flameDistance(origin,angle,range);ctx.lineTo(origin.x+Math.cos(angle)*length,origin.y+Math.sin(angle)*length);}
    ctx.closePath();
    {
      const glow=ctx.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,range);glow.addColorStop(0,'rgba(255,244,146,.9)');glow.addColorStop(.35,'rgba(255,170,37,.7)');glow.addColorStop(1,'rgba(235,66,24,.23)');ctx.fillStyle=glow;ctx.fill();
      ctx.clip();
      for(let i=0;i<85;i++){
        const progress=(i*.6180339+f.age*1.8)%1,angle=f.angle+Math.sin(i*11.7+f.age*3)*flameHalfAngle*.95,distance=progress*range;
        ctx.globalAlpha=.9*(1-progress*.7);ctx.fillStyle=i%3===0?'#fff2a3':i%3===1?'#ffc44e':'#f77628';
        ctx.beginPath();ctx.arc(origin.x+Math.cos(angle)*distance,origin.y+Math.sin(angle)*distance,3+progress*12,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }
  function mortarTargetSafe(e,point){
    return Math.hypot(point.x-e.x,point.y-e.y)>=180&&!enemies.some(ally=>ally!==e&&ally.alive&&Math.hypot(point.x-(ally.x+(ally.vx||0)*mortarFlightTime),point.y-(ally.y+(ally.vy||0)*mortarFlightTime))<mortarBlastRadius+tankRadius+1);
  }
  function safeDisruptorWave(e,angle){
    const emitter={x:e.x,y:e.y,flame:{angle,age:2}},origin=flameOrigin(emitter);
    return !enemies.some(ally=>{
      if(ally===e||!ally.alive)return false;
      const time=Math.min(1,Math.hypot(ally.x-origin.x,ally.y-origin.y)/(Levels.aiTypes.teal.shellSpeed*.6));
      return flameTouches(emitter,hullBox(ally),flameRange)||flameTouches(emitter,{...hullBox(ally),x:ally.x+(ally.vx||0)*time,y:ally.y+(ally.vy||0)*time},flameRange);
    });
  }
  function updateSpecialWeapon(dt,e,type){
    e.reload=Math.max(0,e.reload-dt);
    const point=type.sniper?eliteAim(e,type):{x:tank.x,y:tank.y},angle=Math.atan2(point.y-e.y,point.x-e.x);
    e.turret+=clamp(angleDelta(e.turret,angle),-type.turnRate*dt,type.turnRate*dt);
    if(type.disruptor){
      const ready=e.reload===0&&Math.hypot(tank.x-e.x,tank.y-e.y)<=flameRange+51&&lineOfSight(e)&&Math.abs(angleDelta(e.turret,angle))<.055&&safeDisruptorWave(e,e.turret)&&waves.filter(w=>w.hostile&&w.owner===e&&w.life>0).length<type.shellLimit;
      e.charge=ready?e.charge+dt:0;
      if(e.charge>=.2){waves.push({owner:e,hostile:true,x:e.x,y:e.y,angle:e.turret,distance:0,life:1,hits:new Set()});e.reload=type.reload;e.charge=0;e.recoil=.11;e.firstShot=false;mineSound('disrupt');}
      return;
    }
    if(type.mortar){
      const ready=e.reload===0&&Math.hypot(tank.x-e.x,tank.y-e.y)<=750&&mortarTargetSafe(e,point)&&!mortars.some(m=>m.owner===e);
      e.charge=ready?e.charge+dt:0;
      if(e.charge>=.35){mortars.push({x:e.x,y:e.y,targetX:point.x,targetY:point.y,age:0,duration:mortarFlightTime,owner:e});e.reload=4.5;e.charge=0;e.recoil=.11;mineSound('launch');}
      return;
    }
    const ready=e.reload===0&&lineOfSight(e)&&Math.abs(angleDelta(e.turret,angle))<.055&&safeAIShot(e,type.shellSpeed)&&shells.filter(s=>s.owner===e&&s.life>0).length<type.shellLimit;
    e.charge=ready?e.charge+dt:0;
    if(e.charge>=(type.sniper?.85:.2)){emitShot(e,type.shellSpeed,e.turret);e.firstShot=false;e.reload=type.reload;e.charge=0;}
  }
  function updateMortars(dt){
    for(const m of [...mortars]){
      m.age+=dt;
      if(m.age>=m.duration){mortars.splice(mortars.indexOf(m),1);mineBlast({x:m.targetX,y:m.targetY},mortarBlastRadius,false);if(phase==='dying')break;}
    }
  }
  function mortarShadowRadius(m){return mortarBlastRadius*clamp(m.age/Math.max(.01,m.duration-.4),0,1);}
  function drawMortarMarkers(){
    for(const m of mortars){
      const radius=mortarShadowRadius(m);if(radius<.01)continue;
      const shade=ctx.createRadialGradient(m.targetX,m.targetY,0,m.targetX,m.targetY,radius);
      shade.addColorStop(0,'rgba(174,52,242,.55)');shade.addColorStop(.75,'rgba(174,52,242,.42)');shade.addColorStop(1,'rgba(174,52,242,.12)');
      ctx.save();ctx.fillStyle=shade;ctx.beginPath();ctx.arc(m.targetX,m.targetY,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  function drawMortarShells(){
    for(const m of mortars){const t=clamp(m.age/m.duration,0,1),x=m.x+(m.targetX-m.x)*t,y=m.y+(m.targetY-m.y)*t-Math.sin(t*Math.PI)*65;ctx.save();ctx.translate(x,y);ctx.fillStyle='#715276';ctx.strokeStyle='#d4b1d2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#edd59b';ctx.beginPath();ctx.arc(2,-2,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  function disruptTank(victim){
    if(victim===tank){
      abilityState.disruptTime=4;
      if(abilityState.shieldTime>0)abilityState.shieldCooldown=13;
      if(abilityState.dashTime>0)abilityState.dashCooldown=6;
      abilityState.shieldTime=0;abilityState.dashTime=0;abilityState.swivelTime=0;abilityState.stunArmed=false;abilityState.smartArmed=false;tank.shieldTime=0;tank.swivelTime=0;publishAbilities(true);
    }else{
      victim.disruptTime=4;victim.flame=null;if(victim.shieldTime>0){victim.shieldTime=0;victim.shieldCooldown=6;}victim.offenseTime=0;
    }
    puff(victim.x,victim.y);mineSound('target');
  }
  function updateEnemy(dt, enemy = enemies[0]) {
    if (!enemy.alive||enemy.stunTime>0||enemy.dupSpawnTime>0||enemy.dupCastTime>0) return;
    const type = Levels.aiTypes[enemy.type];
    if(type.mortar||type.sniper||type.disruptor){updateSpecialWeapon(dt,enemy,type);return;}
    if(type.gold){updateGoldWeapon(dt,enemy,type);return;}
    if(type.flamethrower&&!(enemy.disruptTime>0)&&updateFlamethrower(dt,enemy)){enemy.reload=Math.max(0,enemy.reload-dt);enemy.charge=0;enemy.burst=null;return;}
    if(type.elite){updateEliteWeapon(dt,enemy,type);return;}
    enemy.reload = Math.max(0, enemy.reload - dt);
    const plan = enemyShotPlan(enemy,dt);
    const target = plan ? plan.angle : Math.atan2(tank.y - enemy.y, tank.x - enemy.x);
    enemy.turret += clamp(angleDelta(enemy.turret, target), -type.turnRate * dt, type.turnRate * dt);
    const ready = !!plan && enemy.reload === 0 && Math.abs(angleDelta(enemy.turret, target)) < .08 &&
      (!plan.bank || !!traceBankShot(enemy,enemy.turret,plan.target)) &&
      shells.filter(s => s.owner === enemy && s.life > 0).length < type.shellLimit && safeAIShot(enemy, type.shellSpeed);
    enemy.charge = ready ? enemy.charge + dt : 0;
    if (enemy.charge >= (enemy.firstShot?Math.min(.12,type.chargeTime):type.chargeTime)) { enemy.firstShot=false;emitShot(enemy, type.shellSpeed); enemy.reload = type.reload; enemy.charge = 0; }
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
    if(!contact.shield){for(let i=0;i<5;i++){const a=i*2.4;embers.push({x:s.x,y:s.y,vx:Math.cos(a)*45,vy:Math.sin(a)*45,age:0,life:.15});}}
    if(contact.shield===tank){
      if(contact.partial||!playerUpgrades.favored){s.life=0;puff(s.x,s.y);return;}
      reflectShot(s,contact);s.bounces++;sound('shieldRicochet');return;
    }
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
    if((s.rocket||s.playerRocketStacks)&&s.exhaustTimer>=.03){
      s.exhaustTimer-=.03;
      const speed=Math.hypot(s.vx,s.vy),c=s.vx/speed,sn=s.vy/speed;
      embers.push({x:s.x-c*10,y:s.y-sn*10,vx:-c*25+(Math.random()-.5)*12,vy:-sn*25+(Math.random()-.5)*12,age:0,life:.16+Math.random()*.12});
    }
    s.smokeDistance = (s.smokeDistance + distance) % 3;
  }
  function mineSound(kind,intensity){if(!muted&&active)window.TankMineAudio?.play(kind,intensity);}
  function mineCapacity(){return playerUpgrades.demolitions?3:playerUpgrades.fires?2:1;}
  function dropMine(){
    if(!campaignCombat||abilityState.disruptTime>0||!playerUpgrades.typhon||editing||!active||countdown>0||phase!=='playing'||!tank.alive||mineCooldown>0||mines.length>=mineCapacity())return;
    const armDuration=playerUpgrades.demolitions?.5:mineArmDuration;
    mines.push({x:tank.x,y:tank.y,fuse:null,armTime:armDuration,armDuration});mineCooldown=playerUpgrades.fires?1.5:3;mineSound('place');updateAbilityHud();
  }
  function blastVisible(origin,target){return !walls.some(w=>w.type!=='hole'&&segmentBox(origin.x,origin.y,target.x-origin.x,target.y-origin.y,w));}
  function circleHitsBox(origin,radius,box){
    const c=Math.cos(box.angle),s=Math.sin(box.angle),dx=origin.x-box.x,dy=origin.y-box.y,x=dx*c+dy*s,y=-dx*s+dy*c;
    return Math.hypot(x-clamp(x,-box.hx,box.hx),y-clamp(y,-box.hy,box.hy))<=radius;
  }
  function mineBlast(origin,radius,protectPlayer=false,blue=false){
    mineBlasts.push({x:origin.x,y:origin.y,radius,age:0,blue,seed:Math.random()*Math.PI*2});puff(origin.x,origin.y,true);mineSound('explode');addScorch(origin.x,origin.y,radius*.55);
    for(const e of enemies)if(e.alive&&circleHitsBox(origin,radius,hullBox(e))&&blastVisible(origin,e))hitTank({life:1,sourceX:origin.x,sourceY:origin.y},e);
    for(const s of shells)if(s.life>0&&circleHitsBox(origin,radius,shellBox(s))&&blastVisible(origin,s))s.life=0;
    for(const m of [...mines])if(mines.includes(m)&&Math.hypot(m.x-origin.x,m.y-origin.y)<=radius+mineRadius&&blastVisible(origin,m)) {if(m.flight)detonateMine(m);else launchMine(m);}
    if(!protectPlayer&&tank.alive&&circleHitsBox(origin,radius,hullBox(tank))&&blastVisible(origin,tank))hitTank({life:1,sourceX:origin.x,sourceY:origin.y},tank);
  }
  function detonateMine(m){const index=mines.indexOf(m);if(index<0)return;mines.splice(index,1);mineBlast(m,150,!!playerUpgrades.protector,!!playerUpgrades.protector);updateAbilityHud();}
  function launchMine(m){
    if(!mines.includes(m)||m.flight||m.armTime>0)return;
    const nearest=enemies.filter(e=>e.alive&&!e.mounted).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];
    if(!nearest){detonateMine(m);return;}
    const dx=nearest.x-m.x,dy=nearest.y-m.y;
    Object.assign(m,{flight:true,targetX:nearest.x,targetY:nearest.y,angle:Math.atan2(dy,dx),speed:0,distance:0,range:Math.min(300,Math.hypot(dx,dy)),flightSoundTimer:0,trailDistance:0,ownerCleared:false});
    mineSound('target');mineSound('launch');if(m.range<1e-8)detonateMine(m);
  }
  function moveFlyingMine(m,dt){
    const topSpeed=Levels.aiTypes.teal.shellSpeed*1.5,acceleration=topSpeed/.3,radius=mineRadius*.5;
    const rampTime=Math.min(dt,(topSpeed-m.speed)/acceleration),nextSpeed=Math.min(topSpeed,m.speed+acceleration*dt);
    const distance=Math.min(m.range-m.distance,m.speed*rampTime+acceleration*rampTime*rampTime/2+topSpeed*(dt-rampTime));m.speed=nextSpeed;
    const dx=Math.cos(m.angle)*distance,dy=Math.sin(m.angle)*distance;let fraction=1,impact=false;
    const consider=hit=>{if(hit&&hit.t<=fraction){fraction=hit.t;impact=true;}};
    for(const w of walls)if(w.type!=='hole'){
      if(circleWall(m.x,m.y,radius,w))consider({t:0});
      consider(segmentBox(m.x,m.y,dx,dy,{x:w.x-radius,y:w.y-radius,width:w.width+radius*2,height:w.height+radius*2}));
    }
    for(const [position,delta,limit]of [[m.x,dx,world.width],[m.y,dy,world.height]]){
      if(delta<0&&position+delta<radius)consider({t:clamp((radius-position)/delta,0,1)});
      if(delta>0&&position+delta>limit-radius)consider({t:clamp((limit-radius-position)/delta,0,1)});
    }
    if(!circleHitsBox(m,radius,hullBox(tank)))m.ownerCleared=true;
    for(const actor of [...enemies,...(m.ownerCleared&&!playerUpgrades.protector?[tank]:[])])if(actor.alive){
      if(actor.shieldTime>0||actor===tank&&actor.swivelTime>0)consider(shieldContact(m,dx,dy,actor));
      const box=hullBox(actor),c=Math.cos(box.angle),s=Math.sin(box.angle),rx=m.x-box.x,ry=m.y-box.y;
      if(circleHitsBox(m,radius,box))consider({t:0});
      consider(segmentBox(rx*c+ry*s,-rx*s+ry*c,dx*c+dy*s,-dx*s+dy*c,{x:-box.hx-radius,y:-box.hy-radius,width:(box.hx+radius)*2,height:(box.hy+radius)*2}));
    }
    const ox=m.x,oy=m.y;m.x+=dx*fraction;m.y+=dy*fraction;m.distance+=distance*fraction;
    m.flightSoundTimer-=dt;if(m.flightSoundTimer<=0){mineSound('flight',m.speed/topSpeed);m.flightSoundTimer=.1;}
    const moved=Math.hypot(m.x-ox,m.y-oy);m.trailDistance+=moved;
    if(m.trailDistance>=7){m.trailDistance%=7;smoke.push({x:m.x,y:m.y,age:0,life:.35,driftX:-Math.cos(m.angle)*15,driftY:-Math.sin(m.angle)*15,phase:mineClock,radius:3,growth:12,opacity:.25});}
    if(impact||m.distance>=m.range-1e-8){mineSound('impact');detonateMine(m);}
  }
  function updateMines(dt){
    mineClock+=dt;mineCooldown=Math.max(0,mineCooldown-dt);
    for(const blast of mineBlasts)blast.age+=dt;mineBlasts=mineBlasts.filter(b=>b.age<.65);
    for(const m of [...mines]){
      if(!mines.includes(m))continue;
      if(m.flight){moveFlyingMine(m,dt);continue;}
      let activeDt=dt;
      if(m.armTime>0){const remaining=m.armTime-dt;activeDt=Math.max(0,-remaining);m.armTime=Math.max(0,remaining);if(m.armTime<1e-8)m.armTime=0;if(m.armTime>0)continue;mineSound('activate');}
      if(m.fuse!==null){m.fuse-=activeDt;m.beepTimer-=activeDt;if(m.fuse<=1e-8)launchMine(m);else if(m.beepTimer<=0){mineSound('fuse');m.beepTimer=.25;}}
      else if(enemies.some(e=>e.alive&&circleHitsBox(m,100,hullBox(e))&&blastVisible(m,e))){m.fuse=1;m.beepTimer=.25;mineSound('fuse');}
    }
    updateAbilityHud();
  }
  function mineArmingSegments(m){return Math.floor(clamp((1-(m.armTime||0)/(m.armDuration||mineArmDuration))*3+1e-8,0,3));}
  function drawMineHousing(m,blue,pulse){
    const active=!(m.armTime>0),r=mineRadius,color=blue?'74,180,242':'239,107,56';ctx.save();ctx.translate(m.x,m.y);
    if(active){ctx.strokeStyle=`rgba(${color},${.15+.45*pulse})`;ctx.lineWidth=1.5+2*pulse;ctx.beginPath();ctx.arc(0,0,r+3+pulse*6,0,Math.PI*2);ctx.stroke();}
    const metal=ctx.createRadialGradient(-8,-10,2,0,0,r);metal.addColorStop(0,blue?'#8b9f9f':'#a2a58a');metal.addColorStop(.55,blue?'#536d78':'#626956');metal.addColorStop(1,'#303c37');ctx.fillStyle=metal;ctx.strokeStyle='#29362f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#d2d8b77a';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(-.3,-.5,r-2,Math.PI,Math.PI*1.85);ctx.stroke();
    // Segmented armor, screws, and vent slots mirror the tanks' small-scale detail.
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;ctx.save();ctx.rotate(a);ctx.strokeStyle='#26372b88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r*.6,0);ctx.lineTo(r-2,0);ctx.stroke();ctx.fillStyle='#d3d2b6';ctx.beginPath();ctx.arc(r*.78,0,1.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#495342';ctx.beginPath();ctx.moveTo(r*.78-1,0);ctx.lineTo(r*.78+1,0);ctx.stroke();ctx.restore();
    }
    for(const sign of [-1,1])for(let i=0;i<3;i++){ctx.save();ctx.translate(sign*14,-5+i*4);ctx.rotate(sign*.25);ctx.fillStyle='#25382d';ctx.fillRect(-2,-.8,4,1.6);ctx.restore();}
    ctx.fillStyle='#283d39';ctx.strokeStyle='#aab99c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=active?`rgba(${color},${.35+.65*pulse})`:'#6e7353';ctx.beginPath();ctx.arc(0,0,r*(active?.23+.08*pulse:.22),0,Math.PI*2);ctx.fill();ctx.fillStyle=active?'#ffe5b188':'#b4ba9170';ctx.beginPath();ctx.arc(-2,-3,2,0,Math.PI*2);ctx.fill();
    const segments=mineArmingSegments(m);for(const [i,x,y]of [[0,0,-15],[1,-12,8],[2,12,8]]){
      ctx.fillStyle='#243129';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=i<segments?'#ed4b39':'#682c29';ctx.beginPath();ctx.arc(x,y,2.8,0,Math.PI*2);ctx.fill();
      if(i<segments){ctx.fillStyle='#ffd1a9';ctx.beginPath();ctx.arc(x-.6,y-.7,.9,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  function drawMines(){
    for(const m of mines){
      const blue=!!playerUpgrades.protector,pulse=(1+Math.sin(mineClock*(m.fuse===null?6:18)))/2;
      if(m.flight){
        ctx.save();ctx.strokeStyle=blue?'rgba(52,135,180,.45)':'rgba(163,78,46,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(m.targetX,m.targetY,12,0,Math.PI*2);ctx.moveTo(m.targetX-17,m.targetY);ctx.lineTo(m.targetX-8,m.targetY);ctx.moveTo(m.targetX+8,m.targetY);ctx.lineTo(m.targetX+17,m.targetY);ctx.stroke();ctx.restore();
        ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);ctx.fillStyle=blue?'#48a9e0':'#e67b31';ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(-24-7*Math.sin(mineClock*60)**2,0);ctx.lineTo(-10,6);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0c5';ctx.beginPath();ctx.moveTo(-10,-3);ctx.lineTo(-22,0);ctx.lineTo(-10,3);ctx.closePath();ctx.fill();ctx.fillStyle=blue?'#345d70':'#714638';ctx.beginPath();ctx.arc(0,0,mineRadius*.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=blue?'#9addff':'#f4c079';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=blue?'#c2f0ff':'#ffe6b0';ctx.beginPath();ctx.arc(4,0,4,0,Math.PI*2);ctx.fill();ctx.restore();
      }else{
        drawMineHousing(m,blue,pulse);
      }
    }
  }
  function drawMineBlasts(){
    for(const b of mineBlasts){
      const t=b.age/.65,r=b.radius*Math.min(1,t*7),fade=Math.pow(1-t,1.2),hot=b.blue?'190,245,255':'255,232,145',mid=b.blue?'50,160,255':'255,118,25',edge=b.blue?'24,70,230':'215,35,12';
      ctx.save();
      // Clip flames and sparks to the same cover-limited footprint as blast damage.
      ctx.beginPath();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,d=flameDistance(b,a,r),x=b.x+Math.cos(a)*d,y=b.y+Math.sin(a)*d;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.clip();
      const glow=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,Math.max(1,r));glow.addColorStop(0,`rgba(${hot},${fade*.85})`);glow.addColorStop(.4,`rgba(${mid},${fade*.65})`);glow.addColorStop(1,`rgba(${edge},0)`);ctx.fillStyle=glow;ctx.fillRect(b.x-r,b.y-r,r*2,r*2);
      // Uneven, curling tongues replace the old circular outline. Their white-hot
      // cores cool into orange/red (or blue/cyan for protected mines).
      for(let i=0;i<28;i++){
        const a=i*2.39996+b.seed,swirl=Math.sin(i*7.1+t*18),length=r*(.55+.4*(.5+.5*Math.sin(i*13.3+t*12))),width=r*(.07+.035*Math.sin(i*3.7)**2);
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(a);ctx.fillStyle=`rgba(${i%3===0?hot:i%3===1?mid:edge},${fade*(.45+.2*Math.sin(i+t*15)**2)})`;ctx.beginPath();ctx.moveTo(r*.08,-width*.4);ctx.bezierCurveTo(length*.35,-width*1.8,length*.8,width*swirl- width,length,width*swirl);ctx.bezierCurveTo(length*.65,width*1.4,length*.25,width*1.6,r*.08,width*.4);ctx.closePath();ctx.fill();
        ctx.fillStyle=`rgba(${hot},${fade*.8})`;ctx.beginPath();ctx.moveTo(r*.08,0);ctx.quadraticCurveTo(length*.35,-width*.5,length*.68,width*swirl*.45);ctx.quadraticCurveTo(length*.3,width*.5,r*.08,0);ctx.fill();ctx.restore();
      }
      for(let i=0;i<36;i++){
        const a=i*2.39996+b.seed,d=r*(.25+((i*.618+t*.9)%1)*.75),x=b.x+Math.cos(a)*d,y=b.y+Math.sin(a)*d;ctx.strokeStyle=`rgba(${i%2?hot:mid},${fade})`;ctx.lineWidth=1.5+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*(4+8*t),y-Math.sin(a)*(4+8*t));ctx.stroke();
      }
      ctx.restore();
    }
  }
  function playerHitEffect(s){
    const angle=Number.isFinite(s.x)&&Number.isFinite(s.y)?Math.atan2(s.y-tank.y,s.x-tank.x):Number.isFinite(s.sourceX)?Math.atan2(s.sourceY-tank.y,s.sourceX-tank.x):tank.hull;
    const c=Math.cos(tank.hull),sn=Math.sin(tank.hull),px=Math.cos(angle)*40,py=Math.sin(angle)*40,lx=clamp(px*c+py*sn,-31,31),ly=clamp(-px*sn+py*c,-29,29);
    const x=tank.x+lx*c-ly*sn,y=tank.y+lx*sn+ly*c;hitImpacts.push({x,y,age:0});tank.hitFlash=.1;
    for(let i=0;i<9;i++){const a=angle+(i-4)*.25;embers.push({x,y,vx:Math.cos(a)*(45+i*7),vy:Math.sin(a)*(45+i*7),age:0,life:.2});}
    return {x,y};
  }
  function beginPlayerDeath(s){
    const point=playerHitEffect(s);deathSequence={elapsed:0,exploded:false,point};phase='dying';
    tank.vx=0;tank.vy=0;for(const e of enemies){e.vx=0;e.vy=0;}keys.clear();stopEngine();stopRocketAudio();
  }
  function updatePlayerDeath(dt){
    deathSequence.elapsed+=dt;
    if(!deathSequence.exploded&&deathSequence.elapsed>=.1-1e-8){
      deathSequence.exploded=true;puff(tank.x,tank.y,true);addScorch(tank.x,tank.y,36);sound('explosion');bursts.push({x:tank.x,y:tank.y,age:Math.max(0,deathSequence.elapsed-.1),duration:.95});
    }
    if(deathSequence.elapsed>=.3-1e-8)finishRound();
  }
  function drawHitImpacts(){
    for(const hit of hitImpacts){const fade=Math.max(0,1-hit.age/.13);ctx.save();ctx.translate(hit.x,hit.y);ctx.globalAlpha=fade;ctx.fillStyle='#fff1b4';ctx.beginPath();ctx.arc(0,0,3+fade*5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f3ae4c';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*4,Math.sin(a)*4);ctx.lineTo(Math.cos(a)*(9+fade*8),Math.sin(a)*(9+fade*8));ctx.stroke();}ctx.restore();}
  }
  function hitTank(s, victim) {
    if(!victim.alive||victim.mounted)return;
    if(victim.shieldTime>0) return;
    if(victim===tank&&tank.swivelTime>0){
      const angle=Number.isFinite(s.sourceX)?Math.atan2(s.sourceY-tank.y,s.sourceX-tank.x):Number.isFinite(s.vx)?Math.atan2(-s.vy,-s.vx):null;
      if(angle!==null&&Math.abs(angleDelta(tank.turret,angle))<=Math.PI/2){s.life=0;return;}
    }
    if(s.disruptor){s.life=0;disruptTank(victim);return;}
    if(victim!==tank&&Levels.aiTypes[victim.type]?.armored){
      s.life=0;if(s.fireDamage&&victim.fireGrace>0)return;
      if(s.fireDamage)victim.fireGrace=.35;
      victim.health=(victim.health??3)-1;victim.hitFlash=.14;
      if(victim.health>0){puff(victim.x,victim.y);sound('impact');return;}
    }
    if(victim === tank && campaignCombat) {
      s.life=0;
      if(hitGrace>0)return;
      playerHearts=Math.max(0,playerHearts-1);campaignCombat.hearts=playerHearts;
      Levels.renderHearts(document.getElementById('combat-hearts'),playerHearts,campaignCombat.maxHearts);
      campaignCombat.onHealthChange?.(playerHearts);
      if(playerHearts>0){hitGrace=1.2;playerHitEffect(s);puff(tank.x,tank.y);sound('impact');return;}
    }
    s.life = 0; victim.flame = null; victim.alive = false; victim.vx = 0; victim.vy = 0;
    if(victim!==tank){puff(victim.x,victim.y,true);addScorch(victim.x,victim.y,32);sound('explosion');bursts.push({x:victim.x,y:victim.y,age:0});}
    if(victim===tank&&campaignCombat&&playerUpgrades.forgiveness){
      mineBlast(tank,225,true);
      if(combatEnemies().every(e=>!e.alive)){tank.alive=true;playerHearts=1;campaignCombat.hearts=1;hitGrace=1.2;Levels.renderHearts(document.getElementById('combat-hearts'),1,campaignCombat.maxHearts);campaignCombat.onHealthChange?.(1);}
    }
    if(victim===tank&&!tank.alive)beginPlayerDeath(s);
  }
  function finishRound() {
    if(abilityState.shieldTime>0){abilityState.shieldTime=0;abilityState.shieldCooldown=13;tank.shieldTime=0;}
    publishAbilities(true);
    phase = tank.alive ? 'won' : 'lost';for(const e of enemies){e.vx=0;e.vy=0;} keys.clear(); stopEngine(); stopRocketAudio();
    document.getElementById('result-title').textContent = phase === 'won' ? 'Room cleared' : 'Tank destroyed';
    document.getElementById('result-detail').hidden = phase === 'won';
    document.getElementById('result-detail').textContent = phase === 'won' ? '' : campaignCombat?'Your tank is out of hearts.':'One hit is all it takes. Try using the cover.';
    document.getElementById('play-again').textContent = phase === 'won' ? 'Play again' : 'Play again · R';
    result.hidden = false;
    window.TankGame.onRoundEnd?.({ won: phase === 'won', hearts: playerHearts });
  }
  function updateEffects(dt) {
    for(const h of hitImpacts)h.age+=dt;hitImpacts=hitImpacts.filter(h=>h.age<.13);tank.hitFlash=Math.max(0,(tank.hitFlash||0)-dt);
    for(const m of groundMarks)m.age+=dt;groundMarks=groundMarks.filter(m=>m.age<m.life);
    for(const f of muzzleFlashes)f.age+=dt;muzzleFlashes=muzzleFlashes.filter(f=>f.age<.09);
    for(const t of [tank,...enemies])t.recoil=Math.max(0,(t.recoil||0)-dt);
    for(const p of embers){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    embers=embers.filter(p=>p.age<p.life);
    for (const p of smoke) { p.age += dt; p.x += p.driftX * dt; p.y += p.driftY * dt; }
    smoke = smoke.filter(p => p.age < p.life);
    for (const b of bursts) b.age += dt;
    bursts = bursts.filter(b => b.age < (b.duration||.65));
  }
  function update(dt) {
    if (editing || !active) { stopEngine(); stopRocketAudio(); return; }
    if(countdown>0){
      const previousNumber=Math.ceil(countdown);
      countdown=Math.max(0,countdown-dt);if(countdown<1e-8)countdown=0;
      if(countdown>0&&Math.ceil(countdown)!==previousNumber&&!muted)window.TankUIAudio?.countdown();
      const overlay=document.getElementById('combat-countdown');overlay.hidden=countdown===0;overlay.textContent=String(Math.ceil(countdown));
      stopEngine();stopRocketAudio();return;
    }
    if(phase!=='playing'){for(const b of mineBlasts)b.age+=dt;mineBlasts=mineBlasts.filter(b=>b.age<.65);}
    updateEffects(dt);
    if(phase==='dying'){updatePlayerDeath(dt);return;}
    if (phase !== 'playing') { stopRocketAudio(); return; }
    updatePlayerAbilities(dt);
    hitGrace = Math.max(0, hitGrace - dt);
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
    stampTracks(tank,ox,oy);
    tank.vx=dt>0?(tank.x-ox)/dt:0;tank.vy=dt>0?(tank.y-oy)/dt:0;
    movementSound(Math.hypot(tank.x - ox, tank.y - oy) > .001, dt);
    updateAim(dt);

    applyShieldContact();
    updateDuplicators(dt);
    for (const e of enemies) updateShield(dt,e);
    for (const e of enemies) updateMobileEnemy(dt, e);
    for (const e of enemies) updateEnemy(dt, e);
    const steps = Math.max(1, Math.ceil(dt * 240)), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      updateMortars(step);if(phase==='dying')break;
      updateMines(step);if(phase==='dying')break;
      applyFlames();if(phase==='dying')break;
      for (const s of shells) {
        if (s.life <= 0) continue;
        steerSmartBullet(s,step);
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
      applyFlames();
      for (let a = 0; a < shells.length; a++) {
        const first = shells[a]; if (first.life <= 0) continue;
        for (let b = a + 1; b < shells.length; b++) {
          const second = shells[b]; if (second.life <= 0) continue;
          const touching=rectanglesOverlap(shellBox(first,true),shellBox(second,true));
          if(!touching){first.shieldContacts?.delete(second);second.shieldContacts?.delete(first);continue;}
          if(first.shieldContacts?.has(second))continue;
          cancelBulletPair(first,second);
          if(first.life<=0)break;
        }
      }
      for(const s of shells)if(s.life>0){const m=mines.find(m=>!(m.armTime>0)&&circleHitsBox(m,m.flight?mineRadius*.5:mineRadius,shellBox(s)));if(m){s.life=0;if(m.flight)detonateMine(m);else launchMine(m);}}
      for (const s of shells) if (s.life > 0) {
        if(phase==='dying')break;
        for (const victim of [tank, ...enemies]) {
          if (victim.alive && !victim.mounted && rectanglesOverlap(shellBox(s), hullBox(victim))) { hitTank(s, victim); break; }
        }
      }
      if(phase==='dying')break;
      if (!tank.alive || combatEnemies().every(e => !e.alive)) { finishRound(); break; }
    }
    shells = shells.filter(s => s.life > 0);
    syncRocketAudio();
  }

  function stampTracks(t,ox,oy){
    const distance=Math.hypot(t.x-ox,t.y-oy);if(distance<.01)return;
    t.trackDistance=(t.trackDistance||0)+distance;if(t.trackDistance<8)return;t.trackDistance%=8;
    const muddy=inMud(t);groundMarks.push({x:t.x,y:t.y,angle:t.hull,age:0,life:25,type:'treads',mud:muddy});
    if(muddy)for(const side of [-1,1])groundMarks.push({x:t.x-Math.sin(t.hull)*side*28,y:t.y+Math.cos(t.hull)*side*28,angle:t.hull+side*.4,age:0,life:.35,type:'mudfleck'});if(groundMarks.length>8000)groundMarks.shift();
  }
  function addScorch(x,y,radius=12){groundMarks.push({x,y,radius,age:0,life:8,type:'scorch'});if(groundMarks.length>8000)groundMarks.shift();}
  function drawGround(){
    if(!groundCanvas){
      groundCanvas=document.createElement('canvas');groundCanvas.width=world.width;groundCanvas.height=world.height;const g=groundCanvas.getContext('2d');
      g.fillStyle='#f0ecdf';g.fillRect(0,0,world.width,world.height);
      const hash=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
      for(let i=0;i<world.width*world.height/110;i++){const x=hash(i*3)*world.width,y=hash(i*3+1)*world.height;g.fillStyle=i%3?'rgba(113,99,69,.035)':'rgba(255,255,244,.2)';g.fillRect(x,y,1+hash(i*3+2)*2,1);}
      Levels.paintMud(g,mud,100,{columns:world.width/100,rows:world.height/100,walls});
      // Sparse worn paper flecks keep the arena legible rather than busy.
      for(let i=0;i<world.width*world.height/28000;i++){const x=hash(i+9001)*world.width,y=hash(i+10001)*world.height;g.strokeStyle='#afa48818';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+3+hash(i+11001)*5,y+1);g.stroke();}
    }
    ctx.drawImage(groundCanvas,0,0);
    for(const m of groundMarks){const opacity=Math.max(0,1-m.age/m.life);ctx.save();ctx.translate(m.x,m.y);
      if(m.type==='treads'){ctx.rotate(m.angle);ctx.fillStyle=m.mud?`rgba(75,54,32,${opacity*.4})`:`rgba(112,101,76,${opacity*.14})`;for(const y of [-29,18])for(const x of [-4,0,4])ctx.fillRect(x,y,2,11);}
      else if(m.type==='mudfleck'){ctx.rotate(m.angle);ctx.fillStyle=`rgba(108,80,46,${opacity*.7})`;ctx.fillRect(m.age*15,-m.age*10,2.5,2);}
      else{const shade=ctx.createRadialGradient(0,0,0,0,0,m.radius);shade.addColorStop(0,`rgba(73,61,43,${opacity*.24})`);shade.addColorStop(1,'rgba(73,61,43,0)');ctx.fillStyle=shade;ctx.fillRect(-m.radius,-m.radius,m.radius*2,m.radius*2);}
      ctx.restore();
    }
  }
  function drawCover(w){
    const {x,y,width,height}=w;
    ctx.fillStyle='#a7aa96';ctx.fillRect(x,y,width,height);
    ctx.fillStyle='#c9cbb8';ctx.fillRect(x+4,y+4,width-8,height-9);
    ctx.fillStyle='#e3e2ce';ctx.fillRect(x,y,width,4);ctx.fillRect(x,y,4,height);
    ctx.fillStyle='#909683';ctx.fillRect(x+width-5,y+4,5,height-4);ctx.fillRect(x+4,y+height-5,width-4,5);
    ctx.strokeStyle='#a4aa9511';ctx.lineWidth=1;for(let i=12;i<width-6;i+=13){ctx.beginPath();ctx.moveTo(x+i,y+7);ctx.lineTo(x+i+6,y+height-9);ctx.stroke();}
    ctx.strokeStyle='#7e887a66';ctx.strokeRect(x+.5,y+.5,width-1,height-1);
    if((Math.floor(x/100)+Math.floor(y/100)*3)%4===0){ctx.strokeStyle='#8b958177';ctx.beginPath();ctx.moveTo(x+width*.7,y+5);ctx.lineTo(x+width*.65,y+16);ctx.lineTo(x+width*.73,y+24);ctx.lineTo(x+width*.69,y+31);ctx.moveTo(x+width*.65,y+16);ctx.lineTo(x+width*.56,y+20);ctx.stroke();}
  }
  function drawMuzzleFlashes(){
    for(const f of muzzleFlashes){const alpha=1-f.age/.09;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);if(f.sniper)ctx.scale(2,2);ctx.globalAlpha=alpha;ctx.fillStyle=f.sniper?'#62baff':'#f9ae40';ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(8,-9);ctx.lineTo(6,-3);ctx.lineTo(21,0);ctx.lineTo(6,3);ctx.lineTo(8,9);ctx.lineTo(-3,5);ctx.closePath();ctx.fill();ctx.fillStyle=f.sniper?'#e2f7ff':'#fff2b0';ctx.beginPath();ctx.moveTo(-3,-3);ctx.lineTo(12,0);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();ctx.restore();}
  }
  function drawHole(ctx, x, y, size) {
    ctx.save();ctx.strokeStyle='#aa9f8360';ctx.lineWidth=2;ctx.setLineDash([5,9,2,12]);ctx.beginPath();ctx.arc(x+size/2,y+size/2,size*.485,0,Math.PI*2);ctx.stroke();ctx.restore();
    const cx=x+size/2, cy=y+size/2, radius=size*.47;
    ctx.fillStyle='#a19c8d'; ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.fill();
    const shade=ctx.createRadialGradient(cx,cy+size*.12,size*.08,cx,cy,radius*.94);
    shade.addColorStop(0,'#b9b8ad'); shade.addColorStop(.75,'#c7c6ba'); shade.addColorStop(1,'#a3a396');
    ctx.fillStyle=shade; ctx.beginPath(); ctx.arc(cx,cy,radius*.92,0,Math.PI*2); ctx.fill();
  }
  function drawTank(t, isEnemy) {
    if(t.mounted){ctx.save();ctx.translate(t.x,t.y);Levels.paintSentry(ctx,t.type==='wallRocket',t.turret,(t.recoil||0)/.11);ctx.restore();return;}
    const palette = isEnemy ? Levels.aiTypes[t.type].palette : {
      tracks: '#244c7b', tread: '#6383a8', body: '#286ec9', front: '#4d93ec', barrel: '#225ba4', turret: '#3c83de', hatch: '#70a8f0'
    };
    if (!t.alive&&!(t===tank&&deathSequence&&!deathSequence.exploded)) {
      ctx.save();ctx.translate(t.x,t.y);
      // Dry, uneven pencil strokes use stable position-based grain, never gameplay RNG.
      const grain=i=>Math.sin(t.x*.137+t.y*.193+i*7.31);
      ctx.rotate(grain(0)*.12);ctx.lineCap='butt';ctx.lineJoin='round';
      for(const direction of [-1,1])for(let pass=0;pass<7;pass++){
        ctx.strokeStyle=isEnemy?'rgba(120,76,61,.25)':'rgba(65,90,111,.25)';
        ctx.lineWidth=pass===0?3: .65+(pass%3)*.35;
        const offset=grain(pass+direction*11)*2.4,extent=17+grain(pass+30)*2;
        ctx.beginPath();
        for(let step=0;step<=7;step++){
          const x=-extent+step/7*extent*2,y=x*direction+offset+grain(step+pass*9)*1.15;
          if(step===0|| (pass>3&&step===4))ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      ctx.restore(); return;
    }
    if(t===tank&&t.swivelTime>0&&!(t.shieldTime>0)){
      ctx.save();ctx.fillStyle='rgba(85,174,239,.15)';ctx.strokeStyle='#6ebee8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.arc(t.x,t.y,48,t.turret-Math.PI/2,t.turret+Math.PI/2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    if(t.shieldTime>0){
      ctx.save();ctx.globalAlpha=.7*Math.min(1,t.shieldTime/.6);
      ctx.fillStyle='rgba(55,155,255,.22)';ctx.strokeStyle='#479eff';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(t.x,t.y,t.shieldRadius||48,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    }
    ctx.save();if(t.dupSpawnTime>0)ctx.globalAlpha=.2+.8*(1-t.dupSpawnTime/.45);if(t===tank&&hitGrace>0)ctx.globalAlpha=Math.floor(hitGrace*12)%2?.35:1;
    ctx.translate(t.x+(t===tank&&deathSequence&&!deathSequence.exploded?Math.sin(deathSequence.elapsed*120)*2:0),t.y);ctx.scale(scale,scale);
    Levels.paintTank(ctx,palette,{hull:t.hull,turret:t.turret,tread:isEnemy?t.tread||0:tread,recoil:(t.recoil||0)/.11,type:isEnemy?t.type:'player',damage:t===tank&&deathSequence&&!deathSequence.exploded?2:isEnemy&&Levels.aiTypes[t.type].armored?3-(t.health??3):0,glintTime:t.age||0,heat:t.flame?flameReach(t)/flameRange:t.shieldTime?1:0,warning:isEnemy&&(t.type==='navy'?t.charge>=.6:t.charge>0&&(!Levels.aiTypes[t.type].elite||Math.floor(t.charge*12)%2===0))});
    ctx.restore();
    if(isEnemy&&t.stunTime>0){
      ctx.save();ctx.strokeStyle='#9cf5ff';ctx.shadowColor='#53b4ff';ctx.shadowBlur=8;ctx.lineWidth=2;
      for(let i=0;i<3;i++){const a=t.stunVisualAge*8+i*Math.PI*2/3,x=t.x+Math.cos(a)*35,y=t.y+Math.sin(a)*35;ctx.beginPath();ctx.moveTo(x-6,y-11);ctx.lineTo(x+4,y-3);ctx.lineTo(x-3,y+3);ctx.lineTo(x+6,y+11);ctx.stroke();}ctx.restore();
    }
  }
  function render() {
    if (editing) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);ctx.fillStyle='#e4dbc7';ctx.fillRect(0,0,canvas.width,canvas.height); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
    drawGround();
    if(camera.zoom<1){ctx.strokeStyle='#8b967b';ctx.lineWidth=1/camera.zoom;ctx.strokeRect(0,0,world.width,world.height);}
    ctx.beginPath();ctx.rect(0,0,world.width,world.height);ctx.clip();
    // Ground decals are always beneath walls, shells, and every living tank.
    if (!tank.alive&&!(deathSequence&&!deathSequence.exploded)) drawTank(tank, false);
    for (const e of enemies) if (!e.alive) drawTank(e, true);
    drawMines();drawMortarMarkers();
    drawEnergyWaves();
    for(const e of enemies)drawFlamethrower(e);
    for (const w of walls) {
      if (w.type === 'hole') { drawHole(ctx, w.x, w.y, w.width); continue; }
      drawCover(w);
    }
    if (tank.alive && phase === 'playing') {
      ctx.strokeStyle = '#4386df'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2);
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(mouse.x + x * 13.5, mouse.y + y * 13.5); ctx.lineTo(mouse.x + x * 21, mouse.y + y * 21); } ctx.stroke();
    }
    for (const s of shells) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
      if(s.rocket||s.playerRocketStacks||s.sniper){
        const flameScale=s.sniper?1:s.rocket?rocketFlameScale:.45+.25*(s.playerRocketStacks-1);
        const rear=-bulletWidth*shellLengthScale(s)/2,length=(18+Math.sin(s.life*83)*3+Math.sin(s.life*47)*2)*flameScale;
        ctx.fillStyle=s.sniper?'#2488ff':'#ed7b32';ctx.beginPath();ctx.moveTo(rear,-3.5*flameScale);ctx.lineTo(rear-length*.45,-2.5*flameScale);ctx.lineTo(rear-length,0);ctx.lineTo(rear-length*.5,2.5*flameScale);ctx.lineTo(rear,3.5*flameScale);ctx.closePath();ctx.fill();
        ctx.fillStyle=s.sniper?'#63d5ff':'#ffd076';ctx.beginPath();ctx.moveTo(rear,-2.5*flameScale);ctx.lineTo(rear-length*.7,0);ctx.lineTo(rear,2.5*flameScale);ctx.closePath();ctx.fill();
        ctx.fillStyle=s.sniper?'#e0faff':'#fff3c2';ctx.beginPath();ctx.moveTo(rear,-1.3*flameScale);ctx.lineTo(rear-length*.35,0);ctx.lineTo(rear,1.3*flameScale);ctx.closePath();ctx.fill();
      }
      if(s.disruptor){ctx.strokeStyle='rgba(177,128,224,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,bulletWidth*.62,bulletHeight*.7,0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle = s.smart?'#487f54':s.sniper?'#244a79':s.disruptor?'#9c66cf':s.rocket ? '#217e79' : s.owner !== tank ? '#8c5539' : '#506174'; 
      const front=bulletWidth*shellLengthScale(s)/2, rear=-front, halfHeight=bulletHeight*shellWidthScale(s)/2;
      ctx.beginPath();ctx.moveTo(rear,-halfHeight);
      if(s.rocket){
        ctx.lineTo(front-bulletHeight*.8,-halfHeight);ctx.lineTo(front,0);ctx.lineTo(front-bulletHeight*.8,halfHeight);
      } else {
        ctx.lineTo(front-halfHeight,-halfHeight);
        ctx.arc(front-halfHeight,0,halfHeight,-Math.PI/2,Math.PI/2);
      }
      ctx.lineTo(rear,halfHeight);ctx.closePath();ctx.fill();
      if(s.bulletShield>0){
        ctx.save();ctx.globalAlpha=.7;
        ctx.fillStyle='rgba(55,155,255,.22)';ctx.strokeStyle='#479eff';ctx.lineWidth=2.5;
        const shieldRadius=Math.hypot(front,halfHeight)+5;
        ctx.beginPath();ctx.arc(0,0,shieldRadius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      }
      ctx.restore();
    }
    for(const p of embers){const age=p.age/p.life;ctx.save();ctx.globalAlpha=(1-age)*.8;ctx.fillStyle=age<.5?'#ffc05a':'#da6b32';ctx.beginPath();ctx.arc(p.x,p.y,1.8*(1-age)+.4,0,Math.PI*2);ctx.fill();ctx.restore();}
    if (tank.alive||deathSequence&&!deathSequence.exploded) drawTank(tank, false); for (const e of enemies) if (e.alive) drawTank(e, true);
    drawMortarShells();drawDuplicationEffects();drawMuzzleFlashes();drawHitImpacts();
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
    drawMineBlasts();
    for (const b of bursts) {
      const progress = b.age / (b.duration||.65);
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
      `${currentLevel.name} · ${active ? 'Playing' : 'Paused'} · ${combatEnemies().filter(e => e.alive).length} AI remaining · ${playerShotCount()} / ${playerAmmoLimit()} shells`;
    if (message !== previousStatus) { status.textContent = message; previousStatus = message; }
  }
  function frame(time) { const dt = Math.min((time - last) / 1000 || 0, 1 / 30); last = time; update(dt); render(); requestAnimationFrame(frame); }
  window.TankGame = {
    getLevel: () => Levels.clone(currentLevel),
    setEditing(value) { editing = value; if(value)document.getElementById('combat-countdown').hidden=true; keys.clear(); active = !value && !document.hidden; stopEngine(); stopRocketAudio(); result.hidden = true; },
    loadLevel(input, options = {}) { const next = Levels.validate(input); const maxHearts=Number.isInteger(options.maxHearts)?clamp(options.maxHearts,1,1000):3; campaignCombat = (options.campaign||options.testLoadout) ? { ...options, maxHearts, hearts: clamp(Math.floor(options.hearts || 3),1,maxHearts) } : null; if(campaignCombat?.testLoadout)campaignCombat.testStartingHearts=campaignCombat.hearts; currentLevel = next; editing = false; restart(); }
  };
  restart(); requestAnimationFrame(frame);
})();
