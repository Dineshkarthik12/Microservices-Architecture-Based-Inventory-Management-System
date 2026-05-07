#!/usr/bin/env bash
# =============================================================================
# GCP Cloud Run Teardown Script
# Removes all deployed resources to avoid ongoing charges
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="ims-repo"
SQL_INSTANCE_NAME="ims-mysql"

SERVICES=("auth-service" "inventory-service" "order-service" "notification-service" "gateway" "frontend")

echo "============================================="
echo "  IMS Cloud Run Teardown"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "============================================="
echo ""
read -p "Are you sure you want to delete ALL resources? (yes/no): " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

# ─── Delete Cloud Run services ───────────────────────────────────────────────
echo ""
echo "[1/3] Deleting Cloud Run services..."
for SVC in "${SERVICES[@]}"; do
  if gcloud run services describe "${SVC}" \
    --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud run services delete "${SVC}" \
      --region="${REGION}" --project="${PROJECT_ID}" --quiet
    echo "  -> Deleted ${SVC}"
  else
    echo "  -> ${SVC} not found, skipping."
  fi
done

# ─── Delete Cloud SQL instance ───────────────────────────────────────────────
echo ""
echo "[2/3] Deleting Cloud SQL instance..."
if gcloud sql instances describe "${SQL_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" &>/dev/null; then
  gcloud sql instances delete "${SQL_INSTANCE_NAME}" \
    --project="${PROJECT_ID}" --quiet
  echo "  -> Deleted Cloud SQL instance: ${SQL_INSTANCE_NAME}"
else
  echo "  -> Cloud SQL instance not found, skipping."
fi

# ─── Delete Artifact Registry repository ─────────────────────────────────────
echo ""
echo "[3/3] Deleting Artifact Registry repository..."
if gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories delete "${REPO_NAME}" \
    --location="${REGION}" --project="${PROJECT_ID}" --quiet
  echo "  -> Deleted repository: ${REPO_NAME}"
else
  echo "  -> Repository not found, skipping."
fi

echo ""
echo "============================================="
echo "  Teardown Complete!"
echo "============================================="
