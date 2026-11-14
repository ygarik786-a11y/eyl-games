// E.Y.L Dendy — движок приключений сверху (Crystalis, Goonies II)
// GAMECFG: { slug, hero, atk, foes:[emoji], item, itemName,
//   theme:{bg, wall}, rooms:[ [строки] ] }
// Карта: '#' стена, '.' пол, 'P' герой, 'X' выход, 'i' предмет, 'E' враг
(function(){
'use strict';
var CFG = window.GAMECFG;
var T = 20;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, hp = 5, room = 0, state = 'play', msgT = null, paused = false;
var grid = [], MW = 0, MH = 0, items = {}, itemsLeft = 0, door = null;
var hero = null, foes = [], drops = [], swing = 0, swingCd = 0, keys = {};
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Здоровье: ' + '❤️'.repeat(Math.max(0, hp)) + ' • Комната: ' + (room + 1) + '/' + CFG.rooms.length + ' • ' + CFG.item + ' осталось: ' + itemsLeft + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function isWall(tx, ty){
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  return grid[ty][tx] === '#';
}
function canStand(x, y){
  var r = 7;
  return !isWall(Math.floor((x - r) / T), Math.floor((y - r) / T)) &&
         !isWall(Math.floor((x + r) / T), Math.floor((y - r) / T)) &&
         !isWall(Math.floor((x - r) / T), Math.floor((y + r) / T)) &&
         !isWall(Math.floor((x + r) / T), Math.floor((y + r) / T));
}
function parseRoom(idx){
  var rows = CFG.rooms[idx]; MH = rows.length; MW = rows[0].length;
  grid = []; items = {}; itemsLeft = 0; foes = []; drops = []; door = null;
  for (var y = 0; y < MH; y++) { var r = [];
    for (var x = 0; x < MW; x++) {
      var ch = rows[y][x] || '.';
      if (ch === 'P') { hero = { x: x * T + 10, y: y * T + 10, face: 'd', invuln: 0 }; r.push('.'); }
      else if (ch === 'X') { door = { x: x, y: y }; r.push('.'); }
      else if (ch === 'i') { items[x + ',' + y] = true; itemsLeft++; r.push('.'); }
      else if (ch === 'E') { foes.push({ x: x * T + 10, y: y * T + 10, e: CFG.foes[Math.floor(Math.random() * CFG.foes.length)], wt: Math.random() * 80, dx: 0, dy: 0 }); r.push('.'); }
      else r.push(ch);
    } grid.push(r);
  }
  swing = 0; swingCd = 0;
  state = 'play'; hud();
  setMsg('Комната ' + (idx + 1) + '! Собери все ' + CFG.item + ' (' + CFG.itemName + ') — и дверь откроется.');
}
function hurtHero(f){
  if (hero.invuln > 0) return;
  hp--; hero.invuln = 70;
  hero.x += (hero.x < f.x ? -14 : 14); hero.y += (hero.y < f.y ? -14 : 14);
  if (!canStand(hero.x, hero.y)) { hero.x -= (hero.x < f.x ? -14 : 14) * 2; hero.y -= (hero.y < f.y ? -14 : 14) * 2; }
  saveBest(); hud();
  if (hp <= 0) { state = 'over'; setMsg('💥 Герой пал! Игра окончена. Счёт: ' + score + '. Нажми «Заново».'); }
  else setMsg('💔 Удар! Здоровья осталось: ' + hp);
}
function step(){
  if (hero.invuln > 0) hero.invuln--;
  if (swingCd > 0) swingCd--;
  if (swing > 0) swing--;
  var mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  var my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (mx || my) hero.face = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'r' : 'l') : (my > 0 ? 'd' : 'u');
  var sp = 1.9;
  if (mx && canStand(hero.x + mx * sp, hero.y)) hero.x += mx * sp;
  if (my && canStand(hero.x, hero.y + my * sp)) hero.y += my * sp;
  if (keys.atk && swingCd <= 0) { swing = 9; swingCd = 20; }
  // сбор предметов
  var htx = Math.floor(hero.x / T), hty = Math.floor(hero.y / T);
  if (items[htx + ',' + hty]) {
    delete items[htx + ',' + hty]; itemsLeft--; score += 150;
    setMsg(CFG.item + ' +150! Осталось: ' + itemsLeft + (itemsLeft === 0 ? '. Дверь открыта!' : ''));
    hud();
  }
  // капли сердец
  for (var di = drops.length - 1; di >= 0; di--) {
    var d = drops[di];
    if (Math.abs(d.x - hero.x) < 14 && Math.abs(d.y - hero.y) < 14) {
      drops.splice(di, 1);
      if (hp < 5) { hp++; setMsg('❤️ +1 здоровье!'); }
      else score += 50;
      hud();
    }
  }
  // дверь
  if (door && itemsLeft === 0 && htx === door.x && hty === door.y) {
    saveBest();
    if (room + 1 < CFG.rooms.length) { score += 300; room++; parseRoom(room); setMsg('🚪 Дальше! +300'); }
    else { state = 'win'; setMsg('🏆 Победа! Все комнаты пройдены! Счёт: ' + score); hud(); }
    return;
  }
  // враги
  var FV = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
  for (var i = foes.length - 1; i >= 0; i--) {
    var f = foes[i];
    var dx = hero.x - f.x, dy = hero.y - f.y;
    var dist = Math.abs(dx) + Math.abs(dy);
    var mvx = 0, mvy = 0;
    if (dist < 150) { mvx = Math.sign(dx) * 0.72; mvy = Math.sign(dy) * 0.72; }
    else {
      f.wt--;
      if (f.wt <= 0) { f.wt = 50 + Math.random() * 70; var a = Math.floor(Math.random() * 4); f.dx = [1, -1, 0, 0][a]; f.dy = [0, 0, 1, -1][a]; }
      mvx = f.dx * 0.5; mvy = f.dy * 0.5;
    }
    if (mvx && canStand(f.x + mvx, f.y)) f.x += mvx;
    if (mvy && canStand(f.x, f.y + mvy)) f.y += mvy;
    // удар героя
    if (swing > 0) {
      var off = FV[hero.face];
      var ax = hero.x + off[0] * 22, ay = hero.y + off[1] * 22;
      if (Math.abs(f.x - ax) < 17 && Math.abs(f.y - ay) < 17) {
        foes.splice(i, 1); score += 100;
        if (Math.random() < 0.3) drops.push({ x: f.x, y: f.y });
        setMsg('💥 Враг повержен! +100'); hud();
        continue;
      }
    }
    if (Math.abs(f.x - hero.x) < 15 && Math.abs(f.y - hero.y) < 15) hurtHero(f);
    if (state !== 'play') return;
  }
}
function draw(){
  ctx.fillStyle = CFG.theme.bg; ctx.fillRect(0, 0, 480, 320);
  for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
    if (grid[y][x] === '#') {
      ctx.fillStyle = CFG.theme.wall; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x * T + 1, y * T + 1, T - 2, 4);
    }
  }
  if (door) {
    ctx.font = '17px serif'; ctx.textAlign = 'center';
    ctx.fillText(itemsLeft === 0 ? '🚪' : '🔒', door.x * T + 10, door.y * T + 16);
  }
  ctx.font = '15px serif'; ctx.textAlign = 'center';
  for (var key in items) { var p = key.split(','); ctx.fillText(CFG.item, +p[0] * T + 10, +p[1] * T + 15); }
  drops.forEach(function(d){ ctx.fillText('❤️', d.x, d.y + 6); });
  ctx.font = '17px serif';
  foes.forEach(function(f){ ctx.fillText(f.e, f.x, f.y + 6); });
  if (!(hero.invuln > 0 && (hero.invuln >> 3) % 2)) ctx.fillText(CFG.hero, hero.x, hero.y + 6);
  if (swing > 0) {
    var FV = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
    var off = FV[hero.face];
    ctx.font = '16px serif';
    ctx.fillText(CFG.atk, hero.x + off[0] * 22, hero.y + off[1] * 22 + 6);
  }
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
  else if (k === 'z' || k === 'x' || k === ' ') keys.atk = true;
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  else if (k === 'arrowright' || k === 'd') keys.right = false;
  else if (k === 'arrowup' || k === 'w') keys.up = false;
  else if (k === 'arrowdown' || k === 's') keys.down = false;
  else if (k === 'z' || k === 'x' || k === ' ') keys.atk = false;
});
function bindHold(id, name){
  var b = el(id); if (!b) return;
  var on = function(e){ e.preventDefault(); keys[name] = true; };
  var off = function(e){ e.preventDefault(); keys[name] = false; };
  b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
}
bindHold('btnL', 'left'); bindHold('btnR', 'right'); bindHold('btnU', 'up'); bindHold('btnD', 'down');
bindHold('btnA', 'atk'); bindHold('btnJ', 'atk');
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; hp = 5; room = 0; paused = false; parseRoom(0); });
parseRoom(0);
requestAnimationFrame(frame);
})();
