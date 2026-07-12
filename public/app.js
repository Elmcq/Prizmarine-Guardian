'use strict';

const $ = (sel) => document.querySelector(sel);

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    showLogin();
    throw new Error('Unauthorized');
  }
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error((body && body.error) || `HTTP ${res.status}`);
  }
  return body;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function showLogin() {
  $('#login').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function showApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
}

/* ---------------- Auth ---------------- */
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ token: $('#token').value }),
    });
    $('#token').value = '';
    await boot();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  showLogin();
});

/* ---------------- Boot / loaders ---------------- */
async function boot() {
  try {
    const me = await api('/api/auth/me');
    if (!me.authed) throw new Error('not authed');
  } catch {
    return; // api() already showed login
  }
  showApp();
  await Promise.all([loadOverview(), loadModules(), loadRules()]);
  loadIncidents();
  loadBans();
  loadWarnings();
}

async function loadOverview() {
  const d = await api('/api/overview');
  $('#bot-name').textContent = d.bot.name;
  $('#bot-meta').textContent = `owner: ${d.bot.owner || '-'} · uptime ${d.bot.uptimeHuman}`;
  const mem = d.health.memory;
  const cards = [
    { label: 'Uptime', value: d.bot.uptimeHuman },
    { label: 'Active bans', value: d.health.activeBans },
    { label: 'Total warnings', value: d.health.totalWarnings },
    { label: 'Messages seen', value: d.health.messagesSeen },
    { label: 'Memory (RSS)', value: `${mem.rssMb} MB` },
    { label: 'Rules', value: d.rules.total },
  ];
  $('#overview').innerHTML = cards.map((c) => `
    <div class="card">
      <div class="stat">${escapeHtml(String(c.value))}</div>
      <div class="stat-label">${escapeHtml(c.label)}</div>
    </div>`).join('');
}

async function loadModules() {
  const list = await api('/api/modules');
  $('#modules').innerHTML = list.map((m) => {
    const fields = m.fields.map((f) => {
      const val = m.settings[f.key];
      const input = f.type === 'bool'
        ? `<input type="checkbox" data-field="${f.key}" ${val ? 'checked' : ''} />`
        : `<input type="number" data-field="${f.key}" value="${escapeHtml(String(val ?? ''))}" min="${f.min || 0}" />`;
      return `<div class="field"><label>${escapeHtml(f.label)}</label>${input}</div>`;
    }).join('');
    return `
    <div class="card" data-key="${m.key}">
      <div class="module-head">
        <h3>${escapeHtml(m.label)}</h3>
        <label class="switch">
          <input type="checkbox" class="mod-enabled" ${m.enabled ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
      ${fields}
      <button class="primary mod-save" style="margin-top:10px">Save</button>
    </div>`;
  }).join('');

  document.querySelectorAll('#modules .card').forEach((card) => {
    card.querySelector('.mod-save').addEventListener('click', () => saveModule(card));
  });
}

async function saveModule(card) {
  const key = card.dataset.key;
  const enabled = card.querySelector('.mod-enabled').checked;
  const body = { enabled };
  card.querySelectorAll('[data-field]').forEach((el) => {
    const f = el.dataset.field;
    body[f] = el.type === 'checkbox' ? el.checked : Number(el.value);
  });
  try {
    await api(`/api/modules/${key}`, { method: 'PUT', body: JSON.stringify(body) });
    toast(`${key} updated`);
    await loadOverview();
  } catch (err) {
    toast(err.message);
  }
}

