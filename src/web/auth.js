/**
 * @file Session-cookie authentication for the web dashboard.
 *
 * Single-owner model: the dashboard is unlocked with DASHBOARD_TOKEN (from
 * .env). On a correct token we issue an HttpOnly, SameSite=Lax session cookie
 * backed by an in-memory Map. Sessions expire after 24h and are cleared on
 * process restart — acceptable for a single-owner tool.
 *
 * NOTE: the cookie is not marked `Secure`, so it works over plain HTTP (e.g. an
 * SSH tunnel or LAN). For any internet-facing deployment, put the dashboard
 * behind an HTTPS reverse proxy (nginx) and firewall the port.
 */

import crypto from 'node:crypto';

const COOKIE_NAME = 'pg_sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * @param {string} token - the expected DASHBOARD_TOKEN.
 * @returns {{
 *   login: Function, logout: Function, requireAuth: Function,
 *   parseCookies: Function, COOKIE_NAME: string
 * }}
 */
export function createAuth(token) {
  const sessions = new Map(); // sid -> { createdAt: number }

  function parseCookies(req) {
    const header = req.headers.cookie;
    const out = {};
    if (!header) return out;
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
    return out;
  }

  function evictExpired() {
    const now = Date.now();
    for (const [sid, s] of sessions) {
      if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(sid);
    }
  }

  function cookieValue(sid) {
    return `${COOKIE_NAME}=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
  }

  function login(req, res) {
    const body = req.body || {};
    const provided = typeof body.token === 'string' ? body.token : '';
    if (!token || provided !== token) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    evictExpired();
    const sid = crypto.randomUUID();
    sessions.set(sid, { createdAt: Date.now() });
    res.setHeader('Set-Cookie', cookieValue(sid));
    return res.json({ ok: true });
  }

  function logout(req, res) {
    const cookies = parseCookies(req);
    if (cookies[COOKIE_NAME]) sessions.delete(cookies[COOKIE_NAME]);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    return res.json({ ok: true });
  }

  function requireAuth(req, res, next) {
    const cookies = parseCookies(req);
    const sid = cookies[COOKIE_NAME];
    if (sid && sessions.has(sid)) {
      const s = sessions.get(sid);
      if (Date.now() - s.createdAt <= SESSION_TTL_MS) return next();
      sessions.delete(sid);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return { login, logout, requireAuth, parseCookies, COOKIE_NAME };
}
