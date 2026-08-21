# План розробки до зовнішніх рішень і server-discovery gate

- **Дата:** 2026-07-28
- **Статус:** Proposed — готовий до рев’ю; не є дозволом на production provisioning або live commerce.
- **Мета:** максимально просунути перевірювані технічні контури так, щоб після письмових юридичних, фінансових, логістичних та операційних рішень залишилися вузькі change packs, а не переробка архітектури.

## 1. Межа цього плану

### 1.1 Що можна робити зараз

Цей план дозволяє розвивати лише такі класи функцій:

- synthetic/sandbox каталог, вендорські ролі, verification, документи, claims і модерацію;
- чисті доменні алгоритми для кошика, split та станів замовлення **без** створення комерційного order, payment, shipment або fiscal документа;
- контракти адаптерів, in-memory/fake реалізації та contract tests;
- UI, accessibility, content contracts, configuration validation, observability, CI, локальні image-build tests і recovery rehearsal на disposable local data;
- документацію, RACI-шаблони, decision-activation matrix і підготовку санітизованого server-discovery evidence pack.

Це відповідає дозволеному synthetic catalog core (`CatalogListing.visibility = local_demo`) у `docs/decisions/launch-scope.md:48-57`, наявній Medusa/marketplace основі в `docs/architecture/overview.md:5-18` і дозволеному sandbox-проєктуванню Phase 4A для parent/child orders та fake adapters у `docs/decisions/open-questions.md:28-34`.

### 1.2 Що не робити до зовнішніх відповідей

Залишити відсутніми або вимкненими за замовчуванням:

1. реальний checkout, приймання коштів, еквайринг, webhooks провайдера, split payment, payouts та COD;
2. ПРРО/РРО, реальні чеки, коригування чеків і будь-яку фіскальну інтеграцію;
3. створення реальних замовлень, публічні обіцянки доставки, ТТН, API Нової Пошти, shipping quotes і маршрутний розрахунок;
4. production onboarding, реальні вендорські документи, реальні персональні/платіжні дані та публікацію регульованих claims;
5. реєстрацію бренду/домену, production CMS, affiliate payouts, платні послуги, події, ticketing і booking;
6. будь-яке remote provisioning, Docker/Compose deployment або використання ресурсів іншого проєкту.

Ці межі випливають із фундаментальних COM-1/2/3/5 і LOG-1 blocker'ів (`docs/decisions/launch-scope.md:22-46`), а також із повного переліку відкладених catalog, services та affiliate capability (`docs/decisions/launch-scope.md:48-88`).

### 1.3 Правило безпечного дефолту

Кожен новий маршрут, workflow або UI-елемент, який може стати комерційним, повинен одночасно мати:

- **disabled-by-default gate** з явним allowlist environment/configuration;
- synthetic fixture або fake implementation, що не викликає зовнішній URL і не потребує секретів;
- сценарій негативного тесту, який доводить `404`, `403` або контрольовану помилку у вимкненому режимі;
- нейтральний український текст без заяв «продавець ЛАЙФ», «чек від ЛАЙФ», обіцянки строку доставки або гарантії;
- аудит переходу стану без PII, секретів або платіжних реквізитів у логах.

Поточний public API уже обмежує listing visibility значеннями `internal` і `local_demo` (`apps/commerce/src/modules/marketplace/constants.ts:21-22`), а застосунок прямо декларує checkout/payment/fiscalization/shipment як неімплементовані до рішень (`apps/commerce/src/index.ts:1-12`). Ці two guards не можна послаблювати в межах цього плану.

## 2. Вихідні факти та проблеми синхронізації

| Факт                                                                                                                               | Доказ                                                                                             | Наслідок для плану                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Storefront і Medusa marketplace core реалізовані для синтетичного каталогу.                                                        | `docs/architecture/overview.md:5-18`; `apps/commerce/medusa-config.ts:33-65`                      | Новий план починається з hardening і sandbox contracts, а не зі створення другого backend.                   |
| Локальний Compose містить лише PostgreSQL і Redis, прив’язані до loopback; він прямо не є production config.                       | `docker-compose.dev.yml:1-42`                                                                     | Не адаптувати цей файл для сервера і не вважати його основою remote deployment.                              |
| У репозиторії відсутні production/staging Compose files і production deploy команди явно не підтримуються.                         | `Makefile:107-115`; glob `docker-compose*.yml`                                                    | Контейнеризація є окремим підготовчим workstream, а server deployment — окремим gated workstream.            |
| CI вже запускає quality, HTTP integration, migration idempotence та storefront E2E jobs.                                           | `.github/workflows/ci.yml:15-219`                                                                 | Розширювати наявні gates, а не замінювати їх.                                                                |
| Поточна sandbox-архітектура допускає `ParentOrder → VendorChildOrders → VendorPayableLedger`, але legal/fiscal лишаються pending.  | `docs/adr/0010-multi-vendor-checkout-and-order-splitting.md:18-46`                                | Будувати лише deterministic sandbox state machine та adapter contracts; не відкривати customer checkout.     |
| Документація містить різні зрізи рішення щодо fulfillment і seller model.                                                          | `docs/adr/0008-fulfillment-modes.md:17-39`; `docs/decisions/launch-scope.md:22-57`                | Першим deliverable є canonical capability/decision matrix; жоден ADR не вмикає live integration сам по собі. |
| Існує ранній серверний snapshot із високим використанням root filesystem, але він застарілий і не є дозволеним discovery evidence. | Наданий замовником transcript від 2026-07-26; `docs/runbooks/production-server-discovery.md:9-19` | Не оцінювати місткість і не планувати remote контейнерні ліміти за цим snapshot.                             |

