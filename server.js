const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const SITE_DATA_FILE = path.join(DATA_DIR, 'site_data.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin_auth.json');
const UPLOADS_DIR = path.join(BASE_DIR, 'assets', 'images', 'uploads');

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Active in-memory admin sessions (token -> expiry timestamp)
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

// Initialize default admin credentials if not present
function ensureAuthFile() {
  if (!fs.existsSync(AUTH_FILE)) {
    const initial = hashPassword('ibrahim@2026');
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2));
  }
}
ensureAuthFile();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ico': 'image/x-icon'
};

function decodeHtmlEntities(str) {
  return String(str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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

function streamDriveVideo(fileId, req, res) {
  let clientClosed = false;
  let activeUpstreamReq = null;
  let activeUpstreamRes = null;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientClosed = true;
      if (activeUpstreamReq) activeUpstreamReq.destroy();
      if (activeUpstreamRes) activeUpstreamRes.destroy();
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

  const fetchUpstream = (targetUrl, hops = 0) => {
    if (clientClosed || res.headersSent) return;
    if (hops > 6) {
      sendJson(res, 502, { error: 'Too many redirects from Google Drive' });
      return;
    }

    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost = host === 'google.com' || host.endsWith('.google.com') || host.endsWith('.googleusercontent.com');
    if (parsed.protocol !== 'https:' || !isGoogleHost) {
      sendJson(res, 502, { error: 'Unexpected upstream host' });
      return;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
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
          return;
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
          if (clientClosed || res.headersSent) return;
          const html = Buffer.concat(chunks).toString('utf8');
          const confirmUrl = extractDriveConfirmUrl(html, parsed.toString());
          if (confirmUrl) {
            fetchUpstream(confirmUrl, hops + 1);
          } else {
            sendJson(res, status >= 400 ? status : 403, { error: 'Google Drive video is private or unavailable for direct streaming' });
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
        return;
      }

      upstreamRes.on('error', () => {
        if (!res.writableEnded) res.end();
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
    });
  };

  fetchUpstream(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req, limitBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function isAuthenticated(req) {
  const token = getAuthToken(req);
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function readSiteData() {
  try {
    const raw = fs.readFileSync(SITE_DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { profile: {}, stats: [], portfolio: [], testimonials: [], faqs: [], inquiries: [] };
  }
}

function writeSiteData(data) {
  fs.writeFileSync(SITE_DATA_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURI(req.url.split('?')[0]);
  const method = req.method.toUpperCase();

  // API Routes
  if (urlPath.startsWith('/api/')) {
    try {
      // GET /api/site-data
      if (urlPath === '/api/site-data' && method === 'GET') {
        const data = readSiteData();
        if (!isAuthenticated(req)) {
          // Strip private inquiries from unauthenticated public requests
          const publicData = { ...data };
          delete publicData.inquiries;
          return sendJson(res, 200, publicData);
        }
        return sendJson(res, 200, data);
      }

      // POST /api/login
      if (urlPath === '/api/login' && method === 'POST') {
        const body = await parseBody(req, 1024 * 16);
        const stored = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        if (!verifyPassword(String(body.password || ''), stored)) {
          return sendJson(res, 401, { error: 'Incorrect password' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + SESSION_TTL_MS);
        return sendJson(res, 200, { token, expiresIn: SESSION_TTL_MS });
      }

      // GET /api/auth/verify
      if (urlPath === '/api/auth/verify' && method === 'GET') {
        return sendJson(res, 200, { authenticated: isAuthenticated(req) });
      }

      // POST /api/logout
      if (urlPath === '/api/logout' && method === 'POST') {
        const token = getAuthToken(req);
        if (token) sessions.delete(token);
        return sendJson(res, 200, { ok: true });
      }

      // POST /api/inquiries (public form submission)
      if (urlPath === '/api/inquiries' && method === 'POST') {
        const body = await parseBody(req, 1024 * 64);
        const name = String(body.name || '').trim().slice(0, 120);
        const contact = String(body.contact || '').trim().slice(0, 120);
        const service = String(body.service || '').trim().slice(0, 120);
        const message = String(body.message || '').trim().slice(0, 2000);
        if (!name || !contact || !message) {
          return sendJson(res, 400, { error: 'Name, contact, and message are required' });
        }
        const data = readSiteData();
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
        writeSiteData(data);
        return sendJson(res, 201, { ok: true });
      }

      // GET|HEAD /api/drive-video?id=<FILE_ID> (public video stream proxy for inline playback)
      if (urlPath === '/api/drive-video' && (method === 'GET' || method === 'HEAD')) {
        const reqUrl = new URL(req.url, 'http://localhost');
        const fileId = (reqUrl.searchParams.get('id') || '').trim();
        if (!/^[a-zA-Z0-9_-]{5,120}$/.test(fileId)) {
          return sendJson(res, 400, { error: 'Invalid Google Drive file ID' });
        }
        return streamDriveVideo(fileId, req, res);
      }

      // Protected endpoints below require auth
      if (!isAuthenticated(req)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }

      // POST /api/site-data
      if (urlPath === '/api/site-data' && method === 'POST') {
        const body = await parseBody(req, 2 * 1024 * 1024);
        if (!body || typeof body !== 'object') {
          return sendJson(res, 400, { error: 'Invalid site data payload' });
        }
        const existing = readSiteData();
        const updated = {
          profile: body.profile || existing.profile,
          stats: Array.isArray(body.stats) ? body.stats : existing.stats,
          portfolio: Array.isArray(body.portfolio) ? body.portfolio : existing.portfolio,
          testimonials: Array.isArray(body.testimonials) ? body.testimonials : existing.testimonials,
          faqs: Array.isArray(body.faqs) ? body.faqs : existing.faqs,
          inquiries: Array.isArray(body.inquiries) ? body.inquiries : existing.inquiries
        };
        writeSiteData(updated);
        return sendJson(res, 200, { ok: true, data: updated });
      }

      // POST /api/change-password
      if (urlPath === '/api/change-password' && method === 'POST') {
        const body = await parseBody(req, 1024 * 16);
        const stored = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        if (!verifyPassword(String(body.currentPassword || ''), stored)) {
          return sendJson(res, 400, { error: 'Current password is incorrect' });
        }
        const nextPass = String(body.newPassword || '');
        if (nextPass.length < 6) {
          return sendJson(res, 400, { error: 'New password must be at least 6 characters' });
        }
        const nextHash = hashPassword(nextPass);
        fs.writeFileSync(AUTH_FILE, JSON.stringify(nextHash, null, 2));
        return sendJson(res, 200, { ok: true });
      }

      // POST /api/upload-image
      if (urlPath === '/api/upload-image' && method === 'POST') {
        const body = await parseBody(req, 8 * 1024 * 1024);
        const dataUrl = String(body.dataUrl || '');
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,(.+)$/i);
        if (!match) {
          return sendJson(res, 400, { error: 'Invalid image format. Supported: PNG, JPG, WEBP, GIF, SVG' });
        }
        const extMap = { 'jpeg': 'jpg', 'svg+xml': 'svg' };
        const ext = extMap[match[1].toLowerCase()] || match[1].toLowerCase();
        const baseName = path.basename(String(body.filename || 'image'), path.extname(String(body.filename || '')))
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 40) || 'upload';
        const outName = `${baseName}-${Date.now()}.${ext}`;
        const outPath = path.join(UPLOADS_DIR, outName);
        fs.writeFileSync(outPath, Buffer.from(match[2], 'base64'));
        return sendJson(res, 200, { ok: true, url: `assets/images/uploads/${outName}` });
      }

      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message || 'Server error' });
    }
  }

  // Static File Serving
  let reqPath = urlPath;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Block sensitive internal files from public HTTP access
  const normalizedLower = reqPath.toLowerCase();
  if (
    normalizedLower === '/data/admin_auth.json' ||
    normalizedLower === '/server.js' ||
    normalizedLower.endsWith('.bat')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const filePath = path.resolve(BASE_DIR, '.' + reqPath);

  // Prevent path traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const total = stats.size;
    const range = req.headers.range;

    if (range && total > 0) {
      const match = String(range).match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
          res.writeHead(416, { 'Content-Range': `bytes */${total}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
