# =============================================================================
# Локальні команди Life-MP
# =============================================================================

COMPOSE := docker compose --env-file .env.example -f docker-compose.dev.yml

.PHONY: help dev build test lint typecheck format-check ci \
	dev-infra-up dev-infra-wait dev-infra-down dev-infra-logs \
	db-bootstrap commerce-migrate commerce-seed test-integration test-migrations test-fresh-state \
	db-backup db-restore db-reset docker-clean \
	deploy-staging deploy-production

help: ## Показати доступні команди
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Розробка
# =============================================================================

dev: ## Запустити локальний застосунок через кореневий pnpm-скрипт
	pnpm dev

dev-infra-up: ## Запустити лише локальні PostgreSQL і Redis
	$(COMPOSE) up --detach

dev-infra-wait: ## Очікувати готовності локальних PostgreSQL та Redis
	@printf '%s\n' "Очікування готовності PostgreSQL та Redis..."
	@until $(COMPOSE) exec -T postgres psql -h 127.0.0.1 -U life_local -d life_local -c "SELECT 1;" >/dev/null 2>&1; do sleep 1; done
	@until $(COMPOSE) exec -T redis redis-cli ping >/dev/null 2>&1; do sleep 1; done
dev-infra-down: ## Зупинити локальні сервіси, зберігши дані
	$(COMPOSE) down --remove-orphans

dev-infra-logs: ## Показати журнали локальних сервісів даних
	$(COMPOSE) logs --follow

db-bootstrap: ## Ініціалізувати бази даних та ролі life_medusa_* у локальному Postgres
	@printf '%s\n' "Ініціалізація баз даних та ролей Medusa..."
	@$(COMPOSE) exec -T postgres psql -h 127.0.0.1 -U life_local -d life_local -f /docker-entrypoint-initdb.d/001-catalog-provider-core.sql

commerce-migrate: ## Запустити міграції Medusa для локального розробницького середовища
	scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run db:migrate

commerce-seed: ## Засіяти локальну базу синтетичними некомерційними даними каталогу
	ALLOW_SYNTHETIC_CATALOG=true scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run seed

test-integration: ## Запустити HTTP інтеграційні тести commerce
	pnpm run test:integration

test-migrations: ## Запустити тести ідемпотентності міграцій commerce
	pnpm run test:migrations
test-fresh-state: ## Запустити повну перевірку з чистого стану Docker (down -v -> up -> migrate -> seed -> test)
	@LIFE_ALLOW_DESTRUCTIVE_LOCAL_RESET=true ./scripts/test-fresh-state-repro.sh

# =============================================================================
# Кореневі pnpm-скрипти
# =============================================================================

build: ## Зібрати всі пакети
	pnpm build

test: ## Виконати тести
	pnpm test

lint: ## Перевірити стиль коду
	pnpm lint

typecheck: ## Перевірити типи
	pnpm typecheck

format-check: ## Перевірити форматування без змін
	pnpm format:check

ci: ## Запустити локальний CI через кореневий pnpm-скрипт
	pnpm run ci

# =============================================================================
# Локальні дані
# =============================================================================

db-backup: ## Створити резервну копію лише локальної PostgreSQL
	@mkdir -p backups
	@backup="backups/life_medusa_dev_$$(date +%Y%m%d_%H%M%S).sql"; \
		printf '%s\n' "Створення локальної резервної копії: $$backup"; \
		$(COMPOSE) exec -T postgres pg_dump --username=life_medusa_dev --dbname=life_medusa_dev > "$$backup"

db-restore: ## [ЛОКАЛЬНО, РУЙНІВНО] Відновити PostgreSQL з FILE=backups/файл.sql
	@if [ -z "$(FILE)" ]; then printf '%s\n' "Використання: make db-restore FILE=backups/файл.sql"; exit 1; fi
	@if [ ! -f "$(FILE)" ]; then printf '%s\n' "Файл резервної копії не знайдено: $(FILE)"; exit 1; fi
	@printf '%s\n' "ПОПЕРЕДЖЕННЯ: ЛИШЕ ЛОКАЛЬНО. Відновлення перезапише дані PostgreSQL."
	@printf "%s" "Введіть restore-local-data для продовження: "
	@read confirmation; [ "$$confirmation" = "restore-local-data" ] || { printf '%s\n' "Скасовано."; exit 1; }
	$(COMPOSE) exec -T postgres psql --set ON_ERROR_STOP=1 --username=life_medusa_dev --dbname=life_medusa_dev < "$(FILE)"

db-reset: ## [ЛОКАЛЬНО, РУЙНІВНО] Видалити й заново створити локальні дані
	@printf '%s\n' "ПОПЕРЕДЖЕННЯ: ЛИШЕ ЛОКАЛЬНО. Це безповоротно видалить дані PostgreSQL і Redis."
	@printf "%s" "Введіть reset-local-data для продовження: "
	@read confirmation; [ "$$confirmation" = "reset-local-data" ] || { printf '%s\n' "Скасовано."; exit 1; }
	$(COMPOSE) down --volumes --remove-orphans
	$(COMPOSE) up --detach

docker-clean: ## [ЛОКАЛЬНО, РУЙНІВНО] Зупинити сервіси й видалити їхні томи
	@printf '%s\n' "ПОПЕРЕДЖЕННЯ: ЛИШЕ ЛОКАЛЬНО. Це безповоротно видалить дані PostgreSQL і Redis."
	@printf "%s" "Введіть delete-local-data для продовження: "
	@read confirmation; [ "$$confirmation" = "delete-local-data" ] || { printf '%s\n' "Скасовано."; exit 1; }
	$(COMPOSE) down --volumes --remove-orphans

# =============================================================================
# Розгортання
# =============================================================================

deploy-staging: ## Не підтримується: staging-розгортання не реалізовано
	@printf '%s\n' "ERROR: staging deployment is unimplemented; жодного розгортання не виконано." >&2
	@exit 1

deploy-production: ## Не підтримується: production-розгортання не реалізовано
	@printf '%s\n' "ERROR: production deployment is unimplemented; жодного розгортання не виконано." >&2
	@exit 1
