# Посібник з безпеки та політики стримування

- **Дата огляду:** 2026-08-21
- **Власник:** security-власник + технічний власник
- **Середовище:** локальні перевірки та GitHub CI
- **Принцип:** fail-closed — відсутній або суперечливий доказ блокує promotion.

## 1. Базові принципи

1. **Fail-closed:** невизначеність не перетворюється на дозвіл.
2. **P0 Containment:** payment, fiscal, carrier, payout і remote deployment capability залишаються вимкненими до зовнішніх gate.
3. **Найменші привілеї:** локальні application roles не є superuser; test runner має окремий control connection.
4. **Tenant isolation:** доступ vendor визначається actor/auth context і membership, а не client-provided tenant id.
5. **Мінімізація даних:** PII, secrets, платіжні реквізити й реальні документи не потрапляють у Git, fixtures або журнали.
6. **Provenance:** назва security job або наявність workflow не є доказом її успішного запуску для поточного commit.

## 2. Фактична CI-структура

У репозиторії є три workflow-файли:

| Workflow                         | Job/контур                                    | Призначення                                                                                                                                 |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`       | `Verify`                                      | lint, build, containment, typecheck, unit test; форматування має запускатися окремо в локальному `pnpm run ci`, якщо не додана до workflow. |
| `.github/workflows/ci.yml`       | catalog integration/migrations/storefront E2E | Локальні contract checks з ephemeral services або Playwright.                                                                               |
| `.github/workflows/codeql.yml`   | `CodeQL Analysis`                             | JavaScript/TypeScript security-extended analysis; SARIF зберігається як artifact, upload вимкнений.                                         |
| `.github/workflows/security.yml` | `Secret Detection`                            | Gitleaks без upload artifact.                                                                                                               |
| `.github/workflows/security.yml` | `Dependency Audit`                            | `pnpm audit --prod --audit-level=high`.                                                                                                     |
| `.github/workflows/security.yml` | `Container Scan` matrix                       | Trivy для commerce і storefront images; також перевірка layer history на secret-like strings.                                               |

Workflow-файли, job-и та matrix executions — різні поняття. Не називайте три workflow «дев’ятьма workflow».

## 3. Локальні перевірки

```bash
pnpm docs:check
pnpm format:check
pnpm lint
pnpm build:packages
pnpm typecheck
pnpm test
pnpm build
node scripts/verify-deployment-containment.mjs
pnpm audit --prod --audit-level=high
```

Для окремого CodeQL/Trivy/Gitleaks доказу використовуйте відповідний GitHub run або локальну команду збережену з датою, commit і exit status. Не переносіть PASS зі старого SHA на незакомічений worktree.

## 4. Персональні дані та журнали

- `apps/commerce/src/utils/pii-masking.ts` і пов’язані middleware повинні маскувати PII у структурованих логах.
- Не записуйте в лог body з customer phone/email, auth token, cookie, payment transaction, IBAN або document bytes.
- DTO для customer orders віддає лише записи поточного customer і не розкриває чужі shipment чи vendor payout fields.
- `localStorage` storefront дозволений для draft/fixture/UI state, але не є authoritative source для identity, order або review.
- Після зміни PII policy потрібні unit/integration tests і оновлення decision/register документів.

## 5. Tenant і role controls

- Vendor route спочатку викликає `resolveVendorMembershipFromAuthContext`.
- Listing/document/verification доступні лише membership поточного actor.
- Admin moderation потребує staff role; conflict-of-interest policy і audit event є обов’язковими.
- Відсутність membership, auth або ролі повинна завершуватися безпечним error, а не fallback до іншого tenant.
- UI-приховування кнопки не є authorization.

## 6. Ворота стримування

Перевірка:

```bash
node scripts/verify-deployment-containment.mjs
```

Очікування: policy зберігає deployment capabilities вимкненими. Успіх цієї команди доводить лише стан локального policy-файлу; він не доводить наявність production-сервера, registry, DNS, TLS, backup або дозволу на remote action.

## 7. Реагування на інцидент

### Витік секрету

1. Не публікуйте секрет у issue, логу або чаті.
2. Негайно відкличте/замініть ключ у відповідного власника поза репозиторієм.
3. Зафіксуйте sanitized incident record без самого секрету.
4. Перевірте Git history, images, CI logs і artifacts дозволеним security owner способом.
5. Оновіть `.gitignore`, secret scanning rule або boundary лише після review.

### Вразливість залежності або образу

1. Збережіть package/image digest, commit і scanner output.
2. Визначте, чи affected dependency потрапляє в runtime image.
3. Оновіть залежність або зафіксуйте безпечний override через PR.
4. Повторіть dependency/container scan; не ігноруйте finding без письмової risk acceptance.

### Порушення containment

1. Зупиніть виконання та не повторюйте небезпечну команду.
2. Перевірте `infra/deployment-policy.json` і актуальний workflow.
3. Повідомте технічного та security-власника.
4. Відкрийте remediation task із доказом, scope та rollback.

## 8. Межа тверджень

Цей runbook не підтверджує:

- відсутність вразливостей у поточному непушеному diff;
- юридичну відповідність або certification;
- production readiness;
- ізоляцію віддаленого сервера;
- безпеку реальних payment/shipping credentials.
