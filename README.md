# Life-MP

Life-MP — **непродукційна** технічна основа майбутньої платформи. У репозиторії є монорепозиторій, типізовані каркаси пакетів, локальні data-services і локальний prototype storefront; тут немає готового комерційного застосунку, checkout, приймання платежів, відправлень, vendor onboarding або production-розгортання.

> **Не заявляємо готовність production, staging, юридичних погоджень або комерційного запуску.** Межі запуску визначені документами нижче, а не наявністю каркасу коду.

## Передумови

- Node.js 22;
- pnpm (через Corepack або локально встановлений pnpm);
- OrbStack з Docker Compose для локальних PostgreSQL і Redis.

На macOS з OrbStack переконайтеся, що Docker CLI доступний у терміналі. Локальні data-services прив’язані лише до `127.0.0.1`; вони не є production-інфраструктурою.

## Початок роботи

```bash
corepack enable
pnpm install
```

Після встановлення залежностей безпечні кореневі команди якості:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# або весь набір перевірок, включно з перевіркою форматування
pnpm run ci
```

## Локальний storefront prototype

Після встановлення залежностей запустіть локальний некомерційний prototype:

```bash
pnpm --filter @life/storefront dev
```

Prototype доступний за адресою [http://127.0.0.1:3100](http://127.0.0.1:3100). Це лише локальна smoke-перевірка UI з fixture-даними, не staging і не production-сервіс; він не реалізує commerce-функції, checkout або платежі.

Пояснення локального середовища, Compose і зупинки сервісів: [runbook локальної розробки](docs/runbooks/local-development.md). Інструкція для першого імпорту репозиторію та налаштування `main`/CI без виконання цих дій: [runbook початкового налаштування](docs/runbooks/repository-bootstrap.md).

## Поточна межа

Реалізовано лише основу робочих просторів:

- `@life/types` — спільна типізована основа;
- `@life/storefront` — локальний fixture-only prototype для smoke-перевірки UI, не commerce-застосунок;
- `@life/config` — типізовані метадані інструментів;
- локальні PostgreSQL і Redis для майбутньої розробки; запуск прикладних сервісів не є частиною Compose.

Натомість checkout, платежі, фіскалізація, order split, shipment, production vendor onboarding, категорії для продажу, affiliate, платні послуги й події вимкнені або заблоковані. Зокрема, фундаментальні рішення COM-1, COM-2, COM-3, COM-5 та LOG-1 ще не прийняті.

## Документи, які потрібно прочитати перед зміною scope

1. [Межі запуску та безпечні відкладення](docs/decisions/launch-scope.md) — єдине джерело увімкненого/вимкненого scope.
2. [Реєстр відкритих рішень](docs/decisions/open-questions.md) — докази, власники й критерії приймання COM/LOG/CAT/EVT/AFF рішень.
3. [Огляд архітектури](docs/architecture/overview.md) — фактична межа skeleton та умовна цільова topology.
4. [ERD v1](docs/architecture/erd-v1.md) — лише планована модель, не schema чи дозвіл на commerce-реалізацію.
5. ADR у [`docs/adr`](docs/adr): монорепозиторій, межі даних, release/recovery, production-ізоляція та CMS/пошук.

## Структура

```text
apps/
  storefront/   # @life/storefront: локальний fixture-only prototype, не commerce runtime
  commerce/     # @life/commerce: skeleton; checkout/payment/shipping заблоковані
  cms/           # @life/cms: skeleton без CMS runtime
packages/
  types/         # @life/types
  config/        # @life/config
```

Детальний розподіл відповідальності та межі даних див. в [огляді архітектури](docs/architecture/overview.md).

## Важливо

- Не додавайте секрети, локальні `.env` зі значеннями чи credentials до Git.
- Не використовуйте локальні сервіси як підставу для заяви про staging або production readiness.
- Не обходьте блокери з реєстру рішень реалізацією «тимчасового» checkout, payment, shipment або vendor-моделі.
- Команди deployment навмисно не є частиною цього onboarding: production provision і promotion заблоковані до окремих доказів та погоджень.
