# Межі запуску та безпечні відкладення

- **Дата огляду:** 2026-08-22
- **Власник:** замовник + технічний власник Life-MP
- **Канонічний статус:** локальна розробка та контрольований sandbox; комерційний production — **заблокований**.

Цей документ визначає capability scope. Він не є юридичним погодженням, договором, доказом production-інфраструктури або дозволом використовувати бойові ключі. Зовнішні рішення зберігаються в [реєстрі відкритих рішень](open-questions.md).

## Попереднє уточнення fulfillment від 2026-08-22

Evidence ID: `P-2026-08-22`, також зафіксоване в [реєстрі відкритих рішень](open-questions.md).

Замовник описав кандидатну гібридну модель: товари ЛАЙФ і товари постачальників; власний склад/запас обробляє та пакує ЛАЙФ; supplier-side запас обробляє та пакує постачальник; ЛАЙФ контролює і розподіляє supplier-side виконання; власні склади та холодильники є майбутнім етапом.

Це не змінює дозволений scope: production checkout, live payment, fiscalization, carrier API, cold-chain fulfillment і production deployment залишаються заблокованими до COM/LOG evidence. Свіже м'ясо є лише прикладом потенційної категорії, а не дозволеною launch category.

Нове уточнення `P-followup-2026-08-22` прямо виключає свіже м'ясо з першої хвилі. Це звужує launch category, але не затверджує інші food/temperature categories, не відкриває checkout і не замінює `CAT-1`/`CAT-3` або майбутній cold-chain evidence.

Кандидатний scope для обговорення наведено у [швидкій матриці першої хвилі](customer-questionnaire.md). До письмового прийняття та закриття залежних gate цей scope не є дозволеним production capability.

## 1. Статуси capability

- **`implemented`** — код або маршрут існує.
- **`fixture-only`** — працює на локальних демонстраційних даних.
- **`synthetic-local`** — працює лише з явним development/test guard.
- **`planned`** — описано як майбутня робота.
- **`blocked`** — реалізацію або запуск не можна продовжувати до рішення/gate.

`implemented` ніколи не означає `production-ready`.

## 2. Дозволений локальний scope

| Можливість                                                                | Стан                         | Фактична межа                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Вітрина, сторінки каталогу, люди, історії, події, благодійність, партнери | `fixture-only`               | UI-прототип на локальних fixtures; редакційний runtime не підключений.                                                        |
| Server-side catalog reader                                                | `implemented`                | За замовчуванням fixtures; Medusa source вмикається окремо через env.                                                         |
| Medusa marketplace module                                                 | `implemented` для local/test | Vendor, member, profile, listing, moderation, verification, documents, claims та audit records.                               |
| Публічний синтетичний каталог                                             | `synthetic-local`            | Лише `NODE_ENV=development` або `NODE_ENV=test` і `ALLOW_SYNTHETIC_CATALOG=true`; production fallback — порожній/недоступний. |
| Vendor authorization і tenant isolation                                   | `implemented` / local tests  | Actor/auth context є джерелом tenant; чужі записи не повертаються як власні. Потрібна незалежна перевірка перед merge.        |
| Модерація listing, claim, verification і review                           | `implemented` для sandbox    | `approved` є умовою публічності; це не юридична, медична чи державна сертифікація.                                            |
| Customer orders/reviews                                                   | `synthetic-local`            | Customer-scoped server contracts і test fixtures; identity/retention для production не погоджені.                             |
| Кошик і checkout UI                                                       | `fixture-only` / draft       | UI може моделювати введення й розрахунки, але фінальна дія не є real order/payment write.                                     |
| Order split, shipment, tracking, escrow, settlement типи                  | `synthetic-local` / контракт | Допускаються лише для тестів і демонстрації меж; не створюють гроші, payout, реальну ЕН або зовнішній webhook.                |
| Пошук                                                                     | `fixture-only`               | Українська нормалізація та in-memory adapter; PostgreSQL FTS/Meilisearch index — окремий planned контур.                      |
| PWA shell                                                                 | `implemented` локально       | Manifest/service worker перевіряються як UI capability; це не операційний SLA.                                                |

## 3. Заблокований production scope

Поки немає всіх потрібних письмових рішень і незалежних доказів, заборонено:

1. підключати бойовий еквайринг, платіжні webhook-и або повернення;
2. вмикати ПРРО/фіскалізацію або заявляти про виданий чек;
3. підключати production Nova Poshta API, створювати реальні ЕН/ТТН або обіцяти fulfillment SLA;
4. виконувати vendor payout, commission settlement або affiliate payout;
5. проводити production vendor onboarding чи публікувати regulated/medical claims;
6. запускати booking, paid services, ticketing, COD або міжнародну доставку;
7. використовувати Payload CMS як authority для каталогу;
8. виконувати remote provisioning, production deployment або promotion.

## 4. Фундаментальні блокери

| Код                           | Питання                                                  | Обов’язковий доказ до live                                                             |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `COM-1`                       | Юридичний продавець і договірна модель                   | Підписаний юридичний висновок, оферта та договір із вендорами.                         |
| `COM-2`                       | Одержувач платежу та платіжний потік                     | Письмово погоджений фінансовий потік і договір з обраним еквайром.                     |
| `COM-3`                       | Хто видає чек і як працює ПРРО                           | Погоджена фіскальна схема та робочий договір із ПРРО-провайдером.                      |
| `COM-4`                       | Комісія платформи                                        | Письмова ставка/формула, база, податки, момент утримання та refund-правила.            |
| `COM-5`                       | Мультивендорний кошик і split                            | Технічна модель не замінює legal/fiscal/fulfillment sign-off.                          |
| `COM-6`                       | Повернення, гарантії та підтримка                        | Затверджена відповідальність, SLA, канал звернень і refund policy.                     |
| `LOG-1`                       | Fulfillment першої хвилі                                 | Письмова операційна модель, власники етапів, SLA і carrier account.                    |
| `LOG-2`/`LOG-3`               | Договори та вартість доставки                            | Погоджена політика тарифів, платника, refund і account ownership.                      |
| `CAT-1`–`CAT-5`               | Категорії, supply, документи, контент і moderation owner | Затверджені списки, RACI та evidence policy до публікації.                             |
| `Production Server Discovery` | Незалежна інфраструктура                                 | Авторизований read-only discovery, sanitized report і окремий infrastructure sign-off. |

Детальні статуси, власники та критерії приймання — у [реєстрі відкритих рішень](open-questions.md).

## 5. Заборонені припущення

- Синтетичний order не є продажем, оплатою чи боргом перед вендором.
- Поле `verified`, `approved` або badge у fixture не є юридичною/медичною сертифікацією.
- Наявність Dockerfile, production compose або deployment policy не доводить наявність сервера чи дозволу на запуск.
- Успішний локальний тест не сертифікує непушений diff, GitHub security scans або зовнішні інтеграції.
