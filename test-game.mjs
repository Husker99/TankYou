import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('./game.js', import.meta.url), 'utf8').replace('    beginCountdown();', '    countdown=0;');
const elements = {};
const element = () => ({ style: {}, hidden: false, textContent: '', addEventListener() {}, appendChild() {}, setAttribute() {}, focus() {}, getContext() { return {fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}; } });
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
Object.assign(enemy,{x:820,y:155,hull:Math.PI/2,turret:2.68,reload:999,firstShot:false});enemies=[enemy];}

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
check(enemies.every(e=>e.hull===-Math.PI/2),'Every loaded AI hull starts north');
for(const e of enemies)e.reload=999;
shells=[bullet(enemies[0].x,enemies[0].y+50,0,-380)];run(.1);check(!enemies[0].alive&&enemies[1].alive&&phase==='playing','Room continues after first AI is destroyed');
shells=[bullet(enemies[1].x,enemies[1].y+50,0,-380)];run(.1);check(phase==='won','Win requires eliminating all AI');
restart();check(enemies.length===2&&enemies.every(e=>e.alive),'Restart restores every AI spawn');
enemies.forEach(e=>e.reload=0);active=true;run(.2);check(shells.some(s=>s.owner===enemies[0])&&shells.some(s=>s.owner===enemies[1]),'Each AI aims and fires independently');
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
for(const name of ['drawImage','strokeRect','clearRect','save','restore','translate','scale','fillRect','stroke','beginPath','moveTo','lineTo','arc','setLineDash','rect','clip'])ctx[name]=()=>{};
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

window.TankGame.loadLevel(Levels.builtInLevels['level-7']);check(enemies[0].openingDelay>=0&&enemies[0].openingDelay<=1,'First enemy opening delay is between zero and one second');
check(enemies.every(e=>e.openingDelay>=0&&e.openingDelay<=1),'All enemies have bounded independent delays without cumulative staggering');
const savedOpening=enemies[0].openingDelay;restart();check(enemies[0].openingDelay!==savedOpening&&enemies.every(e=>Math.abs(angleDelta(e.turret,Math.atan2(tank.y-e.y,tank.x-e.x)))<1e-8),'Restart rerolls delays and keeps turrets ready to aim');
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
check(eliteType.dodgeChance>brownType.dodgeChance||eliteType.dodgeChance>.55,'Elite dodges more reliably than Brown');check(eliteType.reactionTime===.03&&eliteType.scanInterval===.05&&eliteType.dodgeCooldown===.7&&eliteType.awareness>260,'Elite has earlier but bounded threat reaction');
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

function bankSetup(type='sentry'){
 setup();walls.splice(0,walls.length,{x:450,y:250,width:100,height:100,type:'solid'});
 Object.assign(tank,{x:250,y:300,hull:0,vx:0,vy:0});
 Object.assign(enemy,{x:750,y:300,hull:Math.PI,turret:Math.PI,type,reload:0,charge:0,bankPlan:null,bankScanTimer:0,shieldTime:0,shieldIdle:0,shieldCooldown:0,offenseTime:0,resting:true,burstTimer:100,burst:null,vx:0,vy:0});
 shells=[];return enemy;
}
for(const type of ['sentry','elite','red']){
 const banker=bankSetup(type),plan=enemyShotPlan(banker,.01);
 check(!lineOfSight(banker)&&plan?.bank,type+' finds bank shot with blocked direct sight');
 check(!!traceBankShot(banker,plan.angle,plan.target)&&safeAIShot(banker,240,plan.angle),type+' bank path reaches player safely');
 banker.turret=plan.angle;updateEnemy(Levels.aiTypes[type].chargeTime+.001,banker);
 check(shells.length===1&&(type==='sentry'||banker.burst?.bank),type+' starts firing a bank shot with usual windup');
 if(type!=='sentry'){run(.19);run(.19);check(shells.length===3,type+' preserves three-shot spread burst for bank shots');}
 banker.reload=999;run(4);check(!tank.alive,type+' bank shot hits player through live ricochet physics');
}
for(const type of ['brown','teal']){const banker=bankSetup(type);check(enemyShotPlan(banker,.01)===null,type+' does not plan bank shots');}
let banker=bankSetup();walls.splice(0);check(enemyShotPlan(banker,.01)?.bank===false,'Direct shot preferred over available bank');
banker=bankSetup();walls.splice(0,walls.length,{x:600,y:250,width:100,height:100,type:'solid'},{x:850,y:100,width:50,height:400,type:'solid'});Object.assign(banker,{x:650,y:150});Object.assign(tank,{x:650,y:450});
let bankPlan=enemyShotPlan(banker,.01);check(bankPlan?.bank,'Interior wall face can provide a bank shot');
let bankRay=bullet(banker.x,banker.y,Math.cos(bankPlan.angle)*240,Math.sin(bankPlan.angle)*240);let bankContact=firstContact(bankRay,bankRay.vx*8,bankRay.vy*8);const bankX=bankRay.x+bankRay.vx*8*bankContact.t,bankY=bankRay.y+bankRay.vy*8*bankContact.t;
check(bankX>800&&bankX<850&&bankY>100&&bankY<500,'Chosen bank uses interior wall rather than arena boundary');
const bankBuddy={x:(bankX+tank.x)/2,y:(bankY+tank.y)/2,hull:0,alive:true,type:'sentry',vx:0,vy:0};enemies.push(bankBuddy);check(!safeAIShot(banker,240,bankPlan.angle),'Ally on reflected leg blocks bank shot');
enemies.pop();walls.push({x:bankX-50,y:bankY+45,width:100,height:25,type:'solid'});check(!traceBankShot(banker,bankPlan.angle,bankPlan.target),'Second obstruction invalidates reflected path');
banker=bankSetup();const baselineBank=enemyShotPlan(banker,.01);walls.push({x:650,y:50,width:100,height:100,type:'hole'});check(!!traceBankShot(banker,baselineBank.angle,baselineBank.target),'Holes do not obstruct bank shots');
const levelEleven=Levels.compile(Levels.builtInLevels['level-11']);check(levelEleven.enemies.length===5&&levelEleven.enemies.filter(e=>e.type==='red').length===3,'Level 11 includes supplied Red and Black tanks');

