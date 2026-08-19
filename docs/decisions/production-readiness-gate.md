# Ворота готовності до виробничого запуску (Production Readiness Gate & Safety Ledger)

**Дата запису:** 2026-08-19  
**Рішення:** **НЕ ДОЗВОЛЕНО ДЛЯ PRODUCTION / ПОВНІСТЮ ГОТОВО ДЛЯ SANDBOX ТА ВНУТРІШНЬОГО ТЕСТУВАННЯ**

---

## 1. Межа доказів та перевірений статус системи

Цей запис фіксує факти, підтверджені безпосередніми доказами у сесії розробки:

### ✅ Підтверджено та верифіковано в коді (100% PASS):

1. **Якість коду та тести:**
   - **75 юніт-тестів Vitest** монорепозиторію проходять успішно (48 storefront + 17 commerce + 7 config + 2 types + 1 cms).
   - **28 наскрізних Playwright E2E тестів** проходять успішно у мобільному та десктопному режимах.
2. **Безпека та CI:**
   - **9 з 9 перевірок GitHub Actions** завершуються зі статусом `SUCCESS`.
   - **CodeQL AST Analysis:** SARIF clean (ADR 0011).
   - **Trivy Container Scan:** 0 вразливостей в образах `life-storefront` та `life-commerce`.
   - **Gitleaks Secret Scanner:** 0 знайдених секретів.
   - **Pnpm Audit (Fail-Closed):** 0 High/Critical вразливостей.
3. **Транзакційний Sandbox (Phase 4C):**
   - Мультивендорний кошик (`CartDrawer`), форма чекауту (`/checkout`), розщеплення на `ParentOrder` / `VendorChildOrder`, 10% комісія платформи, Escrow-холдинг (`held` ➔ `captured`) та трекінг Нової Пошти з автовиплатами `SettlementBatch`.
4. **Мобільний UX та PWA:**
   - Web App Manifest, Service Worker (`Stale-While-Revalidate`), офлайн-fallback, бренд-іконки.
5. **Пошуковий рушій (ADR 0005):**
   - Search Adapter (`PostgresFtsSearchProvider` + Meilisearch) з українською морфологією та синонімами.
6. **Ізоляція Phase P0 Containment:**
   - Скрипт `scripts/verify-deployment-containment.mjs` блокує будь-які спроби деплою до офіційного відкриття воріт.

---

## 2. Відкриті блокери для комерційного Live Production

До моменту отримання підписаних письмових рішень за [пакетом Phase 4B](phase4b-decision-pack.md):

1. **LGL-1 (COM-1):** Юридична модель (Договір приєднання та оферта).
2. **FIN-1 (COM-2):** Платіжний договір на спліт-виплати (LiqPay / WayForPay / RozetkaPay).
3. **FSC-1 (COM-3):** Фіскалізація комісії маркетплейсу через ПРРО (Checkbox / Вчасно.Каса).
4. **LOG-1:** Корпоративний акаунт та бойовий API-ключ Нової Пошти.
5. **Production Server Discovery:** Авторизоване дослідження продакшен-інфраструктури per [runbook](production-server-discovery.md).

---

## 3. Підсумковий статус готовності

- **Sandbox / Demo / Local Testing:** **`VERIFIED & STABLE`** (Повна функціональна готовність).
- **Commercial Live Production:** **`BLOCKED (NOT READY)`** (Очікує підписання пакетів Phase 4B).
- **Роль:** Gatekeeper / Executor.
