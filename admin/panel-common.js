// Shared helpers for dedicated admin tool pages.
(function initAdminPanelCommon() {
  const API_BASE_CANDIDATES = ['../api', '/admin/api', './api'];
  let activeApiBase = null;

  function buildApiUrl(base, path) {
    const safeBase = String(base || '').replace(/\/+$/g, '');
    const safePath = String(path || '').replace(/^\/+/g, '');
    return `${safeBase}/${safePath}`;
  }

  async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response from ${response.url}`);
    }
  }

  async function fetchJson(path, options = {}) {
    const bases = activeApiBase
      ? [activeApiBase, ...API_BASE_CANDIDATES.filter((b) => b !== activeApiBase)]
      : [...API_BASE_CANDIDATES];

    let lastError = null;

    for (const base of bases) {
      const url = buildApiUrl(base, path);
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          credentials: 'same-origin',
          ...options
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          const detail = data && data.error ? `: ${data.error}` : '';
          throw new Error(`Request failed (${response.status})${detail}`);
        }
        activeApiBase = base;
        return data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Failed API request for ${path}`);
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem('themeMode');
    const isDark = savedTheme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    updateThemeToggle(isDark);
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('themeMode', isDark ? 'dark' : 'light');
    updateThemeToggle(isDark);
  }

  function updateThemeToggle(isDark) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.textContent = isDark ? 'Sun' : 'Moon';
  }

  function setupCommonEvents() {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (window.AUTH && AUTH.logout) {
          await AUTH.logout();
        }
        window.location.href = '/admin/login.html';
      });
    }
  }

  window.AdminPanelCommon = {
    fetchJson,
    readJsonResponse,
    initializeTheme,
    setupCommonEvents
  };
})();
