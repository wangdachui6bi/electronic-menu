#!/usr/bin/env bash
set -euo pipefail

# ========================================
# 手动部署 menu-app 到 /srv/menu-app
# Usage: ./deploy.sh [ssh-host]
#   ssh-host: SSH config 里的 Host 别名或 user@ip（默认 niuniu）
# ========================================

SERVER="${1:-niuniu}"
DEPLOY_PATH="/srv/menu-app"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 .env 文件，请先复制 .env.example 并填写运行时配置"
  exit 1
fi

echo "==> 同步文件到 $SERVER:$DEPLOY_PATH"
ssh "$SERVER" "mkdir -p $DEPLOY_PATH"

rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude android \
  --exclude .idea \
  --exclude '*.log' \
  ./ "$SERVER:$DEPLOY_PATH/"

echo "==> 构建并启动"
ssh "$SERVER" "cd $DEPLOY_PATH && docker compose up -d --build --remove-orphans && docker image prune -f"

echo "==> 完成！"
