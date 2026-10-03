# ADR 0013 — Незмінний конвеєр збірки контейнерів та протокол промоції GHCR (Фаза P2)

- **Дата:** 2026-09-10
- **Власник ADR:** технічний та інфраструктурний власник Life-MP
- **Статус:** Accepted (Прийнято; Фаза P2.1 завершена, перехід на незмінні дайджести у Фазі P2.2)

## Контекст

1. **Проблема збірки на цільовому хості:**
   Поточний файл `deploy/docker-compose.prod.yml` містить директиви `build:`. Якщо запускати цей compose-файл на цільовому хості, це вимагатиме локальної компіляції додатків (Next.js 16 та Medusa v2). Фактичний стан та topology цільового сервера наразі не підтверджені згідно з [ADR 0004](0004-production-isolation.md). Така потенційна збірка створює ризики:
   - пікове споживання процесорних ресурсів та оперативної пам'яті (ризик аварійних збоїв OOM);
   - наявність вихідного коду, складальних інструментів та розробницьких пакетів на робочому сервері;
   - відсутність гарантії повної байтової ідентичності зібраних контейнерних образів між середовищами;
   - порушення принципу незмінної інфраструктури ([ADR 0003](0003-release-and-recovery.md)).

2. **Статус інфраструктури та обмеження доказів:**
   Згідно з [ADR 0004](0004-production-isolation.md), сертифікація конкретного сервера, обстеження контурів (server discovery) та підтвердження місткості залишаються заблокованими. Цільовий production host і його точна апаратна конфігурація наразі не є верифікованими. Цей ADR розглядає цільову платформу `linux/amd64` як плановий стандарт збірки для хмарних контейнерів і не висуває непідтверджених тверджень щодо параметрів фізичного хоста.

3. **Вимоги безпеки ланцюга постачання (Supply-Chain Security):**
   - Перенесення збірки на ізольовані хмарні раннери GitHub Actions (`ubuntu-latest`);
   - Запобігання атакам класу TOCTOU (Time-of-Check to Time-of-Use), коли сканується один екземпляр образу, а публікується результат повторної збірки;
   - Суворе дотримання політики ізоляції (Phase P0/P2 Containment) без надання репозиторію прав неконтрольованого віддаленого деплою.

## Рішення

### 1. Модель єдиного артефакту та контролю цілісності (Build ➔ Checksum ➔ Scan ➔ Transfer ➔ Verify ➔ Load ➔ Push)

Для гарантії того, що публікується саме той бінарний артефакт, який пройшов аудит безпеки, для кожного сервісу впроваджується ланцюжок роботи з окремим ізольованим архівом із контролем контрольних сум та безпечною передачею між джобами:

1. **Збірка окремих архівів та розрахунок контрольних сум (у джобі `image-build-scan`):**
   Docker BuildKit компілює образи під архітектуру `linux/amd64` та експортує їх у незалежні файли:
   - `/tmp/commerce.tar` (для бекенду `life-commerce`);
   - `/tmp/storefront.tar` (для фронтенду `life-storefront`).
     Одразу після збірки розраховується криптографічний маніфест контрольних сум:
     `sha256sum /tmp/commerce.tar /tmp/storefront.tar > /tmp/checksums.txt`.
2. **Сканування кожного архіву (у джобі `image-build-scan`):**
   Сканер Trivy (`aquasecurity/trivy-action`, зафіксований за незмінним commit SHA) послідовно перевіряє саме експортовані файли архівів:
   - `input: /tmp/commerce.tar`;
   - `input: /tmp/storefront.tar`.
3. **Політика вразливостей:** Встановлюється чіткий контракт сканування:
   - Будь-яка виправна (fixable) вразливість рівня HIGH або CRITICAL викликає негайну зупинку (fail-closed);
   - Невиправлені апстрімом вразливості (`ignore-unfixed: true`) дозволяються виключно як задокументований залишковий ризик;
   - Винятки через `.trivyignore` дозволяються виключно в офіційному форматі Trivy із обов'язковим супровідним коментарем:
     ```text
     # reason: <обґрунтування> | owner: <відповідальний> | expires: YYYY-MM-DD
     CVE-YYYY-XXXXX
     ```
     де ідентифікатор відповідає патерну `CVE-\d{4}-\d+`, а коментар містить причину, власника та термін перегляду (валідується автоматичним скриптом у preflight).
