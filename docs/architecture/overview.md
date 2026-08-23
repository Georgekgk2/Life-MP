# Фактичний огляд архітектури «ЛАЙФ»

- **Дата огляду:** 2026-08-23
- **Власник:** технічний власник Life-MP
- **Статус:** локальна розробка та контрольований sandbox
- **Канонічні межі:** [межі запуску](../decisions/launch-scope.md), [реєстр відкритих рішень](../decisions/open-questions.md), [production readiness gate](../decisions/production-readiness-gate.md)

> Цей документ описує те, що можна підтвердити поточним деревом репозиторію. Наявність типу, таблиці, адаптера або UI-макета не означає, що відповідний production-процес увімкнений. Бойові платежі, ПРРО, реальна логістика, виплати та production deployment заблоковані.

## 1. Статус системи

Поточний контур має три різні рівні:

1. **Реалізовано в коді** — модуль, маршрут або контракт існує.
2. **Локально перевіряється** — є unit/integration/E2E-перевірка для конкретного sandbox-сценарію.
3. **Дозволено для production** — окремий gate із юридичними, фінансовими, операційними, security та infrastructure доказами. Цей рівень зараз **не досягнуто**.

Декларативний inventory на дату огляду: 101 файл unit-тестів/наборів Vitest у workspace-пакетах, 7 HTTP-наборів інтеграційних тестів, 1 набір міграцій та 16 Playwright spec-файлів у двох проєктах. Це інвентар файлів, а не самостійний доказ успішного проходження; актуальні результати зберігаються у [реєстрі readiness](../decisions/production-readiness-gate.md) з обмеженнями provenance.

## 2. Матриця можливостей

| Можливість                                                                   | Фактичне джерело                                    | Стан                                  | Межа                                                                                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Спільна основа монорепозиторію                                               | `pnpm-workspace.yaml`, `package.json`, `packages/*` | Реалізовано                           | Якість локального коду не є production sign-off.                                                                                               |
| Вітрина та статичні fixtures                                                 | `apps/storefront`                                   | Реалізовано / fixture-only            | Демонстраційні дані; за замовчуванням `CATALOG_SOURCE=fixtures`.                                                                               |
| Серверний catalog seam                                                       | `apps/storefront/src/catalog/server.ts`             | Реалізовано                           | `fixtures` або явно дозволений Medusa source; fail-closed при відсутньому backend.                                                             |
| Marketplace module                                                           | `apps/commerce/src/modules/marketplace`             | Реалізовано для local/test            | Medusa є authority для локальних vendor/listing/moderation записів; це не vendor onboarding для production.                                    |
| Публічний каталог                                                            | `GET /store/catalog`                                | Локально / синтетично                 | Демо-дані доступні лише в development/test з `ALLOW_SYNTHETIC_CATALOG=true`; production fallback не дозволений.                                |
| Tenant authorization                                                         | `authorization.ts`, vendor routes, HTTP tests       | Локально перевіряється                | Контекст береться з actor/auth token; membership не передається клієнтом як authority. Потрібна незалежна перевірка перед merge.               |
| Модерація listings, claims, verification та reviews                          | `src/workflows`, admin/vendor routes                | Локально / synthetic                  | `approved` є передумовою публічності; regulated claims та реальний evidence review не затверджені.                                             |
| Customer orders і reviews                                                    | `customer-orders.ts`, customer routes, Phase 4D     | Synthetic/test boundary               | Customer-scoped read/write та test seed не є бойовим checkout. `localStorage` не є authoritative source.                                       |
| Кошик і checkout UI                                                          | `apps/storefront/src/context`, `checkout-view.tsx`  | Draft/fixture-only                    | UI завершується draft-станом; реальна оплата, order write, TTN та payout не створюються.                                                       |
| Пошук                                                                        | `apps/storefront/src/search`                        | Fixture/in-memory adapter             | Поточний provider працює над переданим набором продуктів. PostgreSQL FTS/Meilisearch — цільовий адаптерний напрям, не доказ активного індексу. |
| CMS                                                                          | `apps/cms`, ADR 0005                                | Заблоковано                           | Payload runtime не встановлений і не має authority над каталогом.                                                                              |
| Payment, fiscalization, shipment provider, payout, booking, affiliate payout | `apps/commerce/src/index.ts`, launch scope          | Заблоковано / не реалізовано для live | Будь-які sandbox-моделі лише тестові; бойові ключі й webhook-и не підключаються.                                                               |
| Production/staging deployment                                                | `deploy/`, containment policy, readiness gate       | Заблоковано                           | Немає дозволу на remote provisioning або promotion. Потрібні окремі infrastructure та external gates.                                          |
| Публічний DNS/TLS/HTTP ingress                                              | [external infrastructure evidence](../decisions/production-infrastructure-cutover-2026-08-23.md) | Infrastructure path verified | Public behavior підтверджено окремими probes; це не application або commercial production sign-off. |

## 3. Фактична структура репозиторію

