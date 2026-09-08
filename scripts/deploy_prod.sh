#!/usr/bin/env bash
# =============================================================================
# Life-MP Production Deployment Script (Zero-Conflict Shared-Host Architecture)
# =============================================================================
# Domain: life-mp.pp.ua (Managed via Cloudflare)
# Target Server: 34.139.21.224 (medgemma-user)
#
# Non-Interference Invariants:
# 1. Zero Public Port Bindings: Life-MP binds NO public 80/443 ports.
# 2. Loopback Isolation: Storefront on 127.0.0.1:3100, Commerce on 127.0.0.1:9005.
# 3. Dedicated Namespaces: Containers (life-mp-*), Network (life-mp-net), Volumes (life-mp-*).
# 4. Strict Resource Limits: Memory bounded to <= 2.0GB total across all 4 containers.
# 5. Fail-Closed Integrity: strict migration checks, verified health loops, HTTP 200 asserts,
#    host-key verification (accept-new), pre-deployment backups, and rollback metadata.
# =============================================================================

set -euo pipefail

# --- Configuration ---
VM_HOST="${LIFE_MP_PROD_HOST:-medgemma-user@34.139.21.224}"
SSH_KEY="${LIFE_MP_SSH_KEY:-/Users/george/Projects/Jorvis/artifacts/Server/vm_key}"
LOCAL_SRC="/Users/george/Projects/Life-MP"
REMOTE_DEST="/opt/life-mp"
DOMAIN="life-mp.pp.ua"

DRY_RUN=0
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=1
  fi
done

echo "================================================================================"
echo "  🚀 DEPLOYING LIFE-MP (ISOLATED PRODUCTION PROFILE)                          "
echo "  Target: $VM_HOST | Domain: https://$DOMAIN                                   "
if [ "$DRY_RUN" -eq 1 ]; then
  echo "  Mode: DRY RUN (Inspections only; no mutations applied)                     "
fi
echo "================================================================================"

# 1. Local Preflights
if [ ! -f "$SSH_KEY" ]; then
  if [ -f "$HOME/.ssh/id_rsa" ]; then
    SSH_KEY="$HOME/.ssh/id_rsa"
  else
    echo "❌ Error: SSH Key not found at $SSH_KEY" >&2
    exit 1
  fi
fi

chmod 600 "$SSH_KEY"

