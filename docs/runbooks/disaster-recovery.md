# Інструкція аварійного відновлення та резервного копіювання бази даних (Disaster Recovery Runbook)

- **Дата розробки:** 2026-09-11
- **Власник інструкції:** технічний власник Life-MP + інфраструктурний власник
- **Статус:** `РОБОЧИЙ ПОСІБНИК / СИНТЕТИЧНО ВЕРИФІКОВАНО`
- **Нормативна база:** [ADR 0003](../adr/0003-release-and-recovery.md) (Релізи та відновлення), [ADR 0004](../adr/0004-production-isolation.md) (Ізоляція від Jorvis), [ADR 0013](../adr/0013-immutable-container-pipeline-and-promotion.md) (Незмінний конвеєр).

---

## 1. Межі та базові інваріанти (Scope & Invariants)

1. **Розмежування релізу та аварії (ADR 0003):**
   - **Штатний релізний відкат (Release Rollback):** це повторне розгортання попереднього відомо справного контейнера за незмінним sha256-дайджестом (`docker compose up -d --no-build`). Він **не відновлює** базу даних і не перезаписує дані покупців.
   - **Аварійне відновлення бази (Disaster Recovery):** це надзвичайна процедура, яка застосовується **виключно у разі доведеного фізичного пошкодження або втрати даних** PostgreSQL.
   - Заборонено автоматичне відновлення бази даних у CI/CD або як частина рутинного релізу.
2. **Конфіденційність та ізоляція (ADR 0004):**
   - Заборонено копіювати бойові дампи бази даних на локальні робочі станції розробників, у репозиторій Git або передавати їх у чати AI-асистентів.
   - Усі локальні тести та навчання (drills) проводяться виключно на синтетичних фікстурах (`ALLOW_SYNTHETIC_ORDERS="true"`).
3. **Права доступу на сервері (Security Baseline):**
   - Каталоги резервних копій: режим `0700` (`drwx------`), власник `medgemma-user`.
   - Файли дампів та контрольних сум: режим `0600` (`-rw-------`), читання та запис лише для власника.

---

## 2. Цільові показники надійності (RPO та RTO)

> **Статус показників:** Зазначені нижче RPO та RTO є **цільовими проєктними орієнтирами (Provisional Target Objectives)**, а не емпірично доведеними або сертифікованими характеристиками SLA. Вони підлягають регулярному вимірюванню під час навчальних відновлень.

| Показник                           | Цільовий орієнтир                                                                      | Визначення та контекст                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RPO (Recovery Point Objective)** | **<= 24 годин** (плановий щоденний бекап) / **до точки знімка** (pre-release snapshot) | Максимально допустима втрата даних: у разі аварії дані повертаються до точки останнього валідного знімка. Перед релізом створюється snapshot, але це не гарантує нульової втрати транзакцій між релізом і моментом збою. |
| **RTO (Recovery Time Objective)**  | **<= 15 хвилин**                                                                       | Цільовий час від моменту оголошення інциденту до відновлення працездатності сервісу.                                                                                                                                     |

---

## 3. Регламент створення та ротації резервних копій

### 3.1. Створення знімка бази (Backup Procedure)

Перед будь-яким втручанням або щоденно за розкладом cron виконується процедура:

```bash
# 1. Формування мітки часу та директорії
BACKUP_ID="rel-$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/var/backups/life-mp/${BACKUP_ID}"
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# 2. Створення стисненого дампу PostgreSQL без блокування таблиць із суворим umask
(umask 077 && touch "${BACKUP_DIR}/database.dump" && chmod 600 "${BACKUP_DIR}/database.dump")
docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${BACKUP_DIR}/database.dump"
# 3. Розрахунок криптографічної контрольної суми
(cd "${BACKUP_DIR}" && sha256sum database.dump > CHECKSUMS.sha256)
chmod 600 "${BACKUP_DIR}/CHECKSUMS.sha256"

# 4. Створення маркерів завершення
touch "${BACKUP_DIR}/BACKUP_COMPLETE"
touch "${BACKUP_DIR}/BACKUP_COMPLETE_WITH_DB"
```

