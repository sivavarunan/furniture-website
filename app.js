/* ============================================================
   FurniFrenzy — frontend app
   ============================================================ */

const API = '';
const LS_TOKEN = 'ff_token';
const LS_USER  = 'ff_user';
const LS_CART  = 'ff_cart';

// ---------- State ----------
const state = {
    token:    localStorage.getItem(LS_TOKEN) || null,
    user:     JSON.parse(localStorage.getItem(LS_USER) || 'null'),
    products: [],
    cart:     JSON.parse(localStorage.getItem(LS_CART) || '[]'),
};

// ---------- Tiny helpers ----------
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const fmt = (n) => `$${Number(n).toFixed(2)}`;

async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(API + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

function saveCart() {
    localStorage.setItem(LS_CART, JSON.stringify(state.cart));
    renderCartCount();
    renderCart();
}

function saveAuth(token, user) {
    state.token = token;
    state.user  = user;
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USER, JSON.stringify(user));
    renderUserNav();
}

function logout() {
    state.token = null;
    state.user  = null;
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    renderUserNav();
    toast('Signed out');
}

// ---------- Toasts ----------
function toast(message, type = 'info') {
    const container = $('#toastContainer');
    const el = document.createElement('div');
    el.className = `toast-msg toast-${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i><span>${message}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
}

// ---------- Products ----------
async function loadProducts() {
    try {
        const { products } = await api('/api/products');
        state.products = products;
        renderProducts();
    } catch (e) {
        $('#productsGrid').innerHTML = `<div class="col-12 text-center text-danger py-5">Failed to load products: ${e.message}</div>`;
    }
}

function starHtml(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="fa-solid fa-star"></i>';
    if (half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<i class="fa-regular fa-star"></i>';
    return html;
}

function renderProducts() {
    const grid = $('#productsGrid');
    if (!state.products.length) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No products yet.</div>';
        return;
    }
    grid.innerHTML = state.products.map(p => {
        const tagClass = p.tag === 'Sale' ? 'tag-sale' : p.tag === 'Hot' ? 'tag-hot' : '';
        const tagHtml  = p.tag ? `<span class="product-tag ${tagClass}">${p.tag === 'Sale' ? '-15%' : p.tag}</span>` : '';
        const oldPrice = p.old_price ? `<span class="old-price">${fmt(p.old_price)}</span>` : '';
        return `
            <div class="col-md-4 col-sm-6">
                <article class="product-card reveal">
                    <div class="product-media">
                        ${tagHtml}
                        <button class="wishlist" data-id="${p.id}" aria-label="Add to wishlist"><i class="fa-regular fa-heart"></i></button>
                        <img src="${p.image}" alt="${p.name}">
                        <button class="quick-add" data-id="${p.id}"><i class="fa-solid fa-plus me-2"></i>Add to cart</button>
                    </div>
                    <div class="product-info">
                        <div class="product-rating">${starHtml(p.rating)}<span>(${p.rating_count})</span></div>
                        <h5>${p.name}</h5>
                        <p class="price">${fmt(p.price)} ${oldPrice}</p>
                    </div>
                </article>
            </div>`;
    }).join('');
    observeReveals();
}

// ---------- Blog ----------
async function loadBlog() {
    try {
        const { posts } = await api('/api/blog');
        const grid = $('#blogGrid');
        grid.innerHTML = posts.map(p => `
            <div class="col-md-4">
                <article class="blog-card reveal">
                    <div class="blog-media">
                        <img src="${p.image}" alt="${p.title}">
                        <span class="blog-cat">${p.category}</span>
                    </div>
                    <div class="blog-body">
                        <h5>${p.title}</h5>
                        <p class="blog-meta">by ${p.author} · ${new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <a href="#" class="blog-link">Read article <i class="fa-solid fa-arrow-right ms-1"></i></a>
                    </div>
                </article>
            </div>
        `).join('');
        observeReveals();
    } catch {
        $('#blogGrid').innerHTML = `<div class="col-12 text-center text-danger py-5">Failed to load articles.</div>`;
    }
}

// ---------- Cart ----------
function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    const existing = state.cart.find(i => i.id === productId);
    if (existing) existing.quantity += 1;
    else state.cart.push({ id: productId, quantity: 1 });
    saveCart();
    toast(`${product.name} added to cart`, 'success');
}

function updateQty(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) state.cart = state.cart.filter(i => i.id !== productId);
    saveCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    saveCart();
}

function cartItemsDetailed() {
    return state.cart.map(i => {
        const p = state.products.find(p => p.id === i.id);
        return p ? { ...p, quantity: i.quantity } : null;
    }).filter(Boolean);
}

function cartTotal()  { return cartItemsDetailed().reduce((s, i) => s + i.price * i.quantity, 0); }
function cartCount()  { return state.cart.reduce((s, i) => s + i.quantity, 0); }

function renderCartCount() {
    const el = $('#cartCount');
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
    const header = $('#cartHeaderCount');
    if (header) header.textContent = `(${count})`;
}

function renderCart() {
    const items  = cartItemsDetailed();
    const body   = $('#cartItems');
    const footer = $('#cartFooter');
    if (items.length === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Your cart is empty</p>
                <button class="btn btn-primary-custom" data-action="close-cart">Continue shopping</button>
            </div>`;
        footer.hidden = true;
        return;
    }
    body.innerHTML = items.map(i => `
        <div class="cart-item">
            <img src="${i.image}" alt="${i.name}">
            <div class="cart-item-info">
                <h6>${i.name}</h6>
                <p class="muted">${fmt(i.price)}</p>
                <div class="qty">
                    <button data-action="qty-minus" data-id="${i.id}" aria-label="Decrease">−</button>
                    <span>${i.quantity}</span>
                    <button data-action="qty-plus" data-id="${i.id}" aria-label="Increase">+</button>
                </div>
            </div>
            <div class="cart-item-end">
                <strong>${fmt(i.price * i.quantity)}</strong>
                <button class="cart-remove" data-action="remove" data-id="${i.id}" aria-label="Remove"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    const total = cartTotal();
    const shipping = total >= 150 ? 0 : 12;
    $('#cartSubtotal').textContent = fmt(total);
    $('#cartShipping').textContent = shipping === 0 ? 'Free' : fmt(shipping);
    $('#cartTotal').textContent    = fmt(total + shipping);
    footer.hidden = false;
}

// ---------- Drawer / modals ----------
function openCart()  { $('#cartDrawer').classList.add('open'); $('#drawerOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeCart() { $('#cartDrawer').classList.remove('open'); $('#drawerOverlay').classList.remove('show'); document.body.style.overflow = ''; }
function openModal(id) { $('#' + id).classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeAllModals() { $$('.modal-overlay').forEach(m => m.classList.remove('show')); document.body.style.overflow = ''; }

// ---------- Auth UI ----------
function renderUserNav() {
    const item = $('#userNavItem');
    if (state.user) {
        item.innerHTML = `
            <a class="nav-link" href="#" data-action="user-menu" aria-label="Account"><i class="fa-solid fa-circle-user"></i></a>
            <div class="user-menu" id="userMenu" hidden>
                <div class="user-menu-header"><strong>${state.user.name}</strong><span>${state.user.email}</span></div>
                <button data-action="my-orders"><i class="fa-solid fa-box me-2"></i>My orders</button>
                <button data-action="logout"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Sign out</button>
            </div>`;
    } else {
        item.innerHTML = `<a class="nav-link" href="#" data-action="open-auth" aria-label="Account"><i class="fa-solid fa-user"></i></a>`;
    }
}

// ---------- Forms ----------
function bindForms() {
    $('#newsletterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const orig = btn.textContent;
        btn.disabled = true;
        try {
            const r = await api('/api/newsletter', { method: 'POST', body: { email: e.target.email.value.trim() } });
            toast(r.message || 'Subscribed!', 'success');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Subscribed';
            e.target.reset();
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    });

    $('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await api('/api/auth/login', { method: 'POST', body: { email: e.target.email.value, password: e.target.password.value } });
            saveAuth(data.token, data.user);
            closeAllModals();
            toast(`Welcome back, ${data.user.name}`, 'success');
        } catch (err) { toast(err.message, 'error'); }
    });

    $('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await api('/api/auth/register', { method: 'POST', body: { name: e.target.name.value, email: e.target.email.value, password: e.target.password.value } });
            saveAuth(data.token, data.user);
            closeAllModals();
            toast(`Welcome, ${data.user.name}!`, 'success');
        } catch (err) { toast(err.message, 'error'); }
    });

    $('#contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const r = await api('/api/contact', { method: 'POST', body: { name: e.target.name.value, email: e.target.email.value, subject: e.target.subject.value, message: e.target.message.value } });
            toast(r.message, 'success');
            e.target.reset();
            closeAllModals();
        } catch (err) { toast(err.message, 'error'); }
    });

    $('#checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.token) { closeAllModals(); openModal('authModal'); toast('Please sign in to place an order', 'info'); return; }
        try {
            const r = await api('/api/orders', { method: 'POST', auth: true, body: { items: state.cart, shipping: { name: e.target.name.value, address: e.target.address.value, city: e.target.city.value, zip: e.target.zip.value } } });
            state.cart = [];
            saveCart();
            closeAllModals();
            toast(`Order #${r.orderId} placed — total ${fmt(r.total)}`, 'success');
        } catch (err) { toast(err.message, 'error'); }
    });

    $$('.modal-tabs .tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.modal-tabs .tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const which = t.dataset.tab;
            $('#loginForm').hidden    = which !== 'login';
            $('#registerForm').hidden = which !== 'register';
        });
    });
}

