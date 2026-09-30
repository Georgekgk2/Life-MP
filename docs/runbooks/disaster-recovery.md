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
bash -Eeuo pipefail <<'BASH'
umask 077

# mkdir without -p fails on an existing backup ID instead of overwriting it.
BACKUP_ID="rel-$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/var/backups/life-mp/${BACKUP_ID}"
mkdir -m 700 -- "${BACKUP_DIR}"

DUMP_TMP="$(mktemp "${BACKUP_DIR}/.database.dump.XXXXXX")"
CHECKSUM_TMP="$(mktemp "${BACKUP_DIR}/.CHECKSUMS.XXXXXX")"
trap 'rm -f -- "${DUMP_TMP}" "${CHECKSUM_TMP}"' EXIT

# A failed dump or archive-list check aborts before publishing completion markers.
docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${DUMP_TMP}"
test -s "${DUMP_TMP}"
docker exec -i life-mp-postgres pg_restore -l < "${DUMP_TMP}" > /dev/null
mv -- "${DUMP_TMP}" "${BACKUP_DIR}/database.dump"
(cd "${BACKUP_DIR}" && sha256sum database.dump) > "${CHECKSUM_TMP}"
mv -- "${CHECKSUM_TMP}" "${BACKUP_DIR}/CHECKSUMS.sha256"

# Markers are published only after dump and checksum creation succeeded.
touch "${BACKUP_DIR}/BACKUP_COMPLETE" "${BACKUP_DIR}/BACKUP_COMPLETE_WITH_DB"
BASH
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

Зупиніть storefront, commerce та будь-які інші відомі клієнти PostgreSQL. Якщо воркери або jobs не керуються цим Compose-проєктом, зупиніть їх окремо й зафіксуйте команду безпечного повторного запуску. PostgreSQL залиште запущеним для backup і restore.

```bash
cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production stop storefront commerce
```

### Крок 2: Вибір і перевірка цілісності резервної копії

У тому самому Bash-сеансі задайте точний каталог backup та унікальний ідентифікатор відновлення. Збережіть `RUN_ID`; після розриву сеансу задайте той самий ідентифікатор вручну з журналу інциденту, не генеруйте новий для rollback.

```bash
TARGET_BACKUP="/var/backups/life-mp/<BACKUP_ID>"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)_$$"
RESTORE_DB="life_restore_candidate_${RUN_ID}"
PREV_NAME="life_production_pre_restore_${RUN_ID}"
FAILED_RESTORE_NAME="life_failed_restore_${RUN_ID}"
export TARGET_BACKUP RUN_ID RESTORE_DB PREV_NAME FAILED_RESTORE_NAME
```

```bash
bash -Eeuo pipefail <<'BASH'
: "${TARGET_BACKUP:?Set TARGET_BACKUP to the exact backup directory}"
test -s "${TARGET_BACKUP}/database.dump"
test -f "${TARGET_BACKUP}/BACKUP_COMPLETE"
test -f "${TARGET_BACKUP}/BACKUP_COMPLETE_WITH_DB"
(cd "${TARGET_BACKUP}" && sha256sum -c CHECKSUMS.sha256)
docker exec -i life-mp-postgres pg_restore -l < "${TARGET_BACKUP}/database.dump" > /dev/null
BASH
```

Якщо будь-яка команда завершується помилкою, не продовжуйте з цього backup. Виберіть інший валідний знімок і зафіксуйте причину відхилення.

### Крок 3: Страхувальний знімок поточного стану (Pre-Restore Snapshot)

Навіть пошкоджений стан бази бекапиться для можливого криміналістичного аудиту:

