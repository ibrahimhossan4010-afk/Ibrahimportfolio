const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const SITE_DATA_FILE = path.join(DATA_DIR, 'site_data.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin_auth.json');
const UPLOADS_DIR = path.join(BASE_DIR, 'assets', 'images', 'uploads');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const VERCEL_MAX_VIDEO_CHUNK = 2 * 1024 * 1024;

// In-memory sessions for local JSON-file mode (used when TURSO_DATABASE_URL is unset)
const localSessions = new Map();

let cachedClientKey = '';
let cachedClient = null;
let cachedSchemaKey = '';
let cachedSchemaPromise = null;

function resolveTursoConfig() {
  const directUrl = (process.env.TURSO_DATABASE_URL || '').trim();
  const directToken = (process.env.TURSO_AUTH_TOKEN || '').trim();
  if (directUrl) {
    return { url: directUrl, authToken: directToken || undefined };
  }

  // Support prefixed Vercel Storage / Marketplace Turso env vars (e.g. *_TURSO_DATABASE_URL)
  for (const [k, v] of Object.entries(process.env)) {
    const val = String(v || '').trim();
    if (!val) continue;
    const looksLikeTursoKey = k.endsWith('TURSO_DATABASE_URL') || k.endsWith('_DATABASE_URL') || k === 'DATABASE_URL' || k.endsWith('_URL');
    const looksLikeTursoUrl = val.startsWith('libsql://') || val.includes('.turso.io');
    if (looksLikeTursoKey && looksLikeTursoUrl) {
      const prefix = k.replace(/(TURSO_DATABASE_URL|DATABASE_URL|URL)$/, '');
      const token =
        process.env[prefix + 'TURSO_AUTH_TOKEN'] ||
        process.env[prefix + 'AUTH_TOKEN'] ||
        process.env.TURSO_AUTH_TOKEN ||
        process.env.DATABASE_AUTH_TOKEN ||
        '';
      return { url: val, authToken: String(token).trim() || undefined };
    }
  }

  return null;
}

function getStorageMode() {
  if (resolveTursoConfig()) {
    return 'turso';
  }
  if (process.env.VERCEL) {
    return 'vercel-unconfigured';
  }
  return 'local-file';
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req, limitBytes = 8 * 1024 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {});
      } catch {
        const err = new Error('Invalid JSON payload');
        err.statusCode = 400;
        return Promise.reject(err);
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        const raw = req.body.toString('utf8');
        return Promise.resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const err = new Error('Invalid JSON payload');
        err.statusCode = 400;
        return Promise.reject(err);
      }
    }
  }

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const err = new Error('Invalid JSON payload');
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  const derived = crypto.scryptSync(password, stored.salt, 64);
  const target = Buffer.from(stored.hash, 'hex');
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

function getAuthToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function readSeedSiteData() {
  try {
    const raw = fs.readFileSync(SITE_DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { profile: {}, stats: [], portfolio: [], testimonials: [], faqs: [], inquiries: [] };
  }
}

function ensureLocalDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(AUTH_FILE)) {
    const initial = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'ibrahim@2026');
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2));
  }
}

