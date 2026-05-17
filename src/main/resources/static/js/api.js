/**
 * CarePulse — Real API Layer
 * Connects to Spring Boot backend at localhost:8080
 * Drop-in replacement for the simulated api.js
 * All function names are identical to the original.
 */

/* ── Base URL ────────────────────────────────────────────────── */
const BASE_URL = 'http://localhost:8080';

/* ── Core Request Helper ─────────────────────────────────────── */
async function request(method, path, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body !== null) options.body = JSON.stringify(body);

    const response = await fetch(BASE_URL + path, options);

    if (!response.ok) {
        let errorMsg = `Request failed: ${response.status}`;
        try {
            const err = await response.json();
            errorMsg = err.error || err.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

/* ─────────────────────────────────────────────────────────────
   PRODUCTS / MEDICINES
   ───────────────────────────────────────────────────────────── */

/**
 * Map backend medicine object to the shape the frontend expects.
 * Backend has no `image`, `stock`, `rating`, `reviewCount` fields —
 * we supply safe defaults so the UI never crashes.
 */
function mapMedicine(m) {
    return {
        id:                  m.id,
        name:                m.name                || '',
        category:            m.category            || 'Medicines',
        manufacturer:        m.manufacturer        || '',
        description:         m.description         || '',
        price:               m.price               || 0,
        expiryDate:          m.expiryDate          || '',
        prescriptionRequired: m.prescriptionRequired || false,
        // These fields don't exist in the backend — provide defaults
        image:               m.image               || 'images/image1.jpg',
        stock:               m.stock               !== undefined ? m.stock : 999,
        reorderLevel:        m.reorderLevel        || 10,
        rating:              m.rating              || 0,
        reviewCount:         m.reviewCount         || 0,
    };
}

/**
 * Get all products with optional client-side filters
 * (backend search is basic, so we filter on the frontend too)
 */
async function getProducts(filters = {}) {
    let results;

    if (filters.search) {
        results = await request('GET', `/medicines/search?name=${encodeURIComponent(filters.search)}`);
    } else if (filters.category && filters.category !== 'All') {
        results = await request('GET', `/medicines/search?category=${encodeURIComponent(filters.category)}`);
    } else {
        results = await request('GET', '/medicines');
    }

    let mapped = results.map(mapMedicine);

    // Client-side filters
    if (filters.prescriptionRequired === true) {
        mapped = mapped.filter(p => p.prescriptionRequired);
    }
    if (filters.inStockOnly) {
        mapped = mapped.filter(p => p.stock > 0);
    }
    if (filters.priceMax) {
        mapped = mapped.filter(p => p.price <= filters.priceMax);
    }

    // Sorting
    if (filters.sort === 'price_asc')  mapped.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price_desc') mapped.sort((a, b) => b.price - a.price);
    else if (filters.sort === 'rating')     mapped.sort((a, b) => b.rating - a.rating);
    else if (filters.sort === 'name_az')    mapped.sort((a, b) => a.name.localeCompare(b.name));

    return mapped;
}

/** Get a single product by ID */
async function getProductById(id) {
    const m = await request('GET', `/medicines/${id}`);
    return m ? mapMedicine(m) : null;
}

/** Get featured products for the homepage (first 6) */
async function getFeaturedProducts() {
    const all = await request('GET', '/medicines');
    return all.slice(0, 6).map(mapMedicine);
}

/** Get product categories with counts */
async function getCategories() {
    const all = await request('GET', '/medicines');
    const counts = {};
    all.forEach(m => {
        const cat = m.category || 'Medicines';
        counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

/* ── Admin: Add / Edit / Delete Products ────────────────────── */

async function addProduct(productData) {
    const body = {
        name:                productData.name,
        category:            productData.category,
        manufacturer:        productData.manufacturer,
        description:         productData.description,
        price:               productData.price,
        expiryDate:          productData.expiryDate || null,
        prescriptionRequired: productData.prescriptionRequired || false,
    };
    const created = await request('POST', '/medicines', body);
    return mapMedicine(created);
}

async function updateProduct(id, updates) {
    const body = {
        name:                updates.name,
        category:            updates.category,
        manufacturer:        updates.manufacturer,
        description:         updates.description,
        price:               updates.price,
        expiryDate:          updates.expiryDate || null,
        prescriptionRequired: updates.prescriptionRequired || false,
    };
    const updated = await request('PUT', `/medicines/${id}`, body);
    return mapMedicine(updated);
}

async function deleteProduct(id) {
    await request('DELETE', `/medicines/${id}`);
    return true;
}

/* ─────────────────────────────────────────────────────────────
   INVENTORY
   ───────────────────────────────────────────────────────────── */

function mapInventory(i) {
    return {
        id:           i.id,
        medicineId:   i.medicine ? i.medicine.id   : i.medicineId,
        medicineName: i.medicine ? i.medicine.name : (i.medicineName || ''),
        category:     i.medicine ? i.medicine.category : (i.category || ''),
        quantity:     i.quantity     || 0,
        reorderLevel: i.reorderLevel || 10,
        expiryDate:   i.expiryDate   || '',
        lastUpdated:  i.lastUpdated  || '',
    };
}

async function getAllInventory() {
    const result = await request('GET', '/inventory');
    return result.map(mapInventory);
}

async function getLowStockItems() {
    const result = await request('GET', '/inventory/low-stock');
    return result.map(mapInventory);
}

async function getExpiredItems() {
    const result = await request('GET', '/inventory/expired');
    return result.map(mapInventory);
}

/**
 * Update stock quantity for a medicine.
 * Backend PUT /inventory/{id} needs the inventory record ID, not medicineId.
 * We first fetch by medicineId to get the inventory ID.
 */
async function updateInventoryStock(medicineId, quantity) {
    const inv = await request('GET', `/inventory/medicine/${medicineId}`);
    const url = `/inventory/${inv.id}?quantity=${quantity}&reorderLevel=${inv.reorderLevel || 10}${inv.expiryDate ? '&expiryDate=' + inv.expiryDate : ''}`;
    const updated = await request('PUT', url);
    return mapInventory(updated);
}

// ✅ Add this function to js/api.js
async function createInventory(medicineId, quantity, reorderLevel, expiryDate) {
    let url = `/inventory?medicineId=${medicineId}&quantity=${quantity}&reorderLevel=${reorderLevel || 10}`;
    if (expiryDate) {
        url += `&expiryDate=${expiryDate}`;
    }
    const result = await request('POST', url);
    return mapInventory(result);
}

/* ─────────────────────────────────────────────────────────────
   ORDERS
   ───────────────────────────────────────────────────────────── */

function mapOrder(o) {
    return {
        id:              o.id,
        userId:          o.user ? o.user.id : o.userId,
        // ✅ ADDED: Extracts customer name for the admin orders table
        username:        o.user ? o.user.username : '—',
        orderDate:       o.orderDate   || '',
        status:          o.status      || 'PENDING',
        totalPrice:      o.totalPrice  || 0,
        deliveryAddress: o.deliveryAddress || '',
        notes:           o.notes       || '',
        // Map backend items array
        items: (o.items || []).map(item => ({
            medicineId: item.medicine ? item.medicine.id   : item.medicineId,
            name:       item.medicine ? item.medicine.name : (item.name || ''),
            quantity:   item.quantity   || 0,
            unitPrice:  item.unitPrice  || 0,
            subtotal:   item.subtotal   || 0,
        })),
    };
}

async function getOrdersByUser(userId) {
    const result = await request('GET', `/orders/user/${userId}`);
    return result.map(mapOrder);
}

async function getAllOrders() {
    const result = await request('GET', '/orders');
    return result.map(mapOrder);
}

/**
 * Create an order.
 * Frontend sends: { userId, deliveryAddress, notes, totalPrice, paymentMethod, items[] }
 * Backend expects: { userId, deliveryAddress, notes, items: [{ medicineId, quantity }] }
 */
async function createOrder(orderData) {
    const body = {
        userId:          orderData.userId,
        deliveryAddress: orderData.deliveryAddress || '',
        notes:           orderData.notes           || '',
        items: (orderData.items || []).map(item => ({
            medicineId: item.medicineId,
            quantity:   item.quantity,
        })),
    };

    const created = await request('POST', '/orders', body);
    const order   = mapOrder(created);

    // Auto-create payment after order
    if (orderData.paymentMethod) {
        try {
            await request('POST', '/payments', {
                orderId: order.id,
                method:  orderData.paymentMethod,
            });
        } catch (_) {
            // Payment creation failing should not block order success
            console.warn('Payment creation failed, order was still created.');
        }
    }

    return order;
}

async function updateOrderStatus(id, status) {
    const updated = await request('PATCH', `/orders/${id}/status?status=${status}`);
    return mapOrder(updated);
}

/* ─────────────────────────────────────────────────────────────
   PAYMENTS
   ───────────────────────────────────────────────────────────── */

function mapPayment(p) {
    return {
        id:           p.id,
        orderId:      p.order ? p.order.id : p.orderId,
        // ✅ ADDED: Checks safely down the nested hierarchy to grab the username
        customerName: p.order && p.order.user ? p.order.user.username : '—',
        amount:       p.amount || 0,
        status:       p.status || 'PENDING',
        method:       p.method || '',
        paymentDate:  p.paymentDate || null,
    };
}
async function getPaymentsByOrder(orderId) {
    try {
        const p = await request('GET', `/payments/order/${orderId}`);
        return [mapPayment(p)];
    } catch (_) {
        return [];
    }
}

async function getAllPayments() {
    const result = await request('GET', '/payments');
    return result.map(mapPayment);
}

async function updatePaymentStatus(id, status) {
    const updated = await request('PATCH', `/payments/${id}/status?status=${status}`);
    return mapPayment(updated);
}

/* ─────────────────────────────────────────────────────────────
   PRESCRIPTIONS
   ───────────────────────────────────────────────────────────── */

function mapPrescription(p) {
    return {
        id:           p.id,
        userId:       p.user     ? p.user.id         : p.userId,
        // ✅ ADDED: Extracts customer name from the nested user relation
        customerName: p.user     ? p.user.username   : '—',
        medicineId:   p.medicine ? p.medicine.id      : p.medicineId,
        medicineName: p.medicine ? p.medicine.name    : (p.medicineName || '—'),
        doctorName:   p.doctorName  || '',
        fileName:     p.fileName    || '',
        issueDate:    p.issueDate   || '',
        expiryDate:   p.expiryDate  || '',
        status:       p.status      || 'PENDING',
        notes:        p.notes       || '',
    };
}

async function getPrescriptionsByUser(userId) {
    const result = await request('GET', `/prescriptions/user/${userId}`);
    return result.map(mapPrescription);
}

async function getAllPrescriptions() {
    const result = await request('GET', '/prescriptions');
    return result.map(mapPrescription);
}

async function createPrescription(data) {
    const body = {
        user:       { id: data.userId },
        medicine:   data.medicineId ? { id: data.medicineId } : null,
        doctorName: data.doctorName  || '',
        fileName:   data.fileName    || '',
        issueDate:  data.issueDate   || null,
        expiryDate: data.expiryDate  || null,
        status:     'PENDING',
    };
    const created = await request('POST', '/prescriptions', body);
    return mapPrescription(created);
}

async function updatePrescriptionStatus(id, status, notes = '') {
    const updated = await request('PATCH', `/prescriptions/${id}/status?status=${status}`);
    return mapPrescription(updated);
}

/* ─────────────────────────────────────────────────────────────
   REVIEWS
   ───────────────────────────────────────────────────────────── */

function mapReview(r) {
    return {
        id:         r.id,
        userId:     r.user     ? r.user.id     : r.userId,
        username:   r.user     ? r.user.username : (r.username || ''),
        medicineId: r.medicine ? r.medicine.id : r.medicineId,
        // ✅ ADDED: Extracts medicine name from the nested medicine relation
        medicineName: r.medicine ? r.medicine.name : (r.medicineName || '—'),
        rating:     r.rating   || 0,
        comment:    r.comment  || '',
        date:       r.date     || '',
    };
}

async function getReviewsByProduct(medicineId) {
    const result = await request('GET', `/reviews/medicine/${medicineId}`);
    return result.map(mapReview);
}

async function getAllReviews() {
    const result = await request('GET', '/reviews');
    return result.map(mapReview);
}

async function createReview(reviewData) {
    const body = {
        user:     { id: reviewData.userId },
        medicine: { id: reviewData.medicineId },
        rating:   reviewData.rating,
        comment:  reviewData.comment || '',
    };
    const created = await request('POST', '/reviews', body);
    return mapReview(created);
}

async function deleteReview(id) {
    await request('DELETE', `/reviews/${id}`);
    return true;
}

/* ─────────────────────────────────────────────────────────────
   AUTH
   ───────────────────────────────────────────────────────────── */

/**
 * Login — calls POST /users/login
 * NOTE: You must add the /login endpoint to UserController (see guide).
 * Returns a UserResponseDTO shaped object.
 */
async function apiLogin(username, password) {
    const user = await request('POST', '/users/login', { username, password });
    // Shape the user object to match what auth.js expects
    return {
        id:       user.id,
        username: user.username,
        fullName: user.username,   // backend has no fullName — use username
        email:    user.email,
        phone:    user.phone   || '',
        role:     user.role    || 'CUSTOMER',
    };
}

/**
 * Register — calls POST /users
 */
async function apiRegister(userData) {
    const body = {
        username: userData.username,
        email:    userData.email,
        phone:    userData.phone    || '',
        password: userData.password,
        role:     'CUSTOMER',
    };
    const user = await request('POST', '/users', body);
    return {
        id:       user.id,
        username: user.username,
        fullName: user.username,
        email:    user.email,
        phone:    user.phone   || '',
        role:     user.role    || 'CUSTOMER',
    };
}

/* ─────────────────────────────────────────────────────────────
   USERS (Admin)
   ───────────────────────────────────────────────────────────── */

async function getAllUsers() {
    const result = await request('GET', '/users');
    return result.map(u => ({
        id:       u.id,
        username: u.username,
        fullName: u.username,
        email:    u.email,
        phone:    u.phone || '',
        role:     u.role  || 'CUSTOMER',
    }));
}

async function updateUserRole(id, role) {
    // Backend PUT /users/{id} expects a full User body
    // Fetch current user first then update
    const current = await request('GET', `/users/${id}`);
    const updated  = await request('PUT', `/users/${id}`, {
        username: current.username,
        email:    current.email,
        phone:    current.phone || '',
        role:     role,
    });
    return {
        id:       updated.id,
        username: updated.username,
        fullName: updated.username,
        email:    updated.email,
        phone:    updated.phone || '',
        role:     updated.role,
    };
}

async function deleteUser(id) {
    await request('DELETE', `/users/${id}`);
    return true;
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD STATS (Admin)
   Built from real backend data by aggregating multiple endpoints.
   ───────────────────────────────────────────────────────────── */

async function getDashboardStats() {
    // Fetch all data in parallel for speed
    const [orders, inventory, prescriptions] = await Promise.all([
        request('GET', '/orders'),
        request('GET', '/inventory'),
        request('GET', '/prescriptions'),
    ]);

    const today      = new Date().toDateString();
    const thisMonth  = new Date().getMonth();

    const todayOrders  = orders.filter(o => new Date(o.orderDate).toDateString() === today);
    const monthOrders  = orders.filter(o => new Date(o.orderDate).getMonth() === thisMonth);

    const todayRevenue  = todayOrders.reduce((s, o)  => s + (o.totalPrice  || 0), 0);
    const monthRevenue  = monthOrders.reduce((s, o)  => s + (o.totalPrice  || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    const lowStock  = inventory.filter(i => (i.quantity || 0) <= (i.reorderLevel || 10)).length;
    const pendingRx = prescriptions.filter(p => p.status === 'PENDING').length;

    // Orders by status
    const ordersByStatus = {};
    orders.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    // Revenue last 7 days
    const revenueLast7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr    = d.toDateString();
        const dayRevenue = orders
            .filter(o => new Date(o.orderDate).toDateString() === dayStr)
            .reduce((s, o) => s + (o.totalPrice || 0), 0);
        revenueLast7.push({
            label: d.toLocaleDateString('en-LK', { weekday: 'short' }),
            value: dayRevenue,
        });
    }

    // Top 5 products by quantity sold
    const salesMap = {};
    orders.forEach(o => {
        (o.items || []).forEach(item => {
            const name = item.medicine ? item.medicine.name : (item.name || 'Unknown');
            salesMap[name] = (salesMap[name] || 0) + (item.quantity || 0);
        });
    });
    const top5Products = Object.entries(salesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }));

    return {
        todayRevenue,
        monthRevenue,
        totalOrders:   orders.length,
        pendingOrders,
        lowStock,
        pendingRx,
        ordersByStatus,
        revenueLast7,
        top5Products,
    };
}