/* ---------------- Rules ---------------- */
async function loadRules() {
  const list = await api('/api/rules');
  if (!list.length) {
    $('#rules').innerHTML = '<div class="table-wrap"><p class="muted" style="padding:12px">No rules yet.</p></div>';
    return;
  }
  $('#rules').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Description</th><th>Punishment</th><th></th></tr></thead>
      <tbody>
        ${list.map((r) => `
          <tr>
            <td>${escapeHtml(r.id)}</td>
            <td>${escapeHtml(r.title)}</td>
            <td>${escapeHtml(r.description)}</td>
            <td>${escapeHtml(r.punishment)}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="ghost rule-edit" data-id="${escapeHtml(r.id)}">Edit</button>
              <button class="danger rule-delete" data-id="${escapeHtml(r.id)}">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  $('#rules').querySelectorAll('.rule-edit').forEach((b) =>
    b.addEventListener('click', () => openRuleModal(b.dataset.id)));
  $('#rules').querySelectorAll('.rule-delete').forEach((b) =>
    b.addEventListener('click', () => deleteRule(b.dataset.id)));
}

$('#add-rule').addEventListener('click', () => openRuleModal(null));
$('#rule-cancel').addEventListener('click', () => $('#rule-modal').classList.add('hidden'));

function openRuleModal(id) {
  $('#rule-error').textContent = '';
  if (id) {
    const row = [...document.querySelectorAll('#rules tr')]
      .find((tr) => tr.querySelector('.rule-edit')?.dataset.id === id);
    $('#rule-modal-title').textContent = 'Edit rule';
    $('#rule-id-old').value = id;
    $('#rule-id').value = id;
    $('#rule-id').disabled = true;
    $('#rule-title').value = row.children[1].textContent;
    $('#rule-description').value = row.children[2].textContent;
    $('#rule-punishment').value = row.children[3].textContent;
  } else {
    $('#rule-modal-title').textContent = 'Add rule';
    $('#rule-id-old').value = '';
    $('#rule-id').value = '';
    $('#rule-id').disabled = false;
    $('#rule-title').value = '';
    $('#rule-description').value = '';
    $('#rule-punishment').value = 'Warn';
  }
  $('#rule-modal').classList.remove('hidden');
}

$('#rule-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#rule-error').textContent = '';
  const id = $('#rule-id').value.trim();
  const title = $('#rule-title').value.trim();
  const description = $('#rule-description').value.trim();
  const punishment = $('#rule-punishment').value;
  const oldId = $('#rule-id-old').value;

  try {
    if (oldId) {
      for (const [field, value] of [['title', title], ['description', description], ['punishment', punishment]]) {
        await api(`/api/rules/${encodeURIComponent(oldId)}`, {
          method: 'PUT', body: JSON.stringify({ field, value }),
        });
      }
    } else {
      await api('/api/rules', { method: 'POST', body: JSON.stringify({ id, title, description, punishment }) });
    }
    $('#rule-modal').classList.add('hidden');
    toast('Rule saved');
    await Promise.all([loadRules(), loadOverview()]);
  } catch (err) {
    $('#rule-error').textContent = err.message;
  }
});

async function deleteRule(id) {
  if (!confirm(`Delete rule ${id}?`)) return;
  try {
    await api(`/api/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
    toast('Rule deleted');
    await Promise.all([loadRules(), loadOverview()]);
  } catch (err) {
    toast(err.message);
  }
}

/* ---------------- Incidents / Bans / Warnings ---------------- */
$('#refresh-incidents').addEventListener('click', loadIncidents);
$('#refresh-bans').addEventListener('click', loadBans);
$('#refresh-warnings').addEventListener('click', loadWarnings);

async function loadIncidents() {
  const mod = $('#incident-module').value;
  const d = await api(`/api/data/incidents?module=${mod}&limit=50`);
  if (!d.items.length) {
    $('#incidents').innerHTML = '<div class="table-wrap"><p class="muted" style="padding:12px">No incidents.</p></div>';
    return;
  }
  $('#incidents').innerHTML = `
    <table>
      <thead><tr><th>Time</th><th>Group</th><th>User</th><th>Category/Type</th><th>Sev</th><th>Action</th></tr></thead>
      <tbody>
        ${d.items.map((i) => `
          <tr>
            <td>${fmtTime(i.timestamp)}</td>
            <td>${escapeHtml(shortId(i.group))}</td>
            <td>${escapeHtml(shortId(i.user))}</td>
            <td>${escapeHtml(i.category || i.type || '-')}</td>
            <td>${escapeHtml(i.severity || '-')}</td>
            <td>${escapeHtml(i.action || '-')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadBans() {
  const d = await api('/api/data/bans?limit=100');
  if (!d.items.length) {
    $('#bans').innerHTML = '<div class="table-wrap"><p class="muted" style="padding:12px">No bans.</p></div>';
    return;
  }
  $('#bans').innerHTML = `
    <table>
      <thead><tr><th>User</th><th>Group</th><th>Reason</th><th>Banned</th><th>Expires</th></tr></thead>
      <tbody>
        ${d.items.map((b) => `
          <tr>
            <td>${escapeHtml(shortId(b.userId))}</td>
            <td>${escapeHtml(shortId(b.groupId))}</td>
            <td>${escapeHtml(b.reason || '-')}</td>
            <td>${fmtTime(b.bannedAt)}</td>
            <td>${fmtTime(b.expiresAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadWarnings() {
  const d = await api('/api/data/warnings?limit=100');
  if (!d.items.length) {
    $('#warnings').innerHTML = '<div class="table-wrap"><p class="muted" style="padding:12px">No warnings.</p></div>';
    return;
  }
  $('#warnings').innerHTML = `
    <table>
      <thead><tr><th>User</th><th>Group</th><th>Count</th><th>Reasons</th></tr></thead>
      <tbody>
        ${d.items.map((w) => `
          <tr>
            <td>${escapeHtml(shortId(w.userId))}</td>
            <td>${escapeHtml(shortId(w.groupId))}</td>
            <td>${escapeHtml(String(w.count))}</td>
            <td>${escapeHtml((w.reasons || []).map((r) => r.reason).join('; '))}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ---------------- Helpers ---------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function shortId(id) {
  if (!id) return '-';
  return id.length > 16 ? `${id.slice(0, 8)}…` : id;
}
function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
}

// Auto-refresh overview + modules so stats stay current.
setInterval(() => {
  if (!$('#app').classList.contains('hidden')) {
    loadOverview().catch(() => {});
    loadModules().catch(() => {});
  }
}, 20000);

// Initial auth check
boot();
