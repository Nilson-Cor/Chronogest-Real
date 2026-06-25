#!/usr/bin/env bash
# ============================================================
# Curls de prueba para la migración multi-tenant.
# Requiere: backend corriendo en BASE_URL, jq instalado.
# Ajusta TENANT_SLUG_A / TENANT_SLUG_B a slugs reales creados
# previamente vía /api/admin/centros-tenant.
# ============================================================
set -e

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
ROOT_EMAIL="${ROOT_SEED_EMAIL:-admin@chronogest.com}"
ROOT_PASSWORD="${ROOT_SEED_PASSWORD:-cambia-esto}"
TENANT_SLUG_A="${TENANT_SLUG_A:-huila}"
TENANT_SLUG_B="${TENANT_SLUG_B:-antioquia}"

echo "── 1. Login root (gestiona MASTER_DB) ──────────────────────"
ROOT_TOKEN=$(curl -s -X POST "$BASE_URL/root/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ROOT_EMAIL\",\"password\":\"$ROOT_PASSWORD\"}" | jq -r .access_token)
echo "ROOT_TOKEN=${ROOT_TOKEN:0:20}..."

echo ""
echo "── 2. Listar tenants (requiere ROOT_TOKEN) ──────────────────"
curl -s "$BASE_URL/admin/centros-tenant" \
  -H "Authorization: Bearer $ROOT_TOKEN" | jq .

echo ""
echo "── 3. Crear tenant de prueba ($TENANT_SLUG_A) ───────────────"
curl -s -X POST "$BASE_URL/admin/centros-tenant" \
  -H "Authorization: Bearer $ROOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"Centro $TENANT_SLUG_A\",
    \"slug\": \"$TENANT_SLUG_A\",
    \"dominio\": \"$TENANT_SLUG_A.chronogest.com\",
    \"epsasDbName\": \"epsas_db_$TENANT_SLUG_A\",
    \"horariosDbName\": \"horarios_db_$TENANT_SLUG_A\"
  }" | jq .

echo ""
echo "── 4. Sin header x-centro-tenant ni JWT → 401 (JwtAuthGuard) ─"
curl -s -o /dev/null -w "status: %{http_code}\n" "$BASE_URL/personas"

echo ""
echo "── 5. Login normal en el tenant A (header x-centro-tenant) ──"
USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-centro-tenant: $TENANT_SLUG_A" \
  -d '{"login":"usuario_de_prueba","password":"clave_de_prueba"}' | jq -r .token)
echo "USER_TOKEN=${USER_TOKEN:0:20}..."

echo ""
echo "── 6. Acceso a ruta protegida CON el header correcto ────────"
curl -s -o /dev/null -w "status: %{http_code}\n" "$BASE_URL/personas" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-centro-tenant: $TENANT_SLUG_A"

echo ""
echo "── 7. Mismo token pero contra OTRO tenant → 403 (CentroTenantGuard) ─"
curl -s -o /dev/null -w "status: %{http_code}\n" "$BASE_URL/personas" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-centro-tenant: $TENANT_SLUG_B"

echo ""
echo "── 8. Slug inexistente → 404 (CentroDataSourceFactory) ──────"
curl -s -o /dev/null -w "status: %{http_code}\n" "$BASE_URL/personas" \
  -H "x-centro-tenant: tenant-que-no-existe"

echo ""
echo "Listo. Compara los status codes contra lo esperado en cada comentario."
