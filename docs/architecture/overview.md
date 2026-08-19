# Огляд архітектури маркетплейсу «ЛАЙФ» (Architecture Overview)

## 1. Статус системи та інженерний базис

Цей документ фіксує **фактичну архітектуру кодової бази маркетплейсу «ЛАЙФ»** станом на поточну версію в гілці `main`.

Система функціонує в режимі **повної функціональної та тестової готовності (Sandbox Ready)** з ізольованим контуром безпеки (Phase P0 Containment) до моменту підписання юридичних погоджень Phase 4B та підключення бойових API-ключів еквайрингу й логістики.

---

## 2. Структура монорепозиторію та межі пакетів

Монорепозиторій побудований на базі **pnpm workspaces (Node.js 22)** зі строгою типізацією TypeScript, Flat ESLint, Prettier, Vitest та Playwright E2E.

```text
Life-MP/
├── apps/
│   ├── storefront/          # Next.js 16 (App Router, Turbopack, PWA, Wishlist, Search, Checkout, Order Tracker)
│   ├── commerce/            # Medusa v2.18.0 Backend (PostgreSQL 16, MikroORM, Marketplace Module, REST API)
│   └── cms/                 # Редакційний контур (Skeleton per ADR 0005, Payload заблоковано)
│
├── packages/
│   ├── types/               # Спільні TypeScript контракти (@life/types): DTO, Cart, Orders, Escrow, Search
│   └── config/              # Загальні конфігурації (@life/config) та валідатор Containment Policy
│
├── infra/
│   ├── compose/             # Docker Compose конфігурації (PostgreSQL 16, Redis 7, Meilisearch)
│   ├── docker/              # Multi-stage production Dockerfiles
│   └── deployment-policy.json # Політика блокування несанкціонованого деплою (Phase P0)
│
├── docs/
│   ├── architecture/        # Архітектурні огляди, ERD, Sequence Diagrams
│   ├── adr/                 # Архітектурні рішення (ADR 0001 - 0011)
│   ├── decisions/           # Реєстри погоджень, опитувальники стейкхолдерів (Phase 4B)
│   └── runbooks/            # Посібники з розробки, тестування, Sandbox та безпеки
│
└── .github/workflows/       # 9 автоматичних перевірок GitHub Actions (Verify, CodeQL, Trivy, E2E, Secret Detection)
```

---

## 3. Матриця відповідальності компонентів

| Компонент              | Стек / Технологія                                | Реалізований функціонал                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Статус готовності                                          |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **`@life/storefront`** | Next.js 16.2, React 19, TypeScript, Turbopack    | • Інтерактивний каталог та сторінки категорій<br>• Progressive Web App (PWA, Manifest, Service Worker)<br>• Пошуковий рушій (Postgres FTS + морфологія + Meilisearch)<br>• Список бажань (Wishlist / localStorage)<br>• Онбординг майстрів (`/join-as-artisan`) та подача товарів (`/vendor/products/new`)<br>• Дворівневий кабінет модератора (`/moderation`)<br>• Кабінет покупця (`/profile`)<br>• Мультивендорний кошик (`CartContext`, `CartDrawer`)<br>• Оформлення замовлення (`/checkout`) та трекер замовлень (`/orders/[id]`) | **100% VERIFIED** (28 Playwright E2E + 48 Vitest тестів)   |
| **`@life/commerce`**   | Medusa v2.18.0, PostgreSQL 16, MikroORM, Redis 7 | • Кастомний модуль `marketplace`<br>• Сутності `Vendor`, `VendorMember`, `CatalogListing`, `ArtisanApplication`, `ParentOrder`, `VendorChildOrder`, `ProductClaim`, `ComplianceDocument`<br>• Авторизаційні гарди тенантів (Vendor Isolation)<br>• PII Masking Middleware (маскування чутливих даних у логах)<br>• Аудит-трейл критичних дій модерації                                                                                                                                                                                  | **100% VERIFIED** (9 інтеграційних тестів HTTP/Migrations) |
| **`@life/types`**      | TypeScript 5.9                                   | • Спільні контракти сутностей каталогу<br>• DTO комплаєнсу та верифікації<br>• Типи мультивендорного кошика та спліту замовлень<br>• Типи Escrow-холдингу та розблокування виплат `SettlementBatch`                                                                                                                                                                                                                                                                                                                                     | **100% VERIFIED** (Строга сумісність)                      |
| **`@life/config`**     | TypeScript, ESLint, Prettier                     | • Валідатор політики `verify-deployment-containment.mjs`<br>• Спільні правила лінтингу та форматування                                                                                                                                                                                                                                                                                                                                                                                                                                  | **100% VERIFIED**                                          |
| **`@life/cms`**        | TypeScript Skeleton                              | • Збережено чисту межу пакету per ADR 0005 (Payload заблоковано до рішень щодо серверної інфраструктури)                                                                                                                                                                                                                                                                                                                                                                                                                                | **CONTAINED**                                              |