```bash
bash -Eeuo pipefail <<'BASH'
: "${RUN_ID:?Run the recovery setup in Step 2 first}"
EMERGENCY_DIR="/var/backups/life-mp/emergency-pre-restore-${RUN_ID}"
mkdir -m 700 -- "${EMERGENCY_DIR}"
DUMP_TMP="$(mktemp "${EMERGENCY_DIR}/.corrupted_state.dump.XXXXXX")"
trap 'rm -f -- "${DUMP_TMP}"' EXIT

docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${DUMP_TMP}"
test -s "${DUMP_TMP}"
docker exec -i life-mp-postgres pg_restore -l < "${DUMP_TMP}" > /dev/null
mv -- "${DUMP_TMP}" "${EMERGENCY_DIR}/corrupted_state.dump"
echo "Pre-restore snapshot verified at ${EMERGENCY_DIR}/corrupted_state.dump"
BASH
```

### Крок 4: Відновлення в ізольовану тимчасову базу (Safe Staging Database)

Використовуйте унікальну назву `RESTORE_DB`, задану в Кроці 2. Не видаляйте попередню базу-кандидат автоматично: невідомий або зайнятий кандидат потрібно дослідити окремо; не застосовуйте `DROP DATABASE ... WITH (FORCE)` як стандартний крок відновлення.

```bash
bash -Eeuo pipefail <<'BASH'
: "${RESTORE_DB:?Run the recovery setup in Step 2 first}"
[[ "${RESTORE_DB}" =~ ^life_restore_candidate_[A-Za-z0-9_]+$ ]]

# A collision fails safely; no existing database is dropped.
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "CREATE DATABASE ${RESTORE_DB} WITH OWNER life_prod;"
docker exec -i life-mp-postgres pg_restore -U life_prod -d "${RESTORE_DB}" --exit-on-error < "${TARGET_BACKUP}/database.dump"
BASH
```

Для plain SQL (`database.sql`) замініть `pg_restore` на:

```bash
bash -Eeuo pipefail <<'BASH'
: "${TARGET_BACKUP:?Run the recovery setup in Step 2 first}"
: "${RESTORE_DB:?Run the recovery setup in Step 2 first}"
docker exec -i life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d "${RESTORE_DB}" < "${TARGET_BACKUP}/database.sql"
BASH
```

### Крок 5: Перевірка відновленої схеми

Після успішного `pg_restore --exit-on-error` переконайтеся, що очікувана Medusa-таблиця `public.product` присутня. Кількість рядків може бути нульовою для порожнього каталогу, тому її не використовуємо як критерій відмови. Загальна кількість таблиць і товарів тут інформаційна, а не доказ повноти backup.

```bash
bash -Eeuo pipefail <<'BASH'
: "${RESTORE_DB:?Run the recovery setup in Step 2 first}"
[[ "${RESTORE_DB}" =~ ^life_restore_candidate_[A-Za-z0-9_]+$ ]]

HAS_PRODUCT_TABLE="$(docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d "${RESTORE_DB}" -t -A -c \
  "SELECT to_regclass('public.product') IS NOT NULL;")"
if [ "${HAS_PRODUCT_TABLE}" != "t" ]; then
  echo "STOP: public.product is absent from the restored database; do not switch traffic." >&2
  exit 1
fi

TABLE_COUNT="$(docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d "${RESTORE_DB}" -t -A -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"
PRODUCT_COUNT="$(docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d "${RESTORE_DB}" -t -A -c \
  "SELECT count(*) FROM public.product;")"
printf 'Schema check passed; public tables=%s, products=%s\n' "${TABLE_COUNT}" "${PRODUCT_COUNT}"
BASH
```

### Крок 6: Ізоляція з'єднань і ротація назв баз

Перед виконанням переконайтеся, що storefront, commerce та всі інші відомі застосунки, воркери й jobs, які підключаються до цієї БД, зупинені та не можуть повторно стартувати. Запишіть `RUN_ID`, `RESTORE_DB` і `PREV_NAME` у журнал інциденту. Ідентифікатори з Кроку 2 містять лише літери, цифри та `_`.

Спершу окремими командами зафіксуйте `ALLOW_CONNECTIONS=false`. Кожна команда завершується власним commit; лише після цього завершіть наявні сесії. Не об'єднуйте цей крок із перейменуванням в один `psql -c`: інші сесії не побачать незакомічену заборону на підключення.

