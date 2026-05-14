# Long La - Badminton Management System

A full-stack, containerized web application built with modern Next.js to manage badminton sessions, player tracking, and automated payment/QR workflows.

## 🏗 Architecture & Tech Stack

This project is built with scalability, performance, and developer experience in mind.

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router paradigm)
- **Language**: TypeScript (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: MongoDB (Atlas compatible)
- **Authentication**: Stateless JWT implementation via `jose` with `HttpOnly`, `SameSite=Lax`, and `Secure` cookie constraints.
- **Media Storage**: Cloudinary integration for robust asset management.
- **Infrastructure**: Multi-stage Docker builds coupled with [Caddy](https://caddyserver.com/) for zero-config HTTPS reverse proxying.

---

## 🚀 Features

- **Robust Authentication**: Fully bespoke JWT-based authentication flow protecting sensitive API routes and pages.
- **Session Management**: CRUD operations for tracking badminton sessions, court fees, and individual player attendance.
- **Payment Tracking**: Dynamic QR code generation for instant bank transfers and granular debt/payment status calculation per player.
- **Cloud Media**: Direct integration with Cloudinary for scalable image uploads.
- **Production Ready**: Optimized Docker image (`node:18-slim`) reducing attack surface and eliminating `musl` libc DNS resolution issues typical of Alpine builds.

---

## 🛠 Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB Instance (Local or Atlas)

### Setup

1. **Clone and Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Duplicate the example environment file and populate your secrets:
   ```bash
   cp .env.example .env.development
   ```
   
   *Required Variables:*
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0...
   MONGODB_DB=long_la
   JWT_SECRET=your_cryptographically_secure_random_string
   AUTH_COOKIE_NAME=long_la_session
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:3000`.*

---

## 🐳 Docker Deployment

The application utilizes a highly optimized, multi-stage Dockerfile designed for minimal image size and fast deployments.

**1. Configure Production Environment:**
Ensure `.env.production` is created and configured on the host machine.

**2. Spin up the infrastructure:**
We utilize `docker-compose` to orchestrate the Next.js runtime alongside a Caddy reverse proxy, which automatically provisions Let's Encrypt TLS certificates.

```bash
# Pull the latest image
docker-compose pull

# Run detached
docker-compose up -d
```

*(Note: Caddy requires ports 80 and 443 to be open on your VPS firewall to resolve TLS challenges).*

---

## 🗄 API Structure

The backend follows a RESTful pattern within the App Router's Route Handlers:

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | `POST` | Hashes password, persists user, sets HTTP-only cookie |
| `/api/auth/login` | `POST` | Validates credentials, issues JWT |
| `/api/auth/me` | `GET` | Decodes JWT, returns current session context |
| `/api/auth/logout` | `POST` | Invalidates and clears the session cookie |
| `/api/badminton-sessions` | `GET` / `POST` | Fetch or create badminton events |
| `/api/players` | `GET` / `POST` | Manage player roster and metrics |

---
*Maintainer: Truong Vo*
