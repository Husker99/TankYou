(() => {
  'use strict';
  let context, lastBlast=-Infinity,lastMud=-Infinity;
  function play(kind,intensity=0){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    try{
      context ||= new AudioContext();
      if(context.state==='suspended')context.resume().catch(()=>{});
      const now=context.currentTime;
      // A chain reaction shares one boom, avoiding a pileup of full-volume blasts.
      if(kind==='explode'&&now-lastBlast<.04)return;
      if(kind==='explode')lastBlast=now;
      const tone=(frequency,end,duration,volume,type='sine')=>{
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(end,now+duration);
        gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now);oscillator.stop(now+duration+.01);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      };
      if(kind==='mud'){
        if(now-lastMud<.14)return;lastMud=now;
        const duration=.18,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0);
        for(let i=0;i<samples.length;i++){const t=i/samples.length;samples[i]=(Math.random()*2-1)*Math.sin(Math.PI*t)*Math.exp(-t*3);}
        const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(650,now);filter.frequency.exponentialRampToValueAtTime(180,now+duration);gain.gain.setValueAtTime(.13,now);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
      }
      if(kind==='sniper'){
        // A dry rifle crack with a brief low punch and airy tail.
        tone(180,48,.17,.12,'triangle');
        const duration=.2,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0);
        for(let i=0;i<samples.length;i++){const t=i/context.sampleRate;samples[i]=(Math.random()*2-1)*(Math.exp(-t*100)+.18*Math.exp(-t*22));}
        const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.setValueAtTime(650,now);gain.gain.setValueAtTime(.35,now);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
      }
      if(kind==='disrupt'){tone(480,180,.2,.035,'sine');tone(700,260,.17,.018,'triangle');return;}
      if(kind==='place'){tone(190,85,.085,.07,'triangle');tone(1100,450,.025,.022);return;}
      if(kind==='activate'){tone(420,850,.16,.045,'triangle');tone(1050,1250,.1,.02);return;}
      if(kind==='fuse'){tone(850,1000,.045,.035,'triangle');return;}
      if(kind==='target'){tone(1200,650,.08,.03,'triangle');return;}
      if(kind==='launch'){tone(130,540,.18,.065,'sawtooth');return;}
      if(kind==='flight'){tone(240+intensity*240,320+intensity*300,.105,.018,'triangle');return;}
      if(kind==='impact'){tone(100,45,.075,.09,'triangle');return;}
      if(kind!=='explode')return;
      tone(115,32,.48,.19);
      const duration=.55,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++){const t=i/samples.length;samples[i]=(Math.random()*2-1)*Math.exp(-t*6)*(1+.25*Math.sin(i*.13));}
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(3500,now);filter.frequency.exponentialRampToValueAtTime(160,now+duration);gain.gain.setValueAtTime(.24,now);
      source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }catch{/* Audio support must never interrupt gameplay. */}
  }
  window.TankMineAudio={play};
})();
