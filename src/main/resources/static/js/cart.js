/**
 * CarePulse — Cart Module
 * Cart state is persisted in localStorage under key 'carepulse_cart'.
 * Dispatches 'cartUpdated' CustomEvent on every change.
 */

const CART_KEY = 'carepulse_cart';
const DELIVERY_FEE = 250;
const FREE_DELIVERY_THRESHOLD = 2000;

/* ── Internal Helpers ───────────────────────────────────────── */

/**
 * Read cart from localStorage
 * @returns {Array} Array of cart items
 */
function _readCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Write cart to localStorage and dispatch update event
 * @param {Array} cart
 */
function _writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart, count: getCount() } }));
}

/* ── Public API ─────────────────────────────────────────────── */

/**
 * Get the current cart
 * @returns {Array} Array of cart item objects
 */
function getCart() {
    return _readCart();
}

/**
 * Get total item count in cart
 * @returns {number}
 */
function getCount() {
    return _readCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get cart subtotal (before delivery)
 * @returns {number}
 */
function getSubtotal() {
    return _readCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Get delivery fee based on order total
 * @returns {number}
 */
function getDeliveryFee() {
    return getSubtotal() >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

/**
 * Get grand total (subtotal + delivery)
 * @returns {number}
 */
function getTotal() {
    return getSubtotal() + getDeliveryFee();
}

/**
 * Check if any cart item requires a prescription
 * @returns {boolean}
 */
function hasRxItems() {
    return _readCart().some(item => item.prescriptionRequired);
}

/**
 * Add a product to the cart
 * @param {Object} product - Full product object
 * @param {number} qty - Quantity to add (default 1)
 */
function addToCart(product, qty = 1) {
    const cart = _readCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        const newQty = existing.quantity + qty;
        existing.quantity = Math.min(newQty, product.stock || 99);
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            stock: product.stock,
            prescriptionRequired: product.prescriptionRequired,
            category: product.category,
            quantity: Math.min(qty, product.stock || 99),
        });
    }

    _writeCart(cart);
}

/**
 * Remove a product from the cart by product ID
 * @param {number} productId
 */
function removeFromCart(productId) {
    const cart = _readCart().filter(item => item.id !== Number(productId));
    _writeCart(cart);
}

/**
 * Update the quantity of a cart item
 * @param {number} productId
 * @param {number} qty
 */
function updateQty(productId, qty) {
    const cart = _readCart();
    const item = cart.find(i => i.id === Number(productId));
    if (!item) return;

    const newQty = Math.max(1, Math.min(Number(qty), item.stock || 99));
    item.quantity = newQty;
    _writeCart(cart);
}

/**
 * Clear the entire cart
 */
function clearCart() {
    _writeCart([]);
}

/* ── Navbar Badge ───────────────────────────────────────────── */

/**
 * Update the cart badge count in the navbar
 */
function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = getCount();
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });
}

/* ── Init ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // Set initial badge
    updateCartBadge();

    // Listen to cart updates
    window.addEventListener('cartUpdated', updateCartBadge);
});