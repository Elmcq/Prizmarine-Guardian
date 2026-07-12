'use strict';

(() => {
 const overview = document.querySelector('#overview');
 if (!overview || document.querySelector('#live-monitoring')) return;
 const stylesheet = document.createElement('link');
 stylesheet.rel = 'stylesheet';
 stylesheet.href = '/security-monitor.css';
 document.head.appendChild(stylesheet);

 const section = document.createElement('section');
 section.id = 'live-monitoring';
 section.innerHTML = `
  <div class="section-head"><h2>Live monitoring</h2><span class="live-indicator"><i></i>Live</span></div>
  <div class="monitor-grid" id="monitor-grid"></div>
  <div class="monitor-layout">
   <div><h3 class="monitor-title">Recent moderation</h3><div class="table-wrap" id="audit-table"><p class="monitor-empty">No moderation actions yet.</p></div></div>
   <form class="escalation-panel" id="escalation-form">
    <div><h3>Warning escalation</h3><p class="muted">Thresholds apply globally.</p></div>
    <label>Higher severity <input id="escalation-high" type="number" min="1" required></label>
    <label>Temporary punishment <input id="escalation-punish" type="number" min="1" required></label>
    <label>Tempban duration (minutes) <input id="escalation-duration" type="number" min="1" required></label>
    <button type="submit">Save policy</button>
    <p class="error" id="escalation-error"></p>
   </form>
  </div>`;
 overview.insertAdjacentElement('afterend', section);

 const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
 '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
 }[char]));
 const shortId = (value) => {
 const text = String(value || 'system').split('@')[0];
 return text.length > 18 ? `${text.slice(0, 15)}…` : text;
 };
 const request = async (url, options) => {
 const response = await fetch(url, {
 credentials: 'same-origin',
 headers: { 'Content-Type': 'application/json' },
 ...options,
 });
 if (!response.ok) throw new Error(response.status === 401 ? 'Unauthorized' : `HTTP ${response.status}`);
 return response.json();
 };

 async function loadPolicy() {
 try {
 const policy = await request('/api/settings/warning-escalation');
 const high = policy.levels.find((level) => level.severity === 'high') || policy.levels[0];
 const punishment = policy.levels.find((level) => level.action === 'tempban' || level.action === 'ban') || policy.levels.at(-1);
 document.querySelector('#escalation-high').value = high.threshold;
 document.querySelector('#escalation-punish').value = punishment.threshold;
 document.querySelector('#escalation-duration').value = Math.max(1, Math.round((punishment.durationMs || 3_600_000) / 60_000));
 } catch {}
 }

 async function loadMonitoring() {
 if (document.hidden || document.querySelector('#app')?.classList.contains('hidden')) return;
 try {
 const data = await request('/api/overview');
 const metrics = [
 ['Bot status', data.bot.status, data.bot.status === 'online' ? 'online' : 'warning'],
 ['Messages scanned', data.health.messagesSeen],
 ['Blocked messages', data.health.blockedMessages],
 ['Active modules', `${data.health.activeModules}/${data.health.totalModules}`],
 ];
 document.querySelector('#monitor-grid').innerHTML = metrics.map(([label, value, state]) => `
  <div class="monitor-metric"><span>${escapeHtml(label)}</span><strong class="${state || ''}">${escapeHtml(value)}</strong></div>
 `).join('');
 const actions = data.recentActions || [];
 document.querySelector('#audit-table').innerHTML = actions.length ? `
  <table><thead><tr><th>Time</th><th>Action</th><th>User</th><th>Moderator</th><th>Reason</th></tr></thead><tbody>
  ${actions.map((item) => `<tr><td>${escapeHtml(new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</td><td><span class="audit-action">${escapeHtml(item.action)}</span></td><td>${escapeHtml(shortId(item.user))}</td><td>${escapeHtml(shortId(item.moderator))}</td><td title="${escapeHtml(item.reason)}">${escapeHtml(item.reason || '-')}</td></tr>`).join('')}
  </tbody></table>` : '<p class="monitor-empty">No moderation actions yet.</p>';
 if (!document.querySelector('#escalation-high').value) loadPolicy();
 } catch {}
 }

 document.querySelector('#escalation-form').addEventListener('submit', async (event) => {
 event.preventDefault();
 const error = document.querySelector('#escalation-error');
 error.textContent = '';
 const high = Number(document.querySelector('#escalation-high').value);
 const punish = Number(document.querySelector('#escalation-punish').value);
 const durationMs = Number(document.querySelector('#escalation-duration').value) * 60_000;
 try {
 if (high <= 1) throw new Error('Higher severity threshold must be above 1.');
 if (high >= punish) throw new Error('Punishment threshold must be higher.');
 await request('/api/settings/warning-escalation', {
 method: 'PUT',
 body: JSON.stringify({
 enabled: true,
 levels: [
 { threshold: 1, severity: 'normal', action: 'warn' },
 { threshold: high, severity: 'high', action: 'warn' },
 { threshold: punish, severity: 'critical', action: 'tempban', durationMs },
 ],
 }),
 });
 const button = event.currentTarget.querySelector('button');
 button.textContent = 'Saved';
 setTimeout(() => { button.textContent = 'Save policy'; }, 1600);
 } catch (err) {
 error.textContent = err.message;
 }
 });

 loadMonitoring();
 loadPolicy();
 setInterval(loadMonitoring, 5000);
 document.addEventListener('visibilitychange', loadMonitoring);
})();
