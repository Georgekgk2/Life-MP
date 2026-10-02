# Інструкція безпечної автентифікації GHCR на Production Хості

- **Статус:** КАНДИДАТ ОПЕРАЦІЙНОГО РЕГЛАМЕНТУ (Фаза P2 / DEMO-UPDATE-ed8b2e68; merged scope PR required)
- **Дата оновлення:** 2026-10-02
- **Призначення:** Забезпечення захищеного завантаження приватних контейнерів із GitHub Container Registry (GHCR) на сервер публічного демо без витоку облікових даних та без неконтрольованого віддаленого доступу.

---

## 1. Суворі заборони та правила безпеки (Anti-Patterns & Prohibitions)

Категорично забороняється:
- Шукати токени чи паролі в історії команд розробника (`~/.zsh_history`, `~/.bash_history` тощо);
- Передавати токени або паролі як аргументи командного рядка чи інлайн у SSH-командах (вони стають відкритими у `ps aux`, системних логах та журналах процесора);
- Передавати токени чи паролі в тексті чату з AI-асистентами;
- Перемикати репозиторій або контейнерні пакети у статус `PUBLIC` для обходу авторизації чи білінгу;
- Зберігати довгоживучі credentials у незахищених текстових файлах без належних прав доступу;
- Вимикати перевірку ключів хоста (`StrictHostKeyChecking=no` або `accept-new`);
- Використовувати довільні ручні обходи через SSH для внесення неавторизованих змін;
- Заявляти про формальне погодження (formal approval) або завершене розгортання (deployment completed) до фактичного виконання й верифікації.

---

## 2. Облікові дані GHCR: PAT (Classic) та розмежування прав

1. **Тип токена та обмеження доступу:**
   - Для завантаження образів із GHCR використовується Personal Access Token (Classic) з областю дії **`read:packages`**. Fine-grained PAT для цього registry authentication не підтримується.
   - **Критичне застереження щодо меж прав:** токени PAT (Classic) **не забезпечують гранулярного обмеження на рівні окремого репозиторію** (classic token cannot promise per-repository fine-grained restriction) — вони надають дозвіл `read:packages` до всіх пакетів, доступних цьому обліковому запису.
   - Обліковий запис, під яким створюється токен, **зобов'язаний мати фактичний доступ на читання** до цільових пакетів (`ghcr.io/georgekgk2/life-commerce` та `ghcr.io/georgekgk2/life-storefront`).
   - Для мінімізації ризиків рекомендується використовувати окремий сервісний акаунт або обмежувати термін дії токена (короткостроковий, на період релізу).

---

## 3. Зберігання конфігурації Docker: Base64 проти шифрування

1. **Природа стандартного Docker config:**
   - Стандартний файл конфігурації Docker (`~/.docker/config.json`) зберігає збережені облікові дані у вигляді **звичайного Base64, що НЕ є шифруванням** (config base64 not encryption unless helper), якщо в системі не налаштовано окремий secure credential helper / credential store (наприклад, `pass`, `secretservice` або системне сховище ключів).
2. **Тимчасова конфігурація з ізоляцією прав (Temporary DOCKER_CONFIG):**
   - Для локальної перевірки Cosign оператор відкриває окремий Bash із тимчасовою конфігурацією; секрет не потрапляє до аргументів або chat:
     ```bash
     bash
     set +x
     umask 077
     export DOCKER_CONFIG="$(mktemp -d)"
     cleanup() {
       docker logout ghcr.io >/dev/null 2>&1 || true
       rm -rf -- "$DOCKER_CONFIG"
     }
     trap cleanup EXIT
     read -r -s -p 'GHCR classic PAT (read:packages): ' TOKEN </dev/tty
     printf '\n' >&2
     printf '%s' "$TOKEN" | docker login ghcr.io -u Georgekgk2 --password-stdin
     unset TOKEN
     ```
   - Виконати CLI в цьому Bash; `exit` очищає тимчасовий config. Після операції власник відкликає тимчасовий PAT. Віддалений інтерактивний payload окремо виконує таку ж ізоляцію й cleanup; секрет не проходить через Node CLI.

---

## 4. Архітектура віддаленого підключення та виконання

1. **Фіксований аліас SSH та валідація хоста:**
   - Підключення здійснюється суворо через аліас `jorvis-prod-vm` із обов'язковими примусовими параметрами:
     - `Hostname: 34.139.21.224`
     - `User: medgemma-user`
     - `Port: 22`
     - `StrictHostKeyChecking: yes`
     - `HostKeyAlias: 34.139.21.224`
   - Немає proxies, TCP/agent/X11 forwarding чи SSH multiplexing: `ControlPath=none`, `ControlMaster=no`, `ControlPersist=no`, `ForwardAgent=no`, `ForwardX11=no`, `Tunnel=no`. CLI не приймає перевизначень цільового хоста чи ключів. Docker payload примусово використовує локальний socket `/var/run/docker.sock`, а не успадкований remote context.
   - Власник встановлює SSH host key незалежно у свій файл `~/.ssh/known_hosts`. Використання `StrictHostKeyChecking=no` чи `accept-new` категорично заборонено.

