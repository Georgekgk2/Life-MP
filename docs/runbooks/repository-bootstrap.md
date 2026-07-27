# Runbook: початкове налаштування репозиторію

## Призначення та межа

Це інструкція для відповідального власника репозиторію після затвердженого початкового імпорту. Вона **не виконує** команд Git/GitHub, не створює remote, не змінює `main`, не вмикає CI і не надає production-доступ.

Перед виконанням будь-якого кроку прочитайте [межі запуску](../decisions/launch-scope.md), [реєстр відкритих рішень](../decisions/open-questions.md) і ADR 0003 про release/recovery. Цей runbook описує гігієну коду та CI, а не схвалення checkout, оплат, shipment, юридичних процесів або production.

## Безпечний початковий імпорт

Виконує лише власник репозиторію в перевіреній локальній копії:

1. Перевірте, що в імпорті є `README.md`, `docs/`, `.gitignore`, root `package.json`, `pnpm-workspace.yaml`, `docker-compose.dev.yml`, Makefile та workflow CI. Переконайтеся, що немає секретів, `.env` зі значеннями, дампів даних, ключів чи credentials.
2. Ініціалізуйте репозиторій із гілкою за замовчуванням `main` або переконайтеся, що імпортована гілка вже має цю назву. Не змішуйте кілька головних гілок.
3. До першого commit перегляньте список файлів індексу та diff; не додавайте generated artifacts, локальні volumes або особисті налаштування IDE, якщо вони не мають бути версіонованими.
4. Зафіксуйте перевірену основу одним зрозумілим початковим commit. Лише після review прив’яжіть remote, який належить Life-MP.
5. У Git hosting переконайтеся, що default branch вказує на `main`; не пуште в неперевірений або особистий remote.

Приклад послідовності команд для відповідального виконавця (підставити власний URL remote; тут не виконувати):

```bash
git init -b main
git add README.md docs .github .gitignore package.json pnpm-workspace.yaml Makefile docker-compose.dev.yml apps packages
git status
git commit -m "chore: bootstrap Life-MP foundation"
git remote add origin <перевірений-URL-Life-MP>
git push -u origin main
```

Якщо Git уже ініціалізований, не запускайте `git init` повторно: спочатку перевірте поточну гілку, remote та історію.

## Налаштування `main`

Після появи remote власник репозиторію має налаштувати branch protection для `main` у Git hosting:

- заборонити прямі push і force-push;
- дозволити зміни через Pull Request;
- вимагати щонайменше один незалежний review відповідно до політики команди;
- вимагати успішний status check workflow CI перед merge;
- вимагати, щоб гілка була актуальна перед merge, якщо це підтримує обраний hosting;
- обмежити права bypass лише відповідальним адміністраторам і періодично переглядати їх.

ADR 0003 визначає `main` як захищений production trunk **на рівні рішення**, але не є доказом, що ці налаштування вже застосовані. До фактичного налаштування не можна заявляти захист гілки або готовий release path.

## Налаштування CI

Увімкніть і перевірте workflow CI для Pull Request та змін у `main`. Його обов’язкові кореневі перевірки мають відповідати package scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm run ci` є локальним агрегатором цього набору разом із `pnpm format:check`; він має поширювати помилки workspace, а не повідомляти умовний успіх. У branch protection виберіть саме status check, який публікує фактичний workflow CI після його першого успішного запуску; не додавайте вигадану назву check вручну.

CI в цій основі не виконує deployment і не може бути інтерпретований як staging/production readiness. Не додавайте production secrets у CI та не створюйте workflow, що приймає платежі, публікує каталог або розгортає застосунки, доки окремі блокери й операційні gates не знято.

## Remote та доступи

- Remote має належати організації або обліковому запису, затвердженому для Life-MP; перевірте власника перед першим push.
- Використовуйте персональні доступи з найменшими потрібними правами; не передавайте токени через commit, issue, лог CI або `.env`.
- Налаштуйте CODEOWNERS і права команди так, щоб зміни до workflow, security/release документів та інфраструктури отримували незалежний review.
- Будь-які production credentials, backup targets, network policy й server inventory залишаються поза цим bootstrap і мають відповідати ADR 0004.

## Межа завершення

Цей runbook завершено коректно лише коли відповідальний власник окремо надасть докази: існування правильного remote, protected `main`, фактичного CI run і відсутності секретів у початковому import. Поки таких доказів немає, стан Git/GitHub/CI — **не перевірено**, а production — **не готово**.
