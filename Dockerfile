FROM node:18-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =========================
# 2. RUNTIME STAGE
# =========================
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

# Chép bộ chạy standalone và thư viện
COPY --from=builder /app/.next/standalone ./

# Chép file tĩnh
COPY --from=builder /app/.next/static ./.next/static

# (Nếu có thư mục public thì bỏ comment dòng dưới)
# COPY --from=builder /app/public ./public

EXPOSE 80
CMD ["node", "server.js"]