```bash
bash -Eeuo pipefail <<'BASH'
: "${RESTORE_DB:?Run the recovery setup in Step 2 first}"
: "${PREV_NAME:?Run the recovery setup in Step 2 first}"
[[ "${RESTORE_DB}" =~ ^life_restore_candidate_[A-Za-z0-9_]+$ ]]
[[ "${PREV_NAME}" =~ ^life_production_pre_restore_[A-Za-z0-9_]+$ ]]

PREVIOUS_EXISTS="$(docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres -t -A -c \
  "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${PREV_NAME}');")"
if [ "${PREVIOUS_EXISTS}" = "t" ]; then
  echo "STOP: ${PREV_NAME} already exists; inspect it, do not overwrite it." >&2
  exit 1
fi

docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "ALTER DATABASE life_production ALLOW_CONNECTIONS = false;"
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "ALTER DATABASE ${RESTORE_DB} ALLOW_CONNECTIONS = false;"
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('life_production', '${RESTORE_DB}') AND pid <> pg_backend_pid();"

# Both renames commit or roll back together. Keep the old database closed to clients.
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres -c "
  ALTER DATABASE life_production RENAME TO ${PREV_NAME};
  ALTER DATABASE ${RESTORE_DB} RENAME TO life_production;
  ALTER DATABASE life_production ALLOW_CONNECTIONS = true;
"
BASH
```

Якщо будь-яка команда ротації завершується помилкою, не запускайте сервіси й не повторюйте rename навмання. Раніше окремо закомічене блокування може залишити `life_production` недоступною. Перевірте фактичні назви та `pg_database.datallowconn` з БД `postgres`; якщо перейменування відкотилося і `life_production` усе ще є старою базою, знімайте блокування лише після підтвердження стану інцидент-лідом і збереження кандидата.

#### Якщо fencing закомічено, а rename transaction не відбувся

Виконуйте лише коли службова перевірка підтверджує, що `life_production` іще є старою базою, `PREV_NAME` відсутня, candidate існує з `ALLOW_CONNECTIONS=false`, а активних сесій до старої та candidate баз немає. Якщо фактичний стан відрізняється, зупиніться й передайте відновлення incident lead.

```bash
bash -Eeuo pipefail <<'BASH'
: "${RESTORE_DB:?Use the exact RESTORE_DB recorded for this recovery}"
: "${PREV_NAME:?Use the exact PREV_NAME recorded for this recovery}"
[[ "${RESTORE_DB}" =~ ^life_restore_candidate_[A-Za-z0-9_]+$ ]]
[[ "${PREV_NAME}" =~ ^life_production_pre_restore_[A-Za-z0-9_]+$ ]]

STATE="$(docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres -t -A -F '|' -c \
  "SELECT COALESCE((SELECT datallowconn FROM pg_database WHERE datname = 'life_production'), false), EXISTS (SELECT 1 FROM pg_database WHERE datname = '${PREV_NAME}'), COALESCE((SELECT datallowconn FROM pg_database WHERE datname = '${RESTORE_DB}'), false), (SELECT count(*) FROM pg_stat_activity WHERE datname IN ('life_production', '${RESTORE_DB}'));")"
if [ "${STATE}" != "f|f|f|0" ]; then
  echo "STOP: unexpected database state (${STATE}); do not reopen or rename any database." >&2
  exit 1
fi

docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "ALTER DATABASE life_production ALLOW_CONNECTIONS = true;"
BASH
```

Це відкриває лише стару `life_production`; candidate лишається ізольованим.

---

### Крок 7: Запуск і перевірка сервісів

Запускайте сервіси лише після успішної ротації з Кроку 6. Переконайтеся, що кожен сервіс healthy за визначеним у Compose healthcheck, і окремо перевірте прикладний health endpoint. Зовнішні воркери або jobs, зупинені окремо на Кроці 1, запускайте лише після перевірки цих health checks за раніше зафіксованою командою.

```bash
bash -Eeuo pipefail <<'BASH'
cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production start commerce storefront
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production ps
BASH
```

### Крок 7.1: Відкат після невдалого запуску