banker=bankSetup();bankPlan=enemyShotPlan(banker,.01);banker.turret=bankPlan.angle;banker.reload=2;updateEnemy(.71,banker);check(shells.length===0,'Bank shot respects remaining reload');
banker.reload=0;shells=[bullet(100,100,240,0,banker),bullet(200,100,240,0,banker)];updateEnemy(.71,banker);check(shells.length===2,'Bank shot respects active shell limit');
banker=bankSetup();walls.splice(0,walls.length,{x:200,y:240,width:100,height:20,type:'solid'},{x:200,y:340,width:100,height:20,type:'solid'},{x:190,y:240,width:20,height:120,type:'solid'},{x:290,y:240,width:20,height:120,type:'solid'});check(enemyShotPlan(banker,.01)===null,'Enclosed player yields no false bank solution');

let healthUpdates=[];window.TankGame.loadLevel(Levels.defaultLevel,{campaign:true,hearts:3,onHealthChange:h=>healthUpdates.push(h)});active=true;
let heartShot=bullet(tank.x,tank.y,380,0);hitTank(heartShot,tank);check(tank.alive&&playerHearts===2&&heartShot.life===0,'Campaign hit consumes one heart without killing player');
check(healthUpdates.join(',')==='2'&&(document.getElementById('combat-hearts').innerHTML.match(/heart-slot filled/g)||[]).length===2&&(document.getElementById('combat-hearts').innerHTML.match(/heart-slot empty/g)||[]).length===1,'Health updates persist through callback and HUD');
heartShot=bullet(tank.x,tank.y,380,0);hitTank(heartShot,tank);check(playerHearts===2&&heartShot.life===0,'Grace period absorbs overlapping bullets');
const graceBefore=hitGrace;enemies[0].reload=999;update(.1);check(hitGrace<graceBefore&&hitGrace>0,'Damage grace counts down during active combat');
const healthBeforeReset=playerHearts;document.getElementById('reset').onclick();check(playerHearts===healthBeforeReset,'Room reset cannot restore campaign health');
hitGrace=0;hitTank(bullet(tank.x,tank.y,380,0),tank);check(tank.alive&&playerHearts===1,'Campaign player survives with one remaining heart');
hitGrace=0;hitTank(bullet(tank.x,tank.y,380,0),tank);check(!tank.alive&&playerHearts===0&&healthUpdates.join(',')==='2,1,0','Last campaign heart destroys tank');
window.TankGame.loadLevel(Levels.defaultLevel);check(document.getElementById('combat-hearts').hidden&&campaignCombat===null,'Quick Play clears campaign health mode');hitTank(bullet(tank.x,tank.y,380,0),tank);check(!tank.alive,'Quick Play retains one-hit destruction');

