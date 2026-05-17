/**
 * CarePulse — Main App Module
 * Handles UI rendering logic for all customer-facing pages.
 */

/* ════════════════════════════════════════════════════════════
   SHARED: Product Card Renderer
   ════════════════════════════════════════════════════════════ */

/**
 * Render a single product card HTML
 * @param {Object} product
 * @returns {string} HTML string
 */
function renderProductCard(product) {
    const stockBadge = renderStockBadge(product.stock, product.reorderLevel);
    const stars = renderStars(product.rating);
    const rxBadge = product.prescriptionRequired
        ? '<span class="badge badge-rx">Rx</span>'
        : '';
    const outOfStock = product.stock === 0;

    return `
    <article class="product-card" onclick="window.location='product.html?id=${product.id}'" role="button" tabindex="0"
      aria-label="${escapeHtml(product.name)}, Rs. ${product.price}"
      onkeydown="if(event.key==='Enter')window.location='product.html?id=${product.id}'">
      <div class="product-card-image">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height%22180%22 viewBox=%220%200%20200%20180%22%3E%3Crect width=%22200%22 height=%22180%22 fill=%22%23E3F2FD%22/%3E%3Ctext x=%22100%22 y=%2290%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2236%22%3E💊%3C/text%3E%3C/svg%3E'">
        <div class="product-card-badges">
          ${rxBadge}
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-card-category">${escapeHtml(product.category)}</div>
        <div class="product-card-name">${escapeHtml(product.name)}</div>
        <div class="product-card-manufacturer">${escapeHtml(product.manufacturer)}</div>
        <div class="product-card-rating">
          ${stars}
          <span class="rating-count">(${product.reviewCount})</span>
          ${stockBadge}
        </div>
        <div class="product-card-footer">
          <div class="product-price">Rs. ${product.price.toLocaleString()}</div>
          <button class="btn btn-primary btn-sm"
            onclick="event.stopPropagation(); handleAddToCart(${product.id})"
            ${outOfStock ? 'disabled' : ''}
            aria-label="Add ${escapeHtml(product.name)} to cart">
            ${outOfStock ? 'Out of Stock' : '+ Cart'}
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Handle add-to-cart button click (used across pages)
 * @param {number} productId
 */
async function handleAddToCart(productId) {
    try {
        const product = await getProductById(productId);
        if (!product) return;
        addToCart(product, 1);
        showToast(`${product.name} added to cart`, 'success');
    } catch (err) {
        showToast('Failed to add item to cart', 'error');
    }
}

/* ════════════════════════════════════════════════════════════
   HOMEPAGE (index.html)
   ════════════════════════════════════════════════════════════ */

/**
 * Initialise the homepage: hero search + featured products
 */
async function initHomePage() {
    await loadFeaturedProducts();
    initHeroSearch();
}

/**
 * Load and render featured products
 */
async function loadFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    grid.innerHTML = renderSkeletonCards(6);

    try {
        const products = await getFeaturedProducts();
        grid.innerHTML = products.map(renderProductCard).join('');
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load products</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}

/**
 * Wire up the hero search bar
 */
function initHeroSearch() {
    const form = document.getElementById('hero-search-form');
    const input = document.getElementById('hero-search-input');
    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) {
            window.location.href = `products.html?search=${encodeURIComponent(q)}`;
        } else {
            window.location.href = 'products.html';
        }
    });
}

/* ════════════════════════════════════════════════════════════
   PRODUCTS PAGE (products.html)
   ════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 9;
let _allProducts = [];
let _currentPage = 1;
let _activeFilters = {
    category: 'All',
    search: '',
    prescriptionRequired: false,
    inStockOnly: false,
    priceMax: 5000,
    sort: 'name_az',
};

/**
 * Initialise the products listing page
 */
async function initProductsPage() {
    // Read URL params
    const category = getQueryParam('category');
    const search = getQueryParam('search');
    if (category) _activeFilters.category = category;
    if (search) {
        _activeFilters.search = search;
        const searchInput = document.getElementById('products-search');
        if (searchInput) searchInput.value = search;
    }

    // Wire up filters
    initProductFilters();

    // Load products
    await loadProducts();
}

/**
 * Wire up all filter controls
 */
function initProductFilters() {
    // Search input
    const searchInput = document.getElementById('products-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            _activeFilters.search = e.target.value.trim();
            _currentPage = 1;
            await loadProducts();
        }, 400));
    }

    // Sort select
    const sortSelect = document.getElementById('products-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', async (e) => {
            _activeFilters.sort = e.target.value;
            _currentPage = 1;
            await loadProducts();
        });
    }

    // Category checkboxes
    document.querySelectorAll('.category-filter-checkbox').forEach(cb => {
        cb.addEventListener('change', async () => {
            const checked = Array.from(document.querySelectorAll('.category-filter-checkbox:checked')).map(c => c.value);
            _activeFilters.category = checked.length === 0 ? 'All' : checked[0];
            _currentPage = 1;
            await loadProducts();
        });
    });

    // Rx toggle
    const rxToggle = document.getElementById('filter-rx');
    if (rxToggle) {
        rxToggle.addEventListener('change', async (e) => {
            _activeFilters.prescriptionRequired = e.target.checked;
            _currentPage = 1;
            await loadProducts();
        });
    }

    // In stock toggle
    const stockToggle = document.getElementById('filter-instock');
    if (stockToggle) {
        stockToggle.addEventListener('change', async (e) => {
            _activeFilters.inStockOnly = e.target.checked;
            _currentPage = 1;
            await loadProducts();
        });
    }

    // Price range slider
    const priceSlider = document.getElementById('price-slider');
    const priceLabel = document.getElementById('price-max-label');
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            _activeFilters.priceMax = val;
            if (priceLabel) priceLabel.textContent = `Rs. ${val.toLocaleString()}`;
        });
        priceSlider.addEventListener('change', async () => {
            _currentPage = 1;
            await loadProducts();
        });
    }

    // Clear filters
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            _activeFilters = { category: 'All', search: '', prescriptionRequired: false, inStockOnly: false, priceMax: 5000, sort: 'name_az' };
            document.querySelectorAll('.category-filter-checkbox').forEach(c => c.checked = false);
            if (document.getElementById('filter-rx')) document.getElementById('filter-rx').checked = false;
            if (document.getElementById('filter-instock')) document.getElementById('filter-instock').checked = false;
            if (priceSlider) priceSlider.value = 5000;
            if (priceLabel) priceLabel.textContent = 'Rs. 5,000';
            const si = document.getElementById('products-search');
            if (si) si.value = '';
            _currentPage = 1;
            await loadProducts();
        });
    }

    // Set initial category checkbox from URL param
    if (_activeFilters.category !== 'All') {
        const cb = document.querySelector(`.category-filter-checkbox[value="${_activeFilters.category}"]`);
        if (cb) cb.checked = true;
    }
}

/**
 * Fetch and render products based on current filters
 */
async function loadProducts() {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;

    grid.innerHTML = renderSkeletonCards(6);

    try {
        _allProducts = await getProducts(_activeFilters);
        const total = _allProducts.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);

        if (countEl) countEl.textContent = `${total} product${total !== 1 ? 's' : ''} found`;

        const start = (_currentPage - 1) * PAGE_SIZE;
        const pageProducts = _allProducts.slice(start, start + PAGE_SIZE);

        if (pageProducts.length === 0) {
            grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🔍</div>
          <h3>No medicines found</h3>
          <p>Try adjusting your search or filters.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('clear-filters-btn').click()">Clear Filters</button>
        </div>`;
        } else {
            grid.innerHTML = pageProducts.map(renderProductCard).join('');
        }

        renderPagination(totalPages);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠️</div><h3>Failed to load products</h3></div>`;
        showToast('Failed to load products', 'error');
    }
}

/**
 * Render pagination controls
 * @param {number} totalPages
 */
function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `
    <button class="page-btn" onclick="changePage(${_currentPage - 1})" ${_currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
  `;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === _currentPage ? 'active' : ''}" onclick="changePage(${i})" aria-label="Page ${i}" aria-current="${i === _currentPage ? 'page' : 'false'}">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="changePage(${_currentPage + 1})" ${_currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">›</button>`;

    container.innerHTML = html;
}