## 3. Цільова стратегія: спочатку контракти, потім активація

### 3.1 Архітектурне рішення цього плану

Створити **decision-safe sandbox core**: усі майбутні фінансові й fulfillment залежності мають стабільні локальні контракти, deterministic sandbox workflows і повний негативний test coverage, але не мають реальних провайдерів, секретів, публічних кнопок чи production endpoint activation.

Після надходження рішень зміна має відбуватися в одному з коротких activation packs:

| Зовнішнє рішення                                  | Майбутня точка активації                                                                            | Заборонена зміна до рішення                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `LGL-1` / COM-1 — seller of record                | legal copy policy, order metadata, vendor agreement policy, refund owner                            | Не показувати юридичну роль у customer UI та не фіксувати її в order record як факт. |
| `FIN-1` / COM-2 / COM-7 — payment flow і provider | `MarketplacePaymentAdapter` production implementation, webhook verification, provider configuration | Не зберігати ключі, не створювати payment session, не приймати webhook.              |
| `FSC-1` / COM-3 — ПРРО                            | `FiscalAdapter` production implementation, receipt policy and event mapping                         | Не створювати реальні чеки, QR, фіскальні номери або production fiscal secrets.      |
| `FIN-2` / COM-4 — vendor settlement               | payable rules, commission calculator, settlement approval workflow                                  | Не розраховувати payout, комісію або суму утримання.                                 |
| `LOG-1` / LOG-2 / LOG-3 — fulfillment             | `ShippingAdapter` production implementation, shipment state mapping, delivery policy                | Не генерувати ТТН, quote, label або customer delivery promise.                       |
| CAT-1…CAT-5 — real catalog                        | policy matrix, onboarding rules, content import and moderation publication gate                     | Не масово імпортувати real catalog, документи чи claims.                             |
| CAT-6 — brand/domain                              | canonical public identity, DNS/TLS/ingress config, copy review                                      | Не реєструвати production identity або робити незворотні claims.                     |

### 3.2 Критерій готовності кожного sandbox increment

Increment дозволено злити лише коли він:

1. не змінює `launch-scope.md` у бік увімкнення blocked capability;
2. має unit test позитивної логіки та тест unsafe/default-off режиму;
3. проходить `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` і relevant integration/E2E lanes;
4. не потребує реального API key, персональних даних або даних чинного вендора;
5. має atomic PR і окремий rollback/revert path;
6. додає або оновлює decision-to-code trace в capability matrix.

## 4. Детальний план розробки

### Хвиля 0 — канонічні decision gates і розбіжності документації

**Ціль:** перетворити всі pending рішення на machine-testable capability boundary і прибрати ризик, що старий ADR або scaffold помилково ввімкне функцію.

1. Створити `docs/decisions/capability-activation-matrix.md` як єдину матрицю: capability → статус → external evidence → owner → code guard → UI guard → tests → activation PR.
2. Звірити `open-questions.md`, `launch-scope.md`, ADR 0008, ADR 0010, Phase 4B register і `apps/commerce/src/index.ts`; позначити конфліктні формулювання як `sandbox only`, а не як завершені legal/fiscal decisions.
3. Винести у commerce один typed capability registry з режимами `disabled` і `sandbox_internal`; значення `enabled` має відхилятися schema parser'ом у всіх runtime environment. `sandbox_internal` дозволений тільки в `test`/`development`, лише за explicit synthetic flag і не може бути ввімкнений у production-like config. Додати `enabled` можна тільки в окремому post-decision activation PR із посиланням на прийнятий external-evidence record.
4. Не приймати boolean environment variables без schema parsing, allowlist і unit tests. Production має падати при local sentinel values, як уже вимагає `medusa-config.ts:7-30`; до activation pack parser також відхиляє provider URL, proxy, account ID, credential-like і webhook configuration fields.
5. Додати middleware/route tests, що native Medusa cart/order/payment/fulfillment/shipment/refund routes, provider webhooks і private sandbox routes повертають `404` для anonymous, customer, vendor, reviewer, platform admin і service actor. Після кожної заблокованої mutation attempt тест перевіряє відсутність native order/payment/fulfillment records і зовнішнього виклику.
6. Створити `docs/decisions/predecision-verification-matrix.md`: для кожного deliverable назвати exact command, test ID/fixture, actor matrix, tool/version, expected result і `allowed_skips = 0`. Усі формулювання на кшталт «relevant test», «where applicable» та «axe-equivalent» замінити на конкретну команду й assertion до їх використання як merge gate.

