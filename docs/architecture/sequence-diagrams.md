# Діаграми послідовностей маркетплейсу «ЛАЙФ» (Sequence Diagrams)

Цей документ містить детальні діаграми послідовностей (Mermaid Sequence Diagrams) для всіх ключових процесів маркетплейсу.

---

## 1. Мультивендорний кошик, Чекаут та Escrow-холдинг

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Покупець
    participant Cart as CartContext & CartDrawer
    participant Checkout as Сторінка /checkout
    participant OrderEngine as Sandbox Order Engine
    participant Escrow as Escrow System (Sandbox)
    participant NP as Нова Пошта (Емуляція)

    Customer->>Cart: Додає товар Майстерні А (800 ₴)
    Customer->>Cart: Додає товар Майстерні Б (600 ₴)
    Cart-->>Customer: Групує товари за майстернями (Разом: 1400 ₴)

    Customer->>Checkout: Переходить до оформлення замовлення
    Customer->>Checkout: Вказує контактні дані, місто та відділення НП
    Customer->>Checkout: Обирає спосіб оплати "sandbox_escrow"
    Customer->>Checkout: Натискає "Підтвердити замовлення"

    Checkout->>OrderEngine: createOrder({ customer, items })

    Note over OrderEngine: Створення ParentOrder #LF-20260819-1001 (1400 ₴)
    OrderEngine->>Escrow: Створити EscrowHoldRecord (status: "held", 1400 ₴)

    Note over OrderEngine: Автоматичний спліт замовлення за майстернями
    OrderEngine->>NP: Згенерувати ТТН для Майстерні А
    NP-->>OrderEngine: ЕН 20450000001001 (Статус 1: Створено)
    OrderEngine->>OrderEngine: Створити VendorChildOrder 1 (800 ₴, комісія 80 ₴, виплата 720 ₴)

    OrderEngine->>NP: Згенерувати ТТН для Майстерні Б
    NP-->>OrderEngine: ЕН 20450000001002 (Статус 1: Створено)
    OrderEngine->>OrderEngine: Створити VendorChildOrder 2 (600 ₴, комісія 60 ₴, виплата 540 ₴)

    OrderEngine-->>Checkout: Успіх (parentOrder, childOrders, escrowHold)
    Checkout->>Cart: clearCart()
    Checkout-->>Customer: Перенаправлення на /checkout/success
```

---

## 2. Відстеження доставки Нової Пошти та автоматична виплата (Settlement)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Покупець
    actor Courier as Відділення Нової Пошти
    participant Tracker as Сторінка /orders/[id]
    participant OrderEngine as Sandbox Order Engine
    participant Ledger as SettlementBatch (Ledger)
    participant Escrow as Escrow System

    Customer->>Tracker: Відкриває трекінг замовлення #LF-20260819-1001
    Tracker-->>Customer: Відображає 2 окремі посилки (ТТН 20450001 та 20450002)

    Note over Courier,OrderEngine: Майстерня А передає посилку перевізнику
    Courier->>OrderEngine: Оновлення статусу ЕН (Статус 4: Прямує до отримувача)
    OrderEngine->>Tracker: VendorChildOrder 1 -> status: "shipped"

    Courier->>OrderEngine: Оновлення статусу ЕН (Статус 7: Прибуло у відділення)
    OrderEngine->>Tracker: Сповіщення покупцю: посилка прибула

    Note over Customer,Courier: Покупець оглядає та забирає посилку
    Courier->>OrderEngine: Оновлення статусу ЕН (Статус 9: Вручено покупцю)

    critical Тригер розблокування виплати (Settlement Trigger)
        OrderEngine->>OrderEngine: VendorChildOrder 1 -> status: "delivered"
        OrderEngine->>Ledger: Створити SettlementBatch (+720 ₴ на IBAN Майстерні А)
        Ledger-->>OrderEngine: Settlement підтверджено (status: "settled")
    end

    Note over Courier,OrderEngine: Доставка другої посилки (Майстерня Б)
    Courier->>OrderEngine: Статус 9 (Вручено покупцю)
    OrderEngine->>Ledger: Створити SettlementBatch (+540 ₴ на IBAN Майстерні Б)

    critical Завершення замовлення
        Note over OrderEngine: Всі посилки замовлення вручено!
        OrderEngine->>Escrow: EscrowHoldRecord -> status: "captured"
        OrderEngine->>OrderEngine: ParentOrder -> status: "completed"
    end

    OrderEngine-->>Tracker: Оновлено статус: "✓ Замовлення виконано, виплати проведено"
```

---

## 3. Пошуковий рушій з автокомплітом та українською морфологією

```mermaid
sequenceDiagram
    autonumber
    actor User as Користувач (Покупець)
    participant Header as SiteHeader (Cmd+K)
    participant Modal as SearchAutocompleteModal
    participant Morphology as Ukrainian Morphology Engine
    participant Adapter as SearchProvider (Postgres FTS / Meilisearch)

    User->>Header: Натискає Cmd+K або кнопку 🔍 Пошук
    Header->>Modal: Відкрити модальне вікно пошуку

    User->>Modal: Вводить пошуковий запит "горнятко"
    Modal->>Morphology: tokenizeAndNormalize("горнятко")
    Morphology->>Morphology: Очищення від пунктуації, нормалізація регістру
    Morphology->>Morphology: Пошук у словнику крафтових синонімів ("горнятко" -> "чашка", "кераміка")
    Morphology-->>Modal: Розширені токени пошуку

    Modal->>Adapter: searchProducts({ query: "горнятко", synonyms: ["чашка", "кераміка"] })
    Adapter-->>Modal: 2 товари: "Чашка «Ранок»", "Керамічна піала" (12 мс)

    Modal->>Adapter: searchUnified("горнятко")
    Adapter-->>Modal: Знайдено майстерню: "Майстерня Олени" (Гончарство)

    Modal-->>User: Миттєве відображення згрупованих результатів (Товари, Майстерні, Події)
```

---

## 4. Онбординг майстерень та дворівнева модерація

```mermaid
sequenceDiagram
    autonumber
    actor Artisan as Майстерня / Виробник
    participant Form as Форма /join-as-artisan
    actor Moderator as Комплаєнс-Модератор
    participant Dashboard as Кабінет /moderation
    participant Backend as Medusa Marketplace Module

    Artisan->>Form: Заповнює анкету (Назва, Категорія, Опис ремесла, Склад, Instagram)
    Artisan->>Form: Погоджується з правилами локальності та якості
    Form->>Backend: POST /store/artisan-applications (ArtisanApplication: "pending")
    Backend-->>Artisan: Заявку прийнято на модерацію

    Moderator->>Dashboard: Відкриває /moderation
    Dashboard->>Backend: GET /admin/marketplace/artisan-applications?status=pending
    Backend-->>Dashboard: Список анкет, що очікують перевірки

    Moderator->>Dashboard: Відкриває детальну картку майстерні
    Moderator->>Dashboard: Додає коментар модератора та натискає "✅ Схвалити"

    Dashboard->>Backend: POST /admin/marketplace/artisan-applications/:id/review { decision: "approved" }
    Note over Backend: Створення Vendor record та генерація токена доступу
    Backend-->>Dashboard: Статус оновлено: "approved"
    Dashboard-->>Moderator: Візуальне підтвердження схвалення
```
