# Д чернетка Phase 5: Модель трекінгу афіліатів та атрибуції рефералів (Non-Transactional Draft)

## Статус

Це **архітектурна чернетка (Draft)** для майбутньої Phase 5. Вона описує лише некомерційний шар відстеження переходів (traffic tracking & attribution) і **НЕ ВПРАВАДЖУЄ** грошові нарахування, баланси, виплати чи багаторівневі винагороди до підписання юридичних документів у Phase 4B.

---

## 1. Доменні сутності трекінгу

```text
AffiliateLink (Посилання афіліата)
  ├── id: text
  ├── affiliate_id: text
  ├── slug_code: text (унікальний реферальний код)
  └── active: boolean

AffiliateClick (Подія переходу)
  ├── id: text
  ├── link_id: text
  ├── anonymized_ip_hash: text (SHA-256 від IP без збереження у чистому вигляді)
  ├── user_agent_hash: text
  ├── landing_url: text
  └── clicked_at: timestamptz

ReferralAttributionCandidate (Кандидат на атрибуцію замовлення)
  ├── id: text
  ├── parent_order_id: text
  ├── click_id: text
  ├── attribution_window_days: integer (стандартно 30 днів)
  ├── status: clicked | attributed | pending_window | expired | revoked
  └── created_at: timestamptz
```

---

## 2. Життєвий цикл атрибуції (Attribution State Machine)

```text
[clicked] -> [attributed] -> [pending_window] -> [expired / revoked]
```

1. **`clicked`**: Покупець переходить за посиланням `?ref=CODE`. Створюється запис `AffiliateClick` з анонімізованим IP-хешем та прикрими хешами браузера.
2. **`attributed`**: Якщо протягом 30 днів покупець робить замовлення `ParentOrder`, замовлення зв'язується з `AffiliateClick`.
3. **`pending_window`**: Очікування завершення 14-денного терміну повернення товару (згідно із Законом України «Про захист прав споживачів»).
4. **`expired / revoked`**: Якщо замовлення повернуто, скасовано або виявлено self-referral (самопокупку афіліатом), атрибуція анулюється (`revoked`).

---

## 3. Суворі заборони у коді (Prohibited Capabilities)

До проходження юридично-фінансового чеклиста Phase 4B у коді **СТРОГО ЗАБОРОНЕНО**:

- `commission_accrual` — автоматичне нарахування грошових відсотків;
- `virtual_balance` — створення внутрішніх гаманців чи накопичувальних балансів;
- `payouts_and_withdrawals` — генерація виплат або запитів на виведення коштів;
- `referral_tiers` — реалізація 2-го чи наступних рівнів реферальних виплат (MLM);
- `club_card_payouts` — прив'язка клубних карток до фінансових виплат.

---

## 4. Конфіденційність та антифрод (Privacy & Anti-Fraud)

1. **GDPR / Privacy:** Жодні особисті дані покупця (email, телефон, картки) не прив'язуються до `AffiliateClick`. Зберігаються лише анонімізовані хеші.
2. **Anti-Fraud:** Автоматичне блокування атрибуції при збігу анонімізованого хешу покупця та афіліата (self-referral detection).