### 3.2. Критерії придатності резервної копії (Acceptance Criteria)

Резервна копія вважається валідною лише за одночасного виконання таких умов:

1. Файл `database.dump` існує, має розмір > 0 байт і успішно проходить перевірку заголовка `pg_restore -l`;
2. Контрольна сума `sha256sum -c CHECKSUMS.sha256` повертає статус `OK`;
3. Наявні файли-маркери `BACKUP_COMPLETE` та `BACKUP_COMPLETE_WITH_DB`;
4. Права доступу суворо відповідають `0700` (каталог) та `0600` (файли).

### 3.3. Політика ротації локальних копій (Retention Policy)

На хості зберігаються:

- Усі пре-релізні знімки за останні **5 релізів**;
- Щоденні автоматичні бекапи за останні **7 днів**;
- Копії, старіші за 7 днів, автоматично ротуються та очищуються лише за наявності успішної реплікації у віддалене сховище.

---

## 4. Вимоги до віддаленого сховища (Offsite Storage Requirements)

Для захисту від повної втрати сервера (катастрофа ЦОД або видалення VM):

1. **Шифрування до відправки (Client-Side Encryption):**
   Дамп бази шифрується на хості асиметричним ключем (наприклад, за допомогою `age` або `gpg --encrypt`) перед завантаженням у мережу. Відкритий ключ для шифрування зберігається на хості, приватний ключ для розшифрування — суворо офлайн у сховищі ключів власника.
2. **Ізольований бакет (Dedicated Object Storage):**
   Використовується виділений бакет (GCS / Cloudflare R2 / AWS S3) з увімкненим версіонуванням та політикою захисту від перезапису (Object Lock / WORM).
3. **Принцип мінімальних привілеїв (Least Privilege):**
   Сервісний обліковий запис на хості має виключно права `ObjectCreator` (запис). Він фізично не має прав на читання списку інших копій, їх видалення чи зміну налаштувань бакета.

---

## 5. Покроковий протокол аварійного відновлення (Recovery Protocol)

У разі підтвердженого пошкодження бази даних оператор виконує такі кроки:

### Крок 1: Ізоляція трафіку (Введення режиму обслуговування)

Щоб запобігти новим запитам та конфліктам даних, зупиняються клієнтські контейнери:

```bash
cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production stop storefront commerce
```

### Крок 2: Верифікація цілісності відновлюваного дампу

```bash
TARGET_BACKUP="/var/backups/life-mp/<BACKUP_ID>"

# Перевірка цілісності архіву
(cd "${TARGET_BACKUP}" && sha256sum -c CHECKSUMS.sha256)
```

_Якщо перевірка контрольної суми не пройшла — дамп скомпрометовано, переходити до попереднього валідного бекапу._

### Крок 3: Страхувальний знімок поточного стану (Pre-Restore Snapshot)

Навіть пошкоджений стан бази бекапиться для можливого криміналістичного аудиту:

```bash
EMERGENCY_DIR="/var/backups/life-mp/emergency-pre-restore-$(date +%Y%m%dT%H%M%SZ)"
mkdir -p "${EMERGENCY_DIR}" && chmod 700 "${EMERGENCY_DIR}"
(umask 077 && touch "${EMERGENCY_DIR}/corrupted_state.dump" && chmod 600 "${EMERGENCY_DIR}/corrupted_state.dump")
if docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${EMERGENCY_DIR}/corrupted_state.dump"; then
  echo "Попередній знімок аварійного стану збережено."
else
  echo "УВАГА: Не вдалося зняти дамп аварійного стану (можливе пошкодження системних каталогів або брак місця). Зафіксуйте журнал помилок."
fi
```

### Крок 4: Відновлення в ізольовану тимчасову базу (Safe Staging Database)

Категорично забороняється виконувати прямий `pg_restore --clean` на діючу базу `life_production`. У разі збою відновлення посередині або пошкодження даних опція `--clean` безповоротно видаляє наявні таблиці, позбавляючи можливості відкату.

