# ADR 0007 — Customer Order та Review Source of Truth

- **Статус:** Прийнято для sandbox/development implementation; production activation заблокована.
- **Дата:** 2026-08-21
- **Власник:** Life-MP technical lead

## Контекст

Storefront prototype зберігає customer profile, cart, sandbox orders та reviews у browser `localStorage`. Це придатно для UX-прототипу, але не забезпечує customer isolation, auditability, verified purchase або захист від зміни даних клієнтом. У commerce module вже існують базові `ParentOrder` та `VendorChildOrder`, але немає повного order-line read model, customer-scoped API чи review moderation domain.

## Рішення

1. Commerce module є authoritative source для customer orders, order lines, shipment events та product reviews.
2. Customer ownership визначається лише authenticated auth context; `customer_id` з body/query не приймається.
3. Storefront `localStorage` залишається лише draft/fixture storage і не використовується для фінальних orders, reviews або verified-purchase state.
4. Synthetic order creation та synthetic tracking дозволені лише в development/test з explicit environment guards.
5. Review submission створює `pending` record. Public mapper повертає лише `approved` reviews.
6. Moderation decisions виконуються staff roles, перевіряються на vendor conflict та записуються в audit trail.
7. Payment, payout, fiscalization та real carrier integration не є частиною цього ADR.

## Наслідки

### Позитивні

- customer/vendor isolation можна перевірити на server boundary;
- review eligibility походить із order line, а не з client-provided boolean;
- synthetic UI не видається за production commerce;
- майбутні payment/shipping/promotion інтеграції отримують стабільні доменні межі.

### Негативні

- потрібні нові migrations, API contracts та integration tests;
- поточні browser engines не можуть залишатися authoritative у Medusa mode;
- customer auth contract треба завершити перед live account flows;
- існуючі order status enums потрібно узгодити до публікації DTO.

## Відхилені альтернативи

### Продовжити `localStorage` як source of truth

Відхилено: клієнт може змінити orders, tracking, customer identity та review status.

### Додати лише UI-вкладки

Відхилено: UI без server workflow створює false readiness і не забезпечує moderation або authorization.

### Додати PromoEngine одночасно

Відхилено: client-side cart totals не є фінансовим authority, а funding/commission/refund/rounding policy не погоджені.
