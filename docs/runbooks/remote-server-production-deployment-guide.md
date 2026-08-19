# Інструкція з розгортання маркетплейсу «ЛАЙФ» на віддаленому сервері (Production Deployment Runbook)

## 📌 Загальна інформація

- **Проєкт:** «ЛАЙФ» — Український крафтовий мультивендорний маркетплейс (Life-MP).
- **Стек:** Next.js 16 (App Router, PWA), Medusa v2.18.0 (Node.js 22), PostgreSQL 16, Redis 7, Caddy 2 (TLS / Reverse Proxy), Docker Compose.
- **Цільова ОС:** Ubuntu 22.04 LTS або Ubuntu 24.04 LTS (x86_64 / aarch64).
- **Рекомендований сервер:** Hetzner CX31 / CPX31 (2–4 vCPU, 4–8 GB RAM, 40–80 GB NVMe SSD) або еквівалентний VPS.

---

## 📑 Зміст інструкції

1. [Вимоги та підготовка домену](#1-вимоги-та-підготовка-домену)
2. [Базова безпека та налаштування сервера (OS Hardening)](#2-базова-безпека-та-налаштування-сервера-os-hardening)
3. [Встановлення Docker та Docker Compose](#3-встановлення-docker-та-docker-compose)
4. [Клонування коду та підготовка директорії](#4-клонування-коду-та-підготовка-директорії)
5. [Генерація секретів та конфігурація `.env.production`](#5-генерація-секретів-та-конфігурація-envproduction)
6. [Конфігурація Caddy Reverse Proxy та SSL](#6-конфігурація-caddy-reverse-proxy-та-ssl)
7. [Ініціалізація бази даних та запуск сервісів](#7-ініціалізація-бази-даних-та-запуск-сервісів)
8. [Перевірка працездатності (Healthchecks)](#8-перевірка-працездатності-healthchecks)
9. [Автоматичне резервне копіювання (Backups)](#9-автоматичне-резервне-копіювання-backups)
10. [Процедура оновлення без простою (Zero-Downtime Deployment & Rollback)](#10-процедура-оновлення-без-простою-zero-downtime-deployment--rollback)

---

## 1. Вимоги та підготовка домену

1. **DNS-записи:**
   - Направте `A`-запис вашого домену (наприклад, `your-domain.ua` або `marketplace.your-domain.ua`) на публічну IP-адресу сервера (`YOUR_SERVER_IP`).
2. **SSH-доступ:** Наявність відкритого SSH-ключа для автентифікації на сервері.

---

## 2. Базова безпека та налаштування сервера (OS Hardening)

Виконайте підключення до сервера під користувачем `root`:

```bash
ssh root@YOUR_SERVER_IP
```

### 2.1. Оновлення пакетів ОС

```bash
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban htop net-tools ca-certificates gnupg lsb-release
```

### 2.2. Створення системного користувача `deployer`

```bash
# Створення користувача
adduser --gecos "" deployer
usermod -aG sudo deployer

# Налаштування SSH-доступу для deployer
mkdir -p /home/deployer/.ssh
cp /root/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys

# Дозвіл sudo без пароля (для автоматизації)
echo "deployer ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deployer
```

### 2.3. Налаштування файрволу (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Caddy'
ufw allow 443/tcp comment 'HTTPS Caddy'
ufw allow 443/udp comment 'HTTP/3 Caddy'
ufw --force enable
ufw status verbose
```

### 2.4. Налаштування SWAP (2 GB для стабільності RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

---

## 3. Встановлення Docker та Docker Compose

```bash
# Додавання офіційного Docker репозиторію
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Додавання користувача deployer до групи docker
usermod -aG docker deployer

# Налаштування ротації логів Docker
cat << 'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker
```

---

## 4. Клонування коду та підготовка директорії

Перейдіть під користувача `deployer`:

```bash
su - deployer
```

Клонуйте репозиторій у робочу директорію:

```bash
sudo mkdir -p /opt/life-mp
sudo chown -R deployer:deployer /opt/life-mp
cd /opt/life-mp

git clone https://github.com/Georgekgk2/Life-MP.git .
git checkout main
```

---

## 5. Генерація секретів та конфігурація `.env.production`

Створіть захищений файл змінних середовища:

```bash
cd /opt/life-mp/deploy
```

Згенеруйте унікальні криптографічні ключі:

```bash
DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
```

Створіть файл `/opt/life-mp/deploy/.env.production` (замініть `your-domain.ua` на ваш реальний домен):

```bash
cat << EOF > /opt/life-mp/deploy/.env.production
# --- Production Domain ---
DOMAIN=your-domain.ua

# --- Database Credentials ---
POSTGRES_DB=life_production
POSTGRES_USER=life_prod_user
POSTGRES_PASSWORD=${DB_PASSWORD}

# --- Medusa Security ---
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}

# --- CORS Settings ---
STORE_CORS=https://your-domain.ua
ADMIN_CORS=https://your-domain.ua
AUTH_CORS=https://your-domain.ua

# --- Frontend Connection ---
NEXT_PUBLIC_MEDUSA_API_URL=/api

# --- Image Tags (для локальної збірки) ---
COMMERCE_IMAGE=life-commerce:production
STOREFRONT_IMAGE=life-storefront:production
EOF

chmod 600 /opt/life-mp/deploy/.env.production
```

---

## 6. Конфігурація Caddy Reverse Proxy та SSL

Створіть актуальний `Caddyfile` у `/opt/life-mp/deploy/Caddyfile`:

```bash
cat << 'EOF' > /opt/life-mp/deploy/Caddyfile
{$DOMAIN} {
    # 1. Medusa Backend API
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy commerce:9000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # 2. Next.js Storefront (Frontend + PWA)
    handle {
        reverse_proxy storefront:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # 3. Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    # 4. Compression (Gzip & Zstd)
    encode zstd gzip

    # 5. Access Logs
    log {
        output file /data/access.log {
            roll_size 20mb
            roll_keep 5
        }
    }
}
EOF
```

---

## 7. Ініціалізація бази даних та запуск сервісів

### 7.1. Збірка Docker-образів застосунку

```bash
cd /opt/life-mp

# Збірка Commerce образу
docker build \
  -t life-commerce:production \
  -f deploy/Dockerfile.commerce .

# Збірка Storefront образу з передачею NEXT_PUBLIC_MEDUSA_API_URL
docker build \
  --build-arg NEXT_PUBLIC_MEDUSA_API_URL=/api \
  -t life-storefront:production \
  -f deploy/Dockerfile.storefront .
```

### 7.2. Запуск інфраструктури (PostgreSQL та Redis)

```bash
cd /opt/life-mp/deploy

docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis
```

Перевірте статус здоров'я баз даних (зачекайте 5–10 секунд):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

### 7.3. Запуск міграцій Medusa у базі даних (виклик через Node CLI)

```bash
source /opt/life-mp/deploy/.env.production

docker run --rm \
  --network life-net \
  --env-file /opt/life-mp/deploy/.env.production \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@life-postgres:5432/${POSTGRES_DB}" \
  life-commerce:production \
  node --import tsx node_modules/@medusajs/cli/cli.js db:migrate
```

### 7.4. Запуск усього production-стека

```bash
cd /opt/life-mp/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 8. Перевірка працездатності (Healthchecks)

Перевірте статус усіх запущених контейнерів:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

_Усі 5 сервісів (`life-postgres`, `life-redis`, `life-commerce`, `life-storefront`, `life-caddy`) мають перебувати у статусі `Up (healthy)`._

### 8.1. Тестування ендпоінтів через `curl`:

```bash
# 1. Головна сторінка вітрини (HTTP 200)
curl -I https://your-domain.ua/

# 2. PWA Manifest (HTTP 200, application/manifest+json)
curl -I https://your-domain.ua/manifest.webmanifest

# 3. Healthcheck бекенду (HTTP 200)
curl -I https://your-domain.ua/api/health
```

---

## 9. Автоматичне резервне копіювання (Backups)

Створіть директорію для бекапів:

```bash
sudo mkdir -p /var/backups/life-mp
sudo chown -R deployer:deployer /var/backups/life-mp
```

Створіть скрипт щоденного бекапу `/opt/life-mp/deploy/backup.sh`:

```bash
cat << 'EOF' > /opt/life-mp/deploy/backup.sh
#!/bin/bash
set -eo pipefail

BACKUP_DIR="/var/backups/life-mp"
DATE=$(date +'%Y%m%d_%H%M%S')
ENV_FILE="/opt/life-mp/deploy/.env.production"

# Читання параметрів
source "${ENV_FILE}"

FILENAME="${BACKUP_DIR}/db_backup_${DATE}.sql.gz"

echo "[$(date)] Створення бекапу PostgreSQL..."
docker exec life-postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${FILENAME}"
chmod 600 "${FILENAME}"

# Видалення бекапів старіших за 14 днів
find "${BACKUP_DIR}" -type f -name "db_backup_*.sql.gz" -mtime +14 -delete

echo "[$(date)] Бекап успішно створено: ${FILENAME} (Розмір: $(du -h ${FILENAME} | cut -f1))"
EOF

chmod +x /opt/life-mp/deploy/backup.sh
```

Додайте запуск бекапу щоночі о 03:00 у cron:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/life-mp/deploy/backup.sh >> /var/log/life_backup.log 2>&1") | crontab -
```

### 9.1. Інструкція швидкого відновлення з бекапу (Disaster Recovery):

```bash
# Розпакування та відновлення в PostgreSQL:
source /opt/life-mp/deploy/.env.production
gunzip -c /var/backups/life-mp/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i life-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

---

## 10. Процедура оновлення без простою (Zero-Downtime Deployment & Rollback)

Створіть скрипт автоматичного оновлення `/opt/life-mp/deploy/deploy.sh`:

```bash
cat << 'EOF' > /opt/life-mp/deploy/deploy.sh
#!/bin/bash
set -eo pipefail

cd /opt/life-mp
echo "1. Отримання свіжого коду з main..."
git pull origin main

echo "2. Створення резервної копії перед оновленням..."
/opt/life-mp/deploy/backup.sh

echo "3. Збірка нових Docker-образів..."
docker build -t life-commerce:latest -f deploy/Dockerfile.commerce .
docker build --build-arg NEXT_PUBLIC_MEDUSA_API_URL=/api -t life-storefront:latest -f deploy/Dockerfile.storefront .

echo "4. Виконання міграцій бази даних..."
source deploy/.env.production
docker run --rm \
  --network life-net \
  --env-file deploy/.env.production \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@life-postgres:5432/${POSTGRES_DB}" \
  life-commerce:latest \
  node --import tsx node_modules/@medusajs/cli/cli.js db:migrate

echo "5. Перезапуск сервісів застосунку..."
cd deploy
docker tag life-commerce:latest life-commerce:production
docker tag life-storefront:latest life-storefront:production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps commerce storefront

echo "6. Перевірка статусу здоров'я (Healthcheck)..."
sleep 10
if curl -sf http://127.0.0.1:3000/ > /dev/null; then
    echo "✅ Оновлення пройшло успішно!"
else
    echo "❌ Помилка! Запуск автоматичного відкату (Rollback)..."
    docker compose -f docker-compose.prod.yml --env-file .env.production restart
    exit 1
fi
EOF

chmod +x /opt/life-mp/deploy/deploy.sh
```

---

## 🏁 Підсумок готовності

Після виконання цієї інструкції:

- Маркетплейс працюватиме за захищеним протоколом `https://your-domain.ua`.
- PWA-маніфест, іконки та Service Worker обслуговуватимуться безпосередньо з Next.js без 404 помилок.
- Клієнтські запити браузера надсилатимуться на правильний шлях `/api/*`, який Caddy проксує до Medusa API.
- Щоночі створюватимуться автоматичні бекапи бази даних із ротацією 14 днів.
