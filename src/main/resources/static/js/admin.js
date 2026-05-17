/**
 * CarePulse — Admin Dashboard Module
 * Handles all admin panel tabs: Dashboard, Medicines, Inventory,
 * Orders, Payments, Prescriptions, Reviews, Users.
 */

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */

/**
 * Initialise the admin page — auth guard, sidebar nav, default tab
 */
async function initAdminPage() {
    const user = requireAdmin();
    if (!user) return;

    // Set admin username in sidebar
    const adminNameEl = document.getElementById('admin-username');
    if (adminNameEl) adminNameEl.textContent = user.fullName || user.username;

    // Wire sidebar nav buttons
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchAdminTab(btn.dataset.tab));
    });

    // Load default tab
    await switchAdminTab('dashboard');
}

/**
 * Switch to an admin tab
 * @param {string} tabId
 */
async function switchAdminTab(tabId) {
    // Update sidebar active state
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Show correct panel
    document.querySelectorAll('.admin-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `admin-tab-${tabId}`);
    });

    // Update header title
    const titles = {
        dashboard: 'Dashboard Overview',
        medicines: 'Medicine Management',
        inventory: 'Inventory Management',
        orders: 'Order Management',
        payments: 'Payment Tracking',
        prescriptions: 'Prescription Review',
        reviews: 'Review Moderation',
        users: 'User Management',
    };
    const headerEl = document.getElementById('admin-tab-title');
    if (headerEl) headerEl.textContent = titles[tabId] || 'Admin';

    // Load tab data
    const loaders = {
        dashboard: loadDashboard,
        medicines: loadMedicinesTab,
        inventory: loadInventoryTab,
        orders: loadOrdersTab,
        payments: loadPaymentsTab,
        prescriptions: loadPrescriptionsTab,
        reviews: loadReviewsTab,
        users: loadUsersTab,
    };

    if (loaders[tabId]) await loaders[tabId]();
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ════════════════════════════════════════════════════════════ */