---

## 4. Архітектура пошукового рушія (Search Adapter Pattern per ADR 0005)

Пошукова система реалізована за патерном **Search Adapter** (`apps/storefront/src/search/`):

- **`PostgresFtsSearchProvider` (Дефолтний адаптер):** повнотекстовий пошук засобами PostgreSQL FTS + клієнтська українська морфологія (`ukrainian-morphology.ts`):
  - Токенізація, стемінг, видалення стоп-слів.
  - Словник крафтових синонімів (наприклад, `горнятко` ➔ `чашка`, `ткацтво` ➔ `льон`, `рушник`).
  - Толерантність до друкарських помилок за алгоритмом Левенштейна (відстань Дамерау-Левенштейна).
- **`MeilisearchProvider` (Опціональний адаптер для масштабування):** підключення до локального контейнера Meilisearch (`127.0.0.1:7700`) з автоматичним прозорим fallback на Postgres FTS.

---

## 5. Транзакційне ядро (Phase 4C Sandbox Transactional Architecture)

Маркетплейс реалізує повний життєвий цикл мультивендорного замовлення відповідно до юридичної моделі Phase 4B:

```text
                            ПОКУПЕЦЬ
                               │
               Додає товари від різних майстерень
                               ▼
                    [ CartContext & CartDrawer ]
                               │
                       Натискає Оформити
                               ▼
                     [ Форма /checkout ]
               (Контакти, Місто, Нова Пошта, Оплата)
                               │
                               ▼
                  [ SandboxOrderEngine.createOrder ]
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          [ ParentOrder ]             [ EscrowHoldRecord ]
       Сума замовлення покупця         Статус: "held"
                 │                     (Кошти заблоковано)
                 │
       Автоматичний спліт
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
[ VendorChildOrder 1 ] [ VendorChildOrder 2 ]
  Майстерня «Глина»      Ткацтво «Берегиня»
  Сума: 800 ₴            Сума: 600 ₴
  Комісія: 80 ₴ (10%)    Комісія: 60 ₴ (10%)
  Виплата: 720 ₴ (90%)   Виплата: 540 ₴ (90%)
  ТТН: 20450000001001    ТТН: 20450000001002
       │                   │
       │                   │
       ▼                   ▼
 [ Статус 4/7 ]      [ Статус 4/7 ]
  (Прямує)            (Прибуло)
       │                   │
       ▼                   ▼
 [ СТАТУС 9 НОВОЇ ПОШТИ: ВРУЧЕНО ПОКУПЦЮ ]
       │
       ├─────────────────────────────────────┐
       ▼                                     ▼
[ SettlementBatch 1 ]                 [ SettlementBatch 2 ]
Статус: "settled"                     Статус: "settled"
Виплата на IBAN майстра: 720 ₴        Виплата на IBAN майстра: 540 ₴
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼
             [ ParentOrder: "completed" ]
             [ EscrowHoldRecord: "captured" ]
```

---

## 6. Політика безпеки та захисту від витоків (Phase P0 Containment)

Згідно з [ADR 0004](../adr/0004-production-isolation.md) та політикою стримування:

1. **Жодних бойових грошей та секретів:** платіжні шлюзи та API перевізників працюють в автономному Sandbox-режимі.
2. **Containment Validator:** скрипт `scripts/verify-deployment-containment.mjs` блокує будь-які спроби несанкціонованого деплою в CI.
3. **PII Masking:** персональні дані покупців та майстрів маскуються в логах бекенду.
4. **CodeQL AST + Trivy:** 0 відкритих вразливостей, регулярний сканінг контейнерів та залежностей.
