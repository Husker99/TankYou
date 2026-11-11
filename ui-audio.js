(() => {
  'use strict';
  let context;
  function playTone(countdown=false){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    try{
      context=context||new AudioContext();
      if(context.state==='suspended')context.resume().catch(()=>{});
      const now=context.currentTime,tone=context.createOscillator(),gain=context.createGain();
      tone.type=countdown?'sine':'triangle';tone.frequency.setValueAtTime(countdown?620:310,now);tone.frequency.exponentialRampToValueAtTime(countdown?520:145,now+(countdown?.1:.035));
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(countdown?.035:.055,now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+(countdown?.12:.04));
      tone.connect(gain);gain.connect(context.destination);tone.start(now);tone.stop(now+(countdown?.13:.045));tone.onended=()=>{tone.disconnect();gain.disconnect();};
    }catch{/* A missing audio device must never prevent a button action. */}
  }
  window.TankUIAudio={countdown:()=>playTone(true)};
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('button');
    if(button&&!button.disabled)playTone();
  },true);
})();
