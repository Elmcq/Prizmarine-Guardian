'use strict';

(() => {
 const brand = document.querySelector('#topbar-brand');
 const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 const messages = [
  '🛡️ Prizmarine Guardian',
  "Don't forget us",
  'Your group, protected',
  'Security monitoring active',
 ];
 let index = 0;
 let timer = null;

 const schedule = () => {
  clearTimeout(timer);
  if (reduceMotion.matches || document.hidden || !brand || !window.gsap) return;
  timer = setTimeout(rotate, 5000 + Math.random() * 3000);
 };

 const rotate = () => {
  if (reduceMotion.matches || document.hidden || !brand || !window.gsap) return;
  index = (index + 1) % messages.length;
  gsap.timeline({ onComplete: schedule })
   .to(brand, {
    rotateX: -88,
    opacity: 0,
    duration: 0.32,
    ease: 'power2.in',
    transformOrigin: '50% 50%',
   })
   .set(brand, { textContent: messages[index], rotateX: 88 })
   .to(brand, {
    rotateX: 0,
    opacity: 1,
    duration: 0.48,
    ease: 'power3.out',
   });
 };

 const handleVisibility = () => {
  if (document.hidden) {
   clearTimeout(timer);
   gsap.killTweensOf(brand);
   gsap.set(brand, { rotateX: 0, opacity: 1 });
   return;
  }
  schedule();
 };

 if (!brand || !window.gsap || reduceMotion.matches) return;

 gsap.set(brand, { transformPerspective: 600, backfaceVisibility: 'hidden' });
 document.addEventListener('visibilitychange', handleVisibility);
 reduceMotion.addEventListener('change', () => {
  clearTimeout(timer);
  gsap.killTweensOf(brand);
  gsap.set(brand, { rotateX: 0, opacity: 1 });
  if (!reduceMotion.matches) schedule();
 });
 schedule();
})();