/**
 * Change the current page
 * @param {number} page
 */
async function changePage(page) {
    const totalPages = Math.ceil(_allProducts.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    _currentPage = page;
    const grid = document.getElementById('products-grid');
    if (grid) {
        const start = (page - 1) * PAGE_SIZE;
        const pageProducts = _allProducts.slice(start, start + PAGE_SIZE);
        grid.innerHTML = pageProducts.map(renderProductCard).join('');
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
    }
    renderPagination(totalPages);
}

/* ════════════════════════════════════════════════════════════
   PRODUCT DETAIL PAGE (product.html)
   ════════════════════════════════════════════════════════════ */

let _currentProduct = null;
let _selectedRating = 0;
let _qty = 1;

/**
 * Initialise the product detail page
 */
async function initProductPage() {
    const id = getQueryParam('id');
    if (!id) { window.location.href = 'products.html'; return; }

    const spinner = document.getElementById('product-spinner');
    if (spinner) spinner.style.display = 'flex';

    try {
        _currentProduct = await getProductById(id);
        if (!_currentProduct) { window.location.href = 'products.html'; return; }

        renderProductDetail(_currentProduct);
        await loadProductReviews(_currentProduct.id);
    } catch (err) {
        showToast('Failed to load product', 'error');
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

/**
 * Render all product detail UI
 * @param {Object} product
 */
function renderProductDetail(product) {
    // Update page title
    document.title = `${product.name} — CarePulse`;

    // Breadcrumb
    const bc = document.getElementById('product-breadcrumb-name');
    if (bc) bc.textContent = product.name;

    // Image
    const img = document.getElementById('product-detail-img');
    if (img) {
        img.src = product.image;
        img.alt = product.name;
        img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 viewBox=%220%200%20400%20400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%23E3F2FD%22/%3E%3Ctext x=%22200%22 y=%22200%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2280%22%3E💊%3C/text%3E%3C/svg%3E'; };
    }

    // Category
    const cat = document.getElementById('product-category-badge');
    if (cat) cat.textContent = product.category;

    // Rx badge
    const rxBadge = document.getElementById('product-rx-badge');
    if (rxBadge) rxBadge.style.display = product.prescriptionRequired ? 'inline-flex' : 'none';

    // Rx warning
    const rxWarning = document.getElementById('product-rx-warning');
    if (rxWarning) rxWarning.style.display = product.prescriptionRequired ? 'flex' : 'none';

    // Name, manufacturer
    const nameEl = document.getElementById('product-name');
    if (nameEl) nameEl.textContent = product.name;
    const mfgEl = document.getElementById('product-manufacturer');
    if (mfgEl) mfgEl.textContent = product.manufacturer;

    // Price
    const priceEl = document.getElementById('product-price');
    if (priceEl) priceEl.innerHTML = `Rs. ${product.price.toLocaleString()} <span>per pack</span>`;

    // Rating
    const ratingEl = document.getElementById('product-rating');
    if (ratingEl) ratingEl.innerHTML = `${renderStars(product.rating)} <span class="rating-count">(${product.reviewCount} reviews)</span>`;

    // Stock
    const stockEl = document.getElementById('product-stock');
    if (stockEl) stockEl.innerHTML = renderStockBadge(product.stock, product.reorderLevel);

    // Expiry
    const expiryEl = document.getElementById('product-expiry');
    if (expiryEl) expiryEl.textContent = formatDate(product.expiryDate);

    // Qty controls
    _qty = 1;
    const qtyInput = document.getElementById('qty-input');
    if (qtyInput) qtyInput.value = 1;

    // Disable add-to-cart if out of stock
    const addBtn = document.getElementById('add-to-cart-btn');
    const buyBtn = document.getElementById('buy-now-btn');
    if (addBtn) addBtn.disabled = product.stock === 0;
    if (buyBtn) buyBtn.disabled = product.stock === 0;

    // Description
    const descEl = document.getElementById('product-description');
    if (descEl) descEl.textContent = product.description;

    // Upload prescription link
    const rxLink = document.getElementById('upload-rx-link');
    if (rxLink) rxLink.style.display = product.prescriptionRequired ? 'inline-flex' : 'none';
}

/**
 * Load and render product reviews
 * @param {number} productId
 */
async function loadProductReviews(productId) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        const reviews = await getReviewsByProduct(productId);
        renderReviews(reviews);
    } catch {
        if (container) container.innerHTML = '<p>Failed to load reviews.</p>';
    }
}

/**
 * Render the reviews list and summary
 * @param {Array} reviews
 */
function renderReviews(reviews) {
    const summaryEl = document.getElementById('rating-summary');
    const listEl = document.getElementById('reviews-list');

    if (reviews.length === 0) {
        if (listEl) listEl.innerHTML = '<p class="text-secondary">No reviews yet. Be the first to review!</p>';
        if (summaryEl) summaryEl.style.display = 'none';
        return;
    }

    const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

    // Rating distribution
    const dist = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100),
    }));

    if (summaryEl) {
        summaryEl.innerHTML = `
      <div class="rating-avg">
        <div class="big-rating">${avg}</div>
        ${renderStars(parseFloat(avg))}
        <div class="rating-label">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="rating-bars">
        ${dist.map(d => `
          <div class="rating-bar-row">
            <span>${d.star}★</span>
            <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${d.pct}%"></div></div>
            <span>${d.count}</span>
          </div>
        `).join('')}
      </div>
    `;
    }

    if (listEl) {
        listEl.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${(r.username || '?')[0].toUpperCase()}</div>
          <div class="review-meta">
            <div class="review-username">${escapeHtml(r.username)}</div>
            <div class="review-date">${formatDate(r.date)}</div>
          </div>
          <div>${renderStars(r.rating)}</div>
        </div>
        <div class="review-text">${escapeHtml(r.comment)}</div>
      </div>
    `).join('');
    }
}

/**
 * Initialise the quantity control buttons
 */
function initQtyControls() {
    const qtyInput = document.getElementById('qty-input');
    const decreaseBtn = document.getElementById('qty-decrease');
    const increaseBtn = document.getElementById('qty-increase');

    if (!qtyInput || !decreaseBtn || !increaseBtn) return;

    decreaseBtn.addEventListener('click', () => {
        _qty = Math.max(1, _qty - 1);
        qtyInput.value = _qty;
    });

    increaseBtn.addEventListener('click', () => {
        const max = _currentProduct ? _currentProduct.stock : 99;
        _qty = Math.min(max, _qty + 1);
        qtyInput.value = _qty;
    });

    qtyInput.addEventListener('change', () => {
        const max = _currentProduct ? _currentProduct.stock : 99;
        _qty = Math.max(1, Math.min(Number(qtyInput.value) || 1, max));
        qtyInput.value = _qty;
    });
}

/**
 * Initialise product tab switching
 */
function initProductTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const target = document.getElementById(tab.dataset.panel);
            if (target) target.classList.add('active');
        });
    });
}

/**
 * Initialise the star rating input for writing a review
 */
function initReviewForm() {
    const stars = document.querySelectorAll('.star-rating-input span');
    const ratingInput = document.getElementById('review-rating-value');

    stars.forEach((star, idx) => {
        star.addEventListener('click', () => {
            _selectedRating = idx + 1;
            if (ratingInput) ratingInput.value = _selectedRating;
            stars.forEach((s, i) => s.classList.toggle('active', i <= idx));
        });
        star.addEventListener('mouseenter', () => {
            stars.forEach((s, i) => s.classList.toggle('active', i <= idx));
        });
    });

    const starContainer = document.querySelector('.star-rating-input');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => s.classList.toggle('active', i < _selectedRating));
        });
    }

    const form = document.getElementById('review-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) { showToast('Please login to write a review', 'warning'); window.location.href = 'login.html'; return; }
            if (_selectedRating === 0) { showToast('Please select a star rating', 'warning'); return; }
            const comment = document.getElementById('review-comment').value.trim();
            if (!comment) { showToast('Please write a comment', 'warning'); return; }

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

            try {
                await createReview({ userId: user.id, username: user.fullName || user.username, medicineId: _currentProduct.id, rating: _selectedRating, comment });
                showToast('Review submitted successfully!', 'success');
                _selectedRating = 0;
                form.reset();
                document.querySelectorAll('.star-rating-input span').forEach(s => s.classList.remove('active'));
                await loadProductReviews(_currentProduct.id);
            } catch (err) {
                showToast('Failed to submit review', 'error');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
            }
        });
    }

    // Show/hide review form based on auth
    const reviewFormSection = document.getElementById('write-review-section');
    const loginPrompt = document.getElementById('review-login-prompt');
    if (isLoggedIn()) {
        if (reviewFormSection) reviewFormSection.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        if (reviewFormSection) reviewFormSection.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

/* ════════════════════════════════════════════════════════════
   CART PAGE (cart.html)
   ════════════════════════════════════════════════════════════ */

/**
 * Initialise the cart page
 */
function initCartPage() {
    renderCartPage();
    window.addEventListener('cartUpdated', renderCartPage);
}

/**
 * Render the full cart page
 */
function renderCartPage() {
    const cart = getCart();
    const itemsEl = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');
    const rxBanner = document.getElementById('cart-rx-banner');

    if (!itemsEl) return;

    if (cart.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        if (cartContent) cartContent.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (cartContent) cartContent.style.display = 'grid';

    // Rx warning
    if (rxBanner) rxBanner.style.display = hasRxItems() ? 'flex' : 'none';

    // Cart items
    itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-image">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22 viewBox=%220%200%2080%2080%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23E3F2FD%22/%3E%3Ctext x=%2240%22 y=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2230%22%3E💊%3C/text%3E%3C/svg%3E'">
      </div>
      <div>
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">Rs. ${item.price.toLocaleString()} each</div>
        ${item.prescriptionRequired ? '<span class="badge badge-rx" style="margin-top:4px">Rx Required</span>' : ''}
        <div class="quantity-control mt-8">
          <button class="qty-btn" onclick="handleCartQty(${item.id}, ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
          <input class="qty-input" type="number" value="${item.quantity}" min="1" max="${item.stock}"
            onchange="handleCartQty(${item.id}, this.value)" aria-label="Quantity">
          <button class="qty-btn" onclick="handleCartQty(${item.id}, ${item.quantity + 1})" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <button class="cart-item-remove" onclick="handleRemoveFromCart(${item.id})" aria-label="Remove ${escapeHtml(item.name)}">×</button>
        <div class="cart-item-subtotal">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
      </div>
    </div>
  `).join('');

    // Order summary
    const subtotal = getSubtotal();
    const delivery = getDeliveryFee();
    const total = getTotal();

    const subtotalEl = document.getElementById('summary-subtotal');
    const deliveryEl = document.getElementById('summary-delivery');
    const totalEl = document.getElementById('summary-total');

    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;
    if (deliveryEl) deliveryEl.innerHTML = delivery === 0
        ? '<span class="free">FREE</span>'
        : `Rs. ${delivery.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
}

function handleCartQty(id, qty) {
    updateQty(id, qty);
}

function handleRemoveFromCart(id) {
    removeFromCart(id);
    showToast('Item removed from cart', 'info');
}

/* ════════════════════════════════════════════════════════════
   CHECKOUT PAGE (checkout.html)
   ════════════════════════════════════════════════════════════ */

let _checkoutStep = 1;
let _selectedPaymentMethod = 'CASH';

/**
 * Initialise the checkout page
 */
function initCheckoutPage() {

    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    renderCheckoutSummary();
    renderCheckoutRxSection();
    initPaymentMethodSelection();
    prefillDeliveryDetails();
    updateProgressSteps();
}

/**
 * Pre-fill delivery details if user is logged in
 */
function prefillDeliveryDetails() {
    const user = getCurrentUser();
    if (!user) return;
    const nameInput = document.getElementById('delivery-name');
    const emailInput = document.getElementById('delivery-email');
    const phoneInput = document.getElementById('delivery-phone');
    if (nameInput && user.fullName) nameInput.value = user.fullName;
    if (emailInput && user.email) emailInput.value = user.email;
    if (phoneInput && user.phone) phoneInput.value = user.phone;
}

/**
 * Render the order summary sidebar on checkout
 */
function renderCheckoutSummary() {
    const cart = getCart();
    const itemsEl = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const deliveryEl = document.getElementById('checkout-delivery');
    const totalEl = document.getElementById('checkout-total');

    if (itemsEl) {
        itemsEl.innerHTML = cart.map(item => `
      <tr>
        <td>${escapeHtml(item.name)} ${item.prescriptionRequired ? '<span class="badge badge-rx">Rx</span>' : ''}</td>
        <td class="text-right">×${item.quantity}</td>
        <td class="text-right">Rs. ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');
    }

    const subtotal = getSubtotal();
    const delivery = getDeliveryFee();
    const total = getTotal();
    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : `Rs. ${delivery.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
}

/**
 * Show/hide prescription upload section based on cart contents
 */
function renderCheckoutRxSection() {
    const rxSection = document.getElementById('checkout-rx-section');
    if (rxSection) rxSection.style.display = hasRxItems() ? 'block' : 'none';
}

/**
 * Wire up payment method selection tiles
 */
function initPaymentMethodSelection() {
    document.querySelectorAll('.payment-method').forEach(tile => {
        tile.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(t => t.classList.remove('selected'));
            tile.classList.add('selected');
            _selectedPaymentMethod = tile.dataset.method;
            const cardDetails = document.getElementById('card-details-form');
            if (cardDetails) cardDetails.style.display = _selectedPaymentMethod === 'CARD' ? 'block' : 'none';
        });
    });
}

/**
 * Update the progress step indicators
 */
function updateProgressSteps() {
    document.querySelectorAll('.progress-step').forEach((step, idx) => {
        const stepNum = idx + 1;
        step.classList.remove('active', 'done');
        if (stepNum < _checkoutStep) step.classList.add('done');
        else if (stepNum === _checkoutStep) step.classList.add('active');
    });
    document.querySelectorAll('.step-line').forEach((line, idx) => {
        line.classList.toggle('done', idx + 1 < _checkoutStep);
    });
}

/**
 * Move to next checkout step
 */
function checkoutNext() {
    if (_checkoutStep === 1) {
        // Validate delivery details
        const requiredFields = ['delivery-name', 'delivery-phone', 'delivery-email', 'delivery-address', 'delivery-city'];
        let valid = true;
        requiredFields.forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.value.trim()) {
                showFieldError(input, 'This field is required');
                valid = false;
            } else if (input) {
                clearFieldError(input);
            }
        });
        if (!valid) { showToast('Please fill in all required fields', 'warning'); return; }
    }

    if (_checkoutStep < 3) {
        const currentEl = document.getElementById(`checkout-step-${_checkoutStep}`);
        if (currentEl) currentEl.classList.remove('active');
        _checkoutStep++;
        const nextEl = document.getElementById(`checkout-step-${_checkoutStep}`);
        if (nextEl) nextEl.classList.add('active');
        updateProgressSteps();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Move to previous checkout step
 */
function checkoutBack() {
    if (_checkoutStep > 1) {
        const currentEl = document.getElementById(`checkout-step-${_checkoutStep}`);
        if (currentEl) currentEl.classList.remove('active');
        _checkoutStep--;
        const prevEl = document.getElementById(`checkout-step-${_checkoutStep}`);
        if (prevEl) prevEl.classList.add('active');
        updateProgressSteps();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Place the order
 */
async function placeOrder() {
    const user = getCurrentUser();
    if (!user) {
        showToast('Please login to place an order', 'warning');
        window.location.href = 'login.html';
        return;
    }
    const cart = getCart();
    if (cart.length === 0) return;

    const placeBtn = document.getElementById('place-order-btn');
    if (placeBtn) { placeBtn.disabled = true; placeBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Placing Order...'; }

    try {
        const orderData = {
            userId: user ? user.id : 0,
            totalPrice: getTotal(),
            deliveryAddress: (document.getElementById('delivery-address') || {}).value || '',
            city: (document.getElementById('delivery-city') || {}).value || '',
            postalCode: (document.getElementById('delivery-postal') || {}).value || '',
            notes: (document.getElementById('delivery-notes') || {}).value || '',
            paymentMethod: _selectedPaymentMethod,
            items: cart.map(item => ({
                medicineId: item.id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                subtotal: item.price * item.quantity,
            })),
        };

        const order = await createOrder(orderData);
        clearCart();

        // Show success modal
        const modal = document.getElementById('order-success-modal');
        const orderIdEl = document.getElementById('success-order-id');
        if (orderIdEl) orderIdEl.textContent = `#${order.id}`;
        if (modal) modal.classList.add('open');
    } catch (err) {
        showToast('Failed to place order: ' + err.message, 'error');
    } finally {
        if (placeBtn) { placeBtn.disabled = false; placeBtn.innerHTML = '✓ Place Order'; }
    }
}

