// E.Y.L Dendy — Yoshi's Cookie: сдвигай ряды и колонки, собирай линию из одинаковых печенек!
// GAMECFG: { slug, size:6, types:[emoji], levels:[{lines:3}, ...] }
(function(){
'use strict';
var CFG = window.GAMECFG;
var N = CFG.size, CELL = 44, OX = (480 - N * CELL) / 2, OY = 16;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, level = 0, lines = 0, state = 'play', msgT = null, paused = false;
var grid = [], cur = { x: 0, y: 0 }, keys = {}, flash = [], flashT = 0;
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Уровень: ' + (level + 1) + '/' + CFG.levels.length + ' • Линий: ' + lines + '/' + CFG.levels[level].lines + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function rnd(){ return Math.floor(Math.random() * CFG.types.length); }
function startLevel(i){
  level = i; lines = 0;
  grid = [];
  for (var y = 0; y < N; y++) { var r = []; for (var x = 0; x < N; x++) r.push(rnd()); grid.push(r); }
  state = 'play'; hud();
  setMsg('🍪 Уровень ' + (i + 1) + '! Собери ' + CFG.levels[i].lines + ' линий из ' + N + ' одинаковых печенек в ряд или столбец.');
}
function findLines(){
  var cells = {};
  for (var y = 0; y < N; y++) {
    var t = grid[y][0], ok = true;
    for (var x = 1; x < N; x++) if (grid[y][x] !== t) ok = false;
    if (ok) for (var x2 = 0; x2 < N; x2++) cells[x2 + ',' + y] = true;
  }
  for (var x = 0; x < N; x++) {
    var t2 = grid[0][x], ok2 = true;
    for (var y = 1; y < N; y++) if (grid[y][x] !== t2) ok2 = false;
    if (ok2) for (var y2 = 0; y2 < N; y2++) cells[x + ',' + y2] = true;
  }
  return Object.keys(cells).map(function(k){ var p = k.split(','); return [+p[0], +p[1]]; });
}
function afterShift(){
  var found = findLines();
  if (!found.length) { hud(); return; }
  flash = found; flashT = 26;
  var lineCount = Math.round(found.length / N);
  score += 300 * lineCount + 20 * found.length;
  lines += lineCount;
  saveBest();
  setMsg('🎉 Линия собрана! +' + (300 * lineCount) + '. Линий: ' + lines + '/' + CFG.levels[level].lines);
  setTimeout(function(){
    // заменить очищенные клетки: столбцы оседают, сверху новые печеньки
    var cleared = {};
    flash.forEach(function(p){ cleared[p[0] + ',' + p[1]] = true; });
    for (var x = 0; x < N; x++) {
      var col = [];
      for (var y = N - 1; y >= 0; y--) if (!cleared[x + ',' + y]) col.push(grid[y][x]);
      var ny = N - 1;
      col.forEach(function(v){ grid[ny][x] = v; ny--; });
      while (ny >= 0) { grid[ny][x] = rnd(); ny--; }
    }
    flash = [];
    hud();
    if (lines >= CFG.levels[level].lines) {
      if (level + 1 < CFG.levels.length) { score += 500; startLevel(level + 1); setMsg('🎉 Уровень пройден! +500'); }
      else { state = 'win'; setMsg('🏆 Победа! Все печеньки съедены! Счёт: ' + score); hud(); }
      return;
    }
    afterShift(); // цепная реакция
  }, 430);
  hud();
}
function shiftRow(y, dir){
  var r = grid[y].slice();
  for (var x = 0; x < N; x++) grid[y][(x + dir + N) % N] = r[x];
  afterShift();
}
function shiftCol(x, dir){
  var c = [];
  for (var y = 0; y < N; y++) c.push(grid[y][x]);
  for (var y2 = 0; y2 < N; y2++) grid[(y2 + dir + N) % N][x] = c[y2];
  afterShift();
}
function step(){ if (flashT > 0) flashT--; }
function draw(){
  ctx.fillStyle = '#221407'; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = '#33200d'; ctx.fillRect(OX - 8, OY - 8, N * CELL + 16, N * CELL + 16);
  ctx.textAlign = 'center';
  ctx.font = '30px serif';
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var px = OX + x * CELL, py = OY + y * CELL;
    var isFlash = false;
    for (var i = 0; i < flash.length; i++) if (flash[i][0] === x && flash[i][1] === y) isFlash = true;
    if (isFlash && (flashT >> 2) % 2) { ctx.fillStyle = '#ffd54f'; ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4); }
    ctx.fillText(CFG.types[grid[y][x]], px + CELL / 2, py + CELL / 2 + 11);
  }
  ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 3;
  ctx.strokeRect(OX + cur.x * CELL + 1, OY + cur.y * CELL + 1, CELL - 2, CELL - 2);
  ctx.font = '26px serif';
  ctx.fillText('🦖', 44, 60);
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#f5deb3';
  ctx.fillText('Yoshi', 44, 80);
  if (state === 'win') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 125, 480, 64);
    ctx.fillStyle = '#fff'; ctx.font = '25px sans-serif';
    ctx.fillText('🏆 ПОБЕДА!', 240, 166);
  }
}
var lastTs = 0, acc = 0;
function frame(ts){
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  var dt = Math.min(50, ts - lastTs); lastTs = ts;
  if (state === 'play' && !paused) {
    acc += dt;
    while (acc >= 16.7) { acc -= 16.7; step(); }
  }
  draw();
}
document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  var isArrow = k.indexOf('arrow') === 0;
  if (k === 'z' || k === 'x' || k === ' ') { keys.atk = true; if (k === ' ') e.preventDefault(); return; }
  if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); return; }
  var dx = 0, dy = 0;
  if (k === 'arrowleft' || k === 'a') dx = -1;
  else if (k === 'arrowright' || k === 'd') dx = 1;
  else if (k === 'arrowup' || k === 'w') dy = -1;
  else if (k === 'arrowdown' || k === 's') dy = 1;
  else return;
  if (isArrow) e.preventDefault();
  if (flash.length) return;
  if (keys.atk) {
    if (dx) shiftRow(cur.y, dx);
    else if (dy) shiftCol(cur.x, dy);
  } else {
    cur.x = (cur.x + dx + N) % N;
    cur.y = (cur.y + dy + N) % N;
  }
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'z' || k === 'x' || k === ' ') keys.atk = false;
});
function bindTap(id, fn){
  var b = el(id); if (!b) return;
  b.addEventListener('touchstart', function(e){ e.preventDefault(); fn(); }, {passive:false});
  b.addEventListener('mousedown', function(e){ e.preventDefault(); fn(); });
}
bindTap('btnL', function(){ if (!flash.length) shiftRow(cur.y, -1); });
bindTap('btnR', function(){ if (!flash.length) shiftRow(cur.y, 1); });
bindTap('btnU', function(){ if (!flash.length) shiftCol(cur.x, -1); });
bindTap('btnD', function(){ if (!flash.length) shiftCol(cur.x, 1); });
var ca = el('btnA'), cj = el('btnJ');
if (ca) { ca.addEventListener('touchstart', function(e){ e.preventDefault(); keys.atk = true; }, {passive:false}); ca.addEventListener('touchend', function(){ keys.atk = false; }); ca.addEventListener('mousedown', function(){ keys.atk = true; }); ca.addEventListener('mouseup', function(){ keys.atk = false; }); }
if (cj) { cj.addEventListener('touchstart', function(e){ e.preventDefault(); keys.atk = true; }, {passive:false}); cj.addEventListener('touchend', function(){ keys.atk = false; }); cj.addEventListener('mousedown', function(){ keys.atk = true; }); cj.addEventListener('mouseup', function(){ keys.atk = false; }); }
// тестовый крючок
window.GAMEHOOK = function(){
  return { grid: grid.map(function(r){ return r.slice(); }), cur: { x: cur.x, y: cur.y }, lines: lines, state: state, level: level };
};
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; paused = false; startLevel(0); });
startLevel(0);
requestAnimationFrame(frame);
})();
