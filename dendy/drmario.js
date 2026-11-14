// E.Y.L Dendy — Dr. Mario: капсулы против вирусов. 4 в ряд/столбец — вирус мёртв!
// GAMECFG: { slug, levels:[{viruses:4, speed:52}, ...] }
(function(){
'use strict';
var CFG = window.GAMECFG;
var COLS = 8, ROWS = 16, CELL = 19, OX = 164, OY = 8;
var COLORS = ['#e53935', '#1e88e5', '#fdd835'];
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, level = 0, state = 'play', msgT = null, paused = false;
var grid = [], cap = null, dropT = 0, lockDelay = 0, played = 0, keys = {};
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function virusesLeft(){ var n = 0; for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (grid[y][x] && grid[y][x].v) n++; return n; }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Уровень: ' + (level + 1) + '/' + CFG.levels.length + ' • 🦠 Вирусов: ' + virusesLeft() + ' • Капсул: ' + played + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function startLevel(i){
  level = i;
  grid = [];
  for (var y = 0; y < ROWS; y++) { var r = []; for (var x = 0; x < COLS; x++) r.push(null); grid.push(r); }
  var n = CFG.levels[i].viruses, placed = 0, guard = 0;
  while (placed < n && guard++ < 500) {
    var vx = Math.floor(Math.random() * COLS);
    var vy = 6 + Math.floor(Math.random() * (ROWS - 6));
    if (grid[vy][vx]) continue;
    var c = Math.floor(Math.random() * 3);
    grid[vy][vx] = { c: c, v: true };
    placed++;
  }
  cap = null; dropT = 0; played = 0;
  state = 'play'; hud();
  setMsg('💊 Уровень ' + (i + 1) + '! Уничтожь всех вирусов: 4 одного цвета в ряд или столбец.');
  spawnCap();
}
function spawnCap(){
  var c1 = Math.floor(Math.random() * 3), c2 = Math.floor(Math.random() * 3);
  cap = { x: 3, y: 0, dir: 0, c: [c1, c2] }; // dir 0: вторая половина справа; 1: снизу; 2: слева; 3: сверху
  dropT = 0; lockDelay = 0;
  if (cellBlocked(cap.x, cap.y) || cellBlocked(cap.x + 1, cap.y)) {
    state = 'over'; saveBest();
    setMsg('💥 Бутылка переполнена! Игра окончена. Счёт: ' + score + '. Нажми «Заново».');
  }
}
function halfPos(i){
  if (i === 0) return [cap.x, cap.y];
  var d = [[1, 0], [0, 1], [-1, 0], [0, -1]][cap.dir];
  return [cap.x + d[0], cap.y + d[1]];
}
function cellBlocked(x, y){
  if (x < 0 || x >= COLS || y >= ROWS) return true;
  if (y < 0) return false;
  return !!grid[y][x];
}
function capFits(nx, ny, ndir){
  var save = { x: cap.x, y: cap.y, dir: cap.dir };
  cap.x = nx; cap.y = ny; cap.dir = ndir;
  var p0 = halfPos(0), p1 = halfPos(1);
  var ok = !cellBlocked(p0[0], p0[1]) && !cellBlocked(p1[0], p1[1]);
  cap.x = save.x; cap.y = save.y; cap.dir = save.dir;
  return ok;
}
function settle(){
  // гравитация одиночных половинок после очисток
  var moved = true;
  while (moved) {
    moved = false;
    for (var y = ROWS - 2; y >= 0; y--) for (var x = 0; x < COLS; x++) {
      var c = grid[y][x];
      if (c && !c.v && !grid[y + 1][x]) { grid[y + 1][x] = c; grid[y][x] = null; moved = true; }
    }
  }
}
function resolveMatches(){
  var totalKilled = 0;
  while (true) {
    var kill = {};
    function scan(horizontal){
      for (var a = 0; a < (horizontal ? ROWS : COLS); a++) {
        var run = [];
        for (var b = 0; b <= (horizontal ? COLS : ROWS); b++) {
          var x = horizontal ? b : a, y = horizontal ? a : b;
          var cell = b < (horizontal ? COLS : ROWS) ? grid[y][x] : null;
          if (cell && run.length && cell.c === grid[run[0][1]][run[0][0]].c) run.push([x, y]);
          else {
            if (run.length >= 4) run.forEach(function(p){ kill[p[0] + ',' + p[1]] = true; });
            run = cell ? [[x, y]] : [];
          }
        }
      }
    }
    scan(true); scan(false);
    var keysArr = Object.keys(kill);
    if (!keysArr.length) break;
    keysArr.forEach(function(k){
      var p = k.split(','), cell = grid[+p[1]][+p[0]];
      if (cell && cell.v) { totalKilled++; score += 200; }
      else score += 20;
      grid[+p[1]][+p[0]] = null;
    });
    settle();
  }
  return totalKilled;
}
function lockCap(){
  var p0 = halfPos(0), p1 = halfPos(1);
  grid[p0[1]][p0[0]] = { c: cap.c[0], v: false };
  grid[p1[1]][p1[0]] = { c: cap.c[1], v: false };
  played++; cap = null;
  var killed = resolveMatches();
  if (killed) setMsg('🦠 Вирусов уничтожено: ' + killed + '!');
  hud();
  if (virusesLeft() === 0) {
    saveBest();
    if (level + 1 < CFG.levels.length) { score += 1000; startLevel(level + 1); setMsg('🎉 Бутылка чиста! +1000'); }
    else { state = 'win'; setMsg('🏆 Победа! Все вирусы побеждены! Счёт: ' + score); }
    return;
  }
  spawnCap();
}
function step(){
  if (!cap) return;
  var speed = CFG.levels[level].speed;
  if (keys.left && capFits(cap.x - 1, cap.y, cap.dir)) cap.x--;
  if (keys.right && capFits(cap.x + 1, cap.y, cap.dir)) cap.x++;
  keys.left = false; keys.right = false;
  dropT += keys.down ? 4 : 1;
  if (dropT >= speed / 10) {
    dropT = 0;
    if (capFits(cap.x, cap.y + 1, cap.dir)) { cap.y++; lockDelay = 0; }
    else {
      lockDelay++;
      if (lockDelay >= 3) lockCap();
    }
  }
}
function draw(){
  ctx.fillStyle = '#0d1f16'; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = '#123524'; ctx.fillRect(OX - 8, OY - 4, COLS * CELL + 16, ROWS * CELL + 12);
  ctx.strokeStyle = '#3f7d55'; ctx.lineWidth = 2; ctx.strokeRect(OX - 4, OY - 2, COLS * CELL + 8, ROWS * CELL + 8);
  ctx.textAlign = 'center';
  for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
    var c = grid[y][x];
    if (!c) continue;
    var px = OX + x * CELL, py = OY + y * CELL;
    if (c.v) {
      ctx.fillStyle = COLORS[c.c];
      ctx.beginPath(); ctx.arc(px + CELL / 2, py + CELL / 2, 8, 0, 7); ctx.fill();
      ctx.font = '11px serif';
      ctx.fillText('🦠', px + CELL / 2, py + CELL / 2 + 4);
    } else {
      ctx.fillStyle = COLORS[c.c];
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillRect(px + 3, py + 3, CELL - 6, 4);
    }
  }
  if (cap) {
    for (var i = 0; i < 2; i++) {
      var p = halfPos(i);
      var px2 = OX + p[0] * CELL, py2 = OY + p[1] * CELL;
      ctx.fillStyle = COLORS[cap.c[i]];
      ctx.fillRect(px2 + 1, py2 + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px2 + 3, py2 + 3, CELL - 6, 4);
    }
  }
  ctx.font = '34px serif';
  ctx.fillText('👨‍⚕️', 70, 90);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#bfe9cf';
  ctx.fillText('Dr. Mario', 70, 112);
  ctx.font = '30px serif';
  ctx.fillText('🦠', 410, 90);
  ctx.fillText('💊', 410, 140);
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
function rotate(){
  if (!cap || state !== 'play') return;
  var nd = (cap.dir + 1) % 4;
  if (capFits(cap.x, cap.y, nd)) { cap.dir = nd; return; }
  // кик: попробовать сдвинуть влево/вправо/вверх
  var kicks = [[-1, 0], [1, 0], [0, -1]];
  for (var i = 0; i < kicks.length; i++) {
    if (capFits(cap.x + kicks[i][0], cap.y + kicks[i][1], nd)) {
      cap.x += kicks[i][0]; cap.y += kicks[i][1]; cap.dir = nd; return;
    }
  }
}
document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  else if (k === 'arrowright' || k === 'd') keys.right = true;
  else if (k === 'arrowdown' || k === 's') keys.down = true;
  else if (k === 'z' || k === 'x' || k === ' ') rotate();
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's') keys.down = false;
});
function bindHold(id, name){
  var b = el(id); if (!b) return;
  var on = function(e){ e.preventDefault(); keys[name] = true; if (name === 'down') keys.down = true; };
  var off = function(e){ e.preventDefault(); keys[name] = false; if (name === 'down') keys.down = false; };
  b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
}
bindHold('btnL', 'left'); bindHold('btnR', 'right'); bindHold('btnD', 'down');
function bindTap(id, fn){
  var b = el(id); if (!b) return;
  b.addEventListener('touchstart', function(e){ e.preventDefault(); fn(); }, {passive:false});
  b.addEventListener('mousedown', function(e){ e.preventDefault(); fn(); });
}
bindTap('btnA', rotate); bindTap('btnJ', rotate); bindTap('btnU', rotate);
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; paused = false; startLevel(0); });
// тестовый крючок: состояние и мягкая подсказка боту (невидимо для игрока)
window.GAMEHOOK = function(){
  return { viruses: virusesLeft(), played: played, state: state, level: level,
    grid: grid.map(function(r){ return r.map(function(c){ return c ? (c.v ? 'v' + c.c : '' + c.c) : '.'; }).join(''); }),
    cap: cap ? { x: cap.x, y: cap.y, dir: cap.dir, c: cap.c.slice() } : null };
};
startLevel(0);
requestAnimationFrame(frame);
})();
