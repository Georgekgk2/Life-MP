# Ворота готовності до виробничого запуску

- **Дата огляду:** 2026-08-23
- **Власник:** технічний власник + gatekeeper
- **Рішення:** **НЕ ДОЗВОЛЕНО ДЛЯ PRODUCTION; ДОЗВОЛЕНО ЛИШЕ ДЛЯ КОНТРОЛЬОВАНОЇ ЛОКАЛЬНОЇ РОЗРОБКИ, SANDBOX І ВНУТРІШНЬОГО ТЕСТУВАННЯ.**

Цей документ розділяє локальні докази, зовнішні погодження та readiness. Жоден локальний тест, ADR, Dockerfile чи deployment policy сам по собі не відкриває production gate.

## 1. Правило доказу

Кожен позитивний статус повинен містити:

- конкретний commit або зафіксований worktree;
- дату й команду;
- повний exit status і релевантний результат;
- межу того, що саме перевірено;
- незалежний reviewer для claim про готовність.

Якщо хоча б один обов’язковий gate провалений або відсутній, загальна готовність — **Not Ready**.

## 2. Локальний verification inventory

Це інвентар файлів і тестових наборів, а не автоматична заява про pass:

| Контур                               |                                          Поточний інвентар | Що треба запустити для нового доказу          |
| ------------------------------------ | ---------------------------------------------------------: | --------------------------------------------- |
| Vitest workspace                     |                 101 test-файл/набір за локальним inventory | `pnpm test`                                   |
| HTTP integration                     | 7 spec-наборів / 47 тестів у попередньому локальному звіті | `pnpm run test:integration`                   |
| Migration contract                   |     1 spec-набір / 2 тести у попередньому локальному звіті | `pnpm run test:migrations`                    |
| Playwright E2E                       |        16 spec-файлів × 2 проєкти = 32 case у конфігурації | `pnpm --filter @life/storefront run test:e2e` |
| Форматування, lint, typecheck, build |                           Команди визначені в root scripts | `pnpm run ci`                                 |
| Документація                         |                                       Link/ADR/status gate | `pnpm docs:check`                             |

Попередні локальні звіти не сертифікують поточний непушений worktree або зміни після того запуску. Перед merge потрібні свіжі результати з commit SHA та незалежний review.

## 3. Статус локальних capability

| Область                              | Статус                       | Обмеження доказу                                                           |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| Monorepo quality scripts             | Частково підтверджено        | Локальний результат не замінює GitHub CI для конкретного commit.           |
| Catalog/provider/moderation          | Частково підтверджено        | Покриває local/test Medusa, synthetic fixtures та public-demo, не commercial onboarding. |
| Tenant/customer isolation            | Частково підтверджено        | Потрібні свіжі HTTP/E2E докази та незалежний review.                       |
| Synthetic order/review boundary      | Частково підтверджено        | `ALLOW_SYNTHETIC_*` та `NODE_ENV` guards не є live integration.            |
| Payment/fiscalization/carrier/payout | Не реалізовано для live      | Жодні sandbox types або adapters не є бойовим провайдером.                 |
| CMS runtime                          | Заблоковано                  | Payload не встановлений і не є authority для каталогу.                     |
| Remote server/deployment             | Не перевірено та заблоковано | Потрібен авторизований discovery і незалежний infrastructure gate.         |

## 4. Обов’язкові зовнішні блокери

| Код                           | Блокер                        | Мінімальний артефакт                                                                    |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `COM-1`                       | Юридичний продавець           | Підписаний юридичний висновок, оферта та договори.                                      |
| `COM-2`                       | Одержувач коштів / еквайринг  | Договір, потік коштів, split/refund policy та provider selection.                       |
| `COM-3`                       | ПРРО та чек                   | Погоджена схема фіскалізації й договір із ПРРО.                                         |
| `COM-4`                       | Комісія                       | Ставка/формула, податки, ledger і refund policy.                                        |
| `COM-5`                       | Мультивендорний split         | Узгодження з COM-1/2/3 та операційним fulfillment.                                      |
| `COM-6`                       | Повернення, гарантія, support | Відповідальність, SLA, канал та затверджена політика.                                   |
| `LOG-1`                       | Fulfillment і Нова Пошта      | Модель власності, account/API authorization, SLA та carrier evidence.                   |
| `CAT-1`–`CAT-5`               | Категорії та evidence review  | Approved category list, supply list, content RACI, compliance matrix і moderator owner. |
| `Production Server Discovery` | Інфраструктурна незалежність  | Письмовий дозвіл, read-only report, capacity/network/secrets/backups attestations.      |

Джерело статусів — [реєстр відкритих рішень](open-questions.md) та [реєстр погоджень Phase 4B](phase4b-approval-register.md).

