(() => {
  'use strict';
  const definitions={
    typhon:{name:'Typhon Mines',category:'phleg',description:'Space drops a mine. Enemies within one square start a 1-second fuse. Bullets and nearby explosions detonate it instantly. Blast radius: 1.5 squares. One active mine; 3-second placement cooldown.'},
    protector:{name:'Protector Mines',category:'phleg',requires:'typhon',description:'Your mines no longer damage you.'},
    fires:{name:'Fires of Phlegethon',category:'phleg',requires:'typhon',description:'Allow two active mines and reduce placement cooldown to 1.5 seconds.'},
    forgiveness:{name:"Olympus's Forgiveness",category:'phleg',description:'Every fatal hit unleashes a blast with 2.25-square radius. If it destroys the final enemies, revive with 1 heart and continue.'},
    blessing:{name:"Styx's Blessing",description:'Q activates a shield for 3 seconds. Prevents all damage and absorbs incoming bullets. Recharges for 13 seconds after it ends.'},
    favored:{name:"Styx's Favored",requires:'blessing',description:'Your shield lasts 5 seconds and deflects incoming bullets.'},
    hero:{name:"Styx's Hero",requires:'blessing',description:'Your shield covers twice the area and damages enemies that touch it.'},
    defy:{name:'Defy Death',repeatable:true,description:'Gain 1 maximum heart slot. Your current hearts stay the same.'},
    stun:{name:'Stun',description:'Q arms your next shot as an energy wave, replacing one bullet and using one of your five shot slots. Stuns enemies for 1 second. Recharges in 6 seconds.'},
    forged:{name:'Forged Treads',category:'lethe',repeatable:true,limit:3,description:'Gain 10% movement speed. Can be chosen up to 3 times.'},
    rockets:{name:'Rockets',category:'lethe',repeatable:true,limit:3,description:'Gain 20% bullet speed and a flame trail that grows with each stack. Can be chosen up to 3 times.'},
    lithe:{name:'Lithe',category:'lethe',description:'Shift grants 2.5× movement speed for 1 second. Recharges for 6 seconds after it ends.'},
    swivel:{name:'Swivel Shield',category:'lethe',requires:'lithe',description:'Using Lithe grants a turret-facing half shield for 2.5 seconds. It follows your aim and absorbs incoming shots from that side.'},
    executor:{name:'Executor',category:'lethe',requires:'lithe',description:'Bullets fired during Lithe gain an additional 20% speed.'},
    grasp:{name:"Death's Grasp",requires:'stun',description:'Your energy wave now stuns enemies for 4 seconds.'}
  };
  function normalize(value={}){return Object.fromEntries(Object.keys(definitions).map(id=>[id,Number.isInteger(value?.[id])&&value[id]>0?(definitions[id].repeatable?Math.min(definitions[id].limit||997,value[id]):1):0]));}
  function offers(owned,category='stygian'){
    const eligible=Object.keys(definitions).filter(id=>(definitions[id].category||'stygian')===category&&(!owned[id]||(definitions[id].repeatable&&owned[id]<(definitions[id].limit||Infinity)))&&(!definitions[id].requires||owned[definitions[id].requires]));
    const result=[];if(!eligible.length)return result;
    for(let i=0;i<2;i++){const distinct=eligible.filter(id=>!result.includes(id));const pool=distinct.length?distinct:eligible;result.push(pool[Math.floor(Math.random()*pool.length)]);}return result;
  }
  window.TankUpgrades={definitions,normalize,offers};
})();
