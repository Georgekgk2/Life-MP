# ЛАЙФ — Ukrainian Multi-Vendor Marketplace

## Project Overview

**Product:** Ukrainian multi-vendor marketplace for eco, natural, and artisan goods
**Language:** Ukrainian
**Market:** Ukraine (UAH currency)
**Timezone:** Europe/Kyiv
**Tech Stack:**
- Frontend: Next.js 14+ (App Router, TypeScript)
- Backend: Medusa v2 (TypeScript)
- CMS: Payload CMS
- Database: PostgreSQL 16
- Cache/Queue: Redis + BullMQ
- Storage: Cloudflare R2
- Video: Cloudflare Stream or Mux
- CDN/DNS/WAF: Cloudflare
- Deploy: Docker Compose, GitHub Actions, Hetzner CX31
- Payments: LiqPay / Fondy / WayForPay (one to be selected)
- Shipping: Nova Poshta API

## Agent Guidelines

### Safety & Security

- **NEVER** commit secrets, API keys, or credentials to Git
- **NEVER** expose `.env` files, auth tokens, or payment credentials
- **NEVER** store credit card data directly
- **ALWAYS** use environment variables for secrets
- **ALWAYS** validate user input with Zod schemas
- **ALWAYS** hash passwords with modern algorithms (bcrypt/argon2)
- **ALWAYS** use HTTPS in production
- **ALWAYS** implement rate limiting on auth, forms, and API endpoints
- **ALWAYS** sanitize file uploads (MIME, size, extension whitelist)

### E-Commerce Specific Rules

- **NEVER** publish products without `approved` status
- **NEVER** allow vendor A to see vendor B's data, orders, or customers
- **NEVER** display unmoderated medical/health claims
- **NEVER** auto-publish content with therapeutic claims without review
- **ALWAYS** use idempotent payment webhooks
- **ALWAYS** create parent order + vendor child orders for multi-vendor carts
- **ALWAYS** verify payment status before fulfillment
- **ALWAYS** log audit trail for critical admin actions

### Compliance Rules (Ukraine)

- Food products: display ingredients, allergens, nutrition facts, storage conditions, best before date, producer info
- Medical claims: require legal review before publishing
- Psychological services: include emergency contact disclaimer
- Advertising: comply with Ukrainian advertising laws for medical services
- Privacy: comply with Ukrainian data protection regulations

### Code Quality

- TypeScript strict mode
- ESLint + Prettier
- Vitest for unit/integration tests
- Playwright for E2E tests
- All changes via Pull Request
- Lint, typecheck, tests, build must pass before merge

### Git Workflow

- `main` — захищений production trunk. Прямі та примусові оновлення заборонені; зміни надходять через Pull Request.
- `feature/*` і `fix/*` — короткоживучі гілки від `main`; Pull Request спрямовується до `main`, а гілка видаляється після merge.
- Staging отримує вже зібраний image з commit у `main`; для promotion образ не перебудовується.
- Production отримує лише схвалений immutable image за tag і digest; під час promotion образ не перебудовується та не підміняється.
- Цей документ встановлює процес, але не є доказом налаштованих GitHub rulesets або branch policy у налаштуваннях репозиторію.

### Docker Rules

- Use `docker-compose.dev.yml` for local development
- Use `docker-compose.staging.yml` for staging
- Use `docker-compose.production.yml` for production
- Never run `docker system prune` or `docker volume rm` without explicit approval
- Use named volumes for PostgreSQL, Redis
- Use healthchecks for all services
- Set memory limits per container

### Database Rules

- Always create migrations for schema changes
- Never drop production database without backup
- Test migrations on staging before production
- Use transactions for multi-step operations
- Backup before any migration

### API Rules

- All integrations via adapters/interfaces
- No provider-specific code in UI or business logic
- Webhooks must be idempotent
- External requests: timeout, retry, structured logging, correlation ID
- Payment/shipping secrets: server-side only

## Architecture

```
Life-MP/
├── apps/
│   ├── storefront/          # Next.js customer-facing app
│   ├── commerce/            # Medusa v2 backend + modules
│   └── admin-portal/        # Admin UI (optional, may use Medusa Admin)
│
├── packages/
│   ├── ui/                  # Shared UI components / design tokens
│   ├── config/              # ESLint, TS, Tailwind config
│   ├── types/               # Shared DTOs/types
│   └── eslint-config/
│
├── infra/
│   ├── docker/              # Dockerfiles
│   ├── compose/             # Docker Compose files
│   ├── caddy/               # Caddy reverse proxy config
│   └── scripts/             # Deployment scripts
│
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   ├── api/                 # API documentation
│   ├── runbooks/            # Operational runbooks
│   ├── decisions/           # Business decisions
│   └── product/             # Product specifications
│
├── .github/
│   └── workflows/           # CI/CD workflows
│
├── docker-compose.dev.yml
├── docker-compose.staging.yml
├── docker-compose.production.yml
├── Makefile
└── README.md
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/life_db
REDIS_URL=redis://localhost:6379

# Medusa
MEDUSA_SECRET_KEY=your-secret-key
MEDUSA_ADMIN_EMAIL=admin@life.ua
MEDUSA_ADMIN_PASSWORD=secure-password

# Payment (select one)
LIQPAY_PUBLIC_KEY=
LIQPAY_PRIVATE_KEY=
# OR
FONDY_MERCHANT_ID=
FONDY_SECRET_KEY=

# Shipping
NOVA_POSHTA_API_KEY=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Email
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
```

## Useful Commands

```bash
# Development
make dev                    # Start local development
make test                   # Run all tests
make lint                   # Run linter
make typecheck              # Run type checker
make build                  # Build all packages

# Docker
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f

# Database
make db-migrate             # Run migrations
make db-seed                # Seed database
make db-backup              # Backup database

# Deployment
make deploy-staging         # Deploy to staging
make deploy-production      # Deploy to production (requires approval)
```

## Key Contacts

- **Product Owner:** [TBD]
- **Technical Lead:** [TBD]
- **DevOps:** [TBD]

## Documentation

- Architecture: `docs/adr/`
- API: `docs/api/`
- Runbooks: `docs/runbooks/`
- Decisions: `docs/decisions/`
- Product: `docs/product/`
