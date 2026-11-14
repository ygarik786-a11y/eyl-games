'use strict';
// ===== E.Y.L Dendy: движок платформера =====
// Конфиг игры: window.GAMECFG = {slug, hero, collect, walker, flyer, theme:{sky,ground,block},
//   special: ''|'pogo'|'throw'|'swim'|'hover'|'attack'|'shoot'|'walljump', actName, levels:[ [строки карты] ]}
// Карта: # блок, C бонус, E ходячий враг, F летун, ^ шипы, D дверь-выход, P старт, B ящик, S супер-вещь, H сердце
(function(){
var CFG=window.GAMECFG;
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var T=32,VW=15,VH=10;
var keys={},btn={};
var level=0,score=0,lives=3,best=+(localStorage.getItem('eyl_dendy_best_'+CFG.slug)||0);
var map=[],MW=0,MH=0,player=null,enemies=[],items=[],boxes=[],door=null,camX=0,state='play',invuln=0,msgT=null;
var proj=[],carrying=false,superT=0,raf=null,lastTs=0,acc=0;
function el(id){return document.getElementById(id);}
function setMsg(t){el('msg').textContent=t;}
function hud(){el('hud').innerHTML='Счёт: <b>'+score+'</b> • Жизни: <b>'+'❤️'.repeat(Math.max(0,lives))+'</b> • Уровень: <b>'+(level+1)+'/'+CFG.levels.length+'</b> • Рекорд: <b>'+best+'</b>';}
function parseLevel(idx){
  var rows=CFG.levels[idx];MH=rows.length;MW=rows[0].length;
  map=[];enemies=[];items=[];boxes=[];door=null;
  for(var y=0;y<MH;y++){var r=[];for(var x=0;x<MW;x++){
    var ch=rows[y][x]||'.';
    if(ch==='#'){r.push(1);}
    else{r.push(0);
      if(ch==='P')player={x:x*T+4,y:y*T+2,w:24,h:28,vx:0,vy:0,face:1,ground:false};
      else if(ch==='C')items.push({x:x*T+6,y:y*T+6,t:'C',taken:false});
      else if(ch==='H')items.push({x:x*T+6,y:y*T+6,t:'H',taken:false});
      else if(ch==='S')items.push({x:x*T+6,y:y*T+6,t:'S',taken:false});
      else if(ch==='E')enemies.push({x:x*T+3,y:y*T+4,w:26,h:26,t:'E',dir:Math.random()<0.5?-1:1,dead:false,ph:Math.random()*6});
      else if(ch==='F')enemies.push({x:x*T+3,y:y*T+3,w:26,h:24,t:'F',dir:Math.random()<0.5?-1:1,dead:false,ph:Math.random()*6,baseY:y*T+3});
      else if(ch==='^')items.push({x:x*T,y:y*T+14,t:'^',taken:false});
      else if(ch==='D')door={x:x*T,y:y*T};
      else if(ch==='B')boxes.push({x:x*T+2,y:y*T+2,w:28,h:28,held:false,thrown:false,vx:0,vy:0});
    }
  }map.push(r);}
  if(!player)player={x:40,y:40,w:24,h:28,vx:0,vy:0,face:1,ground:false};
  proj=[];carrying=false;superT=0;invuln=0;camX=0;state='play';
  hud();setMsg('Уровень '+(idx+1)+'! Добеги до двери 🚪');
}
function solid(tx,ty){if(tx<0||tx>=MW)return true;if(ty<0||ty>=MH)return ty>=MH;return map[ty][tx]===1;}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function moveBox(e,dt){
  // горизонтальное движение с коллизией по тайлам
  e.x+=e.vx*dt;
  var ty0=Math.floor(e.y/T),ty1=Math.floor((e.y+e.h-1)/T);
  if(e.vx>0){var tx=Math.floor((e.x+e.w)/T);for(var ty=ty0;ty<=ty1;ty++)if(solid(tx,ty)){e.x=tx*T-e.w-0.01;e.vx=0;}}
  if(e.vx<0){var tx2=Math.floor(e.x/T);for(var ty2=ty0;ty2<=ty1;ty2++)if(solid(tx2,ty2)){e.x=(tx2+1)*T+0.01;e.vx=0;}}
  e.y+=e.vy*dt;
  var tx0=Math.floor(e.x/T),tx1=Math.floor((e.x+e.w-1)/T);e.ground=false;
  if(e.vy>0){var by=Math.floor((e.y+e.h)/T);for(var bx=tx0;bx<=tx1;bx++)if(solid(bx,by)){e.y=by*T-e.h-0.01;e.vy=0;e.ground=true;}}
  if(e.vy<0){var hy=Math.floor(e.y/T);for(var bx2=tx0;bx2<=tx1;bx2++)if(solid(bx2,hy)){e.y=(hy+1)*T+0.01;e.vy=0;}}
}
function hurt(){
  if(invuln>0||superT>0)return;
  lives--;hud();
  if(lives<=0){state='over';setMsg('💥 Игра окончена! Счёт: '+score+'. Нажми «Заново».');saveBest();return;}
  invuln=90;player.vy=-7;setMsg('Ай! Осталось жизней: '+lives);
}
function saveBest(){if(score>best){best=score;localStorage.setItem('eyl_dendy_best_'+CFG.slug,best);}hud();}
function winLevel(){
  score+=100;saveBest();
  if(level+1>=CFG.levels.length){state='win';setMsg('🎉 ПОБЕДА! Вся игра пройдена! Счёт: '+score);return;}
  level++;parseLevel(level);setMsg('🎉 Уровень пройден! +100. Дальше!');
}
function step(dt){
  if(state!=='play')return;
  if(invuln>0)invuln--;
  if(superT>0)superT--;
  var L=keys.l||btn.l,R=keys.r||btn.r;
  var sp=(CFG.special==='swim')?2.2:2.7;if(superT>0)sp=4;
  if(L){player.vx=-sp;player.face=-1;}
  else if(R){player.vx=sp;player.face=1;}
  else player.vx=0;
  if(CFG.special==='swim'){
    player.vy+=0.12;if(player.vy>2.4)player.vy=2.4;
    if(keys.u||btn.u||keys.j||btn.j)player.vy=-3.2;
  }else{
    player.vy+=0.6;if(player.vy>13)player.vy=13;
  }
  moveBox(player,dt);
  // враги
  enemies.forEach(function(en){
    if(en.dead)return;
    if(en.t==='E'){
      en.x+=en.dir*0.7*dt;
      var aheadX=en.dir>0?Math.floor((en.x+en.w+2)/T):Math.floor((en.x-2)/T);
      var feetY=Math.floor((en.y+en.h+4)/T);
      if(solid(aheadX,Math.floor((en.y+10)/T))||!solid(aheadX,feetY))en.dir*=-1;
    }else{
      en.ph+=0.06*dt;en.x+=en.dir*0.9*dt;
      en.y=en.baseY+Math.sin(en.ph)*14;
      var ax=Math.floor((en.x+en.w/2)/T);
      if(solid(ax,Math.floor(en.y/T)))en.dir*=-1;
      if(en.x<0||en.x>MW*T-26)en.dir*=-1;
    }
    if(rectHit(player,en)){
      if(superT>0){en.dead=true;score+=30;}
      else if(player.vy>1.5&&player.y+player.h-en.y<16){en.dead=true;score+=30;player.vy=-8;setMsg('🎯 Враг повержен! +30');}
      else hurt();
      hud();
    }
  });
  // ящики
  boxes.forEach(function(b){
    if(b.held){b.x=player.x+player.w/2-14;b.y=player.y-30;return;}
    if(b.thrown){
      b.x+=b.vx*dt;b.vy+=0.5;b.y+=b.vy*dt;
      enemies.forEach(function(en){if(!en.dead&&rectHit(b,en)){en.dead=true;score+=30;hud();}});
      if(solid(Math.floor((b.x+14)/T),Math.floor((b.y+14)/T))||b.y>MH*T){b.thrown=false;b.vx=0;b.vy=0;
        b.x=Math.round(b.x/T)*T+2;b.y=Math.min(b.y,MH*T-T)+2;}
    }
  });
  // снаряды (shoot)
  for(var i=proj.length-1;i>=0;i--){var p=proj[i];p.x+=p.vx*dt;
    var hit=false;
    enemies.forEach(function(en){if(!en.dead&&rectHit(p,en)){en.dead=true;score+=30;hit=true;hud();}});
    if(hit||p.x<0||p.x>MW*T||solid(Math.floor(p.x/T),Math.floor(p.y/T)))proj.splice(i,1);
  }
  // предметы
  items.forEach(function(it){
    if(it.taken)return;
    var r={x:it.x,y:it.y,w:20,h:20};
    if(rectHit(player,r)){
      if(it.t==='^'){hurt();return;}
      it.taken=true;
      if(it.t==='C'){score+=10;setMsg('+10'); }
      else if(it.t==='H'){lives++;setMsg('❤️ +1 жизнь!');}
      else if(it.t==='S'){superT=480;setMsg('⭐ Супер-сила на 8 секунд!');}
      hud();
    }
  });
  // шипы под ногами (проверка отдельно, когда стоит)
  // дверь
  if(door&&rectHit(player,{x:door.x+4,y:door.y,w:24,h:32}))winLevel();
  // падение в пропасть
  if(player.y>MH*T+40){lives--;hud();
    if(lives<=0){state='over';setMsg('💥 Игра окончена! Счёт: '+score+'. Нажми «Заново».');saveBest();}
    else parseLevel(level),setMsg('Упал! Осталось жизней: '+lives);
  }
  camX=Math.max(0,Math.min(MW*T-VW*T,player.x+player.w/2-VW*T/2));
}
function draw(){
  var th=CFG.theme;
  var gr=ctx.createLinearGradient(0,0,0,VH*T);
  gr.addColorStop(0,th.sky);gr.addColorStop(1,th.sky2||th.sky);
  ctx.fillStyle=gr;ctx.fillRect(0,0,VW*T,VH*T);
  ctx.save();ctx.translate(-Math.round(camX),0);
  for(var y=0;y<MH;y++)for(var x=0;x<MW;x++)if(map[y][x]){
    ctx.fillStyle=th.block;ctx.beginPath();ctx.roundRect(x*T+1,y*T+1,T-2,T-2,5);ctx.fill();
    ctx.fillStyle=th.top;ctx.fillRect(x*T+1,y*T+1,T-2,6);
  }
  if(door){ctx.font='30px serif';ctx.textAlign='center';ctx.fillText('🚪',door.x+16,door.y+28);}
  items.forEach(function(it){
    if(it.taken)return;ctx.font='20px serif';ctx.textAlign='center';
    var e=it.t==='C'?CFG.collect:(it.t==='H'?'❤️':(it.t==='S'?(CFG.superEmoji||'⭐'):'🔺'));
    if(it.t==='^'){ctx.fillText('🔺',it.x+10,it.y+16);}
    else ctx.fillText(e,it.x+10,it.y+17);
  });
  boxes.forEach(function(b){ctx.font='26px serif';ctx.textAlign='center';ctx.fillText('📦',b.x+14,b.y+24);});
  enemies.forEach(function(en){
    if(en.dead)return;ctx.font='25px serif';ctx.textAlign='center';
    ctx.fillText(en.t==='E'?CFG.walker:CFG.flyer,en.x+13,en.y+22);
  });
  proj.forEach(function(p){ctx.font='16px serif';ctx.textAlign='center';ctx.fillText(CFG.projEmoji||'⭐',p.x+6,p.y+12);});
  if(!(invuln>0&&(invuln>>2)%2===0)){
    ctx.font='27px serif';ctx.textAlign='center';
    ctx.fillText(CFG.hero,player.x+12,player.y+24);
    if(superT>0){ctx.font='15px serif';ctx.fillText('✨',player.x+12,player.y-2);}
    if(carrying){ctx.font='20px serif';ctx.fillText('📦',player.x+12,player.y-16);}
  }
  ctx.restore();
  if(state==='over'||state==='win'){
    ctx.fillStyle='rgba(10,10,25,.72)';ctx.fillRect(0,0,VW*T,VH*T);
    ctx.fillStyle='#ffd23f';ctx.font='bold 30px Verdana';ctx.textAlign='center';
    ctx.fillText(state==='win'?'🎉 ПОБЕДА!':'💥 ИГРА ОКОНЧЕНА',VW*T/2,VH*T/2-8);
    ctx.font='18px Verdana';ctx.fillStyle='#fff';
    ctx.fillText('Счёт: '+score+'  •  Рекорд: '+best,VW*T/2,VH*T/2+24);
  }
}
function frame(ts){
  raf=requestAnimationFrame(frame);
  if(!lastTs)lastTs=ts;var dt=(ts-lastTs)/16.7;lastTs=ts;
  if(dt>3)dt=3;acc+=dt;
  while(acc>=1){step(1);acc-=1;}
  draw();
}
function doJump(){
  if(state!=='play')return;
  if(CFG.special==='pogo'){
    if(player.ground){player.vy=-11;}
    else if(player.vy>2){player.vy=-13.5;setMsg('🦯 Пого-прыжок!');}
    return;
  }
  if(CFG.special==='hover'){
    if(player.ground)player.vy=-11;else player.vy=Math.min(player.vy,-2.2);
    return;
  }
  if(CFG.special==='walljump'&&!player.ground){
    var lx=Math.floor((player.x-3)/T),rx=Math.floor((player.x+player.w+3)/T),my=Math.floor((player.y+10)/T);
    if(solid(lx,my)){player.vy=-11;player.vx=3.4;player.face=1;return;}
    if(solid(rx,my)){player.vy=-11;player.vx=-3.4;player.face=-1;return;}
  }
  if(player.ground)player.vy=-11.5;
}
function doAct(){
  if(state!=='play')return;
  if(CFG.special==='throw'){
    if(carrying){
      carrying=false;
      for(var i=0;i<boxes.length;i++)if(boxes[i].held){boxes[i].held=false;boxes[i].thrown=true;boxes[i].vx=player.face*6;boxes[i].vy=-3;break;}
    }else{
      for(var j=0;j<boxes.length;j++){var b=boxes[j];
        if(!b.held&&!b.thrown&&Math.abs(b.x-player.x)<40&&Math.abs(b.y-player.y)<44){b.held=true;carrying=true;break;}}
    }
    return;
  }
  if(CFG.special==='attack'||CFG.special==='shoot'){
    if(CFG.special==='shoot'){proj.push({x:player.x+player.w/2-6,y:player.y+8,w:12,h:12,vx:player.face*7});return;}
    var zone={x:player.face>0?player.x+player.w:player.x-26,y:player.y,w:26,h:28};
    enemies.forEach(function(en){if(!en.dead&&rectHit(zone,en)){en.dead=true;score+=30;setMsg('💥 Удар! +30');hud();}});
    return;
  }
  doJump();
}
function restart(){level=0;score=0;lives=3;parseLevel(0);setMsg('Заново! Удачи, '+CFG.hero);}
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='arrowleft'||k==='a')keys.l=true;
  else if(k==='arrowright'||k==='d')keys.r=true;
  else if(k==='arrowup'||k==='w')keys.u=true;
  else if(k==='arrowdown'||k==='s')keys.d=true;
  else if(k==='z'||k===' '){doJump();e.preventDefault();}
  else if(k==='x')doAct();
  if(k.indexOf('arrow')===0)e.preventDefault();
});
document.addEventListener('keyup',function(e){
  var k=e.key.toLowerCase();
  if(k==='arrowleft'||k==='a')keys.l=false;
  else if(k==='arrowright'||k==='d')keys.r=false;
  else if(k==='arrowup'||k==='w')keys.u=false;
  else if(k==='arrowdown'||k==='s')keys.d=false;
});
function bindBtn(id,prop,onpress){
  var b=el(id);if(!b)return;
  b.addEventListener('touchstart',function(e){e.preventDefault();btn[prop]=true;if(onpress)onpress();},{passive:false});
  b.addEventListener('touchend',function(e){e.preventDefault();btn[prop]=false;},{passive:false});
  b.addEventListener('mousedown',function(){btn[prop]=true;if(onpress)onpress();});
  b.addEventListener('mouseup',function(){btn[prop]=false;});
  b.addEventListener('mouseleave',function(){btn[prop]=false;});
}
bindBtn('btnL','l');bindBtn('btnR','r');bindBtn('btnU','u');
bindBtn('btnJ','j',doJump);
bindBtn('btnA','a',doAct);
el('restart').addEventListener('click',restart);
el('actName').textContent=CFG.actName||'Действие';
parseLevel(0);
raf=requestAnimationFrame(frame);
})();
