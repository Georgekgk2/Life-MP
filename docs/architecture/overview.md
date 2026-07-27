# Огляд архітектури

## Статус

Цей документ розділяє **реалізовану основу** від **майбутньої або заблокованої topology**. Він не є заявою про готовий storefront, API, CMS, дані каталогу, checkout, staging чи production.

- **Реалізовано в skeleton:** pnpm/Node.js 22 монорепозиторій, строгі TypeScript-пакети, кореневі quality scripts, локальний Compose із PostgreSQL і Redis, а також source-level межі пакетів.
- **Не реалізовано:** runtime UI/API/CMS, business schema, міграції, підключення застосунків до PostgreSQL/Redis, vendor data model, каталог, checkout, payment, shipment, auth та production topology.
- **Заблоковано для комерційного запуску:** COM-1, COM-2, COM-3, COM-5 і LOG-1 у [реєстрі відкритих рішень](../decisions/open-questions.md).

## Поточна структура пакетів

| Межа | Стан | Відповідальність | Чого немає |
|---|---|---|---|
| `@life/types` | Реалізований skeleton | Спільні типізовані метадані та їхня фабрика | Доменна commerce-модель, database schema, API-контракт |
| `@life/config` | Реалізований skeleton | Типізовані метадані інструментів | Секрети, runtime-конфігурація production |
| `@life/storefront` | Реалізований skeleton | Source-level метадані storefront | UI, HTTP runtime, каталог, кошик, checkout |
| `@life/commerce` | Реалізований skeleton | Явна межа: checkout/payment/shipping заблоковані | Commerce runtime, payment provider, shipment, vendor data |
| `@life/cms` | Реалізований skeleton | Source-level метадані CMS | CMS runtime, редакційні дані, публічний ingress |
| PostgreSQL 16 + Redis 7 у Compose | Локальний development-only сервіс | Майбутні локальні експерименти після появи реального контракту | Production кластер, ролі застосунків, реальні дані або application connectivity |

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