## 4A. Зовнішній infrastructure evidence

Окремий sanitized запис [production infrastructure cutover evidence](production-infrastructure-cutover-2026-08-23.md) містить public DNS/TLS/HTTP probes для Cloudflare Edge і Tunnel.

Поточний evidence-bound статус:

| Gate | Статус | Межа |
| --- | --- | --- |
| Public apex HTTPS | `VERIFIED` | HTTP `200` через Cloudflare Edge. |
| `www` canonical redirect | `VERIFIED` | HTTP `301` на `https://life-mp.pp.ua/`. |
| Public API health | `VERIFIED` | `/api/health` повертає HTTP `200`. |
| Edge certificate | `VERIFIED` | SAN містить apex і wildcard host. |
| Tunnel restart/recreation durability | `NOT VERIFIED` | Потрібен контрольований restart/recreation test. |
| Direct-origin fallback TLS | `NOT VERIFIED / FAILED HISTORICAL PATH` | Попередній direct-origin шлях мав TLS/522 failure. |
| Commercial production | `BLOCKED / NOT READY` | COM/LOG/CAT gates залишаються обов’язковими. |

Public infrastructure accessibility не є application, legal, financial або commercial production sign-off. Цей розділ не дозволяє remote mutation, promotion або real transactions.

## 5. Заборона promotion

До закриття всіх gate заборонено:

- зберігати або використовувати бойові payment/shipping/fiscal credentials;
- називати synthetic order «оплаченим» або `SettlementBatch` виплатою;
- створювати реальні ЕН/ТТН, webhook-и, refunds чи payout;
- вважати попередній GitHub CI run доказом для поточного непушеного diff;
- виконувати remote provisioning або production deployment;
- видавати локальний readiness за юридичне, фінансове чи operational sign-off.

### 5.1 Інваріант промоції контейнерних образів GHCR (Фаза P2)

- Будь-який образ у GHCR вважається **суворо непридатним та неавторитетним для промоції (`STRICT NO-GO`)**, якщо процес криптографічної атестації походження Cosign (`cosign attest` / `cosign verify-attestation`) не відбувся або завершився аварією, а також за відсутності згенерованого маніфесту `IMAGE_DIGESTS.json`.
- Публікація в реєстр (`docker push`) передує атестації. Наявність контейнера в GHCR без валідної пари (manifest digest + verified Cosign provenance attestation) кваліфікується як осиротілий артефакт (orphaned artifact) і підлягає безумовній дискваліфікації.
- Єдиним авторитетним ідентифікатором для Compose promotion (Фаза P2b) є **канонічний registry manifest digest (`@sha256:...`)** з верифікованого маніфесту `IMAGE_DIGESTS.json`.
- *Privacy Trade-off*: Відкритий запис у Rekor transparency log назви репозиторію та ідентичності workflow (`Georgekgk2/Life-MP/.github/workflows/release-images.yml@refs/heads/main`) явно зафіксовано та прийнято як допустимий компроміс для збереження приватності репозиторію без додаткових витрат на корпоративні плани GitHub.

## 6. Підсумок

