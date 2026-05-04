# Inventory & Order Management (Microservices)

Production-style microservices system with FastAPI, MySQL, JWT auth, and React frontend.

## Services

- `gateway` - API gateway and JWT validation/forwarding
- `auth-service` - signup/login/token validation
- `inventory-service` - product catalog and stock management
- `order-service` - order placement and orchestration
- `notification-service` - email notifications
- `frontend` - React + Tailwind UI

## How to Run the Application

### 1. Using Docker (Recommended)

To start the entire stack (backend microservices, frontend, and database) using Docker Compose:

```bash
docker-compose up --build
```

Access the application:
- **Frontend UI:** `http://localhost:3000`
- **Gateway (Swagger Docs):** `http://localhost:8000/docs`

To stop the application:
```bash
docker-compose down
```

### 2. Running Services Locally (Development)

If you prefer to run the components individually for development:

**Backend Services:**
Navigate into each service directory, install dependencies, and run using `uvicorn`:

```bash
cd services/<service-name>
pip install -r requirements.txt
uvicorn app.main:app --reload --port <service-port>
```
*(Service Ports: Gateway: 8000, Auth: 8001, Inventory: 8002, Order: 8003, Notification: 8004)*

**Frontend:**
The React frontend is located in the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```
**Start MySQL:**
```bash
docker exec -it ims-mysql mysql -u -p
show databases;
use DATABASE_NAME;
show tables;
```

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

