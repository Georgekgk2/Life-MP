# =============================================================================
# Локальні команди Life-MP
# =============================================================================

COMPOSE := docker compose -f docker-compose.dev.yml

.PHONY: help dev build test lint typecheck format-check ci \
	dev-infra-up dev-infra-down dev-infra-logs \
	db-backup db-restore db-reset docker-clean \
	deploy-staging deploy-production

help: ## Показати доступні команди
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Розробка
# =============================================================================

dev: ## Запустити локальний застосунок через кореневий pnpm-скрипт
	pnpm dev

dev-infra-up: ## Запустити лише локальні PostgreSQL і Redis
	$(COMPOSE) up --detach

dev-infra-down: ## Зупинити локальні сервіси, зберігши дані
	$(COMPOSE) down --remove-orphans

dev-infra-logs: ## Показати журнали локальних сервісів даних
	$(COMPOSE) logs --follow

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
	@backup="backups/life_local_$$(date +%Y%m%d_%H%M%S).sql"; \
		printf '%s\n' "Створення локальної резервної копії: $$backup"; \
		$(COMPOSE) exec -T postgres pg_dump --username=life_local --dbname=life_local > "$$backup"

db-restore: ## [ЛОКАЛЬНО, РУЙНІВНО] Відновити PostgreSQL з FILE=backups/файл.sql
	@if [ -z "$(FILE)" ]; then printf '%s\n' "Використання: make db-restore FILE=backups/файл.sql"; exit 1; fi
	@if [ ! -f "$(FILE)" ]; then printf '%s\n' "Файл резервної копії не знайдено: $(FILE)"; exit 1; fi
	@printf '%s\n' "ПОПЕРЕДЖЕННЯ: ЛИШЕ ЛОКАЛЬНО. Відновлення перезапише дані PostgreSQL."
	@printf "%s" "Введіть restore-local-data для продовження: "
	@read confirmation; [ "$$confirmation" = "restore-local-data" ] || { printf '%s\n' "Скасовано."; exit 1; }
	$(COMPOSE) exec -T postgres psql --set ON_ERROR_STOP=1 --username=life_local --dbname=life_local < "$(FILE)"

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
