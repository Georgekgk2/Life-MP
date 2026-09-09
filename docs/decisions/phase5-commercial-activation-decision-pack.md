# Phase 5 — Commercial Activation Decision Pack

- **Статус:** `PENDING / НЕ Є SIGN-OFF`
- **Дата огляду:** 2026-08-22
- **Власник пакета:** технічний власник Life-MP
- **Власники рішень:** замовник, юридичний, фінансовий, операційний, compliance та security-власники
- **Контур:** підготовка рішень для майбутньої комерційної активації

Цей пакет перетворює відкриті питання на структурований процес письмового погодження. Він **не є** юридичним висновком, договором, фінансовим погодженням, production-дозволом або дозволом на підключення provider API.

## 1. Мета та поточний результат

Мета Phase 5 — отримати однозначні, датовані та доказові рішення для п'яти блокерів, від яких залежить подальша transactional-архітектура:

- `COM-1` — юридичний продавець і договірна модель;
- `COM-2` — одержувач коштів і платіжний потік;
- `COM-3` — фіскальна модель і відповідальність за РРО/ПРРО;
- `COM-5` — мультивендорний кошик, split та child orders;
- `LOG-1` — fulfillment, відправлення та операційна відповідальність.

Поточний результат: **`NO-GO / PENDING`**. Sandbox/development capability може залишатися доступною, але live checkout, payment, fiscalization, carrier API, payout та production activation залишаються вимкненими.

### Канонічні джерела

- [Реєстр відкритих рішень](open-questions.md) — канонічний статус зовнішніх рішень.
- [Реєстр погоджень Phase 4B](phase4b-approval-register.md) — канонічний evidence/status register для погоджень.
- [Пакет рішень Phase 4B](phase4b-decision-pack.md) — попередній перелік питань та очікуваних артефактів.
- [Phase 4D decision pack](phase4d-customer-trust-decision-pack.md) — зафіксована sandbox-only межа.
- [Межі запуску](launch-scope.md) — дозволені, вимкнені та заблоковані можливості.
- [Production readiness gate](production-readiness-gate.md) — окремі критерії готовності до production.

## 2. Межі пакета

### У межах

- вибір одного узгодженого варіанта для кожного core decision;
- призначення відповідального власника та дати рішення;
- збір юридичних, фінансових та операційних evidence artifacts;
- виявлення суперечностей між рішеннями;
- оновлення канонічного реєстру після прийняття доказів;
- підготовка входу для окремого transactional ADR та production gate.

### Поза межами

- реалізація checkout, payment, payout, fiscalization або shipment;
- вибір і підключення live payment/carrier provider;
- зберігання API keys, credentials, персональних даних чи договорів у Git;
- зміна статусу blocker лише через заповнення цього документа;
- deployment, server mutation, production migration або onboarding реальних vendors.

## 3. Правила доказового погодження

1. Для кожного core decision потрібно вибрати **один** варіант. Порожня відповідь, кілька варіантів або «вирішимо пізніше» не знімають блокер.
2. Відповідь має містити власника, дату набуття чинності, коротке обґрунтування та ідентифікатори доказів.
3. Докази класифікуються так само, як у канонічному реєстрі:
   - `P` — датована письмова відповідь замовника;
   - `L` — юридичний висновок, підписаний договір або оферта;
   - `F` — фінансовий артефакт, provider contract, ledger або refund policy;
   - `O` — операційний артефакт, RACI, SLA або fulfillment policy;
   - `T` — технічне рішення чи план, який **не замінює** зовнішнє погодження.
4. `P` або `T` самі по собі не закривають вимогу `L`, `F` чи `O`, якщо така вимога вказана нижче.
5. Конфіденційні договори та документи не комітяться. У репозиторії зберігаються лише санітизований опис, reference ID і, за дозволеною політикою, checksum/посилання на захищене сховище.
6. Після прийняття доказу технічний власник синхронно оновлює цей пакет, [open-questions.md](open-questions.md) та [phase4b-approval-register.md](phase4b-approval-register.md). Саме заповнення цього пакета не є approval.
7. За суперечності діє безпечний дефолт: функція залишається вимкненою, а рішення має статус `PENDING`.

## 4. Core decision forms

### COM-1 — Юридичний продавець і договірна модель

**Поточний стан у реєстрі:** технічно підтверджений намір Phase 4A; юридично `PENDING`.

