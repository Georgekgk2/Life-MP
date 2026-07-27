# ERD v1: межа майбутньої commerce-моделі

У цьому репозиторії реалізовано **Catalog & Provider Core** на базе Medusa v2.18.0 для розробки та локальних тестувань. `@life/types` містить публічні DTO каталогу, а `@life/commerce` реалізує кастомні модульні таблиці вендорів, членства, модерації лістингів та аудиту, пов'язані з нативними сутностями Medusa `Product` і `ProductCategory`.

Ця ERD фіксує схему Phase 2 для некомерційного синтетичного каталогу. Всі транзакційні сутності (`Customer`, `Cart`, `Order`, `Payment`, `Shipment`, `FiscalDocument`, `CommissionEntry`) залишаються **[ЗАБЛОКОВАНО]**.
Позначки:

- **[SKELETON]** — наявна лише source-level межа пакета; не означає таблицю чи runtime.
- **[ПЛАН]** — можлива майбутня сутність, яку не можна реалізовувати без окремого затвердженого контракту.
- **[ЗАБЛОКОВАНО]** — сутність або її ключові зв’язки залежать від невирішеного рішення; не створювати реалізацію до його прийняття.

## Що реалізовано в Phase 2 (Catalog & Provider Core)

| Межа | Статус | Дані / Сутності |
|---|---|---|
| `@life/types` | Реалізовано DTO | Публічні контракти `StorefrontCatalogSnapshot`, `StorefrontCatalogProduct`, `StorefrontCatalogCategory`, `VendorVerificationDTO`, `ComplianceDocumentDTO`, `ProductClaimDTO`. |
| `@life/commerce` | Реалізовано Medusa Module | Модуль `marketplace`: `Vendor`, `VendorMember`, `VendorProfile`, `CatalogListing`, `ModerationDecision`, `StaffRoleAssignment`, `AuditEvent`. |
| `Compliance & Verification` | Модель розроблена (ADR 0007) | `VendorVerification` (ЄДРПОУ/РНОКПП), `ComplianceDocument` (декларації/сертифікати), `ProductClaim` (eco/natural/handmade/organic/medical). |
| `Fulfillment & Sales Model` | Модель розроблена (ADR 0008) | `fulfillment_mode` (`vendor_direct` \| `platform_warehouse` \| `hybrid`), `seller_model` (`vendor_is_seller` \| `platform_is_seller` \| `lead_only`). |
| PostgreSQL у локальному Compose | Реалізовано розмежування | Окремі бази `life_medusa_dev`, `life_medusa_test`, `life_medusa_migration_test` із розмежованими привілеями. |

## Планована карта сутностей

```text
[ПЛАН] Vendor --------< [ПЛАН] Product --------< [ПЛАН] ProductVariant
   |                         |                         |
   |                         +--------< [ПЛАН] ProductCategory >-------- [ПЛАН] Category
   |                                                   |
   |                                                   +--< [ПЛАН] InventoryRecord
   |
   +-- майбутній owner catalog/fulfillment; не визначений для запуску

[ЗАБЛОКОВАНО] Customer --< [ЗАБЛОКОВАНО] Address
       |
       +--< [ЗАБЛОКОВАНО] Cart --< [ЗАБЛОКОВАНО] CartLine >-- [ПЛАН] ProductVariant
                                      |
                                      +--? [ЗАБЛОКОВАНО] OrderLine

[ЗАБЛОКОВАНО] Order --< [ЗАБЛОКОВАНО] OrderLine >-- [ПЛАН] ProductVariant
       |                       |
       |                       +--? [ЗАБЛОКОВАНО] Vendor
       |
       +--? [ЗАБЛОКОВАНО] Payment
       +--? [ЗАБЛОКОВАНО] FiscalDocument
       +--? [ЗАБЛОКОВАНО] Refund
       +--? [ЗАБЛОКОВАНО] Shipment --? [ЗАБЛОКОВАНО] Fulfillment
       +--? [ЗАБЛОКОВАНО] Address
       +--? [ЗАБЛОКОВАНО] CommissionEntry
```

`<` позначає можливу майбутню cardinality «один до багатьох». `?` означає, що навіть наявність, напрямок або cardinality зв’язку не прийняті. Діаграма навмисно не визначає поля, nullable-значення, унікальні індекси, життєві цикли, гроші, податки, статуси чи id-формати.

## Сутності та блокери

| Сутність | Статус | Передбачена роль без деталізації schema | Блокер або передумова |
|---|---|---|---|
| `Vendor` | [ЗАБЛОКОВАНО] | Майбутня межа постачальника каталогу | CAT-2: немає підтверджених кандидатів, даних, договорів або owner onboarding; не створювати production vendor records. |
| `Category`, `Product`, `ProductVariant` | [ПЛАН] | Майбутній каталог | CAT-1/3/4/5: не визначені перша хвиля, документи, контент і moderation; не публікувати категорії чи claims. |
| `ProductCategory`, `InventoryRecord` | [ПЛАН] | Можливі зв’язки каталогу та доступності | Залежать від затверджених категорій, source-of-truth і fulfillment-моделі; не моделюють склад як увімкнену можливість. |
| `Customer`, `Address` | [ЗАБЛОКОВАНО] | Можлива клієнтська/адресна межа | LOG-4 визначає лише майбутню адресу/кур’єра, але не вмикає checkout; LOG-1/3 не вирішують fulfillment або оплату доставки. |
| `Cart`, `CartLine` | [ЗАБЛОКОВАНО] | Можлива передзамовна група позицій | COM-5 і LOG-6 не визначають мультивендорний або змішаний кошик; не створювати cart flow. |
| `Order`, `OrderLine` | [ЗАБЛОКОВАНО] | Можлива фіксація майбутнього замовлення | COM-1, COM-5 і LOG-1 не визначають продавця, split або fulfillment; не створювати order model. |
| `Payment`, `FiscalDocument`, `Refund` | [ЗАБЛОКОВАНО] | Можливі фінансові та фіскальні записи | COM-2/3/6/7/8 не визначають одержувача коштів, чек, refund, provider або COD; не приймати гроші та не створювати фінансові записи. |
| `Shipment`, `Fulfillment` | [ЗАБЛОКОВАНО] | Можлива логістична межа | LOG-1/2/3 не визначають owner, carrier account або оплату доставки; не створювати shipment flow. |
| `CommissionEntry` | [ЗАБЛОКОВАНО] | Можливий майбутній облік комісії платформи | COM-4 підтверджує лише факт комісії, не ставку/базу/податки/момент утримання; ledger заборонений до моделі. |

## Неприпустимі висновки з ERD

З цієї карти не можна робити висновок, що:

- продавцем буде платформа або вендор;
- один кошик/замовлення/платіж може містити кількох вендорів;
- існує payment provider, фіскалізація, refund policy чи COD;
- vendor або product дані дозволено збирати, публікувати чи продавати;
- відправлення, carrier account, склад або адресна доставка реалізовані;
- існує staging, production database, migration plan або legal approval.

Переходити від цієї карти до schema-design можна лише після датованих письмових рішень і оновлення відповідних рядків у [реєстрі відкритих рішень](../decisions/open-questions.md). Для меж даних після цього також обов’язковий [ADR 0002](../adr/0002-data-boundaries.md): окремі databases/login-roles для майбутніх commerce і CMS/Payload меж без прямого доступу до чужих таблиць.
