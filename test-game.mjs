import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('./game.js', import.meta.url), 'utf8');
const elements = {};
const element = () => ({ style: {}, hidden: false, textContent: '', addEventListener() {}, appendChild() {}, setAttribute() {}, focus() {}, getContext() { return {}; } });
const context = {
  console, Math,
  Audio: class { constructor() { this.paused = true; this.plays = 0; } addEventListener() {} play() { this.plays++; return Promise.resolve(); } pause() { this.paused = true; } },
  document: { hidden: false, getElementById(id) { return elements[id] ??= element(); }, createElement: element, body: element(), addEventListener() {} },
  window: { addEventListener() {} }, requestAnimationFrame() {}
};
vm.runInNewContext(fs.readFileSync(new URL('./levels.js', import.meta.url), 'utf8'), context);
const tests = `
let passed=0;
function check(ok,label){if(!ok)throw new Error(label);passed++;}
function setup(){restart();active=true;
world.width=1000;world.height=625;
walls.splice(0,walls.length,{x:300,y:160,width:40,height:205},{x:465,y:420,width:175,height:35},{x:660,y:220,width:40,height:175});
Object.assign(tank,{x:180,y:470,hull:-Math.PI/2,turret:-.46});
Object.assign(enemy,{x:820,y:155,hull:Math.PI/2,turret:2.68,reload:999});enemies=[enemy];}

function run(seconds){for(let i=0;i<Math.ceil(seconds*240);i++)update(1/240);}
function bullet(x,y,vx,vy,owner=tank){return{x,y,vx,vy,owner,bounces:0,life:8,smokeDistance:0};}
setup();check(canMove(tank.x,tank.y),'Player spawn is clear');check(!walls.some(w=>circleWall(enemy.x,enemy.y,44,w)),'Enemy spawn is clear');
tank.x=250;tank.y=250;keys.add('d');run(1);check(canOccupy(tank.x,tank.y)&&polygonBounds(footprint(tank)).right<=300.001,'Wall blocks tank movement');check(tank.alive,'Movement into wall does not kill tank');
setup();tank.x=250;tank.y=250;keys.add('d');keys.add('s');run(.5);check(tank.y>250&&canOccupy(tank.x,tank.y),'Tank slides along cover');
setup();tank.x=50;tank.y=100;keys.add('a');run(1);check(Math.abs(polygonBounds(footprint(tank)).left)<.001,'Arena boundary blocks movement');
setup();check(!lineOfSight(),'Initial cover blocks enemy line of sight');run(4);check(shells.length===0,'Enemy does not fire through cover');
setup();tank.x=180;tank.y=100;enemy.y=100;enemy.turret=Math.PI;enemy.reload=0;check(lineOfSight(),'Open lane has line of sight');run(.6);check(shells.length===0,'Enemy telegraphs before firing');run(.12);check(shells.some(s=>s.owner===enemy&&Math.abs(Math.hypot(s.vx,s.vy)-240)<.01),'Enemy fires slower shell');
setup();tank.x=100;tank.y=100;enemy.x=900;enemy.y=100;enemy.turret=0;updateEnemy(.1);check(Math.abs(enemy.turret)<=.08501,'Enemy turning speed is limited');
setup();tank.x=100;tank.y=100;enemy.x=900;enemy.y=100;shells=[bullet(240,250,380,0)];run(.2);check(shells.length===1&&shells[0].vx<0&&shells[0].bounces===1,'Cover reflects shell once');run(1);check(shells.length===0,'Second impact removes shell');
setup();tank.x=100;tank.y=100;enemy.x=900;enemy.y=100;shells=[bullet(300,520,380,0),bullet(500,520,-380,0)];run(.3);check(shells.length===0,'Opposing shells cancel');check(smoke.some(p=>p.opacity===.4),'Shell cancellation emits puff');
setup();tank.x=100;tank.y=100;enemy.x=900;enemy.y=100;shells=[bullet(400,520,380,0),bullet(500,420,0,380)];run(.3);check(shells.length===0,'Crossing shots cancel');
setup();tank.x=250;tank.y=250;shells=[bullet(750,250,-240,0,enemy)];run(1);check(tank.alive&&phase==='playing','Cover protects tank from enemy shell');
setup();shells=[bullet(750,155,380,0)];run(.2);check(phase==='won'&&!enemy.alive&&tank.alive,'Enemy destruction wins room');check(!result.hidden,'Victory overlay appears');check(bursts.length>0,'Destruction animation starts');check(pools.impact.some(a=>a.plays>0),'Destruction impact sound plays');
const winX=tank.x;keys.add('d');run(.1);check(tank.x===winX&&shells.length===0,'Win stops combat');
setup();shells=[bullet(180,530,0,-240,enemy)];run(.2);check(phase==='lost'&&!tank.alive,'Enemy shell destroys player');check(!result.hidden,'Loss overlay appears');
setup();tank.x=100;tank.y=100;tank.turret=-Math.PI/2;mouse={x:100,y:0};fire();run(.35);check(phase==='lost','Own ricochet can destroy player');
setup();check(phase==='playing'&&tank.alive&&enemy.alive&&shells.length===0&&smoke.length===0&&bursts.length===0&&result.hidden,'Restart resets entire round');
for(let i=0;i<7;i++){cooldown=0;fire();}check(shells.length===5,'Player shell cap remains five');
setup();active=false;keys.add('d');run(.2);check(tank.x===180&&enemy.reload===999,'Pause freezes combat');

setup();check(Math.abs(bulletWidth-21.82125)<1e-8&&Math.abs(bulletHeight-10.910625)<1e-8,'All bullets are 15 percent larger than previous size');
check(Math.abs(bulletHitHalfLength*2/bulletWidth-1.1)<1e-8&&Math.abs(bulletHitHalfWidth*2/bulletHeight-1.1)<1e-8,'Wall collision padding remains 10 percent larger than visible shells');
setup();tank.x=100;tank.y=100;enemy.x=900;enemy.y=100;shells=[bullet(400,520,380,0),bullet(400,527.9,380,0)];run(1/240);check(shells.length===0,'Enlarged collision box catches close shell passes');
setup();tank.x=500;tank.y=100;tank.hull=0;enemy.hull=0;enemy.x=561;enemy.y=100;keys.add('d');run(.8);
check(Math.abs(tank.x-527)<.01,'Pushing moves player at 25 percent normal speed');
check(Math.abs(enemy.x-588)<.01,'Enemy is nudged by player contact');
check(!tankContact(tank,enemy),'Pushing keeps tanks separated');
setup();tank.x=500;tank.y=100;tank.hull=0;enemy.hull=0;enemy.x=561;enemy.y=100;tank.hull=Math.PI;keys.add('a');run(.5);check(Math.abs(tank.x-432.5)<.01&&enemy.x===561,'Retreat from tank uses normal speed');
setup();tank.x=568.5;tank.y=300;tank.hull=0;enemy.hull=0;enemy.x=629.5;enemy.y=300;keys.add('d');run(.5);check(Math.abs(tank.x-568.5)<.001&&Math.abs(enemy.x-629.5)<.001,'Cannot push enemy through cover');
setup();tank.x=908.5;tank.y=100;tank.hull=0;enemy.hull=0;enemy.x=969.5;enemy.y=100;keys.add('d');run(.5);check(Math.abs(tank.x-908.5)<.001&&Math.abs(enemy.x-969.5)<.001,'Cannot push enemy outside arena');
setup();tank.x=500;tank.y=100;tank.hull=0;enemy.hull=0;enemy.x=561;enemy.y=100;keys.add('d');keys.add('s');run(.1);check(!tankContact(tank,enemy),'Diagonal pushing keeps tanks separate');
for(let i=0;i<36;i++){setup();tank.x=150;tank.y=100;tank.hull=0;tank.turret=i*Math.PI/18;emitShot(tank,380);check(!rectanglesOverlap(shellBox(shells[0]),hullBox(tank)),'Muzzle clears enlarged shell at angle '+i);}

function rejects(fn,label){let rejected=false;try{fn()}catch{rejected=true}check(rejected,label);}
const template=Levels.clone(Levels.defaultLevel);template.grid.rows=9;check(Levels.validate(template).grid.columns===12&&Levels.validate(template).grid.rows===9,'Template validates');
check(Levels.compile(template).width===1200&&Levels.compile(template).height===900,'Rectangular arena compiles with square cells');
const invalid=Levels.clone(template);invalid.enemies[0].facing='diagonal';check(Levels.validate(invalid).enemies[0].facing==='north','Imported directions normalize to north');
invalid.enemies[0].facing='south';invalid.enemies[0].type='unknown';rejects(()=>Levels.validate(invalid),'Unknown AI types rejected');
invalid.enemies[0].type='sentry';invalid.enemies[0].column=.5;rejects(()=>Levels.validate(invalid),'Off-grid coordinates rejected');
invalid.enemies[0].column=template.player.column;invalid.enemies[0].row=template.player.row;rejects(()=>Levels.validate(invalid),'Overlapping objects rejected');
const blank={version:1,name:'Blank',grid:{columns:10,rows:10,cellSize:100},player:null,enemies:[],walls:[]};check(Levels.validate(blank,false).player===null,'Incomplete drafts can be saved');rejects(()=>Levels.compile(blank),'Missing spawn blocks playtesting');
const roundtrip=Levels.validate(JSON.parse(JSON.stringify(template)));check(JSON.stringify(roundtrip)===JSON.stringify(Levels.validate(template)),'Level export/import roundtrip preserves placements');
const multi={version:1,name:'Two enemies',grid:{columns:10,rows:10,cellSize:100},player:{column:1,row:8,facing:'north'},enemies:[{column:7,row:1,type:'sentry',facing:'south'},{column:8,row:3,type:'sentry',facing:'west'}],walls:[]};
window.TankGame.loadLevel(multi);check(enemies.length===2&&world.height===1000,'Loads multiple AI spawns and grid size');
check(enemies.every(e=>e.hull===-Math.PI/2&&e.turret===-Math.PI/2),'Every loaded AI starts north');
for(const e of enemies)e.reload=999;
shells=[bullet(enemies[0].x,enemies[0].y+50,0,-380)];run(.1);check(!enemies[0].alive&&enemies[1].alive&&phase==='playing','Room continues after first AI is destroyed');
shells=[bullet(enemies[1].x,enemies[1].y+50,0,-380)];run(.1);check(phase==='won','Win requires eliminating all AI');
restart();check(enemies.length===2&&enemies.every(e=>e.alive),'Restart restores every AI spawn');
enemies.forEach(e=>e.reload=0);active=true;run(3.5);check(shells.some(s=>s.owner===enemies[0])&&shells.some(s=>s.owner===enemies[1]),'Each AI aims and fires independently');
window.TankGame.setEditing(true);const frozenX=tank.x;keys.add('d');run(.2);check(tank.x===frozenX,'Editor pauses combat');
const beforeInvalid=JSON.stringify(window.TankGame.getLevel());rejects(()=>window.TankGame.loadLevel(blank),'Invalid level cannot replace current room');check(JSON.stringify(window.TankGame.getLevel())===beforeInvalid,'Failed level load is transactional');
window.TankGame.loadLevel(multi);enemies.forEach(e=>e.reload=999);tank.x=500;tank.y=100;tank.hull=0;Object.assign(enemies[0],{x:561,y:100,hull:0});Object.assign(enemies[1],{x:622,y:100,hull:0});keys.add('d');run(.2);check(Math.abs(tank.x-500)<.001&&Math.abs(enemies[0].x-561)<.001,'Pushing cannot overlap a second AI tank');

function safetySetup(){setup();walls.splice(0);tank.x=850;tank.y=100;Object.assign(enemy,{x:150,y:100,hull:0,turret:0,reload:0,charge:0});const ally={x:450,y:100,hull:0,turret:0,alive:true,type:'sentry',reload:999,charge:0};enemies=[enemy,ally];return ally;}
let ally=safetySetup();check(!safeAIShot(enemy,240),'Direct shot toward ally is blocked');
for(let i=0;i<120;i++)updateEnemy(1/60,enemy);check(shells.length===0&&enemy.charge===0,'AI holds fire while ally blocks path');
ally.y=300;for(let i=0;i<45;i++)updateEnemy(1/60,enemy);check(shells.some(s=>s.owner===enemy),'AI resumes firing after ally clears path');
ally=safetySetup();ally.y=180;check(safeAIShot(enemy,240),'Off-path ally does not block firing');
ally.y=136;check(!safeAIShot(enemy,240),'Small safety margin protects close passes');
ally=safetySetup();ally.alive=false;check(safeAIShot(enemy,240),'Destroyed ally does not block firing');
ally=safetySetup();tank.x=300;ally.x=600;check(safeAIShot(enemy,240),'Player stops shell before ally behind player');
ally=safetySetup();tank.y=500;ally.x=100;check(!safeAIShot(enemy,240),'Reflected shot toward ally is blocked');
ally=safetySetup();tank.y=500;ally.x=100;walls.push({x:700,y:50,width:50,height:100});check(!safeAIShot(enemy,240),'Cover ricochet toward ally is blocked');
ally=safetySetup();tank.y=500;ally.x=850;walls.push({x:600,y:0,width:50,height:world.height});check(safeAIShot(enemy,240),'Wall shielding ally prevents false obstruction');
ally=safetySetup();tank.y=500;ally.y=300;ally.vy=-160;check(!safeAIShot(enemy,240),'Known ally movement into shot path is predicted');
ally=safetySetup();enemy.turret=Math.PI/4;tank.y=500;ally.x=350;ally.y=300;ally.hull=Math.PI/4;check(!safeAIShot(enemy,240),'Angled shot checks rotated ally hull');
ally=safetySetup();const before=JSON.stringify({shells,smoke,bursts,enemy,ally});safeAIShot(enemy,240);check(JSON.stringify({shells,smoke,bursts,enemy,ally})===before,'Shot preview has no gameplay side effects');
check(Levels.compile(Levels.builtInLevels['level-5']).enemies.length===8,'Level 5 loads eight AI tanks');

check(Levels.aiTypes.brown.mobile&&Levels.aiTypes.brown.moveSpeed<movementSpeed,'Brown moves slower than player');
check(Levels.aiTypes.sentry.label==='Tan (Stationary)'&&Levels.aiTypes.brown.label==='Brown (Mobile)','Tank types have requested names');
const mobileFixture=Levels.clone(Levels.builtInLevels['level-1']);mobileFixture.name='Mobile fixture';mobileFixture.enemies[0].type='brown';mobileFixture.enemies.push({column:9,row:1,facing:'north',type:'sentry'});
window.TankGame.loadLevel(mobileFixture);active=true;let brown=enemies.find(e=>e.type==='brown');let tan=enemies.find(e=>e.type==='sentry');
check(brown.hull===-Math.PI/2&&brown.vx===0&&brown.path.length===0,'Brown spawn resets movement state and faces north');
let route=planMobileRoute(brown);check(route.length>0,'Brown plans route around cover');
let previous={x:(Math.floor(brown.x/100)+.5)*100,y:(Math.floor(brown.y/100)+.5)*100};let validRoute=true;for(const p of route){if(Math.abs(p.x-previous.x)+Math.abs(p.y-previous.y)!==100||!clearMovement(previous.x,previous.y,p.x,p.y))validRoute=false;previous=p;}check(validRoute,'Route uses cardinal open-cell steps');
const brownStart={x:brown.x,y:brown.y},tanStart={x:tan.x,y:tan.y};let validPositions=true,reachedShot=false;
for(let i=0;i<1800;i++){updateMobileEnemy(1/60,brown);updateMobileEnemy(1/60,tan);if(!canOccupy(brown.x,brown.y,brown)||tankContact(brown,tank)||tankContact(brown,tan))validPositions=false;if(lineOfSight(brown))reachedShot=true;}
check(Math.hypot(brown.x-brownStart.x,brown.y-brownStart.y)>100,'Brown changes position over time');check(validPositions,'Brown stays clear of walls borders player and allies');check(reachedShot,'Brown finds a firing lane around cover');check(tan.x===tanStart.x&&tan.y===tanStart.y,'Tan stays stationary');
restart();brown=enemies.find(e=>e.type==='brown');check(brown.path.length===0&&brown.dodgeCooldown===0&&brown.pendingThreat===null,'Restart clears path and dodge state');
walls.splice(0);tank.x=150;tank.y=450;brown.x=750;brown.y=450;brown.turret=Math.PI;brown.reload=0;brown.burstTimer=100;brown.resting=false;for(const e of enemies)if(e!==brown)e.alive=false;
let firedWhileMoving=false;for(let i=0;i<120;i++){updateMobileEnemy(1/60,brown);updateEnemy(1/60,brown);if(shells.some(s=>s.owner===brown)&&Math.hypot(brown.vx,brown.vy)>0)firedWhileMoving=true;}check(firedWhileMoving,'Brown can fire while moving');
shells=[bullet(brown.x-180,brown.y,380,0)];check(incomingThreat(brown)===shells[0],'Brown notices a nearby incoming player shot');shells[0].vx=-380;check(incomingThreat(brown)===null,'Brown ignores receding shot');shells[0].vx=380;shells[0].owner=tan;check(incomingThreat(brown)===shells[0],'Brown notices incoming allied shots');
brown.x=750;brown.y=450;shells=[bullet(570,450,380,0)];brown.scanTimer=0;brown.dodgeCooldown=0;brown.pendingThreat=null;brown.dodgeTime=0;brown.burstTimer=100;brown.resting=true;
updateMobileEnemy(.01,brown);check(brown.pendingThreat===shells[0]&&brown.dodgeTime===0,'Dodge waits for reaction delay');
const savedRandom=Math.random;Math.random=()=>.1;for(let i=0;i<20;i++)updateMobileEnemy(.01,brown);Math.random=savedRandom;check(brown.dodgeTime>0&&brown.dodgeCooldown>0,'Occasional sideways dodge begins after delay');
check(Math.abs(brown.vy)>0&&Math.abs(brown.vx)<1,'Dodge moves perpendicular to incoming shell');
brown.x=750;brown.y=44;const horizontal=bullet(570,44,380,0);Math.random=()=>.9;const dodged=beginDodge(brown,horizontal);Math.random=savedRandom;check(dodged&&brown.dodgeY>0,'Dodge chooses safe side at arena edge');
walls.push({x:700,y:0,width:100,height:100});check(!beginDodge(brown,horizontal),'Dodge does not enter blocked terrain');walls.splice(0);
restart();brown=enemies.find(e=>e.type==='brown');brown.alive=false;const deadX=brown.x;updateMobileEnemy(.1,brown);check(brown.x===deadX&&brown.vx===0,'Destroyed Brown cannot move');
const brownLevel=Levels.clone(mobileFixture);check(Levels.validate(JSON.parse(JSON.stringify(brownLevel))).enemies.some(e=>e.type==='brown'),'Brown type survives level export/import');

setup();walls.splice(0);tank.x=150;tank.y=500;enemy.x=950;enemy.y=100;tank.turret=0;mouse={x:950,y:500};fire('click');check(shells.length===1,'First click fires immediately');
run(.12);fire('click');check(shells.length===2,'Rapid second click fires before held-fire cooldown');
fire('click');check(shells.length===2,'Click cooldown prevents unlimited instant shots');
setup();walls.splice(0);tank.x=150;tank.y=500;enemy.x=950;enemy.y=100;tank.turret=0;mouse={x:950,y:500};fire();run(.12);fire();check(shells.length===1,'Held firing cadence stays unchanged');
run(.11);fire();check(shells.length===2,'Held firing resumes after original cooldown');
setup();walls.splice(0);tank.x=150;tank.y=500;enemy.x=950;enemy.y=100;tank.turret=0;mouse={x:950,y:500};for(let i=0;i<8;i++){fire('click');run(.115);}check(shells.length===5,'Rapid clicks still respect five-shell cap');
restart();check(clickCooldown===0,'Restart clears click cooldown');

const oldRng=Math.random;let openingSamples=[];for(const value of [.1,.4,.8]){Math.random=()=>value;window.TankGame.loadLevel(mobileFixture);const e=enemies.find(t=>t.type==='brown');openingSamples.push([e.burstTimer,e.routeSeed,JSON.stringify(planMobileRoute(e))]);}Math.random=oldRng;
check(new Set(openingSamples.map(s=>s[0])).size===3,'Brown opening pause varies between rounds');check(new Set(openingSamples.map(s=>s[2])).size>1,'Brown opening routes vary between rounds');
check(openingSamples.every(s=>s[0]>=.05&&s[0]<=.45),'Opening variation remains bounded');
restart();brown=enemies.find(e=>e.type==='brown');brown.age=0;const firstRoute=JSON.stringify(planMobileRoute(brown));check(JSON.stringify(planMobileRoute(brown))===firstRoute,'Route preference stays stable between replans at same age');
check(Levels.aiTypes.brown.moveSpeed===78&&Levels.aiTypes.brown.reload===2,'Variation preserves movement speed and reload tuning');

restart();smoke=[];bursts=[];shells=[];enemies[0].alive=false;const painter=drawTank,order=[];drawTank=(t)=>order.push(t.alive?'living':'grave');
for(const name of ['clearRect','save','restore','translate','scale','fillRect','stroke','beginPath','moveTo','lineTo','arc','setLineDash','rect','clip'])ctx[name]=()=>{};
render();drawTank=painter;check(order[0]==='grave'&&order.slice(1).every(v=>v==='living'),'All death markers draw before every living tank');

setup();mouse={x:100,y:100};pointerTarget={x:500,y:100};aimTracking=true;updateAim(.1);check(mouse.x>100&&mouse.x<500,'Crosshair eases toward pointer instead of snapping');check(Math.abs(tank.turret-Math.atan2(mouse.y-tank.y,mouse.x-tank.x))<1e-8,'Turret follows delayed crosshair');
mouse={x:100,y:100};updateAim(.1);const oneStep=mouse.x;mouse={x:100,y:100};updateAim(.05);updateAim(.05);check(Math.abs(mouse.x-oneStep)<1e-8,'Aim smoothing is frame-rate independent');
const beforeClick=mouse.x;fire('click');check(mouse.x===beforeClick,'Firing does not snap crosshair');
restart();check(!aimTracking&&pointerTarget.x===mouse.x&&pointerTarget.y===mouse.y,'Restart clears old pointer lag');

setup();tank.x=280;tank.y=398;tank.hull=0;check(circleWall(tank.x,tank.y,44,walls[0])&&canOccupy(tank.x,tank.y),'Screenshot regression: hull clears corner that old circle blocked');movePlayer(1,0,.5);check(tank.x>340&&canOccupy(tank.x,tank.y),'Tank moves right underneath wall corner');
setup();tank.x=269.5;tank.y=250;tank.hull=0;movePlayer(0,1,.3);check(tank.y>289&&Math.abs(tank.x-269.5)<.001,'Flush contact allows full tangential wall sliding');
movePlayer(1,0,.2);check(Math.abs(tank.x-269.5)<.001,'Wall contact resolves exactly at hull edge');
const oldAngle=tank.hull;turnTank(tank,Math.PI/2);check(canOccupy(tank.x,tank.y)&&Math.abs(tank.hull-oldAngle)<.01,'Turning cannot sweep corners through adjacent wall');
movePlayer(-1,0,.2);turnTank(tank,Math.PI/2);check(Math.abs(tank.hull-Math.PI/2)<.001,'Tank can rotate after making room');
setup();walls.splice(0,walls.length,{x:300,y:0,width:50,height:world.height},{x:420,y:0,width:50,height:world.height});tank.x=385;tank.y=300;tank.hull=-Math.PI/2;movePlayer(0,-1,.5);check(tank.y<240&&canOccupy(tank.x,tank.y),'Hull fits a 70-unit corridor that old 88-unit circle could not');
setup();walls.splice(0,walls.length,{x:300,y:100,width:100,height:100},{x:400,y:100,width:100,height:100});tank.x=250;tank.y=230;tank.hull=0;let sliding=true;for(let i=0;i<150;i++){movePlayer(1,0,1/240);if(!canOccupy(tank.x,tank.y))sliding=false;}check(sliding&&tank.x>330,'Tank crosses seam between adjacent walls without catching');
setup();tank.x=500;tank.y=300;tank.hull=.7;const originalFootprint=JSON.stringify(footprint(tank));tank.turret+=2;check(JSON.stringify(footprint(tank))===originalFootprint,'Cannon aiming does not affect movement footprint');
check(!polygonContact(footprint(tank),wallPolygon({x:900,y:500,width:100,height:100})),'Separated shapes do not collide');
setup();const navClear=clearMovement(280,398,350,398,tank);check(navClear,'Navigation uses hull clearance at screenshot corner');
for(const angle of [0,.2,.6,1,1.57,2.4,3.14]){setup();walls.splice(0);tank.hull=angle;tank.x=100;tank.y=100;movePlayer(-1,-1,.8);check(canOccupy(tank.x,tank.y),'Rotated footprint stays inside world at angle '+angle);}

setup();walls.splice(0,walls.length,{x:300,y:100,width:100,height:500});tank.x=430.5;tank.y=350;tank.hull=0;keys.add('s');let maximumX=tank.x,clearDuringTurn=true;for(let i=0;i<240;i++){update(1/240);maximumX=Math.max(maximumX,tank.x);if(!canOccupy(tank.x,tank.y))clearDuringTurn=false;}check(maximumX>433,'Screenshot turn makes clearance away from left wall');check(Math.abs(Math.sin(tank.hull-Math.PI/2))<.12&&tank.y>360,'Player aligns treads and continues south after clearance');check(clearDuringTurn,'Clearance maneuver never clips wall');
setup();walls.splice(0);tank.x=500;tank.y=300;tank.hull=0;keys.add('s');run(.1);check(tank.y>300&&tank.hull>0&&tank.hull<Math.PI/2,'Player moves continuously while hull rotates');run(.5);check(tank.y>300&&Math.abs(Math.sin(tank.hull-Math.PI/2))<.12,'Hull catches up while travel continues');
window.TankGame.loadLevel(mobileFixture);brown=enemies.find(e=>e.type==='brown');for(const e of enemies)if(e!==brown)e.alive=false;walls.splice(0,walls.length,{x:300,y:100,width:100,height:500});Object.assign(tank,{x:800,y:700});Object.assign(brown,{x:430.5,y:350,hull:0,path:[{x:430.5,y:550}],thinkTimer:100,burstTimer:100,resting:false,turnClearance:null});maximumX=brown.x;clearDuringTurn=true;for(let i=0;i<120;i++){updateMobileEnemy(1/60,brown);maximumX=Math.max(maximumX,brown.x);if(!canOccupy(brown.x,brown.y,brown))clearDuringTurn=false;}check(maximumX>433&&brown.y>380,'Brown also makes room and turns south');check(clearDuringTurn,'Brown clearance turn stays collision safe');
restart();check(tank.turnClearance===null&&enemies.every(e=>e.turnClearance===null),'Restart clears incomplete turn maneuvers');check(bodyHalfLength/bodyHalfWidth<1.1,'New hull footprint is nearly square');

setup();walls.splice(0);tank.x=500;tank.y=300;tank.hull=-Math.PI/2;keys.add('s');run(.1);check(Math.abs(tank.y-313.5)<.01&&Math.abs(angleDelta(tank.hull,-Math.PI/2))<.001,'North-facing tank immediately reverses south without turning');
setup();walls.splice(0);tank.x=500;tank.y=300;tank.hull=0;keys.add('a');run(.1);check(Math.abs(tank.x-486.5)<.01&&Math.abs(tank.hull)<.001,'East-facing tank immediately reverses west');
setup();walls.splice(0);tank.x=500;tank.y=300;tank.hull=0;keys.add('s');run(.1);check(Math.abs(tank.y-313.5)<.01,'Turning does not reduce open-space movement speed');

const tealType=Levels.aiTypes.teal,brownType=Levels.aiTypes.brown;
check(tealType.label==='Teal (Rocket)'&&tealType.mobile,'Teal mobile type is registered');
check(tealType.shellSpeed===634.8,'Rockets move 15 percent faster than previous 552 speed');
check(['moveSpeed','turnRate','reload','chargeTime','shellLimit'].every(k=>tealType[k]===brownType[k]),'Teal shares Brown movement and firing cadence');
check(Object.values(Levels.aiTypes).every(t=>t.palette.tracks===brownType.palette.tracks&&t.palette.tread===brownType.palette.tread),'All AI tracks and tread stripes share colors');
const rocketFixture=Levels.clone(mobileFixture);rocketFixture.enemies[0].type='teal';rocketFixture.walls=[];window.TankGame.loadLevel(rocketFixture);active=true;const teal=enemies[0];
check(teal.path.length===0&&teal.turnClearance===null,'Teal gets full mobile AI state');check(planMobileRoute(teal).length>0,'Teal uses obstacle-aware mobile route planning');
teal.turret=Math.atan2(tank.y-teal.y,tank.x-teal.x);teal.reload=0;for(let i=0;i<45;i++)updateEnemy(1/60,teal);
let rocket=shells.find(s=>s.owner===teal);check(rocket&&rocket.rocket&&rocket.maxBounces===0&&Math.abs(Math.hypot(rocket.vx,rocket.vy)-634.8)<.001,'Teal fires a fast non-ricocheting rocket');
check(pools.rocketLaunch.some(a=>a.plays>0),'Rocket uses its distinct launch sound');
const vxBefore=rocket.vx,ricochetPlays=pools.ricochet.reduce((n,a)=>n+a.plays,0);bounce(rocket,{nx:1,ny:0});check(rocket.life===0&&rocket.vx===vxBefore,'Rocket disappears instead of reflecting');check(pools.ricochet.reduce((n,a)=>n+a.plays,0)===ricochetPlays,'Rocket impact does not play ricochet sound');
Object.assign(teal,{x:150,y:100,turret:0});Object.assign(tank,{x:850,y:500});Object.assign(enemies[1],{x:100,y:100,alive:true});check(safeAIShot(teal,480),'Rocket safety does not invent a reflected second leg');enemies[1].x=450;check(!safeAIShot(teal,480),'Rocket safety still blocks direct friendly fire');
rocketFlight.play=function(){this.paused=false;this.plays++;return Promise.resolve()};rocketFlight.pause=function(){this.paused=true};
shells=[{...bullet(500,400,480,0,teal),rocket:true,maxBounces:0}];syncRocketAudio();check(!rocketFlight.paused&&rocketFlight.loop&&rocketFlight.volume<=.22,'Live rockets play quiet looping flight audio');
shells[0].life=0;syncRocketAudio();check(rocketFlight.paused,'Flight sound stops when final rocket disappears');
shells[0].life=8;syncRocketAudio();pause();check(rocketFlight.paused,'Pausing stops rocket flight audio');active=true;syncRocketAudio();window.TankGame.setEditing(true);check(rocketFlight.paused,'Entering editor stops rocket audio');
window.TankGame.loadLevel(rocketFixture);active=true;shells=[{...bullet(500,400,480,0,enemies[0]),rocket:true,maxBounces:0}];syncRocketAudio();restart();check(rocketFlight.paused,'Restart clears flight audio');
check(Levels.validate(JSON.parse(JSON.stringify(rocketFixture))).enemies[0].type==='teal','Teal type survives level export/import');

window.TankGame.loadLevel(rocketFixture);const exhaustTank=enemies[0];walls.splice(0);exhaustTank.resting=false;exhaustTank.burstTimer=100;for(let i=0;i<30;i++)updateMobileEnemy(1/60,exhaustTank);check(embers.length===0,'Moving Teal tank itself emits no fire');
trail({...bullet(520,400,634.8,0,exhaustTank),rocket:true},500,400,.03);check(embers.length>0,'Flying rockets emit exhaust sparks');check(smoke.some(p=>p.life===.4),'Rocket smoke lasts longer than standard shell smoke');
const spark=embers[0],sparkCount=embers.length;check(Number.isFinite(spark.x)&&Number.isFinite(spark.vx),'Exhaust particles have valid world positions');updateEffects(1);check(embers.length===0,'Exhaust sparks fade away');restart();check(embers.length===0,'Restart clears exhaust particles');
check(Math.abs(bulletHitHalfLength-12.0016875)<1e-8&&Math.abs(bulletHitHalfWidth-6.00084375)<1e-8,'Bullet collision dimensions also increased 15 percent');check(rocketFlameScale===2,'Rocket flame length and width doubled');

window.TankGame.loadLevel(Levels.builtInLevels['level-7']);check(enemies[0].openingDelay>=1&&enemies[0].openingDelay<=2,'First enemy opening delay is between one and two seconds');
check(enemies.slice(1).every((e,i)=>e.openingDelay-enemies[i].openingDelay>=.6-1e-8&&e.openingDelay-enemies[i].openingDelay<=.8+1e-8),'Each subsequent delay adds random 0.6 to 0.8 seconds');
const savedOpening=enemies[0].openingDelay;restart();check(enemies[0].openingDelay!==savedOpening,'Restart rerolls opening delays');
active=true;movementSound(true,1);check(Math.abs(engine.volume-.11)<1e-8,'Movement sound volume is half its previous level');stopEngine();
check(Object.values(Levels.aiTypes).filter(t=>!t.elite).every(t=>t.reload===2&&t.chargeTime===.7),'Later reloads and aiming warning remain unchanged');

const eliteType=Levels.aiTypes.elite;check(eliteType.label==='Black (Elite)'&&eliteType.mobile&&eliteType.moveSpeed===brownType.moveSpeed,'Black Elite uses mobile AI without extra movement speed');
const eliteFixture=Levels.clone(rocketFixture);eliteFixture.enemies=[{column:7,row:1,facing:'north',type:'elite'}];eliteFixture.player={column:1,row:1,facing:'north'};eliteFixture.walls=[];
window.TankGame.loadLevel(eliteFixture);active=true;let black=enemies[0];black.turret=Math.PI;black.reload=0;
updateEnemy(.03,black);check(shells.length===0&&black.charge>0,'Elite uses a brief firing windup');updateEnemy(.021,black);check(shells.length===1&&black.burst,'Elite starts burst within roughly fifty milliseconds of a clear shot');
const lockedAim=black.burst.aim;tank.y=350;tank.vy=100;updateEnemy(.18,black);updateEnemy(.18,black);check(shells.length===3&&!black.burst,'Elite burst contains three shots');
const shotAngles=shells.map(s=>Math.atan2(s.vy,s.vx));check(Math.abs(angleDelta(shotAngles[0],shotAngles[1])-5*Math.PI/180)<1e-8&&Math.abs(angleDelta(shotAngles[1],shotAngles[2])-5*Math.PI/180)<1e-8,'Burst spreads shots at minus five zero plus five degrees');
check(Math.abs(angleDelta(lockedAim,shotAngles[1]))<1e-8,'Burst central aim stays committed despite player movement');check(black.reload===2,'Two-second cooldown begins after last burst shot');
window.TankGame.loadLevel(eliteFixture);black=enemies[0];black.turret=Math.PI;black.reload=0;updateEnemy(.71,black);const buddy={x:450,y:150,hull:0,turret:0,alive:true,type:'sentry',reload:999};enemies.push(buddy);updateEnemy(.18,black);check(shells.length===1,'Ally entering path blocks second burst shot');buddy.alive=false;updateEnemy(.18,black);check(shells.length===2&&!black.burst,'Safe third burst shot can still fire');
restart();black=enemies[0];tank.vy=100;check(eliteAim(black,eliteType).y>tank.y,'Elite leads a moving player');check(eliteAim(black,eliteType).y-tank.y<=45.001,'Predictive lead is capped');
window.TankGame.loadLevel(Levels.builtInLevels['level-1']);black=enemies[0];black.type='elite';tank.x=150;tank.y=100;black.x=950;black.y=100;black.reload=3;black.charge=0;black.burst=null;
let coverRoute=planMobileRoute(black),coverGoal=coverRoute.at(-1);check(coverGoal&&!lineOfSight({...black,...coverGoal}),'Elite prefers a covered destination during cooldown');
black.reload=0;let attackRoute=planMobileRoute(black),attackGoal=attackRoute.at(-1);check(attackGoal&&lineOfSight({...black,...attackGoal}),'Elite prefers a firing lane when ready');
black.x=950;black.y=450;black.reload=3;const coverX=black.x,coverY=black.y;updateMobileEnemy(.2,black);check(black.x===coverX&&black.y===coverY,'Elite holds existing cover during cooldown');
check(eliteType.dodgeChance>brownType.dodgeChance||eliteType.dodgeChance>.55,'Elite dodges more reliably than Brown');check(eliteType.reactionTime===.08&&eliteType.awareness>260,'Elite has earlier but bounded threat reaction');
window.TankGame.loadLevel(eliteFixture);black=enemies[0];black.turret=Math.PI;black.reload=0;updateEnemy(.71,black);black.alive=false;updateEnemy(.5,black);check(shells.length===1,'Destroyed Elite cannot finish its burst');restart();check(enemies[0].burst===null,'Restart clears pending Elite burst');
check(Levels.validate(JSON.parse(JSON.stringify(eliteFixture))).enemies[0].type==='elite','Elite type survives level import and export');

window.TankGame.loadLevel(mobileFixture);walls.splice(0);brown=enemies[0];Object.assign(brown,{x:600,y:300,resting:true,burstTimer:100});const allyShooter=enemies[1];
shells=[bullet(420,300,240,0,allyShooter)];check(incomingThreat(brown)===shells[0],'Incoming AI shell is a dodge threat');
shells[0].owner=brown;shells[0].bounces=1;check(incomingThreat(brown)===shells[0],'Own returning ricochet is a dodge threat');
shells=[bullet(650,300,240,0,brown)];check(incomingThreat(brown)===null,'Own outbound shell is not a threat');
shells=[{...bullet(420,300,634.8,0,allyShooter),rocket:true}];check(incomingThreat(brown)===shells[0],'Incoming allied rocket is a dodge threat');
shells[0].life=0;check(incomingThreat(brown)===null,'Destroyed allied projectile is ignored');
shells=[bullet(420,300,240,0,allyShooter)];walls.push({x:500,y:250,width:30,height:100});check(incomingThreat(brown)===null,'Cover blocks an allied projectile threat');walls.splice(0);
shells=[bullet(450,300,240,0,allyShooter),bullet(500,300,480,0,brown)];check(incomingThreat(brown)===shells[1],'Soonest collision wins regardless of projectile owner');
for(const type of ['brown','teal','elite']){brown.type=type;shells=[bullet(420,300,240,0,allyShooter)];check(incomingThreat(brown)===shells[0],type+' watches allied bullets');}
brown.type='brown';Object.assign(brown,{scanTimer:0,dodgeCooldown:0,pendingThreat:null,reactionTimer:0,dodgeTime:0});shells=[bullet(420,300,240,0,allyShooter)];const previousRng=Math.random;Math.random=()=>.1;for(let i=0;i<22;i++)updateMobileEnemy(.01,brown);Math.random=previousRng;check(brown.dodgeTime>0,'Mobile AI actually reacts to an allied projectile');

const holeLevel=Levels.clone(Levels.defaultLevel);holeLevel.walls=[{column:4,row:4,type:'hole'}];
check(Levels.validate(JSON.parse(JSON.stringify(holeLevel))).walls[0].type==='hole','Hole survives JSON validation');
window.TankGame.loadLevel(holeLevel);active=true;Object.assign(tank,{x:250,y:450,hull:0});Object.assign(enemies[0],{x:750,y:450,hull:0,reload:999});
check(!canOccupy(450,450,tank),'Hole blocks tank footprint');check(!canEnemyOccupy(enemies[0],450,450),'Hole blocks AI navigation');
check(lineOfSight(enemies[0]),'AI sees player across hole');
const overHole=bullet(250,450,380,0);check(!firstContact(overHole,400,0),'Standard bullet flies over hole');
overHole.rocket=true;overHole.vx=634.8;check(!firstContact(overHole,400,0),'Rocket flies over hole');
check(safeAIShot(enemies[0],240,Math.PI),'AI can safely shoot across hole');
walls[0].type='solid';check(!!firstContact(overHole,400,0)&&!lineOfSight(enemies[0]),'Wall still blocks shots and sight');

const redType=Levels.aiTypes.red;
check(redType.label==='Red (Charge)'&&redType.shield,'Red Charge is registered');
check(['turnRate','shellSpeed','reload','chargeTime','shellLimit','moveSpeed','dodgeChance','reactionTime','scanInterval','dodgeCooldown','awareness'].every(k=>redType[k]===eliteType[k]),'Red inherits Black firing and dodging');
check(redType.palette.tracks===eliteType.palette.tracks&&redType.palette.body!==eliteType.palette.body,'Red uses shared treads and distinct body');
const redFixture=Levels.clone(eliteFixture);redFixture.enemies[0].type='red';
function redSetup(){window.TankGame.loadLevel(redFixture);active=true;const r=enemies[0];Object.assign(r,{x:750,y:150,hull:Math.PI,turret:Math.PI,resting:false,burstTimer:100,thinkTimer:100,lastTactic:'attack',path:[{x:650,y:150}],reload:0});return r;}
let red=redSetup();check(Levels.validate(redFixture).enemies[0].type==='red','Red survives level validation');
shells=[bullet(450,150,380,0)];check(shieldThreat(red),'Shield detects direct hit within one second');
updateShield(.01,red);check(red.shieldTime===3&&red.offenseTime===0,'Threat activates defensive shield');
const immuneShot=bullet(red.x,red.y,380,0);hitTank(immuneShot,red);check(red.alive&&immuneShot.life>0,'Active shield prevents tank destruction');
const reflected=bullet(450,150,380,0);const shieldHit=firstContact(reflected,400,0);check(shieldHit?.shield===red,'Shield intercepts projectile before hull');reflected.x+=400*shieldHit.t;bounce(reflected,shieldHit);check(reflected.vx<0&&reflected.bounces===1&&reflected.life>0,'Normal shell ricochets off shield');
const angled=bullet(450,175,380,0),angledHit=firstContact(angled,400,0);const initialSpeed=Math.hypot(angled.vx,angled.vy);bounce(angled,angledHit);check(angled.vy!==0&&Math.abs(Math.hypot(angled.vx,angled.vy)-initialSpeed)<1e-8,'Circular shield reflection follows surface normal and preserves speed');
const rocketAtShield=bullet(450,150,634.8,0);rocketAtShield.maxBounces=0;rocketAtShield.rocket=true;bounce(rocketAtShield,firstContact(rocketAtShield,400,0));check(rocketAtShield.life===0,'Rocket is destroyed against shield');
shells=[];emitShot(red,240,Math.PI);check(shells[0].life>0&&shells[0].bounces===0,'Shielded Red can fire outward');
updateShield(3,red);check(red.shieldTime===0&&red.shieldCooldown===6,'Six-second cooldown begins at shield expiration');
shells=[bullet(450,150,380,0)];updateShield(5.9,red);check(red.shieldTime===0&&red.shieldCooldown>0,'Incoming threat cannot bypass cooldown');updateShield(.11,red);check(red.shieldTime===3&&red.offenseTime===0,'Defense resumes after full cooldown');
red=redSetup();shells=[];updateShield(5.99,red);check(!red.shieldTime,'No premature offensive activation');updateShield(.02,red);check(red.shieldTime===3&&red.offenseTime===3.5,'Six idle seconds starts offensive charge');
check(!wantsCover({...red,reload:2}),'Offensive charge ignores cover even while reloading');
red.path=[{x:650,y:150}];red.thinkTimer=100;red.resting=true;red.burst={aim:Math.PI,index:1,timer:.18,range:600};const chargeStartX=red.x;updateMobileEnemy(.1,red);check(Math.abs((chargeStartX-red.x)-redType.moveSpeed*1.25*.1)<1e-6,'Offensive charge moves during burst at 125 percent speed');
updateShield(3,red);check(red.shieldTime===0&&Math.abs(red.offenseTime-.5)<1e-8,'Last half-second of offensive charge is unshielded');updateShield(.5,red);check(red.offenseTime===0,'Offensive commitment ends after 3.5 seconds');
red=redSetup();const plainStart=red.x;updateMobileEnemy(.1,red);const normalDistance=plainStart-red.x;red=redSetup();activateShield(red);red.path=[{x:650,y:150}];red.thinkTimer=100;const boostStart=red.x;updateMobileEnemy(.1,red);check(Math.abs((boostStart-red.x)/normalDistance-1.25)<1e-6,'Defensive shield also grants 25 percent speed boost');
red=redSetup();shells=[bullet(150,150,240,0)];check(!shieldThreat(red),'Bullet more than one second away does not activate shield');
shells=[bullet(450,150,-380,0)];check(!shieldThreat(red),'Receding bullet does not activate shield');
shells=[bullet(450,150,380,0)];walls.push({x:550,y:100,width:40,height:100});check(!shieldThreat(red),'Blocking wall prevents false shield threat');walls.splice(0);
Object.assign(red,{x:750,y:150});walls.push({x:950,y:100,width:40,height:100});shells=[bullet(850,150,380,0)];check(shieldThreat(red),'Shield predicts incoming wall ricochet within one second');shells[0].maxBounces=0;check(!shieldThreat(red),'Shield prediction honors zero-bounce rockets');
red=redSetup();updateEnemy(.051,red);updateEnemy(.18,red);updateEnemy(.18,red);check(shells.length===3&&red.reload===2,'Red retains Black three-shot burst and reload');
activateShield(red,true);restart();check(enemies[0].shieldTime===0&&enemies[0].shieldCooldown===0&&enemies[0].offenseTime===0,'Restart clears shield and cooldown state');

red=redSetup();activateShield(red);const shieldAlly={...enemies[0],type:'sentry',x:350,y:150,shieldTime:0,turret:0};enemies.push(shieldAlly);Object.assign(tank,{x:1050,y:150});check(!safeAIShot(shieldAlly,240,0),'AI avoids shooting an allied shield');
red=redSetup();activateShield(red);shells=[bullet(450,150,380,0)];for(let i=0;i<150;i++)update(1/240);check(red.alive&&shells.some(s=>s.vx<0),'Live physics reflects shell and preserves shielded tank');
red=redSetup();activateShield(red);red.shieldTime=.01;shells=[];updateShield(.02,red);check(red.shieldTime===0&&Math.abs(red.shieldCooldown-5.99)<1e-8,'Cooldown accounts for frame crossing shield expiration');

const boxShot=bullet(200,200,380,0), artBox=shellBox(boxShot), pairBox=shellBox(boxShot,true);
check(artBox.hx===bulletWidth/2&&artBox.hy===bulletHeight/2,'Tank collision rectangle exactly matches visible bullet bounds');
check(Math.abs(pairBox.hx/artBox.hx-1.12)<1e-8&&Math.abs(pairBox.hy/artBox.hy-1.12)<1e-8,'Bullet pair collision rectangle is twelve percent larger in both dimensions');
const nearShell=bullet(200+bulletWidth*1.06,200,380,0);
check(!rectanglesOverlap(shellBox(boxShot),shellBox(nearShell))&&rectanglesOverlap(shellBox(boxShot,true),shellBox(nearShell,true)),'Bullet pair margin catches near contacts outside artwork');
const edgeTank={x:200+21*scale+bulletWidth/2+.2,y:200,hull:0};
check(!rectanglesOverlap(shellBox(boxShot),hullBox(edgeTank))&&rectanglesOverlap(shellBox(boxShot,true),hullBox(edgeTank)),'Tank hits do not use the enlarged bullet-pair margin');
check(shotTankContact(boxShot,0,0,edgeTank,0,0)===null,'AI hit prediction also uses artwork-sized bullet rectangle');
for(const angle of [.4,1.2,2.5]){const rotated=bullet(200,200,Math.cos(angle)*380,Math.sin(angle)*380);check(Math.abs(angleDelta(shellBox(rotated,true).angle,angle))<1e-8,'Both collision rectangles rotate with bullet direction');}

active=true;muted=false;
const wallAudioBefore=pools.ricochet.reduce((n,a)=>n+a.plays,0),shieldAudioBefore=pools.shieldRicochet.reduce((n,a)=>n+a.plays,0);
bounce(bullet(200,200,380,0),{nx:-1,ny:0,shield:{}});
check(pools.shieldRicochet.reduce((n,a)=>n+a.plays,0)===shieldAudioBefore+1&&pools.ricochet.reduce((n,a)=>n+a.plays,0)===wallAudioBefore,'Shield bounce plays only the shield variation');
check(pools.shieldRicochet.some(a=>a.plays>0&&a.playbackRate===1.15&&a.volume===.55),'Shield thud is brighter and softer');
bounce(bullet(200,200,380,0),{nx:-1,ny:0});check(pools.ricochet.reduce((n,a)=>n+a.plays,0)===wallAudioBefore+1,'Wall bounce retains original sound');
console.log(passed+' gameplay checks passed');
`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, tests + '\n})();'), context);
