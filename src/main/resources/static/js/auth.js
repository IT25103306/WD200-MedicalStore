/**
 * CarePulse — Auth Module
 * Handles login, register, session, and role-based access control.
 * Session stored in localStorage under key 'carepulse_user'.
 */

const AUTH_KEY = 'carepulse_user';

/* ── Session Helpers ────────────────────────────────────────── */

/**
 * Get the current logged-in user from localStorage
 * @returns {Object|null}
 */
function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Check if a user is currently logged in
 * @returns {boolean}
 */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

/**
 * Check if the current user has ADMIN role
 * @returns {boolean}
 */
function isAdmin() {
    const user = getCurrentUser();
    return user !== null && user.role === 'ADMIN';
}

/**
 * Check if the current user has PHARMACIST role
 * @returns {boolean}
 */
function isPharmacist() {
    const user = getCurrentUser();
    return user !== null && (user.role === 'PHARMACIST' || user.role === 'ADMIN');
}

/**
 * Save user to localStorage (internal)
 * @param {Object} user
 */
function _saveSession(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    // Dispatch event so other parts of the page can react
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user } }));
}

/* ── Auth Actions ───────────────────────────────────────────── */

/**
 * Login with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} user object
 */
async function login(username, password) {
    const user = await apiLogin(username, password);
    _saveSession(user);
    return user;
}

/**
 * Register a new account and auto-login
 * @param {Object} userData - { username, fullName, email, phone, password }
 * @returns {Promise<Object>} user object
 */
async function register(userData) {
    const user = await apiRegister(userData);
    _saveSession(user);
    return user;
}

/**
 * Log out the current user
 */
function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } }));
    window.location.href = 'index.html';
}

/* ── Route Guards ───────────────────────────────────────────── */

/**
 * Require authentication — redirects to login page if not logged in.
 * Call at the top of pages that need login.
 * @returns {Object|null} current user or null (and redirects)
 */
function requireAuth() {
    if (!isLoggedIn()) {
        const redirect = encodeURIComponent(window.location.href);
        window.location.href = `login.html?redirect=${redirect}`;
        return null;
    }
    return getCurrentUser();
}

/**
 * Require ADMIN role — redirects to index if not admin.
 * @returns {Object|null}
 */
function requireAdmin() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== 'ADMIN') {
        window.location.href = 'index.html';
        if (typeof showToast === 'function') {
            showToast('Access denied. Admin privileges required.', 'error');
        }
        return null;
    }
    return user;
}

/* ── Navbar Auth UI ─────────────────────────────────────────── */

/**
 * Render the navbar user area based on auth state.
 * Call this on every page load to keep the navbar in sync.
 */
function renderNavbarAuth() {
    const container = document.getElementById('navbar-auth');
    if (!container) return;

    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `
      <a href="login.html" class="btn btn-primary btn-sm">Login</a>
    `;
        return;
    }

    const initial = (user.fullName || user.username || '?')[0].toUpperCase();
    container.innerHTML = `
    <div class="navbar-user-wrap">
      <button class="user-btn" id="user-menu-btn" aria-haspopup="true" aria-expanded="false">
        <span class="user-avatar" aria-hidden="true">${initial}</span>
        <span>${escapeHtml(user.fullName || user.username)}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown" role="menu">
        ${user.role === 'ADMIN' ? `<a href="admin.html" role="menuitem">📊 Dashboard</a>` : ''}
        <a href="profile.html" role="menuitem">👤 My Profile</a>
        <a href="orders.html" role="menuitem">📦 My Orders</a>
        <a href="prescriptions.html" role="menuitem">💊 Prescriptions</a>
        <div class="dropdown-divider"></div>
        <button onclick="logout()" role="menuitem">🚪 Logout</button>
      </div>
    </div>
  `;

    // Toggle dropdown
    const btn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen);
        });
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
            btn.setAttribute('aria-expanded', false);
        });
    }
}

/* ── Profile Update ─────────────────────────────────────────── */

/**
 * Update the stored user session data (for profile edits)
 * @param {Object} updates - Partial user object to merge
 */
function updateSessionUser(updates) {
    const user = getCurrentUser();
    if (!user) return;
    const updated = { ...user, ...updates };
    _saveSession(updated);
}

/* ── Init on DOM Ready ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    renderNavbarAuth();

    // Re-render navbar on auth change
    window.addEventListener('authChanged', renderNavbarAuth);

    // Mobile hamburger
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', mobileMenu.classList.contains('open'));
        });
    }
});