Замість цього відновлення виконується в ізольовану базу-кандидат `life_restore_candidate`:

```bash
# 1. Створення чистої тимчасової бази для перевірки відновлення (із захистом від завислих підключень)
docker exec life-mp-postgres psql -U life_prod -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'life_restore_candidate' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS life_restore_candidate WITH (FORCE);" \
  -c "CREATE DATABASE life_restore_candidate WITH OWNER life_prod;"
# 2. Відновлення кастомного дампу (-Fc) в ізольовану базу із зупинкою при помилках
docker exec -i life-mp-postgres pg_restore -U life_prod -d life_restore_candidate --exit-on-error < "${TARGET_BACKUP}/database.dump"
```

_Примітка щодо успадкованих SQL-дампів:_ Якщо відновлюється plain SQL (`database.sql`), використовується psql з прапорцем зупинки при помилках:
`docker exec -i life-mp-postgres psql -U life_prod -d life_restore_candidate --set ON_ERROR_STOP=1 < "${TARGET_BACKUP}/database.sql"`

### Крок 5: Саніті-перевірка схеми та цілісності у тимчасовій базі

Перед перемиканням трафіку обов'язково перевіряється цілісність відновленого стану:

```bash
# 1. Перевірка схеми та сутностей із зупинкою при невідповідності (Fail-Closed)
TABLE_COUNT=$(docker exec life-mp-postgres psql -U life_prod -d life_restore_candidate -t -A -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

PRODUCT_COUNT=$(docker exec life-mp-postgres psql -U life_prod -d life_restore_candidate -t -A -c \
  "SELECT count(*) FROM product;")

echo "Таблиць у відновленій базі: ${TABLE_COUNT}, Продуктів: ${PRODUCT_COUNT}"

if [ -z "${TABLE_COUNT}" ] || [ "${TABLE_COUNT}" -lt 50 ]; then
  echo "ПОМИЛКА: Кількість таблиць (${TABLE_COUNT:-0}) менша за мінімальний поріг (50). Відновлення скасовано." >&2
  exit 1
fi

if [ -z "${PRODUCT_COUNT}" ] || [ "${PRODUCT_COUNT}" -le 0 ]; then
  echo "ПОМИЛКА: Каталог продуктів порожній або відсутній. Відновлення скасовано." >&2
  exit 1
fi
_Якщо перевірка не пройшла або виявлено помилки — робоча база `life_production` залишається повністю недоторканою, а оператор переходить до іншого знімка._

### Крок 6: Безпечна ротація баз даних (Safe Atomic Swap)

Лише після підтвердження валідності даних виконується перемикання баз із збереженням страхувальної копії:

```bash
PREV_NAME="life_production_pre_restore_$(date +%Y%m%dT%H%M%SZ)"

docker exec life-mp-postgres psql -U life_prod -d postgres -c "
  -- 1. Заборона нових з'єднань з робочою базою та кандидатом на час ротації
  ALTER DATABASE life_production ALLOW_CONNECTIONS = false;
  ALTER DATABASE life_restore_candidate ALLOW_CONNECTIONS = false;

  -- 2. Примусове завершення залишкових з'єднань
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname IN ('life_production', 'life_restore_candidate') AND pid <> pg_backend_pid();

  -- 3. Атомарне перейменування в єдиному запиті
  ALTER DATABASE life_production RENAME TO ${PREV_NAME};
  ALTER DATABASE life_restore_candidate RENAME TO life_production;
  -- 4. Відновлення дозволу на підключення до відновленої production-бази та страхувальної копії (для аудиту)
  ALTER DATABASE life_production ALLOW_CONNECTIONS = true;
  ALTER DATABASE ${PREV_NAME} ALLOW_CONNECTIONS = true;
"
```
### Крок 7: Відновлення роботи сервісів та верифікація

```bash
cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production start commerce storefront

