(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Game = window.TankGame, Levels = window.TankLevels;
  const music = new Audio('audio/menu-theme.m4a');
  music.id = 'menu-theme'; music.volume = .25; music.loop = true; music.preload = 'auto'; music.hidden = true;
  document.body.appendChild(music);
  let inMenu = false, muted = false;
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
  function showMenu() {
    inMenu = true; Game.setEditing(true);
    music.pause();
    music.src = Math.random() < .25 ? 'audio/menu-messing-around.m4a' : 'audio/menu-theme.m4a';
    music.currentTime = 0;
    $('menu-view').hidden = false; $('game-header').hidden = true;
    $('game-view').hidden = true; $('editor-view').hidden = true;
    startMusic();
  }
  function playLevel(level) {
    leaveMenu(); $('editor-view').hidden = true; $('game-view').hidden = false;
    $('reset').hidden = false; $('open-editor').hidden = false;
    Game.loadLevel(level);
  }
  for (const level of Object.values(Levels.builtInLevels)) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = level.name;
    button.onclick = () => playLevel(level);
    $('menu-levels').appendChild(button);
  }
  const originalEditor = $('open-editor').onclick;
  $('open-editor').onclick = () => { leaveMenu(); originalEditor(); };
  $('menu-editor').onclick = () => $('open-editor').onclick();
  $('home-logo').onclick = showMenu;
  $('menu-music').onclick = () => {
    if (!music.paused && !muted) { muted = true; stopMusic(); }
    else { muted = false; startMusic(); }
  };
  document.addEventListener('pointerdown', e => { if (e.target !== $('menu-music') && !$('menu-music').contains?.(e.target)) startMusic(); });
  document.addEventListener('keydown', e => { if (e.target !== $('menu-music') && !$('menu-music').contains?.(e.target)) startMusic(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else startMusic(); });
  window.addEventListener('blur', stopMusic);
  window.addEventListener('focus', startMusic);
  const query = new URLSearchParams(window.location.search);
  if (query.get('editor') === '1') { leaveMenu(); }
  else if (Levels.builtInLevels[query.get('level')]) { playLevel(Levels.builtInLevels[query.get('level')]); }
  else showMenu();
})();
