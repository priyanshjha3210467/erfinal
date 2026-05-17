#!/bin/bash
# ============================================================
# ExamReady — Security Patcher
# Run from your project root:  bash security-patch.sh
#
# Injects  <script src="security.js"></script>
# as the FIRST script in the <head> of every HTML page.
# Also adds a frame-guard meta tag and tightens referrer policy.
# ============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  ExamReady — Security Hardening Patcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f "security.js" ]; then
  echo -e "${RED}ERROR: security.js not found in current directory.${NC}"
  echo "Copy security.js to your project root first, then re-run."
  exit 1
fi

PATCHED=0
SKIPPED=0

for file in *.html; do

  # ── Already patched? ──────────────────────────────────────
  if grep -q 'src="security.js"' "$file"; then
    echo -e "${YELLOW}⏭  Already patched: $file${NC}"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # ── 1. Inject security.js as FIRST script in <head> ───────
  # We place it right after the opening <head> tag so it runs
  # before anything else (including shared.js and animations.js)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's|<head>|<head>\n<script src="security.js"></script>|g' "$file"
  else
    sed -i 's|<head>|<head>\n<script src="security.js"></script>|g' "$file"
  fi

  # ── 2. Tighten X-Frame-Options equivalent (meta) ──────────
  # Add a frame-options meta if not already present
  if ! grep -q 'X-Frame-Options\|frame-ancestors' "$file"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|<meta charset="UTF-8">|<meta charset="UTF-8">\n<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">|g' "$file"
    else
      sed -i 's|<meta charset="UTF-8">|<meta charset="UTF-8">\n<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">|g' "$file"
    fi
  fi

  # ── 3. Tighten referrer policy ─────────────────────────────
  if ! grep -q 'referrer' "$file"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|<meta charset="UTF-8">|<meta charset="UTF-8">\n<meta name="referrer" content="strict-origin-when-cross-origin">|g' "$file"
    else
      sed -i 's|<meta charset="UTF-8">|<meta charset="UTF-8">\n<meta name="referrer" content="strict-origin-when-cross-origin">|g' "$file"
    fi
  fi

  echo -e "${GREEN}✅ Patched: $file${NC}"
  PATCHED=$((PATCHED+1))
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Done! Patched ${PATCHED} files, skipped ${SKIPPED}.${NC}"
echo ""
echo -e "Verify by opening any page and running in the console:"
echo -e "  erSec.getLogs()     ← shows all security events"
echo -e "  erSecVersion        ← shows version"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
