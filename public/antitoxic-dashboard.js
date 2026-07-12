'use strict';

(() => {
 const update = async () => {
 if (document.hidden || document.querySelector('#app')?.classList.contains('hidden')) return;
 try {
 const response = await fetch('/api/modules', { credentials: 'same-origin' });
 if (!response.ok) return;
 const modules = await response.json();
 const toxic = modules.find((module) => module.key === 'toxicity');
 const card = document.querySelector('[data-key="toxicity"]');
 if (!toxic || !card) return;
 let stats = card.querySelector('.antitoxic-stats');
 if (!stats) {
 stats = document.createElement('div');
 stats.className = 'antitoxic-stats';
 card.querySelector('.module-head')?.insertAdjacentElement('afterend', stats);
 }
 stats.innerHTML = `
  <span><strong>${Number(toxic.stats?.detections || 0).toLocaleString()}</strong> detections</span>
  <span><strong>${Number(toxic.stats?.keywords || 0).toLocaleString()}</strong> keywords</span>
  <span>Top: <strong>${escapeText(toxic.stats?.mostTriggeredCategory || 'None')}</strong></span>`;
 } catch {
 }
 };

 const escapeText = (value) => String(value).replace(/[&<>"']/g, (char) => ({
 '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
 }[char]));

 const style = document.createElement('style');
 style.textContent = `
 .antitoxic-stats{display:flex;flex-wrap:wrap;gap:8px 14px;margin:4px 0 14px;color:var(--tertiary);font-family:var(--font-mono);font-size:11px}
 .antitoxic-stats strong{color:var(--on-surface);font-weight:500;font-variant-numeric:tabular-nums}
 `;
 document.head.appendChild(style);
 update();
 setInterval(update, 5000);
 document.addEventListener('visibilitychange', update);
})();