/* ════════════════════════════════════════════════════════════
   ORDERS PAGE (orders.html)
   ════════════════════════════════════════════════════════════ */

let _allOrders = [];
let _activeOrderFilter = 'All';

/**
 * Initialise the orders page
 */
async function initOrdersPage() {
    const user = requireAuth();
    if (!user) return;

    try {
        _allOrders = await getOrdersByUser(user.id);
        // Enrich with payment data
        for (const order of _allOrders) {
            try {
                const payments = await getPaymentsByOrder(order.id);
                order.payment = payments[0] || null;
            } catch { order.payment = null; }
        }
        renderOrdersList();
    } catch (err) {
        showToast('Failed to load orders', 'error');
    }

    // Filter tabs
    document.querySelectorAll('.status-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _activeOrderFilter = btn.dataset.status;
            renderOrdersList();
        });
    });
}

/**
 * Render the filtered orders list
 */
function renderOrdersList() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    const filtered = _activeOrderFilter === 'All'
        ? _allOrders
        : _allOrders.filter(o => o.status === _activeOrderFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No orders found</h3>
        <p>You have no ${_activeOrderFilter !== 'All' ? _activeOrderFilter.toLowerCase() + ' ' : ''}orders yet.</p>
        <a href="products.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
        return;
    }

    container.innerHTML = filtered.map(order => {
        const itemPreview = order.items.slice(0, 2).map(i => i.name).join(', ')
            + (order.items.length > 2 ? ` and ${order.items.length - 2} more` : '');

        const statusSteps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
        const currentIdx = order.status === 'CANCELLED' ? -1 : statusSteps.indexOf(order.status);

        return `
      <div class="order-card">
        <div class="order-card-header" onclick="toggleOrderDetail(${order.id})" role="button" tabindex="0"
          aria-expanded="false" id="order-header-${order.id}"
          onkeydown="if(event.key==='Enter')toggleOrderDetail(${order.id})">
          <div>
            <div class="order-id">Order #${order.id}</div>
            <div class="order-date">${formatDateTime(order.orderDate)}</div>
          </div>
          <div class="order-items-preview">${escapeHtml(itemPreview)}</div>
          <div style="display:flex;align-items:center;gap:12px">
            ${renderOrderStatusBadge(order.status)}
            ${order.payment ? renderPaymentStatusBadge(order.payment.status) : ''}
            <div class="order-total">Rs. ${order.totalPrice.toLocaleString()}</div>
            <span aria-hidden="true">›</span>
          </div>
        </div>
        <div class="order-card-detail" id="order-detail-${order.id}">
          <h5 style="margin-bottom:12px">Order Items</h5>
          <table class="order-items-table">
            <thead><tr><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${escapeHtml(item.name)}</td>
                  <td>${item.quantity}</td>
                  <td>Rs. ${item.unitPrice.toLocaleString()}</td>
                  <td>Rs. ${item.subtotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
              <div class="text-secondary text-sm">Delivery Address</div>
              <div>${escapeHtml(order.deliveryAddress)}</div>
              <div class="text-secondary text-sm">${escapeHtml(order.deliveryAddress || '')}</div>
            </div>
            ${order.payment ? `
              <div>
                <div class="text-secondary text-sm">Payment</div>
                <div>${order.payment.method} • ${renderPaymentStatusBadge(order.payment.status)}</div>
              </div>` : ''}
          </div>
          ${order.status !== 'CANCELLED' ? `
            <h5 style="margin-bottom:12px">Order Progress</h5>
            <div class="order-timeline">
              ${statusSteps.map((step, idx) => `
                <div class="timeline-step">
                  ${idx < statusSteps.length - 1 ? `<div class="timeline-line ${idx < currentIdx ? 'done' : ''}"></div>` : ''}
                  <div class="timeline-dot ${idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : ''}">
                    ${idx < currentIdx ? '✓' : idx + 1}
                  </div>
                  <div class="timeline-label">${step.charAt(0) + step.slice(1).toLowerCase()}</div>
                </div>
              `).join('')}
            </div>` : '<div class="badge badge-error" style="font-size:14px;padding:6px 14px">This order was cancelled</div>'}
        </div>
      </div>`;
    }).join('');
}

