#!/usr/bin/env bash
# =============================================================================
# Life-MP — Rollback Script
# =============================================================================
# Відкат до попереднього image без database rollback (per ADR 0003).
#
# Використання:
#   ./scripts/deploy/rollback.sh [TAG]
#
# Якщо TAG не вказано, використовується latest backup marker.
# =============================================================================
set -euo pipefail

COMPOSE_FILE="/opt/life-mp/deploy/docker-compose.prod.yml"
ENV_FILE="/opt/life-mp/.env"
BACKUP_DIR="/opt/life-mp/backups/pre-deploy"

TAG="${1:-}"

if [ -z "${TAG}" ]; then
    echo "Looking for previous image tags..."
    LATEST_COMMERCE=$(ls -t "${BACKUP_DIR}"/commerce_image_*.txt 2>/dev/null | head -1)
    LATEST_STOREFRONT=$(ls -t "${BACKUP_DIR}"/storefront_image_*.txt 2>/dev/null | head -1)

    if [ -z "${LATEST_COMMERCE}" ] || [ -z "${LATEST_STOREFRONT}" ]; then
        echo "Error: No backup markers found. Provide TAG explicitly."
        echo "Usage: $0 <image-tag>"
        exit 1
    fi

    COMMERCE_IMAGE=$(cat "${LATEST_COMMERCE}")
    STOREFRONT_IMAGE=$(cat "${LATEST_STOREFRONT}")
else
    REGISTRY="ghcr.io/georgekgk2/life-mp"
    COMMERCE_IMAGE="${REGISTRY}/commerce:${TAG}"
    STOREFRONT_IMAGE="${REGISTRY}/storefront:${TAG}"
fi

echo "=== Life-MP Rollback ==="
echo "Commerce:   ${COMMERCE_IMAGE}"
echo "Storefront: ${STOREFRONT_IMAGE}"
echo ""

read -p "Proceed with rollback? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled."
    exit 0
fi

cd /opt/life-mp

# Pull the rollback images
docker pull "${COMMERCE_IMAGE}" || true
docker pull "${STOREFRONT_IMAGE}" || true

# Restart with rollback images
COMMERCE_IMAGE="${COMMERCE_IMAGE}" \
STOREFRONT_IMAGE="${STOREFRONT_IMAGE}" \
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --remove-orphans

# Wait and verify
echo "Waiting for services..."
sleep 15
docker compose -f "${COMPOSE_FILE}" ps

if curl -sf http://localhost:9000/health > /dev/null 2>&1; then
    echo "Commerce: OK"
else
    echo "Warning: Commerce health check failed after rollback"
fi

echo ""
echo "=== Rollback complete ==="
