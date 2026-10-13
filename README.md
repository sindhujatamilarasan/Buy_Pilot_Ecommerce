# 🛍️ ShopKart – E-commerce Shopping Cart with Admin

A small Amazon / Flipkart-style shop: customers browse products, add to cart, apply coupons,
pay (Razorpay test mode) and track orders. Admin and staff manage products, stock, coupons and orders.

## Tech stack

| Part | Tech |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, axios |
| Backend | Python, Django, Django REST Framework |
| Database | PostgreSQL (SQLite as a temporary fallback) |

## Project structure

```
ecommerce-shop/
├── frontend/          React app
│   └── src/
│       ├── api/       all API calls (axios)
│       ├── components/
│       ├── context/
│       ├── hooks/     custom hooks
│       ├── layouts/
│       └── pages/
├── backend/           Django API
│   ├── config/        settings, main urls
│   ├── accounts/      users, roles, login / register API
│   ├── catalog/       categories, products, variants API (+ seed data)
│   └── dashboard/     admin dashboard API
└── docs/              database design
```

## Setup

### Backend (Windows, Command Prompt)
```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_products
.venv\Scripts\python manage.py seed_users
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
```
API: http://127.0.0.1:8000/api/health/

> Use `127.0.0.1` (not `localhost`): Docker also listens on port 8000 on this machine.

### Demo accounts (created by `seed_users`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@shopkart.test | Shop@1234 |
| Staff | staff@shopkart.test | Shop@1234 |
| Customer | customer@shopkart.test | Shop@1234 |

> Note: use `.venv\Scripts\python -m pip` (not `pip`) – direct `pip.exe` may be blocked by Device Guard.

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
App: http://localhost:5173

## API

| Method | URL | Who |
|---|---|---|
| POST | `/api/auth/register/`, `/api/auth/login/` | Anyone |
| POST | `/api/auth/logout/` · GET `/api/auth/me/` | Logged in |
| GET | `/api/categories/` | Anyone |
| GET | `/api/products/?search=&category=&ordering=&page=` | Anyone |
| GET | `/api/products/<slug>/` | Anyone |
| GET | `/api/admin/dashboard/` | Admin only |

Run backend tests: `.venv\Scripts\python manage.py test`

## Progress

- [x] Day 1 – Project setup, DB design, seed data (100 products, 400 variants)
- [x] Day 2 – Auth with customer / staff / admin roles; role-based routes and API protection; product list, detail and admin dashboard
- [ ] Day 3 – Product list with search, filters, sort
- [ ] Day 4 – Product detail, variants, wishlist
- [ ] Day 5 – Cart with Context + useReducer