/**
 * Toggle order detail accordion
 * @param {number} orderId
 */
function toggleOrderDetail(orderId) {
    const detail = document.getElementById(`order-detail-${orderId}`);
    const header = document.getElementById(`order-header-${orderId}`);
    if (!detail) return;
    const isOpen = detail.classList.toggle('open');
    if (header) header.setAttribute('aria-expanded', isOpen);
}

/* ════════════════════════════════════════════════════════════
   PROFILE PAGE (profile.html)
   ════════════════════════════════════════════════════════════ */

/**
 * Initialise the profile page
 */
async function initProfilePage() {
    const user = requireAuth();
    if (!user) return;

    renderProfileSidebar(user);
    prefillProfileForm(user);
    await loadProfileStats(user.id);
    renderAddresses();
    initProfileForms(user);
}

function renderProfileSidebar(user) {
    const initial = (user.fullName || user.username || '?')[0].toUpperCase();
    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-username-display');
    const emailEl = document.getElementById('profile-email-display');
    const roleEl = document.getElementById('profile-role-badge');
    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = user.fullName || user.username;
    if (emailEl) emailEl.textContent = user.email;
    if (roleEl) { roleEl.textContent = user.role; roleEl.className = `badge ${user.role === 'ADMIN' ? 'badge-error' : user.role === 'PHARMACIST' ? 'badge-purple' : 'badge-primary'}`; }
}

