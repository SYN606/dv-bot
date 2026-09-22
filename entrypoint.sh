#!/usr/bin/env bash
# ==============================================================================
# DV-BOT Production Entrypoint Script for Linux VPS
# Graceful lifecycle manager, environment validator, and signal handler
# ==============================================================================

set -Eeuo pipefail

# 1. Resolve Project Root Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
    echo "❌ Error: Bun runtime was not found on this system." >&2
    echo "💡 Install Bun using: curl -fsSL https://bun.sh/install | bash" >&2
    exit 1
  fi
fi

echo "=========================================================="
echo "🤖 Starting DV-BOT (Bun $(bun --version))"
echo "📂 Working Directory: $SCRIPT_DIR"
echo "=========================================================="

# 3. Environment File Validation
if [ ! -f ".env" ]; then
  if [ -f "example.env" ]; then
    echo "⚠️ Warning: .env not found. Copying from example.env..."
    cp example.env .env
    echo "❗ Please configure your DISCORD_TOKEN in .env before starting."
    exit 1
  else
    echo "❌ Error: Neither .env nor example.env found. Please create .env." >&2
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


# 5. Dependency Check
if [ ! -d "node_modules" ]; then
  echo "📦 Dependencies missing. Running 'bun install'..."
  bun install --frozen-lockfile 2>/dev/null || bun install
fi

# 6. Ensure Web Dashboard Frontend Build Exists
if [ ! -f "src/web/dist/index.html" ]; then
  echo "🌐 Frontend build missing. Building web dashboard assets..."
  bun run build:web
fi

# 7. Process Lifecycle & Graceful Signal Propagation
CHILD_PID=0

graceful_shutdown() {
  local signal_name="$1"
  echo ""
  echo "🛑 [ENTRYPOINT] Caught signal ${signal_name}. Forwarding to bot for graceful termination..."
  
  if [ "$CHILD_PID" -ne 0 ] && kill -0 "$CHILD_PID" 2>/dev/null; then
    # Forward termination signal to bot process
    kill "-$signal_name" "$CHILD_PID" 2>/dev/null || true
    
    # Wait for bot process to complete internal cleanup (flushing analytics, closing DB, etc.)
    echo "⏳ [ENTRYPOINT] Waiting for process ${CHILD_PID} to cleanly flush state..."
    wait "$CHILD_PID" 2>/dev/null || true
  fi

  echo "✅ [ENTRYPOINT] Bot stopped cleanly. Exiting."
  exit 0
}

# Trap common termination signals
trap 'graceful_shutdown SIGTERM' SIGTERM
trap 'graceful_shutdown SIGINT'  SIGINT
trap 'graceful_shutdown SIGHUP'  SIGHUP
trap 'graceful_shutdown SIGQUIT' SIGQUIT

# 8. Start Bot Process in Background
echo "🚀 [ENTRYPOINT] Launching bot runtime..."
bun run src/bot.js "$@" &
CHILD_PID=$!

echo "✨ [ENTRYPOINT] DV-BOT is live (PID: $CHILD_PID)"

# 9. Wait for Process with Signal Interception
# Using a loop wait to ensure traps fire immediately upon receiving signals
while kill -0 "$CHILD_PID" 2>/dev/null; do
  wait "$CHILD_PID" 2>/dev/null || true
done

EXIT_CODE=$?
echo "ℹ️ [ENTRYPOINT] Bot process exited with status $EXIT_CODE"
exit "$EXIT_CODE"
