# StockFlow

**E-commerce storefront and inventory management in one app.** Customers browse a live catalog, save products to a wishlist, apply coupon codes and track their orders. Business users manage products, stock, suppliers, purchase orders, coupons and fulfilment from an admin dashboard.

Built with **FastAPI**, **SQLAlchemy 2**, **PostgreSQL** and **Supabase** (Auth and Storage) on the backend, and **React 19 + TypeScript + Vite** on the frontend.

<!-- Add screenshots or a short GIF here: storefront, product page with reviews, cart with a coupon, admin dashboard. -->

---

## Features

### Storefront (customers)
- **Catalog search and filters**: case-insensitive search across name, description and SKU, plus category, price range and in-stock filters. Results can be sorted by featured, newest, price, name or top rated, and every query is paginated on the server.
- **Product reviews**: 1–5 star ratings with a headline and comment. Only customers with a **delivered** order containing the product can leave one, and each customer gets one review per product. Pages show a rating summary with a star distribution you can filter by.
- **Wishlist**: save products with one click from any card. Adding is idempotent.
- **Coupons at checkout**: preview the discount in the cart. It is checked again with a row lock when the order is placed.
- **Orders**: history with status timeline, filters and pagination. Pending orders can be cancelled, which returns the stock and gives the coupon use back.

### Admin (business users)
- Dashboard with revenue, order and low-stock overview
- Products (with image upload to Supabase Storage), categories and inventory adjustments
- Order fulfilment workflow: `PENDING → CONFIRMED → SHIPPED → DELIVERED` (or `CANCELLED`)
- Suppliers and purchase orders that restock inventory when received
- **Coupon management**: percentage or fixed discounts, minimum order, maximum discount cap, start and expiry dates, and total or per-customer usage limits
- Review moderation: delete any review

### Accounts
- Registration and login through Supabase Auth, with role-based access (`CUSTOMER` / `BUSINESS`)
- **Refresh-token rotation** (`POST /auth/refresh`). The frontend renews the session shortly before the access token expires.
- **Password reset by email**. The reset endpoint only accepts a recovery-session token, so a stolen everyday access token can't be used to change the password.
- **Email verification**: unverified logins get a clear error, and the confirmation email can be resent.
- Profile updates, password change and account deletion

### Engineering
- Layered architecture: routers → services → models, with Pydantic schemas at the edge
- Consistent error envelope (`{"success": false, "error": {code, message, details}}`) via custom exception handlers
- Concurrency-safe checkout: inventory and coupon rows are locked with `SELECT … FOR UPDATE`, and every check runs before any stock is deducted
- No N+1 queries on product listings: stock and rating aggregates are joined into the page query
- Alembic migrations, a multi-stage Docker image (non-root, health check) and docker-compose
- 60+ pytest tests covering auth flows, RBAC, pagination, coupons, reviews, wishlist and inventory

---

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        FE[React + Vite SPA]
    end
    subgraph Backend
        API[FastAPI]
        SVC[Service layer]
        ORM[SQLAlchemy models]
    end
    subgraph Supabase
        AUTH[Supabase Auth]
        PG[(PostgreSQL)]
        ST[Storage: product images]
    end

    FE -- "REST + Bearer JWT" --> API
    FE -- "session storage" --> AUTH
    API --> SVC --> ORM --> PG
    API -- "verify JWT (JWKS), sign-up, reset, verify email" --> AUTH
    SVC -- "upload / delete images" --> ST
```

```
app/
├── core/          # settings, pagination helpers, storage client, security
├── db/            # engine and session
├── dependencies/  # get_db, get_current_user, require_roles
├── exceptions/    # domain exceptions and global handlers
├── models/        # SQLAlchemy models
├── routers/       # HTTP endpoints, one module per resource
├── schemas/       # Pydantic request/response models
├── services/      # business logic
└── tests/         # pytest suite
frontend/src/
├── components/    # ProductCard, ProductReviews, Stars, Pagination, …
├── context/       # Auth, Cart, Wishlist, Theme, Toast
├── pages/         # store/, admin/, auth/
└── services/      # Axios client, endpoint wrappers, session refresh
```

---

## Getting started

### Prerequisites
- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (or plain `pip`)
- Node.js 20+
- A [Supabase](https://supabase.com) project (Auth, Postgres and a public `product-images` storage bucket)

### 1. Backend

```bash
cp .env.example .env          # then fill in your Supabase values
uv sync                       # or: pip install -r requirements.txt
uv run alembic upgrade head   # create / update the database schema
uv run python run.py          # http://localhost:8000, docs at /docs
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # Supabase URL, publishable key, API URL
npm install
npm run dev                   # http://localhost:5173
```

### 3. Supabase settings
- **Authentication → URL Configuration**: add `http://localhost:5173/**` (your `FRONTEND_URL`) to *Redirect URLs*, so password reset and confirmation links can return to the app.
- **Authentication → Providers → Email**: turn on *Confirm email* if you want verification to be required.
- **Storage**: create a public bucket named `product-images`, then either set `SUPABASE_SERVICE_ROLE_KEY` in the backend `.env` or run [`supabase/storage_policies.sql`](supabase/storage_policies.sql).

### Run with Docker

```bash
docker compose up --build     # API on :8000, frontend on :5173
```

Compose reads `.env`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to it so the frontend image can be built.

---

## Tests

The suite runs each test inside a transaction that is rolled back. Point it at a **throwaway** database so it never touches your real one:

```bash
docker compose --profile test up -d db
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/stockflow_test uv run pytest
```

For a quick run without Docker, SQLite works too:

```bash
TEST_DATABASE_URL=sqlite:///./test.db uv run pytest
```

---

## API overview

Interactive docs: **`/docs`** (Swagger UI) or **`/redoc`**.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `/login` · `/refresh` · `/logout` · `/forgot-password` · `/reset-password` · `/resend-verification` |
| Account | `GET/PATCH/DELETE /users/me` · `POST /users/me/change-password` |
| Products | `GET /products/?search=&category_id=&status=&min_price=&max_price=&in_stock=&sort=&page=&size=` · `GET /products/{id}` · `POST/PATCH/DELETE` (business) · `POST/DELETE /products/{id}/image` |
| Reviews | `GET /products/{id}/reviews` · `GET …/reviews/summary` · `GET …/reviews/eligibility` · `POST /products/{id}/reviews` · `PATCH/DELETE /reviews/{id}` |
| Wishlist | `GET /wishlist/` · `POST /wishlist/` · `DELETE /wishlist/{product_id}` |
| Coupons | `POST /coupons/validate` (customer) · `GET/POST /coupons/` · `GET/PATCH/DELETE /coupons/{id}` (business) |
| Orders | `POST /orders/` (with optional `coupon_code`) · `GET /orders/me` · `GET /orders/all` (filter by `status`, `date_from`, `date_to`, `customer_id`; sort; paginate) · `PATCH /orders/{id}/status` · `POST /orders/{id}/cancel` |
| Catalog admin | `/categories` · `/inventory` · `/suppliers` · `/purchase-orders` |
| Health | `GET /` (liveness) · `GET /health` (checks the database) |

List endpoints return a page envelope:

```json
{ "items": [ ... ], "total": 42, "page": 1, "size": 20, "pages": 3 }
```
