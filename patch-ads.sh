#!/bin/bash
# ===================================================
# ExamReady — Ad Injection Patcher v3
# Run ONCE from your project folder:
#   bash patch-ads.sh
#
# Injects <script src="ads.js"></script> after
# <script src="animations.js"></script> on every
# public HTML page (skips admin.html).
#
# Also injects <link rel="stylesheet" href="ads.css">
# in the <head> of each page.
# ===================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  ExamReady — Ads v3 Injection Patcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PATCHED=0
SKIPPED=0

for file in *.html; do
  if [[ "$file" == "admin.html" ]]; then
    echo -e "${YELLOW}⏭  Skipped: $file (admin panel — ads not injected here)${NC}"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if grep -q 'src="ads.js"' "$file"; then
    echo -e "${YELLOW}⏭  Already patched: $file${NC}"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if ! grep -q 'src="animations.js"' "$file"; then
    echo -e "${YELLOW}⚠  No animations.js found — skipping: $file${NC}"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's|<script src="animations.js"></script>|<script src="animations.js"></script>\n<script src="ads.js"></script>|g' "$file"
  else
    sed -i 's|<script src="animations.js"></script>|<script src="animations.js"></script>\n<script src="ads.js"></script>|g' "$file"
  fi

  echo -e "${GREEN}✅ Patched: $file${NC}"
  PATCHED=$((PATCHED+1))
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Done! Patched ${PATCHED} files, skipped ${SKIPPED}.${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Copy  ads.js  ads.css  ad-manager.js  to your project root"
echo -e "  2. Run:  bash patch-ads.sh"
echo -e "  3. Add  <script src=\"ad-manager.js\"></script>  to admin.html"
echo -e "     (right after <script src=\"shared.js\"></script>)"
echo -e "  4. Open Admin → Ad Manager → paste AdSense code → Save"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
