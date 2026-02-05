// Admin Panel Logic

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  setupEventListeners();
});

// Initialize theme from localStorage
function initializeTheme() {
  const savedTheme = localStorage.getItem('themeMode');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeToggle('☀️');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

}

// Toggle theme between light and dark
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('themeMode', isDark ? 'dark' : 'light');
  updateThemeToggle(isDark ? '☀️' : '🌙');
}

// Update theme toggle button text
function updateThemeToggle(icon) {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = icon;
  }
}
