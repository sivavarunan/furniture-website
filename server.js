const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'furnifrenzy-dev-secret-change-me';
const JWT_EXPIRES = '7d';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Static frontend
app.use(express.static(__dirname, { extensions: ['html'] }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'page.html')));

// ---------- Helpers ----------
function signToken(user) {
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function isEmail(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ---------- Auth ----------
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !isEmail(email) || !password || password.length < 6) {
        return res.status(400).json({ error: 'Name, valid email and password (min 6 chars) are required.' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name.trim(), email.toLowerCase(), hash);
    const user = { id: result.lastInsertRowid, name: name.trim(), email: email.toLowerCase() };
    res.json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!isEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const safe = { id: user.id, name: user.name, email: user.email };
    res.json({ token: signToken(safe), user: safe });
});

app.get('/api/auth/me', authRequired, (req, res) => {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

// ---------- Products ----------
app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
    res.json({ products });
});

app.get('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
});

// ---------- Blog ----------
app.get('/api/blog', (req, res) => {
    const posts = db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC').all();
    res.json({ posts });
});

// ---------- Newsletter ----------
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
    try {
        db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email.toLowerCase());
        res.json({ ok: true, message: 'Subscribed! Check your inbox for a 10% off code.' });
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) {
            return res.json({ ok: true, message: "You're already subscribed — thanks!" });
        }
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// ---------- Contact ----------
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !isEmail(email) || !message) {
        return res.status(400).json({ error: 'Name, valid email and message are required.' });
    }
    db.prepare('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)')
        .run(name.trim(), email.toLowerCase(), (subject || '').trim(), message.trim());
    res.json({ ok: true, message: "Thanks! We'll get back to you shortly." });
});

// ---------- Orders ----------
app.post('/api/orders', authRequired, (req, res) => {
    const { items, shipping } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty.' });
    }
    if (!shipping || !shipping.name || !shipping.address || !shipping.city || !shipping.zip) {
        return res.status(400).json({ error: 'Complete shipping details are required.' });
    }

    const productStmt = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
    const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
    const insertOrder = db.prepare(`
        INSERT INTO orders (user_id, total, shipping_name, shipping_address, shipping_city, shipping_zip)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)
    `);

    try {
        const result = db.transaction(() => {
            let total = 0;
            const validated = [];
            for (const item of items) {
                const pid = Number(item.id);
                const qty = Math.max(1, Number(item.quantity) || 1);
                const product = productStmt.get(pid);
                if (!product) throw new Error(`Product ${pid} not found`);
                if (product.stock < qty) throw new Error(`${product.name} is out of stock`);
                validated.push({ product, qty });
                total += product.price * qty;
            }
            const orderRes = insertOrder.run(
                req.user.id, total,
                shipping.name.trim(), shipping.address.trim(),
                shipping.city.trim(), shipping.zip.trim()
            );
            const orderId = orderRes.lastInsertRowid;
            for (const v of validated) {
                insertItem.run(orderId, v.product.id, v.qty, v.product.price);
                const r = decStock.run(v.qty, v.product.id, v.qty);
                if (r.changes === 0) throw new Error(`${v.product.name} is out of stock`);
            }
            return { orderId, total };
        })();
        res.json({ ok: true, orderId: result.orderId, total: result.total, message: 'Order placed successfully!' });
    } catch (e) {
        res.status(400).json({ error: e.message || 'Could not place order.' });
    }
});

app.get('/api/orders', authRequired, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    const itemStmt = db.prepare(`
        SELECT oi.*, p.name, p.image FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
    `);
    for (const o of orders) o.items = itemStmt.all(o.id);
    res.json({ orders });
});

// ---------- 404 for API ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Start ----------
app.listen(PORT, () => {
    console.log(`\n  FurniFrenzy server running`);
    console.log(`  → http://localhost:${PORT}\n`);
});