const pinkType=Levels.aiTypes.pink;check(pinkType.label==='Pink (Flamethrower)'&&pinkType.flamethrower&&pinkType.elite,'Pink type is registered');
check(['chargeTime','shellLimit','moveSpeed','turnRate','dodgeChance','reactionTime','scanInterval','dodgeCooldown','awareness'].every(k=>pinkType[k]===eliteType[k]),'Pink inherits Black burst, movement, and dodge tuning');check(pinkType.reload===1.8&&eliteType.reload===2,'Pink reload is 10% shorter without changing Black');
check(pinkType.palette.tracks===eliteType.palette.tracks&&pinkType.palette.body!==eliteType.palette.body,'Pink has distinct body and shared treads');
const pinkFixture=Levels.clone(Levels.builtInLevels['level-11']);pinkFixture.walls=[];pinkFixture.enemies=[{column:1,row:3,facing:'north',type:'pink'}];pinkFixture.player={column:6,row:3,facing:'north'};
function pinkSetup(options={}){window.TankGame.loadLevel(pinkFixture,options);active=true;const p=enemies[0];Object.assign(p,{x:150,y:350,hull:0,turret:0,flameCooldown:0,reload:0,resting:true,burstTimer:100,thinkTimer:100,scanTimer:100});Object.assign(tank,{x:650,y:350,vx:0,vy:0});return p;}
let pink=pinkSetup();check(Levels.validate(pinkFixture).enemies[0].type==='pink','Pink survives level import');updateEnemy(.01,pink);check(pink.flame?.phase==='fire'&&pink.flame.time===2.9&&flameReach(pink)===24&&shells.length===0,'Flame begins small immediately with no warning cone or gunshot');
const lockedFlameAim=pink.flame.angle;tank.y=550;updateEnemy(.5,pink);check(pink.flame.angle===lockedFlameAim&&pink.turret===lockedFlameAim,'Flame aim remains locked as player moves');updateEnemy(.5,pink);check(Math.abs(flameReach(pink)-312)<1e-8&&shells.length===0,'Flame reaches half extension after 1 second without gunfire');updateEnemy(1,pink);check(flameReach(pink)===600&&shells.length===0,'Flame reaches full length after 2 seconds');
updateEnemy(.89,pink);check(flameReach(pink)===600&&shells.length===0,'Full-length stream holds for 0.9 seconds and suppresses gun');updateEnemy(.011,pink);check(pink.flame===null&&pink.flameCooldown===5&&shells.length===0,'Flame ends and starts five-second cooldown');
tank.y=350;updateEnemy(.051,pink);check(shells.length===1&&pink.burst,'Burst weapon resumes during flame cooldown');
pink=pinkSetup();updateEnemy(.01,pink);pink.burst={aim:0,index:1,timer:0,range:500};updateEnemy(.1,pink);check(shells.length===0,'Even a pending burst cannot emit shots while flame charges');
check(flameRange===600&&Math.abs(2*Math.sin(flameHalfAngle)*flameRange-200)<1e-8,'Flame reaches six cells and spans two cells at maximum width');
pink.flame.age=2;shells=[bullet(450,350,380,0,tank),bullet(500,350,240,0,pink),{...bullet(550,350,634.8,0,enemy),rocket:true,maxBounces:0}];tank.y=600;applyFlames();check(shells.every(s=>s.life===0)&&smoke.length>0,'Flame cancels player bullets, allied bullets, and rockets with smoke');
shells=[bullet(450,500,380,0),bullet(900,350,380,0)];applyFlames();check(shells.every(s=>s.life>0),'Shots outside cone and beyond range survive');
check(flameTouches(pink,{x:750,y:350,angle:0,hx:10,hy:5})&&!flameTouches(pink,{x:850,y:350,angle:0,hx:10,hy:5}),'Cone range is measured from muzzle');
walls.push({x:400,y:250,width:100,height:200,type:'solid'});check(!flameTouches(pink,{x:650,y:350,angle:0,hx:30,hy:30})&&flameTouches(pink,{x:350,y:350,angle:0,hx:10,hy:5}),'Wall stops flame while near-side objects remain affected');
shells=[bullet(650,350,380,0)];applyFlames();check(shells[0].life>0,'Bullet behind cover is protected from flames');walls[0].type='hole';check(flameTouches(pink,{x:650,y:350,angle:0,hx:30,hy:30}),'Flame passes over holes');applyFlames();check(shells[0].life===0,'Flame cancels bullet across hole');
walls.splice(0,walls.length,{x:400,y:350,width:100,height:100,type:'solid'});check(!flameTouches(pink,{x:650,y:380,angle:0,hx:5,hy:5})&&flameTouches(pink,{x:650,y:320,angle:0,hx:5,hy:5}),'Wall occludes only covered portion of cone');
pink=pinkSetup({campaign:true,hearts:3});updateEnemy(.01,pink);updateEnemy(2,pink);applyFlames();check(playerHearts===2&&tank.alive,'Flame contact removes one campaign heart');applyFlames();check(playerHearts===2,'Damage grace prevents repeated damage within same instant');hitGrace=0;applyFlames();check(playerHearts===1&&tank.alive,'Sustained exposure follows normal damage grace rules');
pink=pinkSetup();updateEnemy(.01,pink);updateEnemy(2,pink);applyFlames();check(!tank.alive,'Flame contact is lethal in one-hit Quick Play');
pink=pinkSetup();updateEnemy(.01,pink);const stoppedX=pink.x,stoppedY=pink.y;Object.assign(pink,{resting:false,path:[{x:250,y:350}],dodgeTime:.4,dodgeX:1,dodgeY:0});updateMobileEnemy(.1,pink);check(pink.x===stoppedX&&pink.y===stoppedY,'Pink holds position while telegraphing locked flame');
const pausedTime=pink.flame.time;editing=true;update(.5);check(pink.flame.time===pausedTime,'Pause freezes flame timers');editing=false;
hitTank(bullet(pink.x,pink.y,380,0),pink);shells=[bullet(450,350,380,0)];applyFlames();check(!pink.alive&&!pink.flame&&shells[0].life>0,'Destroyed Pink immediately stops warning, flame, and cancellation');
restart();check(enemies[0].flame===null&&enemies[0].flameCooldown===enemies[0].openingDelay,'Restart clears flame state and respects opening delay');
pink=pinkSetup();walls.push({x:190,y:300,width:10,height:100,type:'solid'});check(!updateFlamethrower(.01,pink)&&!pink.flame,'Blocked muzzle cannot project flames through nearby cover');
pink=pinkSetup();updateEnemy(.01,pink);check(!flameTouches(pink,{x:650,y:350,angle:0,hx:30,hy:30}),'Growing flame does not damage targets beyond visible reach');shells=[bullet(650,350,380,0)];tank.y=600;applyFlames();check(shells[0].life>0,'Growing flame cannot cancel distant bullets before extending');updateEnemy(2,pink);applyFlames();check(shells[0].life===0,'Extended flame cancels bullet when visible reach arrives');