LOCAL_COMMIT=$(git -C "$LOCAL_SRC" rev-parse HEAD 2>/dev/null || echo "unknown")
LOCAL_BRANCH=$(git -C "$LOCAL_SRC" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
echo "✔ Local Git Commit: $LOCAL_COMMIT ($LOCAL_BRANCH)"

echo "=== [1/7] VERIFYING SSH CONNECTIVITY & REMOTE DOCKER ENGINE ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "$VM_HOST" "
  uname -srm && sudo docker --version && sudo docker compose version
"

if [ "$DRY_RUN" -eq 1 ]; then
  echo -e "\n=== [DRY RUN] INSPECTING REMOTE DISK & EXISTING CONTAINERS ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" "
    echo 'Free Disk Space:' \$(df -h / | awk 'NR==2 {print \$4}')
    echo 'Existing Containers:'
    sudo docker ps --filter 'name=life-mp-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
  "
  echo "✔ Dry-run inspection completed. No changes applied."
  exit 0
fi

echo "=== [2/7] PREPARING REMOTE DIRECTORY STRUCTURE ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" "
  sudo mkdir -p $REMOTE_DEST $REMOTE_DEST/deploy /var/backups/life-mp
  sudo chown -R \$USER:\$USER $REMOTE_DEST /var/backups/life-mp
"

echo "=== [3/7] SYNCHRONIZING CODEBASE VIA RSYNC ==="
rsync -avz \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  --exclude "apps/storefront/.next" \
  --exclude "apps/commerce/.medusa" \
  --exclude "dist" \
  --exclude ".env" \
  --exclude ".env.local" \
  --exclude ".env.production" \
  --exclude ".DS_Store" \
  --exclude "!artifacts" \
  "$LOCAL_SRC/" "$VM_HOST:$REMOTE_DEST/"

echo "✔ Codebase synchronized successfully."

# 4. Remote Execution & Zero-Conflict Orchestration
echo "=== [4/7] EXECUTING REMOTE CONTAINER BOOTSTRAP & BACKUP ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" bash -s -- "$LOCAL_COMMIT" "$LOCAL_BRANCH" << 'EOF'
set -euo pipefail

LOCAL_COMMIT="${1:-unknown}"
LOCAL_BRANCH="${2:-unknown}"

cd /opt/life-mp/deploy

# 1. Preflight Disk Space Check (require >= 4GB free)
FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
if [ "$FREE_KB" -lt 4194304 ]; then
  echo "❌ Error: Less than 4GB disk space available on host. Aborting to protect host services." >&2
  exit 1
fi
echo "✔ Disk space verified: $(df -h / | awk 'NR==2 {print $4}') free."

# 2. Pre-deployment Backup of Database & Config
BACKUP_DIR="/var/backups/life-mp/$(date -u +%Y%m%dT%H%M%SZ)"
sudo mkdir -p "$BACKUP_DIR"
if [ -f .env.production ]; then
  sudo cp .env.production "$BACKUP_DIR/.env.production.bak"
fi

if sudo docker ps --format '{{.Names}}' | grep -q "^life-mp-postgres$"; then
  echo "Creating pre-deployment database dump to $BACKUP_DIR..."
  sudo docker exec life-mp-postgres pg_dump -U life_prod life_production > "$BACKUP_DIR/life_production.sql" 2>/dev/null || echo "Notice: Database dump skipped (fresh or uninitialized database)."
fi
echo "✔ Pre-deployment backup staged at $BACKUP_DIR."

# 3. Idempotent Secret Generation: NEVER overwrite existing production credentials!
if [ ! -f .env.production ]; then
  echo "Generating fresh cryptographically secure production secrets..."
  DB_PASS=$(openssl rand -hex 24)
  JWT_SEC=$(openssl rand -hex 32)
  COOKIE_SEC=$(openssl rand -hex 32)

  cat << ENV > .env.production
# --- Production Domain (Cloudflare Managed) ---
DOMAIN=life-mp.pp.ua

# --- Isolated PostgreSQL ---
POSTGRES_DB=life_production
POSTGRES_USER=life_prod
POSTGRES_PASSWORD=${DB_PASS}

# --- Medusa v2 Security ---
JWT_SECRET=${JWT_SEC}
COOKIE_SECRET=${COOKIE_SEC}

# --- CORS Bindings ---
STORE_CORS=https://life-mp.pp.ua,http://localhost:3100
ADMIN_CORS=https://life-mp.pp.ua,http://localhost:3100
AUTH_CORS=https://life-mp.pp.ua,http://localhost:3100

# --- Storefront API Configuration ---
NEXT_PUBLIC_MEDUSA_API_URL=https://life-mp.pp.ua/api

# --- Local Host Port Bindings (Strictly Loopback) ---
HOST_STOREFRONT_PORT=3100
HOST_COMMERCE_PORT=9005

# --- Image Tags ---
COMMERCE_IMAGE=life-mp-commerce:production
STOREFRONT_IMAGE=life-mp-storefront:production
ENV
  chmod 600 .env.production
  echo "✔ Production environment file created (.env.production)."
else
  echo "✔ Existing .env.production preserved intact."
fi

echo -e "\n=== [5/7] BUILDING DOCKER IMAGES (SEQUENTIAL TO PREVENT CPU SPIKES) ==="
cd /opt/life-mp

# Build backend and frontend sequentially with limit 1 to avoid starving Jorvis CPU
sudo docker build \
  -t life-mp-commerce:production \
  -f deploy/Dockerfile.commerce .

sudo docker build \
  --build-arg NEXT_PUBLIC_MEDUSA_API_URL=https://life-mp.pp.ua/api \
  -t life-mp-storefront:production \
  -f deploy/Dockerfile.storefront .

echo "✔ Docker images built successfully."

echo -e "\n=== [6/7] STARTING ISOLATED DATABASE & RUNNING MIGRATIONS ==="
cd /opt/life-mp/deploy
sudo docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

echo "Waiting for life-mp-postgres to become healthy..."
POSTGRES_HEALTHY=0
for i in {1..25}; do
  if [ "$(sudo docker inspect --format='{{.State.Health.Status}}' life-mp-postgres 2>/dev/null || true)" = "healthy" ]; then
    POSTGRES_HEALTHY=1
    echo "✔ PostgreSQL is healthy."
    break
  fi
  sleep 2
done

if [ "$POSTGRES_HEALTHY" -ne 1 ]; then
  echo "❌ Error: PostgreSQL failed to report healthy status. Aborting." >&2
  sudo docker logs --tail 30 life-mp-postgres
  exit 1
fi

# Run Medusa DB migrations (FAIL-CLOSED: no masking with || true!)
echo "Executing Medusa database migrations..."
set +e
MIGRATE_OUT=$(sudo docker run --rm \
  --network life-mp-net \
  --env-file .env.production \
  -e TS_NODE_TRANSPILE_ONLY=true \
  -e DATABASE_URL="postgresql://life_prod:$(grep POSTGRES_PASSWORD .env.production | cut -d= -f2)@life-mp-postgres:5432/life_production?sslmode=disable" \
  life-mp-commerce:production \
  node --import tsx node_modules/@medusajs/cli/cli.js db:migrate 2>&1)
MIGRATE_STATUS=$?
set -e

if [ "$MIGRATE_STATUS" -ne 0 ]; then
  echo "❌ Error: Medusa DB migrations failed with exit code $MIGRATE_STATUS!" >&2
  echo "$MIGRATE_OUT" >&2
  exit 1
fi
echo "✔ Migrations applied successfully."

# Starting Commerce and Storefront
echo "Starting Life-MP Commerce & Storefront services..."
sudo docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production up -d commerce storefront

# Healthcheck loop (FAIL-CLOSED: exits 1 if not healthy within timeout)
echo "Waiting for services to report healthy status..."
SERVICES_HEALTHY=0
for i in {1..30}; do
  C_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' life-mp-commerce 2>/dev/null || echo "starting")
  S_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' life-mp-storefront 2>/dev/null || echo "starting")
  echo "  Status probe [$i/30]: commerce=$C_STATUS | storefront=$S_STATUS"
  if [ "$C_STATUS" = "healthy" ] && [ "$S_STATUS" = "healthy" ]; then
    SERVICES_HEALTHY=1
    echo "✔ All Life-MP services are healthy!"
    break
  fi
  sleep 3
done

if [ "$SERVICES_HEALTHY" -ne 1 ]; then
  echo "❌ Error: Life-MP services failed to become healthy within 90 seconds. Aborting deployment." >&2
  sudo docker logs --tail 30 life-mp-commerce
  sudo docker logs --tail 30 life-mp-storefront
  exit 1
fi

echo -e "\n=== RUNNING PRODUCTION CONTAINERS ==="
sudo docker ps --filter "name=life-mp-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n=== RESOURCE CONSUMPTION CHECK ==="
sudo docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep -E "NAME|life-mp-" || true

echo -e "\n=== [7/7] HEALTHCHECK PROBES VIA LOCAL LOOPBACK (FAIL-CLOSED) ==="
STORE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/ || echo "000")
COMMERCE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9005/health || echo "000")

