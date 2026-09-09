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

## Статус розгортання та політика ізоляції

Проєкт Life-MP на даному етапі є демонстраційним прототипом. Відповідно до `infra/deployment-policy.json` (статус `CONTAINED`) та `docs/decisions/production-readiness-gate.md`:

1. **Ізоляція кодової бази:** Усі можливості автоматичного віддаленого розгортання перебувають у статусі `CONTAINED`. Скрипти віддаленого виконання вилучено з кодової бази репозиторію.
2. **Публічна вітрина (`public-demo`):** Публічний інтерфейс функціонує виключно як інформаційна демонстраційна вітрина на статичних синтетичних даних. Жодних комерційних транзакцій, оплат, доставки чи онбордингу вендорів не здійснюється.
3. **Статус виробничої готовності:** Віддалена серверна інфраструктура, перевірка топології хоста, контури бекапів та комерційні модулі залишаються у статусі `BLOCKED / NOT VERIFIED` до завершення юридичних, фінансових та архітектурних погоджень (ADR 0004, Phase 5 Decision Pack).
4. **Контейнерні інваріанти:** Цільовий профіль передбачає відсутність публічних портів у застосунку (Zero-Public-Port) та доставку трафіку виключно через захищений тунель (Cloudflare Tunnel). До затвердження продакшн-гейтів будь-які прямі мутації хоста заборонені.

## Безпека

- Не додавайте секрети, auth tokens, PII, реальні документи вендорів або `.env` до Git.
- Не використовуйте `.env.example` як production-конфігурацію.
- Не обходьте decision gates «тимчасовим» checkout, payment, shipment або vendor onboarding.
- Не виконуйте production runbook: він заблокований до авторизованого discovery, юридичних/фінансових рішень та окремого sign-off.
