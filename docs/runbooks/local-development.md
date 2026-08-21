# Посібник розробника: локальне середовище «ЛАЙФ»

- **Дата огляду:** 2026-08-21
- **Власник:** технічний власник Life-MP
- **Середовище:** лише локальне development/test
- **Не є:** staging, production, live payment або реальний carrier-контур

## 1. Архітектурні межі

Локальна інфраструктура запускає Docker Compose з PostgreSQL 16, Redis 7 і Meilisearch. Усі порти прив’язані до loopback:

| Сервіс        | Адреса            | Призначення                                    |
| ------------- | ----------------- | ---------------------------------------------- |
| PostgreSQL 16 | `127.0.0.1:54329` | Локальні Medusa development/test databases     |
| Redis 7       | `127.0.0.1:56379` | Локальний cache/queue контур                   |
| Meilisearch   | `127.0.0.1:7700`  | Локальний експериментальний search service     |
| Commerce      | `127.0.0.1:9000`  | Medusa development server, запускається окремо |
| Storefront    | `127.0.0.1:3100`  | Next.js development server                     |

Compose не запускає прикладні застосунки. Він не є staging або production topology.

## 2. Передумови

```bash
corepack enable
pnpm --version
node --version
pnpm install
```

Не створюйте `.env` із production secrets. Для локальних commerce wrapper-ів використовується безсекретний `.env.example`; його sentinel-значення не можна використовувати поза локальним контуром.

## 3. Запуск локальних сервісів

```bash
make dev-infra-up
make dev-infra-wait
make db-bootstrap
```

Якщо canonical порти вже зайняті іншим Compose-проєктом, не видаляйте чужі контейнери або volumes. Спочатку визначте власника порту та використовуйте ізольований профіль лише після окремого погодження.

Перевірка конфігурації без запуску:

```bash
docker compose --env-file .env.example -f docker-compose.dev.yml config --quiet
```

Зупинка без видалення даних:

```bash
make dev-infra-down
```

Команди `make db-reset`, `make docker-clean`, `make db-restore` і `test-fresh-state` є локальними руйнівними операціями. Виконуйте їх лише з явним погодженням і після перевірки, що target — саме цей репозиторій.

## 4. Міграція та синтетичний seed Commerce

```bash
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run db:migrate
ALLOW_SYNTHETIC_CATALOG=true \
  scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run seed
```

Правила:

- wrapper підставляє `NODE_ENV=development` і локальні database/Redis URLs;
- seed відхиляється без `ALLOW_SYNTHETIC_CATALOG=true`;
- `ALLOW_SYNTHETIC_ORDERS` і `ALLOW_SYNTHETIC_REVIEWS` вмикайте лише для відповідного test сценарію;
- seed не додає реальні товари, документи, payment records або vendor credentials.

## 5. Запуск застосунків

### 5.1. Commerce (Medusa, бекенд)

У терміналі A:

```bash
scripts/with-local-commerce-env.sh \
  pnpm --filter @life/commerce run dev
```

Перевірки:

```bash
curl -i http://127.0.0.1:9000/store/catalog
```

`GET /store/catalog` може повернути синтетичний каталог лише у дозволеному development/test контурі. Для production відсутність explicit guard не повинна перетворюватися на fixtures fallback.

### 5.2. Storefront за замовчуванням

У терміналі B:

```bash
pnpm --filter @life/storefront dev
```

Адреса: [http://127.0.0.1:3100](http://127.0.0.1:3100).

За замовчуванням `CATALOG_SOURCE=fixtures`; це локальна демонстраційна вітрина.

### 5.3. Storefront із локальним Medusa catalog

```bash
CATALOG_SOURCE=medusa \
MEDUSA_BACKEND_URL=http://127.0.0.1:9000 \
ALLOW_SYNTHETIC_CATALOG=true \
NODE_ENV=development \
pnpm --filter @life/storefront dev
```

У цьому режимі публічна вітрина читає лише дозволений synthetic catalog. Відсутній backend або недійсна відповідь дає безпечний unavailable/empty result, а не непомітний production fallback.

## 6. Важливі локальні маршрути

- `/catalog` — каталог;
- `/profile` — локальний профіль і sandbox customer view;
- `/vendor/dashboard` — локальний vendor UI;
- `/moderation` — локальний moderation UI;
- `/checkout` — draft-only checkout UX;
- `/checkout/success` — draft result без реальної оплати;
- `/orders/[orderNumber]` — sandbox/demo tracking view.

Наявність цих сторінок не доводить створення бойового order, payment, shipment, fiscal receipt або payout.

## 7. Перевірки якості

```bash
pnpm docs:check
pnpm format:check
pnpm lint
pnpm build:packages
pnpm typecheck
pnpm test
pnpm build
pnpm run ci
```

Перевірка containment і Compose:

```bash
node scripts/verify-deployment-containment.mjs
docker compose --env-file .env.example -f docker-compose.dev.yml config --quiet
```

Інтеграційні перевірки Commerce:

```bash
make test-integration
make test-migrations
```

Свіжі результати потрібно фіксувати разом із commit/worktree, датою, командою та exit status. Числа тестів у документах є inventory, а не автоматичною заявою про pass.

Playwright:

```bash
pnpm --filter @life/storefront exec playwright install chromium
pnpm --filter @life/storefront run test:e2e
```

## 8. Безпечне завершення

```bash
make dev-infra-down
```

Не використовуйте `docker system prune`, `docker volume rm` або видалення чужих контейнерів без окремого explicit approval. Локальні volumes можуть містити дані іншого проєкту.

## 9. Межа доказу

Успішний локальний запуск доводить лише працездатність конкретного локального сценарію. Він не доводить:

- production readiness або staging readiness;
- юридичну модель продавця, фіскалізацію чи платіжний договір;
- роботу бойової Нової Пошти або реальних webhook-ів;
- ізольованість віддаленого сервера;
- відсутність вразливостей у неперевіреному commit або зовнішній інфраструктурі.
