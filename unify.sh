#!/bin/bash
# =====================================================
# ExamReady — Unified Design Patcher
# Run from your project root:   bash unify.sh
#
# Adds unified.css + unified-chrome.js to every page.
# Removes per-page duplicate hero/header CSS variables.
# =====================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  ExamReady — Unified Design Patcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PATCHED=0; SKIPPED=0

for file in *.html; do
  # Skip admin
  if [[ "$file" == "admin.html" ]]; then
    echo -e "${YELLOW}⏭  Skipped: $file (admin)${NC}"; SKIPPED=$((SKIPPED+1)); continue
  fi

  # ── 1. Inject unified.css in <head> ──────────────
  if ! grep -q 'unified.css' "$file"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|<link rel="stylesheet" href="animations.css">|<link rel="stylesheet" href="unified.css">\n<link rel="stylesheet" href="animations.css">|g' "$file"
    else
      sed -i 's|<link rel="stylesheet" href="animations.css">|<link rel="stylesheet" href="unified.css">\n<link rel="stylesheet" href="animations.css">|g' "$file"
    fi
    echo -e "${GREEN}✅ unified.css → $file${NC}"
  else
    echo -e "${YELLOW}⏭  unified.css already present: $file${NC}"; SKIPPED=$((SKIPPED+1)); continue
  fi

  # ── 2. Inject unified-chrome.js after shared.js ──
  if ! grep -q 'unified-chrome.js' "$file"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|<script src="shared.js"></script>|<script src="shared.js"></script>\n<script src="unified-chrome.js"></script>|g' "$file"
    else
      sed -i 's|<script src="shared.js"></script>|<script src="shared.js"></script>\n<script src="unified-chrome.js"></script>|g' "$file"
    fi
  fi

  # ── 3. Patch <header> to have er-header class ────
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's|<header>|<header class="er-header">|g' "$file"
    sed -i '' 's|<header |<header class="er-header" |g' "$file"
  else
    sed -i 's|<header>|<header class="er-header">|g' "$file"
    sed -i 's|<header |<header class="er-header" |g' "$file"
  fi

  PATCHED=$((PATCHED+1))
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Done! Patched ${PATCHED} files, skipped ${SKIPPED}.${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Copy  unified.css  and  unified-chrome.js  to your project root"
echo -e "  2. Run:  bash unify.sh"
echo -e "  3. Open any page — header + banner are now unified"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