// ---------- Global click delegation ----------
function bindGlobalClicks() {
    document.addEventListener('click', async (e) => {
        // Quick-add (no data-action — must be checked before the data-action guard)
        const quickAdd = e.target.closest('.quick-add');
        if (quickAdd) {
            const id = Number(quickAdd.dataset.id);
            if (id) addToCart(id);
            return;
        }

        // Wishlist toggle (same reason)
        const wishlistBtn = e.target.closest('.wishlist');
        if (wishlistBtn) {
            wishlistBtn.querySelector('i').classList.toggle('fa-regular');
            wishlistBtn.querySelector('i').classList.toggle('fa-solid');
            toast('Wishlist updated', 'info');
            return;
        }

        const trg = e.target.closest('[data-action]');
        if (!trg) {
            const menu = $('#userMenu');
            if (menu && !e.target.closest('#userNavItem')) menu.hidden = true;
            return;
        }
        const action = trg.dataset.action;
        const id = trg.dataset.id ? Number(trg.dataset.id) : null;

        switch (action) {
            case 'open-cart':    e.preventDefault(); openCart(); break;
            case 'close-cart':   closeCart(); break;
            case 'open-auth':
                e.preventDefault();
                if (state.user) { const m = $('#userMenu'); if (m) m.hidden = !m.hidden; }
                else openModal('authModal');
                break;
            case 'user-menu': { e.preventDefault(); const m = $('#userMenu'); if (m) m.hidden = !m.hidden; break; }
            case 'open-contact': e.preventDefault(); closeAllModals(); openModal('contactModal'); break;
            case 'close-modal':  closeAllModals(); break;
            case 'checkout':
                if (state.cart.length === 0) { toast('Your cart is empty', 'info'); return; }
                if (!state.token) { closeCart(); openModal('authModal'); toast('Sign in to checkout', 'info'); return; }
                $('#checkoutTotal').textContent = fmt(cartTotal() + (cartTotal() >= 150 ? 0 : 12));
                closeCart();
                openModal('checkoutModal');
                break;
            case 'qty-plus':  updateQty(id, +1); break;
            case 'qty-minus':  updateQty(id, -1); break;
            case 'remove':     removeFromCart(id); break;
            case 'logout':     logout(); closeAllModals(); break;
            case 'my-orders':
                e.preventDefault();
                if (!state.token) { openModal('authModal'); return; }
                openModal('ordersModal');
                loadOrders();
                break;
        }
    });

    $('#drawerOverlay').addEventListener('click', closeCart);
    $$('.modal-overlay').forEach(m => { m.addEventListener('click', (e) => { if (e.target === m) closeAllModals(); }); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); closeAllModals(); } });
}