window.TankGame.loadLevel(Levels.defaultLevel);active=true;let countdownTones=0;window.TankUIAudio={countdown(){countdownTones++;}};beginCountdown();
const countdownStart={x:tank.x,y:tank.y,reload:enemies[0].reload};keys.add('d');fire('click');update(.5);
check(shells.length===0&&tank.x===countdownStart.x&&tank.y===countdownStart.y&&enemies[0].reload===countdownStart.reload,'Countdown blocks movement, shooting, and enemy timers');
check(countdownTones===1,'Countdown sounds once on three');check(document.getElementById('combat-countdown').textContent==='3','Countdown starts at three');update(.5);check(document.getElementById('combat-countdown').textContent==='2','Countdown shows two after one second');update(1);check(document.getElementById('combat-countdown').textContent==='1','Countdown shows one after two seconds');
active=false;update(.5);check(countdown===1,'Countdown freezes while game is inactive');active=true;update(1);check(countdown===0&&document.getElementById('combat-countdown').hidden,'Countdown ends at three seconds');check(countdownTones===3,'Countdown sounds once per displayed number without an end beep');
update(.01);check(tank.x>countdownStart.x,'Combat input resumes after countdown');
window.TankGame.loadLevel(Levels.defaultLevel,{campaign:true,hearts:3});check(document.getElementById('game-header').hidden&&!document.getElementById('combat-hearts').hidden,'Campaign combat hides logo header and retains heart HUD');
window.TankGame.loadLevel(Levels.defaultLevel);check(!document.getElementById('game-header').hidden&&document.getElementById('combat-hearts').hidden,'Quick Play restores normal header');

