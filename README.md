# IMovies — Movie Ticket Booking Platform

IMovies is a full-stack cinema booking web application built with **React (Vite)**, **Node.js / Express** and **MongoDB (Mongoose)**.
Users browse movies, pick a showtime, choose seats on an interactive seat map, pay through a clearly labelled **demo payment** flow and receive a printable e-ticket with a QR code. Administrators manage movies, theatres, shows, bookings and reviews from a protected dashboard.

> Academic project — B.Tech Computer Science (Artificial Intelligence), 3rd year.
> All movies, theatres and people in the demo data are **fictional**. No real money is ever charged.

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database design](#database-design)
5. [Seat booking and double-booking prevention](#seat-booking-and-double-booking-prevention)
6. [Demo payment mode](#demo-payment-mode)
7. [Folder structure](#folder-structure)
8. [Getting started](#getting-started)
9. [Environment variables](#environment-variables)
10. [Seeding data and creating an administrator](#seeding-data-and-creating-an-administrator)
11. [Testing](#testing)
12. [API reference](#api-reference)
13. [Security](#security)
14. [Screenshots](#screenshots)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)
17. [Known limitations and future work](#known-limitations-and-future-work)

---

## Features

**Customers**

- Register / log in (session in an HttpOnly cookie), edit profile, change password
- Home page with a featured-movie hero carousel, Now Showing, Trending (top-rated) and Coming Soon rows
- Movie catalogue with search (title, cast, director), genre and language filters, sorting and pagination
- Movie details: synopsis, cast, certification, runtime, ratings, showtimes grouped by date and theatre
- Theatre list and theatre pages showing everything playing there
- Interactive seat map with lower stall / middle stall / balcony sections and different prices; booked and held seats are shown and cannot be selected; it refreshes every 20 seconds
- Seats are held for 8 minutes during checkout, with a countdown
- Checkout with a server-calculated price breakdown (tickets + convenience fee + GST)
- Demo payment modal with success **and** failure simulation
- Booking confirmation with a unique reference (e.g. `IMV-7KQ2M9XA`), QR code and a print-friendly ticket (print or "Save as PDF" from the browser)
- My Bookings (upcoming / past & cancelled), booking details with payment history
- Cancel confirmed bookings up to 2 hours before the show (demo refund) or release seats before paying
- Favourites / watchlist
- Star ratings and reviews (one per user per movie, editable, deletable)

**Administrators**

- Dashboard: movie, theatre, show, booking and user counts; verified revenue (real payments only) shown separately from demo payment volume; top movies; recent bookings
- Movie management: create, edit, archive, delete (with safety checks)
- Theatre management including screens and a structured seat layout editor
- Show scheduling with clash detection (same screen, overlapping times) and per-show price overrides; open/close shows for booking
- Booking management: search, filter, cancel (refund)
- Review moderation: hide / republish / delete
- Read-only user list

**Quality**

- Responsive layout (desktop, tablet, mobile), keyboard-accessible controls, visible focus rings, skip link, ARIA labels on every seat
- Loading skeletons, empty states, error states with retry, toast notifications, confirmation dialogs
- Local SVG posters with an automatic fallback image, so the UI never depends on an external image service

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Bootstrap 5 + custom CSS, Axios, React Context, React Icons, React Hot Toast, qrcode.react |
| Backend | Node.js (≥ 20), Express 5, Mongoose 8, JSON Web Tokens, bcryptjs, express-validator, Helmet, express-rate-limit, cookie-parser, CORS, Morgan |
| Database | MongoDB 6+ (local) or MongoDB Atlas |
| Testing | Node.js test runner + Supertest (API), Vitest + React Testing Library (UI), ESLint |

## Architecture

```
 Browser (React SPA)
   │  axios, withCredentials, X-CSRF-Token header
   ▼
 Vite dev server ──/api proxy──►  Express API (backend/app.js)
                                    ├─ helmet, cors, json, cookie-parser, body sanitiser
                                    ├─ rate limiters, CSRF check
                                    ├─ routes/        → URL + validation rules (express-validator)
                                    ├─ controllers/   → HTTP request/response handling
                                    ├─ services/      → business logic (seat holds, booking lifecycle, payments, ratings)
                                    ├─ models/        → Mongoose schemas and indexes
                                    └─ errorHandler   → consistent JSON errors, no stack traces in production
                                          │
                                          ▼
                                       MongoDB
```

Every response has the shape `{ success: true, ... }` or `{ success: false, message, details? }`.
List endpoints return `{ items, pagination: { page, limit, total, totalPages } }`.

## Database design

```
 User 1───* Booking *───1 Show *───1 Movie
   │           │           │
   │           │           └──*──1 Theatre
   │           └──*── Payment
   ├──*── Favorite *──1 Movie
   └──*── Review   *──1 Movie
 Show 1───* SeatLock (one document per occupied seat)
```

| Collection | Key fields | Important indexes |
| --- | --- | --- |
| `users` | username, email, passwordHash (never returned), role `user`/`admin`, phone, city, favoriteGenres | unique `email` |
| `movies` | movieName, slug, description, genres, language, durationMins, releaseDate, posterUrl, trailerUrl, certification, cast, director, status (`now-showing`/`coming-soon`/`archived`), featured, avgRating, reviewCount | unique `slug`; `status+releaseDate`; `genres`; `language` |
| `theatres` | theatreName, city, address, screens, amenities, seatLayout `{ lower, middle, balcony: { rows, seatsPerRow, price } }`, isActive | unique `theatreName+city` |
| `shows` | movie, theatre, screen, startsAt, format, language, **seatLayout snapshot** (prices and seats fixed at creation), isActive | unique `theatre+screen+startsAt`; `movie+startsAt` |
| `seatlocks` | show, seatId, status (`held`/`booked`), user, booking (hold id), expiresAt | **unique `show+seatId`**; TTL clean-up on `expiresAt` |
| `bookings` | bookingReference, user, show, movie, theatre, seats, seatDetails, ticketCount, subtotal, convenienceFee, taxes, totalAmount, status, paymentStatus, payment, isDemoPayment, showStartsAt, holdExpiresAt, snapshot (display data for the ticket) | unique `bookingReference`; `user+showStartsAt` |
| `payments` | booking, user, provider, isDemo, amount, status (`created`/`succeeded`/`failed`/`refunded`), providerOrderId, providerPaymentId, method, failureReason | unique `providerOrderId` |
| `favorites` | user, movie | **unique `user+movie`** |
| `reviews` | user, movie, rating 1–5, comment, status (`approved`/`rejected`), moderatedBy | **unique `user+movie`** |

The seat layout fields map to the original specification as follows: `balconySeatPrice` = `seatLayout.balcony.price`, `balconySeats` = `seatLayout.balcony.rows × seatsPerRow`, and likewise for the middle and lower stalls. Seat ids are `<row letter><number>` (e.g. `C7`); rows are lettered from the screen backwards (lower → middle → balcony).

A separate `Admin` model is intentionally **not** used: administrators are users with `role: "admin"`, so login, hashing and session logic exist in exactly one place.

## Seat booking and double-booking prevention

The local MongoDB used in development runs as a standalone server, which does **not** support multi-document transactions. Instead, the design relies on a unique index plus atomic conditional updates, which works on any MongoDB deployment (standalone, replica set or Atlas):

1. **Hold** (`POST /api/bookings/hold-seats`) — the server validates the show (exists, active, not started) and each seat id against the show's layout, then inserts one `SeatLock` per seat with `status: "held"` and `expiresAt = now + 8 min`.
   The **unique `(show, seatId)` index** guarantees that two requests can never both insert the same seat, even at the same millisecond.
2. Seats rejected by the index may belong to an **expired** hold. The server tries to take those over with a single conditional `findOneAndUpdate({ status: "held", expiresAt: { $lte: now } })`; only one request can win it.
3. If any seat is still unavailable, every lock acquired in that attempt is deleted and the API responds **409 Conflict** with `details.unavailableSeats`. It is all-or-nothing.
4. **Booking** (`POST /api/bookings`) turns a valid, unexpired hold into a `pending` booking. The **price is recalculated on the server** from the show's layout snapshot; the client never sends prices.
5. **Payment success** atomically moves the booking `pending → confirmed` *only if its hold has not expired*, then converts exactly that booking's unexpired locks to `booked`. If a lock was lost in between (the hold expired and someone else took the seat), a **compensating step** releases the seats, marks the booking expired and refunds the payment.
6. **Payment failure / cancellation** releases the seats immediately.

Availability is always decided by comparing `expiresAt` with the current time. The TTL index and the one-minute background job only tidy up stale data; correctness never depends on them.

The automated test suite includes a test where **8 users request the same seats concurrently** and asserts that exactly one succeeds.

> **Real-time updates:** the seat map refreshes by polling every 20 seconds and immediately after any booking conflict. It does not use WebSockets, so the map can be up to 20 s out of date. The server is always the source of truth, and a stale selection is rejected with a clear message.

## Demo payment mode

No payment-gateway credentials are configured, so the project runs in **DEMO PAYMENT MODE** (`PAYMENT_PROVIDER=demo`):

- The payment modal is clearly labelled; **no card, UPI or bank details are collected or stored**.
- `POST /api/payments/order` creates a payment record for the booking; the **amount comes from the booking on the server**.
- The user chooses **Pay (demo)** or **Simulate a failed payment**. In demo mode the server-side demo provider (`backend/services/payment/demoProvider.js`) stands in for the bank's answer, and that endpoint only ever accepts payments flagged `isDemo`.
- A payment can leave the `created` state only once (atomic update), so double-submits are harmless.
- Failed payments never produce confirmed bookings; their seats are released.
- Demo payments are flagged `isDemo: true` and are **excluded from "verified revenue"** on the admin dashboard (shown separately as "demo payment volume").

**Adding a real gateway later:** implement a provider with the same interface (`createOrder`, `capture`, `refund`) in `services/payment/`, register it in `services/payment/index.js`, and confirm payments only from the gateway's **signed webhook / server-side signature verification** (never from a client flag). Use the gateway's idempotency keys. No real gateway is integrated in this project.

## Folder structure

```
imovies/
├── package.json            # root scripts: dev (both apps), test, lint, build, seed
├── backend/
│   ├── app.js              # Express app (middleware + routes), used by server and tests
│   ├── server.js           # starts the server, connects to MongoDB, clean-up job
│   ├── config/             # env loading/validation, database connection
│   ├── controllers/        # auth, movie, theatre, show, booking, payment, favorite, review, admin
│   ├── middlewares/        # auth (JWT cookie), csrf, validate, sanitize, rate limiters, error handler
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers with validation rules
│   ├── services/           # seatService, bookingService, paymentService, payment providers, ratingService
│   ├── utils/              # ApiError, pagination, pricing, seat layout helpers, booking reference
│   ├── scripts/            # seed.js, createAdmin.js, generatePosters.js, data/
│   ├── tests/              # node:test + supertest integration tests
│   └── .env.example
└── client/
    ├── index.html
    ├── vite.config.js      # dev proxy /api → backend, Vitest config
    ├── public/             # favicon, fallback poster, generated posters/
    └── src/
        ├── api/            # axios client (CSRF handling) and endpoint functions
        ├── components/     # common UI, layout, movies, shows, booking, admin, forms
        ├── context/        # AuthContext, FavoritesContext
        ├── hooks/          # useAsync, useCountdown, useDebounce, useDocumentTitle
        ├── layouts/        # MainLayout, AdminLayout
        ├── pages/          # 15 customer pages + admin/ (7 pages)
        ├── routes/         # ProtectedRoute, AdminRoute, GuestRoute
        ├── styles/         # theme.css (design system, print styles)
        ├── test/           # Vitest + Testing Library tests
        └── utils/          # formatting helpers
```

## Getting started

### Prerequisites

- **Node.js 20 or newer** (developed with Node 24) and npm
- **MongoDB 6+** running locally, **or** a free MongoDB Atlas cluster
- Git (optional)

### 1. Install dependencies

```bash
npm run install:all        # installs root, backend and client dependencies
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
```

Edit `backend/.env` and set at least `MONGODB_URI` and `JWT_SECRET`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The client needs no `.env` in development.

### 3. Start MongoDB

- **Windows:** the installer registers a "MongoDB" service. Check it is running in *Services*, or run `net start MongoDB` in an administrator terminal.
- **macOS (Homebrew):** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`
- **Atlas:** create a cluster, a database user, allow your IP under *Network Access*, and paste the `mongodb+srv://…` connection string into `MONGODB_URI`.

### 4. Seed demo data and create an administrator

```bash
npm run seed
```

Then create an administrator (see [below](#seeding-data-and-creating-an-administrator)).

### 5. Run the application

```bash
npm run dev
```

This starts both apps with `concurrently`:

- Frontend: <http://localhost:5173>
- API: <http://localhost:5000> (health check: <http://localhost:5000/api/health>)

Or run them separately in two terminals: `cd backend && npm run dev` and `cd client && npm run dev`.

### 6. Try the main workflows

1. **Customer:** Sign up → Movies → pick a now-showing movie → choose a showtime → select seats → Continue → Proceed to payment → **Pay (demo)** → view the ticket → My Bookings → cancel.
2. **Failed payment:** repeat but click **Simulate a failed payment**; the seats are released and no booking is confirmed.
3. **Conflict:** open the same show in two browsers with two accounts and select the same seat. The second user gets a "just taken by someone else" message.
4. **Admin:** log in with the admin account → Admin → add a theatre, schedule a show, moderate a review, cancel a booking.

## Environment variables

`backend/.env`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | yes | – | MongoDB connection string |
| `JWT_SECRET` | yes | – | ≥ 32 random characters used to sign session tokens |
| `JWT_EXPIRES_IN` | no | `1d` | Session lifetime (e.g. `12h`, `7d`) |
| `PORT` | no | `5000` | API port |
| `NODE_ENV` | no | `development` | `production` enables secure cookies, hides error details and trusts the hosting proxy |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed browser origin(s) for CORS, comma-separated |
| `COOKIE_SAMESITE` | no | `lax` | `lax` when frontend and API share a site; `none` for different sites (HTTPS only) |
| `SEAT_HOLD_MINUTES` | no | `8` | How long seats are held during checkout |
| `MAX_SEATS_PER_BOOKING` | no | `10` | Seat limit per booking |
| `CANCELLATION_CUTOFF_HOURS` | no | `2` | Customers cannot cancel within this many hours of the show |
| `PAYMENT_PROVIDER` | no | `demo` | Only `demo` is implemented |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | no | – | Read only by `npm run create-admin` |

`client/.env` (optional)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL for production builds (default `/api`) |
| `VITE_DEV_API_PROXY` | Where the dev server forwards `/api` (default `http://localhost:5000`) |

Optional notification (email/SMS) credentials are **not used**: tickets are delivered in-app only.

## Seeding data and creating an administrator

```bash
npm run seed
```

The seed script creates 12 fictional movies (9 now showing, 3 coming soon), 3 fictional theatres with 2 screens each, shows for today and the next 3 days (IST), and a few demo reviews by non-loginable "demo reviewer" accounts. It is **idempotent**: re-running never duplicates records, and running it on a later day adds the new days' shows. Existing bookings and user accounts are never modified.

**Create the first administrator** (no default admin credentials exist anywhere in the code):

```bash
# macOS / Linux / Git Bash
ADMIN_NAME="Your Name" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='ChooseAStrongPass1' npm run create-admin

# Windows PowerShell
$env:ADMIN_NAME="Your Name"; $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="ChooseAStrongPass1"; npm run create-admin
```

Alternatively, put the three values in `backend/.env`, run `npm run create-admin`, then **delete them from the file**.

- If the email already belongs to an account, that account is promoted to admin and its password is left unchanged. To change it, run `cd backend && npm run create-admin -- --reset-password` with `ADMIN_PASSWORD` set.
- Public registration can never create an admin; the API ignores any `role` sent by the client.

The poster artwork in `client/public/posters` is generated from the movie data by `npm run generate-posters --prefix backend`.

## Testing

```bash
npm test          # backend API tests + frontend tests
npm run lint      # ESLint for backend and client
npm run build     # production build of the client
```

- **Backend** (`backend/tests`, 31 tests) runs against a separate database, `imovies_test` (override with `MONGODB_URI_TEST`), which is dropped before and after each run. The tests refuse to run against a database whose name does not contain "test". They cover registration/login, role injection, NoSQL-injection attempts, CSRF, admin-only endpoints, show clash detection, seat validation, **concurrent seat holds**, expired-hold takeover, server-side pricing, demo payment success/failure/idempotency, refund on lost holds, cross-user access (404), cancellation rules, favourites, reviews, moderation and revenue reporting.
- **Frontend** (`client/src/test`, 15 tests) covers the seat map (states, labels, disabled seats), poster fallback, price breakdown, route guards, registration validation and formatting helpers.

## API reference

Base URL: `http://localhost:5000/api` (or `/api` through the Vite proxy).

**Calling the API from Postman / curl:** authentication uses an HttpOnly cookie, and every `POST/PUT/PATCH/DELETE` needs a CSRF token:

1. `GET /api/auth/csrf-token` returns `{ csrfToken }` and sets the `imovies_csrf` cookie.
2. Send the token in an `X-CSRF-Token` header with every state-changing request (Postman keeps the cookies automatically).
3. `POST /api/auth/login` sets the `imovies_token` session cookie.

🔒 = requires login · 👑 = administrators only

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/auth/csrf-token` | Get a CSRF token |
| POST | `/auth/register` | `{ username, email, password }`; always creates a `user` |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/logout` | Clear the session cookie |
| GET | `/auth/me` 🔒 | Current user (401 when logged out) |
| GET | `/auth/session` | Current user or `null` (used by the app on start-up) |
| PUT | `/auth/profile` 🔒 | `{ username?, phone?, city?, favoriteGenres? }` |
| PUT | `/auth/password` 🔒 | `{ currentPassword, newPassword }` |

### Movies

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/movies` | Query: `q`, `genre`, `language`, `status` (`now-showing`/`coming-soon`/`archived`/`all`), `featured=true`, `sort` (`newest`/`oldest`/`rating`/`title`/`duration`), `page`, `limit` |
| GET | `/movies/filters` | Genres, languages, certifications, statuses |
| GET | `/movies/:id` | By id or slug |
| POST | `/movies` 👑 | Create |
| PUT | `/movies/:id` 👑 | Update |
| DELETE | `/movies/:id` 👑 | Delete (409 if it has active bookings; archive instead) |

### Theatres

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/theatres` | Query: `q`, `city`, `page`, `limit`, `includeInactive=true` (admin) |
| GET | `/theatres/cities` | Distinct cities |
| GET | `/theatres/:id` | Theatre + seat map |
| POST / PUT / DELETE | `/theatres`, `/theatres/:id` 👑 | Manage theatres; the layout is validated (max 26 rows, 30 seats per row) |

### Shows

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/shows` | Upcoming active shows. Query: `movie`, `theatre`, `from`, `to`, `page`, `limit`; admin: `includePast`, `includeInactive`. Each item includes `seatsTotal`, `seatsAvailable`, `priceFrom` |
| GET | `/shows/:id` | One show |
| GET | `/shows/:id/seats` | Seat map sections + `booked`, `held`, `heldByMe` + booking rules |
| POST | `/shows` 👑 | `{ movie, theatre, screen, startsAt, format?, language?, prices?: { lower, middle, balcony } }` (409 on screen clash) |
| PUT | `/shows/:id` 👑 | Time/screen locked once bookings exist; price changes affect only new bookings |
| DELETE | `/shows/:id` 👑 | 409 if it has active bookings |

### Bookings

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/bookings/hold-seats` 🔒 | `{ showId, seats: ["C5","C6"] }` → `{ hold: { holdId, seats, price, expiresAt } }`; **409** if any seat is taken |
| DELETE | `/bookings/hold/:holdId` 🔒 | Release a hold |
| POST | `/bookings` 🔒 | `{ holdId }` → pending booking (server-priced); 410 if the hold expired |
| GET | `/bookings/my` 🔒 | Query: `type` (`upcoming`/`past`/`all`), `page`, `limit` |
| GET | `/bookings/:id` 🔒 | Owner or admin only (others get 404); includes payments and cancellation info |
| PATCH | `/bookings/:id/cancel` 🔒 | Cancel (refund if paid); customers only until the cut-off |

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/payments/config` | `{ provider: "demo", isDemo: true }` |
| POST | `/payments/order` 🔒 | `{ bookingId }` → payment order (amount from the booking) |
| POST | `/payments/:id/demo-complete` 🔒 | `{ outcome: "success" \| "failure", method? }`; demo payments only, idempotent |

### Favourites and reviews

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/favorites` 🔒 | The user's favourites with movie data |
| POST / DELETE | `/favorites/:movieId` 🔒 | Add (idempotent) / remove |
| GET | `/reviews/movie/:movieId` | Published reviews, rating distribution, and `myReview` when logged in |
| POST | `/reviews` 🔒 | `{ movieId, rating 1-5, comment? }` (409 if already reviewed) |
| PUT / DELETE | `/reviews/:id` 🔒 | Owner only (admins may delete any) |

### Admin 👑

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/dashboard` | Counts, verified revenue vs demo volume, recent bookings, top movies |
| GET | `/admin/users` | Query: `q`, `role`, `page` |
| GET | `/admin/bookings` | Query: `q` (reference, movie, customer), `status`, `page` |
| GET | `/admin/reviews` | Query: `q`, `status`, `page` |
| PATCH | `/admin/reviews/:id/moderate` | `{ status: "approved" \| "rejected", note? }` |

Common status codes: `400` validation error (with `details[]`), `401` not logged in, `403` not allowed / bad CSRF token, `404` not found, `409` conflict (seat taken, duplicate, has bookings), `410` hold expired, `429` rate limited.

## Security

- Passwords are hashed with **bcrypt (12 rounds)**; hashes are excluded from every query result and response. Login error messages and timings do not reveal whether an email is registered.
- Sessions are **JWTs in an HttpOnly cookie** (`SameSite=Lax`, `Secure` in production), so JavaScript and XSS cannot read the token. Because the token lives in a cookie, the API adds **double-submit CSRF protection** on every state-changing request.
- The user's role is re-read from the database on every request, so demoting a user or deleting an account takes effect immediately.
- **Server-side authorization** on every protected route (`requireAuth`, `requireAdmin`); the frontend route guards are only a convenience. Other users' bookings, reviews and favourites are filtered by owner, and foreign ids return 404.
- **Input validation** with express-validator on every write endpoint, ObjectId checks on route parameters, a request-body sanitiser that strips `$`/`.` keys (NoSQL injection), regex escaping for search, and a 100 kB body limit.
- **Helmet** security headers, CORS restricted to `CLIENT_URL` with credentials.
- **Rate limiting:** 20 login/registration attempts per 15 minutes per IP; 60 booking/payment actions per 10 minutes; 1000 general requests per 15 minutes.
- **Centralised error handler:** unexpected errors are logged on the server and return a generic message; stack traces are never sent in production.
- Secrets live only in `.env` (git-ignored). There are no default admin credentials, and the start-up check refuses to run with a missing or short `JWT_SECRET`.
- Prices, totals and payment outcomes are computed and recorded by the server only.

## Screenshots

Screenshots are not committed yet. To add them:

1. Run the app (`npm run dev`) with seeded data and an admin account.
2. Capture these screens (browser window around 1366×860; also one mobile shot using DevTools device mode):
   home, movie list, movie details/showtimes, seat selection, checkout, demo payment modal, booking confirmation/ticket, My Bookings, admin dashboard, admin shows.
3. Save them as PNG files in a `docs/screenshots/` folder and reference them here, for example:

```markdown
![Home](docs/screenshots/home.png)
![Seat selection](docs/screenshots/seat-selection.png)
```

## Deployment

A typical free-tier setup is **MongoDB Atlas** (database) + **Render / Railway** (API) + **Vercel / Netlify** (frontend). Nothing has been deployed yet; these are the steps to follow.

**1. Database: MongoDB Atlas**

Create a free cluster and a database user, allow access from your API host (or `0.0.0.0/0` for a demo), and copy the `mongodb+srv://…/imovies` connection string.

**2. Backend: Render (Web Service)**

- Root directory `backend`, build command `npm install`, start command `npm start`.
- Environment: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (new random value), `CLIENT_URL=https://your-frontend.vercel.app`, `PAYMENT_PROVIDER=demo`.
- After the first deploy, run `npm run seed` and `npm run create-admin` once, either from Render's shell or locally with `MONGODB_URI` pointing at Atlas.

**3. Frontend: Vercel**

- Root directory `client`, framework Vite, build `npm run build`, output `dist`.
- **Recommended (same-site cookies):** proxy the API through the frontend domain by editing `client/vercel.json`:

  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://your-api.onrender.com/api/$1" },
      { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
  }
  ```

  Keep `VITE_API_URL` unset (it defaults to `/api`) and `COOKIE_SAMESITE=lax` on the backend.
- **Alternative (separate domains):** set `VITE_API_URL=https://your-api.onrender.com/api` on Vercel and `COOKIE_SAMESITE=none` on the backend. Some browsers block third-party cookies, so the rewrite approach is more reliable.
- Netlify works the same way with a `_redirects` file (`/api/*  https://your-api.onrender.com/api/:splat  200` and `/*  /index.html  200`).

**4. Publish to GitHub**

```bash
git add .
git commit -m "IMovies: full-stack movie ticket booking platform"
git branch -M main
git remote add origin https://github.com/<your-username>/imovies.git
git push -u origin main
```

`.env` files, `node_modules` and build output are already git-ignored. Double-check with `git status` before the first push.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Could not connect to MongoDB` on start | Start the MongoDB service, or check the Atlas user/password, IP access list and the database name in `MONGODB_URI`. |
| `Missing required environment variable(s)` | Create `backend/.env` from `.env.example` and fill in `MONGODB_URI` and `JWT_SECRET`. |
| `JWT_SECRET must be at least 32 characters` | Generate one with the command in [Getting started](#2-configure-environment-variables). |
| `Port 5000 is already in use` | Stop the other process (`netstat -ano \| findstr :5000` then `taskkill /PID <pid> /F` on Windows; `lsof -i :5000` on macOS/Linux) or set `PORT`. If you change it, also set `VITE_DEV_API_PROXY`. |
| Frontend shows "Cannot reach the IMovies server" | The backend is not running, or the proxy target is wrong. Check <http://localhost:5000/api/health>. |
| CORS errors in production | `CLIENT_URL` must exactly match the frontend origin (scheme + host, no trailing slash). |
| "Invalid or missing CSRF token" | Refresh the page; in Postman call `GET /api/auth/csrf-token` first and send `X-CSRF-Token`. |
| Logged out immediately after login in production | Use the same-site rewrite, or set `COOKIE_SAMESITE=none` with HTTPS on both sides. |
| No movies / showtimes | Run `npm run seed`. Shows are generated for 4 days; re-run the seed to add new days. |
| `npm ERR! missing script` / module not found | Run `npm run install:all` from the project root. |
| Backend tests fail to connect | The tests need MongoDB at `127.0.0.1:27017` (or set `MONGODB_URI_TEST`). |

## Known limitations and future work

- **Payments are simulated.** No real gateway (Razorpay/Stripe) is integrated; the provider interface is ready for one.
- **Seat map updates by polling** (every 20 s), not WebSockets; conflicts are always caught by the server.
- **No multi-document transactions** (standalone MongoDB); consistency comes from the unique index, conditional updates and compensating steps. On a replica set / Atlas the same logic works unchanged, and transactions could be added.
- **No email/SMS notifications.** Tickets are in-app and printable (use the browser's "Save as PDF"); there is no server-generated PDF.
- No password-reset flow (it would need an email provider).
- Times are shown in the viewer's local time zone; the demo schedule is generated in IST.
- Admin user management is read-only; administrators are created with the CLI script.

Future ideas: real payment gateway with webhooks, WebSocket seat updates, email tickets, password reset, coupons/offers, recommendations based on favourite genres, multi-city location detection, analytics charts.