2. **Виконання віддаленого пейлоада через раннер:**
   - Локальний раннер верифікує криптографічний хеш SHA-256 віддаленого скрипта (`infra/scripts/promote-public-demo.sh`) та передає його через SSH як екрановану команду:
     `bash -Eeuo pipefail -c PAYLOAD -- OPERATION`
   - Для інтерактивної операції `promote` застосовується `ssh -t` зі збереженням успадкованих потоків введення-виведення (stdio inherited).
   - **Інтерактивна автентифікація:** payload запитує PAT через `/dev/tty` (`read -s`) у тимчасовий `DOCKER_CONFIG` (`--password-stdin`, `umask 077`). Обробник EXIT/INT/TERM/HUP прибирає credentials до rollback та ігнорує повторні сигнали під час cleanup. SIGKILL або втрата хоста не дозволяють гарантувати cleanup; власник відкликає PAT після операції. Локальний CLI не читає токен.
   - **Headless-автентифікація:** використовується чинний credential helper/config саме сервера; локальний `docker login` його не налаштовує. Помилка pull зупиняє операцію до заміни Compose і рестарту; приватний backup, lock і тимчасові файли вже можуть існувати. Для відсутніх server credentials оператор запускає canonical `promote` інтерактивно у власному терміналі й вводить PAT лише у прихований remote prompt.
   - Довільний ручний SSH не є частиною цього scoped дозволу.
   - Локальна перевірка Cosign здійснюється через наявний credential helper робочої станції й ніколи не зчитує токени самостійно.

---

## 5. Канонічний інтерфейс CLI для промоції публічного демо

1. **Передумови запуску:**
   - Виконання можливе лише після злиття узгодженого виконуваного PR у гілку `main`;
   - Робоче дерево є чистим (`clean git status`, без незбережених змін);
   - Скомпільовано пакет конфігурації: `pnpm --filter @life/config build`.
   ```bash
   git switch main
   git pull --ff-only origin main
   pnpm install --frozen-lockfile
   pnpm --filter @life/config build
   ```

2. **Команди CLI:**
   ```bash
   node scripts/promote-public-demo.mjs discovery
   node scripts/promote-public-demo.mjs promote /path/to/IMAGE_DIGESTS.json
   node scripts/promote-public-demo.mjs verify
   node scripts/promote-public-demo.mjs rollback
   ```

3. **Завантаження маніфесту релізу:**
   Для операції `promote` локально завантажується верифікований маніфест за допомогою GitHub CLI:
   ```bash
   WORK="$(mktemp -d)"
   gh run download 37026279249 --repo Georgekgk2/Life-MP \
     --name image-digests-manifest --dir "$WORK"
   node scripts/promote-public-demo.mjs promote "$WORK/IMAGE_DIGESTS.json"
   ```
   CLI локально валідує походження (provenance) образів та відповідність хешів політиці `scoped_demo_update` перед виконанням будь-яких дій на сервері.

---

## 6. Захист стану, відкат та межі ізоляції

1. **Захист від повторної промоції (One host attempt state):**
   - Дозволений лише один cutover: перед заміною Compose записується незворотний `CUTOVER_STARTED`. Після нього повторна promotion заборонена, навіть якщо автоматичний rollback не завершився.
   - Abort до cutover (наприклад, GHCR authentication) можна продовжити тим самим `promote`, лише якщо завершений backup/checksums валідні, `.env` і Compose незмінні, поточні runtime refs дорівнюють captured refs, а `CUTOVER_STARTED`, `PROMOTION_COMPLETE` і `ROLLBACK_COMPLETE` відсутні.
   - Продовження зберігає первинний backup і refs; не видаляти/перейменовувати state для обходу guard. Неповний або змінений capture лишається заблокованим.

2. **Регламент відкату (Rollback):**
   - Операція `rollback` повертає сервіси **виключно до зафіксованих перед промоцією runtime-дайджестів контейнерів (prior captured refs only)**.
   - Відновлення бази даних (database restore) **НЕ виконується**.

3. **Суворі інфраструктурні обмеження (Out of Scope):**
   - Промоція не виконує жодних міграцій БД;
   - Не змінюються конфігурації DNS, TLS, firewall чи мережевого шлюзу;
   - Не зачіпаються інші проєкти, каталоги чи сервіси, розміщені на хості;
   - Жодні бойові платіжні, фіскальні чи поштові шлюзи не активуються;
   - Жодні повідомлення замовникам не надсилаються до повної верифікації оновлення.

## 7. Джерела і межі доказів

- [GitHub Container Registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry): PAT classic та `read:packages`.
- [Docker login credential storage](https://docs.docker.com/reference/cli/docker/login/): Base64 не є шифруванням; helper має окрему модель зберігання.
- Реалізація CLI і зелений локальний preflight не є доказом виконаного remote deployment або формального approval. До merge scoped PR remote execution лишається забороненим.

