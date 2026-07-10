#!/usr/bin/env bash
# Builds both the Orgni landing site and the Orgni product app into a single
# static output that Vercel serves:
#   /      -> landing site (apps/frontend)
#   /app/  -> product app   (apps/product)
set -euo pipefail

# 1. Landing site at the root ("/").
pnpm --filter @workspace/frontend run build

# 2. Product app served under "/app/" (BASE_PATH rewrites its asset URLs).
BASE_PATH=/app/ pnpm --filter @workspace/product run build

# 3. Nest the app build inside the landing output at /app.
APP_OUT="apps/frontend/dist/public/app"
rm -rf "$APP_OUT"
mkdir -p "$APP_OUT"
cp -r apps/product/dist/public/. "$APP_OUT/"

echo "Combined build ready: apps/frontend/dist/public (landing + /app)"
