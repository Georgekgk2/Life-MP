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

| Показник | Цільовий орієнтир | Визначення та контекст |
|---|---|---|
| **RPO (Recovery Point Objective)** | **<= 24 годин** (плановий щоденний бекап) / **0 секунд** (pre-release snapshot) | Максимально допустима втрата даних: перед кожним релізом створюється snapshot, тому при релізі цільовий RPO = 0. |
| **RTO (Recovery Time Objective)** | **<= 15 хвилин** | Цільовий час від моменту оголошення інциденту до відновлення працездатності сервісу. |

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

# 2. Створення стисненого дампу PostgreSQL без блокування таблиць
docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${BACKUP_DIR}/database.dump"
chmod 600 "${BACKUP_DIR}/database.dump"

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
*Якщо перевірка контрольної суми не пройшла — дамп скомпрометовано, переходити до попереднього валідного бекапу.*

### Крок 3: Страхувальний знімок поточного стану (Pre-Restore Snapshot)
Навіть пошкоджений стан бази бекапиться для можливого криміналістичного аудиту:
```bash
EMERGENCY_DIR="/var/backups/life-mp/emergency-pre-restore-$(date +%Y%m%dT%H%M%SZ)"
mkdir -p "${EMERGENCY_DIR}" && chmod 700 "${EMERGENCY_DIR}"
docker exec life-mp-postgres pg_dump -U life_prod -Fc life_production > "${EMERGENCY_DIR}/corrupted_state.dump" || true
```

### Крок 4: Відновлення структури та даних
```bash
# Для стандартного кастомного дампу (-Fc) через pg_restore:
docker exec -i life-mp-postgres pg_restore -U life_prod -d life_production --clean --if-exists < "${TARGET_BACKUP}/database.dump"

# ПРИМІТКА ЩОДО ФОРМАТІВ:
# Якщо відновлюється успадкований plain SQL дамп (database.sql), використовується psql з прапорцем зупинки при помилках:
# docker exec -i life-mp-postgres psql -U life_prod -d life_production --set ON_ERROR_STOP=1 < "${TARGET_BACKUP}/database.sql"
# (утиліта pg_restore не підтримує plain text SQL і призначена виключно для custom, tar або directory форматів).
```

### Крок 5: Саніті-перевірка цілісності схеми
```bash
# Перевірка наявності основних таблиць Medusa та каталогу
docker exec life-mp-postgres psql -U life_prod -d life_production -c "
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
"
```
Очікується ненульова кількість таблиць (у стандартній схемі Medusa v2 — понад 50 таблиць).

### Крок 6: Відновлення роботи сервісів та тестування
```bash
cd /opt/life-mp/current/deploy
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production start commerce storefront

# Очікування проходження healthcheck
docker compose -p life-mp -f docker-compose.prod.yml --env-file .env.production ps
```

---

## 6. Локальна перевірка відновлення на синтетичних даних (Synthetic Drill)

Розробники перевіряють процедуру відновлення локально без використання даних клієнтів:

```bash
# Запуск локального тестового оточення
./scripts/with-commerce-test-env.sh pnpm --filter @life/commerce test:integration

# Тест створення синтетичного дампу
docker exec life-test-postgres pg_dump -U postgres -Fc test_db > /tmp/synthetic-test.dump

# Тест верифікації структури
pg_restore -l /tmp/synthetic-test.dump | head -n 20

# Очищення артефактів
rm -f /tmp/synthetic-test.dump
```

---

## 7. Відповідальність та дії після відновлення

1. **Оголошення завершення інциденту:** Після перевірки HTTP 200 на вітрині та API health оператор фіксує точний час відновлення та розраховує фактичні RPO та RTO.
2. **Post-Mortem аналіз:** Протягом 48 годин після аварії готується звіт із встановленням першопричини (Root Cause Analysis) та заходами для запобігання рецидиву.
