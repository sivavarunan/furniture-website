const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    old_price REAL,
    image TEXT NOT NULL,
    tag TEXT,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 100,
    category TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    shipping_name TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_zip TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    image TEXT NOT NULL,
    category TEXT,
    author TEXT,
    published_at TEXT
);
`);

// ---------- Seed ----------
const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (productCount === 0) {
    const insertProduct = db.prepare(`
        INSERT INTO products (name, slug, description, price, old_price, image, tag, rating, rating_count, stock, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedProducts = [
        {
            name: 'Modern Lounge Chair', slug: 'modern-lounge-chair',
            description: 'A contemporary lounge chair with plush upholstery and solid oak legs. Designed for unmatched comfort and style.',
            price: 220.00, old_price: 280.00, image: 'pic2.png', tag: 'New',
            rating: 4.6, rating_count: 128, stock: 24, category: 'Chairs'
        },
        {
            name: 'Designer Accent Chair', slug: 'designer-accent-chair',
            description: 'Statement-making accent chair with sculpted curves and premium fabric upholstery.',
            price: 185.00, old_price: 219.00, image: 'pic3.png', tag: 'Sale',
            rating: 5.0, rating_count: 94, stock: 18, category: 'Chairs'
        },
        {
            name: 'Premium Wooden Chair', slug: 'premium-wooden-chair',
            description: 'Solid wood frame, ergonomic profile, and a timeless silhouette that fits any room.',
            price: 249.00, old_price: null, image: 'pic4.png', tag: 'Hot',
            rating: 4.2, rating_count: 62, stock: 12, category: 'Chairs'
        }
    ];
    const insertMany = db.transaction((items) => {
        for (const p of items) {
            insertProduct.run(
                p.name, p.slug, p.description, p.price, p.old_price,
                p.image, p.tag, p.rating, p.rating_count, p.stock, p.category
            );
        }
    });
    insertMany(seedProducts);
    console.log(`[db] seeded ${seedProducts.length} products`);
}

const blogCount = db.prepare('SELECT COUNT(*) AS c FROM blog_posts').get().c;
if (blogCount === 0) {
    const insertBlog = db.prepare(`
        INSERT INTO blog_posts (title, slug, excerpt, image, category, author, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const posts = [
        ['First Time Home Owner Ideas', 'first-time-home-owner-ideas', 'Essentials for setting up your first place with style and comfort.', 'pic6.jpg', 'Inspiration', 'Kristin Watson', '2021-12-19'],
        ['How To Keep Your Furniture Clean', 'how-to-keep-furniture-clean', 'Practical tips to maintain your furniture and extend its lifespan.', 'pic7.jpg', 'Guide', 'Robert Fox', '2021-12-15'],
        ['Small Space Furniture Apartment Ideas', 'small-space-apartment-ideas', 'Smart layouts and dual-purpose pieces for compact living.', 'pic8.jpg', 'Tips', 'Kristin Watson', '2021-12-12']
    ];
    const tx = db.transaction(() => posts.forEach(p => insertBlog.run(...p)));
    tx();
    console.log(`[db] seeded ${posts.length} blog posts`);
}

module.exports = db;