function abilitySetup(upgrades,extra={}){
 const level=Levels.clone(Levels.builtInLevels['level-11']);level.walls=[];level.enemies=[{column:6,row:3,facing:'north',type:'elite'}];level.player={column:1,row:3,facing:'north'};
 window.TankGame.loadLevel(level,{campaign:true,hearts:3,maxHearts:3,upgrades,...extra});active=true;countdown=0;Object.assign(tank,{x:150,y:350,hull:0,turret:0});Object.assign(enemies[0],{x:600,y:350,reload:999,resting:true,burstTimer:100,scanTimer:100,thinkTimer:100});return enemies[0];
}
let stunned=abilitySetup({blessing:1});activatePlayerAbilities();check(tank.shieldTime===3&&abilityState.shieldCooldown===0,'Blessing activates three seconds of shield before cooldown');
let shieldBullet=bullet(400,350,-380,0,stunned);const playerShieldHit=firstContact(shieldBullet,-300,0);check(playerShieldHit?.shield===tank,'Player shield intercepts incoming bullet');bounce(shieldBullet,playerShieldHit);check(shieldBullet.life===0,'Blessing absorbs intercepted bullet');hitTank({life:1},tank);check(playerHearts===3&&tank.alive,'Blessing blocks damage');
updatePlayerAbilities(3);check(tank.shieldTime===0&&abilityState.shieldCooldown===13,'Shield cooldown begins after shield deactivation');activatePlayerAbilities();check(tank.shieldTime===0,'Shield cannot be reused during cooldown');updatePlayerAbilities(13);activatePlayerAbilities();check(tank.shieldTime===3,'Shield is ready after full cooldown');
stunned=abilitySetup({blessing:1,favored:1});activatePlayerAbilities();check(tank.shieldTime===5,'Favored extends shield to five seconds');shieldBullet={...bullet(400,350,-634.8,0,stunned),rocket:true,maxBounces:0};bounce(shieldBullet,firstContact(shieldBullet,-300,0));check(shieldBullet.life>0&&shieldBullet.vx>0,'Favored deflects an incoming rocket');
stunned=abilitySetup({blessing:1,hero:1});activatePlayerAbilities();check(Math.abs(tank.shieldRadius**2-48**2*2)<1e-8,'Hero doubles shield area rather than diameter');stunned.x=240;applyShieldContact();check(!stunned.alive,'Hero damages enemy touching enlarged shield');
stunned=abilitySetup({blessing:1,stun:1});activatePlayerAbilities();check(tank.shieldTime===3&&abilityState.stunArmed&&abilityState.stunCooldown===6,'One Q activates ready shield and arms stun together');fire('click');check(shells.length===0&&waves.length===1&&playerShotCount()===1&&!abilityState.stunArmed,'Stun wave replaces a bullet and uses one shot slot');
updatePlayerAbilities(.7);check(stunned.stunTime===1,'Energy wave stuns a reached enemy for one second');
Object.assign(stunned,{resting:false,path:[{x:700,y:350}],turret:1,hull:0,shieldTime:0,shieldCooldown:0,type:'red'});const frozen={x:stunned.x,y:stunned.y,hull:stunned.hull,turret:stunned.turret,reload:stunned.reload};
updateMobileEnemy(.2,stunned);updateEnemy(.2,stunned);updateShield(.2,stunned);check(stunned.x===frozen.x&&stunned.y===frozen.y&&stunned.hull===frozen.hull&&stunned.turret===frozen.turret&&stunned.reload===frozen.reload&&!stunned.shieldTime,'Stun freezes movement, hull, turret, weapons, and ability activation');
check(document.getElementById('ability-hud').innerHTML.includes('Shield')&&document.getElementById('ability-hud').innerHTML.includes('Stun'),'Battlefield HUD displays both Q abilities');
stunned=abilitySetup({stun:1,grasp:1});activatePlayerAbilities();fire('click');updatePlayerAbilities(.7);check(stunned.stunTime===4,'Deaths Grasp extends stun to four seconds');updatePlayerAbilities(.25);check(stunned.stunTime===3.75,'Enemy stun duration counts down normally');
stunned=abilitySetup({stun:1});activatePlayerAbilities();shells=Array.from({length:5},(_,i)=>bullet(100+i*30,100,380,0));fire('click');check(!waves.length&&abilityState.stunArmed,'Full five-shot capacity leaves stun armed');shells.pop();fire('click');check(waves.length===1&&playerShotCount()===5,'Stun wave uses the newly freed fifth slot');updatePlayerAbilities(1);check(!waves.length&&playerShotCount()===4,'Wave releases shot slot after reaching maximum range');activatePlayerAbilities();check(!abilityState.stunArmed,'Stun cannot rearm before six-second cooldown');updatePlayerAbilities(5);activatePlayerAbilities();check(abilityState.stunArmed,'Stun can rearm after six seconds');
stunned=abilitySetup({stun:1});activatePlayerAbilities();fire('click');walls.push({x:400,y:300,width:100,height:100,type:'solid'});updatePlayerAbilities(.7);check(!stunned.stunTime,'Cover blocks stun wave');stunned=abilitySetup({stun:1});walls.push({x:400,y:300,width:100,height:100,type:'hole'});activatePlayerAbilities();fire('click');updatePlayerAbilities(.7);check(stunned.stunTime===1,'Holes do not block stun wave');
let savedAbilities=null;abilitySetup({blessing:1,stun:1},{onAbilityChange:s=>{savedAbilities=s;}});activatePlayerAbilities();finishRound();check(savedAbilities.shieldTime===0&&savedAbilities.shieldCooldown===13&&savedAbilities.stunArmed,'Room end saves cooldown and armed shot');
abilitySetup({blessing:1,stun:1},{abilityState:savedAbilities});activatePlayerAbilities();check(tank.shieldTime===3&&abilityState.stunArmed,'Next room refreshes both Q abilities');
window.TankGame.loadLevel(Levels.defaultLevel);check(!playerUpgrades.blessing&&!waves.length&&!tank.shieldTime&&document.getElementById('ability-hud').hidden,'Quick Play clears campaign abilities');
stunned=abilitySetup({stun:1});stunned.x=220;stunned.stunTime=1;const immobileX=stunned.x;movePlayer(1,0,.5);check(stunned.x===immobileX,'Stunned enemies cannot be pushed out of position');