async function loadDashboard() {
    const container = document.getElementById('admin-tab-dashboard');
    if (!container) return;

    try {
        const stats = await getDashboardStats();
        renderKpiCards(stats);
        renderRevenueChart(stats.revenueLast7);
        renderOrdersDonut(stats.ordersByStatus);
        renderTop5Chart(stats.top5Products);
    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

function renderKpiCards(stats) {
    const kpiEl = document.getElementById('kpi-grid');
    if (!kpiEl) return;
    kpiEl.innerHTML = `
    <div class="kpi-card success">
      <div class="kpi-label">Today's Revenue</div>
      <div class="kpi-value">Rs. ${stats.todayRevenue.toLocaleString()}</div>
      <div class="kpi-sub">This month: Rs. ${stats.monthRevenue.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Orders</div>
      <div class="kpi-value">${stats.totalOrders}</div>
      <div class="kpi-sub kpi-trend up">↑ All time</div>
    </div>
    <div class="kpi-card warning">
      <div class="kpi-label">Pending Orders</div>
      <div class="kpi-value">${stats.pendingOrders}</div>
      <div class="kpi-sub">Awaiting confirmation</div>
    </div>
    <div class="kpi-card danger" style="cursor:pointer" onclick="switchAdminTab('inventory')" title="View low stock items">
      <div class="kpi-label">Low Stock Alerts</div>
      <div class="kpi-value">${stats.lowStock}</div>
      <div class="kpi-sub">Click to view inventory →</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-label">Pending Prescriptions</div>
      <div class="kpi-value">${stats.pendingRx}</div>
      <div class="kpi-sub">Awaiting pharmacist review</div>
    </div>
  `;
}

function renderRevenueChart(data) {
    const el = document.getElementById('revenue-chart');
    if (!el) return;
    const max = Math.max(...data.map(d => d.value), 1);
    el.innerHTML = data.map(d => {
        const pct = Math.round((d.value / max) * 100);
        return `
      <div class="bar-col">
        <div class="bar-value">${d.value > 0 ? 'Rs.' + (d.value / 1000).toFixed(1) + 'k' : ''}</div>
        <div class="bar-fill" style="height:${Math.max(pct, 4)}%"></div>
        <div class="bar-label">${d.label}</div>
      </div>`;
    }).join('');
}

function renderOrdersDonut(byStatus) {
    const el = document.getElementById('orders-donut');
    if (!el) return;
    const colors = {
        PENDING: '#FF9800', CONFIRMED: '#1E88E5', PROCESSING: '#9C27B0',
        SHIPPED: '#00ACC1', DELIVERED: '#4CAF50', CANCELLED: '#F44336',
    };
    const total = Object.values(byStatus).reduce((s, v) => s + v, 0) || 1;
    const entries = Object.entries(byStatus);

    // Simple SVG donut
    let offset = 0;
    const r = 45, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
    const segments = entries.map(([status, count]) => {
        const pct = count / total;
        const seg = { status, count, pct, offset, color: colors[status] || '#90A4AE', dash: pct * circumference };
        offset += pct;
        return seg;
    });

    el.innerHTML = `
    <div class="donut-chart-wrap">
      <div class="donut-canvas">
        <svg viewBox="0 0 120 120">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E0E0E0" stroke-width="18"/>
          ${segments.map(s => `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
              stroke="${s.color}" stroke-width="18"
              stroke-dasharray="${s.dash} ${circumference}"
              stroke-dashoffset="${-s.offset * circumference}"
              transform="rotate(-90 ${cx} ${cy})"/>
          `).join('')}
          <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="#212121">${total}</text>
        </svg>
      </div>
      <div class="donut-legend">
        ${entries.map(([status, count]) => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${colors[status] || '#90A4AE'}"></div>
            <span>${status} (${count})</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderTop5Chart(products) {
    const el = document.getElementById('top5-chart');
    if (!el) return;
    const max = Math.max(...products.map(p => p.qty), 1);
    el.innerHTML = products.map(p => `
    <div class="horiz-bar-row">
      <div class="horiz-bar-name" title="${escapeHtml(p.name)}">${escapeHtml(truncate(p.name, 22))}</div>
      <div class="horiz-bar-track">
        <div class="horiz-bar-fill" style="width:${Math.round((p.qty / max) * 100)}%"></div>
      </div>
      <div class="horiz-bar-val">${p.qty} sold</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   MEDICINES TAB
   ════════════════════════════════════════════════════════════ */

let _adminProducts = [];
let _medicineSearchQuery = '';
let _medicineCategoryFilter = 'All';

async function loadMedicinesTab() {
    const container = document.getElementById('medicines-table-body');
    if (!container) return;
    container.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminProducts = await getProducts({});

        // ✅ Merge actual inventory stock counts directly into the product array data
        try {
            const inventory = await getAllInventory();
            inventory.forEach(inv => {
                const product = _adminProducts.find(p => p.id === inv.medicineId);
                if (product) {
                    product.stock = inv.quantity;
                    product.reorderLevel = inv.reorderLevel;
                    product.expiryDate = inv.expiryDate; // Safely preserves expiry details for editing
                }
            });
        } catch(_) {
            /* Ignore fallback: inventory records may not be created yet for newly added drugs */
        }

        renderMedicinesTable();
    } catch {
        showToast('Failed to load medicines', 'error');
    }

    // Search
    const searchInput = document.getElementById('medicines-search');
    if (searchInput) {
        searchInput.oninput = debounce((e) => {
            _medicineSearchQuery = e.target.value.toLowerCase();
            renderMedicinesTable();
        }, 300);
    }

    // Category filter
    const catFilter = document.getElementById('medicines-category-filter');
    if (catFilter) {
        catFilter.onchange = (e) => {
            _medicineCategoryFilter = e.target.value;
            renderMedicinesTable();
        };
    }

    // Add medicine button
    const addBtn = document.getElementById('add-medicine-btn');
    if (addBtn) addBtn.onclick = () => openMedicinePanel(null);
}

function renderMedicinesTable() {
    const tbody = document.getElementById('medicines-table-body');
    if (!tbody) return;

    let filtered = _adminProducts;
    if (_medicineSearchQuery) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(_medicineSearchQuery) || p.manufacturer.toLowerCase().includes(_medicineSearchQuery));
    }
    if (_medicineCategoryFilter && _medicineCategoryFilter !== 'All') {
        filtered = filtered.filter(p => p.category === _medicineCategoryFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#666">No medicines found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><span class="text-secondary">#${p.id}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${escapeHtml(p.image)}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover;background:#E3F2FD"
            onerror="this.style.display='none'">
          <span style="font-weight:500">${escapeHtml(p.name)}</span>
        </div>
      </td>
      <td><span class="badge badge-primary">${escapeHtml(p.category)}</span></td>
      <td>Rs. ${p.price.toLocaleString()}</td>
      <td>${p.prescriptionRequired ? '<span class="badge badge-rx">Yes</span>' : '<span class="badge badge-secondary">No</span>'}</td>
      <td>${renderStockBadge(p.stock, p.reorderLevel)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="openMedicinePanel(${p.id})" aria-label="Edit ${escapeHtml(p.name)}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteMedicine(${p.id}, '${escapeHtml(p.name)}')" aria-label="Delete ${escapeHtml(p.name)}">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function openMedicinePanel(productId) {
    const panel = document.getElementById('medicine-panel');
    const overlay = document.getElementById('medicine-panel-overlay');
    const titleEl = document.getElementById('medicine-panel-title');
    const form = document.getElementById('medicine-form');
    if (!panel || !form) return;

    form.reset();
    document.getElementById('m-id').value = ''; //  FIXED

    if (productId) {
        const p = _adminProducts.find(prod => prod.id === productId);
        if (!p) return;
        if (titleEl) titleEl.textContent = 'Edit Medicine';
        document.getElementById('m-id').value = p.id; //  FIXED
        document.getElementById('m-name').value = p.name;
        document.getElementById('m-category').value = p.category;
        document.getElementById('m-manufacturer').value = p.manufacturer;
        document.getElementById('m-price').value = p.price;
        document.getElementById('m-stock').value = p.stock;
        document.getElementById('m-reorder').value = p.reorderLevel;
        document.getElementById('m-expiry').value = p.expiryDate;
        document.getElementById('m-rx').checked = p.prescriptionRequired;
        document.getElementById('m-description').value = p.description;
    } else {
        if (titleEl) titleEl.textContent = 'Add New Medicine';
    }

    panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeMedicinePanel() {
    const panel = document.getElementById('medicine-panel');
    const overlay = document.getElementById('medicine-panel-overlay'); //  FIXED
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

async function saveMedicine() {
    const form = document.getElementById('medicine-form');
    if (!form) return;

    const id = document.getElementById('m-id').value; //  FIXED
    const data = {
        name: document.getElementById('m-name').value.trim(),
        category: document.getElementById('m-category').value,
        manufacturer: document.getElementById('m-manufacturer').value.trim(),
        price: Number(document.getElementById('m-price').value),
        stock: Number(document.getElementById('m-stock').value),
        reorderLevel: Number(document.getElementById('m-reorder').value),
        expiryDate: document.getElementById('m-expiry').value,
        prescriptionRequired: document.getElementById('m-rx').checked,
        description: document.getElementById('m-description').value.trim(),
        image: id ? (_adminProducts.find(p => p.id === Number(id)) || {}).image || 'images/image1.jpg' : 'images/image1.jpg',
        rating: id ? (_adminProducts.find(p => p.id === Number(id)) || {}).rating || 0 : 0,
        reviewCount: id ? (_adminProducts.find(p => p.id === Number(id)) || {}).reviewCount || 0 : 0,
    };

    if (!data.name || !data.manufacturer || !data.price) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    const saveBtn = document.getElementById('save-medicine-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
        if (id) {
            await updateProduct(Number(id), data);
            showToast('Medicine updated successfully', 'success');
        } else {
            // 1. Create the new drug product record in the database
            const created = await addProduct(data);

            // 2. Automatically provision its matching initial stock entry in the inventory
            if (created && created.id) {
                try {
                    await createInventory(
                        created.id,
                        data.stock || 0,
                        data.reorderLevel || 10,
                        data.expiryDate || null
                    );
                } catch (invErr) {
                    console.error("Failed to provision initial inventory entry:", invErr);
                    // Silently catch so the app flow doesn't break if an inventory row is already present
                }
            }
            showToast('Medicine and initial stock added successfully', 'success');
        }
        closeMedicinePanel();
        await loadMedicinesTab();
    } catch (err) {
        showToast('Failed to save medicine: ' + err.message, 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Medicine'; }
    }
}

function confirmDeleteMedicine(id, name) {
    openConfirmModal(
        'Delete Medicine',
        `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>? This action cannot be undone.`,
        async () => {
            try {
                await deleteProduct(id);
                showToast('Medicine deleted', 'success');
                await loadMedicinesTab();
            } catch (err) {
                showToast('Failed to delete medicine', 'error');
            }
        }
    );
}

/* ════════════════════════════════════════════════════════════
   INVENTORY TAB
   ════════════════════════════════════════════════════════════ */

let _inventoryData = [];
let _inventoryFilter = 'all';

async function loadInventoryTab() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _inventoryData = await getAllInventory();
        renderInventoryTable();
    } catch {
        showToast('Failed to load inventory', 'error');
    }

    // Filter tabs
    document.querySelectorAll('.inventory-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.inventory-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _inventoryFilter = btn.dataset.filter;
            renderInventoryTable();
        };
    });
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    const today = new Date();

    let data = _inventoryData;
    if (_inventoryFilter === 'low') data = data.filter(i => i.quantity <= i.reorderLevel && new Date(i.expiryDate) >= today);
    else if (_inventoryFilter === 'expired') data = data.filter(i => new Date(i.expiryDate) < today);

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#666">No items match this filter.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const expired = new Date(item.expiryDate) < today;
        const low = item.quantity <= item.reorderLevel && !expired;
        const rowClass = expired ? 'table-row-expired' : low ? 'table-row-low' : '';
        const status = expired ? '<span class="badge badge-error">Expired</span>'
            : low ? '<span class="badge badge-warning">Low Stock</span>'
                : '<span class="badge badge-success">Healthy</span>';

        return `
      <tr class="${rowClass}">
        <td style="font-weight:500">${escapeHtml(item.medicineName)}</td>
        <td>
          <span class="editable-cell" id="qty-cell-${item.medicineId}"
            onclick="makeQtyEditable(${item.medicineId}, ${item.quantity})"
            title="Click to edit">
            ${item.quantity}
          </span>
        </td>
        <td>${item.reorderLevel}</td>
        <td>${formatDate(item.expiryDate)}</td>
        <td>${status}</td>
        <td>${formatDate(item.lastUpdated)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="makeQtyEditable(${item.medicineId}, ${item.quantity})">Update Stock</button>
        </td>
      </tr>`;
    }).join('');
}

function makeQtyEditable(medicineId, currentQty) {
    const cell = document.getElementById(`qty-cell-${medicineId}`);
    if (!cell || cell.querySelector('input')) return;
    cell.innerHTML = `
    <input class="inline-input" type="number" value="${currentQty}" min="0"
      id="inline-qty-${medicineId}" aria-label="Update stock quantity">
    <button class="btn btn-success btn-sm" style="margin-left:6px" onclick="saveInlineQty(${medicineId})">✓</button>
    <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="cancelInlineQty(${medicineId}, ${currentQty})">✕</button>
  `;
    const input = document.getElementById(`inline-qty-${medicineId}`);
    if (input) { input.focus(); input.select(); }
}

function cancelInlineQty(medicineId, originalQty) {
    const cell = document.getElementById(`qty-cell-${medicineId}`);
    if (cell) cell.innerHTML = `${originalQty}`;
    // Re-attach click event
    if (cell) cell.onclick = () => makeQtyEditable(medicineId, originalQty);
}

async function saveInlineQty(medicineId) {
    const input = document.getElementById(`inline-qty-${medicineId}`);
    if (!input) return;
    const newQty = Number(input.value);
    if (isNaN(newQty) || newQty < 0) { showToast('Please enter a valid quantity', 'warning'); return; }
    try {
        await updateInventoryStock(medicineId, newQty);
        showToast('Stock updated', 'success');
        await loadInventoryTab();
    } catch (err) {
        showToast('No inventory record found for this medicine. Add one via the Inventory section first.', 'error');
    }
}

/* ════════════════════════════════════════════════════════════
   ORDERS TAB
   ════════════════════════════════════════════════════════════ */

let _adminOrders = [];
let _adminOrderFilter = 'All';

async function loadOrdersTab() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminOrders = await getAllOrders();
        renderOrdersTable();
    } catch {
        showToast('Failed to load orders', 'error');
    }

    document.querySelectorAll('.orders-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.orders-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _adminOrderFilter = btn.dataset.status;
            renderOrdersTable();
        };
    });
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const filtered = _adminOrderFilter === 'All' ? _adminOrders : _adminOrders.filter(o => o.status === _adminOrderFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#666">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const itemSummary = order.items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')
            + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');

        return `
      <tr>
        <td><strong>#${order.id}</strong></td>
        <td>${formatDate(order.orderDate)}</td>
        <td class="text-sm" style="max-width:180px;white-space:normal">${escapeHtml(itemSummary)}</td>
        <td>Rs. ${order.totalPrice.toLocaleString()}</td>
        <td>${renderOrderStatusBadge(order.status)}</td>
        <td>
          <select class="form-control" style="padding:4px 8px;font-size:13px;min-width:130px"
            onchange="handleUpdateOrderStatus(${order.id}, this.value)" aria-label="Update order status">
            ${['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s =>
            `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="toggleAdminOrderDetail(${order.id})">Details ›</button>
        </td>
      </tr>
      <tr id="admin-order-detail-${order.id}" style="display:none">
        <td colspan="8" style="background:var(--background);padding:16px 24px">
          <strong>Items:</strong>
          <table style="width:100%;margin-top:8px;font-size:13px;border-collapse:collapse">
            ${order.items.map(i => `
              <tr>
                <td style="padding:4px 8px">${escapeHtml(i.name)}</td>
                <td style="padding:4px 8px">×${i.quantity}</td>
                <td style="padding:4px 8px">Rs. ${i.unitPrice.toLocaleString()}</td>
                <td style="padding:4px 8px">Rs. ${i.subtotal.toLocaleString()}</td>
              </tr>`).join('')}
          </table>
          <div style="margin-top:12px;font-size:13px;color:#666">
            📍 ${escapeHtml(order.deliveryAddress || '')}
            ${order.notes ? `· Notes: ${escapeHtml(order.notes)}` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
}

function toggleAdminOrderDetail(id) {
    const row = document.getElementById(`admin-order-detail-${id}`);
    if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

async function handleUpdateOrderStatus(orderId, status) {
    try {
        await updateOrderStatus(orderId, status);
        const order = _adminOrders.find(o => o.id === orderId);
        if (order) order.status = status;
        renderOrdersTable();
        showToast(`Order #${orderId} status updated to ${status}`, 'success');
    } catch {
        showToast('Failed to update order status', 'error');
    }
}

/* ════════════════════════════════════════════════════════════
   PAYMENTS TAB
   ════════════════════════════════════════════════════════════ */

let _adminPayments = [];
let _paymentsFilter = 'All';

async function loadPaymentsTab() {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminPayments = await getAllPayments();
        renderPaymentsTable();
    } catch {
        showToast('Failed to load payments', 'error');
    }

    document.querySelectorAll('.payments-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.payments-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _paymentsFilter = btn.dataset.status;
            renderPaymentsTable();
        };
    });
}