async function getTursoDb() {
  const cfg = resolveTursoConfig();
  const url = cfg ? cfg.url : '';
  const authToken = cfg ? cfg.authToken : undefined;
  const key = `${url}::${authToken || ''}`;

  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = createClient({ url, authToken });
    cachedClientKey = key;
    cachedSchemaKey = '';
    cachedSchemaPromise = null;
  }

  if (cachedSchemaKey !== key || !cachedSchemaPromise) {
    cachedSchemaKey = key;
    cachedSchemaPromise = (async () => {
      await cachedClient.execute(`
        CREATE TABLE IF NOT EXISTS site_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await cachedClient.execute(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          token TEXT PRIMARY KEY,
          expires_at INTEGER NOT NULL
        )
      `);
      await cachedClient.execute(`
        CREATE TABLE IF NOT EXISTS uploaded_images (
          id TEXT PRIMARY KEY,
          mime_type TEXT NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      const now = new Date().toISOString();
      const seedData = JSON.stringify(readSeedSiteData());
      await cachedClient.execute({
        sql: `INSERT OR IGNORE INTO site_state (key, value, updated_at) VALUES (?, ?, ?)`,
        args: ['site_data', seedData, now]
      });

      const initialAuth = JSON.stringify(hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'ibrahim@2026'));
      await cachedClient.execute({
        sql: `INSERT OR IGNORE INTO site_state (key, value, updated_at) VALUES (?, ?, ?)`,
        args: ['admin_auth', initialAuth, now]
      });
    })().catch(err => {
      cachedSchemaPromise = null;
      throw err;
    });
  }

  await cachedSchemaPromise;
  return cachedClient;
}

async function readSiteData() {
  const mode = getStorageMode();
  if (mode === 'turso') {
    const db = await getTursoDb();
    const result = await db.execute({
      sql: `SELECT value FROM site_state WHERE key = ? LIMIT 1`,
      args: ['site_data']
    });
    if (result.rows.length > 0) {
      return JSON.parse(String(result.rows[0].value));
    }
    return readSeedSiteData();
  }
  return readSeedSiteData();
}

async function writeSiteData(data) {
  const mode = getStorageMode();
  if (mode === 'turso') {
    const db = await getTursoDb();
    await db.execute({
      sql: `INSERT INTO site_state (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: ['site_data', JSON.stringify(data), new Date().toISOString()]
    });
    return;
  }
  ensureLocalDirs();
  fs.writeFileSync(SITE_DATA_FILE, JSON.stringify(data, null, 2));
}

async function readAdminAuth() {
  const mode = getStorageMode();
  if (mode === 'turso') {
    const db = await getTursoDb();
    const result = await db.execute({
      sql: `SELECT value FROM site_state WHERE key = ? LIMIT 1`,
      args: ['admin_auth']
    });
    if (result.rows.length > 0) {
      return JSON.parse(String(result.rows[0].value));
    }
    return null;
  }
  ensureLocalDirs();
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
}

async function writeAdminAuth(authObj) {
  const mode = getStorageMode();
  if (mode === 'turso') {
    const db = await getTursoDb();
    await db.execute({
      sql: `INSERT INTO site_state (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: ['admin_auth', JSON.stringify(authObj), new Date().toISOString()]
    });
    return;
  }
  ensureLocalDirs();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(authObj, null, 2));
}

async function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const mode = getStorageMode();

  if (mode === 'turso') {
    const db = await getTursoDb();
    await db.execute({
      sql: `DELETE FROM admin_sessions WHERE expires_at < ?`,
      args: [Date.now()]
    });
    await db.execute({
      sql: `INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)`,
      args: [token, expiresAt]
    });
    return token;
  }

  localSessions.set(token, expiresAt);
  return token;
}

async function isAuthenticated(req) {
  const token = getAuthToken(req);
  if (!token) return false;

  const mode = getStorageMode();
  if (mode === 'vercel-unconfigured') {
    return false;
  }
  if (mode === 'turso') {
    const db = await getTursoDb();
    const result = await db.execute({
      sql: `SELECT expires_at FROM admin_sessions WHERE token = ? LIMIT 1`,
      args: [token]
    });
    if (result.rows.length === 0) return false;
    const expiresAt = Number(result.rows[0].expires_at);
    if (Date.now() > expiresAt) {
      await db.execute({
        sql: `DELETE FROM admin_sessions WHERE token = ?`,
        args: [token]
      });
      return false;
    }
    return true;
  }

  const expiresAt = localSessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    localSessions.delete(token);
    return false;
  }
  return true;
}

async function revokeSession(req) {
  const token = getAuthToken(req);
  if (!token) return;
  if (getStorageMode() === 'turso') {
    const db = await getTursoDb();
    await db.execute({ sql: `DELETE FROM admin_sessions WHERE token = ?`, args: [token] });
    return;
  }
  localSessions.delete(token);
}

async function revokeAllSessions() {
  if (getStorageMode() === 'turso') {
    const db = await getTursoDb();
    await db.execute(`DELETE FROM admin_sessions`);
    return;
  }
  localSessions.clear();
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractDriveConfirmUrl(html, baseUrl) {
  const formMatch = html.match(/<form[^>]*action=["']([^"']*download[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i);
  if (formMatch) {
    try {
      const target = new URL(decodeHtmlEntities(formMatch[1]), baseUrl);
      const inputs = formMatch[2].match(/<input[^>]*>/gi) || [];
      for (const tag of inputs) {
        const nameMatch = tag.match(/name=["']([^"']+)["']/i);
        const valueMatch = tag.match(/value=["']([^"']*)["']/i);
        if (nameMatch && valueMatch) {
          target.searchParams.set(nameMatch[1], decodeHtmlEntities(valueMatch[1]));
        }
      }
      return target.toString();
    } catch {
      return null;
    }
  }

  const hrefMatch = html.match(/href=["']([^"']*confirm=[^"']+)["']/i);
  if (hrefMatch) {
    try {
      return new URL(decodeHtmlEntities(hrefMatch[1]), baseUrl).toString();
    } catch {
      return null;
    }
  }

  return null;
}

function resolveVideoMimeType(headerType) {
  const raw = String(headerType || '').split(';')[0].trim().toLowerCase();
  if (!raw || raw === 'application/octet-stream' || raw === 'application/binary' || raw === 'binary/octet-stream') {
    return 'video/mp4';
  }
  return headerType;
}

function clampRangeHeaderForServerless(rangeHeader) {
  if (!process.env.VERCEL) {
    return rangeHeader || null;
  }
  if (!rangeHeader) {
    return `bytes=0-${VERCEL_MAX_VIDEO_CHUNK - 1}`;
  }
  const match = String(rangeHeader).match(/^bytes=(\d+)-(\d*)$/i);
  if (!match) return rangeHeader;
  const start = parseInt(match[1], 10);
  const requestedEnd = match[2] ? parseInt(match[2], 10) : null;
  const maxEnd = start + VERCEL_MAX_VIDEO_CHUNK - 1;
  const finalEnd = requestedEnd !== null ? Math.min(requestedEnd, maxEnd) : maxEnd;
  return `bytes=${start}-${finalEnd}`;
}

function streamDriveVideo(fileId, req, res) {
  return new Promise((resolve) => {
    let clientClosed = false;
    let activeUpstreamReq = null;
    let activeUpstreamRes = null;
    const finish = () => resolve();

    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true;
        if (activeUpstreamReq) activeUpstreamReq.destroy();
        if (activeUpstreamRes) activeUpstreamRes.destroy();
        finish();
      }
    });

    const cookieJar = new Map();
    const updateCookies = (setCookieHeaders) => {
      if (!Array.isArray(setCookieHeaders)) return;
      for (const rawCookie of setCookieHeaders) {
        const pair = String(rawCookie).split(';')[0];
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          cookieJar.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
        }
      }
    };

    const upstreamRange = clampRangeHeaderForServerless(req.headers.range);

    const fetchUpstream = (targetUrl, hops = 0) => {
      if (clientClosed || res.headersSent) return finish();
      if (hops > 6) {
        sendJson(res, 502, { error: 'Too many redirects from Google Drive' });
        return finish();
      }

      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase();
      const isGoogleHost = host === 'google.com' || host.endsWith('.google.com') || host.endsWith('.googleusercontent.com');
      if (parsed.protocol !== 'https:' || !isGoogleHost) {
        sendJson(res, 502, { error: 'Unexpected upstream host' });
        return finish();
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (upstreamRange) {
        headers['Range'] = upstreamRange;
      }
      if (cookieJar.size > 0) {
        headers['Cookie'] = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
      }

      const upstreamReq = https.get(parsed, { headers }, (upstreamRes) => {
        activeUpstreamRes = upstreamRes;
        updateCookies(upstreamRes.headers['set-cookie']);

        const status = upstreamRes.statusCode || 502;
        if ([301, 302, 303, 307, 308].includes(status) && upstreamRes.headers.location) {
          upstreamRes.resume();
          let nextUrl;
          try {
            nextUrl = new URL(upstreamRes.headers.location, parsed).toString();
          } catch {
            if (!res.headersSent) sendJson(res, 502, { error: 'Invalid redirect URL' });
            return finish();
          }
          fetchUpstream(nextUrl, hops + 1);
          return;
        }

        const contentType = String(upstreamRes.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('text/html')) {
          let size = 0;
          const chunks = [];
          upstreamRes.on('data', chunk => {
            size += chunk.length;
            if (size <= 256 * 1024) chunks.push(chunk);
          });
          upstreamRes.on('end', () => {
            if (clientClosed || res.headersSent) return finish();
            const html = Buffer.concat(chunks).toString('utf8');
            const confirmUrl = extractDriveConfirmUrl(html, parsed.toString());
            if (confirmUrl) {
              fetchUpstream(confirmUrl, hops + 1);
            } else {
              sendJson(res, status >= 400 ? status : 403, { error: 'Google Drive video is private or unavailable for direct streaming' });
              finish();
            }
          });
          return;
        }

        const outHeaders = {
          'Content-Type': resolveVideoMimeType(upstreamRes.headers['content-type']),
          'Content-Disposition': 'inline',
          'Accept-Ranges': upstreamRes.headers['accept-ranges'] || 'bytes',
          'Cache-Control': 'public, max-age=3600'
        };
        if (upstreamRes.headers['content-length']) {
          outHeaders['Content-Length'] = upstreamRes.headers['content-length'];
        }
        if (upstreamRes.headers['content-range']) {
          outHeaders['Content-Range'] = upstreamRes.headers['content-range'];
        }

        res.writeHead(status, outHeaders);
        if (req.method.toUpperCase() === 'HEAD') {
          upstreamRes.destroy();
          res.end();
          return finish();
        }

        upstreamRes.on('end', finish);
        upstreamRes.on('error', () => {
          if (!res.writableEnded) res.end();
          finish();
        });
        upstreamRes.pipe(res);
      });

      activeUpstreamReq = upstreamReq;
      upstreamReq.setTimeout(15000, () => {
        upstreamReq.destroy(new Error('Upstream timeout'));
      });
      upstreamReq.on('error', () => {
        if (!clientClosed && !res.headersSent) {
          sendJson(res, 502, { error: 'Failed to stream Google Drive video' });
        } else if (!res.writableEnded) {
          res.end();
        }
        finish();
      });
    };

    fetchUpstream(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`);
  });
}