window.TankGame.loadLevel(mobileFixture);active=true;walls.splice(0);for(const e of enemies)e.reload=999;let cautious=enemies[0];Object.assign(cautious,{type:'brown',x:600,y:300,hull:0,resting:false,burstTimer:100,thinkTimer:100,path:[{x:600,y:150}],scanTimer:100,dodgeCooldown:0,dodgeTime:0});
for(const owner of [tank,enemies[1],cautious]){shells=[bullet(450,250,240,0,owner)];check(movementThreatTime(cautious,0,0)===Infinity&&!safeBulletMovement(cautious,0,-78),'Movement prediction avoids crossing shell path regardless of owner');}
const cautiousY=cautious.y;updateMobileEnemy(.1,cautious);check(cautious.y===cautiousY,'Mobile AI stops before walking into predicted bullet path');
shells=[bullet(450,300,240,0),bullet(450,350,240,0)];const dodgeRng=Math.random;Math.random=()=>.1;check(beginDodge(cautious,shells[0])&&cautious.dodgeY<0,'Dodge chooses side that avoids a second bullet');Math.random=dodgeRng;
Object.assign(cautious,{x:800,y:300,hull:0});walls.push({x:950,y:200,width:30,height:150,type:'solid'});shells=[bullet(850,250,380,0)];check(!safeBulletMovement(cautious,0,-78),'Movement prediction includes upcoming wall ricochet');shells[0].maxBounces=0;check(safeBulletMovement(cautious,0,-78),'Non-ricocheting rocket does not create phantom return path');
window.TankGame.loadLevel(Levels.defaultLevel);active=true;walls.splice(0);Object.assign(tank,{x:150,y:150});Object.assign(enemies[0],{x:750,y:150,turret:Math.PI,reload:0});updateEnemy(.121,enemies[0]);check(shells.length===1,'Basic tank first shot is ready within 0.12 seconds after countdown');check(!enemies[0].firstShot&&enemies[0].reload===2,'First shot then returns to normal reload cadence');
abilitySetup({blessing:1,stun:1},{abilityState:{shieldTime:2,shieldCooldown:10,stunCooldown:4,stunArmed:true}});check(abilityState.shieldTime===0&&abilityState.shieldCooldown===0&&abilityState.stunCooldown===0&&!abilityState.stunArmed,'Every battlefield starts with fresh ready abilities');

const openingRng=Math.random;let openingIndex=0;const openingValues=[0,.4,.95];Math.random=()=>openingValues[openingIndex++]??.5;window.TankGame.loadLevel(Levels.builtInLevels['level-7']);Math.random=openingRng;check(enemies.map(e=>e.openingDelay).join(',')==='0,0.4,0.95','Every tank samples its own independent opening delay');
window.TankGame.loadLevel(Levels.defaultLevel);active=true;walls.splice(0);Object.assign(tank,{x:150,y:150});Object.assign(enemies[0],{x:750,y:150,turret:Math.PI,reload:.8,openingDelay:.8,firstShot:true});updateEnemy(.4,enemies[0]);check(!shells.length,'Ordinary weapon waits through its opening delay');updateEnemy(.41,enemies[0]);check(shells.length===1,'Ordinary weapon fires once its opening delay expires');
pink=pinkSetup();pink.reload=.8;pink.flameCooldown=.8;updateEnemy(.4,pink);check(!pink.flame&&!shells.length,'Pink flame and burst weapon both honor opening delay');updateEnemy(.41,pink);check(pink.flame?.phase==='fire','Pink flame becomes available when opening delay expires');

