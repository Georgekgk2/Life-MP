#!/usr/bin/env bash
# =============================================================================
# Life-MP Production Deployment & Atomic Rollback Runner
# =============================================================================
# Domain: life-mp.pp.ua (Managed via Cloudflare)
# Target Server: 34.139.21.224 (medgemma-user)
#
# Production Release & Invariant Standards:
# 1. Zero Public Port Bindings: Life-MP binds NO public 80/443 ports.
# 2. Loopback Isolation: Storefront on 127.0.0.1:3100, Commerce on 127.0.0.1:9005.
# 3. Dedicated Namespaces: Containers (life-mp-*), Network (life-mp-net), Volumes (life-mp-*).
# 4. Strict Resource Limits: Bounded memory caps (~2.0GB total across 4 containers).
# 5. Version-Aware Release Management: Releases deployed to /opt/life-mp/releases/<release-id>
#    with immutable image tags (life-mp-commerce:<release-id>, life-mp-storefront:<release-id>)
#    and recorded image digests.
# 6. Cryptographically Verified Backups: /var/backups/life-mp/<release-id>/ with CHECKSUMS.sha256,
#    verified pg_dump footer, and BACKUP_COMPLETE / BACKUP_COMPLETE_WITH_DB sentinels.
# 7. Atomic Safe Rollback: Tests health BEFORE performing atomic symlink swap (mv -Tf),
#    fail-closed HTTP 200 assertions, and updates PREVIOUS_RELEASE pair deterministically.
# 8. Fail-Closed Integrity: Zero-loss migrations, strict healthcheck loops, dirty-tree protection.
# =============================================================================

set -euo pipefail

# --- Configuration ---
VM_HOST="${LIFE_MP_PROD_HOST:-medgemma-user@34.139.21.224}"
SSH_KEY="${LIFE_MP_SSH_KEY:-/Users/george/Projects/Jorvis/artifacts/Server/vm_key}"
LOCAL_SRC="/Users/george/Projects/Life-MP"
REMOTE_ROOT="/opt/life-mp"
DOMAIN="life-mp.pp.ua"