4. **Безпечна передача артефактів між джобами (Artifact Transfer):**
   Оскільки джоби GitHub Actions виконуються на різних ізольованих віртуальних машинах, файли `/tmp/commerce.tar`, `/tmp/storefront.tar` та `/tmp/checksums.txt` завантажуються як workflow-артефакт за допомогою `actions/upload-artifact` із терміном зберігання 1 день (`retention-days: 1`).
5. **Верифікація цілісності перед завантаженням (у джобі `publish`):**
   Джоба `publish` завантажує артефакти через `actions/download-artifact` і перед будь-якою взаємодією з Docker обов'язково виконує повну повторну верифікацію контрольних сум:
   `sha256sum -c checksums.txt`.
   Пайплайн гарантує інваріант цілісності:
   `archive_sha256_after_build == archive_sha256_before_scan == archive_sha256_before_load`.
   У разі найменшої розбіжності хешу процес негайно абортується з кодом 1 (Fail-Closed).
6. **Завантаження та Публікація (у джобі `publish`):**
   Лише після успішної перевірки контрольних сум виконується завантаження відповідного архіву в локальний Docker-демон (`docker load -i commerce.tar` та `docker load -i storefront.tar`) і відправка в GitHub Container Registry під інформаційним commit-тегом:
   - `ghcr.io/georgekgk2/life-commerce:sha-<github_sha>`;
   - `ghcr.io/georgekgk2/life-storefront:sha-<github_sha>`.
7. **Фіксація дайджестів та Cosign-атестація:**
   З реєстру отримується канонічний `sha256`-хеш образу (remote manifest digest). Окремо фіксуються:
   - локальний SHA-256 хеш tar-архіву;
   - локальний Image ID / config digest;
   - фінальний registry manifest digest.
   Для кожного опублікованого образу виконується криптографічна атестація походження через Cosign Keyless OIDC (`cosign attest` та `cosign verify-attestation`) із перевіркою емітента (`https://token.actions.githubusercontent.com`) та ідентичності workflow.
   Лише після успішної верифікації формується звіт `IMAGE_DIGESTS.json`, що зберігається як завантажуваний артефакт workflow.
8. **Статус тегів та дайджестів:**
   Інформаційний тег `sha-<github_sha>` призначений виключно для зручності аудиту та пошуку в інтерфейсі GHCR і не є криптографічно незмінним (теги в реєстрах можуть перезаписуватися). Єдиним авторитетним, юридично та технічно незмінним ідентифікатором є **канонічний registry manifest digest (`@sha256:...`)**, що повертається реєстром під час публікації. Усі подальші кроки (compose, promotion, перевірки) використовують **виключно дайджест**.
9. **Вимога атестації та інваріант непридатності (Attestation Failure Invariant):**
   Оскільки публікація образу в реєстр (`docker push`) передує підписанню атестації Cosign (`cosign attest`), у разі помилки кроку атестації або верифікації частково завантажений або осиротілий (orphaned) образ може технічно опинитися в GHCR. Будь-який образ у GHCR вважається **суворо неавторитетним, некваліфікованим та непридатним для промоції (`STRICT NO-GO`)**, якщо процес атестації зазнав збою або якщо відсутній верифікований workflow-артефакт `IMAGE_DIGESTS.json`. Промоція у фазі P2b дозволяється **виключно за наявності пари: канонічний manifest digest + підтверджена криптографічна атестація походження Cosign**.
   *Privacy Trade-off Note:* Використання публічного Sigstore/Rekor фіксує в сертифікаті Fulcio та журналі прозорості назву репозиторію та шлях workflow (`Georgekgk2/Life-MP/.github/workflows/release-images.yml@refs/heads/main`). Цей компроміс явно прийнято для збереження приватності самого коду без необхідності робити репозиторій публічним.

### 2. Модель тригерів, дозволів та повний граф перевірок у CI

