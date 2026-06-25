# ============================================================
#  ChronoGest EPSAS — Backend Dockerfile (NestJS + PostgreSQL)
#  Etapas: deps → dev | builder → prod
# ============================================================

# ── 1. Dependencias base ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ── 2. Desarrollo con hot-reload (ts-node + watch) ────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p uploads/adjuntos
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ── 3. Builder: compila TypeScript → JavaScript ───────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# ── 4. Producción: imagen mínima (reutiliza node_modules del stage deps) ──
FROM node:20-alpine AS prod
WORKDIR /app
# Copia node_modules ya instalados (todos, no solo prod) para evitar conflictos
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads/adjuntos
# PM2 administra el proceso de Node en producción (auto-restart, logs, métricas).
# pm2-runtime mantiene el proceso en primer plano, que es lo que espera Docker.
RUN npm install -g pm2
EXPOSE 3000
CMD ["pm2-runtime", "dist/src/main.js"]