**Acceptance:** одна таблиця покриває COM-1…COM-8, LOG-1…LOG-7, CAT-1…CAT-6, services і affiliate; registry відхиляє `enabled` та provider configuration у production-like fixture; всі заблоковані native mutation endpoints повертають `404` для шести actor types без створення native records або egress; `predecision-verification-matrix.md` задає exact commands/tests без allowed skips; `pnpm run ci`, `pnpm run test:integration`, `pnpm run test:migrations` і named storefront E2E command green.

### Хвиля 1 — ядро sandbox order-домену без customer checkout

**Ціль:** завершити і перевірити pure domain contracts, не створюючи payment/shipment execution surface.

1. Провести source audit наявних `ParentOrder`, `VendorChildOrder`, `VendorPayable`, `SettlementBatch` і adapter scaffold у `apps/commerce/src/modules/marketplace/models/` та `apps/commerce/src/services/`. Для будь-яких financial scaffold зафіксувати, що вони не створюються, не зберігаються та не обчислюються до Settlement activation pack.
2. Для кожного наявного non-financial scaffold зафіксувати: створюється лише fixture/test factory, чи має migration, чи доступний через HTTP, чи належно audit-logg'ується. Не припускати, що наявний файл означає активну capability.
3. Описати pure input/output DTO для `SandboxCart`, `SandboxCartLine`, `ParentOrderDraft`, `VendorChildOrderDraft`, `SplitResult` і non-monetary `SettlementEligibilityPlaceholder` у `@life/types`, без payment credentials, delivery address, real customer identity, amount, currency, rate або withholding fields.
4. Реалізувати deterministic split engine: однаковий fixture input завжди дає однакову групу vendor child drafts, стабільний порядок і integer UAH minor-unit arithmetic лише для synthetic cart total; валідувати duplicate SKU/vendor, неактивний listing, zero/negative quantity і prohibited mixed category flags.
5. Реалізувати sandbox order state machine лише у private/internal workflow: `draft → simulated_authorized → simulated_paid → split_created → fulfillment_pending` плюс terminal `cancelled`/`simulated_refunded`. Жоден transition не викликає adapter за межами fake implementation.
6. Додати idempotency key semantics для split, simulated payment event і audit event; повторна подія не створює другого child draft. До `FIN-2`/COM-4 не створюються `VendorPayable`, `SettlementBatch`, `PayableDraft`, commission, payout, withholding або settlement amount.
7. Не створювати demo visualization, admin/internal HTTP route або persistence API для sandbox cart/checkout. Дозволені лише test factory та deterministic local/test fixtures; customer-facing cart/checkout route лишається відсутнім.

**Acceptance:** property/table-driven unit tests покривають усі дозволені й заборонені transitions; integration tests доводять `404` для всіх native mutation endpoints і шести actor types; 100 повторів одного idempotency input не створюють дублікат child draft; financial tables/amount fields не мутуються; migration test створює schema на порожній disposable DB двічі без помилки.

### Хвиля 2 — контракти provider adapters і fake implementations

**Ціль:** зробити майбутні інтеграції замінними без створення live connection.

1. Зберегти мінімальні ports `MarketplacePaymentAdapter`, `ShippingAdapter`, `FiscalAdapter`, `MediaAdapter`, `EditorialCmsAdapter` і не додавати provider-specific типи до UI/domain коду. Поточний `SandboxPaymentAdapter` є лише орієнтиром scaffold (`apps/commerce/src/services/payment-adapter.ts:1-57`), не доказом придатного payment flow.
2. Визначити versioned request/result/error contracts і допустимі статуси; у контрактах не повинно бути API keys, raw webhook body, provider credentials, URL, proxy або account ID.
3. Реалізувати лише in-memory/test adapters з control hooks для timeout, retryable failure, invalid signature, duplicate webhook та partially completed downstream operation.
4. Додати contract test suite, яку запускатиме кожна майбутня LiqPay/Fondy/WayForPay, Нова Пошта або ПРРО implementation без зміни domain tests.
5. Прописати для кожного port timeout, retry classification, idempotency key, correlation ID, redaction rule і audit event type; до activation pack усі transport attempts повертають deterministic `CapabilityDisabled` і config schema відхиляє outbound configuration.
6. Замість fake public payment URL повертати internal test reference; UI не повинен рендерити його як link.

