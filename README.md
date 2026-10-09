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
│   ├── accounts/      users + roles
│   └── catalog/       categories, products, variants (+ seed data)
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
.venv\Scripts\python manage.py runserver
```
API: http://localhost:8000/api/health/

> Note: use `.venv\Scripts\python -m pip` (not `pip`) – direct `pip.exe` may be blocked by Device Guard.

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
App: http://localhost:5173

## Progress

- [x] Day 1 – Project setup, DB design, seed data (100 products, 400 variants)
- [ ] Day 2 – Auth with customer / staff / admin roles
- [ ] Day 3 – Product list with search, filters, sort
- [ ] Day 4 – Product detail, variants, wishlist
- [ ] Day 5 – Cart with Context + useReducer
