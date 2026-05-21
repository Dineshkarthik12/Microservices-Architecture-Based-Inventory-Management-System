#!/usr/bin/env bash
# =============================================================================
# GCP Cloud Run Deployment Script
# Deploys: Cloud SQL (MySQL) + 5 backend services + 1 frontend to Cloud Run
# =============================================================================
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="ims-repo"
SQL_INSTANCE_NAME="ims-mysql"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
SQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"

# Service names
SERVICES=("auth-service" "inventory-service" "order-service" "notification-service" "gateway" "frontend")

# Environment secrets (set these or they'll use defaults)
JWT_SECRET="${JWT_SECRET:-super_secure_random_key_12345}"
JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"
JWT_EXPIRE_MINUTES="${JWT_EXPIRE_MINUTES:-120}"

SMTP_HOST="${SMTP_HOST:-smtp.mailtrap.io}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USERNAME="${SMTP_USERNAME:-your_smtp_user}"
SMTP_PASSWORD="${SMTP_PASSWORD:-your_smtp_pass}"
SMTP_FROM="${SMTP_FROM:-no-reply@example.com}"

echo "============================================="
echo "  IMS Cloud Run Deployment"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "============================================="

# ─── Step 1: Enable required APIs ────────────────────────────────────────────
echo ""
echo "[1/8] Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}" --quiet

# ─── Step 2: Create Artifact Registry repository ─────────────────────────────
echo ""
echo "[2/8] Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --description="Inventory Management System images"
  echo "  -> Created repository: ${REPO_NAME}"
else
  echo "  -> Repository ${REPO_NAME} already exists, skipping."
fi

# Configure Docker to push to Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

IMAGE_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# ─── Step 3: Provision Cloud SQL instance ─────────────────────────────────────
echo ""
echo "[3/8] Provisioning Cloud SQL (MySQL 8.0) instance..."
if ! gcloud sql instances describe "${SQL_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" &>/dev/null; then
  gcloud sql instances create "${SQL_INSTANCE_NAME}" \
    --database-version=MYSQL_8_0 \
    --tier="${SQL_TIER}" \
    --region="${REGION}" \
    --root-password="${SQL_ROOT_PASSWORD}" \
    --project="${PROJECT_ID}" \
    --storage-auto-increase \
    --availability-type=zonal \
    --quiet
  echo "  -> Cloud SQL instance created."
else
  echo "  -> Cloud SQL instance ${SQL_INSTANCE_NAME} already exists."
fi

# Create databases
echo "  -> Creating databases..."
for DB_NAME in auth_db inventory_db order_db; do
  if ! gcloud sql databases describe "${DB_NAME}" \
    --instance="${SQL_INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud sql databases create "${DB_NAME}" \
      --instance="${SQL_INSTANCE_NAME}" --project="${PROJECT_ID}" --quiet
    echo "     Created database: ${DB_NAME}"
  else
    echo "     Database ${DB_NAME} already exists."
  fi
done

# Get Cloud SQL connection name
SQL_CONNECTION_NAME=$(gcloud sql instances describe "${SQL_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" --format='value(connectionName)')
echo "  -> Connection name: ${SQL_CONNECTION_NAME}"

# Build the DATABASE_URL for each service using Cloud SQL Proxy socket
# Cloud Run's built-in Cloud SQL connector uses Unix sockets
DB_URL_PREFIX="mysql://root:${SQL_ROOT_PASSWORD}@localhost"
DB_URL_SUFFIX="?socketPath=/cloudsql/${SQL_CONNECTION_NAME}"

AUTH_DATABASE_URL="${DB_URL_PREFIX}/auth_db${DB_URL_SUFFIX}"
INVENTORY_DATABASE_URL="${DB_URL_PREFIX}/inventory_db${DB_URL_SUFFIX}"
ORDER_DATABASE_URL="${DB_URL_PREFIX}/order_db${DB_URL_SUFFIX}"

# ─── Step 4: Build all Docker images ─────────────────────────────────────────
echo ""
echo "[4/8] Building Docker images..."
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

for SVC in auth-service inventory-service order-service notification-service gateway; do
  echo "  -> Building ${SVC}..."
  docker build -t "${IMAGE_PREFIX}/${SVC}:latest" "${ROOT_DIR}/services/${SVC}"
done

echo "  -> Building frontend..."
docker build -t "${IMAGE_PREFIX}/frontend:latest" "${ROOT_DIR}/frontend"

# ─── Step 5: Push all Docker images ──────────────────────────────────────────
echo ""
echo "[5/8] Pushing Docker images to Artifact Registry..."
for SVC in "${SERVICES[@]}"; do
  echo "  -> Pushing ${SVC}..."
  docker push "${IMAGE_PREFIX}/${SVC}:latest"
done

# ─── Step 6: Deploy backend services to Cloud Run ─────────────────────────────
echo ""
echo "[6/8] Deploying backend services to Cloud Run..."

