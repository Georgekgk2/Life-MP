# Посібник з безпеки та політики стримування (Security & Containment Runbook)

## 1. Архітектурні принципи безпеки (Security Principles)

Безпека маркетплейсу «ЛАЙФ» базується на наступних фундаментальних принципах:

1. **Fail-Closed Gatekeeper Model:** Будь-яка непевність або збій у системі перевірок блокує подальші дії (злиття коду, деплой, виплати).
2. **Phase P0 Containment:** Повна ізоляція тестового середовища від бойових фінансових потоків до моменту підписання юридичних погоджень Phase 4B.
3. **Defense-in-Depth:** Багаторівневий захист на рівні коду, залежностей, контейнерів, статичного аналізу та інфраструктури.

---

## 2. Комплекс перевірок GitHub Actions CI (9 Джоба)

Перед кожним злиттям коду в захищену гілку `main` виконується обов'язковий набір із 9 перевірок:

| Джоба CI                           | Інструмент                                       | Мета перевірки                                                            | Поточний стан         |
| ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | --------------------- |
| **`Verify`**                       | TypeScript, ESLint, Prettier, Containment Script | Перевірка стилю, типів, збірки App Router та політики блокування деплою   | ✅ PASS (100%)        |
| **`Storefront E2E`**               | Playwright (Chromium Mobile + Desktop)           | 28 наскрізних тестів (PWA, Checkout, Escrow, Search, Moderation, Profile) | ✅ PASS (100%)        |
| **`Container Scan (storefront)`**  | Trivy Container Scanner                          | Пошук вразливостей в образі `life-storefront`                             | ✅ PASS (0 findings)  |
| **`Container Scan (commerce)`**    | Trivy Container Scanner                          | Пошук вразливостей в образі `life-commerce`                               | ✅ PASS (0 findings)  |
| **`Dependency Audit`**             | `pnpm audit --audit-level=high`                  | Виявлення вразливостей у дереві npm-пакетів (Fail-Closed)                 | ✅ PASS (0 High/Crit) |
| **`Secret Detection`**             | Gitleaks Scanner                                 | Пошук захардкодних API-ключів, паролів чи приватних сертифікатів          | ✅ PASS (0 secrets)   |
| **`CodeQL Analysis`**              | GitHub CodeQL AST Engine (ADR 0011)              | Глибокий семантичний аналіз коду на вразливості (XSS, Injection)          | ✅ PASS (SARIF Clean) |
| **`Catalog Provider Migrations`**  | MikroORM Migration Engine                        | Перевірка ідемпотентності та чистоти міграцій PostgreSQL 16               | ✅ PASS (100%)        |
| **`Catalog Provider Integration`** | Medusa REST API HTTP Tests                       | Перевірка ізоляції тенантів, модерації та сервісних шарів                 | ✅ PASS (100%)        |

---

## 3. Механізми захисту персональних даних (PII Protection)

- **PII Masking Middleware (`apps/commerce/src/utils/pii-masking.ts`):**
  - Автоматично маскує адреси електронної пошти (`o***@example.ua`), номери телефонів (`+380 67 *** ** 67`), номери платіжних карток та паролі в усіх системних логах бекенду.
- **Tenant Isolation (`VendorMember` & Authorization Guards):**
  - Користувачі майстерень мають доступ виключно до власних товарів, замовлень та налаштувань. Спроби доступу до чужих лістингів повертають `403 Forbidden`.

---

## 4. Інструкція реагування на інциденти безпеки

1. **При виявленні вразливості в залежностях:**
   - Запустити локально `pnpm audit`.
   - Оновити вразливий пакет або зафіксувати безпечну версію в `pnpm.overrides`.
2. **При виявленні секрету:**
   - Негайно відкликати скомпрометований ключ на стороні провайдера.
   - Видалити ключ з історії git за допомогою `git-filter-repo` (якщо необхідно).
3. **Порушення політики стримування:**
   - Перевірити `infra/deployment-policy.json` та переконатися, що `deploy_enabled: false`.
