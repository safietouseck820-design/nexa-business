const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ROOT = path.resolve(__dirname, '..');
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'nexa.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const INDEX = path.join(ROOT, 'app', 'index.html');
const PUBLIC_INDEX = path.join(ROOT, 'app', 'public.html');

const EMPTY_WORKSPACE = {
  products: [], orders: [], expenses: [], clients: [], purchases: [],
  documents: [], store: {}, goals: {}, account: {}
};
const EMPTY_DB = {
  schemaVersion: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workspace: structuredClone(EMPTY_WORKSPACE)
};

// V53 authentication is local/dev-ready: passwords are hashed with scrypt,
// sessions are HttpOnly cookies, and each account gets its own workspace.
// Email verification and production email delivery belong to a later cloud phase.
const sessions = new Map();
const attempts = new Map();
const RATE_WINDOW = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const SESSION_IDLE = 2 * 60 * 60 * 1000;

function ensureFiles() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({ schemaVersion: 1, users: [] }, null, 2));
}
function readJson(file, fallback) {
  ensureFiles();
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return structuredClone(fallback); }
}
function writeJson(file, value) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}
function readDb() { return readJson(DB_FILE, EMPTY_DB); }
function writeDb(db) { db.updatedAt = new Date().toISOString(); writeJson(DB_FILE, db); }
function readUsers() { return readJson(USERS_FILE, { schemaVersion: 1, users: [] }); }
function writeUsers(data) { writeJson(USERS_FILE, data); }

function securityHeaders() {
  const h = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';"
  };
  if (IS_PRODUCTION) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}
