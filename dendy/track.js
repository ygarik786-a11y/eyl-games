// E.Y.L Dendy — Track & Field: бег на 100 метров, скорость — от поочерёдных нажатий
(function(){
'use strict';
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var PACE = [
  [7.0, 7.4, 7.8],
  [7.9, 8.3, 8.7],
  [8.5, 8.9, 9.3]
];
var score = 0, heat = 0, state = 'ready', countT = 0, betweenT = 0, msgT = null;
var heroD = 0, heroV = 0, cpuD = [0, 0, 0], cpuDone = [false, false, false], finishCount = 0, lastSide = '', timeMs = 0, place = 0, places = [];
var best = +(localStorage.getItem('eyl_dendy_best_track') || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_track', best); } catch(e){} } }
function curPlace(){
  var p = 1 + finishCount;
  for (var i = 0; i < 3; i++) { if (!cpuDone[i] && cpuD[i] > heroD) p++; }
  return Math.min(4, p);
}
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Забег: ' + (heat + 1) + '/3 • Место: ' + (state === 'run' || state === 'done' ? curPlace() : '—') + ' • Дистанция: ' + Math.floor(heroD) + '/100 м • Время: ' + (timeMs / 1000).toFixed(1) + ' с • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'run') el('msg').textContent = ''; }, 2800); }
function startHeat(n){
  place = 0;
  heat = n; heroD = 0; heroV = 0; cpuD = [0, 0, 0]; cpuDone = [false, false, false]; finishCount = 0; timeMs = 0; lastSide = '';
  state = 'ready'; countT = 0; hud();
  setMsg('🏃 Забег ' + (n + 1) + '! На старт... внимание... МАРШ — жми по очереди ⬅️ и ➡️ как можно быстрее!');
}
function finishHeat(){
  if (!place) place = curPlace();
  var pts = [300, 200, 100, 50][place - 1] || 50;
  var bonus = Math.max(0, 150 - Math.floor(timeMs / 1000) * 8);
  score += pts + bonus; places.push(place);
  saveBest(); hud();
  if (heat + 1 < 3) {
    state = 'between'; betweenT = 170;
    setMsg('🏁 Финиш! Место: ' + place + ' (+' + (pts + bonus) + '). Отдохни — дальше забег ' + (heat + 2) + '!');
  } else {
    state = 'win';
    var champ = places[0] + places[1] + places[2] <= 5;
    setMsg((champ ? '🏆 ЧЕМПИОН! ' : '🏁 Соревнования окончены! ') + 'Места по забегам: ' + places.join(', ') + '. Итоговый счёт: ' + score);
  }
}
function press(side){
  if (state !== 'run') return;
  if (side !== lastSide) { heroV = Math.min(10.4, heroV + 0.95); lastSide = side; }
}
function step(){
  if (state === 'ready') {
    countT++;
    if (countT >= 80) { state = 'run'; hud(); }
    return;
  }
  if (state === 'between') {
    betweenT--;
    if (betweenT <= 0) startHeat(heat + 1);
    return;
  }
  if (state !== 'run') return;
  timeMs += 16.7;
  heroV *= 0.988;
  if (heroV < 0) heroV = 0;
  heroD += heroV * 0.0167 * 1.25;
  for (var i = 0; i < 3; i++) {
    var wobble = Math.sin((timeMs / 300) + i * 2.1) * 0.25;
    cpuD[i] += (PACE[heat][i] + wobble) * 0.0167 * 1.25;
    if (cpuD[i] >= 100) { cpuD[i] = 100; if (!cpuDone[i]) { cpuDone[i] = true; finishCount++; } }
  }
  hud();
  if (heroD >= 100) { heroD = 100; place = 1 + finishCount; state = 'done'; finishHeat(); }
}
function drawRunner(x, y, e, label){
  ctx.font = '24px serif'; ctx.textAlign = 'center';
  ctx.fillText(e, x, y);
  if (label) { ctx.font = '10px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(label, x, y + 14); }
}
function draw(){
  ctx.fillStyle = '#87b7e8'; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = '#5da24a'; ctx.fillRect(0, 0, 480, 78);
  ctx.fillStyle = '#b5563c'; ctx.fillRect(0, 78, 480, 200);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (var l = 0; l <= 4; l++) ctx.fillRect(0, 78 + l * 50, 480, 2);
  var cam = Math.max(0, heroD - 86);
  function sx(d){ return 56 + (d - heroD + cam) * 4.6; }
  // финиш
  var fx = sx(100);
  if (fx < 500) {
    ctx.fillStyle = '#fff';
    for (var i = 0; i < 10; i++) for (var j = 0; j < 2; j++) { if ((i + j) % 2 === 0) ctx.fillRect(fx + j * 7, 78 + i * 20, 7, 20); }
  }
  // старт
  var stx = sx(0);
  if (stx > -10) { ctx.fillStyle = '#fff'; ctx.fillRect(stx, 78, 4, 200); }
  var lanes = [103, 153, 203, 253];
  for (var i = 0; i < 3; i++) drawRunner(sx(cpuD[i]), lanes[i] + 26, '🏃', 'соперник');
  drawRunner(sx(heroD), lanes[3] + 26, '🏃', 'ТЫ');
  ctx.font = '30px serif';
  ctx.fillText('🌳', 40, 60); ctx.fillText('🌳', 440, 60); ctx.fillText('☀️', 240, 44);
  if (state === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 130, 480, 58);
    ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(countT < 40 ? 'НА СТАРТ...' : 'ВНИМАНИЕ...', 240, 168);
  }
  if (state === 'win') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 125, 480, 64);
    ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏁 СОРЕВНОВАНИЯ ОКОНЧЕНЫ', 240, 166);
  }
}
var lastTs = 0, acc = 0;
function frame(ts){
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  var dt = Math.min(50, ts - lastTs); lastTs = ts;
  acc += dt;
  while (acc >= 16.7) { acc -= 16.7; step(); }
  draw();
}
document.addEventListener('keydown', function(e){
  if (e.repeat) return;
  var k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') press('l');
  else if (k === 'arrowright' || k === 'd') press('r');
  if (k.indexOf('arrow') === 0) e.preventDefault();
});
function bindTap(id, side){
  var b = el(id); if (!b) return;
  var h = function(e){ e.preventDefault(); press(side); };
  b.addEventListener('touchstart', h, {passive:false});
  b.addEventListener('mousedown', h);
}
bindTap('btnL', 'l'); bindTap('btnR', 'r'); bindTap('btnA', 'l'); bindTap('btnJ', 'r');
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; places = []; place = 0; startHeat(0); });
startHeat(0);
requestAnimationFrame(frame);
})();
