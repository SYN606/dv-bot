#!/usr/bin/env bash
# ==============================================================================
# DV-BOT Production Entrypoint Script for Linux VPS
# Graceful lifecycle manager, environment validator, and deployment logger
# ==============================================================================

set -Eeuo pipefail

# 1. Resolve Project Root Directory & Logs Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOGS_DIR="$SCRIPT_DIR/logs"
DEPLOY_LOG="$LOGS_DIR/deploy.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Deployment logger helper: outputs to console and appends to deploy.log
log_deploy() {
  local timestamp
  timestamp="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "[$timestamp] [DEPLOY] $*" | tee -a "$DEPLOY_LOG"
}

# Rotate deploy.log if exceeding 5MB (~50,000 lines)
if [ -f "$DEPLOY_LOG" ]; then
  LOG_SIZE_KB="$(du -k "$DEPLOY_LOG" 2>/dev/null | cut -f1 || echo 0)"
  if [ "$LOG_SIZE_KB" -gt 5120 ]; then
    log_deploy "Rotating deploy.log (>5MB). Retaining last 5000 lines..."
    tail -n 5000 "$DEPLOY_LOG" > "$DEPLOY_LOG.tmp" 2>/dev/null && mv "$DEPLOY_LOG.tmp" "$DEPLOY_LOG" || true
  fi
fi

log_deploy "=========================================================="
log_deploy "🚀 Starting DV-BOT Deployment & Lifecycle Manager"
log_deploy "📂 Working Directory: $SCRIPT_DIR"

# 2. Locate Bun Runtime
if ! command -v bun >/dev/null 2>&1; then
  # Check standard install locations
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  elif [ -x "/root/.bun/bin/bun" ]; then
    export PATH="/root/.bun/bin:$PATH"
  elif [ -x "/usr/local/bin/bun" ]; then
    export PATH="/usr/local/bin:$PATH"
  else
    log_deploy "❌ Error: Bun runtime was not found on this system."
    log_deploy "💡 Install Bun using: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
fi

BUN_VER="$(bun --version 2>/dev/null || echo 'unknown')"
log_deploy "⚡ Bun Runtime Version: $BUN_VER"

# Diagnostic Telemetry: Host, OS, and Git Revision
CURRENT_USER="$(whoami 2>/dev/null || echo 'unknown')"
HOST_INFO="$(uname -srm 2>/dev/null || echo 'Linux')"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'detached/none')"
GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
GIT_MSG="$(git log -1 --pretty=format:"%h - %an: %s (%cd)" 2>/dev/null || echo 'N/A')"
ULIMIT_FD="$(ulimit -n 2>/dev/null || echo 'unlimited')"

log_deploy "👤 User: $CURRENT_USER | Host OS: $HOST_INFO | Max FDs: $ULIMIT_FD"
log_deploy "🔖 Git Revision: $GIT_COMMIT (branch: $GIT_BRANCH)"
log_deploy "📝 Latest Commit: $GIT_MSG"

# 3. Environment File Validation
if [ ! -f ".env" ]; then
  if [ -f "example.env" ]; then
    log_deploy "⚠️ Warning: .env not found. Copying from example.env..."
    cp example.env .env
    log_deploy "❗ Please configure your DISCORD_TOKEN in .env before starting."
    exit 1
  else
    log_deploy "❌ Error: Neither .env nor example.env found. Please create .env."
    exit 1
  fi
fi

# 4. Ensure Database Directory Exists with Secure Permissions
if [ -z "${DB_DIR:-}" ] && [ -f ".env" ]; then
  ENV_DB_DIR="$(grep -E '^[[:space:]]*DB_DIR=' .env | head -n1 | cut -d '=' -f2- | tr -d ' "\r' || true)"
  if [ -n "$ENV_DB_DIR" ]; then
    export DB_DIR="$ENV_DB_DIR"
  fi
fi