**Acceptance:** fake adapter contract suite green; failure matrix охоплює timeout, duplicate event, permanent reject і retryable reject; sandbox test harness блокує всі outbound socket/DNS attempts і fail'ить при першій спробі; snapshot/log tests доводять відсутність secrets/PII; config fixture відхиляє provider URL, proxy, account ID, credential і webhook configuration.

### Хвиля 3 — посилення vendor verification, documents і claim moderation

**Ціль:** довести compliance workflow до стану, в якому можна швидко підключити справжнього вендора після RACI та document matrix, не завантажуючи його дані зараз.
**Runtime boundary:** до CAT-1…CAT-5 усі runtime write/review/publication routes для `VendorVerification`, `ComplianceDocument` і `ProductClaim` повертають `404` для всіх non-test actors. Дані можуть створюватися лише test factory або deterministic synthetic seed у local/test environment. Claim із `regulated=true` publication-blocked незалежно від reviewer status і не повертається жодним public або vendor API.

1. Перевірити й закрити переходи `VendorVerification`, `ComplianceDocument` і `ProductClaim` відповідно до ADR 0012 (`docs/adr/0012-vendor-verification-and-compliance.md`); попередній номер 0007 був дубльований і виправлений.
2. Винести policy interface `RequiredEvidencePolicy`: input — category/claim/fulfillment metadata; output — required document types, expiry requirement, reviewer role і publication blocker. Початкова реалізація повертає лише synthetic/local_demo policy, не «правила України за замовчуванням».
3. Використовувати sealed test fixtures для документів: MIME, extension, size, malformed file, expired record, missing relation, duplicate hash; не додавати реальні сертифікати або будь-які фото документів.
4. Зробити upload boundary allowlist-based: MIME, розмір, extension, checksum, object-key isolation, download authorization, malware-scan status `pending|clean|rejected`. Для `pending` і `rejected` application не віддає file bytes, preview, signed URL або object-storage redirect жодному actor'у, включно з platform admin/reviewer; доступні лише sanitized metadata. Download/preview можливі лише для `clean` synthetic test objects після object-level authorization. Справжній scanner adapter — окремий future integration.
5. Додати reviewer separation-of-duties: vendor не може review власний verification/document/claim; platform admin не отримує несанкціонований vendor document access; кожне рішення має reason/audit event.
6. Реалізувати expiry clock/worker interface з test clock; не запускати background production scheduler до появи операційного ownership і observability.

**Acceptance:** HTTP integration suite доводить `404` для write/review/publication routes всіх non-test actors, tenant isolation, reviewer authorization, malformed/oversize/expired refusal, immutable audit trail, відсутність public download і `403`/`404` для pending/rejected bytes; unit suite покриває policy matrix; E2E перевіряє, що unverified badges і regulated claims не видно у public catalog.

### Хвиля 4 — якість catalog, search і storefront без комерційних CTA

**Ціль:** зробити UX і catalog contract готовими до реальних даних, зберігаючи fixture/Medusa seam та нуль транзакційних обіцянок.

1. Зафіксувати public catalog DTO version і backwards-compatible mapper у `packages/types` та `apps/commerce/src/api/store/catalog/mapper.ts`.
2. Розширити `apps/storefront/src/catalog/server.ts` contract tests для `fixtures`, `medusa`, unavailable backend, malformed response, timeout і empty approved catalog. У Medusa mode не fallback'ати непомітно до fixtures.
3. Додати URL-safe filter/sort/pagination schema: category, availability indicator, verified-only synthetic filter; unknown parameter, invalid cursor і over-limit page мають safe error/empty response без leakage.
4. Побудувати local Postgres FTS + `pg_trgm` proof-of-concept лише на synthetic catalog, бо ADR 0005 обирає цей напрямок, але ще не має реалізованого індексу (`docs/architecture/overview.md:65-67`). Виміряти dataset, query plan і latency на зафіксованому synthetic corpus; не вводити окремий search service.
5. Поліпшити український UI: keyboard navigation, focus states, semantic headings, `lang="uk"`, colour contrast, loading/empty/error states, mobile widths. Product cards можуть показувати `Синтетичний каталог`/`Недоступно`, але не «Купити», «Оплатити» чи строки доставки.
6. Додати visual regression screenshots для catalog, empty, backend unavailable і blocked-detail states без real product media.

