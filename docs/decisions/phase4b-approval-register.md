# Реєстр погоджень Phase 4B

- **Дата огляду:** 2026-08-21
- **Власник:** замовник + власники юридичного, фінансового, операційного та security-контурів
- **Загальний статус:** `PENDING / NOT READY FOR LIVE`

Цей реєстр не містить юридичного висновку. Технічний sandbox-намір або наявність відповідної таблиці в коді не означає, що рішення підписано чи live integration дозволена.

## 1. Правило переходу

Жоден елемент бойової комерції не можна вмикати, доки кожен залежний пункт не має:

1. названого власника;
2. датованого письмового артефакту;
3. перевіреної юридичної, фінансової або операційної межі;
4. узгодженого технічного contract і migration plan;
5. незалежної security/review перевірки;
6. rollback/runbook та evidence у конкретному commit.

До цього дозволені лише локальні contract tests і synthetic fixtures з explicit guards.

## 2. Матриця рішень

| Код                           | Питання                                                      | Поточний статус                           | Власник                                       | Необхідний доказ                                                 | Розпорядження                   |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| `COM-1` / `LGL-1`             | Хто є юридичним продавцем: платформа чи вендор?              | `Юридично не підтверджено`                | Замовник + юрист                              | Підписаний юридичний висновок, оферта, vendor agreement          | Production заблоковано          |
| `COM-2` / `FIN-1`             | Хто одержує оплату і який платіжний потік?                   | `Не підтверджено`                         | Фінансовий керівник + юрист                   | Вибір provider, договір, split/refund/chargeback policy          | Payment заблоковано             |
| `COM-3` / `FSC-1`             | Хто видає чек і як працює ПРРО?                              | `Не підтверджено`                         | Бухгалтерія + юрист                           | Письмова fiscal model і договір із ПРРО                          | Fiscalization заблокована       |
| `COM-4`                       | Яка комісія платформи?                                       | `Факт комісії є, формула не підтверджена` | Фінансовий керівник                           | Ставка/формула, база, податки, момент, refund і ledger policy    | Не рахувати live commission     |
| `COM-5`                       | Як працює мультивендорний кошик і split?                     | `Технічний намір; live contract pending`  | Комерційний + фінансовий + технічний власники | Узгоджена модель, сумісна з COM-1/2/3 і fulfillment              | Live checkout заблоковано       |
| `COM-6`                       | Хто відповідає за повернення, гарантії та support?           | `Без відповіді`                           | Операції + юрист                              | Responsibility matrix, SLA, channel і refund policy              | Продажі заблоковані             |
| `LOG-1`                       | Хто виконує fulfillment першої хвилі?                        | `Без відповіді`                           | Операційний керівник                          | Storage/packing/shipping/SLA/exception policy                    | Carrier integration заблокована |
| `LOG-2`                       | Хто володіє carrier account і API credentials?               | `Без відповіді`                           | Операції + security                           | Договірна сторона, account owner, rotation і access policy       | Production keys заборонені      |
| `LOG-3`                       | Хто платить за доставку і як робиться refund?                | `Без відповіді`                           | Фінанси + операції                            | Tariff, payer, subsidy, partial refund matrix                    | Shipping quote заблокований     |
| `CAT-1`–`CAT-5`               | Категорії, supply, документи, content RACI, claim moderation | `Без відповіді`                           | Комерційний + compliance-власники             | Approved lists, evidence matrix, moderator role та appeal policy | Public claims/sales заблоковані |
| `Production Server Discovery` | Чи є незалежна та дозволена інфраструктура?                  | `Не виконано`                             | Інфраструктурний власник                      | One-time written authorization, read-only report, attestations   | Remote action заблокована       |

Детальний evidence-oriented список питань — у [реєстрі відкритих рішень](open-questions.md).

## 3. Технічний sandbox-дозвіл

У development/test допускається лише:

- синтетичний каталог, vendor/listing/moderation і sealed fixtures;
- server-side customer order/review contract з `ALLOW_SYNTHETIC_*` guards;
- UI draft кошика/checkout без реальної транзакції;
- локальна simulation tracking/settlement лише як тестова модель.

Заборонено називати такі записи оплатою, реальним shipment, фіскальним чеком або виплатою.

## 4. Реєстр security-доказів

| Перевірка              | Стан цього реєстру                                        | Як підтвердити для конкретного commit              |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `pnpm audit`           | `Не перевірено цим записом`                               | Додати команду, дату, commit і повний exit status. |
| CodeQL                 | `Не перенесено автоматично`                               | Додати URL GitHub run та artifact SARIF для SHA.   |
| Trivy                  | `Не перенесено автоматично`                               | Додати image digest, scanner version і report.     |
| Gitleaks               | `Не перенесено автоматично`                               | Додати run/artifact та scope scan.                 |
| PII middleware/tests   | `Локальний код/тести існують; свіжий pass не заявляється` | Запустити targeted test і додати output.           |
| CI Verify              | `Не сертифікує незакомічений diff`                        | Послатися на GitHub run конкретного SHA.           |
| Deployment containment | `Перевіряється локально окремою командою`                 | `node scripts/verify-deployment-containment.mjs`.  |

## 5. Зміна статусу

Змінити `PENDING` на підтверджений статус можна лише після додавання датованого артефакту та перевірки його обсягу. Усна фраза, назва компанії, fixture, старий CI run або кодова гіпотеза не є sign-off.

Пов’язаний документ: [ворота production readiness](production-readiness-gate.md).
