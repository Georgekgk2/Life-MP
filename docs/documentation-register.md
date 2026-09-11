# Реєстр документації

**Дата інвентаризації:** 2026-08-23
**Власник реєстру:** технічний власник Life-MP
**Критерій:** «Канонічний» означає, що документ є першим місцем для певного типу тверджень; це не означає production readiness.

## Статуси документів

- **Канонічний** — перше джерело для своєї теми.
- **Прийнятий ADR** — архітектурне рішення з явно визначеною межею.
- **Робочий посібник** — процедура, яку можна виконувати лише в описаному контурі.
- **План / чернетка** — майбутня або неповна робота; не є дозволом на реалізацію.
- **Заблокований** — документ збережено для контексту, але виконання заборонено до gate.
- **Довідковий** — контекст або заповнювач, який не має самостійної сили рішення.

## Реєстр

| Документ                                                         | Категорія               | Статус                   | Власник / відповідальний              | Канонічна роль                                             |
| ---------------------------------------------------------------- | ----------------------- | ------------------------ | ------------------------------------- | ---------------------------------------------------------- |
| `README.md`                                                      | Вхідна точка            | Канонічний               | Технічний власник                     | Початок роботи та коротка межа репозиторію                 |
| `AGENTS.md`                                                      | Політика проєкту        | Канонічний               | Технічний власник                     | Безпека, якість, workflow та e-commerce-обмеження          |
| `TZ.txt`                                                         | Вимоги                  | Довідковий план          | Замовник / технічний власник          | Початковий опис вимог; не доказ реалізації                 |
| `docs/README.md`                                                 | Навігація               | Канонічний               | Технічний власник                     | Ієрархія джерел і карта документації                       |
| `docs/documentation-register.md`                                 | Управління документами  | Канонічний               | Технічний власник                     | Інвентаризація, статус і відповідальність                  |
| `docs/architecture/overview.md`                                  | Архітектура             | Канонічний               | Технічний власник                     | Фактичні межі застосунків і контурів                       |
| `docs/architecture/erd-v1.md`                                    | Дані                    | Канонічний               | Технічний власник                     | Фактична схема `marketplace` та sandbox-модель             |
| `docs/architecture/sequence-diagrams.md`                         | Архітектура             | Довідковий               | Технічний власник                     | Концептуальні послідовності; sandbox-only                  |
| `docs/architecture/phase5-affiliate-attribution-draft.md`        | Архітектура             | План / чернетка          | Замовник + технічний власник          | Майбутній affiliate-контур без дозволу на реалізацію       |
| `docs/decisions/launch-scope.md`                                 | Scope                   | Канонічний               | Замовник + технічний власник          | Що дозволено, вимкнено та заблоковано                      |
| `docs/decisions/open-questions.md`                               | Рішення                 | Канонічний               | Замовник і функціональні власники     | Відкриті COM/LOG/CAT/EVT/AFF-рішення                       |
| `docs/decisions/production-readiness-gate.md`                    | Готовність              | Канонічний               | Gatekeeper / технічний власник        | Evidence ledger і заборона production                      |
| `docs/decisions/production-infrastructure-cutover-2026-08-23.md` | Infrastructure evidence | Довідковий evidence      | Інфраструктурний власник + gatekeeper | Sanitized public DNS/TLS/HTTP path; не commercial sign-off |
| `docs/decisions/customer-questionnaire.md`                       | Рішення                 | Робочий посібник         | Замовник                              | Форма отримання відсутніх рішень                           |
| `docs/decisions/customer-input-2026-07-27.md`                    | Рішення                 | Довідковий               | Замовник + технічний власник          | Датований вхідний контекст; не замінює договір             |
| `docs/decisions/phase3-4a-deferred-decision-development-plan.md` | План                    | План / чернетка          | Технічний власник                     | Послідовність sandbox-робіт до зовнішніх gate              |
| `docs/decisions/phase4b-decision-pack.md`                        | Рішення                 | Робочий пакет            | Замовник, юрист, фінанси, операції    | Питання й артефакти Phase 4B                               |
| `docs/decisions/phase4b-approval-register.md`                    | Рішення                 | Канонічний реєстр        | Власники COM/LOG                      | Статус погоджень; порожній доказ не є approval             |
| `docs/decisions/phase4b-legal-operational-checklist.md`          | Рішення                 | Робочий чеклист          | Юрист + операції                      | Перевірка перед live integrations                          |
| `docs/decisions/phase4d-customer-trust-decision-pack.md`         | Рішення                 | Прийнятий sandbox-план   | Технічний власник + product owner     | Межі customer orders/reviews у development                 |
| `docs/decisions/phase5-commercial-activation-decision-pack.md`   | Рішення                 | План / чернетка          | Технічний власник + product owner     | План комерційної активації Phase 5 (NO-GO)                 |
| `docs/adr/0001-monorepo-and-tooling.md`                          | ADR                     | Прийнятий ADR            | Технічний власник                     | pnpm workspaces і Node.js 22                               |
| `docs/adr/0002-data-boundaries.md`                               | ADR                     | Прийнятий ADR            | Технічний власник                     | Логічні межі Medusa/Payload                                |
| `docs/adr/0003-release-and-recovery.md`                          | ADR                     | Прийнятий ADR            | Технічний власник                     | Immutable promotion і recovery-модель                      |
| `docs/adr/0004-production-isolation.md`                          | ADR                     | Прийнятий ADR            | Технічний власник                     | Незалежність Life-MP production від Jorvis                 |
| `docs/adr/0005-search-and-cms.md`                                | ADR                     | Прийнятий ADR            | Технічний власник                     | Пошук і заблокований Payload                               |
| `docs/adr/0006-catalog-provider-core.md`                         | ADR                     | Прийнятий ADR            | Технічний власник                     | Medusa як authority для vendor/catalog                     |
| `docs/adr/0007-customer-order-and-review-source-of-truth.md`     | ADR                     | Прийнятий sandbox ADR    | Технічний власник                     | Server-side orders/reviews та customer isolation           |
| `docs/adr/0008-fulfillment-modes.md`                             | ADR                     | Прийнятий технічний ADR  | Технічний власник                     | Майбутня модель fulfillment; не live contract              |
| `docs/adr/0009-club-card-and-loyalty-deferred.md`                | ADR                     | Відкладений ADR          | Замовник + технічний власник          | Заборона фінансової лояльності до рішення                  |
| `docs/adr/0010-multi-vendor-checkout-and-order-splitting.md`     | ADR                     | Прийнятий sandbox ADR    | Технічний власник                     | Технічне проєктування split; legal pending                 |
| `docs/adr/0011-sast-and-codeql-governance.md`                    | ADR                     | Прийнятий технічний ADR  | Security-власник                      | Правила локальних security scans                           |
| `docs/adr/0012-vendor-verification-and-compliance.md`            | ADR                     | Прийнятий sandbox ADR    | Технічний + compliance-власник        | Модель verification/evidence; не юридичний висновок        |
| `docs/adr/0013-immutable-container-pipeline-and-promotion.md`    | ADR                     | Прийнятий технічний ADR  | Технічний та інфраструктурний власник | Незмінний конвеєр збірки контейнерів і GHCR promotion      |
| `docs/runbooks/local-development.md`                             | Runbook                 | Робочий посібник         | Технічний власник                     | Локальні сервіси, міграції та тести                        |
| `docs/runbooks/disaster-recovery.md`                             | Runbook                 | Робочий посібник         | Технічний власник + інфраструктура    | Резервне копіювання, контрольні суми та аварійне відновлення БД |
| `docs/runbooks/repository-bootstrap.md`                          | Runbook                 | Робочий посібник         | Технічний власник                     | Безпечний імпорт і Git/CI hygiene                          |
| `docs/runbooks/security-and-containment.md`                      | Runbook                 | Робочий посібник         | Security-власник                      | Локальні security/containment перевірки                    |
| `docs/runbooks/transactional-sandbox-runbook.md`                 | Runbook                 | Робочий sandbox-посібник | Технічний власник                     | Draft-only кошик/замовлення без реальних операцій          |
| `docs/runbooks/production-server-discovery.md`                   | Runbook                 | Заблокований gate        | Інфраструктурний власник              | Лише авторизоване read-only обстеження                     |
| `docs/runbooks/remote-server-production-deployment-guide.md`     | Runbook                 | Заблокований             | Інфраструктурний власник              | Неопераційний документ до всіх production gate             |
| `docs/templates/adr-template.md`                                 | Шаблон                  | Довідковий               | Технічний власник                     | Структура ADR, статус і rollback                           |
| `docs/templates/decision-template.md`                            | Шаблон                  | Довідковий               | Технічний власник                     | Структура бізнесового/юридичного рішення та evidence       |
| `docs/templates/runbook-template.md`                             | Шаблон                  | Довідковий               | Технічний власник                     | Структура runbook, межі дозволу та відновлення             |

## Окремі артефакти

Файли під `artifacts/` не є канонічною документацією і не входять до цього реєстру. Їх можна використовувати лише як evidence, якщо manifest містить джерело, commit, дату, scope та checksum.

## Обов’язки власника

Власник документа відповідає за:

- актуальність статусу та дати огляду;
- посилання на фактичний код або доказ;
- явне маркування майбутніх і заблокованих частин;
- синхронізацію залежних документів після зміни рішення;
- відсутність секретів, PII та реальних комерційних даних.

Якщо власника не можна назвати, документ не має права створювати дозвіл на запуск і повинен залишатися довідковим або заблокованим.
