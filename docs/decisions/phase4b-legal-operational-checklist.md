# Чеклист юридично-операційних рішень Phase 4B

- **Статус:** `PENDING / НЕ Є ПІДТВЕРДЖЕННЯМ`
- **Дата огляду:** 2026-08-21
- **Власник:** замовник + owners юридичного, фінансового та операційного контурів

Цей чеклист перелічує рішення, які потрібні до live payment, fiscalization, carrier integration або staging promotion. Він не є юридичною консультацією, договором чи дозволом на підключення credentials.

## 1. Таблиця рішень

| Код             | Питання                                                 | Власник               | Обов’язковий доказ                                    | Поточний статус |
| --------------- | ------------------------------------------------------- | --------------------- | ----------------------------------------------------- | --------------- |
| `LGL-1 / COM-1` | Юридичний статус платформи, продавця та вендора         | Юрист + замовник      | Письмовий legal opinion і затверджені договори/оферта | `PENDING`       |
| `LGL-2 / COM-6` | Повернення, скасування, брак, гарантія та support       | Юрист + операції      | Затверджена policy та responsibility matrix           | `PENDING`       |
| `FIN-1 / COM-2` | Provider, одержувач коштів, split, refund і chargeback  | Фінанси + юрист       | Договір provider і погоджена схема руху коштів        | `PENDING`       |
| `FIN-2 / COM-4` | Settlement/commission/ledger model                      | Фінанси + бухгалтерія | Формула, reconciliation, tax/refund policy            | `PENDING`       |
| `FSC-1 / COM-3` | Емітент фіскального чека і ПРРО                         | Бухгалтерія + юрист   | Письмова fiscal model і договір із ПРРО               | `PENDING`       |
| `LOG-1`         | Fulfillment, carrier account і Nova Poshta relationship | Операції + security   | Договір, account owner, API access/rotation і SLA     | `PENDING`       |
| `LOG-2 / LOG-3` | Платник доставки, тарифи, returns і exceptions          | Операції + фінанси    | Approved tariff/payer matrix і refund scenarios       | `PENDING`       |

## 2. Правило sandbox

До закриття пунктів дозволені лише synthetic/local fixtures та contract tests з explicit guards. Не використовувати бойові платіжні, фіскальні або carrier credentials; не створювати реальні ЕН/ТТН, webhook-и чи payout records.

## 3. Правило переходу

Реальна інтеграція або staging promotion заборонені, доки всі залежні рішення не мають статусу `CONFIRMED` з прикріпленими письмовими артефактами, а також не пройдено:

- technical contract and migration review;
- security/secret/access review;
- idempotency, audit, rollback та observability review;
- authorized server-discovery gate;
- independent reviewer sign-off.

`CONFIRMED` у таблиці без артефакту не є підтвердженням. Канонічний агрегований статус дивіться у [Phase 4B approval register](phase4b-approval-register.md) і [production readiness gate](production-readiness-gate.md).
