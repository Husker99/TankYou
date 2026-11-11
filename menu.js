(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Game = window.TankGame, Levels = window.TankLevels, Campaign = window.TankCampaign;
  const music = new Audio('audio/menu-theme.m4a');
  music.id = 'menu-theme'; music.volume = .25; music.loop = true; music.preload = 'auto'; music.hidden = true;
  document.body.appendChild(music);
  let inMenu = false, muted = true, quickPlayIndex = -1, cleared = false;
  let victoryTimer=null;
  function cancelVictory(){if(victoryTimer!==null){clearTimeout(victoryTimer);victoryTimer=null;}$('campaign-victory-summary').hidden=true;$('result').classList?.toggle('campaign-victory',false);}
  function returnFromVictory(){if(victoryTimer===null)return;cancelVictory();Campaign.open();}
  document.addEventListener('click',event=>{if(victoryTimer!==null){event.stopImmediatePropagation?.();event.preventDefault?.();returnFromVictory();}},true);
  const encounterLevels=window.TankEncounters?.list().map(entry=>entry.level)||[];
  let quickCollection;
  const quickLevels = Object.values(Levels.builtInLevels);
  function updateMusicButton() {
    const audible = !muted && !music.paused;
    $('menu-music').setAttribute('aria-label', audible ? 'Mute music' : 'Unmute music');
    $('menu-music').setAttribute('aria-pressed', String(!audible));
  }
  function startMusic() {
    if (!inMenu || muted || document.hidden) return;
    music.volume = .25;
    // Browser autoplay policy may require a pointer or keyboard gesture.
    music.play().then(updateMusicButton).catch(updateMusicButton);
  }
  function stopMusic() { music.pause(); updateMusicButton(); }
  music.addEventListener('play', updateMusicButton);
  music.addEventListener('pause', updateMusicButton);
  music.addEventListener('error', () => { $('menu-music').setAttribute('aria-label', 'Music unavailable'); $('menu-music').disabled = true; });
  function leaveMenu() {
    inMenu = false; stopMusic(); $('menu-view').hidden = true; $('game-header').hidden = false;
  }
  function showMenuPage(quickPlay = false,roguelikeLevels=false) {
    $('menu-home').hidden = quickPlay;
    $('quick-play-view').hidden = !quickPlay||roguelikeLevels;
    $('roguelike-levels-view').hidden=!quickPlay||!roguelikeLevels;
  }
  $('menu-quick-play').onclick = () => { showMenuPage(true); $('quick-play-back').focus?.(); };
  $('quick-play-roguelike').onclick=()=>showMenuPage(true,true);
  $('roguelike-levels-back').onclick=()=>showMenuPage(true);
  $('roguelike-levels-empty').hidden=encounterLevels.length>0;
  for(const level of encounterLevels){const button=document.createElement('button');button.type='button';button.textContent=level.name;button.onclick=()=>playLevel(level,encounterLevels);$('roguelike-level-list').appendChild(button);}
  $('quick-play-back').onclick = () => { showMenuPage(); $('menu-quick-play').focus?.(); };
  function showMenu(quickPlay = false,roguelikeLevels=false) {
    hideEditorScreens();Campaign?.suspend();
    quickPlayIndex = -1; cleared = false;
    showMenuPage(quickPlay,roguelikeLevels);
    $('campaign-view').hidden = true;
    inMenu = true; Game.setEditing(true);
    music.pause();
    music.src = Math.random() < .25 ? 'audio/menu-messing-around.m4a' : 'audio/menu-theme.m4a';
    music.currentTime = 0;
    $('menu-view').hidden = false; $('game-header').hidden = true;
    $('game-view').hidden = true; $('editor-view').hidden = true;
    startMusic();
  }
  function playLevel(level,collection=quickLevels) {
    quickCollection=collection;
    hideEditorScreens();Campaign?.suspend();
    quickPlayIndex = collection.indexOf(level); cleared = false;
    $('quick-play-result').hidden = true;
    $('campaign-view').hidden = true;
    leaveMenu(); $('editor-view').hidden = true; $('game-view').hidden = false;
    $('reset').hidden = false; $('open-editor').hidden = false;
    Game.loadLevel(level,collection===encounterLevels?window.TankTestLoadout?.getOptions():undefined);
    $('game-header').hidden = true;
  }
  for (const level of quickLevels) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = level.name;
    button.onclick = () => playLevel(level);
    $('menu-levels').appendChild(button);
  }
  function hideEditorScreens() { cancelVictory(); $('upgrade-view').hidden=true; $('editor-choice-view').hidden=true;$('map-editor-view').hidden=true; }
  function showEditorChooser() {
    cancelVictory();
    Campaign?.suspend();quickPlayIndex=-1;cleared=false;Game.setEditing(true);
    $('menu-view').hidden=true;$('game-view').hidden=true;$('editor-view').hidden=true;$('campaign-view').hidden=true;
    $('game-header').hidden=true;$('map-editor-view').hidden=true;$('editor-choice-view').hidden=false;
    inMenu=true;startMusic();
  }
  $('editor-choice-back').onclick=()=>showMenu();
  const originalEditor = $('open-editor').onclick;
  $('choose-level-editor').onclick = () => { hideEditorScreens();Campaign?.suspend(); quickPlayIndex = -1; cleared = false; $('campaign-view').hidden = true; leaveMenu(); originalEditor(); };
  $('open-editor').onclick = showEditorChooser;
  $('menu-editor').onclick = () => $('open-editor').onclick();
  $('home-logo').onclick = () => showMenu();
  $('menu-home-logo').onclick = () => showMenu();
  Game.onRoundEnd = ({ won }) => {
    if(Campaign?.inCombat()) {
      Campaign.finishCombat(won);
      $('quick-play-result').hidden=true;$('play-again').hidden=true;
      $('campaign-result').hidden=won;
      $('campaign-continue').textContent='View Run';
      if(won){
        cancelVictory();const run=Campaign.getState();
        $('campaign-victory-summary').hidden=false;$('result').classList?.toggle('campaign-victory',true);
        Levels.renderHearts($('victory-hearts'),run.hearts,run.maxHearts);$('victory-crest').innerHTML=Campaign.icon('tank');
        const list=$('victory-upgrades');list.replaceChildren();
        const upgrades=Object.entries(run.upgrades||{}).filter(([id,count])=>count&&window.TankUpgrades?.definitions[id]);
        for(const [id,count]of upgrades){const item=document.createElement('span');item.textContent=window.TankUpgrades.definitions[id].name+(count>1?` × ${count}`:'');list.appendChild(item);}
        if(!upgrades.length){const item=document.createElement('span');item.textContent='No upgrades yet';list.appendChild(item);}
        victoryTimer=setTimeout(returnFromVictory,1500);
      }
      if(!won){$('result-detail').hidden=false;$('result-detail').textContent='Your hearts are gone. This run has ended.';}
      return;
    }
    cleared = quickPlayIndex >= 0;
    if(cleared){
      $('result-title').textContent=won?'Room cleared':'Room Failed';
      $('play-again').textContent=won?'Play again':'Try Again';
      $('result-detail').hidden=true;
    }
    $('quick-play-result').hidden = !cleared;
    $('result-next-level').disabled = !cleared || quickPlayIndex >= quickCollection.length - 1;
  };
  $('result-level-select').onclick = () => { if (cleared) showMenu(true,quickCollection===encounterLevels); };
  $('result-next-level').onclick = () => {
    if (cleared && quickPlayIndex >= 0 && quickPlayIndex + 1 < quickCollection.length) playLevel(quickCollection[quickPlayIndex + 1],quickCollection);
  };
  if(Campaign) {
    Campaign.configure({
      onMap() {
        hideEditorScreens();
        quickPlayIndex=-1;cleared=false;Game.setEditing(true);
        $('menu-view').hidden=true;$('game-view').hidden=true;$('editor-view').hidden=true;
        $('game-header').hidden=true;$('campaign-view').hidden=false;
        inMenu=true;startMusic();
      },
      onUpgrade(){hideEditorScreens();Game.setEditing(true);$('menu-view').hidden=true;$('game-view').hidden=true;$('editor-view').hidden=true;$('campaign-view').hidden=true;$('game-header').hidden=true;$('upgrade-view').hidden=false;inMenu=false;stopMusic();},
      onCombat(level,options) {
        hideEditorScreens();
        quickPlayIndex=-1;cleared=false;leaveMenu();
        $('campaign-view').hidden=true;$('editor-view').hidden=true;$('game-view').hidden=false;
        $('reset').hidden=true;$('open-editor').hidden=true;
        Game.loadLevel(level,{...options,campaign:true});
      },
      onMenu:()=>showMenu()
    });
    $('menu-roguelike').onclick=()=>Campaign.openDefault();
    $('campaign-continue').onclick=()=>Campaign.open();
  }
  if(window.TankMapEditor) {
    window.TankMapEditor.configure({
      onOpen(){Campaign?.suspend();Game.setEditing(true);hideEditorScreens();$('map-editor-view').hidden=false;$('editor-choice-view').hidden=true;$('game-header').hidden=true;$('menu-view').hidden=true;$('game-view').hidden=true;$('editor-view').hidden=true;$('campaign-view').hidden=true;inMenu=false;stopMusic();},
      onBack:showEditorChooser,
      onPlay:map=>Campaign.startMap(map)
    });
    $('choose-map-editor').onclick=()=>window.TankMapEditor.open();
  }
  $('menu-music').onclick = () => {
    if (!music.paused && !muted) { muted = true; stopMusic(); }
    else { muted = false; startMusic(); }
  };
  document.addEventListener('pointerdown', e => { if (e.target !== $('menu-music') && !$('menu-music').contains?.(e.target)) startMusic(); });
  document.addEventListener('keydown', e => { if (e.target !== $('menu-music') && !$('menu-music').contains?.(e.target)) startMusic(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else startMusic(); });
  window.addEventListener('blur', stopMusic);
  window.addEventListener('focus', startMusic);
  updateMusicButton();
  const query = new URLSearchParams(window.location.search);
  if (query.get('editor') === '1') { leaveMenu(); }
  else if (Levels.builtInLevels[query.get('level')]) { playLevel(Levels.builtInLevels[query.get('level')]); }
  else showMenu();
})();