**Питання:** хто є продавцем товару, стороною оферти/договору з покупцем і vendor, а також відповідальною стороною за повернення, гарантії, рекламації та customer support?

| Варіант | Робоча модель для погодження                                                            | Обов'язкова перевірка                                                                                |
| ------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `A`     | ЛАЙФ є продавцем / Merchant of Record; vendors постачають товари за окремими договорами | Юрист підтверджує роль ЛАЙФ, ланцюг договорів, податкові та consumer obligations                     |
| `B`     | Кожен vendor є продавцем; ЛАЙФ діє як агент/marketplace                                 | Юрист підтверджує агентську модель, розкриття vendor покупцю та межі відповідальності ЛАЙФ           |
| `C`     | Гібридна модель за категорією або типом vendor                                          | Для кожної категорії потрібна окрема legal/fiscal/operational матриця; неоднозначна модель є `NO-GO` |

**Запис рішення**

- Обраний варіант: `[ ] A` `[ ] B` `[ ] C`
- Сторона оферти та договору з покупцем:
- Сторона договору з vendor:
- Відповідальний за returns/warranty/support:
- Власник рішення:
- Дата рішення / дата набуття чинності:
- Evidence IDs (`L` обов'язковий):
- Роль особи, що погодила:
- Поточний статус: `PENDING`

**Критерій приймання:** одна юридично погоджена модель прямо визначає продавця, договірні сторони, customer-facing disclosure, повернення, гарантії, рекламації та support. До цього не створюється live offer або продаж.

### COM-2 — Одержувач коштів і платіжний потік

**Поточний стан у реєстрі:** технічно підтверджений single-payment намір; юридично/фінансово `PENDING`.

**Питання:** хто приймає кошти покупця, хто укладає договір з payment provider, як відбуваються settlement, refund, chargeback та reconciliation з vendors?

| Варіант | Робоча модель для погодження                                   | Обов'язкова перевірка                                                                                          |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `A`     | ЛАЙФ приймає одну оплату та розраховується з vendors           | Фінанси й юрист погоджують money-flow, settlement, tax, refund і chargeback ownership                          |
| `B`     | Кожен vendor є безпосереднім одержувачем власної оплати        | Provider підтверджує customer experience, split/cart behavior, vendor onboarding та reconciliation             |
| `C`     | Marketplace/split-модель payment provider із розподілом коштів | Provider contract, KYC, timing, fees, refunds, chargebacks і відповідальність мають бути письмово підтверджені |

Вибір payment provider є окремим питанням `COM-7`; цей запис не дозволяє додавати provider SDK або credentials.

**Запис рішення**

- Обраний варіант: `[ ] A` `[ ] B` `[ ] C`
- Одержувач платежу:
- Договірна сторона payment provider:
- Settlement schedule та ledger owner:
- Refund/chargeback owner:
- Власник рішення:
- Дата рішення / дата набуття чинності:
- Evidence IDs (`F` і `L` обов'язкові):
- Роль особи, що погодила:
- Поточний статус: `PENDING`

**Критерій приймання:** погоджена схема руху коштів має визначати payment recipient, договірну сторону, settlement, commission, refund, chargeback, reconciliation та відповідальність за помилки. До цього live payment залишається вимкненим.

### COM-3 — Фіскальна модель і РРО/ПРРО

**Поточний стан у реєстрі:** фіскально `PENDING`; залежить від `COM-1` та `COM-2`.

**Питання:** хто є емітентом чека, хто відповідає за РРО/ПРРО, у який момент формується чек і як обробляються split, partial refund, cancellation та chargeback?

| Варіант | Робоча модель для погодження                                            | Обов'язкова перевірка                                                                       |
| ------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `A`     | Фіскалізує ЛАЙФ як визначений продавець/одержувач платежу               | Юрист і бухгалтерія підтверджують обсяг відповідальності та договір із ПРРО                 |
| `B`     | Кожен vendor фіскалізує власну частину продажу                          | Визначені vendor obligations, receipt ownership, data flow, refund та audit process         |
| `C`     | Використовується договірний fiscal operator у дозволеній законом моделі | Письмова fiscal model і договір визначають accountable entity, control та incident handling |

**Запис рішення**

- Обраний варіант: `[ ] A` `[ ] B` `[ ] C`
- Емітент чека:
- Відповідальний за РРО/ПРРО та compliance:
- Момент фіскалізації:
- Refund/cancellation/chargeback behavior:
- Власник рішення:
- Дата рішення / дата набуття чинності:
- Evidence IDs (`L` і `F` обов'язкові):
- Роль особи, що погодила:
- Поточний статус: `PENDING`

**Критерій приймання:** письмово погоджена fiscal model узгоджена з `COM-1`, `COM-2` та `COM-5`; визначені receipt lifecycle, refund/cancellation та audit requirements. До цього реальні чеки й production РРО/ПРРО не створюються.

### COM-5 — Мультивендорний кошик, split та child orders

**Поточний стан у реєстрі:** технічний намір single payment + split; live contract `PENDING`.

**Питання:** як кошик з товарами різних vendors стає parent order і vendor child orders, хто виконує split, як змінюється статус кожної частини та як працюють partial refund, cancellation, chargeback і customer support?

| Варіант | Робоча модель для погодження                                                               | Обов'язкова перевірка                                                                            |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `A`     | Одна оплата за parent order, сервер створює vendor child orders і виконує внутрішній split | Модель узгоджена з `COM-1`, `COM-2`, `COM-3` та `LOG-1`; визначені partial failure/refund rules  |
| `B`     | Окрема оплата та окремий order на кожного vendor                                           | UX, fees, consent, receipt, refund і support consequences письмово погоджені                     |
| `C`     | Parent order без settlement до підтвердження fulfillment/іншої події                       | Trigger, customer disclosure, timeout, cancellation, funds custody та fiscal treatment погоджені |

**Запис рішення**

- Обраний варіант: `[ ] A` `[ ] B` `[ ] C`
- Parent/child order ownership:
- Split trigger та idempotency key:
- Partial refund/cancellation/chargeback rules:
- Vendor/customer visibility boundaries:
- Власник рішення:
- Дата рішення / дата набуття чинності:
- Evidence IDs (`L`, `F`, `O` і `T` обов'язкові за відповідними частинами):
- Роль особи, що погодила:
- Поточний статус: `PENDING`

**Критерій приймання:** затверджена state model описує parent order, child orders, split, failure/retry, refund, cancellation, chargeback, audit, customer disclosure та vendor isolation. До цього checkout і settlement не реалізуються.

### LOG-1 — Fulfillment і операційна відповідальність

**Поточний стан у реєстрі:** `Без відповіді` / `PENDING`.

**Питання:** хто зберігає, пакує та відправляє товар, хто замовляє перевізника, хто володіє tracking/ТТН, хто обробляє exceptions, returns і SLA?

| Варіант | Робоча модель для погодження                             | Обов'язкова перевірка                                                                      |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `A`     | Кожен vendor зберігає, пакує та відправляє власні товари | Vendor responsibility, packaging, SLA, tracking, returns та exception matrix погоджені     |
| `B`     | Спільний склад/операційний fulfillment ЛАЙФ              | Storage/packing contract, inventory handoff, liability, SLA та carrier ownership погоджені |
| `C`     | Гібридна модель за vendor/category/типом товару          | Для кожного маршруту є RACI, SLA, stock handoff, tracking, returns та incident rules       |

**Запис рішення**

- Обраний варіант: `[ ] A` `[ ] B` `[ ] C`
- Власник stock і пакування:
- Власник carrier account та tracking:
- SLA і винятки:
- Returns/failed delivery owner:
- Власник рішення:
- Дата рішення / дата набуття чинності:
- Evidence IDs (`O` обов'язковий; `L` за договірними межами):
- Роль особи, що погодила:
- Поточний статус: `PENDING`

**Критерій приймання:** погоджена fulfillment model визначає storage, packing, handoff, carrier, tracking, SLA, exception, returns та доступ до shipment data. До цього carrier API, реальні ТТН і production fulfillment не вмикаються.

## 5. Залежності між рішеннями

| Рішення | Залежить від                       | Розблоковує                                       | Заборонено до прийняття            |
| ------- | ---------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `COM-1` | юридичний review                   | `COM-2`, `COM-3`, `COM-5`, customer contracts     | live seller/offer                  |
| `COM-2` | `COM-1`, фінансовий review         | payment architecture, settlement та refund design | payment provider integration       |
| `COM-3` | `COM-1`, `COM-2`                   | fiscalization design                              | receipt/ПРРО production flow       |
| `LOG-1` | operations review                  | shipment/fulfillment design, частково `COM-5`     | carrier API, ТТН, live fulfillment |
| `COM-5` | `COM-1`, `COM-2`, `COM-3`, `LOG-1` | transactional order implementation                | checkout, split, payout/settlement |

Суперечність між рішеннями має бути вирішена до будь-якої реалізації. Наприклад, `COM-5=A` не може бути прийнятий, якщо money flow з `COM-2` не дозволяє внутрішній settlement або fiscal model з `COM-3` не визначає receipt lifecycle.

## 6. Суміжні блокери, які цей пакет не закриває

Прийняття п'яти core decisions саме по собі не означає production readiness. Наступні питання залишаються окремими gate:

| ID / група                | Поточний стан                           | Що потрібно до активації                                                                              |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `COM-4`                   | Факт комісії є, формула не підтверджена | Ставка/формула, база, податки, rounding, момент утримання, ledger і refund policy                     |
| `COM-6`                   | Без відповіді                           | Responsibility matrix, SLA, returns, warranty, complaints і support channel                           |
| `COM-7`                   | Без відповіді                           | Обраний provider, договір, sandbox evidence, limits, webhook та incident policy                       |
| `LOG-2`                   | Без відповіді                           | Carrier account owner, договірна сторона, credential access/rotation і runbook                        |
| `LOG-3`                   | Без відповіді                           | Tariff, payer, subsidy, partial refund та reconciliation matrix                                       |
| `CAT-1`–`CAT-5`           | Без відповіді або відкладено            | Approved categories, vendor documents, content RACI, claim moderation і appeal policy                 |
| Production infrastructure | Заблоковано                             | Письмово дозволений read-only server discovery, backup/restore evidence, release та security sign-off |

## 7. Формат подання відповіді

Для кожного ID відповідальний власник подає окремий запис у такому форматі:

```text
## COM-1 response
- Selected option: A | B | C
- Decision owner:
- Effective date:
- Rationale:
- Legal/financial/operational reviewer:
- Evidence IDs and protected-storage references:
- Conflicts with other decisions:
- Required follow-up:
- Status: PENDING | ACCEPTED | REJECTED | NEEDS CLARIFICATION
```

Не вставляйте в репозиторій текст договору, паспортні дані, банківські реквізити, API keys, секрети або реальні customer/vendor documents.

## 8. Критерії завершення Phase 5

Phase 5 може перейти з `PENDING` до `DECISION-COMPLETE` лише якщо:

- для кожного з `COM-1`, `COM-2`, `COM-3`, `COM-5`, `LOG-1` вибрано один варіант;
- кожен варіант має owner, дату, rationale і відповідний evidence artifact;
- юридичні вимоги мають `L`, фінансові — `F`, операційні — `O`, а технічні `T` не використовуються як заміна зовнішнього approval;
- немає нерозв'язаних суперечностей між п'ятьма рішеннями;
- canonical rows у [open-questions.md](open-questions.md) та [phase4b-approval-register.md](phase4b-approval-register.md) оновлені тим самим набором evidence IDs;
- технічний власник створив окремий ADR для transactional architecture після прийняття зовнішніх рішень;
- production readiness і server discovery проходять окремі gates.

Навіть `DECISION-COMPLETE` означає лише готовність перейти до наступного архітектурного етапу. Це **не** означає `PRODUCTION-READY`.

До виконання всіх критеріїв результат залишається:

> **`NO-GO`: checkout, payment, fiscalization, carrier API, payout, live fulfillment та production deployment вимкнені.**

## 9. Наступні дії

1. Замовник призначає власників для кожного core decision.
2. Власники заповнюють відповідні decision forms і передають захищені evidence artifacts.
3. Юрист, фінанси та операції перевіряють залежності й конфлікти.
4. Технічний власник синхронізує канонічні реєстри; статуси без evidence не змінюються.
5. Окремо отримується письмовий дозвіл на read-only Production Server Discovery.
6. Після закриття рішень готується transactional ADR; до цього provider-specific та production implementation не починається.

## Changelog

- **2026-08-22:** створено Phase 5 Commercial Activation Decision Pack; зафіксовано core decision forms, evidence rules, dependencies, adjacent blockers і `NO-GO` критерій.
