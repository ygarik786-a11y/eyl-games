// E.Y.L Dendy — Punch-Out: уклоняйся, лови момент, бей в ответ!
// GAMECFG: { slug, boxers:[{name, emoji, hp}] }
(function(){
'use strict';
var CFG = window.GAMECFG;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function el(id){ return document.getElementById(id); }
var score = 0, heroHp = 10, stars = 0, bIdx = 0, state = 'play', msgT = null, paused = false;
var opp = null, dodgeT = 0, dodgeDir = 0, punchCd = 0, heroFlash = 0, keys = {};
var best = +(localStorage.getItem('eyl_dendy_best_' + CFG.slug) || 0);
function saveBest(){ if (score > best) { best = score; try { localStorage.setItem('eyl_dendy_best_' + CFG.slug, best); } catch(e){} } }
function hud(){ el('hud').innerHTML = 'Счёт: <b>' + score + '</b> • Твои сердца: ' + '❤️'.repeat(Math.max(0, heroHp)) + ' (' + heroHp + ') • ⭐: ' + stars + ' • Боксёр: ' + (bIdx + 1) + '/' + CFG.boxers.length + ' — ' + opp.name + ', HP: ' + Math.max(0, opp.hp) + '/' + opp.maxHp + ' • Рекорд: ' + best; }
function setMsg(t){ el('msg').textContent = t; if (msgT) clearTimeout(msgT); msgT = setTimeout(function(){ if (state === 'play') el('msg').textContent = ''; }, 2600); }
function startBoxer(i){
  bIdx = i;
  var b = CFG.boxers[i];
  opp = { name: b.name, emoji: b.emoji, hp: b.hp, maxHp: b.hp, st: 'idle', t: 60, sway: 0 };
  if (i > 0) heroHp = Math.min(10, heroHp + 4);
  state = 'play'; hud();
  setMsg('🥊 Раунд ' + (i + 1) + ': ' + b.name + '! Следи за замахом ⚠️ — уклоняйся и бей в ответ!');
}
function oppDown(){
  score += 1000; saveBest(); hud();
  if (bIdx + 1 < CFG.boxers.length) { setMsg('🏆 Нокаут! +1000. Следующий соперник!'); startBoxer(bIdx + 1); }
  else { state = 'win'; setMsg('👑 ЧЕМПИОН! Ты побил всех! Счёт: ' + score); }
}
function heroHit(){
  heroHp--; heroFlash = 18; hud();
  if (heroHp <= 0) { state = 'over'; saveBest(); setMsg('💥 Нокаут! Игра окончена. Счёт: ' + score + '. Нажми «Заново».'); }
  else setMsg('💔 Тебя ударили! Сердец: ' + heroHp);
}
function doPunch(upper){
  if (state !== 'play' || punchCd > 0 || dodgeT > 0) return;
  punchCd = upper ? 26 : 15;
  if (upper) {
    if (stars > 0) {
      stars--;
      if (opp.st === 'open' || opp.st === 'tele' || opp.st === 'idle') {
        opp.hp -= 3; score += 300;
        opp.st = 'open'; opp.t = 45;
        setMsg('💥 АППЕРКОТ! -3 HP!');
        if (opp.hp <= 0) oppDown();
      } else setMsg('💨 Апперкот мимо!');
    } else {
      setMsg('⭐ Нет звёзд! Бей соперника во время замаха ⚠️, чтобы заработать звезду.');
    }
    hud(); return;
  }
  if (opp.st === 'tele' && opp.t > 8) {
    // удар по замаху — звезда и стан
    if (stars < 3) stars++;
    score += 200;
    opp.st = 'open'; opp.t = 48;
    setMsg('⭐ В точку! Звезда заработана, соперник оглушён — бей!');
  } else if (opp.st === 'open') {
    opp.hp -= 1; score += 100;
    opp.t = Math.max(opp.t, 22);
    setMsg('👊 Попадание! -1 HP');
    if (opp.hp <= 0) { oppDown(); return; }
  } else if (opp.st === 'idle') {
    setMsg('🛡️ Соперник закрылся. Бей, когда он оглушён (💫)!');
  }
  hud();
}
function doDodge(dir){
  if (state !== 'play' || dodgeT > 0) return;
  dodgeT = 20; dodgeDir = dir;
}
function step(){
  if (punchCd > 0) punchCd--;
  if (heroFlash > 0) heroFlash--;
  if (dodgeT > 0) dodgeT--;
  opp.sway += 0.06;
  opp.t--;
  if (opp.st === 'idle' && opp.t <= 0) { opp.st = 'tele'; opp.t = 30; }
  else if (opp.st === 'tele' && opp.t <= 0) {
    opp.st = 'strike'; opp.t = 14;
    // момент удара — проверяем защиту героя
    if (dodgeT > 0) { /* увернулся — выпад в пустоту */ }
    else if (keys.block) { setMsg('🛡️ Блок! Удар погашен.'); }
    else heroHit();
    if (state !== 'play') return;
  }
  else if (opp.st === 'strike' && opp.t <= 0) {
    if (dodgeT > 0 || true) { opp.st = 'open'; opp.t = (dodgeT > 0 ? 58 : 34); if (dodgeT > 0) setMsg('💫 Соперник промахнулся и открыт — БЕЙ!'); }
  }
  else if (opp.st === 'open' && opp.t <= 0) { opp.st = 'idle'; opp.t = 45 + Math.random() * 60; }
}
function draw(){
  ctx.fillStyle = '#101828'; ctx.fillRect(0, 0, 480, 320);
  // толпа
  ctx.fillStyle = '#26324a';
  for (var i = 0; i < 60; i++) ctx.fillRect((i * 37) % 480, 8 + (i % 4) * 9, 5, 5);
  // ринг
  ctx.fillStyle = '#28518f'; ctx.fillRect(40, 108, 400, 180);
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(30, 100); ctx.lineTo(450, 100); ctx.stroke();
  ctx.strokeStyle = '#d23b3b';
  ctx.beginPath(); ctx.moveTo(30, 122); ctx.lineTo(450, 122); ctx.stroke();
  ctx.strokeStyle = '#e8e8e8';
  ctx.beginPath(); ctx.moveTo(30, 144); ctx.lineTo(450, 144); ctx.stroke();
  var cx = 240 + Math.sin(opp.sway) * (opp.st === 'idle' ? 16 : 5);
  var cy = 205;
  if (opp.st === 'strike') cy += 26;
  if (opp.st === 'open') cx += Math.sin(opp.sway * 6) * 4;
  ctx.textAlign = 'center';
  ctx.font = '64px serif';
  ctx.fillText(opp.emoji, cx, cy);
  ctx.font = '26px serif';
  if (opp.st === 'tele') {
    ctx.fillText('⚠️', cx + 44, cy - 52);
    ctx.font = '30px serif';
    ctx.fillText('🥊', cx - 40 + Math.sin(opp.sway * 10) * 3, cy - 6);
  }
  if (opp.st === 'strike') { ctx.font = '44px serif'; ctx.fillText('🥊', 240, 262); }
  if (opp.st === 'open') { ctx.font = '24px serif'; ctx.fillText('💫', cx, cy - 62); }
  // герой: голова и перчатки снизу
  var hx = 240 + (dodgeT > 0 ? dodgeDir * 52 : 0);
  ctx.font = '30px serif';
  ctx.fillText('🧑', hx, 318);
  ctx.font = '34px serif';
  ctx.fillText('🥊', hx - 44, 296);
  ctx.fillText('🥊', hx + 44, 296);
  if (heroFlash > 0 && (heroFlash >> 2) % 2) {
    ctx.fillStyle = 'rgba(255,60,60,.22)'; ctx.fillRect(0, 0, 480, 320);
  }
  if (state === 'win' || state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 125, 480, 64);
    ctx.fillStyle = '#fff'; ctx.font = '25px sans-serif';
    ctx.fillText(state === 'win' ? '👑 ЧЕМПИОН!' : '💥 НОКАУТ', 240, 166);
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
  if (k === 'arrowleft' || k === 'a') doDodge(-1);
  else if (k === 'arrowright' || k === 'd') doDodge(1);
  else if (k === 'arrowdown' || k === 's') keys.block = true;
  else if (k === 'z') doPunch(false);
  else if (k === 'x' || k === ' ') doPunch(true);
  else if (k === 'p') { paused = !paused; setMsg(paused ? '⏸ Пауза' : '▶️ Раунд!'); }
  if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
});
document.addEventListener('keyup', function(e){
  var k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's') keys.block = false;
});
function bindTap(id, fn){
  var b = el(id); if (!b) return;
  b.addEventListener('touchstart', function(e){ e.preventDefault(); fn(); }, {passive:false});
  b.addEventListener('mousedown', function(e){ e.preventDefault(); fn(); });
}
bindTap('btnL', function(){ doDodge(-1); });
bindTap('btnR', function(){ doDodge(1); });
bindTap('btnA', function(){ doPunch(false); });
bindTap('btnJ', function(){ doPunch(true); });
var bd = el('btnD');
if (bd) {
  bd.addEventListener('touchstart', function(e){ e.preventDefault(); keys.block = true; }, {passive:false});
  bd.addEventListener('touchend', function(e){ e.preventDefault(); keys.block = false; });
  bd.addEventListener('mousedown', function(){ keys.block = true; });
  bd.addEventListener('mouseup', function(){ keys.block = false; });
}
var rs = el('restart'); if (rs) rs.addEventListener('click', function(){ score = 0; heroHp = 10; stars = 0; paused = false; startBoxer(0); });
startBoxer(0);
requestAnimationFrame(frame);
})();
