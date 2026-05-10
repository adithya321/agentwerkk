#!/bin/bash
# Verify all required .env.local vars are set before running the pipeline

ENV_FILE=".env.local"

REQUIRED_VARS=(
  "CLOD_API_KEY"
  "CLOD_BASE_URL"
  "ALLSCALE_API_KEY"
  "ALLSCALE_API_SECRET"
  "GITHUB_TOKEN"
  "GITHUB_OWNER"
  "GITHUB_REPO"
  "AGENT_WALLET_REPO_SCOUT"
  "AGENT_WALLET_DOCS_SCOUT"
  "AGENT_WALLET_FIX_AGENT"
  "REPUTATION_CONTRACT_ADDRESS"
  "NIA_MCP_URL"
)

OPTIONAL_VARS=(
  "CLUSTLY_API_KEY"
  "SIMULATE_CLUSTLY"
)

if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE not found. Copy .env.example and fill in values."
  exit 1
fi

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -qE "^${var}=.+" "$ENV_FILE"; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌  Missing required vars in $ENV_FILE:"
  for var in "${MISSING[@]}"; do
    echo "    - $var"
  done
  echo ""
  echo "Optional vars (need at least one of CLUSTLY_API_KEY or SIMULATE_CLUSTLY=true):"
  for var in "${OPTIONAL_VARS[@]}"; do
    if grep -qE "^${var}=.+" "$ENV_FILE"; then
      echo "    ✅ $var"
    else
      echo "    ⬜ $var"
    fi
  done
  exit 1
fi

# Check Clustly: need either API key or simulation flag
if ! grep -qE "^CLUSTLY_API_KEY=.+" "$ENV_FILE" && ! grep -qE "^SIMULATE_CLUSTLY=true" "$ENV_FILE"; then
  echo "❌  Set either CLUSTLY_API_KEY or SIMULATE_CLUSTLY=true in $ENV_FILE"
  exit 1
fi

echo "✅  All required env vars are set. Ready to run."