TARGET_DB_DIR="${DB_DIR:-.DB_DND}"
mkdir -p "$TARGET_DB_DIR" 2>/dev/null || true
chmod 700 "$TARGET_DB_DIR" 2>/dev/null || true

DISK_FREE="$(df -h "$TARGET_DB_DIR" 2>/dev/null | tail -n 1 | awk '{print $4 " free of " $2}' || echo 'N/A')"
log_deploy "💾 Target Database Storage: $TARGET_DB_DIR ($DISK_FREE)"

# 5. Root & Frontend Dependency Check
if [ ! -d "node_modules" ]; then
  log_deploy "📦 Root dependencies missing. Executing 'bun install'..."
  INSTALL_START="$(date +%s)"
  bun install --frozen-lockfile 2>/dev/null || bun install
  INSTALL_DURATION=$(( $(date +%s) - INSTALL_START ))
  log_deploy "✅ Root dependencies installed in ${INSTALL_DURATION}s."
else
  log_deploy "📦 Root dependencies verified (node_modules present)."
fi

if [ ! -d "src/web/frontend/node_modules" ]; then
  log_deploy "📦 Frontend dependencies missing. Installing..."
  FRONT_START="$(date +%s)"
  (cd src/web/frontend && bun install)
  FRONT_DURATION=$(( $(date +%s) - FRONT_START ))
  log_deploy "✅ Frontend dependencies installed in ${FRONT_DURATION}s."
else
  log_deploy "📦 Frontend dependencies verified."
fi

# 6. Ensure Web Dashboard Frontend Build Exists
if [ ! -f "src/web/dist/index.html" ]; then
  log_deploy "🌐 Frontend production bundle missing. Building web dashboard assets..."
  BUILD_START="$(date +%s)"
  bun run build:web
  BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
  log_deploy "✅ Frontend build completed in ${BUILD_DURATION}s."
else
  log_deploy "🌐 Frontend production build verified (src/web/dist/index.html)."
fi

log_deploy "=========================================================="
log_deploy "🎉 Pre-flight deployment checks passed successfully."

# 7. Process Lifecycle & Graceful Signal Propagation
CHILD_PID=0
START_TIME="$(date +%s)"

graceful_shutdown() {
  local signal_name="$1"
  log_deploy "🛑 Caught signal ${signal_name}. Forwarding to bot for graceful termination..."
  
  if [ "$CHILD_PID" -ne 0 ] && kill -0 "$CHILD_PID" 2>/dev/null; then
    # Forward termination signal to bot process
    kill "-$signal_name" "$CHILD_PID" 2>/dev/null || true
    
    # Wait for bot process to complete internal cleanup (flushing analytics, closing DB, flushing logs)
    log_deploy "⏳ Waiting for process ${CHILD_PID} to cleanly flush state & logs..."
    wait "$CHILD_PID" 2>/dev/null || true
  fi

  local UPTIME=$(( $(date +%s) - START_TIME ))
  log_deploy "✅ Bot process stopped cleanly after ${UPTIME}s uptime. Exiting entrypoint."
  exit 0
}

# Trap common termination signals
trap 'graceful_shutdown SIGTERM' SIGTERM
trap 'graceful_shutdown SIGINT'  SIGINT
trap 'graceful_shutdown SIGHUP'  SIGHUP
trap 'graceful_shutdown SIGQUIT' SIGQUIT

# 8. Start Bot Process in Background
log_deploy "🚀 Launching bot runtime (bun run src/bot.js)..."
bun run src/bot.js "$@" &
CHILD_PID=$!

log_deploy "✨ DV-BOT is live (PID: $CHILD_PID)"

# 9. Wait for Process with Signal Interception
while kill -0 "$CHILD_PID" 2>/dev/null; do
  wait "$CHILD_PID" 2>/dev/null || true
done

EXIT_CODE=$?
UPTIME=$(( $(date +%s) - START_TIME ))
log_deploy "ℹ️ Bot process exited with status $EXIT_CODE (Uptime: ${UPTIME}s)"
exit "$EXIT_CODE"