**Acceptance:** public DTO contract tests захищають fixtures і Medusa response; E2E працює для fixtures і mocked Medusa; Lighthouse/axe-equivalent automated accessibility suite не має critical violations на тестованих catalog pages; UI tests підтверджують відсутність checkout/payment/shipment CTA.

### Хвиля 5 — security, privacy та auditability

**Ціль:** закрити те, що не залежить від комерційної моделі, перш ніж у систему потраплять справжні дані.

1. Формалізувати threat model для current sandbox: actors, tenant boundary, staff reviewer, public visitor, malicious uploader, replay attacker. Scope не включає live provider secrets до їх появи.
2. Перевірити every private route на authentication, actor-derived vendor context, role check, object-level authorization, consistent `404`/`403` policy та rate limit policy. Не приймати vendor ID із body/query як trusted tenant selector.
3. Поширити PII redaction test coverage з HTTP на audit events, error serialization, worker payloads і adapter diagnostics; існуюча PII middleware suite є стартовим доказом (`apps/commerce/integration-tests/http/pii-middleware.spec.ts`).
4. Додати security headers, request-size limits, upload limits, CORS origin allowlist parser, CSRF/cookie posture для майбутнього admin browser flow та correlation ID propagation.
5. Розділити supply-chain governance і application runtime: окремий documented CI job із мінімальними правами може оновлювати dependency/image advisory evidence, SBOM і lockfile provenance; він не запускає application або adapter tests. Усі pre-decision application, adapter, container-smoke та E2E lanes працюють із pre-fetched, digest-pinned artifacts у hermetic network-disabled mode. Новий dependency допускається тільки з documented need, current official docs і reviewed lockfile change.
6. Зробити evidence-preserving audit tests: actor, action, target, before/after classification, correlation ID, timestamp; audit event не містить document body, card data, password або raw token.

**Acceptance:** authorization negative suite охоплює горизонтальну та вертикальну ескалацію; PII test corpus не з’являється в captured logs/audit/error payloads; CI fail'иться на high runtime advisory або змінах lockfile без frozen install; all security defaults тестовані у production-like config without real secrets.

### Хвиля 6 — observability і operational readiness у коді

**Ціль:** підготувати runtime до безпечної діагностики, не підключаючи production monitoring vendor.

1. Ввести structured event schema: timestamp, severity, service, release reference, correlation ID, operation, redacted error code. Заборонити raw `console` для request path, крім bootstrap failure без secret values.
2. Додати internal liveness/readiness health contracts: liveness не торкається dependencies; readiness перевіряє DB/Redis лише з timeout і повертає sanitized aggregate status. Не включати environment values, hostname, connection string або stack trace у відповідь.
3. Визначити metrics interface і local no-op/test collector: HTTP latency/status, workflow failures, adapter retries, DB/Redis readiness, document moderation queue age. Не запускати Prometheus, Sentry, OpenTelemetry exporter або зовнішній ingest без operational owner і DPA/privacy decision.
4. Написати runbook для incident triage: що збирати, хто має доступ, як redaction перевіряється, і що sandbox event не є customer order. Додати alert thresholds як proposed variables, не як підтверджені production SLO.
5. Додати failure-injection tests: Redis unavailable, database unavailable, adapter timeout, malformed internal job; service повертає deterministic safe error і не деградує до fixture publication або checkout path.

**Acceptance:** health route snapshot не містить secret/host/path/stack trace; failure tests не допускають uncaught promise, PII leakage або false `ready`; structured-log schema tests green; runbook має owner, escalation і evidence collection boundary.

### Хвиля 7 — data, migrations і local recovery rehearsal

**Ціль:** зробити schema evolution передбачуваною, не торкаючись remote data.

1. Кожна schema зміна має additive migration, rollback-compatibility note та migration idempotence test у disposable test database. Поточний CI уже має окрему migration lane (`.github/workflows/ci.yml:121-191`).
2. Розширити test scenarios: clean DB, upgrade from prior synthetic fixture, rerun migration, incomplete migration failure, app rollback compatibility where supported, and seed rerun idempotence.
3. Зробити local-only backup/restore drill на disposable named volume/temporary DB: restore не може бути release rollback. Це узгоджується з ADR 0003 (`docs/adr/0003-release-and-recovery.md:17-27`).
4. Визначити data retention/deletion interfaces для vendor documents, audit logs і future customer data; без production retention values до legal/privacy decision.
5. Додати import/export boundary only for synthetic fixtures: deterministic seed, schema validation, checksum and provenance metadata; no CSV/Excel upload from real vendors.

