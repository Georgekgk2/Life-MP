# Runbook: локальна розробка

## Призначення та межа

Цей runbook описує лише локальне середовище розробки на Node.js 22, pnpm і OrbStack. `docker-compose.dev.yml` запускає **тільки** PostgreSQL 16 і Redis 7; прикладні сервіси, storefront, CMS, checkout, payment, shipment і production deployment він не запускає.

PostgreSQL та Redis опубліковані виключно на `127.0.0.1`. Це обмеження захищає локальну машину від доступу з мережі, але не створює staging або production-контур і не є сховищем для реальних даних чи секретів.

## Передумови

1. Встановлено Node.js 22.
2. Доступний pnpm (рекомендовано через Corepack).
3. OrbStack запущений, а `docker compose` доступний у терміналі.
4. Робоча копія не містить і не потребує production credentials.

Встановіть залежності з кореня репозиторію:

```bash
corepack enable
pnpm install
```

## Керування локальними data-services

Запуск PostgreSQL і Redis:

```bash
make dev-infra-up
```

Перегляд журналів Compose:

```bash
make dev-infra-logs
```

Зупинка контейнерів зі збереженням локальних named volumes:

```bash
make dev-infra-down
```

Ці цілі використовують `docker-compose.dev.yml`. Застосунки не стартують разом із ними. Коренева команда `make dev` делегує до `pnpm dev`, але зараз `pnpm dev` навмисно завершується помилкою до появи реальних локальних storefront/commerce-сервісів; skeleton не є доступним UI або API.

### Дані та безпека

- Зберігайте лише синтетичні локальні дані.
- Не додайте до Compose production ports, public bind address, зовнішній ingress або application service без окремого реалізованого контракту.
- Не комітьте `.env` зі значеннями, дампи, credentials чи персональні дані.
- Не виконуйте руйнівне видалення volumes як частину звичайної зупинки. Якщо локальні дані треба скинути, зробіть це свідомою окремою дією після перевірки, що дані не потрібні.

## Перевірки якості

Після `pnpm install` запускайте перевірки з кореня монорепозиторію:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Для перевірки форматування без внесення змін:

```bash
pnpm format:check
```

Для локального еквівалента повного CI-набору:

```bash
pnpm run ci
```

Кожна коренева команда делегує до робочих просторів і має завершуватися з помилкою, якщо перевірка будь-якого пакета не пройшла. Ці команди перевіряють кодову основу; вони не запускають staging, production, платежі, checkout або юридичні процедури.

## Межі розробки

Перед додаванням будь-якої commerce-функціональності прочитайте [межі запуску](../decisions/launch-scope.md) та [реєстр відкритих рішень](../decisions/open-questions.md). До письмових рішень за COM-1, COM-2, COM-3, COM-5 та LOG-1 заборонено вмикати checkout, приймання платежів, фіскалізацію, order split або shipment.