function prefillProfileForm(user) {
    const fields = { 'profile-fullname': user.fullName, 'profile-username': user.username, 'profile-email': user.email, 'profile-phone': user.phone };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    });
}

async function loadProfileStats(userId) {
    try {
        const orders = await getOrdersByUser(userId);
        const totalSpent = orders.reduce((s, o) => s + o.totalPrice, 0);
        const prescriptions = await getPrescriptionsByUser(userId);

        const ordersEl = document.getElementById('stat-orders');
        const spentEl = document.getElementById('stat-spent');
        const rxEl = document.getElementById('stat-rx');
        if (ordersEl) ordersEl.textContent = orders.length;
        if (spentEl) spentEl.textContent = `Rs. ${totalSpent.toLocaleString()}`;
        if (rxEl) rxEl.textContent = prescriptions.length;
    } catch { /* ignore */ }
}

function renderAddresses() {
    const savedAddresses = JSON.parse(localStorage.getItem('carepulse_addresses') || '[]');
    const container = document.getElementById('addresses-list');
    if (!container) return;
    if (savedAddresses.length === 0) {
        container.innerHTML = '<p class="text-secondary text-sm">No saved addresses yet.</p>';
        return;
    }
    container.innerHTML = savedAddresses.map((addr, idx) => `
    <div class="address-card ${addr.isDefault ? 'default' : ''}">
      <div>
        <div style="font-weight:600">${escapeHtml(addr.label || 'Address ' + (idx + 1))}</div>
        <div class="text-secondary text-sm">${escapeHtml(addr.address)}, ${escapeHtml(addr.city)}</div>
        ${addr.isDefault ? '<span class="badge badge-primary" style="margin-top:6px">Default</span>' : ''}
      </div>
      <div class="address-card-actions">
        ${!addr.isDefault ? `<button class="btn btn-ghost btn-sm" onclick="setDefaultAddress(${idx})">Set Default</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteAddress(${idx})">Delete</button>
      </div>
    </div>
  `).join('');
}

function setDefaultAddress(idx) {
    const saved = JSON.parse(localStorage.getItem('carepulse_addresses') || '[]');
    saved.forEach((a, i) => a.isDefault = i === idx);
    localStorage.setItem('carepulse_addresses', JSON.stringify(saved));
    renderAddresses();
}

function deleteAddress(idx) {
    const saved = JSON.parse(localStorage.getItem('carepulse_addresses') || '[]');
    saved.splice(idx, 1);
    localStorage.setItem('carepulse_addresses', JSON.stringify(saved));
    renderAddresses();
    showToast('Address deleted', 'info');
}

function initProfileForms(user) {
    // Profile update form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = {
                fullName: document.getElementById('profile-fullname').value.trim(),
                email: document.getElementById('profile-email').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
            };
            if (!updates.fullName || !updates.email) { showToast('Name and email are required', 'warning'); return; }
            if (!isValidEmail(updates.email)) { showToast('Please enter a valid email', 'warning'); return; }
            try {
                const user = getCurrentUser();
                await request('PUT', `/users/${user.id}`, {
                    username: user.username,
                    email:    updates.email,
                    phone:    updates.phone || '',
                });
                updateSessionUser(updates);
                renderProfileSidebar(getCurrentUser());
                showToast('Profile updated successfully', 'success');
            } catch (err) {
                showToast('Failed to update profile: ' + err.message, 'error');
            }
        });
    }

    // Add address form
    const addAddrForm = document.getElementById('add-address-form');
    if (addAddrForm) {
        addAddrForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newAddr = {
                label: document.getElementById('addr-label').value.trim() || 'Home',
                address: document.getElementById('addr-address').value.trim(),
                city: document.getElementById('addr-city').value.trim(),
                isDefault: false,
            };
            if (!newAddr.address || !newAddr.city) { showToast('Address and city are required', 'warning'); return; }
            const saved = JSON.parse(localStorage.getItem('carepulse_addresses') || '[]');
            saved.push(newAddr);
            localStorage.setItem('carepulse_addresses', JSON.stringify(saved));
            renderAddresses();
            addAddrForm.reset();
            showToast('Address saved', 'success');
        });
    }
}

/* ════════════════════════════════════════════════════════════
   PRESCRIPTIONS PAGE (prescriptions.html)
   ════════════════════════════════════════════════════════════ */

/**
 * Initialise the prescriptions page
 */
async function initPrescriptionsPage() {
    const user = requireAuth();
    if (!user) return;

    await loadRxMedicineDropdown();
    await loadUserPrescriptions(user.id);
    initUploadZone();
    initPrescriptionForm(user);
}

async function loadRxMedicineDropdown() {
    const select = document.getElementById('rx-medicine-select');
    if (!select) return;
    try {
        const products = await getProducts({ prescriptionRequired: true });
        select.innerHTML = '<option value="">Select Medicine</option>' +
            products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    } catch { /* ignore */ }
}

async function loadUserPrescriptions(userId) {
    const container = document.getElementById('prescriptions-list');
    if (!container) return;
    container.innerHTML = '<div class="spinner" style="margin:32px auto"></div>';
    try {
        const rxList = await getPrescriptionsByUser(userId);
        if (rxList.length === 0) {
            container.innerHTML = '<p class="text-secondary">No prescriptions uploaded yet.</p>';
            return;
        }
        container.innerHTML = rxList.map(rx => `
      <div class="prescription-card">
        <div>
          <div style="font-weight:600;margin-bottom:4px">${escapeHtml(rx.medicineName)}</div>
          <div class="text-secondary text-sm">Dr. ${escapeHtml(rx.doctorName)} · ${escapeHtml(rx.hospital || '')}</div>
          <div class="text-secondary text-sm">Issued: ${formatDate(rx.issueDate)} · Expires: ${formatDate(rx.expiryDate)}</div>
          <div class="text-secondary text-sm" style="margin-top:4px">📎 ${escapeHtml(rx.fileName)}</div>
          ${rx.notes ? `<div class="text-sm" style="margin-top:6px;color:#E65100">${escapeHtml(rx.notes)}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          ${renderPrescriptionStatusBadge(rx.status)}
          ${rx.status === 'REJECTED' ? `<button class="btn btn-secondary btn-sm" onclick="showReuploadModal('${rx.id}')">Re-upload</button>` : ''}
        </div>
      </div>
    `).join('');
    } catch {
        container.innerHTML = '<p class="text-secondary">Failed to load prescriptions.</p>';
    }
}

