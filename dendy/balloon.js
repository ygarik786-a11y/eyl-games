// E.Y.L Dendy — Balloon Fight: махай крыльями, лопай шарики врагов сверху!
// GAMECFG: { slug, levels:[{birds:3}, ...] }
(function(){
'use strict';
var CFG = window.GAMECFG;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var PLATS = [
  { x: 30, y: 250, w: 110 }, { x: 340, y: 250, w: 110 },
  { x: 185, y: 205, w: 110 },
  { x: 60, y: 140, w: 100 }, { x: 320, y: 140, w: 100 },
  { x: 190, y: 82, w: 100 }
];
var GROUND = 292;
var score = 0, lives = 3, level = 0, state = 'play', msgT = null, paused = false;
var hero = null, birds = [], flapCd = 0, fishT = 500, fishY = 320;
var keys = {};
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Уровень: ' + (level + 1) + '/' + CFG.levels.length + ' • Птиц осталось: ' + birds.filter(function(b){ return b.mode !== 'gone'; }).length + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function spawnHero(){
  hero = { x: 240, y: 228, vx: 0, vy: 0, balloons: 2, invuln: 100 };
}
function startLevel(i){
  level = i; birds = [];
  var n = CFG.levels[i].birds;
  var spots = [ {x:85,y:228}, {x:395,y:228}, {x:240,y:183}, {x:110,y:118}, {x:370,y:118}, {x:240,y:60} ];
  for (var k = 0; k < n; k++) {
    var s = spots[k % spots.length];
    birds.push({ x: s.x, y: s.y, vx: 0, vy: 0, mode: 'inflate', t: 60 + k * 40, phase: Math.random() * 6 });
  }
  spawnHero();
  state = 'play'; hud();
  setMsg('🎈 Уровень ' + (i + 1) + '! Лопай шарики птиц сверху и не падай в воду!');
}
function heroDie(why){
  lives--; saveBest(); hud();
  if (lives <= 0) { state = 'over'; setMsg('💥 Игра окончена! Счёт: ' + score + '. Нажми «Заново».'); return; }
  setMsg(why + ' Осталось жизней: ' + lives);
  spawnHero();
}
function platAt(x, y, vy){
  for (var i = 0; i < PLATS.length; i++) {
    var p = PLATS[i];
    if (x > p.x - 8 && x < p.x + p.w + 8 && y >= p.y - 12 && y <= p.y + 4 && vy >= 0) return p;
  }
  return null;
}
function step(){
  flapCd--;
  // герой
  var h = hero;
  if (h.invuln > 0) h.invuln--;
  if (keys.left) h.vx -= 0.09;
  if (keys.right) h.vx += 0.09;
  h.vx *= 0.985;
  var wantFlap = keys.flap;
  if (wantFlap && flapCd <= 0) { h.vy -= 2.35; flapCd = 9; }
  h.vy += 0.115;
  if (h.vy > 3.4) h.vy = 3.4;
  var oldY = h.y;
  h.x += h.vx; h.y += h.vy;
  if (h.x < -14) h.x = 494;
  if (h.x > 494) h.x = -14;
  if (h.y < 16) { h.y = 16; h.vy = Math.abs(h.vy) * 0.4; }
  var pl = platAt(h.x, h.y + 10, h.vy);
  if (pl && oldY + 10 <= pl.y + 2) { h.y = pl.y - 10; h.vy = 0; }
  if (h.y > GROUND - 4) { heroDie('🌊 Бульк! Вода холодная.'); return; }
  // птицы
  var alive = 0;
  birds.forEach(function(b){
    if (b.mode === 'gone') return;
    alive++;
    b.phase += 0.08;
    if (b.mode === 'inflate') {
      b.t--;
      if (b.t <= 0) { b.mode = 'fly'; b.vy = -0.6; }
      return;
    }
    if (b.mode === 'fly') {
      var dx = h.x - b.x;
      b.vx += Math.sign(dx) * 0.02;
      b.vx *= 0.98;
      if (b.vx > 1.1) b.vx = 1.1; if (b.vx < -1.1) b.vx = -1.1;
      b.vy += (Math.sin(b.phase) * 0.02) + (h.y < b.y ? -0.008 : 0.012);
      if (b.vy > 0.9) b.vy = 0.9; if (b.vy < -0.9) b.vy = -0.9;
      b.x += b.vx; b.y += b.vy;
      if (b.x < 12) { b.x = 12; b.vx = Math.abs(b.vx); }
      if (b.x > 468) { b.x = 468; b.vx = -Math.abs(b.vx); }
      if (b.y < 20) { b.y = 20; b.vy = Math.abs(b.vy); }
      var bp = platAt(b.x, b.y + 10, b.vy);
      if (bp) { b.y = bp.y - 10; b.vy = -0.3; }
      if (b.y > GROUND - 2) { b.mode = 'gone'; setMsg('🌊 Птица утонула! +250'); score += 250; hud(); return; }
    } else if (b.mode === 'para') {
      b.vy = Math.min(0.85, b.vy + 0.03);
      b.x += Math.sin(b.phase * 2) * 0.4;
      b.y += b.vy;
      var pp = platAt(b.x, b.y + 10, b.vy);
      if (pp) { b.y = pp.y - 10; b.mode = 'inflate'; b.t = 200; b.vy = 0; }
      else if (b.y > GROUND - 2) { b.mode = 'gone'; setMsg('🌊 Мимо! Птица в воде. +250'); score += 250; hud(); return; }
    }
    // столкновения с героем
    var ddx = Math.abs(b.x - h.x), ddy = b.y - h.y;
    if (ddx < 21 && Math.abs(ddy) < 21) {
      if (b.mode === 'fly') {
        if (ddy > 5 && h.vy > -0.5) {
          // герой сверху — шарик лопнул!
          b.mode = 'para'; b.vy = 0.2; score += 500; h.vy = -1.7;
          setMsg('💥 Шарик лопнул! +500'); hud();
        } else if (h.invuln <= 0) {
          h.balloons--;
          h.invuln = 120; h.vy = -1.2; h.vx = (h.x < b.x ? -1.6 : 1.6);
          if (h.balloons <= 0) { heroDie('🎈 Шарики кончились!'); }
          else { setMsg('🎈 Один шарик лопнул! Осторожнее!'); hud(); }
          if (state !== 'play' || lives <= 0) return;
        }
      } else if (b.mode === 'para' || b.mode === 'inflate') {
        b.mode = 'gone'; score += 750; setMsg('⭐ Птица обезврежена! +750'); hud();
      }
    }
  });
  // рыба
  fishT--;
  if (fishT <= 0) { fishT = 480 + Math.random() * 400; fishY = 292; }
  if (fishY < 320) { fishY += 0; }
  var remaining = birds.filter(function(b){ return b.mode !== 'gone'; }).length;
  if (remaining === 0) {
    saveBest();
    if (level + 1 < CFG.levels.length) { score += 500; startLevel(level + 1); setMsg('🎉 Уровень пройден! +500'); }
    else { state = 'win'; setMsg('🏆 Победа! Небо очищено! Счёт: ' + score); hud(); }
    return;
  }
  hud();
}
function draw(){
  ctx.fillStyle = '#0b1030'; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = '#f5eeda';
  for (var i = 0; i < 40; i++) ctx.fillRect((i * 67) % 480, (i * 41) % 150, 2, 2);
  ctx.fillStyle = '#ffd968'; ctx.beginPath(); ctx.arc(432, 36, 15, 0, 7); ctx.fill();
  PLATS.forEach(function(p){
    ctx.fillStyle = '#7a4a21'; ctx.fillRect(p.x, p.y, p.w, 9);
    ctx.fillStyle = '#a5672c'; ctx.fillRect(p.x, p.y, p.w, 3);
  });
  ctx.fillStyle = '#1450a0'; ctx.fillRect(0, GROUND, 480, 320 - GROUND);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (var w = 0; w < 8; w++) ctx.fillRect((w * 61 + (Date.now() / 30) % 61) % 480, GROUND + 6 + (w % 3) * 7, 22, 2);
  ctx.font = '19px serif'; ctx.textAlign = 'center';
  birds.forEach(function(b){
    if (b.mode === 'gone') return;
    if (b.mode === 'fly') ctx.fillText('🎈🐦', b.x, b.y + 6);
    else if (b.mode === 'para') ctx.fillText('🪂🐦', b.x, b.y + 6);
    else ctx.fillText('🐦', b.x, b.y + 6);
  });
  if (hero && !(hero.invuln > 0 && (hero.invuln >> 3) % 2)) {
    ctx.font = '19px serif';
    ctx.fillText(hero.balloons === 2 ? '🎈👦🎈' : '🎈👦', hero.x, hero.y + 6);
  }
  if (fishT < 60) { ctx.font = '20px serif'; ctx.fillText('🐟', 240 + Math.sin(fishT / 6) * 120, GROUND + 20); }
  if (state === 'win' || state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 125, 480, 64);
    ctx.fillStyle = '#fff'; ctx.font = '25px sans-serif';
    ctx.fillText(state === 'win' ? '🏆 ПОБЕДА!' : '💥 ИГРА ОКОНЧЕНА', 240, 166);
  }
}
var lastTs = 0, acc = 0;
function frame(ts){
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  var dt = Math.min(50, ts - lastTs); lastTs = ts;
  if (state === 'play' && !paused) {
    acc += dt;
    while (acc >= 16.7) { acc -= 16.7; step(); if (state !== 'play') break; }
  }
  draw();
}
document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  else if (k === 'arrowright' || k === 'd') keys.right = true;
  else if (k === 'arrowup' || k === 'w' || k === ' ' || k === 'z' || k === 'x') keys.flap = true;
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  else if (k === 'arrowright' || k === 'd') keys.right = false;
  else if (k === 'arrowup' || k === 'w' || k === ' ' || k === 'z' || k === 'x') keys.flap = false;
});
function bindHold(id, name){
  var b = el(id); if (!b) return;
  var on = function(e){ e.preventDefault(); keys[name] = true; };
  var off = function(e){ e.preventDefault(); keys[name] = false; };
  b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
}
bindHold('btnL', 'left'); bindHold('btnR', 'right');
bindHold('btnA', 'flap'); bindHold('btnJ', 'flap'); bindHold('btnU', 'flap');
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; lives = 3; paused = false; startLevel(0); });
startLevel(0);
requestAnimationFrame(frame);
})();
