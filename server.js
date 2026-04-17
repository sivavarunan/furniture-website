const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'furnifrenzy-secret-change-in-prod';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'page.html')));

// ---------- Static data ----------
const PRODUCTS = [
    { id: 1, name: 'Modern Lounge Chair', slug: 'modern-lounge-chair', description: 'A contemporary lounge chair with plush upholstery and solid oak legs. Designed for unmatched comfort and style.', price: 220.00, old_price: 280.00, image: 'pic2.png', tag: 'New', rating: 4.6, rating_count: 128, stock: 24, category: 'Chairs' },
    { id: 2, name: 'Designer Accent Chair', slug: 'designer-accent-chair', description: 'Statement-making accent chair with sculpted curves and premium fabric upholstery.', price: 185.00, old_price: 219.00, image: 'pic3.png', tag: 'Sale', rating: 5.0, rating_count: 94, stock: 18, category: 'Chairs' },
    { id: 3, name: 'Premium Wooden Chair', slug: 'premium-wooden-chair', description: 'Solid wood frame, ergonomic profile, and a timeless silhouette that fits any room.', price: 249.00, old_price: null, image: 'pic4.png', tag: 'Hot', rating: 4.2, rating_count: 62, stock: 12, category: 'Chairs' },
];

const BLOG_POSTS = [
    { id: 1, title: 'First Time Home Owner Ideas', slug: 'first-time-home-owner-ideas', excerpt: 'Essentials for setting up your first place with style and comfort.', image: 'pic6.jpg', category: 'Inspiration', author: 'Kristin Watson', published_at: '2021-12-19' },
    { id: 2, title: 'How To Keep Your Furniture Clean', slug: 'how-to-keep-furniture-clean', excerpt: 'Practical tips to maintain your furniture and extend its lifespan.', image: 'pic7.jpg', category: 'Guide', author: 'Robert Fox', published_at: '2021-12-15' },
    { id: 3, title: 'Small Space Furniture Apartment Ideas', slug: 'small-space-apartment-ideas', excerpt: 'Smart layouts and dual-purpose pieces for compact living.', image: 'pic8.jpg', category: 'Tips', author: 'Kristin Watson', published_at: '2021-12-12' },
];

// ---------- In-memory stores ----------
const users = [];
const orders = [];
const newsletter = new Set();
const contacts = [];
let nextUserId = 1;
let nextOrderId = 1;

// ---------- Helpers ----------
function signToken(user) {
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function isEmail(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !isEmail(email) || !password || password.length < 6) {
        return res.status(400).json({ error: 'Name, valid email and password (min 6 chars) are required.' });
    }
    if (users.find(u => u.email === email.toLowerCase())) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = { id: nextUserId++, name: name.trim(), email: email.toLowerCase(), password_hash: hash };
    users.push(user);
    const safe = { id: user.id, name: user.name, email: user.email };
    res.json({ token: signToken(safe), user: safe });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!isEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const safe = { id: user.id, name: user.name, email: user.email };
    res.json({ token: signToken(safe), user: safe });
});

app.get('/api/auth/me', authRequired, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// ---------- Products ----------
app.get('/api/products', (req, res) => res.json({ products: PRODUCTS }));
app.get('/api/products/:id', (req, res) => {
    const product = PRODUCTS.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
});

// ---------- Blog ----------
app.get('/api/blog', (req, res) => res.json({ posts: BLOG_POSTS }));

// ---------- Newsletter ----------
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
    const lower = email.toLowerCase();
    if (newsletter.has(lower)) return res.json({ ok: true, message: "You're already subscribed — thanks!" });
    newsletter.add(lower);
    res.json({ ok: true, message: 'Subscribed! Check your inbox for a 10% off code.' });
});

// ---------- Contact ----------
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !isEmail(email) || !message) {
        return res.status(400).json({ error: 'Name, valid email and message are required.' });
    }
    contacts.push({ name: name.trim(), email: email.toLowerCase(), subject: (subject || '').trim(), message: message.trim(), created_at: new Date().toISOString() });
    res.json({ ok: true, message: "Thanks! We'll get back to you shortly." });
});

// ---------- Orders ----------
app.post('/api/orders', authRequired, (req, res) => {
    const { items, shipping } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty.' });
    if (!shipping?.name || !shipping?.address || !shipping?.city || !shipping?.zip) {
        return res.status(400).json({ error: 'Complete shipping details are required.' });
    }
    let total = 0;
    const orderItems = [];
    for (const item of items) {
        const product = PRODUCTS.find(p => p.id === Number(item.id));
        if (!product) return res.status(400).json({ error: `Product ${item.id} not found` });
        const qty = Math.max(1, Number(item.quantity) || 1);
        total += product.price * qty;
        orderItems.push({ product_id: product.id, name: product.name, image: product.image, quantity: qty, price: product.price });
    }
    const order = { id: nextOrderId++, user_id: req.user.id, total, items: orderItems, shipping, status: 'pending', created_at: new Date().toISOString() };
    orders.push(order);
    res.json({ ok: true, orderId: order.id, total: order.total });
});

app.get('/api/orders', authRequired, (req, res) => {
    const userOrders = orders.filter(o => o.user_id === req.user.id).reverse();
    res.json({ orders: userOrders });
});

// ---------- 404 for API ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Start ----------
if (require.main === module) {
    app.listen(PORT, () => console.log(`\n  FurniFrenzy running → http://localhost:${PORT}\n`));
}

module.exports = app;