**Acceptance:** `pnpm run test:migrations` green on clean and rerun cases; local recovery rehearsal has a documented checksum/data-count assertion and proves no remote endpoint is contacted; migration change PR cannot merge without compatibility note and updated test.

### Хвиля 8 — відтворювані container artifacts, але не remote deployment

**Ціль:** підготувати codebase до окремих контейнерів без створення/зміни контейнерів на сервері.

1. Створити minimal multi-stage Dockerfiles для storefront і commerce з non-root runtime user, immutable base image digest (`node:<exact-version>@sha256:…`), production-only dependencies, `.dockerignore`, explicit build args and no copied `.env`/keys. Package-manager version і frozen lockfile mode мають бути зафіксовані; base-image digest change — окремий reviewed dependency change. Контейнерна валідація використовує pre-fetched verified base image та `--pull=false`; жоден application build/test lane не завантажує artifact або звертається назовні.
2. Додати `docker compose` **local sandbox validation** topology, відокремлену від `docker-compose.dev.yml`: storefront, commerce, Postgres, Redis, internal network, named local volumes, project prefix `life-mp-local` та ephemeral CI-generated suffix. Репозиторій не містить remote project identifiers, resource names, credentials або assertions про відсутність name collision.
3. Expose host port only for an explicitly local reverse-proxy/test ingress; DB and Redis remain internal to the Compose network. Не кодувати remote port, DNS name, TLS certificate, host path або account user у репозиторії.
4. Визначити лише deployment-neutral environment schema: required secret names, non-secret variables, CORS origins, migration mode і healthcheck expectations. Не створювати remote topology, target namespace, ingress, DNS/TLS, backup, secret-store, resource-limit, deployment-role або production-hosting config до accepted discovery evidence і окремого infrastructure-design PR.
5. Add hermetic image smoke tests: build from clean checkout із pre-fetched dependencies/base image, `--pull=false` і network-disabled build/runtime where supported; run as non-root with fake secrets, health responses, no source/test files in runtime image, failed boot with unsafe production sentinel, base-image digest/lockfile integrity check, and resolved image digest/SBOM as CI artifact. Do not publish to an unapproved registry.
6. Document release artifact immutability and image rollback according to ADR 0003; no remote `docker pull`, `compose up`, migration or registry login belongs to this wave.

**Acceptance:** local image build and smoke test are reproducible from pre-fetched artifacts with application network disabled; runtime images contain no `.env`, SSH key, backup, test report or source map unless expressly approved; local compose config validation passes; an attempted production-mode start with local sentinel values fails, matching `apps/commerce/medusa-config.ts:16-28`; no remote topology/configuration is created or asserted.

### Хвиля 9 — CI quality gates та економіка тестів

**Ціль:** зробити кожен previous wave continuously verifiable before external decisions arrive.

1. Preserve current required `Verify`, integration, migrations and E2E lanes; split CI into a documented, least-privilege supply-chain governance lane and network-disabled pre-decision application lanes. The former does not execute app/adapters; the latter use only pre-fetched/digest-pinned artifacts.
2. Add parallel hermetic containers job: Dockerfile build with `--pull=false`, local compose smoke in a network-disabled application namespace, image filesystem policy check, and no-secret scan of build context/artifact metadata.
3. Add contract test job for all fake adapters; config fixture must reject every outbound/provider setting, and the sandbox harness must block socket/DNS attempts so that the first attempted egress fails the job.
4. Add coverage thresholds per critical pure domain package and mutation/property-style tests for split/state transition logic; do not target a vanity global percentage.
5. Upload only sanitized failure artifacts: Playwright report/screenshots and test logs must be scanned/redacted; never upload `.env`, DB dump, browser storage or runtime config.
6. Define test data lifecycle: temporary databases and volumes are created only in CI/local context, unique per job, and disposed by runner; no remote or shared database is a test target.

**Acceptance:** `predecision-verification-matrix.md` names the exact job/command/fixture for every core deliverable; every pre-decision application lane runs with network disabled and pre-fetched artifacts, while the separately documented supply-chain governance lane executes no application/adapter code; failed job artifacts contain no known secret/PII test markers; no quality gate is disabled or skipped to make a PR pass.

### Хвиля 10 — authorized server-discovery та isolated hosting gate

**Ціль:** зафіксувати зовнішню умову для майбутнього оцінювання сервера. Wave 10 не є development work, не є дозволом на підключення та не створює remote hosting design.

**No server action is authorized by this plan.** The provided historical SSH transcript is not the required written authorization. Before any connection, the infrastructure owner must provide the one-time written authorization required by `docs/runbooks/production-server-discovery.md:9-19`: owner, executor, time window, purpose, exact read-only command allowlist, sanitized reporting channel and the right to refuse.