- **Тригер:** Виключно `push: branches: [main]` (post-merge). Запуск на подію `pull_request` суворо заборонено, що унеможливлює доступ неперевіреного коду із форків чи робочих гілок до прав публікації.
- **Прив'язка до Commit SHA:** Перевірки на гілці PR не замінюють перевірку результуючого комміту в `main`. Збірка та публікація артефактів виконуються суворо для точного `github.sha`, який злито в `main`.
- **Автономний релізний граф (Release Workflow Target Design):**
  Оскільки джоби не можуть мати міжфайлових залежностей `needs` між окремими workflow-файлами, релізний пайплайн `.github/workflows/release-images.yml` проектується як єдиний самодостатній граф, що охоплює дев'ять обов'язкових вимірів якості та безпеки на фактичному `github.sha` після злиття в `main`:
  1. `verify-and-test` (permissions: `contents: read`) — збірка workspace, lint, typecheck, модульні тести (`vitest`) та перевірка документації (`check-docs.mjs`);
  2. `integration-and-e2e` (permissions: `contents: read`) — запуск тестової бази даних, міграцій, інтеграційних тестів та Playwright E2E;
  3. `security-audit` (permissions: `contents: read`) — Secret Detection (Gitleaks) та аудит виробничих залежностей (`pnpm audit --prod --audit-level=high`);
  4. `codeql-analysis` (permissions: `contents: read`, `actions: read`) — статичний аналіз CodeQL для `javascript-typescript` зі збереженням SARIF-артефакту (`upload: "never"`, згідно з ADR 0011; дозвіл `security-events: write` не вимагається);
  5. `image-build-scan` (permissions: `contents: read`) — компіляція образів у tar-архіви, розрахунок контрольних сум, fail-closed сканування Trivy та збереження артефактів;
  6. `publish` (permissions: `contents: read`, `packages: write`, `id-token: write`; залежність `needs: [verify-and-test, catalog-provider-integration, catalog-provider-migrations, storefront-e2e, security-audit, codeql-analysis, image-build-scan]`) — завантаження артефактів, перевірка хешів, пуш у GHCR, генерація маніфесту та атестація Cosign.
     Джоба `publish` виконується **виключно за умови, що всі 7 попередніх обов'язкових джоб завершилися з результатом `success`** (використання `always()` чи слабких умов суворо заборонено).
- **Мінімальні права (Least Privilege):** Дозволи `packages: write` та `id-token: write` надаються суворо ізольовано на рівні джоби `publish`. Джоба `codeql-analysis` має `actions: read`. Усі інші джоби мають виключно `contents: read`.
- **Незмінні посилання на GitHub Actions:** Усі екшени у workflow фіксуються виключно за точними 40-символьними immutable commit SHAs (checkout, buildx, login, trivy-action, upload-artifact, download-artifact, cosign-installer).
- **Атестація збірки:** Застосовується `cosign attest` та `cosign verify-attestation` для кожного опублікованого образу (`ghcr.io/georgekgk2/life-commerce` та `life-storefront`). Атестація прив'язується **суворо до канонічного remote manifest digest** (`@sha256:...`).
- **Аутентифікація:** Використовується виключно системний короткоживучий `GITHUB_TOKEN`, жодних персональних токенів доступу (PAT) або постійних секретів.

### 3. Фазове розмежування політики репозиторію (Фаза P0 ➔ Фаза P2)

Поточна політика Phase P0 (`infra/deployment-policy.json`) блокує будь-які дії з публікації. Перехід до Фази P2 регламентується через суворий фазовий контракт:

