# ERD v1 — фактична модель даних «ЛАЙФ»

- **Дата огляду:** 2026-08-21
- **Власник:** технічний власник Life-MP
- **Стан:** фактична локальна schema модуля `marketplace` + окремий sandbox-опис
- **Джерела правди:** `apps/commerce/src/modules/marketplace/models`, migrations і `packages/types`

> ERD показує структуру таблиць і моделей, а не дозвіл на live commerce. Наявність order, shipment або settlement таблиці не означає підключення платіжного, фіскального чи carrier-провайдера. Усі записи, які створюються seed/test-контуром, мають synthetic provenance або залишаються невизначеними до окремого рішення.

## 1. Межа та provenance

| Шар                                            | Джерело                                                 | Статус                                                                      |
| ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Marketplace-моделі                             | `apps/commerce/src/modules/marketplace/models/*.ts`     | Реалізовано для локального Medusa-контурy                                   |
| PostgreSQL schema                              | `apps/commerce/src/modules/marketplace/migrations/*.ts` | Міграції для development/test; потрібен окремий production gate             |
| Native Medusa `Product`                        | Remote Query/link у `src/links` і catalog mapper        | Authority Medusa; зв’язок із `CatalogListing` логічний, не довільний SQL FK |
| Customer order/review DTO                      | `packages/types/src/index.ts`                           | Контракт sandbox/test та майбутнього server-side API                        |
| Кошик, Escrow і settlement record у storefront | `apps/storefront/src/sandbox`, `packages/types`         | UI/test simulation; не фінансовий ledger                                    |

## 2. Фактичні сутності marketplace

```text
Vendor
 ├──< VendorMember
 ├───  VendorProfile
 ├───  VendorVerification
 ├──< ComplianceDocument
 ├──< CatalogListing
 │       ├──< ModerationDecision
 │       └──< ProductClaim
 ├──< VendorChildOrder >── ParentOrder
 ├──< VendorPayable
 └──< SettlementBatch

CatalogListing ── logical Medusa link ──► native Product

ParentOrder
 └──< VendorChildOrder
         ├──< OrderLine
         └──< Shipment
                 └──< TrackingEvent

OrderLine ─── ProductReview ───< ReviewModerationDecision
```

Позначення `1──<` означає один запис-власник і багато дочірніх записів. Де міграція не створює FK, зв’язок є application-level reference і не повинен описуватися як database-enforced relation.

## 3. Реалізований каталог, vendor і moderation

| Сутність / таблиця      | Ключові поля                                                                               | Зв’язки та обмеження                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor`                | `id`, унікальний `handle`, `name`, `status`                                                | Батько для membership/profile/listings і sandbox order-пов’язаних записів.                                                                |
| `vendor_member`         | `vendor_id`, `auth_identity_id`, `role`, `active`                                          | FK до `vendor`; доступ вендора визначається actor/auth context. Адміністративний route не дозволяє дублювати активну identity membership. |
| `vendor_profile`        | `vendor_id`, `display_name`, `summary`, `location`                                         | FK до `vendor`; логічно one-to-one.                                                                                                       |
| `catalog_listing`       | `vendor_id`, `title`, `description`, `state`, `visibility`, `synthetic`, `price_uah`       | FK до `vendor`; має moderation decisions і claims; публічність залежить від state/visibility/policy.                                      |
| `moderation_decision`   | `listing_id`, `reviewer_id`, `from_state`, `to_state`, `rationale`                         | FK до listing; переходи виконуються workflow, не довільним UI update.                                                                     |
| `staff_role_assignment` | унікальний `user_id`, `role`                                                               | Прив’язка staff actor до ролі; не замінює auth provider.                                                                                  |
| `audit_event`           | `actor_id`, `actor_type`, `action`, `tenant_id`, `listing_id`, `correlation_id`, `payload` | Журнал критичних дій; payload має пройти redaction policy.                                                                                |
| `vendor_verification`   | `vendor_id`, tax/legal fields, `verification_status`, reviewer fields                      | FK до vendor; не є юридичним висновком або автоматичною державною перевіркою.                                                             |
| `compliance_document`   | `vendor_id`, owner fields, type/number, `file_url`, `status`, expiry                       | FK до vendor; реальні документи в репозиторій або fixtures не додаються.                                                                  |
| `product_claim`         | `catalog_listing_id`, `claim_type`, evidence id, review/public flags                       | FK до listing; `medical` та інші regulated claims не можна публікувати без окремого review.                                               |

### Машина станів лістингу

Канонічні значення визначені в `apps/commerce/src/modules/marketplace/constants.ts`:

```text
draft → submitted → under_review → changes_requested → submitted
                                  ├→ approved → published
                                  └→ rejected
