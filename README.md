# Long La Auth Starter

Next.js App Router starter with MongoDB, shadcn/ui-style components, JWT, and httpOnly cookie login.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Update `.env` before running:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=long_la
JWT_SECRET=change-this-to-a-long-random-secret
AUTH_COOKIE_NAME=long_la_session
```

## Routes

- `/register`: create user with username/password, hash password, set JWT cookie
- `/login`: login, set JWT cookie
- `/dashboard`: protected route
- `/api/auth/me`: current user
- `/api/auth/logout`: clear cookie