- **Допустимі статуси політики:** Дозволеними є лише значення `CONTAINED` (Фаза P0) та `CONTAINED_PHASE_P2` (Фаза P2). Будь-який інший статус викликає fail-closed зупинку (`P0-POLICY-STATUS`);
- **Контракт Фази P2 (`CONTAINED_PHASE_P2`):**
  - Гейт `allow_ghcr_image_push` встановлюється в `true` **виключно для одного канонічного workflow** `.github/workflows/release-images.yml`;
  - Сканер `deployment-containment.ts` перевіряє точний allowlist цільових репозиторіїв (`ghcr.io/georgekgk2/life-commerce` та `ghcr.io/georgekgk2/life-storefront` без масок та широких префіксів);
  - Тригер публікації дозволено виключно для події `push` у гілку `main`;
  - Суворо заборонено використання `pull_request_target` (`P0-NO-PR-TARGET`);
  - Права `packages: write` обмежені виключно джобою публікації;
  - Заборонено використання SSH, віддалених команд, екшенів деплою (`appleboy/ssh-action`) та секретів хоста (`DEPLOY_SSH_KEY`);
  - Усі інші гейти (`allow_remote_deployment`, `allow_ssh_execution`, `allow_production_dns_tls`, `allow_live_payment_gateway`, `allow_live_shipping_api`, `allow_live_fiscalization`) **зобов'язані залишатися суворо `false`**;
  - Допускається наявність опціонального суворого об'єкта `scoped_demo_update` у політиці, який діє виключно після злиття узгодженого виконуваного PR і авторизує прив'язаний до SHA-256 скрипт для ізольованого демо-стенду без зміни глобальних гейтів (`allow_remote_deployment` та `allow_ssh_execution` лишаються `false`).

### 4. Розділення публікації (P2a) та промоції (P2b)

Процес розгортання чітко розмежовується на два незалежних етапи:

- **P2a (CI Registry Publication):** Автоматична збірка та публікація образів за результатами злиття коммітів у `main`. Результуючий маніфест `IMAGE_DIGESTS.json` зберігається як завантажуваний артефакт GitHub Actions (`actions/upload-artifact`) і **не комітиться назад у репозиторій**, запобігаючи нескінченним циклам CI.
- **P2b (Explicit Digest Promotion):** Окремий узгоджений PR, який оновлює `deploy/docker-compose.prod.yml`:
  1. Видаляє блоки `build:`;
  2. Замінює плаваючі теги додатків на точні immutable digests:
     `ghcr.io/georgekgk2/life-storefront@sha256:...` та `ghcr.io/georgekgk2/life-commerce@sha256:...`;
  3. Фіксує точні digests для сервісних образів: `postgres:16-alpine@sha256:...` та `redis:7-alpine@sha256:...`;
  4. Перевіряє коректність конфігурації через `docker compose config` без виконання будь-яких віддалених команд.

### 5. Межі дозволу розгортання та виняток для публічного демо

- **Цей ADR НЕ дозволяє загальне розгортання на продакшні:**
  Загальне віддалене розгортання (generic remote deployment), прямий SSH-доступ оператора чи CI, бойові production-гейти та комерційний запуск залишаються **суворо забороненими** (`allow_remote_deployment: false`, `allow_ssh_execution: false`, `allow_production_dns_tls: false`, `allow_live_payment_gateway: false`, `allow_live_shipping_api: false`, `allow_live_fiscalization: false`).
- **Попередня обмежена промоція public-demo (`DEMO-UPDATE-d3b5afec`, закрита):**
  - Була обмежена одноразовим grant після merge узгодженого PR `feature/demo-promotion-d3b5afec` у `main`; довільні віддалені мутації до цього merge були заборонені.
  - Точний історичний scope: public-demo `https://life-mp.pp.ua` (`34.139.21.224`, `medgemma-user`), commit `d3b5afec16a043fcb9192bfbbc8c882628c8b831`, run `36925554797` та immutable images, зафіксовані в readiness record. Цей grant закритий і не авторизує наступні digest.
  - Виконання відбулося виключно через SHA-256-verified `scripts/promote-public-demo.mjs` та `infra/scripts/promote-public-demo.sh`; manual SSH bypass був і лишається забороненим.
- **Попередня промоція public-demo (`DEMO-UPDATE-ed8b2e68`, закрита):**
  - Промоція виконувалася за результатами PR #117; verified на хості 2026-10-02.
- **Новий обмежений scope public-demo (`DEMO-UPDATE-7226ce7`):**
  - Запит стосується оновлення fixture-only `https://life-mp.pp.ua`; source `7226ce776a28d7f2a4840e0de2ff720d3b365f36`, run `37048827832`, точні digests задаються єдиним grant у policy.
  - Фінальний head мусить пройти всі required checks; branch protection не обходиться, а grant активується лише після merge точного scoping PR. Commercial production лишається `STRICT NO-GO`.
