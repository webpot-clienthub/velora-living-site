// Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
  if (window.AUTH && AUTH.requireAuth) {
    await AUTH.requireAuth();
  }

  initializeTheme();
  setupEventListeners();
});

function initializeTheme() {
  const savedTheme = localStorage.getItem('themeMode');
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  updateThemeToggle(isDark);
}

function setupEventListeners() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
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

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('themeMode', isDark ? 'dark' : 'light');
  updateThemeToggle(isDark);
}

function updateThemeToggle(isDark) {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  themeToggle.textContent = isDark ? 'Sun' : 'Moon';
}