async function handleApiRequest(req, res, apiPathOverride) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const urlPath = decodeURI(apiPathOverride || reqUrl.pathname);
  const method = req.method.toUpperCase();
  const mode = getStorageMode();

  try {
    // GET /api/site-data
    if (urlPath === '/api/site-data' && method === 'GET') {
      const data = await readSiteData();
      if (!(await isAuthenticated(req))) {
        const publicData = { ...data };
        delete publicData.inquiries;
        return sendJson(res, 200, publicData);
      }
      return sendJson(res, 200, data);
    }

    // GET /api/auth/verify
    if (urlPath === '/api/auth/verify' && method === 'GET') {
      if (mode === 'vercel-unconfigured') {
        return sendJson(res, 200, {
          authenticated: false,
          dbConfigured: false,
          mode
        });
      }
      const authenticated = await isAuthenticated(req);
      return sendJson(res, 200, {
        authenticated,
        dbConfigured: true,
        mode
      });
    }

    // GET /api/image?id=<ID> (serves uploaded images stored in Turso)
    if (urlPath === '/api/image' && (method === 'GET' || method === 'HEAD')) {
      const imageId = (reqUrl.searchParams.get('id') || '').trim();
      if (!/^[a-zA-Z0-9._-]{3,120}$/.test(imageId) || imageId.includes('..')) {
        return sendJson(res, 400, { error: 'Invalid image ID' });
      }
      if (mode === 'turso') {
        const db = await getTursoDb();
        const result = await db.execute({
          sql: `SELECT mime_type, data_base64 FROM uploaded_images WHERE id = ? LIMIT 1`,
          args: [imageId]
        });
        if (result.rows.length === 0) {
          return sendJson(res, 404, { error: 'Image not found' });
        }
        const buf = Buffer.from(String(result.rows[0].data_base64), 'base64');
        res.writeHead(200, {
          'Content-Type': String(result.rows[0].mime_type),
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
        return res.end(method === 'HEAD' ? undefined : buf);
      }
      const localPath = path.join(UPLOADS_DIR, imageId);
      if (!localPath.startsWith(UPLOADS_DIR) || !fs.existsSync(localPath)) {
        return sendJson(res, 404, { error: 'Image not found' });
      }
      const ext = path.extname(imageId).toLowerCase();
      const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
      const buf = fs.readFileSync(localPath);
      res.writeHead(200, {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
      return res.end(method === 'HEAD' ? undefined : buf);
    }

    // GET|HEAD /api/drive-video?id=<FILE_ID>
    if (urlPath === '/api/drive-video' && (method === 'GET' || method === 'HEAD')) {
      const fileId = (reqUrl.searchParams.get('id') || '').trim();
      if (!/^[a-zA-Z0-9_-]{5,120}$/.test(fileId)) {
        return sendJson(res, 400, { error: 'Invalid Google Drive file ID' });
      }
      return await streamDriveVideo(fileId, req, res);
    }

    // All persistence/auth endpoints require Turso when running on Vercel
    if (mode === 'vercel-unconfigured') {
      return sendJson(res, 503, {
        error: 'Turso database not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel Environment Variables.'
      });
    }

    // POST /api/login
    if (urlPath === '/api/login' && method === 'POST') {
      const body = await parseBody(req, 1024 * 16);
      const stored = await readAdminAuth();
      if (!verifyPassword(String(body.password || ''), stored)) {
        return sendJson(res, 401, { error: 'Incorrect password' });
      }
      const token = await createSession();
      return sendJson(res, 200, { token, expiresIn: SESSION_TTL_MS });
    }

    // POST /api/logout
    if (urlPath === '/api/logout' && method === 'POST') {
      await revokeSession(req);
      return sendJson(res, 200, { ok: true });
    }

    // POST /api/inquiries (public consultation form submission)
    if (urlPath === '/api/inquiries' && method === 'POST') {
      const body = await parseBody(req, 1024 * 64);
      const name = String(body.name || '').trim().slice(0, 120);
      const contact = String(body.contact || '').trim().slice(0, 120);
      const service = String(body.service || '').trim().slice(0, 120);
      const message = String(body.message || '').trim().slice(0, 2000);
      if (!name || !contact || !message) {
        return sendJson(res, 400, { error: 'Name, contact, and message are required' });
      }
      const data = await readSiteData();
      data.inquiries = data.inquiries || [];
      data.inquiries.unshift({
        id: Date.now(),
        name,
        contact,
        service: service || 'General Consultation',
        message,
        date: new Date().toISOString(),
        status: 'New'
      });
      await writeSiteData(data);
      return sendJson(res, 201, { ok: true });
    }

    // Protected admin endpoints below
    if (!(await isAuthenticated(req))) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    // POST /api/site-data
    if (urlPath === '/api/site-data' && method === 'POST') {
      const body = await parseBody(req, 2 * 1024 * 1024);
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { error: 'Invalid site data payload' });
      }
      const existing = await readSiteData();
      const updated = {
        profile: body.profile || existing.profile,
        stats: Array.isArray(body.stats) ? body.stats : existing.stats,
        portfolio: Array.isArray(body.portfolio) ? body.portfolio : existing.portfolio,
        testimonials: Array.isArray(body.testimonials) ? body.testimonials : existing.testimonials,
        faqs: Array.isArray(body.faqs) ? body.faqs : existing.faqs,
        inquiries: Array.isArray(body.inquiries) ? body.inquiries : existing.inquiries
      };
      await writeSiteData(updated);
      return sendJson(res, 200, { ok: true, data: updated });
    }

    // POST /api/change-password
    if (urlPath === '/api/change-password' && method === 'POST') {
      const body = await parseBody(req, 1024 * 16);
      const stored = await readAdminAuth();
      if (!verifyPassword(String(body.currentPassword || ''), stored)) {
        return sendJson(res, 400, { error: 'Current password is incorrect' });
      }
      const nextPass = String(body.newPassword || '');
      if (nextPass.length < 6) {
        return sendJson(res, 400, { error: 'New password must be at least 6 characters' });
      }
      const nextHash = hashPassword(nextPass);
      await writeAdminAuth(nextHash);
      await revokeAllSessions();
      const freshToken = await createSession();
      return sendJson(res, 200, { ok: true, token: freshToken });
    }

    // POST /api/upload-image
    if (urlPath === '/api/upload-image' && method === 'POST') {
      const body = await parseBody(req, 8 * 1024 * 1024);
      const dataUrl = String(body.dataUrl || '');
      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|svg\+xml|gif));base64,(.+)$/i);
      if (!match) {
        return sendJson(res, 400, { error: 'Invalid image format. Supported: PNG, JPG, WEBP, GIF, SVG' });
      }
      const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
      const extMap = { jpeg: 'jpg', 'svg+xml': 'svg' };
      const ext = extMap[match[2].toLowerCase()] || match[2].toLowerCase();
      const baseName = path.basename(String(body.filename || 'image'), path.extname(String(body.filename || '')))
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40) || 'upload';
      const outName = `${baseName}-${Date.now()}.${ext}`;

      if (mode === 'turso') {
        const db = await getTursoDb();
        await db.execute({
          sql: `INSERT INTO uploaded_images (id, mime_type, data_base64, created_at) VALUES (?, ?, ?, ?)`,
          args: [outName, mimeType, match[3], new Date().toISOString()]
        });
        return sendJson(res, 200, { ok: true, url: `/api/image?id=${encodeURIComponent(outName)}` });
      }

      ensureLocalDirs();
      const outPath = path.join(UPLOADS_DIR, outName);
      fs.writeFileSync(outPath, Buffer.from(match[3], 'base64'));
      return sendJson(res, 200, { ok: true, url: `assets/images/uploads/${outName}` });
    }

    return sendJson(res, 404, { error: 'API endpoint not found' });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    return sendJson(res, status, { error: err.message || 'Server error' });
  }
}

module.exports = {
  BASE_DIR,
  SITE_DATA_FILE,
  AUTH_FILE,
  UPLOADS_DIR,
  getStorageMode,
  handleApiRequest,
  readSiteData,
  writeSiteData,
  ensureLocalDirs
};
