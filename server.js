const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = __dirname;
const PRODUCTS_PATH = path.join(ROOT, 'admin', 'data', 'products.json');
const PRODUCT_ROOT = path.join(ROOT, 'velora_product');

app.use(express.json({ limit: '5mb' }));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Velora admin server running at http://localhost:${PORT}`);
});
