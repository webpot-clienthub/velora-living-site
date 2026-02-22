let idCheckFolders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (window.AUTH && AUTH.requireAuth) {
    await AUTH.requireAuth();
  }

  window.AdminPanelCommon.initializeTheme();
  window.AdminPanelCommon.setupCommonEvents();
  setupEvents();
  await loadIdCheck();
});

function setupEvents() {
  const refreshBtn = document.getElementById('refresh-id-check-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadIdCheck());
  }

  const searchInput = document.getElementById('id-check-search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      renderIdCheck(String(event.target.value || '').trim());
    });
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveImageSrc(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return '';
  return `../../${encodeURI(normalized)}`;
}

function parseImagePathForIdCheck(rawPath) {
  const normalized = String(rawPath || '').replace(/\\/g, '/').replace(/^\.?\//, '');
  if (!normalized) return null;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const fileName = parts[parts.length - 1];
  const folderPath = parts.slice(0, -1).join('/');
  const folderName = parts[parts.length - 2];
  const imageId = fileName.replace(/\.[^.]+$/g, '');

  return {
    folderName,
    folderPath,
    fileName,
    imageId,
    relativePath: normalized
  };
}

function buildIdCheckFoldersFromProducts(products) {
  if (!products || typeof products !== 'object') return [];

  const foldersMap = new Map();

  Object.values(products).forEach((category) => {
    const images = Array.isArray(category && category.images) ? category.images : [];
    images.forEach((imagePath) => {
      const parsed = parseImagePathForIdCheck(imagePath);
      if (!parsed) return;

      if (!foldersMap.has(parsed.folderPath)) {
        foldersMap.set(parsed.folderPath, {
          folderName: parsed.folderName,
          folderPath: parsed.folderPath,
          images: []
        });
      }

      foldersMap.get(parsed.folderPath).images.push({
        fileName: parsed.fileName,
        imageId: parsed.imageId,
        relativePath: parsed.relativePath
      });
    });
  });

  return Array.from(foldersMap.values())
    .map((folder) => ({
      ...folder,
      images: folder.images.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }))
    }))
    .sort((a, b) => a.folderName.localeCompare(b.folderName, undefined, { numeric: true }));
}

async function loadProductsFallback() {
  const sources = [
    async () => window.AdminPanelCommon.fetchJson('products.php'),
    async () => {
      const res = await fetch('../data/products.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`products.json failed (${res.status})`);
      return window.AdminPanelCommon.readJsonResponse(res);
    },
    async () => {
      const res = await fetch('/admin/data/products.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`admin products.json failed (${res.status})`);
      return window.AdminPanelCommon.readJsonResponse(res);
    }
  ];

  let lastError = null;
  for (const source of sources) {
    try {
      const data = await source();
      if (data && typeof data === 'object') {
        return data;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load products fallback data.');
}

function renderIdCheck(filter = '') {
  const listEl = document.getElementById('id-check-list');
  const summaryEl = document.getElementById('id-check-summary');
  if (!listEl || !summaryEl) return;

  const search = String(filter || '').trim().toLowerCase();
  const filteredFolders = [];

  idCheckFolders.forEach((folder) => {
    const folderName = String(folder && folder.folderName ? folder.folderName : '');
    const images = Array.isArray(folder && folder.images) ? folder.images : [];

    const visibleImages = search
      ? images.filter((image) => {
          const imageId = String(image && image.imageId ? image.imageId : '').toLowerCase();
          const fileName = String(image && image.fileName ? image.fileName : '').toLowerCase();
          const path = String(image && image.relativePath ? image.relativePath : '').toLowerCase();
          return imageId.includes(search) || fileName.includes(search) || path.includes(search);
        })
      : images;

    if (visibleImages.length > 0 || (!search && images.length === 0)) {
      filteredFolders.push({
        folderName,
        folderPath: String(folder && folder.folderPath ? folder.folderPath : ''),
        images: visibleImages
      });
    }
  });

  const totalFolders = filteredFolders.length;
  const totalImages = filteredFolders.reduce((sum, folder) => sum + folder.images.length, 0);

  if (totalFolders === 0) {
    listEl.innerHTML = '<p class="empty-state">No matching images found.</p>';
    summaryEl.textContent = '0 folders, 0 images';
    return;
  }

  const html = filteredFolders.map((folder) => {
    const imageRows = folder.images.map((image) => {
      const imageId = escapeHtml(image.imageId || '-');
      const fileName = escapeHtml(image.fileName || '-');
      const relativePath = escapeHtml(image.relativePath || '-');
      const src = resolveImageSrc(image.relativePath);

      return `
        <tr>
          <td>${src ? `<img class="id-thumb" src="${src}" alt="${imageId}" loading="lazy">` : '-'}</td>
          <td>${imageId}</td>
          <td>${fileName}</td>
          <td><code>${relativePath}</code></td>
        </tr>
      `;
    }).join('');

    const rowMarkup = imageRows || `
      <tr>
        <td>-</td>
        <td>-</td>
        <td>No images</td>
        <td>-</td>
      </tr>
    `;

    return `
      <details class="id-folder">
        <summary>
          <span class="folder-name">${escapeHtml(folder.folderName)}</span>
          <span class="folder-count">${folder.images.length} images</span>
        </summary>
        <p class="folder-path"><code>${escapeHtml(folder.folderPath)}</code></p>
        <div class="id-table-wrap">
          <table class="id-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Image ID</th>
                <th>Stored File Name</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>${rowMarkup}</tbody>
          </table>
        </div>
      </details>
    `;
  }).join('');

  listEl.innerHTML = html;
  if (search) {
    summaryEl.textContent = `${totalFolders} folders, ${totalImages} images matching "${filter}"`;
  } else {
    summaryEl.textContent = `${totalFolders} folders, ${totalImages} images indexed`;
  }
}

async function loadIdCheck() {
  const summaryEl = document.getElementById('id-check-summary');
  if (summaryEl) {
    summaryEl.textContent = 'Loading image index...';
  }

  try {
    const data = await window.AdminPanelCommon.fetchJson('id_check.php');
    idCheckFolders = Array.isArray(data && data.folders) ? data.folders : [];
    const searchInput = document.getElementById('id-check-search');
    const currentFilter = searchInput ? String(searchInput.value || '').trim() : '';
    renderIdCheck(currentFilter);
  } catch (error) {
    console.error('Failed API ID Check load, trying fallback:', error);
    try {
      const products = await loadProductsFallback();
      idCheckFolders = buildIdCheckFoldersFromProducts(products);
      const searchInput = document.getElementById('id-check-search');
      const currentFilter = searchInput ? String(searchInput.value || '').trim() : '';
      renderIdCheck(currentFilter);
      if (summaryEl && !currentFilter) {
        summaryEl.textContent = `${idCheckFolders.length} folders indexed (fallback mode)`;
      }
    } catch (fallbackError) {
      console.error('Failed fallback ID Check load:', fallbackError);
      const listEl = document.getElementById('id-check-list');
      if (listEl) {
        listEl.innerHTML = '<p class="empty-state">Failed to load image index.</p>';
      }
      if (summaryEl) {
        summaryEl.textContent = 'Could not load image index';
      }
    }
  }
}
