/* ============================================================
   FurniFrenzy — frontend app
   Wires the static page to the Express + SQLite backend.
   ============================================================ */

const API = ''; // same origin — backend features unavailable on static hosting
const LS_TOKEN = 'ff_token';
const LS_USER = 'ff_user';
const LS_CART = 'ff_cart';

// ---------- State ----------
const state = {
    token: localStorage.getItem(LS_TOKEN) || null,
    user: JSON.parse(localStorage.getItem(LS_USER) || 'null'),
    products: [],
    cart: JSON.parse(localStorage.getItem(LS_CART) || '[]'),
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
    state.user = user;
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USER, JSON.stringify(user));
    renderUserNav();
}

function logout() {
    state.token = null;
    state.user = null;
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
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3200);
}

// ---------- Static data (replaces backend API for GitHub Pages hosting) ----------
const STATIC_PRODUCTS = [
    { id: 1, name: 'Modern Lounge Chair', slug: 'modern-lounge-chair', price: 220.00, old_price: 280.00, image: 'pic2.png', tag: 'New', rating: 4.6, rating_count: 128, stock: 24, category: 'Chairs' },
    { id: 2, name: 'Designer Accent Chair', slug: 'designer-accent-chair', price: 185.00, old_price: 219.00, image: 'pic3.png', tag: 'Sale', rating: 5.0, rating_count: 94, stock: 18, category: 'Chairs' },
    { id: 3, name: 'Premium Wooden Chair', slug: 'premium-wooden-chair', price: 249.00, old_price: null, image: 'pic4.png', tag: 'Hot', rating: 4.2, rating_count: 62, stock: 12, category: 'Chairs' },
];

const STATIC_BLOG = [
    { id: 1, title: 'First Time Home Owner Ideas', image: 'pic6.jpg', category: 'Inspiration', author: 'Kristin Watson', published_at: '2021-12-19' },
    { id: 2, title: 'How To Keep Your Furniture Clean', image: 'pic7.jpg', category: 'Guide', author: 'Robert Fox', published_at: '2021-12-15' },
    { id: 3, title: 'Small Space Furniture Apartment Ideas', image: 'pic8.jpg', category: 'Tips', author: 'Kristin Watson', published_at: '2021-12-12' },
];