async function loadOrders() {
    const list = $('#ordersList');
    list.innerHTML = '<p class="muted">Loading…</p>';
    try {
        const { orders } = await api('/api/orders', { auth: true });
        if (!orders.length) { list.innerHTML = '<p class="muted">No orders yet.</p>'; return; }
        list.innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-head"><strong>Order #${o.id}</strong><span class="order-date">${new Date(o.created_at).toLocaleDateString()}</span></div>
                <div class="order-items">${o.items.map(it => `<div class="order-line"><img src="${it.image}" alt=""><span>${it.name} × ${it.quantity}</span><strong>${fmt(it.price * it.quantity)}</strong></div>`).join('')}</div>
                <div class="order-foot"><span>Total</span><strong>${fmt(o.total)}</strong></div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = `<p class="text-danger">${e.message}</p>`; }
}

// ---------- Reveal animations ----------
let revealObserver;
function observeReveals() {
    if (!revealObserver) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); } });
        }, { threshold: 0.12 });
    }
    $$('.reveal:not(.in-view)').forEach(el => revealObserver.observe(el));
}

// ---------- Navbar / scroll / back-to-top ----------
function bindNav() {
    const navbar = $('#navbar');
    const backBtn = $('#backToTop');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 30);
        backBtn.classList.toggle('show', window.scrollY > 500);
    });
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    $$('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (id.length > 1) { const el = document.querySelector(id); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
        });
    });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', async () => {
    bindNav();
    bindForms();
    bindGlobalClicks();
    renderUserNav();
    renderCartCount();
    observeReveals();
    await loadProducts();
    renderCart();
    loadBlog();

    if (state.token) {
        try { const { user } = await api('/api/auth/me', { auth: true }); saveAuth(state.token, user); }
        catch { logout(); }
    }
});
