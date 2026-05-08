#!/usr/bin/env bash
# =============================================================================
# GCP Initial Setup Script
# Sets up Workload Identity Federation for GitHub Actions + Cloud SQL
# Run this ONCE before the first deployment
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-microinventory}"
REGION="${GCP_REGION:-us-central1}"
GITHUB_REPO="${GITHUB_REPO:-Dineshkarthik12/Microservices-Architecture-Based-Inventory-Management-System}"

SA_NAME="ims-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
REPO_NAME="ims-repo"
SQL_INSTANCE_NAME="ims-mysql"
SQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"

echo "============================================="
echo "  IMS - GCP Initial Setup"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "  GitHub:  ${GITHUB_REPO}"
echo "============================================="

# ─── Step 1: Enable APIs ─────────────────────────────────────────────────────
echo ""
echo "[1/7] Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}" --quiet
echo "  -> APIs enabled."

# ─── Step 2: Create Service Account ──────────────────────────────────────────
echo ""
echo "[2/7] Creating service account..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" \
  --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="IMS Cloud Run Deployer" \
    --project="${PROJECT_ID}"
  echo "  -> Created service account: ${SA_EMAIL}"
else
  echo "  -> Service account already exists."
fi

# Grant required roles
echo "  -> Granting IAM roles..."
ROLES=(
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/iam.serviceAccountUser"
  "roles/cloudsql.client"
  "roles/cloudsql.admin"
)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet &>/dev/null
  echo "     Granted: ${ROLE}"
done

# ─── Step 3: Workload Identity Federation ─────────────────────────────────────
echo ""
echo "[3/7] Setting up Workload Identity Federation..."

# Create pool
if ! gcloud iam workload-identity-pools describe "${POOL_NAME}" \
  --location=global --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam workload-identity-pools create "${POOL_NAME}" \
    --location=global \
    --display-name="GitHub Actions Pool" \
    --project="${PROJECT_ID}"
  echo "  -> Created workload identity pool."
else
  echo "  -> Pool already exists."
fi

# Create provider
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --workload-identity-pool="${POOL_NAME}" \
  --location=global --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
    --workload-identity-pool="${POOL_NAME}" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --project="${PROJECT_ID}"
  echo "  -> Created OIDC provider."
else
  echo "  -> Provider already exists."
fi

# Allow GitHub to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}" \
  --project="${PROJECT_ID}" --quiet
echo "  -> Bound GitHub repo to service account."

# ─── Step 4: Artifact Registry ───────────────────────────────────────────────
echo ""
echo "[4/7] Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --description="Inventory Management System images"
  echo "  -> Created repository."
else
  echo "  -> Repository already exists."
fi

# ─── Step 5: Cloud SQL ───────────────────────────────────────────────────────
echo ""
echo "[5/7] Provisioning Cloud SQL instance..."
if ! gcloud sql instances describe "${SQL_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" &>/dev/null; then
  gcloud sql instances create "${SQL_INSTANCE_NAME}" \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --root-password="${SQL_ROOT_PASSWORD}" \
    --project="${PROJECT_ID}" \
    --storage-auto-increase \
    --availability-type=zonal \
    --quiet
  echo "  -> Cloud SQL instance created (this may take a few minutes)."
else
  echo "  -> Cloud SQL instance already exists."
fi

# Create databases
echo "  -> Creating databases..."
for DB_NAME in auth_db inventory_db order_db; do
  if ! gcloud sql databases describe "${DB_NAME}" \
    --instance="${SQL_INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud sql databases create "${DB_NAME}" \
      --instance="${SQL_INSTANCE_NAME}" --project="${PROJECT_ID}" --quiet
    echo "     Created: ${DB_NAME}"
  else
    echo "     ${DB_NAME} already exists."
  fi
done

SQL_CONNECTION_NAME=$(gcloud sql instances describe "${SQL_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" --format='value(connectionName)')

# ─── Step 6: Output WIF values ───────────────────────────────────────────────
echo ""
echo "[6/7] Retrieving Workload Identity Federation values..."

PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
WIF_SERVICE_ACCOUNT="${SA_EMAIL}"

echo ""
echo "============================================="
echo "[7/7] Setup Complete! Add these GitHub Secrets:"
echo "============================================="
echo ""
echo "  GCP_PROJECT_ID        = ${PROJECT_ID}"
echo "  WIF_PROVIDER          = ${WIF_PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT   = ${WIF_SERVICE_ACCOUNT}"
echo "  MYSQL_ROOT_PASSWORD   = ${SQL_ROOT_PASSWORD}"
echo "  JWT_SECRET            = (your JWT secret)"
echo "  SMTP_HOST             = (your SMTP host)"
echo "  SMTP_USERNAME         = (your SMTP username)"
echo "  SMTP_PASSWORD         = (your SMTP password)"
echo "  SMTP_FROM             = (your sender email)"
echo ""
echo "  Cloud SQL Connection: ${SQL_CONNECTION_NAME}"
echo ""
echo "============================================="