published → archived
```

Це дозволений доменний граф workflow, а не твердження, що будь-який конкретний listing уже схвалений. Публічний DTO повинен додатково враховувати `visibility`, `synthetic` і середовище.

## 4. Order, shipment і review schema: лише sandbox/test boundary

Міграції містять такі таблиці:

| Сутність / таблиця           | Фактична роль                                                                                               | Важлива межа                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `parent_order`               | Батьківський synthetic/test order із `customer_id`, `order_number`, `mode`, lifecycle/payment/payout status | `mode=synthetic` не означає реальну оплату; `payment_transaction_id` не є доказом провайдера.    |
| `vendor_child_order`         | Розподіл synthetic/test order за vendor                                                                     | Суми та commission — дані тестової моделі; не затверджена фінансова ставка.                      |
| `order_line`                 | Незмінний snapshot line із product/listing/vendor references                                                | `product_id` і `vendor_id` мають application-level перевірки та повинні бути server-derived.     |
| `vendor_payable`             | Модель майбутнього payable/settlement у sandbox schema                                                      | Не створює payout і не має provider connection.                                                  |
| `settlement_batch`           | Тестова група payable записів                                                                               | Не є банківським реєстром і не доводить виплату на IBAN.                                         |
| `shipment`                   | Synthetic/provider provenance для child order                                                               | Поточна фаза не підключає production Nova Poshta API або реальні ТТН.                            |
| `tracking_event`             | Нормалізована timeline-подія shipment                                                                       | `source=synthetic` має залишатися видимим у server DTO; customer не змінює статус.               |
| `product_review`             | Review, прив’язаний до customer/order line/product/vendor                                                   | Один активний review на order line; public mapper показує лише `approved` дозволеної provenance. |
| `review_moderation_decision` | Окремий decision із обов’язковим rationale                                                                  | Reject/approve потребує staff authorization і audit event.                                       |

### Що не є таблицею commerce authority

`EscrowHoldRecord`, `SettlementBatchRecord`, `ParentOrder` та `VendorChildOrder` у `packages/types` також мають storefront sandbox-типи. Вони не перетворюють локальну UI-симуляцію на платіжну систему. Commerce capability map у `apps/commerce/src/index.ts` залишає checkout, payment, fiscalization, order split, shipment, affiliate payout і booking поза live implementation.

## 5. Критичні integrity rules

1. Усі vendor routes спочатку визначають membership із auth context, а потім перевіряють належність listing/document/verification.
2. `customer_id`, `vendor_id`, price authority, moderation status, payment/payout status і verified-purchase не довіряються body/query клієнта.
3. Ціна для server-side synthetic order має походити з canonical listing/product relation; client total не є authority.
4. Публічний каталог не публікує непідтверджені listing/claim/review записи.
5. Synthetic seed дозволений лише в `NODE_ENV=development|test` з явними `ALLOW_SYNTHETIC_*` прапорцями.
6. Міграції additive; destructive migration або production execution потребують backup, compatibility review та окремого дозволу.

## 6. Пов’язані документи

- [Огляд архітектури](overview.md)
- [ADR 0006 — ядро каталогу та вендорів](../adr/0006-catalog-provider-core.md)
- [ADR 0007 — джерело правди замовлень і відгуків](../adr/0007-customer-order-and-review-source-of-truth.md)
- [ADR 0012 — верифікація та комплаєнс](../adr/0012-vendor-verification-and-compliance.md)
- [Ворота production readiness](../decisions/production-readiness-gate.md)
