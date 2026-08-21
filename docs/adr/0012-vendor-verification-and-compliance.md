# ADR 0012 — Верифікація вендорів і комплаєнс

- **Дата:** 2026-08-21
- **Власник ADR:** технічний + compliance-власник Life-MP
- **Статус:** `Прийнято для sandbox/development; production activation заблокована`
- **Межа:** технічна модель evidence review і moderation; не юридичний висновок і не сертифікація.

## Контекст

Каталог «ЛАЙФ» може містити eco, natural, handmade, organic або health-related claims. Такі claims не можна публікувати лише на підставі тексту, завантаженого вендором. Medusa marketplace module є джерелом правди для vendor/listing eligibility та moderation state; Payload CMS не є authority цього контуру.

Поточний ADR описує технічний guard. Він не підтверджує, що конкретний vendor, документ або продукт відповідає законодавству України.

## Рішення

1. Vendor має окремий verification state і moderation history.
2. Compliance evidence прив’язується до vendor або catalog listing з actor, provenance, status, timestamps і moderator rationale.
3. Product claim має окремий тип і не стає public лише через self-declaration.
4. Listing може бути public тільки коли виконані технічні eligibility/moderation checks і відсутній заборонений claim.
5. Medical/therapeutic claims залишаються заблокованими до окремого legal/compliance review.
6. Усі approve/reject/suspend дії staff створюють audit event.
7. Vendor routes визначають tenant з authenticated actor membership; UI badges не є authorization або юридичною гарантією.

## Стани та provenance

- `pending` — evidence очікує перевірки;
- `approved` — технічний moderator decision зафіксовано з rationale;
- `rejected` — evidence або claim відхилено;
- `suspended` — publication тимчасово заборонена;
- `expired` — строк evidence минув і потрібен повторний review.

Публічний mapper має відкидати записи без дозволеної provenance або з неактуальним moderation state. `approved` — це стан workflow, а не державна сертифікація.

## Наслідки

- Не можна називати vendor «перевіреним» без визначеного evidence scope.
- Не можна публікувати organic/medical/therapeutic claim без відповідного review та документа, якщо він потрібен policy.
- Потрібні storage access controls, MIME/size validation, retention та deletion policy для upload evidence.
- Комерційний onboarding залишається заблокованим до `CAT-1`–`CAT-5`, юридичного sign-off і production readiness gate.

## Перевірка

Мінімальний локальний evidence set:

- unit tests для state transitions і public mapper;
- HTTP tests для staff role, tenant isolation і reject/approve paths;
- migration test для унікальностей та audit tables;
- Playwright test, який показує moderator-only доступ без заяви про live approval.

Доказ конкретного pass повинен містити commit/worktree, дату, команду та exit status. Цей ADR сам по собі не доводить наявність такого pass.

## Відкат або заміна

Заборонити публікацію claim можна конфігураційним guard-ом і moderation policy без видалення evidence. Зміну таблиць виконувати лише через additive migration і окремий review; replacement ADR повинен описати provenance, audit і rollback.
