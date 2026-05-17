/**
 * CarePulse — Utility Module
 * Toast notifications, formatters, validators, and shared helpers
 */

/* ── Toast Notification System ──────────────────────────────── */

let toastContainer = null;
let toastQueue = [];
const MAX_TOASTS = 3;

/**
 * Initialises the toast container in the DOM (called once on load)
 */
function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('aria-live', 'polite');
        toastContainer.setAttribute('aria-atomic', 'false');
        document.body.appendChild(toastContainer);
    }
}

/**
 * Show a toast notification
 * @param {string} message - Message text
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Auto-dismiss time in ms (default 3500)
 */
function showToast(message, type = 'info', duration = 3500) {
    initToastContainer();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    // Limit visible toasts
    const visibleToasts = toastContainer.querySelectorAll('.toast:not(.removing)');
    if (visibleToasts.length >= MAX_TOASTS) {
        removeToast(visibleToasts[0]);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close notification" onclick="this.closest('.toast') && removeToast(this.closest('.toast'))">×</button>
  `;

    toastContainer.appendChild(toast);

    const timer = setTimeout(() => removeToast(toast), duration);
    toast._timer = timer;
}

/**
 * Remove a toast element with animation
 * @param {HTMLElement} toast
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

/* ── Currency Formatter ─────────────────────────────────────── */

/**
 * Format a number as Sri Lankan Rupees
 * @param {number} amount
 * @returns {string} e.g. "Rs. 1,250"
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    return 'Rs. ' + amount.toLocaleString('en-LK');
}

/* ── Date Formatters ────────────────────────────────────────── */

/**
 * Format ISO date string to readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g. "15 Jan 2025"
 */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format ISO date-time string
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Check if a date is expired (past today)
 * @param {string} dateStr
 * @returns {boolean}
 */
function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

/* ── HTML Sanitiser ─────────────────────────────────────────── */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str || '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ── Star Rating Renderer ───────────────────────────────────── */

/**
 * Generate HTML for star rating display
 * @param {number} rating - Rating value (1–5)
 * @param {boolean} showEmpty - Whether to show empty stars
 * @returns {string} HTML string
 */
function renderStars(rating, showEmpty = true) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    let html = '<span class="stars" aria-hidden="true">';
    for (let i = 0; i < full; i++) html += '<span class="star filled">★</span>';
    if (half) html += '<span class="star half">★</span>';
    if (showEmpty) for (let i = 0; i < empty; i++) html += '<span class="star empty">★</span>';
    html += '</span>';
    return html;
}

/* ── Stock Badge Renderer ───────────────────────────────────── */

/**
 * Render stock status badge HTML
 * @param {number} stock
 * @param {number} reorderLevel
 * @returns {string} HTML
 */
function renderStockBadge(stock, reorderLevel = 10) {
    if (stock === 0) return '<span class="stock-badge stock-out">Out of Stock</span>';
    if (stock <= reorderLevel) return '<span class="stock-badge stock-low">Low Stock</span>';
    return '<span class="stock-badge stock-in">In Stock</span>';
}

/* ── Status Badge Renderer ──────────────────────────────────── */

const ORDER_STATUS_COLORS = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    PROCESSING: 'badge-purple',
    SHIPPED: 'badge-teal',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-error',
};

const PAYMENT_STATUS_COLORS = {
    PENDING: 'badge-warning',
    COMPLETED: 'badge-success',
    FAILED: 'badge-error',
    REFUNDED: 'badge-secondary',
};

const PRESCRIPTION_STATUS_COLORS = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-success',
    REJECTED: 'badge-error',
};

/**
 * Render order status badge
 * @param {string} status
 * @returns {string} HTML
 */
function renderOrderStatusBadge(status) {
    const cls = ORDER_STATUS_COLORS[status] || 'badge-secondary';
    return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/**
 * Render payment status badge
 * @param {string} status
 * @returns {string} HTML
 */
function renderPaymentStatusBadge(status) {
    const cls = PAYMENT_STATUS_COLORS[status] || 'badge-secondary';
    return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/**
 * Render prescription status badge
 * @param {string} status
 * @returns {string} HTML
 */
function renderPrescriptionStatusBadge(status) {
    const cls = PRESCRIPTION_STATUS_COLORS[status] || 'badge-secondary';
    return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/* ── Form Validators ────────────────────────────────────────── */

/**
 * Validate an email address
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a Sri Lankan phone number
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    return /^(?:\+94|0)[0-9]{9}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Validate password strength (min 6 chars)
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 6;
}

/**
 * Show a form field error
 * @param {HTMLInputElement} input
 * @param {string} message
 */
function showFieldError(input, message) {
    input.classList.add('error');
    let errorEl = input.parentElement.querySelector('.form-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        input.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

/**
 * Clear a form field error
 * @param {HTMLInputElement} input
 */
function clearFieldError(input) {
    input.classList.remove('error');
    const errorEl = input.parentElement.querySelector('.form-error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
    }
}

/**
 * Clear all errors in a form
 * @param {HTMLFormElement|HTMLElement} form
 */
function clearFormErrors(form) {
    form.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.form-error.visible').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
}

/* ── URL Query Params ───────────────────────────────────────── */

/**
 * Get a URL query parameter value
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Build a query string from an object
 * @param {Object} params
 * @returns {string}
 */
function buildQueryString(params) {
    return Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}

/* ── DOM Helpers ────────────────────────────────────────────── */

/**
 * Show a spinner overlay
 * @returns {HTMLElement} spinner element
 */
function showSpinner() {
    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
    return overlay;
}

/**
 * Remove spinner overlay
 * @param {HTMLElement} overlay
 */
function hideSpinner(overlay) {
    if (overlay && overlay.parentNode) overlay.remove();
}

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Truncate a string to a max length
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max = 50) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

/**
 * Generate skeleton card HTML for loading states
 * @param {number} count - Number of skeleton cards to generate
 * @returns {string} HTML
 */
function renderSkeletonCards(count = 6) {
    return Array(count).fill('').map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line w-60"></div>
        <div class="skeleton skeleton-line w-80"></div>
        <div class="skeleton skeleton-line w-40"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </div>
  `).join('');
}

/**
 * Set the active nav link based on current page
 */
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
            link.classList.add('active');
        }
    });
}

// Run nav active state on DOM ready
document.addEventListener('DOMContentLoaded', setActiveNavLink);