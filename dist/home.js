/* Fast pointer-following for the central JW artwork only.
   No custom cursor, video, WebGL, or navigation interception. */
'use strict';
(() => {
  const surface = document.querySelector('.home-shell');
  const artwork = document.querySelector('.brand-art img');
  if (!surface || !artwork) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const target = {x:0,y:0};
  const current = {x:0,y:0};
  let frame = 0;
  let lastTime = 0;

  // Higher responsiveness makes the mark catch up faster, not travel farther.
  const settings = {responsiveness:28, travelX:38, travelY:24, tilt:15};

  function paint() {
    artwork.style.transform = `perspective(900px) translate3d(${current.x*settings.travelX}px, ${current.y*settings.travelY}px, 0) rotateX(${-current.y*settings.tilt*.65}deg) rotateY(${current.x*settings.tilt}deg) rotateZ(${current.x*3}deg)`;
  }
  function animate(now) {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const dt = lastTime ? Math.min((now-lastTime)/1000,.1) : 1/60;
    lastTime = now;
    const ease = 1-Math.exp(-settings.responsiveness*dt);
    current.x += (target.x-current.x)*ease;
    current.y += (target.y-current.y)*ease;
    if (Math.abs(target.x-current.x)+Math.abs(target.y-current.y)<.001) {
      current.x=target.x; current.y=target.y;
      lastTime=0;
    } else frame=requestAnimationFrame(animate);
    paint();
  }
  function wake() { if(!frame&&!reduced.matches&&!document.hidden) frame=requestAnimationFrame(animate); }
  function rest() { target.x=target.y=0; wake(); }
  function reset() {
    cancelAnimationFrame(frame); frame=0; lastTime=0;
    target.x=target.y=current.x=current.y=0;
    artwork.style.transform='none';
  }
  surface.addEventListener('pointermove', event => {
    if(reduced.matches || document.hidden) return;
    const rect=surface.getBoundingClientRect();
    target.x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
    target.y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    wake();
  },{passive:true});
  surface.addEventListener('pointerleave',rest);
  surface.addEventListener('pointerup',event=>{if(event.pointerType==='touch') rest();},{passive:true});
  window.addEventListener('blur',reset);
  window.addEventListener('pagehide',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  reduced.addEventListener('change',reset);
})();