# Перевірка проходження healthcheck
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production ps
```

### Крок 7.1: Процедура екстреного відкату (Emergency Rollback)

Якщо після запуску сервісів (Крок 7) виявлено помилки у логах, сервіси не проходять healthcheck або дані виявилися несумісними з поточним релізом застосунку — оператор виконує повернення до страхувальної копії:

```bash
cd /opt/life-mp/current/deploy

# 1. Зупинка сервісів для виключення нових запитів
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production stop storefront commerce

# 2. Зворотна ротація баз даних
FAILED_RESTORE_NAME="life_failed_restore_$(date +%Y%m%dT%H%M%SZ)"

docker exec life-mp-postgres psql -U life_prod -d postgres -c "
  ALTER DATABASE life_production ALLOW_CONNECTIONS = false;
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'life_production' AND pid <> pg_backend_pid();

  ALTER DATABASE life_production RENAME TO ${FAILED_RESTORE_NAME};
  ALTER DATABASE ${PREV_NAME} RENAME TO life_production;
  ALTER DATABASE life_production ALLOW_CONNECTIONS = true;
  ALTER DATABASE ${FAILED_RESTORE_NAME} ALLOW_CONNECTIONS = true;
"

# 3. Перезапуск сервісів на попередній базі
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production start commerce storefront

# 4. Перевірка повернення працездатності
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production ps
```

### Крок 8: Очищення страхувальної копії (після стабілізації)

Після підтвердження стабільної роботи (рекомендовано не раніше ніж через 24 години після інциденту):

```bash
# docker exec life-mp-postgres psql -U life_prod -d postgres -c "DROP DATABASE IF EXISTS ${PREV_NAME};"
```

---

## 6. Локальна перевірка відновлення на синтетичних даних (Synthetic Drill)

Розробники перевіряють процедуру відновлення локально на синтетичних фікстурах без доступу до продакшн-даних:

```bash
# 1. Запуск ізольованого тестового контейнера PostgreSQL
docker run --rm -d --name life-synthetic-dr-test \
  -e POSTGRES_DB=life_dr_source \
  -e POSTGRES_USER=dr_user \
  -e POSTGRES_PASSWORD=dr_password \
  postgres:16-alpine

# 2. Створення тестової синтетичної схеми (категорії, майстри, товари)
docker exec -i life-synthetic-dr-test psql -U dr_user -d life_dr_source << 'EOF'
CREATE TABLE categories (id SERIAL PRIMARY KEY, handle VARCHAR(64) UNIQUE, name VARCHAR(128));
CREATE TABLE artisans (id SERIAL PRIMARY KEY, handle VARCHAR(64) UNIQUE, name VARCHAR(128));
CREATE TABLE products (id SERIAL PRIMARY KEY, category_id INT REFERENCES categories(id), artisan_id INT REFERENCES artisans(id), title VARCHAR(128));

INSERT INTO categories (handle, name) VALUES ('ceramics', 'Кераміка');
INSERT INTO artisans (handle, name) VALUES ('kosiv-clay', 'Майстерня Косів');
INSERT INTO products (category_id, artisan_id, title) VALUES (1, 1, 'Глечик керамічний');
EOF

# 3. Експорт кастомного архіву з суворим umask та розрахунок контрольної суми
(umask 077 && touch /tmp/synthetic.dump && chmod 600 /tmp/synthetic.dump)
docker exec life-synthetic-dr-test pg_dump -U dr_user -Fc life_dr_source > /tmp/synthetic.dump
sha256sum /tmp/synthetic.dump > /tmp/CHECKSUMS.sha256
chmod 600 /tmp/CHECKSUMS.sha256
# 4. Перевірка цілісності та структури
sha256sum -c /tmp/CHECKSUMS.sha256
docker exec -i life-synthetic-dr-test pg_restore -l < /tmp/synthetic.dump | grep "TABLE DATA"

# 5. Створення імітації діючої бази з застарілими/пошкодженими даними
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source -c "
  CREATE DATABASE life_dr_prod;
"
docker exec -i life-synthetic-dr-test psql -U dr_user -d life_dr_prod << 'EOF'
CREATE TABLE products (id SERIAL PRIMARY KEY, title VARCHAR(128));
INSERT INTO products (title) VALUES ('Пошкоджений запис до відновлення');
EOF