abilitySetup({forged:3,rockets:3,lithe:1,swivel:1,executor:1});check(Math.abs(playerMovementSpeed()-135*1.3)<1e-8,'Three Forged Treads stacks grant thirty percent speed');check(Math.abs(playerBulletSpeed()-380*1.6)<1e-8,'Three Rockets stacks grant sixty percent bullet speed');
activateLithe();check(abilityState.dashTime===1&&abilityState.dashCooldown===0&&abilityState.swivelTime===2.5,'Shift starts one-second dash and independent two-and-half-second shield');
check(Math.abs(playerMovementSpeed()-135*1.3*2.5)<1e-8,'Lithe multiplies upgraded movement speed by two and a half');check(Math.abs(playerBulletSpeed()-380*1.6*1.2)<1e-8,'Executor boosts shots fired during dash');
fire('click');const upgradedBullet=shells[0],firedSpeed=Math.hypot(upgradedBullet.vx,upgradedBullet.vy);check(upgradedBullet.playerRocketStacks===3&&!upgradedBullet.rocket&&upgradedBullet.maxBounces===1,'Player Rockets adds scalable flame while retaining ordinary bullet ricochet');
let frontShot=bullet(400,350,-380,0,enemies[0]),backShot=bullet(50,350,380,0,enemies[0]);let sideHit=firstContact(frontShot,-300,0);check(sideHit?.shield===tank&&sideHit.partial,'Turret-facing half shield intercepts front shot');bounce(frontShot,sideHit);check(frontShot.life===0,'Swivel Shield absorbs front shot');check(!firstContact(backShot,120,0),'Uncovered rear half does not intercept bullets');
tank.turret=Math.PI;sideHit=firstContact(backShot,120,0);check(sideHit?.partial,'Swivel Shield follows turret rotation');tank.turret=0;
const beforeRearDamage=playerHearts;hitTank(backShot,tank);check(playerHearts===beforeRearDamage-1,'Rear hits still damage through Swivel Shield');hitGrace=0;frontShot=bullet(160,350,-380,0,enemies[0]);hitTank(frontShot,tank);check(playerHearts===beforeRearDamage-1,'Front-facing damage is blocked by Swivel Shield');
updatePlayerAbilities(1);check(abilityState.dashTime===0&&abilityState.dashCooldown===6&&abilityState.swivelTime===1.5,'Dash cooldown begins after speed burst ends and shield remains');check(Math.abs(playerBulletSpeed()-380*1.6)<1e-8&&Math.hypot(upgradedBullet.vx,upgradedBullet.vy)===firedSpeed,'Executor applies at firing time without slowing existing bullets later');
activateLithe();check(abilityState.dashTime===0,'Lithe cannot activate during cooldown');updatePlayerAbilities(1.5);check(tank.swivelTime===0,'Swivel Shield expires after two and a half seconds');updatePlayerAbilities(4.5);activateLithe();check(abilityState.dashTime===1,'Lithe becomes ready after six-second cooldown');
check(document.getElementById('ability-hud').innerHTML.includes('SHIFT'),'Ability HUD shows Shift control and dash progress');
window.TankGame.loadLevel(Levels.defaultLevel);check(playerMovementSpeed()===135&&playerBulletSpeed()===380&&!tank.swivelTime,'Quick Play clears Lethe effects');

window.TankGame.loadLevel(Levels.defaultLevel,{testLoadout:true,hearts:2,maxHearts:4,upgrades:{defy:1,blessing:1,lithe:1,forged:2}});active=true;countdown=0;check(playerHearts===2&&playerUpgrades.blessing&&playerMovementSpeed()===135*1.2,'Quick Play test loadout applies selected upgrades and hearts');check(!document.getElementById('game-header').hidden&&!document.getElementById('combat-hearts').hidden,'Test mode retains navigation header and health HUD');hitTank({life:1},tank);check(playerHearts===1,'Test loadout uses selected health');document.getElementById('reset').onclick();check(playerHearts===2&&playerUpgrades.blessing&&abilityState.shieldCooldown===0,'Test restart restores chosen starting health and ready upgrades');window.TankGame.loadLevel(Levels.defaultLevel);check(!playerUpgrades.blessing&&campaignCombat===null,'Regular Quick Play clears test loadout');
let mineEnemy=abilitySetup({typhon:1});dropMine();check(mines.length===1&&mineCooldown===3&&Math.abs(mineRadius*2-63*.8)<1e-8,'Typhon drops a tank-sized circular mine with three-second cooldown');dropMine();check(mines.length===1,'Active-mine cap blocks placement');updateMines(3);dropMine();check(mines.length===1,'Cap still blocks after cooldown');
mineEnemy.x=250;updateMines(.01);check(mines[0].fuse===1,'Nearby enemy starts one-second fuse');mineEnemy.x=600;updateMines(.99);check(mines.length===1,'Triggered mine waits full fuse even if enemy leaves');updateMines(.01);check(!mines.length&&playerHearts===2,'Mine explodes after one second and damages its owner');dropMine();check(mines.length===1,'Mine can be replaced after explosion and expired placement cooldown');
mineEnemy=abilitySetup({typhon:1,protector:1,fires:1});dropMine();tank.x=260;updateMines(1.5);dropMine();check(mines.length===2&&mineCooldown===1.5,'Fires permits two mines with half cooldown');mineEnemy.x=350;detonateMine(mines[0]);check(!mines.length&&!mineEnemy.alive&&playerHearts===3,'Chain reaction kills enemies and Protector prevents owner damage');check(mineBlasts.length===2,'Chain renders both fiery blasts');
mineEnemy=abilitySetup({typhon:1});dropMine();mineEnemy.x=280;walls.push({x:200,y:200,width:50,height:300,type:'solid'});updateMines(.1);check(mines[0].fuse===null,'Walls block proximity triggering');detonateMine(mines[0]);check(mineEnemy.alive,'Walls block blast damage');
mineEnemy=abilitySetup({typhon:1,protector:1});dropMine();shells=[bullet(150,350,240,0,mineEnemy)];update(.001);check(!mines.length&&!shells.length&&playerHearts===3,'A bullet detonates a mine and is canceled');
mineEnemy=abilitySetup({typhon:1});countdown=1;dropMine();check(!mines.length,'Countdown prevents mine placement');countdown=0;active=false;dropMine();check(!mines.length,'Paused game prevents mine placement');active=true;dropMine();restart();check(!mines.length&&mineCooldown===0,'Battlefield restart clears mines and refreshes placement cooldown');
mineEnemy=abilitySetup({forgiveness:1},{hearts:1});mineEnemy.x=330;hitTank({life:1},tank);check(!mineEnemy.alive&&tank.alive&&playerHearts===1&&campaignCombat.hearts===1,'Fatal blast clears final tank and revives player at one heart');check(mineBlasts[0].radius===225,'Forgiveness radius is 1.5 times mine blast');hitGrace=0;mineEnemy.alive=true;hitTank({life:1},tank);check(tank.alive&&!mineEnemy.alive&&playerHearts===1,'Forgiveness works again on another fatal hit');
mineEnemy=abilitySetup({forgiveness:1},{hearts:1});mineEnemy.x=600;hitTank({life:1},tank);check(!tank.alive&&playerHearts===0&&mineEnemy.alive,'Forgiveness cannot revive while enemies survive');
mineEnemy=abilitySetup({forgiveness:1},{hearts:1});mineEnemy.x=330;mineEnemy.shieldTime=3;hitTank({life:1},tank);check(!tank.alive&&mineEnemy.alive,'Invincible enemies survive fatal explosion and prevent revival');
mineEnemy=abilitySetup({forgiveness:1,typhon:1},{hearts:1});dropMine();tank.x=350;mineEnemy.x=220;hitTank({life:1},tank);check(!mines.length&&tank.alive&&!mineEnemy.alive,'Fatal blast triggers nearby mines without recursive self-death');

