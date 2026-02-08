const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = __dirname;
const PRODUCTS_PATH = path.join(ROOT, 'admin', 'data', 'products.json');
const PRODUCT_ROOT = path.join(ROOT, 'velora_product');

app.use(express.json({ limit: '5mb' }));

const ADMIN_USERNAME = 'Velora_Admin';
const ADMIN_PASSWORD = 'Bholu!!2026';
const SESSION_COOKIE = 'velora_admin_session';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

const sessions = new Map(); // sessionId -> { username, createdAt }

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) return;
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a), 'utf8');
  const bBuf = Buffer.from(String(b), 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isValidAdminCredentials(username, password) {
  return safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return { sessionId, ...session };
}

function setSessionCookie(req, res, sessionId) {
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const secure = req.secure || forwardedProto === 'https';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req, res) {
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const secure = req.secure || forwardedProto === 'https';
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function baseUrl(req) {
  const host = req.get('host');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
  return `${proto}://${host}`;
}

// Basic SEO endpoints for crawlers when using the Node server
app.get('/robots.txt', (req, res) => {
  const site = baseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /api/',
      `Sitemap: ${site}/sitemap.xml`
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const site = baseUrl(req);
  const now = new Date().toISOString();
  res.type('application/xml').send(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url>',
      `    <loc>${site}/</loc>`,
      `    <lastmod>${now}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>1.0</priority>',
      '  </url>',
      '</urlset>'
    ].join('\n')
  );
});

// Admin auth endpoints (cookie-based session)
app.get('/admin/api/session', (req, res) => {
  const session = getSession(req);
  if (!session) return res.json({ authenticated: false });
  res.json({ authenticated: true, username: session.username });
});

app.post('/admin/api/login', (req, res) => {
  const username = (req.body && req.body.username) || '';
  const password = (req.body && req.body.password) || '';

  if (!isValidAdminCredentials(username, password)) {
    return res.status(401).json({ success: false, error: 'invalid_credentials' });
  }

  const sessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionId, { username: ADMIN_USERNAME, createdAt: Date.now() });
  setSessionCookie(req, res, sessionId);
  res.json({ success: true, username: ADMIN_USERNAME });
});

app.post('/admin/api/logout', (req, res) => {
  const session = getSession(req);
  if (session && session.sessionId) sessions.delete(session.sessionId);
  clearSessionCookie(req, res);
  res.json({ success: true });
});

function requireAdminAuth(req, res, next) {
  const session = getSession(req);
  if (session) {
    req.adminUser = session.username;
    return next();
  }

  const original = req.originalUrl || '';
  const wantsJson =
    original.startsWith('/api/') ||
    original.startsWith('/admin/api/') ||
    (req.get('accept') || '').includes('application/json');
  if (wantsJson) return res.status(401).json({ error: 'unauthorized' });

  const nextUrl = encodeURIComponent(req.originalUrl || '/admin/index.html');
  res.redirect(`/admin/login.html?next=${nextUrl}`);
}

// Protect admin UI (but keep product data publicly readable for the main site)
app.use('/admin', (req, res, next) => {
  const p = req.path || '/';
  const isPublic =
    p === '/login.html' ||
    p === '/auth.js' ||
    p.startsWith('/data/');

  if (isPublic) return next();
  return requireAdminAuth(req, res, next);
});

// Protect Node APIs used by admin tools (upload/replace/delete/save)
app.use('/api', requireAdminAuth);

app.use(express.static(ROOT));

function readProducts() {
  const raw = fs.readFileSync(PRODUCTS_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeProducts(data) {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2));
}

function ensureCategoryDir(categoryKey, products) {
  const name = products?.[categoryKey]?.name || categoryKey;
  const dir = path.join(PRODUCT_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toWebPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function safeUnlink(relPath) {
  if (!relPath) return;
  const abs = path.join(ROOT, relPath);
  if (!abs.startsWith(PRODUCT_ROOT)) return;
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const products = readProducts();
      const categoryKey = req.query.category;
      const dir = ensureCategoryDir(categoryKey, products);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = Date.now();
    cb(null, `${stamp}-${safeName}`);
  }
});

const upload = multer({ storage });

app.get('/api/products', (req, res) => {
  try {
    res.json(readProducts());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read products.json' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    writeProducts(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write products.json' });
  }
});

app.post('/api/images/add', upload.array('images'), (req, res) => {
  try {
    const files = req.files || [];
    const paths = files.map((f) => toWebPath(f.path));
    res.json({ paths });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

app.post('/api/images/replace', upload.single('image'), (req, res) => {
  try {
    const prevPath = req.body.prevPath;
    if (prevPath) {
      safeUnlink(prevPath);
    }
    const newPath = req.file ? toWebPath(req.file.path) : null;
    res.json({ path: newPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to replace image' });
  }
});

app.post('/api/images/delete', (req, res) => {
  try {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [];
    paths.forEach((p) => safeUnlink(p));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete images' });
  }
});

function start(port = process.env.PORT || 3000) {
  const server = app.listen(port, () => {
    const actualPort = server.address() && server.address().port ? server.address().port : port;
    console.log(`Velora admin server running at http://localhost:${actualPort}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