function initUploadZone() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('rx-file-input');
    const preview = document.getElementById('upload-preview');
    const previewName = document.getElementById('preview-filename');

    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file, preview, previewName, fileInput);
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) handleFileSelected(file, preview, previewName, fileInput);
    });
}

function handleFileSelected(file, preview, previewName, input) {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
        showToast('Only JPG, PNG, and PDF files are accepted', 'error');
        return;
    }
    if (preview) preview.classList.add('visible');
    if (previewName) previewName.textContent = file.name;
}

function initPrescriptionForm(user) {
    const form = document.getElementById('prescription-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const medicineId = Number(document.getElementById('rx-medicine-select').value);
        const doctorName = document.getElementById('rx-doctor').value.trim();
        const hospital = document.getElementById('rx-hospital').value.trim();
        const issueDate = document.getElementById('rx-issue-date').value;
        const expiryDate = document.getElementById('rx-expiry-date').value;
        const fileInput = document.getElementById('rx-file-input');
        const fileName = fileInput.files[0] ? fileInput.files[0].name : '';

        if (!medicineId) { showToast('Please select a medicine', 'warning'); return; }
        if (!doctorName) { showToast('Please enter the doctor name', 'warning'); return; }
        if (!issueDate) { showToast('Please enter issue date', 'warning'); return; }
        if (!fileName) { showToast('Please upload a prescription file', 'warning'); return; }

        // Get medicine name
        let medicineName = '';
        try { const p = await getProductById(medicineId); medicineName = p ? p.name : ''; } catch { /* ignore */ }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading...'; }

        try {
            await createPrescription({ userId: user.id, medicineId, medicineName, doctorName, hospital, issueDate, expiryDate, fileName, notes: '' });
            showToast('Prescription uploaded successfully! It will be reviewed within 24 hours.', 'success');
            form.reset();
            document.getElementById('upload-preview').classList.remove('visible');
            await loadUserPrescriptions(user.id);
        } catch (err) {
            showToast('Failed to upload prescription', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📤 Upload Prescription'; }
        }
    });
}