```text
Life-MP/
├── apps/
│   ├── storefront/          # Next.js App Router, fixture/sandbox UI
│   ├── commerce/            # Medusa v2.18.0 + marketplace module
│   └── cms/                 # TypeScript boundary без Payload runtime
├── packages/
│   ├── types/               # Спільні DTO та sandbox-контракти
│   └── config/              # Конфігураційні типи й правила інструментів
├── deploy/                  # Docker/Caddy артефакти; не дозвіл на deployment
├── infra/compose/           # Локальні допоміжні матеріали Compose
├── scripts/                 # env wrappers, checks, test runners
├── docs/                    # ADR, decisions, architecture, runbooks, templates
├── docker-compose.dev.yml   # Лише локальні PostgreSQL/Redis/Meilisearch
└── .github/workflows/       # ci.yml, codeql.yml, security.yml
```

У репозиторії є три workflow-файли. Кількість job або matrix-виконань не слід називати кількістю workflow-файлів.

## 4. Потоки даних

### 4.1. Каталог

```text
Medusa marketplace module
  ├─ Vendor / VendorMember / VendorProfile
  ├─ CatalogListing + moderation decisions
  └─ link до native Medusa Product
             │
             ▼
GET /store/catalog  ── public DTO mapper ──► storefront catalog server reader
             │                                  │
             └─ fail-closed synthetic guard  ◄──┘
```

Публічний mapper віддає лише записи, які відповідають стану публікації, visibility та synthetic policy. Native store endpoints не є публічним каталогом цього проєкту без відповідного middleware/route policy.

### 4.2. Вендорський контур

```text
actor/auth context
        │
        ▼
resolveVendorMembershipFromAuthContext
        │
        ▼
vendor_id з membership ──► listing/document/verification route
        │
        └─► audit event із tenant_id та correlation_id
```

`vendor_id`, `customer_id`, moderation status і фінансові поля не повинні прийматися від клієнта як довірені значення. Адміністративні маршрути мають окремі ролі та audit trail.

### 4.3. Sandbox довіри покупця

Серверний customer-order/review контур існує для ізольованого development/test сценарію. Synthetic records створюються лише за явними прапорцями та у дозволених `NODE_ENV`; UI не може видавати їх за оплату, реальну ТТН або виплату. Деталі — у [ADR 0007](../adr/0007-customer-order-and-review-source-of-truth.md) і [Phase 4D](../decisions/phase4d-customer-trust-decision-pack.md).

## 5. Пошук: фактичний стан і ціль

Назва `PostgresFtsSearchProvider` не доводить наявності PostgreSQL-індексу. Поточна реалізація нормалізує український запит і працює над переданими fixture-продуктами; Meilisearch не є обов’язковим runtime dependency цього контуру. PostgreSQL FTS, `pg_trgm`, окремий індекс і benchmark залишаються окремою роботою з власними доказами.

## 6. Дані та міграції

- PostgreSQL 16 і MikroORM/Medusa migrations використовуються в локальному commerce-контурі.
- Ролі `life_medusa_dev`, `life_medusa_test` і `life_medusa_migration_test` призначені для окремих локальних перевірок.
- Міграції marketplace є additive test/development schema; наявність таблиці `parent_order`, `shipment` або `settlement_batch` не означає підключення payment/carrier/payout provider.
- Перед будь-якою зміною схеми потрібні backup policy, міграційна сумісність і окремий staging/production gate; цього документа недостатньо для міграції production.

Детальний перелік таблиць і зв’язків — у [ERD v1](erd-v1.md).

## 7. Безпека та приватність

1. Секрети мають надходити через environment/secret manager; `.env.example` містить лише локальні sentinel-значення.
2. Синтетичні дані вмикаються явними `ALLOW_SYNTHETIC_*` прапорцями та не повинні мати production fallback.
3. Vendor і customer isolation перевіряються на server boundary, а не лише в UI.
4. Логи не повинні містити PII, токени, платіжні реквізити або вміст документів.
5. Containment policy блокує непогоджені deployment capability; її перевірка не доводить наявність production-сервера.
6. CodeQL, Trivy, Gitleaks, GitHub CI та зовнішні договори мають окрему provenance; локальний тест не замінює жоден із цих доказів.

## 8. Зовнішній інфраструктурний evidence

Окремий operator-provided запис [production infrastructure cutover evidence](../decisions/production-infrastructure-cutover-2026-08-23.md) фіксує публічний DNS/TLS/HTTP path через Cloudflare Edge і Tunnel. Прямі probes на дату запису показали apex `200`, `www` redirect `301`, `/api/health` `200` та валідний Edge certificate.

Цей evidence має окрему provenance і не змінює фактичні межі коду в цьому репозиторії. Він не доводить:

- durability Tunnel після restart/recreation;
- direct-origin fallback TLS;
- payment, fiscalization, carrier, vendor або commercial readiness;
- дозвіл на remote provisioning, deployment або production promotion.

## 9. Заборонені висновки

Не робіть із цього документа висновків, що:

- production або staging існує чи готовий;
- checkout приймає реальні гроші;
- ПРРО видало чек;
- Нова Пошта створила реальну ЕН/ТТН;
- вендор отримав payout;
- продукт, вендор або claim пройшов юридичну/медичну сертифікацію;
- локальний test pass покриває поточний непушений diff без незалежної перевірки.