- **Локальний sandbox:** `PARTIAL / evidence-bound`.
- **Public infrastructure ingress:** `VERIFIED` за прямими DNS/TLS/HTTP probes; durability не перевірена.
- **Staging:** `NOT VERIFIED`.
- **Commercial production:** `BLOCKED / NOT READY`.
- **Незалежний reviewer:** обов’язковий до merge; виконавець не сертифікує власну зміну (для PR #65 діє формальний виняток `EXC-20260909-SINGLE-OWNER-P0-CONTAINMENT`, для PR #70 діє виняток `EXC-20260911-SINGLE-OWNER-P2-COMPOSE`, див. розділ 7).

## 7. Реєстр офіційних винятків (Policy Exceptions)

### EXC-20260909-SINGLE-OWNER-P0-CONTAINMENT
- **Дата набрання чинності:** 2026-09-09
- **Власник авторизації:** Georgekgk2 (репозиторний та технічний власник)
- **Статус винятку:** `APPROVED / SINGLE-OWNER EXCEPTION`
- **Підстава:** Репозиторій функціонує в режимі персонального розробницького середовища з єдиним зареєстрованим користувачем `Georgekgk2`. Незалежний рецензент провів аудит змін PR #65 поза інтерфейсом GitHub і надав позитивний вердикт `GO`, проте в інтерфейсі GitHub об'єкт `reviewDecision: "APPROVED"` технічно недоступний через відсутність другого акаунта.
- **Точний обсяг винятку (Scope):** Поширюється виключно на злиття PR #65 (Phase P0 Containment Hardening).
- **Компенсаційні контроли безпеки:**
  1. Багатоетапний антагоністичний аудит двома незалежними системами (Pi та OMP), під час якого виявлено та повністю усунено 4 класи дефектів (symlink root/nested bypass, mandatory gates schema, shallow freeze RegExp, allowlist mutability).
  2. 22/22 unit-тести у `@life/config`, включно з прямими спробами мутації frozen-колекцій та обходу через сімлінки.
  3. 9/9 перевірок GitHub Actions пройшли з кодом 0 (`Verify`, `Storefront E2E`, `Catalog Provider Migrations`, `Catalog Provider Integration`, `CodeQL`, `Container Scan (storefront)`, `Container Scan (commerce)`, `Dependency Audit`, `Secret Detection`).
  4. Ранній preflight-захист інтегровано у `ci.yml` (блокування важких джобів) та `security.yml` (блокування збірки образів до проходження політики).
  5. Фізичне видалення скриптів віддаленого деплою (`scripts/deploy_prod.sh`) з репозиторію.
- **Залишковий ризик:** Відсутність криптографічно підписаного схвалення в GitHub Reviews API для поточного PR.
- **Незмінні обмеження та заборони (Strict Boundaries):**
  - Виняток **НЕ авторизує** розгортання на продакшн-сервері (`34.139.21.224`);
  - Комерційні функції (`allow_live_payment_gateway`, `allow_live_shipping_api`, `allow_live_fiscalization`) залишаються у суворому стані **`BLOCKED / NOT READY`**;
  - Live сайт продовжує функціонувати виключно в режимі ізольованого публічного демо (`public-demo`) на статичних фікстурах;
  - Повноцінний незалежний людський аудит обов'язково залишається передумовою комерційного запуску (Фаза P5).

### EXC-20260911-SINGLE-OWNER-P2-COMPOSE
- **Дата набрання чинності:** 2026-09-11
- **Власник авторизації:** Georgekgk2 (репозиторний та технічний власник)
- **Статус винятку:** `APPROVED / SINGLE-OWNER EXCEPTION`
- **Підстава:** Репозиторій функціонує в режимі персонального середовища розробки з єдиним зареєстрованим користувачем `Georgekgk2`. Незалежний рецензент (OMP) провів детальний технічний аудит змін PR #70 та надав позитивний вердикт `GO`, проте в інтерфейсі GitHub об'єкт `reviewDecision: "APPROVED"` технічно недоступний автору PR через платформове обмеження GitHub (автор не може схвалити власний PR). Оператор надав пряму авторизацію `go` на злиття.
- **Точний обсяг винятку (Scope):** Поширюється виключно на злиття PR #70 (Phase P2.2 Compose Digest Pinning).
- **Компенсаційні контроли безпеки:**
  1. Незалежний технічний аналіз OMP підтвердив: повне вилучення директив `build:`, суворе закріплення 4 образів за канонічними дайджестами, відповідність дайджестів раніше верифікованому маніфесту `IMAGE_DIGESTS.json` з commit `e7ba8b3` (Run `34562907779`), збереження публічно-демонстраційних меж (`public-demo`).
  2. Локальна валідація синтаксису через `docker compose -f deploy/docker-compose.prod.yml config` пройшла успішно.
  3. Усі 9 обов'язкових перевірок GitHub Actions у PR #70 завершилися з кодом 0 (`Catalog Provider Integration`, `Catalog Provider Migrations`, `CodeQL`, `Container Scan (storefront)`, `Container Scan (commerce)`, `Dependency Audit`, `Secret Detection`, `Storefront E2E`, `Verify`).
  4. 55/55 юніт-тестів у `@life/config`, `scripts/check-docs.mjs` та `verify-deployment-containment.mjs` пройшли зі 100% успіхом.
  5. Повний автономний релізний запуск після злиття на `main` (Run `34565644913`) завершився 100% успіхом (8 / 8 робіт), підтвердивши бездоганну цілісність репозиторію та конвеєра.
- **Залишковий ризик:** Злиття виконано за відсутності криптографічного схвалення другого облікового запису в GitHub Reviews API.
- **Незмінні обмеження та заборони (Strict Boundaries):**
  - Виняток **НЕ АВТОРИЗУЄ** розгортання на продакшн-сервері (`34.139.21.224`) або віддалені команди SSH / `docker compose pull/up` (`STRICT NO-GO`);
  - Комерційні гейти (COM-1..6, LOG-1, CAT-1..5, FSC-1) залишаються заблокованими;
  - Поточна конфігурація залишається суворо в режимі ізольованого публічного демо (`public-demo`) на фікстурах;
  - Цільовий сервер `34.139.21.224`, його топологія, ресурси та бекапи залишаються неперевіреними згідно з ADR 0004 і вимагають окремого sanitized discovery report перед будь-якою реальною промоцією.
