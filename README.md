# Inventory & Order Management (Microservices)

Production-style microservices system with Express.js (Node.js), MySQL, JWT auth, and React frontend.

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
- **Gateway API:** `http://localhost:8000`

To stop the application:
```bash
docker-compose down
```

### 2. Running Services Locally (Development)

If you prefer to run the components individually for development:

**Backend Services:**
Navigate into each service directory, install dependencies, and run using `node`:

```bash
cd services/<service-name>
npm install
node index.js
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

- Each domain service uses its own MySQL schema (managed automatically by Sequelize sync).
- Services communicate via async REST (`axios`).
- JWT claims contain `userId` and `role`.
- Gateway validates JWT for protected routes and forwards user context headers.
