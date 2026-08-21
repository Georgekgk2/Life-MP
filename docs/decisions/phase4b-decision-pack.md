# Пакет рішень Phase 4B

- **Статус:** `PENDING / НЕ Є SIGN-OFF`
- **Дата огляду:** 2026-08-21
- **Власник:** замовник; юридичний, фінансовий, операційний і технічний власники
- **Мета:** зібрати письмові рішення, які потрібні до будь-якої live-комерції.

Це шаблон для відповідей, а не юридична або фінансова порада. Варіанти нижче не є рекомендаціями й не вважаються прийнятими, доки відповідальний власник не додасть датований артефакт.

## 1. Реєстр обов’язкових рішень

| Код             | Питання                                                                     | Власник                          | Обов’язковий evidence                                       | Статус    |
| --------------- | --------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- | --------- |
| `COM-1`         | Хто є юридичним продавцем і стороною договору з покупцем та вендором?       | Замовник + юрист                 | Підписаний юридичний висновок і затверджені договори/оферта | `PENDING` |
| `COM-2`         | Хто одержує кошти, який provider і як працюють split, refund та chargeback? | Фінанси + юрист                  | Договір provider і погоджена схема руху коштів              | `PENDING` |
| `COM-3`         | Хто є емітентом чека та як працює ПРРО?                                     | Бухгалтерія + юрист              | Письмова fiscal model і договір із ПРРО                     | `PENDING` |
| `COM-4`         | Як обчислюються комісія, податки, округлення та повернення?                 | Фінанси                          | Формула, ledger, приклади й refund policy                   | `PENDING` |
| `COM-5`         | Як мультивендорний кошик розділяється на виконувані child orders?           | Комерційний + технічний власники | Погоджена модель, яка узгоджена з COM-1/2/3 і fulfillment   | `PENDING` |
| `COM-6`         | Хто відповідає за повернення, гарантію, рекламації та support?              | Операції + юрист                 | Responsibility matrix, SLA та політика                      | `PENDING` |
| `LOG-1`         | Хто пакує, відправляє та обробляє винятки fulfillment?                      | Операції                         | Погоджена модель fulfillment і SLA                          | `PENDING` |
| `LOG-2`         | Хто володіє carrier account та API credentials?                             | Операції + security              | Договір, owner, доступи, rotation і runbook                 | `PENDING` |
| `LOG-3`         | Хто сплачує доставку та як рахуються часткові refunds?                      | Фінанси + операції               | Тарифи, payer matrix і refund scenarios                     | `PENDING` |
| `CAT-1`–`CAT-5` | Які категорії, документи, claims і reviewer rules дозволені?                | Комерційний + compliance         | Approved lists, RACI, evidence matrix і appeal policy       | `PENDING` |

## 2. Питання для юриста

- Яка юридична модель платформи і хто є стороною кожного договору?
- Які умови оферти, договору приєднання, privacy notice та consumer policy потрібні?
- Хто відповідає за product information, claims, returns, warranty та complaints?
- Чи потрібні окремі вимоги до категорій food, cosmetics, medical або psychological services?
- Які документи є достатнім evidence, хто їх перевіряє та як фіксується expiry/withdrawal?

**Результат:** датований письмовий висновок і перелік затверджених шаблонів. Усна відповідь не відкриває gate.

## 3. Питання для фінансів і бухгалтерії

- Хто одержує покупецькі кошти і в який момент виникає право на комісію?
- Які provider, settlement, refund, chargeback та reconciliation flows дозволені договором?
- Хто емітує чек, на яку суму і в якій системі ПРРО?
- Які документи та ledger fields потрібні для vendor settlement?
- Як обробляються округлення, часткові refunds, скасування та невдалий settlement?

**Результат:** погоджена схема руху коштів, fiscal model, ledger contract і signed owner approval.

## 4. Питання для операцій і логістики

- Хто зберігає, пакує та передає товар перевізнику?
- Чий carrier account використовується і хто має право на API credentials?
- Які статуси доставки є authoritative, а які лише informational?
- Хто оплачує доставку, повернення та винятки?
- Які SLA, escalation, support і business continuity процедури потрібні?

До погодження цих питань не створювати реальні ЕН/ТТН, не підключати бойовий API та не використовувати tracking як тригер виплати.

## 5. Технічний sign-off checklist

| Перевірка                                     | Статус                        | Необхідний доказ                                 |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------ |
| Capability registry default-deny              | `PENDING FRESH VERIFICATION`  | Commit, тест і containment output                |
| Tenant/object authorization                   | `PENDING FRESH VERIFICATION`  | HTTP/E2E evidence для allow/deny paths           |
| Idempotency та audit для майбутніх webhooks   | `BLOCKED UNTIL COM-2/3/LOG-1` | Прийнятий provider/fulfillment contract          |
| Backup/restore та production server discovery | `BLOCKED`                     | Авторизований read-only report і restore drill   |
| Immutable image promotion                     | `BLOCKED`                     | GitHub rules, registry digest і release evidence |

## 6. Таблиця підписання

| Роль                | Відповідальна особа | Обсяг рішення                               | Дата | Статус / evidence            |
| ------------------- | ------------------- | ------------------------------------------- | ---- | ---------------------------- |
| Юридичний власник   | `[Призначити]`      | `COM-1`, `COM-6`, claims, privacy           | `—`  | `PENDING`                    |
| Фінансовий власник  | `[Призначити]`      | `COM-2`, `COM-3`, `COM-4`                   | `—`  | `PENDING`                    |
| Операційний власник | `[Призначити]`      | `LOG-1`, `LOG-2`, `LOG-3`                   | `—`  | `PENDING`                    |
| Технічний власник   | `[Призначити]`      | sandbox implementation і technical evidence | `—`  | `PENDING INDEPENDENT REVIEW` |
| Security-власник    | `[Призначити]`      | secrets, access, CI, containment            | `—`  | `PENDING`                    |

Пов’язаний канонічний реєстр: [Phase 4B approval register](phase4b-approval-register.md). Заповнення цього документа без артефакту не змінює readiness.