# 6. Безпечне відновлення в ізольовану базу-кандидат (із захистом від активних з'єднань)
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'life_dr_candidate' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS life_dr_candidate WITH (FORCE);" \
  -c "CREATE DATABASE life_dr_candidate;"
docker exec -i life-synthetic-dr-test pg_restore -U dr_user -d life_dr_candidate --exit-on-error < /tmp/synthetic.dump

# 7. Fail-Closed верифікація схеми та даних у базі-кандидаті
DRILL_TABLES=$(docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_candidate -t -A -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
DRILL_PRODUCTS=$(docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_candidate -t -A -c \
  "SELECT count(*) FROM products;")
DRILL_CATEGORIES=$(docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_candidate -t -A -c \
  "SELECT count(*) FROM categories;")

if [ "${DRILL_TABLES}" -lt 3 ] || [ "${DRILL_PRODUCTS}" -le 0 ] || [ "${DRILL_CATEGORIES}" -le 0 ]; then
  echo "ПОМИЛКА САМОПЕРЕВІРКИ: Відновлені дані не пройшли критерії валідності!" >&2
  exit 1
fi

# 8. Атомарна ротація баз із блокуванням з'єднань
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source -c "
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = false;
  ALTER DATABASE life_dr_candidate ALLOW_CONNECTIONS = false;
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('life_dr_prod', 'life_dr_candidate') AND pid <> pg_backend_pid();
  ALTER DATABASE life_dr_prod RENAME TO life_dr_backup_pre_restore;
  ALTER DATABASE life_dr_candidate RENAME TO life_dr_prod;
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;
  ALTER DATABASE life_dr_backup_pre_restore ALLOW_CONNECTIONS = true;
"
# 9. Підтвердження успішного відновлення діючої бази та збереження бекапу
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_prod -c "SELECT p.title, c.name, a.name FROM products p JOIN categories c ON p.category_id = c.id JOIN artisans a ON p.artisan_id = a.id;"
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_backup_pre_restore -c "SELECT title FROM products;"

# 9.1. Перевірка процедури відкату (Rollback Drill)
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source -c "
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = false;
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'life_dr_prod' AND pid <> pg_backend_pid();
  ALTER DATABASE life_dr_prod RENAME TO life_dr_failed_candidate;
  ALTER DATABASE life_dr_backup_pre_restore RENAME TO life_dr_prod;
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;
"
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_prod -c "SELECT title FROM products;"

# Повернення відновленого стану для фінальних перевірок
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source -c "
  ALTER DATABASE life_dr_prod RENAME TO life_dr_backup_pre_restore;
  ALTER DATABASE life_dr_failed_candidate RENAME TO life_dr_prod;
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;
"
# 10. Fail-Closed негативний тест (перевірка реакції на пошкодження архіву)
head -c 100 /tmp/synthetic.dump > /tmp/corrupted.dump
docker exec life-synthetic-dr-test psql -U dr_user -d life_dr_source \
  -c "DROP DATABASE IF EXISTS life_dr_broken_test WITH (FORCE);" \
  -c "CREATE DATABASE life_dr_broken_test;"
docker exec -i life-synthetic-dr-test pg_restore -U dr_user -d life_dr_broken_test --exit-on-error < /tmp/corrupted.dump || echo "Пошкоджений дамп успішно відхилено, основна база неушкоджена"

# 11. Очищення тимчасових ресурсів
docker rm -f life-synthetic-dr-test
rm -f /tmp/synthetic.dump /tmp/CHECKSUMS.sha256 /tmp/corrupted.dump
```

---

## 7. Відповідальність та дії після відновлення

1. **Оголошення завершення інциденту:** Після перевірки HTTP 200 на вітрині та API health оператор фіксує точний час відновлення та розраховує фактичні RPO та RTO.
2. **Post-Mortem аналіз:** Протягом 48 годин після аварії готується звіт із встановленням першопричини (Root Cause Analysis) та заходами для запобігання рецидиву.
