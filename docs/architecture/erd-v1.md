# ERD v1: Структура сутностей маркетплейсу «ЛАЙФ» (Data Models & Entity Relationships)

## 1. Огляд та статус схем даних

Цей документ фіксує **структуру сутностей та реляційні зв'язки** кодової бази маркетплейсу «ЛАЙФ» (Medusa v2.18.0 Backend + Storefront Sandbox Models).

- **Реалізовані сутності бекенду (`@life/commerce` / PostgreSQL 16):**
  - Модуль `marketplace`: `Vendor`, `VendorMember`, `VendorProfile`, `CatalogListing`, `ModerationDecision`, `StaffRoleAssignment`, `AuditEvent`, `VendorVerification`, `ComplianceDocument`, `ProductClaim`.
  - Моделі замовлень: `ParentOrder`, `VendorChildOrder`, `VendorPayable`, `SettlementBatch`.
- **Реалізовані типи та контракти (`@life/types`):**
  - DTO каталогу: `StorefrontCatalogProduct`, `StorefrontCatalogCategory`, `StorefrontCatalogSnapshot`.
  - Транзакційний Sandbox: `CartItem`, `CartVendorGroup`, `MultiVendorCart`, `CheckoutCustomerInput`, `ParentOrder`, `VendorChildOrder`, `EscrowHoldRecord`, `SettlementBatchRecord`.

---

## 2. Діаграма сутностей (ERD Diagram)

```text
┌───────────────────────────┐           ┌───────────────────────────┐
│          Vendor           │ 1       * │       VendorMember        │
│───────────────────────────│───────────│───────────────────────────│
│ id: string (PK)           │           │ id: string (PK)           │
│ handle: string (Unique)   │           │ vendor_id: string (FK)    │
│ name: string              │           │ auth_identity_id: string  │
│ status: active/suspended  │           │ role: owner/admin/member  │
│ fulfillment_mode: string  │           │ is_active: boolean        │
│ seller_model: string      │           └───────────────────────────┘
└─────────────┬─────────────┘
              │ 1
              │
              │ *
┌─────────────▼─────────────┐           ┌───────────────────────────┐
│      CatalogListing       │ 1       * │    ModerationDecision     │
│───────────────────────────│───────────│───────────────────────────│
│ id: string (PK)           │           │ id: string (PK)           │
│ vendor_id: string (FK)    │           │ listing_id: string (FK)   │
│ title: string             │           │ decision: approved/reject │
│ description: string       │           │ reviewer_notes: string    │
│ status: draft/review/pub  │           │ staff_id: string          │
│ medusa_product_id: string │           │ decided_at: timestamp     │
└─────────────┬─────────────┘           └───────────────────────────┘
              │ (Link)
              ▼
┌───────────────────────────┐
│      Medusa Product       │
│───────────────────────────│
│ id: string (PK)           │
│ title: string             │
│ handle: string            │
│ status: published/draft   │
└───────────────────────────┘

─────────────────────────────────────────────────────────────────────────────
                  ТРАНЗАКЦІЙНЕ ЯДРО ТА РОЗЩЕПЛЕННЯ ЗАМОВЛЕНЬ
─────────────────────────────────────────────────────────────────────────────

┌───────────────────────────┐           ┌───────────────────────────┐
│        ParentOrder        │ 1       1 │      EscrowHoldRecord     │
│───────────────────────────│───────────│───────────────────────────│
│ id: string (PK)           │           │ id: string (PK)           │
│ order_number: LF-YYYYMMDD │           │ parent_order_id: string   │
│ customer_name: string     │           │ amount_uah: number        │
│ customer_phone: string    │           │ status: held/captured/ref │
│ total_amount_uah: number  │           │ provider: sandbox_escrow  │
│ status: escrow_held/compl │           │ held_at: timestamp        │
└─────────────┬─────────────┘           └───────────────────────────┘
              │ 1
              │
              │ *
┌─────────────▼─────────────┐           ┌───────────────────────────┐
│     VendorChildOrder      │ 1       1 │      SettlementBatch      │
│───────────────────────────│───────────│───────────────────────────│
│ id: string (PK)           │           │ id: string (PK)           │
│ parent_order_id: (FK)     │           │ vendor_handle: string     │
│ vendor_handle: string     │           │ child_order_id: (FK)      │
│ vendor_name: string       │           │ payout_amount_uah (90%)   │
│ subtotal_uah: number      │           │ commission_uah (10%)      │
│ platform_commission (10%) │           │ status: pending/settled   │
│ vendor_payout_uah (90%)   │           │ iban: string (UA...)      │
│ status: pending/shipped/  │           │ settled_at: timestamp     │
│         delivered/settled │           └───────────────────────────┘
│ tracking_number: (2045..) │
│ tracking_status_code: 1..9│
└───────────────────────────┘
```

---

## 3. Детальний опис ключових сутностей

### 🏛️ 1. Вендори та Лістинги

- **`Vendor`**: Профіль крафтової майстерні або виробника. Зберігає налаштування комплаєнсу, бізнес-модель (`seller_model: vendor_is_seller`) та спосіб виконання замовлень (`fulfillment_mode: vendor_direct`).
- **`VendorMember`**: Забезпечує ізоляцію тенантів (Vendor Multi-Tenancy). Кожен автентифікований користувач (`auth_identity_id`) прив'язується строго до своєї майстерні.
- **`CatalogListing`**: Проміжна сутність модерації. Дозволяє майстрам редагувати чернетки без зміни опублікованого товару. Тільки після рішення `ModerationDecision: approved` зміни синхронізуються з нативним `Product` Medusa.

### 💳 2. Замовлення та Escrow-розподіл

- **`ParentOrder`**: Головне замовлення клієнта. Об'єднує всі товари від різних майстерень та фіксує загальну суму оплати.
- **`VendorChildOrder`**: Окреме відправлення для кожної майстерні. Містить власний номер ЕН Нової Пошти, розраховує комісію платформи (**10%**) та суму виплати майстру (**90%**).
- **`EscrowHoldRecord`**: Фіксує стан зарезервованих коштів покупця. Статус `held` гарантує безпеку до підтвердження доставки, а статус `captured` встановлюється після вручення.
- **`SettlementBatch`**: Запис реєстру взаєморозрахунків (Ledger). Створюється автоматично при переході статусу доставки ЕН у `Статус 9: Вручено` та спрямовує кошти на IBAN продавця.

---

## 4. Контур комплаєнсу та безпеки

- **`VendorVerification`**: Зберігає результати перевірки ЄДРПОУ/РНОКПП та податковий статус (ФОП 2-ї або 3-ї групи).
- **`ComplianceDocument`**: Реєстр висновків СЕС, сертифікатів органічності та декларацій відповідності.
- **`ProductClaim`**: Модерація тверджень про органічність (`organic`), ручну роботу (`handmade`) та екологічність (`eco`).
- **`AuditEvent`**: Незмінний журнал дій модераторів та адміністраторів для гарантії прозорості.