DRY_RUN=0
ALLOW_DIRTY=0
ROLLBACK=0
ROLLBACK_TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      shift
      ;;
    --rollback)
      ROLLBACK=1
      if [ $# -gt 1 ] && [[ ! "$2" =~ ^-- ]]; then
        ROLLBACK_TARGET="$2"
        shift
      fi
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

echo "================================================================================"
echo "  🚀 LIFE-MP PRODUCTION RELEASE & ROLLBACK RUNNER                             "
echo "  Target: $VM_HOST | Domain: https://$DOMAIN                                   "
if [ "$DRY_RUN" -eq 1 ]; then
  echo "  Mode: DRY RUN (Inspections and config syntax checks only)                  "
elif [ "$ROLLBACK" -eq 1 ]; then
  echo "  Mode: ATOMIC ROLLBACK (Code, images, DB, and config rollback)              "
fi
echo "================================================================================"

# 1. Local Preflights: SSH Key
if [ ! -f "$SSH_KEY" ]; then
  if [ -f "$HOME/.ssh/id_rsa" ]; then
    SSH_KEY="$HOME/.ssh/id_rsa"
  else
    echo "❌ Error: SSH Key not found at $SSH_KEY" >&2
    exit 1
  fi
fi

# Ensure SSH key permissions are 600 without unnecessary mutation
CURRENT_KEY_PERMS=$(stat -f "%OLp" "$SSH_KEY" 2>/dev/null || stat -c "%a" "$SSH_KEY" 2>/dev/null || echo "unknown")
if [ "$CURRENT_KEY_PERMS" != "600" ] && [ "$DRY_RUN" -eq 0 ]; then
  chmod 600 "$SSH_KEY"
fi

# 2. Local Preflights: Dirty Worktree Guard (P0)
LOCAL_COMMIT=$(git -C "$LOCAL_SRC" rev-parse HEAD 2>/dev/null || echo "unknown")
LOCAL_BRANCH=$(git -C "$LOCAL_SRC" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
DIRTY_FILES=$(git -C "$LOCAL_SRC" status --porcelain | wc -l | tr -d ' ')
DIFF_SHA="clean"
UNTRACKED_COUNT=0

if [ "$DIRTY_FILES" -ne 0 ]; then
  DIFF_SHA=$(git -C "$LOCAL_SRC" diff HEAD | shasum -a 256 | awk '{print $1}')
  UNTRACKED_COUNT=$(git -C "$LOCAL_SRC" ls-files --others --exclude-standard | wc -l | tr -d ' ')
fi

if [ "$DIRTY_FILES" -ne 0 ] && [ "$ALLOW_DIRTY" -eq 0 ] && [ "$ROLLBACK" -eq 0 ]; then
  echo "❌ Error: Local working tree has $DIRTY_FILES uncommitted changes or untracked files." >&2
  echo "   Deploying from dirty tree creates mismatch with Git commit SHA metadata ($LOCAL_COMMIT)." >&2
  echo "   Commit your changes first, or pass --allow-dirty if intentionally deploying uncommitted changes." >&2
  git -C "$LOCAL_SRC" status --short >&2
  exit 1
fi

RELEASE_ID="rel-$(date -u +%Y%m%dT%H%M%SZ)-${LOCAL_COMMIT:0:7}"
echo "✔ Release Identifier: $RELEASE_ID [Commit: $LOCAL_COMMIT ($LOCAL_BRANCH), Dirty: $DIRTY_FILES]"

# 3. Verify SSH Connectivity
echo "=== [1/7] VERIFYING SSH CONNECTIVITY & REMOTE DOCKER ENGINE ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "$VM_HOST" "
  uname -srm && sudo docker --version && sudo docker compose version
"

# 4. Handle Atomic Rollback Mode (P1)
if [ "$ROLLBACK" -eq 1 ]; then
  echo -e "\n=== [ROLLBACK] EXECUTING ATOMIC RELEASE ROLLBACK ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" bash -s -- "$ROLLBACK_TARGET" << 'ROLLBACK_EOF'
set -euo pipefail
SPECIFIED_TARGET="${1:-}"
BACKUP_PARENT="/var/backups/life-mp"
REMOTE_ROOT="/opt/life-mp"

# A. Find verified backup
CHOSEN_BACKUP=""
if [ -n "$SPECIFIED_TARGET" ] && [ -d "$BACKUP_PARENT/$SPECIFIED_TARGET" ]; then
  if [ -f "$BACKUP_PARENT/$SPECIFIED_TARGET/BACKUP_COMPLETE" ]; then
    CHOSEN_BACKUP="$BACKUP_PARENT/$SPECIFIED_TARGET"
  else
    echo "❌ Error: Specified backup target $SPECIFIED_TARGET exists but lacks BACKUP_COMPLETE sentinel!" >&2
    exit 1
  fi
else
  # Scan in descending order for the newest verified backup
  for candidate in $(ls -1td "$BACKUP_PARENT"/rel-* 2>/dev/null || true); do
    if [ -f "$candidate/BACKUP_COMPLETE" ]; then
      if (cd "$candidate" && sha256sum -c --status CHECKSUMS.sha256 2>/dev/null); then
        CHOSEN_BACKUP="$candidate"
        break
      fi
    fi
  done
fi

if [ -z "$CHOSEN_BACKUP" ]; then
  echo "❌ Error: No verified backup with valid checksums found under $BACKUP_PARENT!" >&2
  exit 1
fi

echo "✔ Verified backup identified: $CHOSEN_BACKUP"
(cd "$CHOSEN_BACKUP" && sha256sum -c CHECKSUMS.sha256)

# B. Identify target release directory
TARGET_RELEASE=""
if [ -f "$REMOTE_ROOT/PREVIOUS_RELEASE" ]; then
  PREV_REL_NAME=$(cat "$REMOTE_ROOT/PREVIOUS_RELEASE")
  if [ -d "$REMOTE_ROOT/releases/$PREV_REL_NAME" ]; then
    TARGET_RELEASE="$REMOTE_ROOT/releases/$PREV_REL_NAME"
  fi
fi

if [ -z "$TARGET_RELEASE" ]; then
  # Find latest release that is not current
  CURRENT_REAL=$(readlink -f "$REMOTE_ROOT/current" 2>/dev/null || true)
  for rel in $(ls -1td "$REMOTE_ROOT/releases"/rel-* 2>/dev/null || true); do
    if [ "$rel" != "$CURRENT_REAL" ]; then
      TARGET_RELEASE="$rel"
      break
    fi
  done
fi

if [ -z "$TARGET_RELEASE" ] || [ ! -d "$TARGET_RELEASE" ]; then
  echo "❌ Error: Target release directory not found under $REMOTE_ROOT/releases!" >&2
  exit 1
fi

echo "✔ Rollback target release directory: $TARGET_RELEASE"

# C. Restore Database Dump if present in verified backup
if [ -f "$CHOSEN_BACKUP/life_production.sql" ] && [ -s "$CHOSEN_BACKUP/life_production.sql" ]; then
  echo "Restoring PostgreSQL database from $CHOSEN_BACKUP/life_production.sql..."
  sudo docker exec -i life-mp-postgres psql -U life_prod -d life_production < "$CHOSEN_BACKUP/life_production.sql"
  echo "✔ PostgreSQL database restored successfully."
fi

# D. Recreate containers using target release's compose & environment FIRST
echo "Restarting application containers with target release images..."
cd "$TARGET_RELEASE/deploy"
sudo docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate commerce storefront

# E. Healthcheck loop (FAIL-CLOSED: do NOT switch symlink if health fails)
echo "Verifying health of restored services..."
HEALTHY=0
for i in {1..30}; do
  C_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' life-mp-commerce 2>/dev/null || echo "starting")
  S_STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' life-mp-storefront 2>/dev/null || echo "starting")
  echo "  Probe [$i/30]: commerce=$C_STATUS | storefront=$S_STATUS"
  if [ "$C_STATUS" = "healthy" ] && [ "$S_STATUS" = "healthy" ]; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "❌ Error: Restored services failed to reach healthy status! Aborting symlink switch." >&2
  sudo docker logs --tail 20 life-mp-commerce
  sudo docker logs --tail 20 life-mp-storefront
  exit 1
fi

# F. Fail-Closed HTTP 200 assertions
STORE_RC=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/)
COMMERCE_RC=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9005/health)

