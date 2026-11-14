// E.Y.L Dendy — движок Q*bert: пирамида кубов, прыжки по диагонали
// GAMECFG: { slug, colors:[c0,c1,c2], bg }
(function(){
'use strict';
var CFG = window.GAMECFG;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var ROWS = 7;
var score = 0, lives = 3, round = 1, state = 'play', msgT = null, paused = false;
var cubes = [], hero = null, foes = [], spawnT = 200, hopT = 0;
var best = +(localStorage.getItem('eyl_dendy_best_qbert') || 0);
function cubePos(r, c){ return { x: 240 + (c - r / 2) * 38, y: 66 + r * 33 }; }
function targetState(){ return round === 2 ? 2 : 1; }
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_qbert', best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Жизни: ' + '❤️'.repeat(Math.max(0, lives)) + ' • Раунд: ' + round + '/3 • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function startRound(n){
  round = n; cubes = []; foes = []; spawnT = 220;
  for (var r = 0; r < ROWS; r++) { cubes.push([]); for (var c = 0; c <= r; c++) cubes[r].push(0); }
  hero = { r: 0, c: 0, px: 0, py: 0, hop: null };
  var p = cubePos(0, 0); hero.px = p.x; hero.py = p.y;
  state = 'play'; hud();
  setMsg('Раунд ' + n + '! Перекрась все кубы в ' + (round === 2 ? 'конечный цвет (2 прыжка на куб)' : 'яркий цвет') + '!');
}
function flipCube(r, c){
  var s = cubes[r][c];
  if (round === 1) cubes[r][c] = 1;
  else if (round === 2) cubes[r][c] = Math.min(2, s + 1);
  else cubes[r][c] = (s === 1) ? 0 : 1;
  if (cubes[r][c] === targetState() && s !== targetState()) score += 25;
  hud();
}
function checkWin(){
  for (var r = 0; r < ROWS; r++) for (var c = 0; c <= r; c++) if (cubes[r][c] !== targetState()) return;
  saveBest();
  if (round < 3) { score += 500; startRound(round + 1); setMsg('🎉 Раунд пройден! +500'); }
  else { state = 'win'; setMsg('🏆 Победа! Вся пирамида — твоя! Счёт: ' + score); hud(); }
}
function die(why){
  lives--; saveBest(); hud();
  foes = [];
  if (lives <= 0) { state = 'over'; setMsg('💥 Игра окончена! Счёт: ' + score + '. Нажми «Заново».'); return; }
  setMsg(why + ' Осталось жизней: ' + lives);
  hero.r = 0; hero.c = 0; hero.hop = null;
  var p = cubePos(0, 0); hero.px = p.x; hero.py = p.y;
}
function tryHop(dr, dc){
  if (state !== 'play' || hero.hop) return;
  var nr = hero.r + dr, nc = hero.c + dc;
  hero.hop = { fr: hero.r, fc: hero.c, tr: nr, tc: nc, t: 0, fx: hero.px, fy: hero.py };
}
function step(){
  // герой: анимация прыжка
  if (hero.hop) {
    var h = hero.hop; h.t++;
    var k = h.t / 11;
    var from = cubePos(h.fr, h.fc);
    if (h.tr >= 0 && h.tr < ROWS && h.tc >= 0 && h.tc <= h.tr) {
      var to = cubePos(h.tr, h.tc);
      hero.px = from.x + (to.x - from.x) * k;
      hero.py = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 16;
    } else {
      hero.px = from.x + (h.tc - h.fc + (h.tr - h.fr) * 0.5) * 38 * k * 0.9 + (h.tc * 2 - h.tr) * 0;
      hero.py = from.y + (h.tr - h.fr) * 33 * k - Math.sin(k * Math.PI) * 16 + k * k * 26;
    }
    if (h.t >= 11) {
      var fell = !(h.tr >= 0 && h.tr < ROWS && h.tc >= 0 && h.tc <= h.tr);
      hero.r = h.tr; hero.c = h.tc; hero.hop = null;
      if (fell) { die('🌀 Кьюберт улетел с пирамиды!'); return; }
      var p = cubePos(hero.r, hero.c); hero.px = p.x; hero.py = p.y;
      flipCube(hero.r, hero.c);
      checkWin();
    }
    return;
  }
  // враги
  spawnT--;
  if (spawnT <= 0) {
    spawnT = round === 1 ? 200 : round === 2 ? 165 : 135;
    var snake = round >= 2 && Math.random() < 0.3;
    var sr = Math.random() < 0.5 ? 0 : 1, sc = sr === 0 ? 0 : (Math.random() < 0.5 ? 0 : 1);
    foes.push({ r: sr, c: sc, t: 0, snake: snake, e: snake ? '🐍' : (Math.random() < 0.5 ? '🔴' : '🟣') });
  }
  for (var i = foes.length - 1; i >= 0; i--) {
    var f = foes[i]; f.t++;
    var wait = f.snake ? 34 : 40;
    if (f.t >= wait) {
      f.t = 0;
      var opts = [];
      if (f.snake) {
        // змея ползёт к герою
        var down1 = { r: f.r + 1, c: f.c }, down2 = { r: f.r + 1, c: f.c + 1 };
        var up1 = { r: f.r - 1, c: f.c - 1 }, up2 = { r: f.r - 1, c: f.c };
        [down1, down2, up1, up2].forEach(function(o){
          if (o.r >= 0 && o.r < ROWS && o.c >= 0 && o.c <= o.r) {
            o.d = Math.abs(o.r - hero.r) + Math.abs(o.c - hero.c);
            opts.push(o);
          }
        });
        opts.sort(function(a, b){ return a.d - b.d; });
        if (opts.length && Math.random() < 0.8) { f.r = opts[0].r; f.c = opts[0].c; }
        else if (opts.length) { var o2 = opts[Math.floor(Math.random() * opts.length)]; f.r = o2.r; f.c = o2.c; }
      } else {
        if (f.r + 1 < ROWS) { var nc2 = f.c + (Math.random() < 0.5 ? 0 : 1); f.r += 1; f.c = nc2; }
        else { foes.splice(i, 1); continue; }
      }
    }
    if (f.r === hero.r && f.c === hero.c && !hero.hop) { die(f.snake ? '🐍 Змея Койли поймала Кьюберта!' : '🔴 Шарик сбил Кьюберта!'); return; }
  }
}
function drawCube(x, y, color){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 15); ctx.lineTo(x + 19, y - 5); ctx.lineTo(x + 19, y + 12); ctx.lineTo(x, y + 21); ctx.lineTo(x - 19, y + 12); ctx.lineTo(x - 19, y - 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.moveTo(x, y - 15); ctx.lineTo(x + 19, y - 5); ctx.lineTo(x, y + 4); ctx.lineTo(x - 19, y - 5);
  ctx.closePath(); ctx.fill();
}
function draw(){
  ctx.fillStyle = CFG.bg; ctx.fillRect(0, 0, 480, 320);
  for (var r = 0; r < ROWS; r++) for (var c = 0; c <= r; c++) {
    var p = cubePos(r, c);
    drawCube(p.x, p.y, CFG.colors[cubes[r][c]]);
  }
  ctx.font = '19px serif'; ctx.textAlign = 'center';
  foes.forEach(function(f){ var p = cubePos(f.r, f.c); ctx.fillText(f.e, p.x, p.y - 2); });
  ctx.font = '21px serif';
  ctx.fillText('🟠', hero.px, hero.py - 4);
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
var HOPS = { ul: [-1, -1], ur: [-1, 0], dl: [1, 0], dr: [1, 1] };
function hop(name){ var h = HOPS[name]; tryHop(h[0], h[1]); }
document.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowup') hop('ul');
  else if (k === 'arrowright') hop('ur');
  else if (k === 'arrowdown') hop('dr');
  else if (k === 'arrowleft') hop('dl');
  else if (k === 'q') hop('ul');
  else if (k === 'e') hop('ur');
  else if (k === 'z') hop('dl');
  else if (k === 'c') hop('dr');
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Поехали!'); }
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
function bindTap(id, name){
  var b = el(id); if (!b) return;
  var h = function(e){ e.preventDefault(); hop(name); };
  b.addEventListener('touchstart', h, {passive:false});
  b.addEventListener('mousedown', h);
}
bindTap('btnU', 'ul'); bindTap('btnA', 'ur'); bindTap('btnL', 'dl'); bindTap('btnR', 'dr');
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; lives = 3; paused = false; startRound(1); });
startRound(1);
requestAnimationFrame(frame);
})();