function renderPaymentsTable() {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    const filtered = _paymentsFilter === 'All' ? _adminPayments : _adminPayments.filter(p => p.status === _paymentsFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#666">No payments found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.id)}</strong></td>
      <td>#${p.orderId}</td>
      <td>${escapeHtml(p.customerName || '—')}</td>
      <td>Rs. ${p.amount.toLocaleString()}</td>
      <td><span class="badge badge-secondary">${escapeHtml(p.method)}</span></td>
      <td>${renderPaymentStatusBadge(p.status)}</td>
      <td>${p.paymentDate ? formatDateTime(p.paymentDate) : '—'}</td>
      <td>
        ${p.status === 'PENDING' ? `
          <button class="btn btn-success btn-sm" onclick="handleMarkPaymentComplete('${p.id}')">✓ Mark Completed</button>` : ''}
        ${p.status === 'COMPLETED' ? `
          <button class="btn btn-ghost btn-sm" onclick="handleRefundPayment('${p.id}')">↩ Refund</button>` : ''}
      </td>
    </tr>`).join('');
}

async function handleMarkPaymentComplete(paymentId) {
    try {
        await updatePaymentStatus(paymentId, 'COMPLETED');
        const payment = _adminPayments.find(p => p.id === paymentId);
        if (payment) { payment.status = 'COMPLETED'; payment.paymentDate = new Date().toISOString(); }
        renderPaymentsTable();
        showToast('Payment marked as completed', 'success');
    } catch {
        showToast('Failed to update payment', 'error');
    }
}

async function handleRefundPayment(paymentId) {
    try {
        await updatePaymentStatus(paymentId, 'REFUNDED');
        const payment = _adminPayments.find(p => p.id === paymentId);
        if (payment) payment.status = 'REFUNDED';
        renderPaymentsTable();
        showToast('Payment marked as refunded', 'success');
    } catch {
        showToast('Failed to update payment', 'error');
    }
}

/* ════════════════════════════════════════════════════════════
   PRESCRIPTIONS TAB
   ════════════════════════════════════════════════════════════ */

let _adminPrescriptions = [];

async function loadPrescriptionsTab() {
    const tbody = document.getElementById('prescriptions-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminPrescriptions = await getAllPrescriptions();
        renderPrescriptionsTable();
    } catch {
        showToast('Failed to load prescriptions', 'error');
    }
}

function renderPrescriptionsTable() {
    const tbody = document.getElementById('prescriptions-table-body');
    if (!tbody) return;

    if (_adminPrescriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#666">No prescriptions found.</td></tr>';
        return;
    }

    tbody.innerHTML = _adminPrescriptions.map(rx => `
    <tr>
      <td><strong>${escapeHtml(rx.id)}</strong></td>
      <td>${escapeHtml(rx.customerName || '—')}</td>
      <td>${escapeHtml(rx.medicineName)}</td>
      <td>Dr. ${escapeHtml(rx.doctorName)}</td>
      <td>${formatDate(rx.issueDate)}</td>
      <td>${formatDate(rx.expiryDate)}</td>
      <td>
        <a class="file-preview-link" href="#" onclick="showToast('File preview not available in demo', 'info');return false"
          aria-label="View prescription file">
          📎 ${escapeHtml(rx.fileName)}
        </a>
      </td>
      <td>${renderPrescriptionStatusBadge(rx.status)}</td>
      <td>
        <div class="table-actions">
          ${rx.status === 'PENDING' ? `
            <button class="btn btn-success btn-sm" onclick="handleApprovePrescription('${rx.id}')">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="handleRejectPrescription('${rx.id}')">✕ Reject</button>` : ''}
          ${rx.status !== 'PENDING' ? `<span class="text-secondary text-sm">Reviewed</span>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

async function handleApprovePrescription(rxId) {
    try {
        await updatePrescriptionStatus(rxId, 'APPROVED');
        const rx = _adminPrescriptions.find(p => p.id === rxId);
        if (rx) rx.status = 'APPROVED';
        renderPrescriptionsTable();
        showToast('Prescription approved', 'success');
    } catch {
        showToast('Failed to approve prescription', 'error');
    }
}

async function handleRejectPrescription(rxId) {
    openConfirmModal(
        'Reject Prescription',
        'Are you sure you want to reject this prescription? The customer will be notified to resubmit.',
        async () => {
            try {
                await updatePrescriptionStatus(rxId, 'REJECTED', 'Please resubmit a valid, legible prescription.');
                const rx = _adminPrescriptions.find(p => p.id === rxId);
                if (rx) rx.status = 'REJECTED';
                renderPrescriptionsTable();
                showToast('Prescription rejected', 'info');
            } catch {
                showToast('Failed to reject prescription', 'error');
            }
        }
    );
}

/* ════════════════════════════════════════════════════════════
   REVIEWS TAB
   ════════════════════════════════════════════════════════════ */

let _adminReviews = [];

async function loadReviewsTab() {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminReviews = await getAllReviews();
        renderReviewsTable();
    } catch {
        showToast('Failed to load reviews', 'error');
    }
}

function renderReviewsTable() {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;

    if (_adminReviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#666">No reviews found.</td></tr>';
        return;
    }

    tbody.innerHTML = _adminReviews.map(r => `
    <tr>
      <td style="max-width:180px;white-space:normal;font-weight:500">${escapeHtml(truncate(r.medicineName, 30))}</td>
      <td>${escapeHtml(r.username)}</td>
      <td>${renderStars(r.rating)} <span class="text-secondary">(${r.rating})</span></td>
      <td style="max-width:240px;white-space:normal">${escapeHtml(truncate(r.comment, 80))}</td>
      <td>${formatDate(r.date)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteReview(${r.id})">🗑️ Delete</button>
      </td>
    </tr>`).join('');
}

async function handleDeleteReview(reviewId) {
    openConfirmModal(
        'Delete Review',
        'Are you sure you want to delete this review?',
        async () => {
            try {
                await deleteReview(reviewId);
                _adminReviews = _adminReviews.filter(r => r.id !== reviewId);
                renderReviewsTable();
                showToast('Review deleted', 'success');
            } catch {
                showToast('Failed to delete review', 'error');
            }
        }
    );
}

/* ════════════════════════════════════════════════════════════
   USERS TAB
   ════════════════════════════════════════════════════════════ */

let _adminUsers = [];

async function loadUsersTab() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px"><div class="spinner" style="margin:auto"></div></td></tr>`;

    try {
        _adminUsers = await getAllUsers();
        renderUsersTable();
    } catch {
        showToast('Failed to load users', 'error');
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (_adminUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#666">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = _adminUsers.map(u => `
    <tr>
      <td><span class="text-secondary">#${u.id}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">
            ${(u.fullName || u.username || '?')[0].toUpperCase()}
          </div>
          <span style="font-weight:500">${escapeHtml(u.fullName || u.username)}</span>
        </div>
      </td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.phone || '—')}</td>
      <td>
        <select class="form-control" style="padding:4px 8px;font-size:13px;min-width:140px"
          onchange="handleUpdateUserRole(${u.id}, this.value)" aria-label="Change user role">
          ${['CUSTOMER', 'PHARMACIST', 'ADMIN'].map(role =>
        `<option value="${role}" ${u.role === role ? 'selected' : ''}>${role}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteUser(${u.id}, '${escapeHtml(u.username)}')">🗑️ Delete</button>
      </td>
    </tr>`).join('');
}

async function handleUpdateUserRole(userId, role) {
    try {
        await updateUserRole(userId, role);
        const user = _adminUsers.find(u => u.id === userId);
        if (user) user.role = role;
        showToast('User role updated', 'success');
    } catch {
        showToast('Failed to update user role', 'error');
    }
}

function handleDeleteUser(userId, username) {
    openConfirmModal(
        'Delete User',
        `Are you sure you want to delete user <strong>${escapeHtml(username)}</strong>? This cannot be undone.`,
        async () => {
            try {
                await deleteUser(userId);
                _adminUsers = _adminUsers.filter(u => u.id !== userId);
                renderUsersTable();
                showToast('User deleted', 'success');
            } catch {
                showToast('Failed to delete user', 'error');
            }
        }
    );
}

/* ════════════════════════════════════════════════════════════
   SHARED: CONFIRM MODAL
   ════════════════════════════════════════════════════════════ */

let _confirmCallback = null;

/**
 * Open a generic confirmation modal
 * @param {string} title
 * @param {string} bodyHtml
 * @param {Function} onConfirm
 */
function openConfirmModal(title, bodyHtml, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');
    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    _confirmCallback = onConfirm;
    modal.classList.add('open');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('open');
    _confirmCallback = null;
}

function executeConfirm() {
    if (typeof _confirmCallback === 'function') _confirmCallback();
    closeConfirmModal();
}