function send(res, status, payload, type='application/json; charset=utf-8', extraHeaders={}) {
  res.writeHead(status, { ...securityHeaders(), 'Content-Type': type, 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(type.startsWith('application/json') ? JSON.stringify(payload) : payload);
}
function safeJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) { req.destroy(); return; }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function passwordVerify(password, stored) {
  const [algo, salt, expected] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function cleanEmail(v) { return String(v || '').trim().toLowerCase(); }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function publicUser(u) { return { id: u.id, email: u.email, createdAt: u.createdAt }; }
function getUser(req) {
  const token = parseCookies(req).nexa_session;
  if (!token) return null;
  const session = sessions.get(token);
  const now = Date.now();
  if (!session || session.expiresAt < now || now - session.lastSeenAt > SESSION_IDLE) { sessions.delete(token); return null; }
  session.lastSeenAt = now;
  const data = readUsers();
  return data.users.find(u => u.id === session.userId) || null;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const expected = `http${IS_PRODUCTION ? 's' : ''}://${req.headers.host}`;
    return new URL(origin).origin === expected;
  } catch { return false; }
}
function requireRequestProtection(req, res) {
  if (!sameOrigin(req)) { send(res, 403, { error: 'Requête refusée.' }); return false; }
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) { send(res, 415, { error: 'Type de contenu non accepté.' }); return false; }
  return true;
}
function authRequired(req, res) {
  const user = getUser(req);
  if (!user) { send(res, 401, { error: 'Authentification requise' }); return null; }
  return user;
}
function rateLimited(req) {
  const ip = req.socket.remoteAddress || 'local';
  const now = Date.now();
  let x = attempts.get(ip);
  if (!x || now - x.start > RATE_WINDOW) x = { start: now, count: 0 };
  x.count += 1; attempts.set(ip, x);
  return x.count > MAX_ATTEMPTS;
}
function newSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessions.set(token, { userId, createdAt: now, lastSeenAt: now, expiresAt: now + SESSION_TTL });
  return token;
}
function sessionCookie(token) {
  return `nexa_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${IS_PRODUCTION ? '; Secure' : ''}`;
}
function clearSessionCookie() { return `nexa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${IS_PRODUCTION ? '; Secure' : ''}`; }
function userWorkspace(user) {
  if (!user.workspace) user.workspace = structuredClone(EMPTY_WORKSPACE);
  return user.workspace;
}
function saveUserWorkspace(user, workspace) {
  const data = readUsers();
  const u = data.users.find(x => x.id === user.id);
  if (!u) throw new Error('User not found');
  u.workspace = { ...structuredClone(EMPTY_WORKSPACE), ...workspace };
  u.updatedAt = new Date().toISOString();
  writeUsers(data);
}
function serveStatic(req, res, pathname) {
  let file = pathname === '/' ? PUBLIC_INDEX : (pathname === '/app' || pathname === '/app/' ? INDEX : path.join(ROOT, pathname.replace(/^\/+/, '')));
  file = path.normalize(file);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error: 'Not found' });
  const ext = path.extname(file).toLowerCase();
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8' };
  res.writeHead(200, { ...securityHeaders(), 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600' });
  fs.createReadStream(file).pipe(res);
}

ensureFiles();
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now || now - session.lastSeenAt > SESSION_IDLE) sessions.delete(token);
  }
}, 15 * 60 * 1000).unref();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      const db = readDb(); const users = readUsers();
      return send(res, 200, { ok: true, service: IS_PRODUCTION ? 'NEXA production backend' : 'NEXA V53 local backend', database: 'json', schemaVersion: 2, users: users.users.length, updatedAt: db.updatedAt });
    }

    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getUser(req);
      return send(res, 200, { authenticated: !!user, user: user ? publicUser(user) : null });
    }
    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      if (!requireRequestProtection(req, res)) return;
      if (rateLimited(req)) return send(res, 429, { error: 'Trop de tentatives. Réessaie plus tard.' });
      const body = await safeJson(req);
      const email = cleanEmail(body.email), password = String(body.password || '');
      if (!validEmail(email)) return send(res, 400, { error: 'Adresse email invalide.' });
      if (password.length < 8) return send(res, 400, { error: 'Le mot de passe doit contenir au moins 8 caractères.' });
      const data = readUsers();
      if (data.users.some(u => u.email === email)) return send(res, 409, { error: 'Impossible de créer ce compte avec ces informations.' });
      const user = { id: crypto.randomUUID(), email, passwordHash: passwordHash(password), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), workspace: structuredClone(EMPTY_WORKSPACE) };
      data.users.push(user); writeUsers(data);
      const token = newSession(user.id);
      return send(res, 201, { ok: true, user: publicUser(user) }, 'application/json; charset=utf-8', { 'Set-Cookie': sessionCookie(token) });
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!requireRequestProtection(req, res)) return;
      if (rateLimited(req)) return send(res, 429, { error: 'Trop de tentatives. Réessaie plus tard.' });
      const body = await safeJson(req); const email = cleanEmail(body.email), password = String(body.password || '');
      const data = readUsers(); const user = data.users.find(u => u.email === email);
      if (!user || !passwordVerify(password, user.passwordHash)) return send(res, 401, { error: 'Email ou mot de passe incorrect.' });
      const token = newSession(user.id);
      return send(res, 200, { ok: true, user: publicUser(user) }, 'application/json; charset=utf-8', { 'Set-Cookie': sessionCookie(token) });
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      if (!requireRequestProtection(req, res)) return;
      const token = parseCookies(req).nexa_session; if (token) sessions.delete(token);
      return send(res, 200, { ok: true }, 'application/json; charset=utf-8', { 'Set-Cookie': clearSessionCookie() });
    }

    if (url.pathname === '/api/workspace' && req.method === 'GET') {
      const user = authRequired(req, res); if (!user) return;
      return send(res, 200, userWorkspace(user));
    }
    if (url.pathname === '/api/workspace' && req.method === 'PUT') {
      if (!requireRequestProtection(req, res)) return;
      const user = authRequired(req, res); if (!user) return;
      const body = await safeJson(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'Invalid workspace payload' });
      saveUserWorkspace(user, body);
      return send(res, 200, { ok: true, updatedAt: new Date().toISOString() });
    }
    if (url.pathname === '/api/reset' && req.method === 'POST') {
      if (!requireRequestProtection(req, res)) return;
      const user = authRequired(req, res); if (!user) return;
      saveUserWorkspace(user, structuredClone(EMPTY_WORKSPACE));
      return send(res, 200, { ok: true, resetAt: new Date().toISOString() });
    }
    if (req.method === 'GET') return serveStatic(req, res, url.pathname);
    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NEXA backend running on ${HOST}:${PORT}`);
  console.log(`Users: ${USERS_FILE}`);
});
