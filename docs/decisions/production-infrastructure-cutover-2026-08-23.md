# Evidence: публічний інфраструктурний cutover Life-MP

- **Дата evidence:** 2026-08-23
- **Остання пряма перевірка:** 2026-08-23T19:05:51Z
- **Власник:** інфраструктурний власник + gatekeeper
- **Статус:** `INFRASTRUCTURE PATH VERIFIED; COMMERCIAL PRODUCTION NOT READY`
- **Межа:** цей запис фіксує зовнішній DNS/TLS/HTTP-контур і не є дозволом на commercial production, payment або fulfillment.

> Цей документ містить sanitized evidence. Токени, credentials, приватні IP-адреси, customer data та локальні секретні файли тут не зберігаються.

## 1. Поточна публічна схема

```text
Browser HTTPS
      │
      ▼
Cloudflare Edge / Universal SSL
      │
      ▼
Cloudflare Tunnel
      │
      ▼
jorvis-proxy:8080 (HTTP inside the tunnel)
      ├─ life-mp.pp.ua       → storefront
      ├─ www.life-mp.pp.ua   → Caddy 301 to apex
      └─ /api/*              → commerce
```

Поточний public path використовує Cloudflare Tunnel. Direct-origin HTTPS не є частиною основного public path.

## 2. Прямі public probes

Перевірка виконана без вимкнення перевірки TLS-сертифіката:

| Перевірка | Результат | Межа твердження |
| --- | --- | --- |
| `dig +short life-mp.pp.ua A` | Cloudflare Edge A-записи | Apex більше не порожній і не вказує напряму на origin у public DNS. |
| `dig +short life-mp.pp.ua AAAA` | Cloudflare Edge AAAA-записи | Public IPv6 також проходить через Cloudflare Edge. |
| `dig +short www.life-mp.pp.ua NS` | порожній результат | Стара `www` child-NS delegation на parking DNS відсутня. |
| `curl https://life-mp.pp.ua/` | HTTP `200` | Apex доступний через public HTTPS. |
| `curl https://www.life-mp.pp.ua/` | HTTP `301` на `https://life-mp.pp.ua/` | `www` redirect працює. |
| `curl https://life-mp.pp.ua/api/health` | HTTP `200` | Public API health endpoint відповідає. |
| `openssl s_client` для apex і `www` | валідний Edge certificate | SAN містить `life-mp.pp.ua` та `*.life-mp.pp.ua`. |

Cloudflare proxy може повертати Edge A-записи замість початкового CNAME через flattening; це не є ознакою відновлення parking delegation.

## 3. Історичний невдалий шлях

Попередній direct-origin cutover повертав Cloudflare `522`, після чого DNS відкотили. Також direct-origin TLS раніше завершувався `tlsv1 alert internal error`.

Ці факти не блокують поточний Tunnel public path, але означають:

- direct-origin HTTPS не можна вважати перевіреним fallback-маршрутом;
- GCP inbound 80/443 не потрібно відкривати, якщо Tunnel залишається основним ingress;
- fallback на direct origin потребує окремого TLS та network gate.

## 4. Що ще не підтверджено

Public probes не доводять:

- restart/recreation durability Cloudflare Tunnel;
- persistence credentials після recreation контейнера;
- підтримуваність поточної версії `cloudflared`;
- certificate/tunnel renewal automation;
- зовнішній monitoring та alerting;
- commercial readiness, payment, fiscalization, shipping або vendor operations.

## 5. Наступні infrastructure actions

1. Зберегти sanitized DNS/Tunnel configuration та rollback instructions.
2. Провести контрольований connector restart у maintenance window.
3. Перевірити public apex, `www` і `/api/health` після restart.
4. Оновити `cloudflared` до підтримуваної версії та зафіксувати image digest.
5. Перевірити, що credentials та routes переживають recreation.
6. Додати зовнішні probes для apex, redirect, API health, 5xx і Cloudflare 522/525/526.

Жоден пункт вище не відкриває commercial production gate без окремого погодження.

## 6. Rollback evidence

Операційні DNS backup/rollback artifacts зберігалися поза канонічним репозиторієм і не містяться в цьому документі. Їхні імена для provenance:

- `life-mp-dns-backup-20260823T175011Z.json`
- `life-mp-dns-failed-cutover-20260823T175544Z.json`

Файли повинні залишатися sanitized; токени та credentials не можна додавати до Git або документації.

## 7. Readiness boundary

- **Public DNS/TLS/HTTP ingress:** `VERIFIED` на дату прямої перевірки.
- **Tunnel durability:** `NOT VERIFIED`.
- **Direct-origin fallback:** `NOT VERIFIED / FAILED HISTORICAL PATH`.
- **Commercial production:** `BLOCKED / NOT READY`.
