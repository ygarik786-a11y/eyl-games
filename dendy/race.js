// E.Y.L Dendy — движок вертикальных гонок (Road Fighter и подобные)
// GAMECFG: { slug, hero, rivals:[emoji], pickup, theme:{bg,road,edge,line},
//   stages:[{dist, traffic, rmax}] }
(function(){
'use strict';
var CFG = window.GAMECFG;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var ROAD_L = 120, ROAD_R = 360, PY = 258;
var score = 0, lives = 3, stage = 0, state = 'play', dist = 0, speed = 0, scroll = 0;
var px = 240, rivals = [], pickups = [], invuln = 0, spawnT = 0, pickT = 300, msgT = null, paused = false;
var keys = {};
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ var st = CFG.stages[stage]; el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Этап: ' + (stage + 1) + '/' + CFG.stages.length + ' • Дистанция: ' + Math.floor(dist) + '/' + st.dist + ' м • Скорость: ' + Math.floor(speed * 36) + ' км/ч • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function startStage(i){
  stage = i; dist = 0; speed = 0; rivals = []; pickups = []; invuln = 90; px = 240;
  state = 'play'; hud(); setMsg('🏁 Этап ' + (i + 1) + '! Доедь до ' + CFG.stages[i].dist + ' м. Газ — стрелка вверх!');
}
function crash(r){
  lives--; saveBest(); hud();
  rivals.splice(rivals.indexOf(r), 1);
  speed = 0; invuln = 150;
  if (lives <= 0) { state = 'over'; setMsg('💥 Машина разбита! Игра окончена. Счёт: ' + score + '. Нажми «Заново».'); }
  else setMsg('💥 Авария! Осталось жизней: ' + lives);
}
function step(){
  var st = CFG.stages[stage];
  var maxV = 3.4 + stage * 0.5;
  if (keys.up) speed = Math.min(maxV, speed + 0.045);
  else if (keys.down) speed = Math.max(0, speed - 0.09);
  else speed = Math.max(0, speed - 0.008);
  if (keys.left) px -= 3.4;
  if (keys.right) px += 3.4;
  if (px < ROAD_L + 16) px = ROAD_L + 16;
  if (px > ROAD_R - 16) px = ROAD_R - 16;
  dist += speed * 0.55;
  scroll += speed * 3;
  if (invuln > 0) invuln--;
  spawnT--;
  if (spawnT <= 0 && speed > 0.4) {
    spawnT = Math.floor(46 - st.traffic * 26 + Math.random() * 30);
    var rx = ROAD_L + 26 + Math.random() * (ROAD_R - ROAD_L - 52);
    var ok = true;
    rivals.forEach(function(r){ if (Math.abs(r.x - rx) < 44 && r.y < 60) ok = false; });
    if (ok) rivals.push({ x: rx, y: -30, v: 0.9 + Math.random() * st.rmax, e: CFG.rivals[Math.floor(Math.random() * CFG.rivals.length)] });
  }
  if (CFG.pickup) {
    pickT--;
    if (pickT <= 0) { pickT = 700 + Math.random() * 500; pickups.push({ x: ROAD_L + 30 + Math.random() * (ROAD_R - ROAD_L - 60), y: -30 }); }
  }
  for (var i = rivals.length - 1; i >= 0; i--) {
    var r = rivals[i];
    r.y += (speed - r.v) * 2.2;
    if (r.y > 350) { rivals.splice(i, 1); score += 25; hud(); continue; }
    if (r.y < -420) { rivals.splice(i, 1); continue; }
    if (invuln <= 0 && Math.abs(r.x - px) < 27 && Math.abs(r.y - PY) < 30) crash(r);
  }
  for (var j = pickups.length - 1; j >= 0; j--) {
    var p = pickups[j];
    p.y += speed * 2.2;
    if (p.y > 350) { pickups.splice(j, 1); continue; }
    if (Math.abs(p.x - px) < 28 && Math.abs(p.y - PY) < 30) { pickups.splice(j, 1); score += 300; setMsg(CFG.pickup + ' Бонус +300!'); hud(); }
  }
  if (dist >= st.dist) {
    saveBest();
    if (stage + 1 < CFG.stages.length) { score += 500; startStage(stage + 1); setMsg('🏆 Этап пройден! +500'); }
    else { state = 'win'; setMsg('🏆 Победа! Все этапы пройдены! Счёт: ' + score); hud(); }
  }
}
function draw(){
  ctx.fillStyle = CFG.theme.bg; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = CFG.theme.road; ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, 320);
  ctx.fillStyle = CFG.theme.edge;
  ctx.fillRect(ROAD_L - 6, 0, 6, 320); ctx.fillRect(ROAD_R, 0, 6, 320);
  ctx.strokeStyle = CFG.theme.line; ctx.lineWidth = 4; ctx.setLineDash([22, 26]);
  ctx.lineDashOffset = scroll;
  ctx.beginPath(); ctx.moveTo(240, -30); ctx.lineTo(240, 350); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '24px serif'; ctx.textAlign = 'center';
  pickups.forEach(function(p){ ctx.fillText(CFG.pickup, p.x, p.y + 8); });
  rivals.forEach(function(r){ ctx.fillText(r.e, r.x, r.y + 8); });
  if (!(invuln > 0 && (invuln >> 3) % 2)) ctx.fillText(CFG.hero, px, PY + 8);
  if (state === 'win' || state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 120, 480, 70);
    ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif';
    ctx.fillText(state === 'win' ? '🏆 ПОБЕДА!' : '💥 ИГРА ОКОНЧЕНА', 240, 165);
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
function setKey(name, val){ keys[name] = val; }
document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') setKey('left', true);
  else if (k === 'arrowright' || k === 'd') setKey('right', true);
  else if (k === 'arrowup' || k === 'w') setKey('up', true);
  else if (k === 'arrowdown' || k === 's') setKey('down', true);
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') setKey('left', false);
  else if (k === 'arrowright' || k === 'd') setKey('right', false);
  else if (k === 'arrowup' || k === 'w') setKey('up', false);
  else if (k === 'arrowdown' || k === 's') setKey('down', false);
});
function bindHold(id, name){
  var b = el(id); if (!b) return;
  var on = function(e){ e.preventDefault(); setKey(name, true); };
  var off = function(e){ e.preventDefault(); setKey(name, false); };
  b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
}
bindHold('btnL', 'left'); bindHold('btnR', 'right'); bindHold('btnU', 'up'); bindHold('btnD', 'down');
bindHold('btnA', 'up'); bindHold('btnJ', 'down');
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; lives = 3; paused = false; startStage(0); });
startStage(0);
requestAnimationFrame(frame);
})();
