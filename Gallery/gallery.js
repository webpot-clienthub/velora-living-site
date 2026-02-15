(() => {
  const categoryId = document.body?.dataset?.category || '';
  const fallbackName = document.body?.dataset?.categoryName || '';

  const titleEl = document.getElementById('gallery-title');
  const subtitleEl = document.getElementById('gallery-subtitle');
  const gridEl = document.getElementById('gallery-grid');

  const setEmpty = (message) => {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'gallery-empty';
    box.textContent = message;
    gridEl.appendChild(box);
  };

  const resolveAsset = (p) => {
    const s = String(p || '').trim();
    if (!s) return '';
    if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s;
    if (s.startsWith('/')) return s;
    return `../${s.replace(/^\.?\//, '')}`;
  };

  const loadProducts = async () => {
    const sources = [
      '../admin/api/products.php',
      '../admin/data/products.json'
    ];

    for (const url of sources) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data || typeof data !== 'object') continue;
        return data;
      } catch (_) { }
    }

    return null;
  };

  const normalizeCategoryKey = (value) => String(value || '').replace(/^\d+-/, '');

  const resolveCategory = (products, requestedKey) => {
    if (!products || typeof products !== 'object') return null;
    if (products[requestedKey]) return products[requestedKey];

    const normalizedRequested = normalizeCategoryKey(requestedKey);
    const matchKey = Object.keys(products).find(
      (key) => normalizeCategoryKey(key) === normalizedRequested
    );

    return matchKey ? products[matchKey] : null;
  };

  const run = async () => {
    if (!gridEl) return;

    if (!categoryId) {
      setEmpty('Missing gallery category.');
      return;
    }

    setEmpty('Loading…');

    const products = await loadProducts();
    const category = resolveCategory(products, categoryId);

    const name = (category && category.name) ? category.name : (fallbackName || categoryId);
    if (titleEl) titleEl.textContent = name;

    const images = category && Array.isArray(category.images) ? category.images : [];

    if (!images.length) {
      if (subtitleEl) subtitleEl.textContent = 'No photos found for this collection yet.';
      setEmpty('No photos found in this collection.');
      return;
    }

    if (subtitleEl) subtitleEl.textContent = `${images.length} photos in this collection.`;

    gridEl.innerHTML = '';
    images.forEach((imgPath, idx) => {
      const src = resolveAsset(imgPath);
      if (!src) return;

      const a = document.createElement('a');
      a.className = 'gallery-item';
      a.href = src;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', `${name} photo ${idx + 1}`);

      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `${name} photo ${idx + 1}`;

      a.appendChild(img);
      gridEl.appendChild(a);
    });
  };

  document.addEventListener('DOMContentLoaded', run);
})();