echo "Storefront HTTP Check (127.0.0.1:3100): $STORE_RC"
echo "Commerce Health Check (127.0.0.1:9005/health): $COMMERCE_RC"

if [ "$STORE_RC" != "200" ] || [ "$COMMERCE_RC" != "200" ]; then
  echo "❌ Error: Restored services failed HTTP 200 checks (Storefront=$STORE_RC, Commerce=$COMMERCE_RC)!" >&2
  exit 1
fi
echo "✔ Restored services verified healthy with HTTP 200."

# G. Atomic Symlink Swap: current.next -> current via mv -Tf
OLD_CURRENT=$(readlink -f "$REMOTE_ROOT/current" 2>/dev/null || echo "")
ln -sfn "$TARGET_RELEASE" "$REMOTE_ROOT/current.next"
mv -Tf "$REMOTE_ROOT/current.next" "$REMOTE_ROOT/current"
echo "✔ Symlink /opt/life-mp/current atomically updated to $TARGET_RELEASE."

# H. Update PREVIOUS_RELEASE
if [ -n "$OLD_CURRENT" ] && [ -d "$OLD_CURRENT" ]; then
  basename "$OLD_CURRENT" > "$REMOTE_ROOT/PREVIOUS_RELEASE"
  echo "✔ Previous release tracked as: $(cat "$REMOTE_ROOT/PREVIOUS_RELEASE")"
fi
ROLLBACK_EOF
  echo "================================================================================"
  echo "  🎉 ATOMIC ROLLBACK COMPLETED SUCCESSFULLY                                     "
  echo "================================================================================"
  exit 0
fi

