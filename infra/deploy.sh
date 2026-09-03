#!/usr/bin/env bash
# ============================================================
# Safe, near-zero-downtime deploy for the H b&s Digital stack.
# Run on the VPS from the repo root, or via the GitHub Action.
#
#   ./infra/deploy.sh
#
# Static content is bind-mounted, so a content-only change goes live
# the instant `git pull` updates the files — nginx keeps serving
# throughout. Containers are only recreated if infra actually changed.
# ============================================================
set -euo pipefail

# Move to the repo root (parent of this script's dir)
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
echo "▶ Deploying from ${REPO_ROOT}"

BRANCH="${DEPLOY_BRANCH:-main}"

echo "▶ Fetching latest from origin/${BRANCH}..."
git fetch --all --prune
# Force the working tree to match origin. .env is gitignored and lives
# only on the server, so it is never touched by this reset.
git reset --hard "origin/${BRANCH}"

echo "▶ Applying stack..."
cd infra
docker compose pull --quiet || true
docker compose up -d --remove-orphans

echo "▶ Pruning dangling images..."
docker image prune -f >/dev/null || true

echo "✅ Deploy complete."
docker compose ps
