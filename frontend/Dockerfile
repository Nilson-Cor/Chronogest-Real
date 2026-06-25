# ============================================================
#  ChronoGest — Frontend Dockerfile (Angular)
#  Etapas: dev (ng serve) | builder + prod (nginx)
# ============================================================

# ── 1. Desarrollo con ng serve ────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 4200
# --host 0.0.0.0 permite conexiones desde fuera del contenedor
# --poll 500 mejora la detección de cambios en Docker/Windows
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "500", "--disable-host-check"]

# ── 2. Builder: genera los estáticos de producción ────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build --configuration production

# ── 3. Producción con Nginx ───────────────────────────────
FROM nginx:alpine AS prod
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