# 5. Handle Dry Run Mode
if [ "$DRY_RUN" -eq 1 ]; then
  echo -e "\n=== [DRY RUN] INSPECTING REMOTE HOST & VALIDATING COMPOSE SPEC ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" bash -s << 'DRY_RUN_EOF'
set -euo pipefail
echo "Host Free Disk Space: $(df -h / | awk 'NR==2 {print $4}')"
echo "Existing Life-MP Containers:"
sudo docker ps --filter 'name=life-mp-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

if [ -f /opt/life-mp/deploy/docker-compose.prod.yml ]; then
  echo -e "\nValidating remote docker compose specification syntax..."
  ENV_ARG=""
  if [ -f /opt/life-mp/deploy/.env.production ]; then
    ENV_ARG="--env-file /opt/life-mp/deploy/.env.production"
  fi
  STOREFRONT_IMAGE=test COMMERCE_IMAGE=test sudo -E docker compose -f /opt/life-mp/deploy/docker-compose.prod.yml $ENV_ARG config --quiet && echo "✔ Existing docker-compose.prod.yml is valid YAML and passes schema check." || echo "Notice: docker-compose config check failed or requires environment file."
fi

echo -e "\nVerified Release History:"
ls -ld /opt/life-mp/releases/rel-* 2>/dev/null || echo "No previous releases recorded."
DRY_RUN_EOF
  echo "✔ Dry-run inspection and validation completed. No mutations applied."
  exit 0
fi

# 6. Prepare Remote Root & Release Directory Structure
echo "=== [2/7] PREPARING REMOTE RELEASE DIRECTORY STRUCTURE ==="
RELEASE_DIR="$REMOTE_ROOT/releases/$RELEASE_ID"
BACKUP_DIR="/var/backups/life-mp/$RELEASE_ID"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" "
  sudo mkdir -p $REMOTE_ROOT $REMOTE_ROOT/releases $REMOTE_ROOT/shared $RELEASE_DIR $BACKUP_DIR
  sudo chown -R \$USER:\$USER $REMOTE_ROOT $BACKUP_DIR
  chmod 700 $BACKUP_DIR
"

# 7. Synchronize Codebase into Versioned Release Directory
echo "=== [3/7] SYNCHRONIZING CODEBASE TO RELEASE DIRECTORY ==="
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
  "$LOCAL_SRC/" "$VM_HOST:$RELEASE_DIR/"

echo "✔ Codebase synchronized to $RELEASE_DIR."

# 8. Remote Execution: Fail-Closed Backup, Image Build, Migrations & Release Linking
echo "=== [4/7] EXECUTING REMOTE PRE-DEPLOYMENT BACKUP & VERIFICATION ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_HOST" bash -s -- "$RELEASE_ID" "$LOCAL_COMMIT" "$LOCAL_BRANCH" "$DIRTY_FILES" "$DIFF_SHA" "$UNTRACKED_COUNT" << 'EOF'
set -euo pipefail

RELEASE_ID="$1"
LOCAL_COMMIT="$2"
LOCAL_BRANCH="$3"
DIRTY_COUNT="$4"
DIFF_SHA="$5"
UNTRACKED_COUNT="$6"

REMOTE_ROOT="/opt/life-mp"
RELEASE_DIR="$REMOTE_ROOT/releases/$RELEASE_ID"
BACKUP_DIR="/var/backups/life-mp/$RELEASE_ID"
SHARED_ENV="$REMOTE_ROOT/shared/.env.production"

# A. Preflight Disk Space Check (require >= 4GB free)
FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
if [ "$FREE_KB" -lt 4194304 ]; then
  echo "❌ Error: Less than 4GB disk space available on host. Aborting to protect host services." >&2
  exit 1
fi
echo "✔ Disk space verified: $(df -h / | awk 'NR==2 {print $4}') free."

# B. Idempotent Shared Secrets Management
if [ ! -f "$SHARED_ENV" ]; then
  echo "Generating fresh cryptographically secure production secrets..."
  DB_PASS=$(openssl rand -hex 24)
  JWT_SEC=$(openssl rand -hex 32)
  COOKIE_SEC=$(openssl rand -hex 32)

  cat << ENV > "$SHARED_ENV"
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
ENV
  chmod 600 "$SHARED_ENV"
  echo "✔ Created shared production environment file."
