# Огляд архітектури

## Статус

Цей документ розділяє **реалізовану основу** від **майбутньої або заблокованої topology**. Він описує наявний Next.js storefront прототип та backend-сервіс Medusa v2.18.0 для розробки, але не є заявою про готовий production, реальний onboarding вендорів, checkout, payment чи shipment.

- **Реалізовано в коді:** pnpm/Node.js 22 монорепозиторій, Next.js 16 App Router storefront прототип (`apps/storefront`), Medusa v2.18.0 backend (`apps/commerce`) з кастомним модулем `marketplace` для некомерційного синтетичного каталогу й ізоляції вендорів, PostgreSQL 16 та Redis 7 у Docker Compose, а також CI workflow.
- **Не реалізовано / заблоковано:** real vendor onboarding, реальні комерційні категорії, кошик, checkout, оплата, фіскалізація, відправлення, ТТН, реальні перевірки регульованих категорій, Payload CMS runtime та production topology.
- **Заблоковано для комерційного запуску:** COM-1, COM-2, COM-3, COM-5 і LOG-1 у [реєстрі відкритих рішень](../decisions/open-questions.md).

## Карта та послідовність фаз розробки

1. **Phase 2 — Catalog & Provider Core (ЗАВЕРШЕНО):** Перетворення `@life/commerce` у Medusa v2.18.0, кастомний модуль `marketplace`, авторизація тенантів, модерація, synthetic catalog API, розмежування ролей PostgreSQL.
2. **Phase 2.1 — Security & Verification Hardening (ЗАВЕРШЕНО):** Посилення безпеки reset-скриптів (`LIFE_ALLOW_DESTRUCTIVE_LOCAL_RESET=true`), 12+ негативних асерцій авторизації, contract-тести проти витоку даних, visual smoke скріншоти.
3. **Phase 3 — Content, Vendor Operations & Compliance Workflows (ПОТОЧНА ФАЗА):** Онбординг вендорів (`VendorVerification`), завантаження та review комплаєнс-документів (`ComplianceDocument`), модерація клеймів продуктів (`ProductClaim`), CMS редакційний шар (Stories, Guides, Events, Charity, Partners), Media Adapter та виведення значків довіри.
4. **Phase 4 — Commerce Checkout & Fulfillment (ПОСТ-ПРИЙНЯТТЯ БІЗНЕС-РІШЕНЬ):** Кошик, parent/child замовлення, розщеплення замовлень, платіжні вебхуки, Нова Пошта, РРО/ПРРО. Запускається строго після письмових відповідей замовника щодо Seller of Record.
5. **Phase 5 — Affiliate Tracking & Payouts:** Відстеження реферальних посилань та виплати партнерам.
6. **Phase 6 — Staging, Production, Backups & Observability:** Production-інфраструктура, профілювання та моніторинг.
## Поточна структура пакетів

| Межа | Стан | Відповідальність | Чого немає |
|---|---|---|---|
| `@life/types` | Реалізований базовий пакет | Спільні типізовані публічні DTO каталогу та метадані | Доменні транзакційні об'єкти, кошик, платіжні типи |
| `@life/config` | Реалізований skeleton | Типізовані метадані інструментів та конфігів | Секрети, runtime-конфігурація production |
| `@life/storefront` | Реалізований Next.js App Router | Публічний UI та серверний адаптер каталогу (`fixtures` \| `medusa`) | Кошик, checkout, оплата, оформлення замовлення |
| `@life/commerce` | Реалізована Medusa v2.18.0 | Кастомний модуль `marketplace`, авторизація вендорів, модерація, synthetic catalog API | Payment provider, shipment, order creation, checkout |
| `@life/cms` | Заблокований skeleton | Source-level межа (Payload не встановлений per ADR 0005) | CMS runtime, редакційні дані, публічний ingress |
| PostgreSQL 16 + Redis 7 у Compose | Локальний development/test сервіс | Окремі БД/ролі `life_medusa_dev`, `life_medusa_test`, `life_medusa_migration_test` | Production кластер, суперкористувачі для застосунку |

## Текстова діаграма

```text
                        Розробник (Node.js 22 + pnpm)
                                      |
                         pnpm lint/typecheck/test/build
                                      |
                   +------------------+------------------+
                   |  Реалізований pnpm workspace skeleton |
                   +------------------+------------------+
                                      |
            +-------------------------+--------------------------+
            |                         |                          |
     packages/types             packages/config                  apps/
       @life/types               @life/config     +---------------+---------------+
                                                    |               |               |
                                            @life/storefront  @life/commerce   @life/cms
                                            [без UI/runtime] [лише межа       [без CMS
                                                             блокування]       runtime]

       Локально, окремо від застосунків (docker-compose.dev.yml):
       127.0.0.1:5432 PostgreSQL 16     127.0.0.1:6379 Redis 7
       [data-services only; не production і не application connectivity]

       Майбутнє / умовне — НЕ РЕАЛІЗОВАНО, НЕ УВІМКНЕНО:
       storefront runtime <--> commerce runtime <--> PostgreSQL/Redis
                                      |
                                CMS runtime (умовний)
                                      |
                  checkout / payment / fiscalization / order split / shipment
                  [заблоковано COM-1, COM-2, COM-3, COM-5, LOG-1]
```

## Межі даних і сервісів

Якщо commerce та CMS отримають реальну реалізацію, [ADR 0002](../adr/0002-data-boundaries.md) вимагає логічно окремих баз даних і login-ролей для майбутніх меж commerce/Medusa та CMS/Payload. Це архітектурне рішення для майбутнього provisioning, **не** доказ наявних баз, ролей, секретів або доступів. Застосунки не мають читати чи записувати таблиці іншої межі напряму; міжсервісний зв’язок потребує явного контракту.

Пошук MVP за [ADR 0005](../adr/0005-search-and-cms.md) передбачає PostgreSQL FTS + `pg_trgm`, а не окремий search service. Цей вибір ще не є реалізованим індексом чи виміряною performance-характеристикою. Окремий внутрішній Payload залишається умовним і заблокованим до server-discovery gate та профільного load test; публічного ingress для нього немає.

## Production не існує в цій topology

Production provisioning і promotion не входять до skeleton. Якщо такий контур колись з’явиться, [ADR 0004](../adr/0004-production-isolation.md) вимагає незалежних від Jorvis credentials, backup, encryption keys і network boundaries, а також server-discovery та load-test доказів. [ADR 0003](../adr/0003-release-and-recovery.md) визначає цільовий protected `main`, immutable image promotion і rollback попереднім image, але не підтверджує налаштування branch protection, registry, образів чи runbook.

Отже, локальний Compose, root CI scripts і пакети skeleton не можуть бути використані як доказ staging, production, legal approval або готовності до комерційного запуску.

## Посилання для зміни архітектури

1. [ADR 0001 — монорепозиторій та інструменти](../adr/0001-monorepo-and-tooling.md)
2. [ADR 0002 — межі даних](../adr/0002-data-boundaries.md)
3. [ADR 0003 — релізи та відновлення](../adr/0003-release-and-recovery.md)
4. [ADR 0004 — production-ізоляція](../adr/0004-production-isolation.md)
5. [ADR 0005 — пошук і CMS](../adr/0005-search-and-cms.md)
6. [Межі запуску](../decisions/launch-scope.md) та [реєстр відкритих рішень](../decisions/open-questions.md)