# --- auth-service ---
echo "  -> Deploying auth-service..."
gcloud run deploy auth-service \
  --image="${IMAGE_PREFIX}/auth-service:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=8000 \
  --allow-unauthenticated \
  --add-cloudsql-instances="${SQL_CONNECTION_NAME}" \
  --set-env-vars="DATABASE_URL=${AUTH_DATABASE_URL},JWT_SECRET=${JWT_SECRET},JWT_ALGORITHM=${JWT_ALGORITHM},JWT_EXPIRE_MINUTES=${JWT_EXPIRE_MINUTES},SERVICE_NAME=auth-service" \
  --min-instances=0 \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

AUTH_URL=$(gcloud run services describe auth-service \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "     auth-service URL: ${AUTH_URL}"

# --- inventory-service ---
echo "  -> Deploying inventory-service..."
gcloud run deploy inventory-service \
  --image="${IMAGE_PREFIX}/inventory-service:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=8000 \
  --allow-unauthenticated \
  --add-cloudsql-instances="${SQL_CONNECTION_NAME}" \
  --set-env-vars="DATABASE_URL=${INVENTORY_DATABASE_URL},SERVICE_NAME=inventory-service" \
  --min-instances=0 \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

INVENTORY_URL=$(gcloud run services describe inventory-service \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "     inventory-service URL: ${INVENTORY_URL}"

# --- notification-service ---
echo "  -> Deploying notification-service..."
gcloud run deploy notification-service \
  --image="${IMAGE_PREFIX}/notification-service:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=8000 \
  --allow-unauthenticated \
  --set-env-vars="SMTP_HOST=${SMTP_HOST},SMTP_PORT=${SMTP_PORT},SMTP_USERNAME=${SMTP_USERNAME},SMTP_PASSWORD=${SMTP_PASSWORD},SMTP_FROM=${SMTP_FROM},SERVICE_NAME=notification-service" \
  --min-instances=0 \
  --max-instances=2 \
  --memory=256Mi \
  --cpu=1 \
  --quiet

NOTIFICATION_URL=$(gcloud run services describe notification-service \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "     notification-service URL: ${NOTIFICATION_URL}"

# --- order-service ---
echo "  -> Deploying order-service..."
gcloud run deploy order-service \
  --image="${IMAGE_PREFIX}/order-service:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=8000 \
  --allow-unauthenticated \
  --add-cloudsql-instances="${SQL_CONNECTION_NAME}" \
  --set-env-vars="DATABASE_URL=${ORDER_DATABASE_URL},INVENTORY_SERVICE_URL=${INVENTORY_URL},NOTIFICATION_SERVICE_URL=${NOTIFICATION_URL},SERVICE_NAME=order-service" \
  --min-instances=0 \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

ORDER_URL=$(gcloud run services describe order-service \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "     order-service URL: ${ORDER_URL}"

# ─── Step 7: Deploy gateway ──────────────────────────────────────────────────
echo ""
echo "[7/8] Deploying gateway..."
gcloud run deploy gateway \
  --image="${IMAGE_PREFIX}/gateway:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=8000 \
  --allow-unauthenticated \
  --set-env-vars="AUTH_SERVICE_URL=${AUTH_URL},INVENTORY_SERVICE_URL=${INVENTORY_URL},ORDER_SERVICE_URL=${ORDER_URL},NOTIFICATION_SERVICE_URL=${NOTIFICATION_URL},JWT_SECRET=${JWT_SECRET},JWT_ALGORITHM=${JWT_ALGORITHM},SERVICE_NAME=gateway" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

GATEWAY_URL=$(gcloud run services describe gateway \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "     gateway URL: ${GATEWAY_URL}"

# ─── Step 8: Deploy frontend ─────────────────────────────────────────────────
echo ""
echo "[8/8] Deploying frontend..."
gcloud run deploy frontend \
  --image="${IMAGE_PREFIX}/frontend:latest" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port=80 \
  --allow-unauthenticated \
  --set-env-vars="VITE_API_BASE_URL=${GATEWAY_URL}" \
  --min-instances=0 \
  --max-instances=3 \
  --memory=256Mi \
  --cpu=1 \
  --quiet

FRONTEND_URL=$(gcloud run services describe frontend \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "============================================="
echo "  Deployment Complete!"
echo "============================================="
echo ""
echo "  Frontend:      ${FRONTEND_URL}"
echo "  Gateway API:   ${GATEWAY_URL}"
echo "  Auth Service:  ${AUTH_URL}"
echo "  Inventory:     ${INVENTORY_URL}"
echo "  Orders:        ${ORDER_URL}"
echo "  Notifications: ${NOTIFICATION_URL}"
echo ""
echo "  Cloud SQL:     ${SQL_CONNECTION_NAME}"
echo ""
echo "  NOTE: Update your frontend's VITE_API_BASE_URL"
echo "  to point to: ${GATEWAY_URL}"
echo "============================================="
