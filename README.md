# Life-MP — «ЛАЙФ»

Life-MP — український монорепозиторій для майбутнього багатопостачальницького маркетплейсу. Поточний репозиторій призначений для локальної розробки, тестування та контрольованих sandbox-сценаріїв. **Це не production, не staging і не дозвіл на комерційний запуск.**

> **Коротко про межу:** ядро каталогу, вендорів, модерації, ізоляції та customer-trust тестових контурів реалізоване локально; бойові платежі, фіскалізація, реальна доставка, виплати, юридична модель і production-розгортання заблоковані.

## Перед початком

- Node.js 22;
- pnpm 11;
- Docker Compose через OrbStack або сумісне локальне середовище.

Локальні PostgreSQL, Redis та Meilisearch прив’язані лише до `127.0.0.1`. Вони не є production-інфраструктурою.

## Швидкий старт

```bash
corepack enable
pnpm install
make dev-infra-up
make dev-infra-wait
```

Основні перевірки:

```bash
pnpm docs:check
pnpm format:check
pnpm lint
pnpm build:packages
pnpm typecheck
pnpm test
pnpm build
# повний локальний набір:
pnpm run ci
```

Для повного локального середовища, міграцій, синтетичного seed і тестів використовуйте [посібник локальної розробки](docs/runbooks/local-development.md).

## Локальна вітрина

```bash
pnpm --filter @life/storefront dev
```

Вітрина доступна за адресою [http://127.0.0.1:3100](http://127.0.0.1:3100). За замовчуванням каталог читає локальні fixtures. Це UI-прототип із draft/sandbox-сценаріями; він не приймає бойові платежі та не створює реальні відправлення чи виплати.

Щоб свідомо читати синтетичний каталог із Medusa у development, потрібні `CATALOG_SOURCE=medusa`, `MEDUSA_BACKEND_URL` та явний `ALLOW_SYNTHETIC_CATALOG=true`. У production синтетичні дані мають бути недоступні.

## Поточна реалізація

| Контур | Фактична роль |
|---|---|
| `apps/storefront` | Next.js App Router: локальна вітрина, fixtures/Medusa catalog seam, пошук, профіль і sandbox UX. |
| `apps/commerce` | Medusa v2.18.0 із модулем `marketplace`: vendor/listing/moderation/compliance, customer-order/review тестові межі та локальні API. |
| `packages/types` | Спільні TypeScript-контракти DTO каталогу, customer orders/reviews і sandbox-моделей. |
| `packages/config` | Типізовані конфігурації та правила інструментів. |
| `apps/cms` | Структурна межа без Payload runtime; Payload заблокований відповідно до ADR 0005. |
| `docker-compose.dev.yml` | Лише локальні PostgreSQL 16, Redis 7 і Meilisearch; прикладні застосунки запускаються окремо. |

## Що прямо не є реалізованим production-контуром

- юридичний продавець та одержувач коштів;
- платіжний еквайринг, ідемпотентні бойові webhook-и та повернення;
- ПРРО/фіскалізація;
- реальний API Нової Пошти, бойові ЕН/ТТН і fulfillment SLA;
- vendor settlements, affiliate payouts і booking;
- production auth/onboarding, public regulated claims та CMS runtime;
- staging або production server, secrets, backup/restore drill і deployment promotion.

Внутрішні кошик, checkout, order split, escrow та tracking fixtures можуть існувати як **sandbox/draft** для UI або тестів. Вони не є фінансовою, юридичною чи логістичною операційною системою. Commerce capability guard у `apps/commerce/src/index.ts` навмисно залишає checkout, payment, fiscalization, order split, shipment, affiliate payout і booking поза production scope.

## Куди дивитися далі

- [Карта документації та ієрархія джерел](docs/README.md)
- [Реєстр документації, статусів і власників](docs/documentation-register.md)
- [Межі запуску](docs/decisions/launch-scope.md)
- [Реєстр відкритих рішень](docs/decisions/open-questions.md)
- [Огляд фактичної архітектури](docs/architecture/overview.md)
- [ERD v1](docs/architecture/erd-v1.md)
- [Ворота production readiness](docs/decisions/production-readiness-gate.md)

## Виробниче розгортання на спільному сервері (`life-mp.pp.ua`)

Для розгортання оновленого проєкту Life-MP на спільному виробничому сервері (`34.139.21.224`) поряд із проєктом **Jorvis** реалізовано модель повної ізоляції **Zero-Public-Port**:

1. **Ізоляція портів:** Стек Life-MP не відкриває публічні порти 80 або 443. Вітрина Next.js слухає строго на `127.0.0.1:3100`, а бекенд Medusa v2 — на `127.0.0.1:9005`. Бази даних Postgres (5432) та Redis (6379) закриті всередині приватної мережі `life-mp-net`.
2. **Ізоляція імен:** Усі контейнери (`life-mp-*`), томи (`life-mp-*-data`) та мережа (`life-mp-net`) мають префікс `life-mp-`, що виключає колізії з `jorvis-*`.
3. **Квоти ресурсів:** Сумарне споживання обмежене до **~2.0 ГБ RAM** (Postgres: 512M, Redis: 192M, Commerce: 768M, Storefront: 512M).
4. **Запуск деплою в одну команду:**
   ```bash
   ./scripts/deploy_prod.sh
   ```
5. **Маршрутизація Cloudflare:** Трафік з домену `life-mp.pp.ua` доставляється через **Cloudflare Tunnel** (`cloudflared`) безпосередньо в локальні порти `3100` (Storefront) та `9005` (`api/*`), або через спільний віртуальний хост Caddy.

## Безпека

- Не додавайте секрети, auth tokens, PII, реальні документи вендорів або `.env` до Git.
- Не використовуйте `.env.example` як production-конфігурацію.
- Не обходьте decision gates «тимчасовим» checkout, payment, shipment або vendor onboarding.
- Не виконуйте production runbook: він заблокований до авторизованого discovery, юридичних/фінансових рішень та окремого sign-off.
