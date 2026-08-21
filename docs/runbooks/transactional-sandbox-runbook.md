# Посібник sandbox: кошик, замовлення та відгуки

- **Статус:** лише локальний development/test; не live commerce
- **Дата огляду:** 2026-08-21
- **Власник:** технічний власник Life-MP

## 1. Мета і межа

Цей посібник описує безпечні contract/UI сценарії для customer cart і synthetic order/review boundary. Він не запускає реальні транзакції.

У цьому контурі не можна створювати або стверджувати:

- оплату, escrow hold/capture, refund чи chargeback;
- фіскальний чек;
- реальну ЕН/ТТН або carrier tracking;
- vendor settlement, IBAN або payout;
- production customer/vendor onboarding.

Успішний sandbox test доводить лише поведінку конкретного локального сценарію з explicit guard.

## 2. Draft-only storefront сценарій

1. Запустіть інфраструктуру за [локальним runbook](local-development.md).
2. Запустіть storefront з `CATALOG_SOURCE=fixtures` або дозволеним development Medusa catalog.
3. Відкрийте [http://127.0.0.1:3100/catalog](http://127.0.0.1:3100/catalog).
4. Додайте synthetic items до draft cart.
5. Перевірте групування за workshop/vendor у UI.
6. Перейдіть до `/checkout`.
7. Перевірте, що копірайт і статуси явно позначають draft/sandbox, а payment/shipment actions не імітують факт виконання.
8. Не вводьте реальні PII, payment credentials, IBAN або carrier identifiers.

`localStorage` може містити draft cart і fixture UI state; це не authoritative order або identity storage.

## 3. Контракт синтетичного замовлення

Synthetic order endpoint дозволений тільки за узгодженими `NODE_ENV=development|test` та `ALLOW_SYNTHETIC_ORDERS=true` guards. Він має:

- перевіряти schema та authenticated customer context;
- створювати parent/child records лише в local/test database;
- зберігати immutable order lines;
- не створювати payment, fiscal, shipment або payout record;
- повертати status, який не можна трактувати як `paid`, `captured`, `fulfilled` або `settled`.

При відсутності guard endpoint має бути недоступним або повертати безпечну помилку. Production mode не має fallback до synthetic behavior.

## 4. Synthetic tracking і review

- Tracking timeline — тестовий локальний запис без carrier API.
- Customer бачить лише власний order scope.
- Vendor бачить лише дозволений tenant scope.
- Review створюється як `pending` і не стає public без moderation decision.
- `verifiedPurchase` визначається server-side; client body не може його встановити.
- Reject/approve дії staff потребують role guard, rationale і audit event.

## 5. Дозволені автоматичні перевірки

Для поточного репозиторію використовуйте фактичні package scripts:

```bash
# Усі unit/component тести workspace
pnpm test

# HTTP integration contract-и commerce
pnpm run test:integration

# Migration idempotency/contract tests
pnpm run test:migrations

# Storefront Playwright suite
pnpm --filter @life/storefront run test:e2e
```

Для свіжого evidence зберігайте commit/worktree, дату, команду та exit status. Назва тесту або старий звіт не є доказом для поточного diff.

## 6. Очікування failure paths

Перевіряйте негативні сценарії:

- production mode без synthetic flag — відмова;
- неавторизований customer — відмова;
- customer читає чужий order — відмова;
- vendor читає чужий tenant — відмова;
- client підміняє `customer_id`, `vendor_id`, price або review eligibility — відмова або server-side ігнорування;
- review без verified purchase — `403`/validation error;
- unapproved review у public catalog — відсутній;
- payment/shipment/payout route — disabled/not implemented.

## 7. Очищення

Після test заверште локальний процес і за потреби зупиніть infra без видалення volumes:

```bash
make dev-infra-down
```

Для destructive reset користуйтеся лише командами з [local-development.md](local-development.md) і explicit local approval.