const mineSounds=[];window.TankMineAudio={play(kind){mineSounds.push(kind);}};
mineEnemy=abilitySetup({typhon:1,protector:1});dropMine();check(mineSounds.at(-1)==='place','Placing a mine plays mechanical sound');mineEnemy.x=250;updateMines(.01);check(mineSounds.at(-1)==='fuse','Triggering proximity fuse plays warning');updateMines(.25);check(mineSounds.filter(s=>s==='fuse').length===2,'Fuse repeats warning as it counts down');detonateMine(mines[0]);check(mineSounds.at(-1)==='explode'&&mineBlasts[0].blue,'Protector mine uses blue explosion and dedicated blast sound');
mineEnemy=abilitySetup({typhon:1});dropMine();detonateMine(mines[0]);check(!mineBlasts[0].blue,'Ordinary mine keeps red-orange flames');
let flameCurves=0,blastClips=0;const fireColors=[];
for(const method of ['save','restore','beginPath','closePath','moveTo','lineTo','fill','fillRect','stroke','translate','rotate'])ctx[method]=()=>{};
ctx.clip=()=>blastClips++;ctx.bezierCurveTo=()=>flameCurves++;ctx.quadraticCurveTo=()=>flameCurves++;ctx.createRadialGradient=()=>({addColorStop(position,color){fireColors.push(color);}});
mineBlasts[0].age=.2;drawMineBlasts();check(flameCurves>50&&blastClips===1&&fireColors.some(c=>c.includes('255,118,25')),'Fire has curling animated tongues clipped by cover');
mineBlasts[0].blue=true;drawMineBlasts();check(fireColors.some(c=>c.includes('50,160,255')),'Protector fire uses blue and cyan palette');

abilitySetup({});groundMarks=[];tank.x=170;stampTracks(tank,150,tank.y);check(groundMarks[0].life===25,'Treads fade five times slower');updateEffects(5);check(groundMarks.some(m=>m.type==='treads'&&m.age===5),'Treads remain after former five-second lifetime');
groundMarks=[];const scuffShot=bullet(300,300,380,0);bounce(scuffShot,{nx:-1,ny:0});check(groundMarks.length===0,'Wall ricochets leave no ground mark');
let sketchStrokes=0;ctx.stroke=()=>sketchStrokes++;tank.alive=false;drawTank(tank,false);check(sketchStrokes===14&&ctx.strokeStyle.includes('65,90,111'),'Player grave uses muted layered sketch strokes');enemies[0].alive=false;drawTank(enemies[0],true);check(sketchStrokes===28&&ctx.strokeStyle.includes('120,76,61'),'Enemy grave uses muted rust sketch strokes');
console.log(passed+' gameplay checks passed');
`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, tests + '\n})();'), context);
