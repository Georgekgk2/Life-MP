# Runbook: локальна розробка

## Призначення та межа

Цей runbook описує локальне середовище розробки на Node.js 22, pnpm і OrbStack/Docker Compose. `docker-compose.dev.yml` запускає **тільки** PostgreSQL 16 і Redis 7. Commerce backend (`apps/commerce`) та Storefront (`apps/storefront`) запускаються у локальних вузлах розробника.

PostgreSQL та Redis опубліковані виключно на `127.0.0.1`. Це обмеження захищає локальну машину від доступу з мережі.

## Передумови

1. Встановлено Node.js 22.
2. Доступний pnpm (через Corepack).
3. Docker Compose доступний у терміналі (наприклад, через OrbStack).
4. Робоча копія не містить і не потребує production credentials.

Встановіть залежності з кореня репозиторію:

```bash
corepack enable
pnpm install
```

## Керування локальними data-services та бд

1. Запуск PostgreSQL і Redis:

```bash
make dev-infra-up
make dev-infra-wait
```

2. Ініціалізація баз даних і ролей застосунку (`life_medusa_dev`, `life_medusa_test`, `life_medusa_migration_test`):

```bash
make db-bootstrap
```

3. Виконання міграцій розробницької БД Medusa:

```bash
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run db:migrate
```

4. Засів локальної БД некомерційними синтетичними даними каталогу:

```bash
ALLOW_SYNTHETIC_CATALOG=true scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run seed
```

## Запуск Commerce та Storefront

Для повноцінної перевірки каталогу розробки виконайте наступні кроки у двох терміналах:

**Термінал A (Medusa Commerce Backend):**
```bash
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run dev
```
Зачекайте, поки `http://127.0.0.1:9000/store/catalog` почне повертати 200 OK.

**Термінал B (Next.js Storefront у Medusa-режимі):**
```bash
CATALOG_SOURCE=medusa MEDUSA_BACKEND_URL=http://127.0.0.1:9000 NODE_ENV=development pnpm --filter @life/storefront dev
```
Storefront за адресою [http://127.0.0.1:3100](http://127.0.0.1:3100) завантажуватиме публічний синтетичний каталог безпосередньо з Medusa API.

За замовчуванням (`CATALOG_SOURCE=fixtures`) Storefront працює автономно у fixture-режимі.

## Перевірки якості та інфотести

Запуск юніт-тестів та статичних перевірок з кореня:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Запуск інтеграційних тестів авторизації, модерації та публікації каталогу:

```bash
make test-integration
```

Запуск тестів ідемпотентності міграцій:

```bash
make test-migrations
```

## Межі розробки

Будь-які комерційні операції (кошик, замовлення, checkout, оплата, фіскалізація, відправлення) суворо заблоковані. Всі публічні товари маркуються позначкою "Синтетичні локальні дані".
