# Ворота готовності до виробничого запуску

- **Дата огляду:** 2026-08-21
- **Власник:** технічний власник + gatekeeper
- **Рішення:** **НЕ ДОЗВОЛЕНО ДЛЯ PRODUCTION; ДОЗВОЛЕНО ЛИШЕ ДЛЯ КОНТРОЛЬОВАНОЇ ЛОКАЛЬНОЇ РОЗРОБКИ, SANDBOX І ВНУТРІШНЬОГО ТЕСТУВАННЯ.**

Цей документ розділяє локальні докази, зовнішні погодження та readiness. Жоден локальний тест, ADR, Dockerfile чи deployment policy сам по собі не відкриває production gate.

## 1. Правило доказу

Кожен позитивний статус повинен містити:

- конкретний commit або зафіксований worktree;
- дату й команду;
- повний exit status і релевантний результат;
- межу того, що саме перевірено;
- незалежний reviewer для claim про готовність.

Якщо хоча б один обов’язковий gate провалений або відсутній, загальна готовність — **Not Ready**.

## 2. Локальний verification inventory

Це інвентар файлів і тестових наборів, а не автоматична заява про pass:

| Контур                               |                                          Поточний інвентар | Що треба запустити для нового доказу          |
| ------------------------------------ | ---------------------------------------------------------: | --------------------------------------------- |
| Vitest workspace                     |                 101 test-файл/набір за локальним inventory | `pnpm test`                                   |
| HTTP integration                     | 7 spec-наборів / 47 тестів у попередньому локальному звіті | `pnpm run test:integration`                   |
| Migration contract                   |     1 spec-набір / 2 тести у попередньому локальному звіті | `pnpm run test:migrations`                    |
| Playwright E2E                       |        16 spec-файлів × 2 проєкти = 32 case у конфігурації | `pnpm --filter @life/storefront run test:e2e` |
| Форматування, lint, typecheck, build |                           Команди визначені в root scripts | `pnpm run ci`                                 |
| Документація                         |                                       Link/ADR/status gate | `pnpm docs:check`                             |

Попередні локальні звіти не сертифікують поточний непушений worktree або зміни після того запуску. Перед merge потрібні свіжі результати з commit SHA та незалежний review.

## 3. Статус локальних capability

| Область                              | Статус                       | Обмеження доказу                                                           |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| Monorepo quality scripts             | Частково підтверджено        | Локальний результат не замінює GitHub CI для конкретного commit.           |
| Catalog/provider/moderation          | Частково підтверджено        | Покриває local/test Medusa і synthetic fixtures, не commercial onboarding. |
| Tenant/customer isolation            | Частково підтверджено        | Потрібні свіжі HTTP/E2E докази та незалежний review.                       |
| Synthetic order/review boundary      | Частково підтверджено        | `ALLOW_SYNTHETIC_*` та `NODE_ENV` guards не є live integration.            |
| Payment/fiscalization/carrier/payout | Не реалізовано для live      | Жодні sandbox types або adapters не є бойовим провайдером.                 |
| CMS runtime                          | Заблоковано                  | Payload не встановлений і не є authority для каталогу.                     |
| Remote server/deployment             | Не перевірено та заблоковано | Потрібен авторизований discovery і незалежний infrastructure gate.         |

## 4. Обов’язкові зовнішні блокери

| Код                           | Блокер                        | Мінімальний артефакт                                                                    |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `COM-1`                       | Юридичний продавець           | Підписаний юридичний висновок, оферта та договори.                                      |
| `COM-2`                       | Одержувач коштів / еквайринг  | Договір, потік коштів, split/refund policy та provider selection.                       |
| `COM-3`                       | ПРРО та чек                   | Погоджена схема фіскалізації й договір із ПРРО.                                         |
| `COM-4`                       | Комісія                       | Ставка/формула, податки, ledger і refund policy.                                        |
| `COM-5`                       | Мультивендорний split         | Узгодження з COM-1/2/3 та операційним fulfillment.                                      |
| `COM-6`                       | Повернення, гарантія, support | Відповідальність, SLA, канал та затверджена політика.                                   |
| `LOG-1`                       | Fulfillment і Нова Пошта      | Модель власності, account/API authorization, SLA та carrier evidence.                   |
| `CAT-1`–`CAT-5`               | Категорії та evidence review  | Approved category list, supply list, content RACI, compliance matrix і moderator owner. |
| `Production Server Discovery` | Інфраструктурна незалежність  | Письмовий дозвіл, read-only report, capacity/network/secrets/backups attestations.      |

Джерело статусів — [реєстр відкритих рішень](open-questions.md) та [реєстр погоджень Phase 4B](phase4b-approval-register.md).

## 5. Заборона promotion

До закриття всіх gate заборонено:

- зберігати або використовувати бойові payment/shipping/fiscal credentials;
- називати synthetic order «оплаченим» або `SettlementBatch` виплатою;
- створювати реальні ЕН/ТТН, webhook-и, refunds чи payout;
- вважати попередній GitHub CI run доказом для поточного непушеного diff;
- виконувати remote provisioning або production deployment;
- видавати локальний readiness за юридичне, фінансове чи operational sign-off.

## 6. Підсумок

- **Локальний sandbox:** `PARTIAL / evidence-bound`.
- **Staging:** `NOT VERIFIED`.
- **Commercial production:** `BLOCKED / NOT READY`.
- **Незалежний reviewer:** обов’язковий до merge; виконавець не сертифікує власну зміну.
