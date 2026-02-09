// Authentication module for Velora Admin Panel
// PHP session-based auth (Hostinger / Apache)

const AUTH = {
  async session() {
    try {
      const res = await fetch('/admin/api/auth_session.php', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return { authenticated: false };
      const data = await res.json();
      if (data && data.authenticated && data.username) {
        sessionStorage.setItem('adminUser', data.username);
      }
      return data || { authenticated: false };
    } catch (_) {
      return { authenticated: false };
    }
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const s = await this.session();
    return !!s.authenticated;
  },

  // Login function (hard-coded credentials on the server)
  async login(username, password) {
    try {
      const res = await fetch('/admin/api/auth_login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: 'invalid_credentials' };

      if (data && data.username) {
        sessionStorage.setItem('adminUser', data.username);
      }
      return { success: true };
    } catch (_) {
      return { success: false, error: 'network' };
    }
  },

  // Logout function
  async logout() {
    try {
      await fetch('/admin/api/auth_logout.php', { method: 'POST', credentials: 'same-origin' });
    } catch (_) {}
    sessionStorage.removeItem('adminUser');
  },

  // Get logged-in username
  getUsername() {
    return sessionStorage.getItem('adminUser') || null;
  },

  async requireAuth() {
    const s = await this.session();
    if (s && s.authenticated) return s;
    const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/admin/login.html?next=${next}`;
    return { authenticated: false };
  }
};
