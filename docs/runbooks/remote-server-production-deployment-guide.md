# Інструкція віддаленого production-розгортання «ЛАЙФ»

- **Статус:** `ЗАБЛОКОВАНО / НЕОПЕРАЦІЙНИЙ ДОКУМЕНТ`
- **Дата огляду:** 2026-08-21
- **Власник:** інфраструктурний власник + security-власник
- **Середовище:** жодне; remote action не дозволена

> **НЕ ВИКОНУЙТЕ ЦЕЙ ДОКУМЕНТ ЯК RUNBOOK.** Він не містить дозволених команд, не створює сервер, не підключається по SSH і не є планом із секретами.

## 1. Причина блокування

Production deployment неможливий до завершення всіх обов’язкових gate:

- юридична модель продавця та оферта;
- одержувач коштів, payment provider, split/refund і chargeback policy;
- ПРРО та фіскальна модель;
- fulfillment, carrier account, SLA і повернення;
- catalog/category/claim compliance та vendor onboarding;
- customer auth, privacy, retention і support policy;
- незалежний server discovery з письмовим дозволом;
- backup/restore drill, capacity, network, TLS, monitoring і incident response;
- immutable image registry, digest promotion, rollback і release sign-off;
- незалежний security та operational review.

Джерела: [production readiness gate](../decisions/production-readiness-gate.md), [Phase 4B approval register](../decisions/phase4b-approval-register.md), [server discovery](production-server-discovery.md), [ADR 0003](../adr/0003-release-and-recovery.md) і [ADR 0004](../adr/0004-production-isolation.md).

## 2. Заборонені дії

До письмового дозволу та закриття gate заборонено:

- виконувати SSH, provisioning, firewall, DNS або TLS зміни на віддаленому хості;
- копіювати `.env`, credentials, private keys, backup або customer data;
- запускати production Compose, migration, seed або remote Docker commands;
- створювати бойові payment, fiscal або carrier credentials;
- використовувати локальний образ як production image без immutable tag і digest;
- називати локальний build, `deploy/*` файл або цей документ доказом наявності сервера.

## 3. Дозволений підготовчий контур

Локально можна виконувати лише non-destructive перевірки:

- перевірку Compose/YAML і Dockerfile syntax;
- build з synthetic/no-secret inputs;
- `node scripts/verify-deployment-containment.mjs`;
- документаційний, dependency, secret і container-scan контур;
- review release manifest без завантаження на remote host.

Кожен результат має містити commit/worktree, дату, команду, exit status і чітку межу твердження.

## 3A. Ціль доменної заміни (неопераційний acceptance checklist)

До окремого owner approval та розблокування production gate цільовим доменом вважається лише запропонований `life-mp.pp.ua`.

- Запропонований canonical host: `life-mp.pp.ua`.
- Політика для `www.life-mp.pp.ua` не обрана; redirect або окремий host не вмикати без письмового рішення.
- `life.jorvis.app` не видаляти й не вважати заміненим, доки не доведені DNS, TLS, Caddy routing, CORS, canonical/PWA URL та public acceptance для нового домену.
- Acceptance evidence має містити DNS records, TLS certificate SAN, rendered Caddy configuration, CORS/API probes, storefront/PWA checks, feature smoke tests і rollback path.
- Цей блок не є дозволом на DNS, TLS, SSH, remote Docker або production Compose mutation.

## 4. Умови розблокування документа

Цей файл можна перетворити на окремий операційний runbook лише через новий review/change pack, який містить:

1. авторизований read-only server-discovery report;
2. підтвердженого infrastructure owner і operator;
3. sanitized topology, ports, firewall, DNS/TLS та access model;
4. backup/restore та recovery evidence;
5. immutable image/digest promotion procedure;
6. секретну політику без зберігання ключів у Git або документації;
7. rollback, incident, migration і maintenance procedures;
8. окремий production sign-off від уповноважених власників.

Навіть після цього operational runbook не може обходити legal, financial, fiscal, fulfillment або security gates.

## 5. Межа тверджень

Наявність цього файлу, `deploy/docker-compose.prod.yml`, Dockerfile або локального build не доводить:

- що production-сервер існує;
- що DNS/TLS/registry/backups налаштовані;
- що image дозволено promotion;
- що commerce capability юридично або фінансово дозволена;
- що застосунок готовий до live запуску.
