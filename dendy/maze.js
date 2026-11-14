// E.Y.L Dendy — движок лабиринта (Pac-Man и подобные)
// GAMECFG: { slug, hero, ghosts:[emojis], fruit, special:'maze'|'dig',
//   theme:{wall,bg,dot}, levels:[ [строки карты] ] }
// Карта: '#' стена, '.' точка, 'o' энерджайзер, 'P' старт игрока, 'G' старт призрака,
//        'D' земля (только dig: игрок копает, призраки не проходят), ' ' пустой проход
(function(){
'use strict';
var CFG = window.GAMECFG;
var T = 20, Wpx = 480, Hpx = 320;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, lives = 3, level = 0, state = 'play', frightT = 0, msgT = null;
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
var map = [], MW = 0, MH = 0, pellets = {}, pelletTotal = 0, fruitTile = null, fruitOn = false, eaten = 0;
var player = null, ghosts = [], pStart = null;
var DIRS = { l:{x:-1,y:0}, r:{x:1,y:0}, u:{x:0,y:-1}, d:{x:0,y:1} };
var paused = false;

function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Уровень: ' + (level + 1) + '/' + CFG.levels.length + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }

function passable(x, y, isGhost){
  if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  var c = map[y][x];
  if (c === '#') return false;
  if (isGhost && c === 'D') return false;
  return true;
}
function parseLevel(idx){
  var rows = CFG.levels[idx]; MH = rows.length; MW = rows[0].length;
  map = []; pellets = {}; pelletTotal = 0; ghosts = []; fruitOn = false; eaten = 0; fruitTile = null;
  for (var y = 0; y < MH; y++) { var r = [];
    for (var x = 0; x < MW; x++) {
      var ch = rows[y][x] || ' ';
      if (ch === '.' || ch === 'o') { pellets[x + ',' + y] = ch; pelletTotal++; r.push(' '); }
      else if (ch === 'P') { pStart = {x:x, y:y}; r.push(' '); }
      else if (ch === 'G') { var gi = ghosts.length; ghosts.push({tx:x, ty:y, px:x*T, py:y*T, dir:'l', home:{x:x, y:y}, dead:0, seed:Math.random()*10, emoji:(CFG.ghosts || ['👻'])[gi % (CFG.ghosts || ['👻']).length], idx:gi}); r.push(' '); }
      else r.push(ch);
    } map.push(r);
  }
  if (!fruitTile) { /* фрукт появится на стартовой клетке игрока после 30 точек */ }
  resetPositions();
  frightT = 0; state = 'play'; hud();
  setMsg('Уровень ' + (idx + 1) + '! Собери все точки ' + (CFG.dotEmoji || '•'));
}
function resetPositions(){
  player = { tx:pStart.x, ty:pStart.y, px:pStart.x*T, py:pStart.y*T, dir:'l', want:'l', moving:false };
  ghosts.forEach(function(g, i){ g.tx = g.home.x; g.ty = g.home.y; g.px = g.tx*T; g.py = g.ty*T; g.dir = i % 2 ? 'r' : 'l'; g.dead = 0; });
}
function tileAt(px, py){ return { x: Math.round(px / T), y: Math.round(py / T) }; }

function stepEntity(e, speed, isGhost, decide){
  // движение по пикселям; решения принимаются в центрах клеток
  var cx = Math.round(e.px / T) * T, cy = Math.round(e.py / T) * T;
  // окно привязки уже шага (0.6×speed), иначе сущность «прилипает» к центру, который только что покинула
  if (Math.abs(e.px - cx) <= speed * 0.6 && Math.abs(e.py - cy) <= speed * 0.6) {
    e.px = cx; e.py = cy; e.tx = cx / T; e.ty = cy / T;
    var nd = decide(e);
    if (nd) e.dir = nd;
  }
  var d = DIRS[e.dir];
  var nx = e.px + d.x * speed, ny = e.py + d.y * speed;
  // проверка стены: из центра клетки нельзя выйти в стену
  var ctxX = Math.round(e.px / T), ctxY = Math.round(e.py / T);
  var atCenter = (Math.abs(e.px - ctxX * T) < 0.6 && Math.abs(e.py - ctxY * T) < 0.6);
  if (atCenter && !passable(ctxX + d.x, ctxY + d.y, isGhost)) return; // стоим у стены
  e.px = nx; e.py = ny;
  e.tx = Math.round(e.px / T); e.ty = Math.round(e.py / T);
}
function playerDecide(e){
  if (e.want !== e.dir) {
    var w = DIRS[e.want];
    if (passable(e.tx + w.x, e.ty + w.y, false)) return e.want;
  }
  if (!passable(e.tx + DIRS[e.dir].x, e.ty + DIRS[e.dir].y, false)) {
    return e.want !== e.dir && passable(e.tx + DIRS[e.want].x, e.ty + DIRS[e.want].y, false) ? e.want : e.dir;
  }
  return e.dir;
}
function ghostDecide(g){
  var opts = [];
  for (var k in DIRS) {
    var d = DIRS[k];
    if ((k === 'l' && g.dir === 'r') || (k === 'r' && g.dir === 'l') || (k === 'u' && g.dir === 'd') || (k === 'd' && g.dir === 'u')) continue;
    if (passable(g.tx + d.x, g.ty + d.y, true)) opts.push(k);
  }
  if (!opts.length) { // тупик — разворот
    var rev = {l:'r', r:'l', u:'d', d:'u'}[g.dir];
    return rev;
  }
  var tx = player.tx, ty = player.ty;
  if (g.idx === 1) { tx += DIRS[player.dir].x * 4; ty += DIRS[player.dir].y * 4; }
  var frightened = frightT > 0;
  var bestK = opts[0], bestV = frightened ? -1e9 : 1e9;
  opts.forEach(function(k){
    var d = DIRS[k];
    var dist = Math.abs(g.tx + d.x - tx) + Math.abs(g.ty + d.y - ty);
    var v = dist + (g.idx === 2 ? Math.random() * 6 : Math.random() * 1.5);
    if (frightened) { if (v > bestV) { bestV = v; bestK = k; } }
    else if (v < bestV) { bestV = v; bestK = k; }
  });
  return bestK;
}

function eatCheck(){
  var key = player.tx + ',' + player.ty;
  if (pellets[key]) {
    var kind = pellets[key]; delete pellets[key]; eaten++;
    if (kind === 'o') { frightT = 420; score += 50; setMsg('💪 Энерджайзер! Теперь ты охотник!'); }
    else score += 10;
    if (eaten === 30 && CFG.fruit) { fruitOn = true; fruitTile = {x:pStart.x, y:pStart.y}; }
    hud();
    if (Object.keys(pellets).length === 0) winLevel();
  }
  if (fruitOn && fruitTile && player.tx === fruitTile.x && player.ty === fruitTile.y) {
    fruitOn = false; score += 500; setMsg('🍒 Бонус +500!'); hud();
  }
  // копание: клетка земли под игроком исчезает
  if (CFG.special === 'dig' && map[player.ty] && map[player.ty][player.tx] === 'D') {
    map[player.ty][player.tx] = ' ';
  }
}
function winLevel(){
  saveBest();
  if (level + 1 < CFG.levels.length) { level++; parseLevel(level); setMsg('🎉 Уровень пройден!'); }
  else { state = 'win'; setMsg('🏆 Победа! Все уровни пройдены! Счёт: ' + score); hud(); }
}
function touchCheck(){
  ghosts.forEach(function(g){
    if (g.dead > 0) return;
    var dx = Math.abs(g.px - player.px), dy = Math.abs(g.py - player.py);
    if (dx < 14 && dy < 14) {
      if (frightT > 0) {
        g.dead = 150; score += 200; setMsg('👻 Призрак съеден! +200'); hud();
        g.px = g.home.x * T; g.py = g.home.y * T; g.tx = g.home.x; g.ty = g.home.y;
      } else {
        lives--; saveBest(); hud();
        if (lives <= 0) { state = 'over'; setMsg('💥 Игра окончена! Счёт: ' + score + '. Нажми «Заново».'); }
        else { setMsg('💥 Поймали! Осталось жизней: ' + lives); resetPositions(); frightT = 0; }
      }
    }
  });
}

function draw(){
  ctx.fillStyle = CFG.theme.bg; ctx.fillRect(0, 0, Wpx, Hpx);
  for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
    var c = map[y][x];
    if (c === '#') {
      ctx.fillStyle = CFG.theme.wall;
      ctx.beginPath(); ctx.roundRect(x*T + 1, y*T + 1, T - 2, T - 2, 5); ctx.fill();
    } else if (c === 'D') {
      ctx.fillStyle = CFG.theme.dirt || '#6d4c41';
      ctx.fillRect(x*T + 1, y*T + 1, T - 2, T - 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(x*T + 5, y*T + 6, 3, 3); ctx.fillRect(x*T + 12, y*T + 12, 3, 3);
    }
  }
  // точки
  for (var key in pellets) {
    var parts = key.split(','), px = +parts[0], py = +parts[1];
    if (pellets[key] === 'o') {
      var r = 5 + Math.sin(Date.now() / 180) * 1.6;
      ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(px*T + T/2, py*T + T/2, r, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = CFG.theme.dot;
      ctx.beginPath(); ctx.arc(px*T + T/2, py*T + T/2, 2.6, 0, 7); ctx.fill();
    }
  }
  if (fruitOn && fruitTile) { ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.fillText(CFG.fruit, fruitTile.x*T + T/2, fruitTile.y*T + 16); }
  // призраки
  ghosts.forEach(function(g){
    if (g.dead > 0) return;
    ctx.font = '17px serif'; ctx.textAlign = 'center';
    if (frightT > 0) { ctx.fillText(frightT < 110 && (frightT >> 3) % 2 ? '👻' : '🥶', g.px + T/2, g.py + 17); }
    else ctx.fillText(g.emoji, g.px + T/2, g.py + 17);
  });
  // игрок
  ctx.font = '17px serif'; ctx.textAlign = 'center';
  ctx.fillText(CFG.hero, player.px + T/2, player.py + 17);
}

var lastTs = 0, acc = 0;
function frame(ts){
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  var dt = Math.min(50, ts - lastTs); lastTs = ts;
  if (state !== 'play' || paused) { draw(); return; }
  acc += dt;
  var stepMs = 16.7;
  while (acc >= stepMs) {
    acc -= stepMs;
    if (frightT > 0) frightT--;
    var pSpeed = CFG.special === 'dig' && map[player.ty] && map[player.ty][player.tx] === 'D' ? 0.85 : 1.7;
    stepEntity(player, pSpeed, false, playerDecide);
    eatCheck();
    ghosts.forEach(function(g){ if (g.dead > 0) { g.dead--; return; } stepEntity(g, frightT > 0 ? 0.9 : 1.22, true, function(e){ return ghostDecide(e); }); });
    touchCheck();
    if (state !== 'play') break;
  }
  draw();
}

document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') player.want = 'l';
  else if (k === 'arrowright' || k === 'd') player.want = 'r';
  else if (k === 'arrowup' || k === 'w') player.want = 'u';
  else if (k === 'arrowdown' || k === 's') player.want = 'd';
  else if (k === 'p' || k === ' ') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
function bindDir(id, dirName){
  var b = el(id); if (!b) return;
  var h = function(e){ e.preventDefault(); player.want = dirName; };
  b.addEventListener('touchstart', h, {passive:false});
  b.addEventListener('mousedown', h);
}
bindDir('btnL', 'l'); bindDir('btnR', 'r'); bindDir('btnU', 'u'); bindDir('btnD', 'd');
var bA = el('btnA'); if (bA) bA.addEventListener('click', function(){ paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); });
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ level = 0; score = 0; lives = 3; paused = false; parseLevel(0); });
parseLevel(0);
requestAnimationFrame(frame);
})();
