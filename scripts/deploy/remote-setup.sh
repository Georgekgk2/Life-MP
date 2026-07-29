#!/usr/bin/env bash
# =============================================================================
# Life-MP — Remote Server Setup Script
# =============================================================================
# Виконується ОДИН РАЗ на сервері для підготовки до CI/CD deployment.
# Потрібен sudo access.
#
# Використання:
#   ssh user@server 'bash -s' < scripts/deploy/remote-setup.sh
# =============================================================================
set -euo pipefail

LIFE_MP_DIR="/opt/life-mp"
LIFE_MP_USER="life-mp"

echo "=== Life-MP Server Setup ==="

# --- Create dedicated user ---
if ! id -u "${LIFE_MP_USER}" >/dev/null 2>&1; then
    echo "Creating user: ${LIFE_MP_USER}"
    sudo useradd --system --create-home --shell /bin/bash "${LIFE_MP_USER}"
else
    echo "User ${LIFE_MP_USER} already exists"
fi

# --- Install Docker (if not present) ---
if ! command -v docker >/dev/null 2>&1; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "${LIFE_MP_USER}"
else
    echo "Docker already installed: $(docker --version)"
fi

# --- Install Docker Compose plugin (if not present) ---
if ! docker compose version >/dev/null 2>&1; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
else
    echo "Docker Compose already available: $(docker compose version)"
fi

# --- Create project directory ---
echo "Setting up project directory: ${LIFE_MP_DIR}"
sudo mkdir -p "${LIFE_MP_DIR}"
sudo chown "${LIFE_MP_USER}:${LIFE_MP_USER}" "${LIFE_MP_DIR}"

# --- Clone repository ---
if [ ! -d "${LIFE_MP_DIR}/.git" ]; then
    echo "Cloning repository..."
    sudo -u "${LIFE_MP_USER}" git clone https://github.com/Georgekgk2/Life-MP.git "${LIFE_MP_DIR}"
else
    echo "Repository already cloned"
fi

# --- Create .env from template ---
if [ ! -f "${LIFE_MP_DIR}/.env" ]; then
    echo "Creating .env from template..."
    sudo -u "${LIFE_MP_USER}" cp "${LIFE_MP_DIR}/deploy/.env.prod.template" "${LIFE_MP_DIR}/.env"
    echo ""
    echo "⚠️  IMPORTANT: Edit ${LIFE_MP_DIR}/.env with real values!"
    echo "   Required: POSTGRES_PASSWORD, JWT_SECRET, COOKIE_SECRET"
    echo ""
else
    echo ".env already exists (not overwriting)"
fi

# --- Setup GHCR authentication ---
echo ""
echo "To enable GHCR image pulls, run:"
echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u Georgekgk2 --password-stdin"
echo ""

# --- Create backup directory ---
sudo -u "${LIFE_MP_USER}" mkdir -p "${LIFE_MP_DIR}/backups/pre-deploy"

# --- Firewall (if ufw is present) ---
if command -v ufw >/dev/null 2>&1; then
    echo "Configuring firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw --force enable
    echo "Firewall configured"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit ${LIFE_MP_DIR}/.env with production values"
echo "  2. Configure GitHub Secrets:"
echo "     - DEPLOY_HOST: server IP/domain"
echo "     - DEPLOY_USER: ${LIFE_MP_USER}"
echo "     - DEPLOY_SSH_KEY: private key for SSH access"
echo "  3. Run: cd ${LIFE_MP_DIR} && make deploy-prod"
echo ""
