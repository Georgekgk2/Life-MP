# Phase 4D — Кабінет покупця та довіра

- **Статус:** план прийнято до виконання лише для sandbox/development; production activation заблокована.
- **Дата:** 2026-08-21
- **Власник:** технічний власник + product owner
- **Пов’язані документи:** [ADR 0007](../adr/0007-customer-order-and-review-source-of-truth.md), [межі запуску](launch-scope.md), [production gate](production-readiness-gate.md)

## Мета

Перевести історію замовлень і відгуки з browser-only prototype у контрольований server-side контур для тестів. Фаза не вмикає бойові платежі, фіскалізацію, реальну Нову Пошту, реальні ЕН/ТТН, повернення, виплати або production deployment.

## У межах фази

- customer-scoped read model замовлень;
- synthetic order creation лише для `NODE_ENV=development|test` з explicit guard;
- immutable order lines;
- synthetic shipment/tracking timeline без carrier API;
- вкладка «Мої замовлення» у профілі;
- eligibility відгуку лише на основі verified-purchase server rule;
- server-side submission відгуку зі статусом `pending`;
- moderation queue для `compliance_reviewer` та `platform_admin`;
- audit trail рішень модератора;
- public visibility лише для схвалених відгуків дозволеної provenance;
- integration, migration, security та Playwright evidence для локального контуру.

## Поза межами фази

- live acquiring, payment webhook-и та escrow;
- ПРРО/фіскалізація;
- production Nova Poshta API та реальні ЕН/ТТН;
- vendor settlements та payout;
- refunds, returns, warranty та customer support workflow;
- COD;
- affiliate attribution;
- PromoEngine, промокоди та commercial discounts;
- production deployment;
- остаточний customer auth, retention, erasure та account recovery policy.

## Незмінні межі

1. `localStorage` може зберігати лише cart draft, UI preferences та явні fixture data. Він не є authoritative source для orders, identity або reviews.
2. `customer_id`, `vendor_id`, `verifiedPurchase`, moderation status та financial fields не приймаються від клієнта як довірені значення.
3. Synthetic endpoints дозволені лише в development/test і ніколи не роблять мовчазний fallback у production.
4. Customer не може змінювати tracking status.
5. Новий review завжди створюється як `pending`; public mapper показує лише `approved` записи з дозволеною provenance.
6. Номер замовлення не є доказом доступу до замовлення.
7. Sandbox UI не може стверджувати, що проведено реальну оплату, створено справжню ТТН або виконано vendor payout.
8. Помилка auth, storage або provider не повинна деградувати до fixture publication чи неавторизованого доступу.

## Контракти рішень

### `AUTH-1` — Ідентичність покупця

До production customer flows потрібно визначити auth identity, customer ownership, session lifecycle, anonymous behavior, privacy retention та account recovery. У цій фазі customer-scoped API використовує auth context, а synthetic tests можуть інжектувати identity лише через test boundary.

### `REV-1` — Політика відгуків

Review дозволений лише для order line, який належить поточному customer та досяг дозволеного fulfillment status. Backend визначає `verifiedPurchase`; один order line має не більше одного активного review. Reject decision потребує rationale та audit event.

### `PRIV-1` — Дані покупця

Order DTO мінімізує PII і не повертає vendor payout, IBAN, payment transaction id або чужі shipment records. Логи проходять PII masking. Retention/erasure policy залишається окремим юридичним рішенням.

### `PROMO-1` — Промоакції (відкладено)

PromoEngine не входить до Phase 4D. До його реалізації потрібно письмово погодити funding source, eligibility, stacking, rounding, shipping, commission, refund, usage limits, anti-fraud та fiscal treatment. `KRAFT10` не є затвердженою production campaign.

## Decision packet для комерційного контуру

Цей короткий пакет призначений для письмового погодження замовником і не є технічним або юридичним рішенням. До отримання однозначної відповіді всі п'ять пунктів залишаються заблокованими; Phase 4D працює лише в sandbox/local/test.

| ID | Потрібна відповідь | Критерій приймання |
| --- | --- | --- |
| **COM-1** | Хто є юридичним продавцем товару: ЛАЙФ чи кожен vendor окремо? Хто є стороною оферти та відповідає за повернення? | Погоджена юридична модель, сторона оферти та відповідальність за повернення зафіксовані письмово. |
| **COM-2** | Хто приймає оплату від покупця: ЛАЙФ чи vendors? Яка сторона укладає договір з еквайром і як проводяться розрахунки з vendors? | Визначені одержувач платежу, договірна сторона еквайрингу та правила розрахунків; live integration до цього не вмикається. |
| **COM-3** | Хто видає фіскальний чек і несе відповідальність за РРО/ПРРО? | Погоджена фіскальна схема із відповідальною стороною; реальні чеки та production РРО/ПРРО до цього не створюються. |
| **COM-5** | Як обробляється кошик із товарами різних vendors: одна оплата з parent order і child orders чи окремі оплати? Хто виконує split та refunds? | Затверджений сценарій order splitting, payment, refund і відповідальності; Phase 4D не виконує commercial settlement. |
| **LOG-1** | Яка модель fulfillment: кожен vendor відправляє сам чи використовується спільний склад? Хто відповідає за пакування, перевізника, tracking і SLA? | Письмово визначені модель зберігання, пакування, відправлення, tracking, SLA та відповідальні сторони; carrier API залишається вимкненим. |

Відповідь має містити один узгоджений варіант по кожному ID, відповідального за рішення та дату погодження. Усні припущення, fixture data або локальні тести не змінюють статус блокера.

## Критерій готовності фази

Phase 4D можна перевіряти лише як sandbox/development capability. Успішна локальна перевірка не знімає `COM-1`, `COM-2`, `COM-3`, `COM-4`, `COM-5`, `LOG-1`, `LOG-2`, `LOG-3` або production infrastructure gates.
