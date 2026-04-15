# FurniFrenzy

Fullstack furniture store: vanilla HTML/CSS/JS frontend, Express + SQLite backend.

## Stack

- **Backend:** Node.js, Express, better-sqlite3, JWT auth, bcryptjs
- **Frontend:** Vanilla JS, Bootstrap 5, Google Fonts, Font Awesome
- **DB:** SQLite (auto-created `data.db`, seeded on first run)

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

## Features

- **Auth:** register / login / JWT-protected routes (`/api/auth/*`)
- **Products:** seeded into SQLite, served via `/api/products`
- **Cart:** localStorage on the client, syncs with API at checkout
- **Orders:** authenticated checkout, decrements stock atomically (`/api/orders`)
- **Newsletter:** persisted unique-email subscribers (`/api/newsletter`)
- **Contact form:** stored in DB (`/api/contact`)
- **Blog:** seeded posts served via `/api/blog`

## API

| Method | Path                | Auth | Purpose                  |
| ------ | ------------------- | ---- | ------------------------ |
| POST   | /api/auth/register  | —    | Create account           |
| POST   | /api/auth/login     | —    | Sign in, returns JWT     |
| GET    | /api/auth/me        | yes  | Current user             |
| GET    | /api/products       | —    | List products            |
| GET    | /api/products/:id   | —    | Product detail           |
| GET    | /api/blog           | —    | Blog posts               |
| POST   | /api/newsletter     | —    | Subscribe                |
| POST   | /api/contact        | —    | Send contact message     |
| POST   | /api/orders         | yes  | Place order              |
| GET    | /api/orders         | yes  | List my orders           |

## File layout

```
furniture website/
├── server.js       Express app + all routes
├── db.js           SQLite schema + seed
├── data.db         (created on first run, gitignored)
├── package.json
├── page.html       Frontend entry
├── style.css       Design system + components
├── app.js          Frontend logic (state, fetch, render)
├── pic*.png/jpg    Product/blog imagery
└── README.md
```

## Environment

- `PORT` — server port (default `3000`)
- `JWT_SECRET` — JWT signing secret (default dev secret; **change in production**)