- **Розмежування комерційних воріт готовності (Commercial Gates vs. Fixture-Only Demo):**
  - Комерційні ворота готовності (`COM-1..6`, `LOG-1`, `CAT-1..5`, `FSC-1`, договори з еквайрингом, ПРРО, логістичними операторами, юридичні висновки) є обов'язковими **виключно для комерційного виробничого запуску**.
  - Публічний демо-стенд функціонує в ізольованому режимі виключно на статичних фікстурах (`CATALOG_SOURCE: fixtures`, `ALLOW_PUBLIC_DEMO_CATALOG: "true"`, `ALLOW_SYNTHETIC_CATALOG: "false"`, відсутність бойових платіжних та фіскальних ключів). Комерційні ворота не вимагаються для оновлення цього фікстурного демо, проте залишаються безумовними блокерами комерційного продакшну.

## Наслідки

- **Безпека хоста:** Попередню промоцію fixture-only public-demo виконано й перевірено через canonical runner; це не засвідчує комерційну ізоляцію або готовність до commercial production, які лишаються неперевіреними за [ADR 0004](0004-production-isolation.md).
- **Межі відтворюваності (Reproducibility Boundary):** Збірка не гарантує bit-for-bit reproducibility до моменту публікації через оновлення системних пакунків Alpine під час виконання інструкції `RUN apk upgrade --no-cache`. Проте після публікації конкретний `sha256`-дайджест у реєстрі є незмінним (immutable) і гарантує детерміноване розгортання одного й того самого бінарного артефакту.
- **Ізоляція ресурсів:** Архітектура P2 не використовує self-hosted runner або remote build і призначена зменшити майбутній host blast radius. Фактична production isolation залишається неперевіреною відповідно до [ADR 0004](0004-production-isolation.md).

## Статус

| Етап                                          | Опис                                                                      | Статус                                               |
| --------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| **P2.0**                                      | Архітектурний дизайн та специфікація (цей ADR)                            | **Accepted**                                         |
| **P2.1**                                      | Реалізація CI-публікації в GHCR (`release-images.yml`, оновлення сканера) | **Completed & Runtime-Verified** (Run 34562907779)   |
| **P2.2**                                      | Перехід `docker-compose.prod.yml` на незмінні дайджести                   | **Current candidate pins (DEMO-UPDATE-3b2c22e)**     |
| **Scoped Demo Update (DEMO-UPDATE-ed8b2e68)** | Попередня промоція public-demo через hash-bound скрипт                    | **Closed / Runtime-Verified (2026-10-02)**           |
| **Scoped Demo Update (DEMO-UPDATE-7226ce7)**  | Попередній exact-scope checkout update public-demo                        | **Closed / Runtime-Verified (2026-10-02)**           |
| **Scoped Demo Update (DEMO-UPDATE-3b2c22e)**  | Backport braces із межею глибини для client-demo                          | **PR #127 open; promotion pending**                  |
| **Commercial Production Promotion**           | Розгортання P2-образів на комерційному сервері та комерційний запуск      | **STRICT NO-GO**                                     |

## Приймання

Фазу P2 можна вважати завершеною лише за умови виконання наступних критеріїв:

1. Створено та верифіковано автономний workflow `.github/workflows/release-images.yml` із ланцюжком Single-Artifact, контролем контрольних сум та передачею артефактів для кожного образу (`/tmp/commerce.tar`, `/tmp/storefront.tar` ➔ Checksum ➔ Trivy ➔ Transfer ➔ Verify ➔ Load ➔ GHCR);
2. Сканер безпеки `deployment-containment.ts` оновлено з підтримкою дозволеної GHCR-публікації на `main` та покрито unit-тестами;
3. У результаті роботи workflow формується завантажуваний workflow-артефакт `IMAGE_DIGESTS.json`;
4. `deploy/docker-compose.prod.yml` очищено від секцій `build:` та переведено на незмінні дайджести;
5. Кожен PR проходить повноцінний незалежний review відповідно до політики репозиторію.

## Відкат

Якщо публікація в GHCR або завантаження образів за дайджестом зазнає невдачі, діючий публічний демо-реліз залишається незмінним. Повернення до збірки з вихідного коду на сервері суворо заборонено.
