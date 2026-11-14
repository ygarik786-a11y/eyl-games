// E.Y.L Dendy — движок Lode Runner: золото, лестницы, канаты и лопата!
// GAMECFG: { slug, levels:[ [строки] ] }
// Карта: '#' кирпич (копается), 'X' бетон, 'H' лестница, '-' канат,
//        '$' золото, 'P' герой, 'E' страж, 'D' выход (после всего золота)
(function(){
'use strict';
var CFG = window.GAMECFG;
var T = 20;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, lives = 3, level = 0, state = 'play', msgT = null, paused = false;
var grid = [], MW = 0, MH = 0, goldLeft = 0, door = null;
var hero = null, foes = [], holes = {}, keys = {};
var moveCd = 0, gravCd = 0, foeCd = 0;
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Уровень: ' + (level + 1) + '/' + CFG.levels.length + ' • 💰 Золота: ' + goldLeft + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function cell(x, y){
  if (x < 0 || y < 0 || x >= MW || y >= MH) return 'X';
  if (holes[x + ',' + y]) return 'o';
  return grid[y][x];
}
function isSolid(x, y){ var c = cell(x, y); return c === '#' || c === 'X'; }
function passable(x, y){ var c = cell(x, y); return c === '.' || c === 'H' || c === '-' || c === '$' || c === 'o' || c === 'D'; }
function supported(x, y){
  var c = cell(x, y);
  if (c === 'H' || c === '-') return true;
  var b = cell(x, y + 1);
  return b === '#' || b === 'X' || b === 'H';
}
function parseLevel(idx){
  var rows = CFG.levels[idx]; MH = rows.length; MW = rows[0].length;
  grid = []; goldLeft = 0; foes = []; holes = {}; door = null;
  for (var y = 0; y < MH; y++) { var r = [];
    for (var x = 0; x < MW; x++) {
      var ch = rows[y][x];
      if (ch === 'P') { hero = { x: x, y: y, px: x, py: y, anim: null }; r.push('.'); }
      else if (ch === 'E') { foes.push({ x: x, y: y, px: x, py: y, anim: null, trap: 0, path: [], spawn: [x, y] }); r.push('.'); }
      else if (ch === '$') { goldLeft++; r.push(ch); }
      else if (ch === 'D') { door = { x: x, y: y }; r.push('D'); }
      else r.push(ch);
    } grid.push(r);
  }
  moveCd = 0; gravCd = 0; foeCd = 0;
  state = 'play'; hud();
  setMsg('Уровень ' + (idx + 1) + '! Собери всё золото 💰 и беги к выходу. Копай кирпичи лопатой!');
}
function die(why){
  lives--; saveBest(); hud();
  if (lives <= 0) { state = 'over'; setMsg('💥 Игра окончена! Счёт: ' + score + '. Нажми «Заново».'); return; }
  setMsg(why + ' Уровень сначала. Жизней: ' + lives);
  parseLevel(level);
}
function animTo(e, nx, ny){
  e.anim = { fx: e.x, fy: e.y, tx: nx, ty: ny, t: 0 };
  e.x = nx; e.y = ny;
}
function animStep(e, frames){
  if (!e.anim) { e.px = e.x; e.py = e.y; return; }
  e.anim.t++;
  var k = Math.min(1, e.anim.t / frames);
  e.px = e.anim.fx + (e.anim.tx - e.anim.fx) * k;
  e.py = e.anim.fy + (e.anim.ty - e.anim.fy) * k;
  if (k >= 1) e.anim = null;
}
// --- BFS по графу движений (для стражей и проверки) ---
function neighbors(x, y){
  var out = [];
  // влево/вправо
  [-1, 1].forEach(function(dx){
    var nx = x + dx;
    if (!passable(nx, y)) return;
    if (supported(nx, y)) out.push([nx, y]);
    else {
      // падение
      var fy = y;
      while (fy + 1 < MH && !supported(nx, fy)) fy++;
      if (supported(nx, fy)) out.push([nx, fy]);
    }
  });
  // вверх по лестнице
  if (cell(x, y) === 'H' || cell(x, y + 1) === 'H') {
    if (passable(x, y - 1) && y - 1 >= 0) out.push([x, y - 1]);
  }
  // вниз: лестница или спрыгнуть
  if (cell(x, y) === 'H' || cell(x, y) === '-' || cell(x, y + 1) === 'H') {
    if (passable(x, y + 1)) {
      if (supported(x, y + 1) || cell(x, y + 1) === 'H') out.push([x, y + 1]);
      else { var fy2 = y + 1; while (fy2 + 1 < MH && !supported(x, fy2)) fy2++; if (supported(x, fy2)) out.push([x, fy2]); }
    }
  }
  return out;
}
function bfsPath(sx, sy, tx, ty){
  if (sx === tx && sy === ty) return [];
  var prev = {}; var q = [[sx, sy]]; var seen = {}; seen[sx + ',' + sy] = true;
  while (q.length) {
    var cur = q.shift();
    var ns = neighbors(cur[0], cur[1]);
    for (var i = 0; i < ns.length; i++) {
      var k = ns[i][0] + ',' + ns[i][1];
      if (seen[k]) continue;
      seen[k] = true; prev[k] = cur;
      if (ns[i][0] === tx && ns[i][1] === ty) {
        var path = [ns[i]]; var node = ns[i];
        while (prev[node[0] + ',' + node[1]]) { node = prev[node[0] + ',' + node[1]]; path.unshift(node); }
        return path.slice(1);
      }
      q.push(ns[i]);
    }
  }
  return null;
}
function heroFallStep(){
  if (!supported(hero.x, hero.y) && cell(hero.x, hero.y) !== 'H') {
    if (passable(hero.x, hero.y + 1)) { animTo(hero, hero.x, hero.y + 1); return true; }
  }
  return false;
}
function collectCheck(){
  if (grid[hero.y] && grid[hero.y][hero.x] === '$') {
    grid[hero.y][hero.x] = '.'; goldLeft--; score += 100;
    setMsg('💰 +100! Осталось золота: ' + goldLeft + (goldLeft === 0 ? '. Выход открыт!' : ''));
    hud();
  }
  if (door && goldLeft === 0 && hero.x === door.x && hero.y === door.y) {
    saveBest();
    if (level + 1 < CFG.levels.length) { score += 500; level++; parseLevel(level); setMsg('🎉 Уровень пройден! +500'); }
    else { state = 'win'; setMsg('🏆 Победа! Всё золото собрано! Счёт: ' + score); hud(); }
    return true;
  }
  return false;
}
function tryHeroMove(dx, dy){
  if (hero.anim) return;
  var nx = hero.x + dx, ny = hero.y + dy;
  if (dy < 0) {
    // вверх — только по лестнице
    if (!(cell(hero.x, hero.y) === 'H' || cell(hero.x, hero.y + 1) === 'H')) return;
    if (!passable(nx, ny)) return;
    animTo(hero, nx, ny);
  } else if (dy > 0) {
    if (!passable(nx, ny)) return;
    if (!(cell(hero.x, hero.y) === 'H' || cell(hero.x, hero.y) === '-' || cell(hero.x, hero.y + 1) === 'H' || !supported(hero.x, hero.y))) return;
    animTo(hero, nx, ny);
  } else {
    if (!passable(nx, ny)) {
      // вылезти из ямы наискосок на край кирпича
      if (cell(hero.x, hero.y) === 'o' && isSolid(nx, ny) && passable(nx, ny - 1) && ny - 1 >= 0) {
        animTo(hero, nx, ny - 1);
        collectCheck();
      }
      return;
    }
    animTo(hero, nx, ny);
  }
  collectCheck();
}
function dig(dir){
  if (hero.anim || !supported(hero.x, hero.y)) return;
  var tx = hero.x + dir, ty = hero.y + 1;
  if (cell(tx, ty) === '#') {
    holes[tx + ',' + ty] = 330;
    grid[ty][tx] = '#'; // логически кирпич остаётся в grid, дыра — в holes
    setMsg('⛏️ Яма выкопана!');
  }
}
function step(){
  animStep(hero, 5);
  foes.forEach(function(f){ animStep(f, 6); });
  // ямы зарастают
  for (var k in holes) {
    holes[k]--;
    if (holes[k] <= 0) {
      delete holes[k];
      var p = k.split(','), hx = +p[0], hy = +p[1];
      // кто-то внутри?
      foes.forEach(function(f){
        if (f.x === hx && f.y === hy) {
          score += 150;
          setMsg('💥 Страж засыпан! +150. Он выберется наверху.');
          f.x = f.spawn[0]; f.y = f.spawn[1]; f.px = f.x; f.py = f.y; f.trap = 0; f.anim = null;
          hud();
        }
      });
      if (hero.x === hx && hero.y === hy) { die('🕳️ Яма заросла прямо под тобой!'); if (state !== 'play') return; }
    }
  }
  // гравитация героя
  gravCd++;
  if (!hero.anim && gravCd >= 5) {
    gravCd = 0;
    if (heroFallStep()) collectCheck();
  }
  // ввод героя
  if (moveCd > 0) moveCd--;
  if (!hero.anim && moveCd <= 0) {
    if (keys.left) { tryHeroMove(-1, 0); moveCd = 2; }
    else if (keys.right) { tryHeroMove(1, 0); moveCd = 2; }
    else if (keys.up) { tryHeroMove(0, -1); moveCd = 2; }
    else if (keys.down) { tryHeroMove(0, 1); moveCd = 2; }
  }
  collectCheck();
  // стражи
  foeCd++;
  foes.forEach(function(f){
    if (f.trap > 0) { f.trap--; return; }
    // страж в яме?
    if (holes[f.x + ',' + f.y] && cell(f.x, f.y) === 'o') { f.trap = 100; setMsg('🕳️ Страж угодил в яму!'); return; }
    if (!supported(f.x, f.y) && cell(f.x, f.y) !== 'H') {
      if (passable(f.x, f.y + 1) && !f.anim && foeCd % 5 === 0) animTo(f, f.x, f.y + 1);
      return;
    }
    if (foeCd % 13 !== 0 || f.anim) return;
    if (!f.path || !f.path.length) f.path = bfsPath(f.x, f.y, hero.x, hero.y) || [];
    if (f.path.length) {
      var nxt = f.path.shift();
      // не идти в клетку героя-ловушки... просто идти
      animTo(f, nxt[0], nxt[1]);
      if (grid[f.y] && grid[f.y][f.x] === '$') { /* страж золото не собирает */ }
    }
    if (f.x === hero.x && f.y === hero.y) die('👮 Страж поймал тебя!');
  });
  // касание стража
  foes.forEach(function(f){ if (f.trap <= 0 && f.x === hero.x && f.y === hero.y && state === 'play') die('👮 Страж поймал тебя!'); });
}
function draw(){
  ctx.fillStyle = '#140f0a'; ctx.fillRect(0, 0, 480, 320);
  ctx.textAlign = 'center';
  for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
    var px = x * T, py = y * T;
    var c = cell(x, y);
    var raw = grid[y][x];
    if (c === 'o') { ctx.fillStyle = '#000'; ctx.fillRect(px, py, T, T); continue; }
    if (raw === '#') { ctx.fillStyle = '#a5502a'; ctx.fillRect(px, py, T, T); ctx.fillStyle = '#c96a3a'; ctx.fillRect(px, py, T, 4); }
    else if (raw === 'X') { ctx.fillStyle = '#616161'; ctx.fillRect(px, py, T, T); ctx.fillStyle = '#838383'; ctx.fillRect(px, py, T, 4); }
    else if (raw === 'H') { ctx.strokeStyle = '#d7a94f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 4, py); ctx.lineTo(px + 4, py + T); ctx.moveTo(px + T - 4, py); ctx.lineTo(px + T - 4, py + T); ctx.moveTo(px + 4, py + T / 2); ctx.lineTo(px + T - 4, py + T / 2); ctx.stroke(); }
    else if (raw === '-') { ctx.strokeStyle = '#d7a94f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + 5); ctx.lineTo(px + T, py + 5); ctx.stroke(); }
    else if (raw === '$') { ctx.font = '15px serif'; ctx.fillText('💰', px + T / 2, py + 16); }
    else if (raw === 'D') {
      ctx.font = '16px serif';
      ctx.fillText(goldLeft === 0 ? '🚪' : '🔒', px + T / 2, py + 16);
    }
  }
  ctx.font = '16px serif';
  foes.forEach(function(f){ ctx.fillText(f.trap > 0 ? '😵' : '👮', f.px * T + T / 2, f.py * T + 16); });
  ctx.fillText('🧑', hero.px * T + T / 2, hero.py * T + 16);
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
  else if (k === 'arrowup' || k === 'w') keys.up = true;
  else if (k === 'arrowdown' || k === 's') keys.down = true;
  else if (k === 'z') dig(-1);
  else if (k === 'x') dig(1);
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  else if (k === 'arrowright' || k === 'd') keys.right = false;
  else if (k === 'arrowup' || k === 'w') keys.up = false;
  else if (k === 'arrowdown' || k === 's') keys.down = false;
});
function bindHold(id, name){
  var b = el(id); if (!b) return;
  var on = function(e){ e.preventDefault(); keys[name] = true; };
  var off = function(e){ e.preventDefault(); keys[name] = false; };
  b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
}
bindHold('btnL', 'left'); bindHold('btnR', 'right'); bindHold('btnU', 'up'); bindHold('btnD', 'down');
function bindTap(id, fn){
  var b = el(id); if (!b) return;
  b.addEventListener('touchstart', function(e){ e.preventDefault(); fn(); }, {passive:false});
  b.addEventListener('mousedown', function(e){ e.preventDefault(); fn(); });
}
bindTap('btnA', function(){ dig(-1); });
bindTap('btnJ', function(){ dig(1); });
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; lives = 3; level = 0; paused = false; parseLevel(0); });
window.GAMEHOOK = function(){
  return { gold: goldLeft, state: state, level: level, hero: { x: hero.x, y: hero.y },
    grid: grid.map(function(r){ return r.join(''); }) };
};
parseLevel(0);
requestAnimationFrame(frame);
})();