Після такого дозволу executor може виконати лише permitted one-by-one read-only commands у `docs/runbooks/production-server-discovery.md:34-53` і зберегти тільки санітизовані категоріальні висновки. Заборонено інспектувати paths, containers, images, volumes, networks, logs, configuration, backups, credentials, users або running workloads (`docs/runbooks/production-server-discovery.md:21-32`).

Власник інфраструктури окремо надає categorized attestations щодо незалежної мережевої межі, можливості public ingress без конфлікту, дозволу ізольованої Compose network, незалежних storage/secrets/logs/backups/routes, призначених DNS/TLS/patching/incident/backup owners і capacity проти письмового Life-MP workload profile. Історичний root filesystem/swap snapshot не є доказом місткості.

**Acceptance:** accepted sanitized discovery template за `production-server-discovery.md:85-92` означає лише одне з двох рішень: `host unsuitable` або `further infrastructure design may be proposed`. Remote provisioning, включно з non-production sandbox, не входить до цього плану; воно потребує окремої письмової авторизації та isolated-infrastructure review. Production provisioning додатково заблоковане до прийняття всіх named external evidence gates, CAT-6, post-discovery infrastructure-design і provisioning authorization.

### Хвиля 11 — activation packs після рішень (зараз не виконуються)

Create a short, reviewable activation PR only after each named external evidence gate is satisfied:

1. **Legal/fiscal pack:** set seller model per SKU/order, customer legal copy, receipt issuer/event mapping, refund/support owner; requires `LGL-1`, `LGL-2`, `FSC-1` written artifacts.
2. **Payment pack:** one selected provider adapter, verified webhook signature and idempotency, refund/dispute behavior, sandbox-to-live credential separation; requires `FIN-1`/COM-2/COM-7 contract and provider sandbox verification.
3. **Settlement pack:** commission calculator, payable lifecycle, reviewer/approver separation, payout export—not automatic bank transfer by default; requires `FIN-2`, COM-4 formula and accounting policy.
4. **Fulfillment pack:** selected carrier account model, address/courier-only UX, label/status mapping, direct/warehouse responsibilities and return route; requires `LOG-1`, `LOG-2`, `LOG-3` and delivery policy.
5. **Real catalog pack:** approved category/document matrix, vendor consent, moderation RACI, rights to media and public-copy review; requires CAT-1…CAT-5.
6. **Identity and production pack:** confirmed brand/domain, separate server gate, image registry, backup/restore drill, immutable promotion and rollback rehearsal; requires CAT-6 and Wave 10 acceptance.

Each pack must contain a decision reference, migration compatibility note, explicit feature-flag transition, unit/integration/E2E/regression tests, security review, operational runbook update and rollback instruction.

## 5. Межа remote hosting після server-discovery

До accepted discovery evidence не створюються і не затверджуються remote topology, target namespace, ingress, DNS/TLS, backup, secret-store, resource limit, deployment role або production-hosting design. Wave 8 створює лише deployment-neutral local image contract.

Після accepted discovery evidence може бути запропонований **окремий** infrastructure-design документ. Він не є частиною цього плану і має довести, що Life-MP не використовує Jorvis credentials, backups, volumes, networks, certificates, databases або service users, як вимагає ADR 0004 (`docs/adr/0004-production-isolation.md:13-30`).

Поки такого документа, окремої авторизації та всіх production evidence gates немає, жоден remote container, registry login, migration, Compose operation, domain/TLS change чи deployment не виконується.

## 6. Порядок виконання та власність

| Order | Deliverable                                           | External dependency                                                     | Suggested owner                  | Merge gate                                                                                 |
| ----- | ----------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| 0     | Capability activation matrix and guard reconciliation | None                                                                    | Tech lead + reviewer             | Documentation consistency review; negative route tests.                                    |
| 1     | Sandbox domain split/state machine                    | None                                                                    | Commerce engineer                | Unit/property tests + integration non-exposure test.                                       |
| 2     | Fake adapter contracts and failure matrix             | None                                                                    | Commerce engineer                | Contract suite; egress-free test.                                                          |
| 3     | Verification/documents/claims hardening               | None, synthetic data only                                               | Commerce + compliance reviewer   | Auth/upload/moderation integration tests.                                                  |
| 4     | Catalog/search/storefront quality                     | None, synthetic data only                                               | Storefront + commerce engineer   | DTO contract, E2E, accessibility tests.                                                    |
| 5     | Security/PII/auditability and observability           | None                                                                    | Security-minded backend engineer | Negative auth, log-redaction, failure-injection tests.                                     |
| 6     | Migration/recovery rehearsal                          | Local disposable infrastructure only                                    | Commerce + platform engineer     | Migration/idempotence and local recovery proof.                                            |
| 7     | Local container artifacts and CI image smoke          | Local Docker/CI only                                                    | Platform engineer                | Build/smoke/SBOM/no-secret gates.                                                          |
| 8     | Server discovery evidence                             | Written infrastructure authorization                                    | Infrastructure owner + executor  | Accepted sanitized discovery template.                                                     |
| 9     | Remote provisioning                                   | Out of scope: separate authorization and infrastructure review required | Infrastructure owner             | Не є merge gate цього плану; production additionally requires all external evidence gates. |
| 10    | Live integrations                                     | All named decision packs                                                | Cross-functional owners          | Each activation pack acceptance; no bulk activation.                                       |

