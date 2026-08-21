# Діаграми послідовностей «ЛАЙФ»

- **Статус:** концептуальні sandbox/test сценарії
- **Дата огляду:** 2026-08-21
- **Межа:** діаграми пояснюють дозволені server-side контракти; вони не є доказом runtime або production readiness.

## 1. Публічний каталог

```mermaid
sequenceDiagram
    participant Customer as Покупець
    participant Storefront as Storefront
    participant CatalogAPI as GET /store/catalog
    participant Medusa as Medusa marketplace module
    participant Mapper as Public DTO mapper

    Customer->>Storefront: Відкриває /catalog
    Storefront->>CatalogAPI: Запит каталогу
    CatalogAPI->>Medusa: Читає public listings
    Medusa->>Mapper: Передає лише дозволені записи
    Mapper-->>CatalogAPI: CatalogSnapshot без приватних полів
    CatalogAPI-->>Storefront: DTO або безпечний unavailable/empty result
    Storefront-->>Customer: Відображає каталог з provenance/status boundary
```

Native `/store/products` і mutation/cart endpoints не є публічним authority цього контуру. Відсутність доступного synthetic Medusa режиму не повинна створювати непомітний fixture fallback.

## 2. Створення listing вендором

```mermaid
sequenceDiagram
    participant Vendor as Вендор
    participant API as POST /vendor/marketplace/listings
    participant Auth as Auth context
    participant Module as Marketplace module
    participant Product as Medusa Product module
    participant Audit as AuditEvent

    Vendor->>API: Надсилає title/description
    API->>Auth: Визначає actor і active membership
    Auth-->>API: vendor_id або відмова
    API->>Module: Валідує Zod input і створює listing
    Module->>Product: Створює/зв’язує native product у транзакції
    Module->>Audit: Записує actor/action/target
    Module-->>API: Listing у moderation state
    API-->>Vendor: Private response без public eligibility claim
```

Tenant id з body не замінює actor-derived context. Помилка транзакції не повинна залишати частково створений public listing.

## 3. Модерація listing

```mermaid
sequenceDiagram
    participant Reviewer as Модератор
    participant Dashboard as Moderation UI
    participant API as POST /admin/marketplace/reviews/:id
    participant Guard as Role guard
    participant Module as Marketplace module
    participant Audit as AuditEvent

    Reviewer->>Dashboard: Відкриває pending listing
    Dashboard->>API: Надсилає decision і rationale
    API->>Guard: Перевіряє staff role та actor
    Guard-->>API: Дозвіл або відмова
    API->>Module: Застосовує state transition
    Module->>Audit: Записує decision/rationale/actor
    Module-->>API: Оновлений moderation state
    API-->>Dashboard: Sanitized result
```

`approved` — технічний workflow state; він не є юридичною сертифікацією vendor, product або claim.

## 4. Synthetic customer order у development/test

```mermaid
sequenceDiagram
    participant Customer as Authenticated customer
    participant Storefront as Storefront
    participant API as POST /store/customer/orders
    participant Guard as Environment + auth guards
    participant Catalog as Marketplace catalog
    participant Orders as Synthetic order service
    participant Audit as AuditEvent

    Customer->>Storefront: Підтверджує draft input
    Storefront->>API: Передає items без довірених ownership/status полів
    API->>Guard: Перевіряє NODE_ENV і ALLOW_SYNTHETIC_ORDERS
    Guard-->>API: Дозвіл або безпечна відмова
    API->>Catalog: Перевіряє listing, vendor і server price
    API->>Orders: Створює synthetic parent/child records
    Orders->>Audit: Записує synthetic action
    Orders-->>API: Sandbox order DTO
    API-->>Storefront: Нефінансовий synthetic status
```

Цей flow не викликає payment, fiscal, shipment, carrier, settlement або payout adapter. У production guard synthetic route має бути закритий.

## 5. Review eligibility та moderation

```mermaid
sequenceDiagram
    participant Customer as Покупець
    participant API as POST /store/customer/order-lines/:id/review
    participant Auth as Auth context
    participant Orders as Customer order reader
    participant Reviews as Review service
    participant Moderator as Compliance reviewer

    Customer->>API: Надсилає rating/body
    API->>Auth: Перевіряє current customer
    API->>Orders: Перевіряє ownership і verified-purchase rule
    Orders-->>API: Eligibility або відмова
    API->>Reviews: Створює review зі статусом pending
    Reviews-->>API: Sanitized pending response
    Moderator->>Reviews: Виносить approve/reject decision
    Reviews-->>Moderator: Audit-bound result
```

Public mapper показує лише записи з дозволеною provenance і moderation status. Client не може самостійно встановити `verifiedPurchase` або `approved`.

## 6. Заборонені потоки

У поточному scope немає діаграми або runtime flow для:

- live acquiring, escrow, payment webhook чи refund;
- ПРРО/фіскального чека;
- реальної Нової Пошти, ЕН/ТТН або carrier webhook;
- vendor settlement/payout;
- production provisioning/deployment.

Такі потоки потребують окремих прийнятих рішень, контрактів, security review та production gate.
