(() => {
  'use strict';
  const canvas=document.getElementById('menu-home-art');if(!canvas)return;
  const g=canvas.getContext('2d'),ratio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=600*ratio;canvas.height=460*ratio;g.scale(ratio,ratio);
  g.strokeStyle='#89987338';g.lineWidth=1;
  for(let j=0;j<8;j++){g.beginPath();g.ellipse(330,220,100+j*22,65+j*16,-.5,0,Math.PI*2);g.stroke();}
  g.strokeStyle='#a45c3a';g.lineWidth=2.5;g.setLineDash([6,8]);g.beginPath();g.moveTo(130,360);g.bezierCurveTo(145,255,370,395,385,255);g.bezierCurveTo(390,135,195,165,260,77);g.stroke();g.setLineDash([]);
  for(const [x,y,w,h]of [[260,225,80,45],[190,120,65,35],[390,125,45,65]]){g.fillStyle='#bdc19f';g.fillRect(x,y,w,h);g.strokeStyle='#83916b';g.lineWidth=1.5;g.strokeRect(x,y,w,h);g.fillStyle='#dce0be';g.fillRect(x+3,y+3,w-6,3);}
  function tank(x,y,hull,palette){g.save();g.translate(x,y);g.scale(1.4,1.4);window.TankLevels.paintTank(g,palette,{hull,turret:hull,tread:0,recoil:0});g.restore();}
  tank(140,323,-1.12,{tracks:'#344e4b',tread:'#88968a',body:'#337ba2',front:'#62a3b8',barrel:'#286b88',turret:'#3b86a7',hatch:'#74a9b5'});
  tank(410,145,-2.22,window.TankLevels.aiTypes.sentry.palette);
  g.strokeStyle='#87916b';g.lineWidth=1;
  for(const [x,y]of [[85,105],[450,305]]){g.beginPath();g.moveTo(x-7,y);g.lineTo(x+7,y);g.moveTo(x,y-7);g.lineTo(x,y+7);g.stroke();}
  g.strokeStyle='#a45c3a';g.beginPath();g.moveTo(255,72);g.lineTo(265,82);g.moveTo(265,72);g.lineTo(255,82);g.stroke();
})();
