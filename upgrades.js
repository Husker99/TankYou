(() => {
  'use strict';
  const definitions={
    smart:{name:'Smart Bullets',category:'ache',description:'E readies a tracking shot that survives one bullet collision. Cannot ricochet. Short cooldown.'},
    tracking:{name:'Upgraded Tracking',category:'ache',requires:'smart',repeatable:true,limit:2,description:'Double Smart Bullet maneuverability. Stacks up to 2 times.'},
    heavy:{name:'Heavy Ammo',category:'ache',description:'Bullets become 50% wider and 20% longer.'},
    reload:{name:'Reload Faster',category:'ache',repeatable:true,limit:3,description:'Reduce firing delay by 30%. Stacks up to 3 times.'},
    ammo:{name:'Extra Ammo',category:'ache',description:'Have up to 7 bullets active at once.'},
    typhon:{name:'Projectile Mines',category:'phleg',description:'Space places a mine. After arming, it launches at nearby enemies and explodes. One mine at a time. Short cooldown.'},
    demolitions:{name:'Elite Demolitions',category:'phleg',requires:'typhon',description:'Mines arm in 0.5 seconds. Carry up to 3 active mines.'},
    protector:{name:'Protector Mines',category:'phleg',requires:'typhon',description:'Your mines can no longer hurt you.'},
    fires:{name:'Mine Capacity',category:'phleg',requires:'typhon',description:'Place up to two mines at once, with half the cooldown.'},
    forgiveness:{name:"Afterlife",category:'phleg',description:'Explode when you die. If the blast clears the room, revive with 1 heart.'},
    blessing:{name:"Shield",description:'Q grants a brief shield that absorbs bullets and blocks all damage. Long cooldown.'},
    favored:{name:"Deflect Shield",requires:'blessing',description:'Your shield lasts longer and reflects bullets.'},
    hero:{name:"Offensive Shield",requires:'blessing',description:'Double your shield’s area. Enemies touching it take damage.'},
    defy:{name:'Empty Heart Slot',repeatable:true,description:'Gain an empty heart slot. Repeatable.'},
    stun:{name:'Stun',description:'Q readies a stunning energy wave for your next shot. Short cooldown.'},
    forged:{name:'Forged Treads',category:'lethe',repeatable:true,limit:3,description:'Move 10% faster. Stacks up to 3 times.'},
    rockets:{name:'Rockets',category:'lethe',repeatable:true,limit:3,description:'Bullets fly 20% faster with a flame trail. Stacks up to 3 times.'},
    lithe:{name:'Dash',category:'lethe',description:'Shift gives a brief burst of speed. Short cooldown.'},
    swivel:{name:'Swivel Shield',category:'lethe',requires:'lithe',description:'Dashing briefly shields the side you’re aiming toward, absorbing incoming bullets.'},
    executor:{name:'Bullet Speed',category:'lethe',requires:'lithe',description:'Bullets fired while dashing travel 20% faster.'},
    grasp:{name:"Upgraded Stun",requires:'stun',description:'Your stun lasts much longer.'}
  };
  function normalize(value={}){return Object.fromEntries(Object.keys(definitions).map(id=>[id,Number.isInteger(value?.[id])&&value[id]>0?(definitions[id].repeatable?Math.min(definitions[id].limit||997,value[id]):1):0]));}
  function offers(owned,category='stygian'){
    const eligible=Object.keys(definitions).filter(id=>(definitions[id].category||'stygian')===category&&(!owned[id]||(definitions[id].repeatable&&owned[id]<(definitions[id].limit||Infinity)))&&(!definitions[id].requires||owned[definitions[id].requires]));
    const result=[];if(!eligible.length)return result;
    for(let i=0;i<2;i++){const distinct=eligible.filter(id=>!result.includes(id));const pool=distinct.length?distinct:eligible;result.push(pool[Math.floor(Math.random()*pool.length)]);}return result;
  }
  window.TankUpgrades={definitions,normalize,offers};
})();