// ---------- Products ----------
async function loadProducts() {
    state.products = STATIC_PRODUCTS;
    renderProducts();
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
        const tagHtml = p.tag ? `<span class="product-tag ${tagClass}">${p.tag === 'Sale' ? '-15%' : p.tag}</span>` : '';
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
                        <div class="product-rating">
                            ${starHtml(p.rating)}
                            <span>(${p.rating_count})</span>
                        </div>
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
    const grid = $('#blogGrid');
    grid.innerHTML = STATIC_BLOG.map(p => `
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
    return state.cart
        .map(i => {
            const p = state.products.find(p => p.id === i.id);
            return p ? { ...p, quantity: i.quantity } : null;
        })
        .filter(Boolean);
}

function cartTotal() {
    return cartItemsDetailed().reduce((s, i) => s + i.price * i.quantity, 0);
}

function cartCount() {
    return state.cart.reduce((s, i) => s + i.quantity, 0);
}

function renderCartCount() {
    const el = $('#cartCount');
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
    const header = $('#cartHeaderCount');
    if (header) header.textContent = `(${count})`;
}

function renderCart() {
    const items = cartItemsDetailed();
    const body = $('#cartItems');
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
    $('#cartTotal').textContent = fmt(total + shipping);
    footer.hidden = false;
}

// ---------- Drawer / modals ----------
function openCart() {
    $('#cartDrawer').classList.add('open');
    $('#drawerOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeCart() {
    $('#cartDrawer').classList.remove('open');
    $('#drawerOverlay').classList.remove('show');
    document.body.style.overflow = '';
}
function openModal(id) {
    $('#' + id).classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeAllModals() {
    $$('.modal-overlay').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
}

// ---------- Auth UI ----------
function renderUserNav() {
    const item = $('#userNavItem');
    if (state.user) {
        item.innerHTML = `
            <a class="nav-link" href="#" data-action="user-menu" aria-label="Account">
                <i class="fa-solid fa-circle-user"></i>
            </a>
            <div class="user-menu" id="userMenu" hidden>
                <div class="user-menu-header">
                    <strong>${state.user.name}</strong>
                    <span>${state.user.email}</span>
                </div>
                <button data-action="my-orders"><i class="fa-solid fa-box me-2"></i>My orders</button>
                <button data-action="logout"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Sign out</button>
            </div>`;
    } else {
        item.innerHTML = `<a class="nav-link" href="#" data-action="open-auth" aria-label="Account"><i class="fa-solid fa-user"></i></a>`;
    }
}

// ---------- Forms ----------
function bindForms() {
    const DEMO_MSG = 'This feature requires the backend server. This is a static demo.';

    // Newsletter
    $('#newsletterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        toast('Thanks for subscribing! (demo mode — no backend)', 'success');
        e.target.reset();
    });

    // Login
    $('#loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        toast(DEMO_MSG, 'info');
    });

    // Register
    $('#registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        toast(DEMO_MSG, 'info');
    });

    // Contact
    $('#contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        toast('Message received! (demo mode — no backend)', 'success');
        e.target.reset();
        closeAllModals();
    });

    // Checkout
    $('#checkoutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        state.cart = [];
        saveCart();
        closeAllModals();
        toast('Order placed! (demo mode — no backend)', 'success');
    });

    // Auth tabs
    $$('.modal-tabs .tab').forEach(t => {
        t.addEventListener('click', () => {
            $$('.modal-tabs .tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const which = t.dataset.tab;
            $('#loginForm').hidden = which !== 'login';
            $('#registerForm').hidden = which !== 'register';
        });
    });
}

// ---------- Global click delegation ----------
function bindGlobalClicks() {
    document.addEventListener('click', async (e) => {
        const trg = e.target.closest('[data-action]');
        if (!trg) {
            // Close user menu when clicking elsewhere
            const menu = $('#userMenu');
            if (menu && !e.target.closest('#userNavItem')) menu.hidden = true;
            return;
        }
        const action = trg.dataset.action;
        const id = trg.dataset.id ? Number(trg.dataset.id) : null;

        switch (action) {
            case 'open-cart': e.preventDefault(); openCart(); break;
            case 'close-cart': closeCart(); break;
            case 'open-auth':
                e.preventDefault();
                if (state.user) {
                    const menu = $('#userMenu');
                    if (menu) menu.hidden = !menu.hidden;
                } else openModal('authModal');
                break;
            case 'user-menu': {
                e.preventDefault();
                const menu = $('#userMenu');
                if (menu) menu.hidden = !menu.hidden;
                break;
            }
            case 'open-contact': e.preventDefault(); closeAllModals(); openModal('contactModal'); break;
            case 'close-modal': closeAllModals(); break;
            case 'checkout':
                if (state.cart.length === 0) { toast('Your cart is empty', 'info'); return; }
                if (!state.token) { closeCart(); openModal('authModal'); toast('Sign in to checkout', 'info'); return; }
                $('#checkoutTotal').textContent = fmt(cartTotal() + (cartTotal() >= 150 ? 0 : 12));
                closeCart();
                openModal('checkoutModal');
                break;
            case 'qty-plus': updateQty(id, +1); break;
            case 'qty-minus': updateQty(id, -1); break;
            case 'remove': removeFromCart(id); break;
            case 'logout': logout(); closeAllModals(); break;
            case 'my-orders':
                e.preventDefault();
                if (!state.token) { openModal('authModal'); return; }
                openModal('ordersModal');
                loadOrders();
                break;
        }

        // Wishlist toggle
        if (trg.classList.contains('wishlist')) {
            trg.querySelector('i').classList.toggle('fa-regular');
            trg.querySelector('i').classList.toggle('fa-solid');
            toast('Wishlist updated', 'info');
        }
        // Add to cart
        if (trg.classList.contains('quick-add') && id) addToCart(id);
    });

    // Close drawer/modal on overlay click
    $('#drawerOverlay').addEventListener('click', closeCart);
    $$('.modal-overlay').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) closeAllModals(); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeCart(); closeAllModals(); }
    });
}

async function loadOrders() {
    const list = $('#ordersList');
    list.innerHTML = '<p class="muted">No orders yet.</p>';
}

// ---------- Reveal animations ----------
let revealObserver;
function observeReveals() {
    if (!revealObserver) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
    }
    $$('.reveal:not(.in-view)').forEach(el => revealObserver.observe(el));
}

// ---------- Navbar / smooth scroll / back-to-top ----------
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
            if (id.length > 1) {
                const el = document.querySelector(id);
                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            }
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

    // Token verification skipped — no backend available on static hosting
});
