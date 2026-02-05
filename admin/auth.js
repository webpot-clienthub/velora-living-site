// Authentication module for Velora Admin Panel
// Open login: accepts any username/password and grants a session

const AUTH = {
  // Initialize - check if user is logged in
  init() {
    // No-op: admin routes are always accessible
  },

  // Check if user is authenticated
  isAuthenticated() {
    return true;
  },

  // Login function that accepts any username/password
  async login(username, password) {
    // Set authentication token in sessionStorage
    sessionStorage.setItem('adminToken', 'authenticated_session');
    sessionStorage.setItem('adminUser', username);
    return { success: true };
  },

  // Logout function
  logout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
  },

  // Get logged-in username
  getUsername() {
    return sessionStorage.getItem('adminUser') || null;
  }
};