Якщо перевірка після Кроку 7 не пройшла, зупиніть усі застосунки, воркери й jobs, які можуть записувати до БД. Будь-які записи, зроблені у відновлену БД після її відкриття, залишаться в перейменованій базі `FAILED_RESTORE_NAME`; перед відкатом збережіть її для аналізу та окремо погодьте обробку цих записів.

```bash
bash -Eeuo pipefail <<'BASH'
: "${PREV_NAME:?Use the exact PREV_NAME recorded for this recovery}"
: "${FAILED_RESTORE_NAME:?Use the exact FAILED_RESTORE_NAME recorded for this recovery}"
[[ "${PREV_NAME}" =~ ^life_production_pre_restore_[A-Za-z0-9_]+$ ]]
[[ "${FAILED_RESTORE_NAME}" =~ ^life_failed_restore_[A-Za-z0-9_]+$ ]]

cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production stop storefront commerce

# Commit the connection fence before terminating sessions.
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "ALTER DATABASE life_production ALLOW_CONNECTIONS = false;"
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "ALTER DATABASE ${PREV_NAME} ALLOW_CONNECTIONS = false;"
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('life_production', '${PREV_NAME}') AND pid <> pg_backend_pid();"

# Restore the pre-incident database; leave the failed restore database inaccessible.
docker exec life-mp-postgres psql -v ON_ERROR_STOP=1 -U life_prod -d postgres -c "
  ALTER DATABASE life_production RENAME TO ${FAILED_RESTORE_NAME};
  ALTER DATABASE ${FAILED_RESTORE_NAME} ALLOW_CONNECTIONS = false;
  ALTER DATABASE ${PREV_NAME} RENAME TO life_production;
  ALTER DATABASE life_production ALLOW_CONNECTIONS = true;
"
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production start commerce storefront
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production ps
BASH
```

### Крок 8: Утримання страхувальної копії

Не видаляйте стару або невдалу базу автоматично після 24 годин. Зберігайте її недоступною для застосунків і дійте за затвердженою політикою retention. Видалення потребує окремого підтвердження точного імені БД, перевірки резервних копій та явного дозволу відповідального власника.


---

## 6. Локальна перевірка відновлення на синтетичних даних (Synthetic Drill)

Розробники перевіряють процедуру відновлення локально на синтетичних фікстурах без доступу до продакшн-даних:

```bash
bash -Eeuo pipefail <<'BASH'
umask 077
CONTAINER="life-synthetic-dr-test-$$"
DRILL_DIR="$(mktemp -d "${TMPDIR:-/tmp}/life-dr-drill.XXXXXX")"
DUMP="${DRILL_DIR}/synthetic.dump"
CORRUPT_DUMP="${DRILL_DIR}/corrupted.dump"

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  rm -rf -- "${DRILL_DIR}"
}
trap cleanup EXIT

docker run --rm -d --network none --name "${CONTAINER}" \
  -e POSTGRES_DB=life_dr_source \
  -e POSTGRES_USER=dr_user \
  -e POSTGRES_PASSWORD=synthetic_only \
  postgres:16-alpine > /dev/null

READY=false
for _ in $(seq 1 60); do
  if docker exec "${CONTAINER}" psql -X -v ON_ERROR_STOP=1 -U dr_user -d life_dr_source -c "SELECT 1;" >/dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 1
done
test "${READY}" = true

psql() {
  local arg
  for arg in "$@"; do
    if [[ "${arg}" == "-c" || "${arg}" == "--command" ]]; then
      docker exec "${CONTAINER}" psql -X -v ON_ERROR_STOP=1 -U dr_user "$@"
      return
    fi
  done
  docker exec -i "${CONTAINER}" psql -X -v ON_ERROR_STOP=1 -U dr_user "$@"
}

# Synthetic source: categories, artisans, and products with foreign keys.
psql -d life_dr_source <<'SQL'
CREATE TABLE categories (id SERIAL PRIMARY KEY, handle VARCHAR(64) UNIQUE, name VARCHAR(128));
CREATE TABLE artisans (id SERIAL PRIMARY KEY, handle VARCHAR(64) UNIQUE, name VARCHAR(128));
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id),
  artisan_id INT REFERENCES artisans(id),
  title VARCHAR(128)
);
INSERT INTO categories (handle, name) VALUES ('ceramics', 'Кераміка');
INSERT INTO artisans (handle, name) VALUES ('kosiv-clay', 'Майстерня Косів');
INSERT INTO products (category_id, artisan_id, title) VALUES (1, 1, 'Глечик керамічний');
SQL

# Backup is created with restrictive permissions and checksum-verified.
docker exec "${CONTAINER}" pg_dump -U dr_user -Fc life_dr_source > "${DUMP}"
test -s "${DUMP}"
(cd "${DRILL_DIR}" && sha256sum synthetic.dump > CHECKSUMS.sha256 && sha256sum -c CHECKSUMS.sha256)
docker exec -i "${CONTAINER}" pg_restore -l < "${DUMP}" > /dev/null

# Existing production state is intentionally distinct from the restored fixture.
psql -d postgres -c "CREATE DATABASE life_dr_prod;"
psql -d life_dr_prod <<'SQL'
CREATE TABLE products (id SERIAL PRIMARY KEY, title VARCHAR(128));
INSERT INTO products (title) VALUES ('Пошкоджений запис до відновлення');
SQL

# Restore into a new candidate; never drop or force-delete an earlier database.
psql -d postgres -c "CREATE DATABASE life_dr_candidate;"
docker exec -i "${CONTAINER}" pg_restore -U dr_user -d life_dr_candidate --exit-on-error < "${DUMP}"

# Exact expected fixture rows prove the restored relational data, not mere query success.
COUNTS="$(psql -d life_dr_candidate -At -F '|' -c \
  "SELECT (SELECT count(*) FROM categories), (SELECT count(*) FROM artisans), (SELECT count(*) FROM products);")"
if [ "${COUNTS}" != "1|1|1" ]; then
  echo "FAIL: candidate fixture counts were ${COUNTS}, expected 1|1|1" >&2
  exit 1
fi

# Negative validation: an empty database must be rejected before any cutover.
psql -d postgres -c "CREATE DATABASE life_dr_empty_candidate;"
EMPTY_PRODUCT_TABLE="$(psql -d life_dr_empty_candidate -At -c "SELECT to_regclass('public.products') IS NOT NULL;")"
if [ "${EMPTY_PRODUCT_TABLE}" != "f" ]; then
  echo "FAIL: empty candidate unexpectedly passed the schema guard" >&2
  exit 1
fi
echo "PASS: empty candidate rejected before cutover"

# Commit each connection fence before terminating sessions; verify fresh connects fail.
psql -d postgres -c "ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = false;"
if psql -d life_dr_prod -c "SELECT 1;" >/dev/null 2>&1; then
  echo "FAIL: a new session connected after the committed connection fence" >&2
  exit 1
fi
psql -d postgres -c "ALTER DATABASE life_dr_candidate ALLOW_CONNECTIONS = false;"
psql -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('life_dr_prod', 'life_dr_candidate') AND pid <> pg_backend_pid();"
# Exercise the documented recovery guard for a failed rename transaction.
FENCED_STATE="$(psql -d postgres -At -F '|' -c \
  "SELECT COALESCE((SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_prod'), false), EXISTS (SELECT 1 FROM pg_database WHERE datname = 'life_dr_backup_pre_restore'), COALESCE((SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_candidate'), false), (SELECT count(*) FROM pg_stat_activity WHERE datname IN ('life_dr_prod', 'life_dr_candidate'));")"
if [ "${FENCED_STATE}" != "f|f|f|0" ]; then
  echo "FAIL: fenced recovery state was ${FENCED_STATE}, expected f|f|f|0" >&2
  exit 1
fi
psql -d postgres -c "ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;"
FALLBACK_STATE="$(psql -d postgres -At -F '|' -c \
  "SELECT (SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_prod'), (SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_candidate');")"
if [ "${FALLBACK_STATE}" != "t|f" ] || psql -d life_dr_candidate -c "SELECT 1;" >/dev/null 2>&1; then
  echo "FAIL: recovery fallback did not reopen only the old database" >&2
  exit 1
fi
psql -d postgres -c "ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = false;"
psql -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('life_dr_prod', 'life_dr_candidate') AND pid <> pg_backend_pid();"


# The rename pair is one transaction. The old database stays closed to application clients.
psql -d postgres -c "
  ALTER DATABASE life_dr_prod RENAME TO life_dr_backup_pre_restore;
  ALTER DATABASE life_dr_candidate RENAME TO life_dr_prod;
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;
"
BACKUP_ALLOW_CONNECTIONS="$(psql -d postgres -At -c \
  "SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_backup_pre_restore';")"
if [ "${BACKUP_ALLOW_CONNECTIONS}" != "f" ]; then
  echo "FAIL: pre-restore database was reopened to clients" >&2
  exit 1
fi
RESTORED_ROW="$(psql -d life_dr_prod -At -F '|' -c \
  "SELECT p.title, c.name, a.name FROM products p JOIN categories c ON p.category_id=c.id JOIN artisans a ON p.artisan_id=a.id;")"
if [ "${RESTORED_ROW}" != "Глечик керамічний|Кераміка|Майстерня Косів" ]; then
  echo "FAIL: restored relational row differed: ${RESTORED_ROW}" >&2
  exit 1
fi

# Rollback drill: preserve the failed restore as inaccessible; reopen only the old database.
psql -d postgres -c "ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = false;"
psql -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'life_dr_prod' AND pid <> pg_backend_pid();"
psql -d postgres -c "
  ALTER DATABASE life_dr_prod RENAME TO life_dr_failed_restore;
  ALTER DATABASE life_dr_failed_restore ALLOW_CONNECTIONS = false;
  ALTER DATABASE life_dr_backup_pre_restore RENAME TO life_dr_prod;
  ALTER DATABASE life_dr_prod ALLOW_CONNECTIONS = true;
"
ROLLED_BACK_ROW="$(psql -d life_dr_prod -At -c "SELECT title FROM products;")"
FAILED_DB_ALLOW_CONNECTIONS="$(psql -d postgres -At -c \
  "SELECT datallowconn FROM pg_database WHERE datname = 'life_dr_failed_restore';")"
if [ "${ROLLED_BACK_ROW}" != "Пошкоджений запис до відновлення" ] || [ "${FAILED_DB_ALLOW_CONNECTIONS}" != "f" ]; then
  echo "FAIL: rollback result or failed-database isolation was incorrect" >&2
  exit 1
fi

# A truncated archive must return nonzero; it must not change the rolled-back production database.
head -c 100 "${DUMP}" > "${CORRUPT_DUMP}"
psql -d postgres -c "CREATE DATABASE life_dr_broken_test;"
if docker exec -i "${CONTAINER}" pg_restore -U dr_user -d life_dr_broken_test --exit-on-error < "${CORRUPT_DUMP}"; then
  echo "FAIL: pg_restore unexpectedly accepted the truncated archive" >&2
  exit 1
fi
FINAL_PROD_ROW="$(psql -d life_dr_prod -At -c "SELECT title FROM products;")"
if [ "${FINAL_PROD_ROW}" != "Пошкоджений запис до відновлення" ]; then
  echo "FAIL: negative restore changed the production fixture" >&2
  exit 1
fi

echo "PASS: verified backup, candidate restore, fail-closed schema/data checks, committed connection fence, rename, rollback, and corrupted-archive rejection"
BASH
```

---

## 7. Відповідальність та дії після відновлення

1. **Оголошення завершення інциденту:** Після перевірки HTTP 200 на вітрині та API health оператор фіксує точний час відновлення та розраховує фактичні RPO та RTO.
2. **Post-Mortem аналіз:** Протягом 48 годин після аварії готується звіт із встановленням першопричини (Root Cause Analysis) та заходами для запобігання рецидиву.