else
  echo "✔ Preserving existing shared production environment."
fi

# Link shared environment into release
cp "$SHARED_ENV" "$RELEASE_DIR/deploy/.env.production"
echo "COMMERCE_IMAGE=life-mp-commerce:${RELEASE_ID}" >> "$RELEASE_DIR/deploy/.env.production"
echo "STOREFRONT_IMAGE=life-mp-storefront:${RELEASE_ID}" >> "$RELEASE_DIR/deploy/.env.production"

# C. Fail-Closed Cryptographically Verified Pre-deployment Backup (P1)
echo "Creating pre-deployment backup under $BACKUP_DIR..."
cp "$SHARED_ENV" "$BACKUP_DIR/.env.production.bak"

DB_BACKUP_STATUS="absent_fresh_install"
if sudo docker ps --format '{{.Names}}' | grep -q "^life-mp-postgres$"; then
  echo "Executing pg_dump of life_production database..."
  set +e
  DUMP_ERR=$(sudo docker exec life-mp-postgres pg_dump -U life_prod life_production > "$BACKUP_DIR/life_production.sql" 2>&1)
  DUMP_RC=$?
  set -e
  if [ "$DUMP_RC" -ne 0 ]; then
    echo "❌ Error: Pre-deployment pg_dump failed (exit $DUMP_RC)!" >&2
    echo "$DUMP_ERR" >&2
    exit 1
  fi
  # Verify dump integrity: non-empty and contains valid footer
  if [ ! -s "$BACKUP_DIR/life_production.sql" ]; then
    echo "❌ Error: Database dump file is empty!" >&2
    exit 1
  fi
  if ! tail -n 25 "$BACKUP_DIR/life_production.sql" | grep -q "PostgreSQL database dump complete"; then
    echo "❌ Error: Database dump file lacks complete footer marker!" >&2
    exit 1
  fi
  echo "✔ Database dump successfully created and verified ($(wc -c < "$BACKUP_DIR/life_production.sql" | tr -d ' ') bytes)."
  echo "BACKUP_WITH_DB" > "$BACKUP_DIR/BACKUP_COMPLETE_WITH_DB"
  DB_BACKUP_STATUS="completed_verified"
else
  echo "BACKUP_FRESH" > "$BACKUP_DIR/BACKUP_COMPLETE_FRESH"
fi

# Generate SHA256 checksums and seal with sentinel marker
(cd "$BACKUP_DIR" && sha256sum * > CHECKSUMS.sha256)
echo "BACKUP_VERIFIED" > "$BACKUP_DIR/BACKUP_COMPLETE"
echo "✔ Backup cryptographically sealed and verified with BACKUP_COMPLETE marker ($DB_BACKUP_STATUS)."

echo -e "\n=== [5/7] BUILDING DOCKER IMAGES WITH IMMUTABLE TAGS & CAPTURING DIGESTS ==="
cd "$RELEASE_DIR"

# Build backend and storefront sequentially with release-specific immutable tags
sudo docker build \
  -t "life-mp-commerce:${RELEASE_ID}" \
  -t "life-mp-commerce:production" \
  -f deploy/Dockerfile.commerce .

sudo docker build \
  --build-arg NEXT_PUBLIC_MEDUSA_API_URL=https://life-mp.pp.ua/api \
  -t "life-mp-storefront:${RELEASE_ID}" \
  -t "life-mp-storefront:production" \
  -f deploy/Dockerfile.storefront .

COMMERCE_DIGEST=$(sudo docker inspect --format='{{.Id}}' "life-mp-commerce:${RELEASE_ID}")
STOREFRONT_DIGEST=$(sudo docker inspect --format='{{.Id}}' "life-mp-storefront:${RELEASE_ID}")
echo "✔ Docker images built:"
echo "   Commerce:   ${RELEASE_ID} ($COMMERCE_DIGEST)"
echo "   Storefront: ${RELEASE_ID} ($STOREFRONT_DIGEST)"

