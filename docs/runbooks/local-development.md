# Посібник розробника: Локальне середовище ЛАЙФ (Local Development Runbook)

## 1. Загальний огляд та архітектурні межі

Локальне середовище розробки маркетплейсу «ЛАЙФ» побудоване на базі **Node.js 22, pnpm 11.4 та Docker Compose**.

Сервіси баз даних (PostgreSQL 16, Redis 7, Meilisearch) запускаються в Docker-контейнерах виключно на локальному loopback-інтерфейсі `127.0.0.1`. Storefront (`apps/storefront`) та Commerce Backend (`apps/commerce`) працюють локально на робочій станції розробника.

---

## 2. Швидкий старт (Quick Start)

### 2.1. Встановлення залежностей

```bash
corepack enable
pnpm install
```

### 2.2. Запуск інфраструктури (PostgreSQL, Redis, Meilisearch)

```bash
make dev-infra-up
make dev-infra-wait
```

- **PostgreSQL 16:** `127.0.0.1:54329`
- **Redis 7:** `127.0.0.1:56379`
- **Meilisearch:** `127.0.0.1:7700`

### 2.3. Ініціалізація баз даних та міграцій

```bash
make db-bootstrap
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run db:migrate
ALLOW_SYNTHETIC_CATALOG=true scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run seed
```

---

## 3. Запуск застосунків

### 3.1. Вітрина Storefront (Next.js 16)

```bash
# Автономний режим зі статичними даними та PWA:
pnpm --filter @life/storefront dev --port 3100

# Режим з інтеграцією Medusa API:
CATALOG_SOURCE=medusa MEDUSA_BACKEND_URL=http://127.0.0.1:9000 pnpm --filter @life/storefront dev --port 3100
```

- **URL Вітрини:** [http://127.0.0.1:3100](http://127.0.0.1:3100)
- **Web App Manifest:** [http://127.0.0.1:3100/manifest.webmanifest](http://127.0.0.1:3100/manifest.webmanifest)
- **Кабінет модератора:** [http://127.0.0.1:3100/moderation](http://127.0.0.1:3100/moderation)
- **Кабінет покупця:** [http://127.0.0.1:3100/profile](http://127.0.0.1:3100/profile)
- **Подача товару майстром:** [http://127.0.0.1:3100/vendor/products/new](http://127.0.0.1:3100/vendor/products/new)
- **Оформлення замовлення:** [http://127.0.0.1:3100/checkout](http://127.0.0.1:3100/checkout)
- **Трекінг та Escrow-симулятор:** [http://127.0.0.1:3100/orders/LF-20260819-1001](http://127.0.0.1:3100/orders/LF-20260819-1001)

### 3.2. Бекенд Commerce (Medusa v2)

```bash
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run dev
```

- **URL Medusa API:** [http://127.0.0.1:9000](http://127.0.0.1:9000)
- **Публічний каталог:** `GET http://127.0.0.1:9000/store/catalog`

---

## 4. Набір перевірок якості та автоматизовані тести

### 4.1. Локальна валідація всього монорепозиторію

```bash
pnpm format:check       # Перевірка форматування коду Prettier
pnpm lint               # Статичний аналіз ESLint
pnpm typecheck          # Строга перевірка типів TypeScript
pnpm test               # 48 юніт-тестів Vitest
pnpm build              # Збірка всіх пакетів та App Router
node scripts/verify-deployment-containment.mjs # Перевірка політики безпеки
```

### 4.2. Наскрізні Playwright E2E тести (28 тестів)

```bash
pnpm --filter @life/storefront run test:e2e
```

Покриває:

1. Завантаження каталогу та інваріанти некомерційного режиму (`catalog.spec.ts`).
2. Мультивендорний кошик, чекаут, спліт замовлень та Escrow-виплати Нової Пошти (`checkout-and-escrow.spec.ts`).
3. Історії майстрів та динамічні події з розкладом (`community.spec.ts`).
4. Дворівневий кабінет модератора для анкет та товарів (`moderation.spec.ts`).
5. Кабінет покупця з 4 розділами та налаштуваннями сповіщень (`profile.spec.ts`).
6. Progressive Web App: Manifest, Service Worker та бренд-іконки (`pwa.spec.ts`).
7. Список бажань (Wishlist) та онбординг майстерень (`saved-and-artisan.spec.ts`).
8. Швидкий пошук (Cmd+K), українська морфологія, синоніми та автокомпліт (`search.spec.ts`).
9. Подача товарів майстрами з live-прев'ю картки (`vendor-product.spec.ts`).

### 4.3. Інтеграційні тести бекенду Medusa

```bash
make test-integration   # 7 HTTP тестів авторизації, комплаєнсу та модерації
make test-migrations    # 2 тести ідемпотентності міграцій PostgreSQL
```
