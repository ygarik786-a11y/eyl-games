// E.Y.L Dendy — движок Lolo: комнаты-головоломки, сердечки, сундук, дверь
// GAMECFG: { slug, hero, medusa:bool, patrol:bool, theme:{bg,wall,floor},
//   rooms:[ [строки 11x11] ] }
// Карта: '#' стена, '.' пол, 'B' блок (двигается), 'H' сердечко, 'C' сундук,
//        'X' дверь, 'P' герой, 'S' змея (смертельна при касании), 'M' медуза (взгляд)
(function(){
'use strict';
var CFG = window.GAMECFG;
var T = 28, OX = 86, OY = 8;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, lives = 3, room = 0, state = 'play', msgT = null, paused = false;
var grid = [], hearts = {}, heartsLeft = 0, blocks = [], foes = [], chest = null, door = null, chestOpen = false, doorOpen = false;
var hero = null, moveAnim = null, patrolT = 0;
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Комната: ' + (room + 1) + '/' + CFG.rooms.length + ' • Сердец: ' + heartsLeft + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function key(x, y){ return x + ',' + y; }
function blockAt(x, y){ for (var i = 0; i < blocks.length; i++) if (blocks[i].x === x && blocks[i].y === y) return blocks[i]; return null; }
function foeAt(x, y){ for (var i = 0; i < foes.length; i++) if (foes[i].x === x && foes[i].y === y) return foes[i]; return null; }
function solidForHero(x, y, forBlock){
  if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) return true;
  if (grid[y][x] === '#') return true;
  if (chest && chest.x === x && chest.y === y && !chestOpen) return true;
  if (!forBlock && foeAt(x, y)) return 'foe';
  if (blockAt(x, y)) return 'block';
  return false;
}
function parseRoom(idx){
  var rows = CFG.rooms[idx];
  grid = []; hearts = {}; heartsLeft = 0; blocks = []; foes = []; chest = null; door = null;
  chestOpen = false; doorOpen = false; moveAnim = null;
  for (var y = 0; y < rows.length; y++) { var r = [];
    for (var x = 0; x < rows[y].length; x++) {
      var ch = rows[y][x];
      if (ch === 'P') { hero = { x: x, y: y, px: x, py: y }; r.push('.'); }
      else if (ch === 'H') { hearts[key(x, y)] = true; heartsLeft++; r.push('.'); }
      else if (ch === 'B') { blocks.push({ x: x, y: y, px: x, py: y }); r.push('.'); }
      else if (ch === 'C') { chest = { x: x, y: y }; r.push('.'); }
      else if (ch === 'X') { door = { x: x, y: y }; r.push('.'); }
      else if (ch === 'S') { foes.push({ x: x, y: y, e: '🐍', kind: 'snake', px: x, py: y }); r.push('.'); }
      else if (ch === 'M') { foes.push({ x: x, y: y, e: '👁️', kind: 'medusa', px: x, py: y }); r.push('.'); }
      else if (ch === 'G') { foes.push({ x: x, y: y, e: '👻', kind: 'patrol', px: x, py: y, dir: 1, axis: 'x' }); r.push('.'); }
      else r.push(ch);
    } grid.push(r);
  }
  state = 'play'; hud();
  setMsg('Комната ' + (idx + 1) + '! Собери все сердечки ❤️, открой сундук — и в дверь!');
}
function die(why){
  lives--; saveBest(); hud();
  if (lives <= 0) { state = 'over'; setMsg('💥 Игра окончена! Счёт: ' + score + '. Нажми «Заново».'); return; }
  setMsg(why + ' Комната сначала. Жизней: ' + lives);
  parseRoom(room);
}
function checkMedusa(){
  if (!CFG.medusa) return false;
  for (var i = 0; i < foes.length; i++) {
    var f = foes[i];
    if (f.kind !== 'medusa') continue;
    if (f.x !== hero.x && f.y !== hero.y) continue;
    // линия взгляда: нет ли стены/блока между
    var blocked = false;
    if (f.x === hero.x) {
      var y0 = Math.min(f.y, hero.y), y1 = Math.max(f.y, hero.y);
      for (var y = y0 + 1; y < y1; y++) if (grid[y][f.x] === '#' || blockAt(f.x, y)) blocked = true;
    } else {
      var x0 = Math.min(f.x, hero.x), x1 = Math.max(f.x, hero.x);
      for (var x = x0 + 1; x < x1; x++) if (grid[f.y][x] === '#' || blockAt(x, f.y)) blocked = true;
    }
    if (!blocked) return true;
  }
  return false;
}
function afterMove(){
  if (foeAt(hero.x, hero.y)) { die('🐍 Осторожнее!'); return; }
  if (hearts[key(hero.x, hero.y)]) {
    delete hearts[key(hero.x, hero.y)]; heartsLeft--; score += 100;
    setMsg('❤️ +100! Осталось сердец: ' + heartsLeft);
    hud();
  }
  if (checkMedusa()) { die('👁️ Взгляд Медузы! Прячься за блоки и стены.'); return; }
  if (chest && heartsLeft === 0 && !chestOpen) {
    chestOpen = true; score += 200;
    setMsg('🎁 Сундук открыт! Теперь — к двери!');
    hud();
  }
  if (door && chestOpen && hero.x === door.x && hero.y === door.y) {
    saveBest();
    if (room + 1 < CFG.rooms.length) { score += 500; room++; parseRoom(room); setMsg('🚪 Комната пройдена! +500'); }
    else { state = 'win'; setMsg('🏆 Победа! Все комнаты пройдены! Счёт: ' + score); hud(); }
  }
}
function tryMove(dx, dy){
  if (state !== 'play' || moveAnim) return;
  var nx = hero.x + dx, ny = hero.y + dy;
  var s = solidForHero(nx, ny, false);
  if (s === 'foe') { // шаг на врага — всё равно смерть обрабатывается в afterMove через foeAt
  }
  if (s === 'block') {
    var b = blockAt(nx, ny);
    var bx = nx + dx, by = ny + dy;
    var bs = solidForHero(bx, by, true);
    if (bs === false && !hearts[key(bx, by)] && !foeAt(bx, by) && !(chest && chest.x === bx && chest.y === by) && !(door && door.x === bx && door.y === by)) {
      moveAnim = { hx: hero.x, hy: hero.y, tx: nx, ty: ny, block: b, bx: b.x, by: b.y, t: 0 };
    }
    return;
  }
  if (s === true) return;
  // сундук закрытый — твёрдый, открытый — проходимый фон
  moveAnim = { hx: hero.x, hy: hero.y, tx: nx, ty: ny, block: null, t: 0 };
}
function step(){
  if (moveAnim) {
    var a = moveAnim; a.t++;
    var k = a.t / 7;
    hero.px = a.hx + (a.tx - a.hx) * k;
    hero.py = a.hy + (a.ty - a.hy) * k;
    if (a.block) { a.block.px = a.bx + (a.tx - a.hx) * k; a.block.py = a.by + (a.ty - a.hy) * k; }
    if (a.t >= 7) {
      hero.x = a.tx; hero.y = a.ty; hero.px = hero.x; hero.py = hero.y;
      if (a.block) { a.block.x = a.bx + (a.tx - a.hx); a.block.y = a.by + (a.ty - a.hy); a.block.px = a.block.x; a.block.py = a.block.y; }
      moveAnim = null;
      afterMove();
    }
    return;
  }
  // патрули
  if (CFG.patrol) {
    patrolT++;
    if (patrolT >= 26) {
      patrolT = 0;
      foes.forEach(function(f){
        if (f.kind !== 'patrol') return;
        var nx = f.x + (f.axis === 'x' ? f.dir : 0);
        var ny = f.y + (f.axis === 'y' ? f.dir : 0);
        if (grid[ny] && grid[ny][nx] !== '#' && !blockAt(nx, ny) && !(chest && chest.x === nx && chest.y === ny)) { f.x = nx; f.y = ny; }
        else f.dir *= -1;
        f.px = f.x; f.py = f.y;
        if (f.x === hero.x && f.y === hero.y) die('👻 Призрак поймал Лоло!');
      });
    }
  }
}
function draw(){
  ctx.fillStyle = CFG.theme.bg; ctx.fillRect(0, 0, 480, 320);
  var rows = grid.length, cols = grid[0].length;
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var px = OX + x * T, py = OY + y * T;
    ctx.fillStyle = (x + y) % 2 ? CFG.theme.floor : CFG.theme.bg;
    ctx.fillRect(px, py, T, T);
    if (grid[y][x] === '#') { ctx.fillStyle = CFG.theme.wall; ctx.fillRect(px + 1, py + 1, T - 2, T - 2); }
  }
  ctx.textAlign = 'center';
  ctx.font = '19px serif';
  for (var key2 in hearts) { var p = key2.split(','); ctx.fillText('❤️', OX + (+p[0]) * T + T / 2, OY + (+p[1]) * T + 21); }
  if (door) ctx.fillText(doorOpen || chestOpen ? '🚪' : '🔒', OX + door.x * T + T / 2, OY + door.y * T + 21);
  if (chest) ctx.fillText(chestOpen ? '🎁' : '📦', OX + chest.x * T + T / 2, OY + chest.y * T + 21);
  blocks.forEach(function(b){
    ctx.fillStyle = '#2e9e5b'; ctx.fillRect(OX + b.px * T + 2, OY + b.py * T + 2, T - 4, T - 4);
    ctx.fillStyle = '#57c785'; ctx.fillRect(OX + b.px * T + 5, OY + b.py * T + 5, T - 10, T - 10);
  });
  foes.forEach(function(f){ ctx.fillText(f.e, OX + f.px * T + T / 2, OY + f.py * T + 21); });
  ctx.font = '20px serif';
  ctx.fillText(CFG.hero, OX + hero.px * T + T / 2, OY + hero.py * T + 21);
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
  if (k === 'arrowleft' || k === 'a') tryMove(-1, 0);
  else if (k === 'arrowright' || k === 'd') tryMove(1, 0);
  else if (k === 'arrowup' || k === 'w') tryMove(0, -1);
  else if (k === 'arrowdown' || k === 's') tryMove(0, 1);
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
function bindTap(id, dx, dy){
  var b = el(id); if (!b) return;
  var h = function(e){ e.preventDefault(); tryMove(dx, dy); };
  b.addEventListener('touchstart', h, {passive:false});
  b.addEventListener('mousedown', h);
}
bindTap('btnL', -1, 0); bindTap('btnR', 1, 0); bindTap('btnU', 0, -1); bindTap('btnD', 0, 1);
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; lives = 3; room = 0; paused = false; parseRoom(0); });
parseRoom(0);
requestAnimationFrame(frame);
})();