echo -e "\n=== [6/7] STARTING INFRASTRUCTURE & EXECUTING MIGRATIONS ==="
cd "$RELEASE_DIR/deploy"
sudo docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

echo "Waiting for life-mp-postgres to report healthy status..."
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
  "life-mp-commerce:${RELEASE_ID}" \
  node --import tsx node_modules/@medusajs/cli/cli.js db:migrate 2>&1)
MIGRATE_STATUS=$?
set -e

if [ "$MIGRATE_STATUS" -ne 0 ]; then
  echo "❌ Error: Medusa DB migrations failed with exit code $MIGRATE_STATUS!" >&2
  echo "$MIGRATE_OUT" >&2
  exit 1
fi
echo "✔ Database migrations applied successfully."

# Start application containers with new release BEFORE switching symlink
echo "Starting Life-MP Commerce & Storefront services..."
sudo docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate commerce storefront

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
  echo "❌ Error: Life-MP services failed to become healthy within 90 seconds. Aborting deployment before symlink switch." >&2
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
  echo "❌ Error: Storefront returned HTTP $STORE_HTTP (expected 200)! Symlink NOT switched." >&2
  exit 1
fi

if [ "$COMMERCE_HTTP" != "200" ]; then
  echo "❌ Error: Commerce health returned HTTP $COMMERCE_HTTP (expected 200)! Symlink NOT switched." >&2
  exit 1
fi

# ATOMIC SYMLINK SWAP (Only after health and HTTP 200 verified!)
OLD_CURRENT=$(readlink -f "$REMOTE_ROOT/current" 2>/dev/null || echo "")
ln -sfn "$RELEASE_DIR" "$REMOTE_ROOT/current.next"
mv -Tf "$REMOTE_ROOT/current.next" "$REMOTE_ROOT/current"
echo "✔ Atomic symlink /opt/life-mp/current -> $RELEASE_DIR."

# Track previous release
if [ -n "$OLD_CURRENT" ] && [ -d "$OLD_CURRENT" ] && [ "$OLD_CURRENT" != "$RELEASE_DIR" ]; then
  basename "$OLD_CURRENT" > "$REMOTE_ROOT/PREVIOUS_RELEASE"
  echo "✔ Previous release tracked as: $(cat "$REMOTE_ROOT/PREVIOUS_RELEASE")"
fi

# Write Release Metadata
cat << REL > "$RELEASE_DIR/deploy/RELEASE_METADATA.json"
{
  "releaseId": "$RELEASE_ID",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "$LOCAL_COMMIT",
  "branch": "$LOCAL_BRANCH",
  "worktreeClean": $([ "$DIRTY_COUNT" -eq 0 ] && echo "true" || echo "false"),
  "uncommittedDiffSha": "$DIFF_SHA",
  "untrackedFilesCount": $UNTRACKED_COUNT,
  "backupDir": "$BACKUP_DIR",
  "databaseBackupStatus": "$DB_BACKUP_STATUS",
  "imageTags": {
    "commerce": "life-mp-commerce:${RELEASE_ID}",
    "storefront": "life-mp-storefront:${RELEASE_ID}"
  },
  "imageDigests": {
    "commerce": "$COMMERCE_DIGEST",
    "storefront": "$STOREFRONT_DIGEST"
  },
  "ports": {
    "storefront": 3100,
    "commerce": 9005
  },
  "domain": "life-mp.pp.ua"
}
REL
chmod 644 "$RELEASE_DIR/deploy/RELEASE_METADATA.json"
echo "✔ Release metadata recorded in $RELEASE_DIR/deploy/RELEASE_METADATA.json."

EOF

echo "================================================================================"
echo "  🎉 DEPLOYMENT COMPLETE & VERIFIED (Release: $RELEASE_ID)                     "
echo "================================================================================"
echo ""
echo "Next step: Verify Cloudflare Tunnel routing for https://$DOMAIN"
echo "  - Tunnel Container: life-mp-tunnel (already active on server)"
echo "  - Storefront: 127.0.0.1:3100"
echo "  - Commerce: 127.0.0.1:9005"
echo "================================================================================"