Work must follow one vertical slice per PR: contract/schema → implementation → focused test → named commands from `predecision-verification-matrix.md` → commit. Remote provisioning is excluded from every pre-decision development slice.

## 7. Матриця перевірок

| Layer        | Mandatory proof before merge                                                                                                                           | Failure condition                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Types/domain | Unit + property/table tests for validation, split, state transition, money arithmetic and idempotency                                                  | Unexpected transition, duplicate draft, non-determinism, float arithmetic.                                                             |
| HTTP/RBAC    | Integration tests with at least owner, manager, reviewer, platform admin and anonymous actors                                                          | Cross-vendor data exposure, role escalation, public sandbox route, missing audit record.                                               |
| Storefront   | E2E for fixtures/Medusa/error/empty states plus automated accessibility scan                                                                           | Checkout/payment/shipping CTA, English user copy, inaccessible critical flow, silent data-source fallback.                             |
| Data         | Clean/re-run/upgrade migration tests and local-only recovery rehearsal                                                                                 | Non-idempotent migration, untested compatibility, remote connection.                                                                   |
| Adapters     | Contract/failure/idempotency tests with outbound-config rejection and blocked socket/DNS harness                                                       | Any egress attempt, provider configuration, duplicate event mutation or unredacted error.                                              |
| Images       | Pre-fetched digest-pinned build with network-disabled application validation, non-root start, healthcheck, source/secret exclusion, sentinel rejection | `.env`/key in image, root runtime, health exposes internals, mutable base image, egress attempt or unsafe production boot.             |
| CI/artifacts | Exact jobs from `predecision-verification-matrix.md`; app lanes are hermetic and supply-chain governance is isolated                                   | Disabled/skipped gate, app code in governance lane, egress in app lane, uploaded secret/DB/browser storage or mutable/published image. |
| Hosting      | External evidence gate only: authorized sanitized discovery result                                                                                     | It is not a merge or completion gate; any remote action lacks separate authorization.                                                  |

## 8. Ризики та заходи зменшення

| Risk                                                     | Prevention / mitigation                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sandbox code accidentally becomes live commerce          | Central capability registry, default-deny, route-level negative tests, no provider SDK/credentials, change-pack-only activation. |
| Existing ADR/scaffold is interpreted as legal approval   | Capability matrix names evidence and status; launch scope remains overriding activation guard.                                   |
| Data leakage through test fixtures, logs or CI artifacts | Synthetic-only fixtures, PII marker scans, redaction tests, sanitized artifact allowlist.                                        |
| Cross-vendor access                                      | Actor-derived tenant context, object-level checks, adversarial integration tests and immutable audit events.                     |
| Early container deployment causes collision with Jorvis  | No remote action without formal discovery and separate authorization; no remote topology is designed or assumed in this plan.    |
| Host capacity is underestimated                          | Use no historic snapshot as allocation proof; create workload profile and load test before resource decision.                    |
| Irreversible migration blocks rollback                   | Additive migrations, compatibility notes, test reruns, immutable image rollback, recovery separated from release rollback.       |
| Scope creep into CMS/affiliate/services                  | Capability matrix and CI tests enforce disabled routes and copy; separate ADR/change pack required.                              |

## 9. Визначення завершення цього плану

Pre-decision code completion is limited to Waves 0–9. Wave 10 is an external-evidence gate, and all remote provisioning is out of scope. Completion requires Waves 0–9 accepted with the exact named checks green, all externally dependent capabilities disabled, and the capability matrix demonstrating a named activation pack for every pending decision. It does **not** mean the marketplace is ready for commercial launch.

Commercial readiness remains blocked until the written legal, financial, fiscal, fulfillment, catalog, brand and infrastructure evidence is accepted under `docs/decisions/launch-scope.md:90-99`, an independently reviewed post-discovery infrastructure design is accepted, and the corresponding Wave 11 packs have passed their own verification.