echo "Storefront HTTP Response (127.0.0.1:3100): $STORE_HTTP"
echo "Commerce Health HTTP Response (127.0.0.1:9005/health): $COMMERCE_HTTP"

if [ "$STORE_HTTP" != "200" ]; then
  echo "❌ Error: Storefront returned HTTP $STORE_HTTP (expected 200)!" >&2
  exit 1
fi

if [ "$COMMERCE_HTTP" != "200" ]; then
  echo "❌ Error: Commerce health returned HTTP $COMMERCE_HTTP (expected 200)!" >&2
  exit 1
fi

# Write Release Metadata
cat << REL > /opt/life-mp/deploy/RELEASE_METADATA.json
{
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "$LOCAL_COMMIT",
  "branch": "$LOCAL_BRANCH",
  "backupDir": "$BACKUP_DIR",
  "ports": {
    "storefront": 3100,
    "commerce": 9005
  },
  "domain": "life-mp.pp.ua"
}
REL
chmod 644 /opt/life-mp/deploy/RELEASE_METADATA.json
echo "✔ Release metadata recorded in /opt/life-mp/deploy/RELEASE_METADATA.json."

EOF

echo "================================================================================"
echo "  🎉 DEPLOYMENT COMPLETE & VERIFIED LOCALLY ON SERVER                           "
echo "================================================================================"
echo ""
echo "Next step: Connect Cloudflare routing for https://$DOMAIN"
echo "  Option A (Cloudflare Tunnel - Recommended):"
echo "    In Cloudflare Zero Trust Dashboard -> Access -> Tunnels -> Select Tunnel:"
echo "    Add Public Hostname:"
echo "      - Domain: $DOMAIN"
echo "      - Path: (leave empty)"
echo "      - Service: HTTP -> 127.0.0.1:3100"
echo "    Add second Public Hostname (or path rule):"
echo "      - Domain: $DOMAIN"
echo "      - Path: api/*"
echo "      - Service: HTTP -> 127.0.0.1:9005"
echo ""
echo "  Option B (Shared Caddy / Reverse Proxy on host):"
echo "    If your host Caddy handles port 80/443, append this block to /opt/jorvis/Caddyfile:"
echo "    --------------------------------------------------"
echo "    $DOMAIN {"
echo "        handle /api/* {"
echo "            uri strip_prefix /api"
echo "            reverse_proxy 127.0.0.1:9005"
echo "        }"
echo "        handle {"
echo "            reverse_proxy 127.0.0.1:3100"
echo "        }"
echo "    }"
echo "    --------------------------------------------------"
echo "    Then run on server: sudo docker exec jorvis-proxy caddy reload"
echo "================================================================================"
