# Inventory & Order Management (Microservices)

Production-style microservices system with FastAPI, MySQL, JWT auth, and React frontend.

## Services

- `gateway` - API gateway and JWT validation/forwarding
- `auth-service` - signup/login/token validation
- `inventory-service` - product catalog and stock management
- `order-service` - order placement and orchestration
- `notification-service` - email notifications
- `frontend` - React + Tailwind UI

## Quick start

1. Copy `.env.example` to `.env` and update values.
2. Build and run:
   - `docker compose up --build`
3. Access:
   - Frontend: `http://localhost:3000`
   - Gateway (Swagger): `http://localhost:8000/docs`

## Architecture notes

- Each domain service uses its own MySQL schema.
- Services communicate via async REST (`httpx`).
- JWT claims contain `userId` and `role`.
- Gateway validates JWT for protected routes and forwards user context headers.

## Migrations

Each data service contains Alembic config:

- `auth-service/alembic`
- `inventory-service/alembic`
- `order-service/alembic`

Run migrations in each container if needed:

- `alembic upgrade head`

