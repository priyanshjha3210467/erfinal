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

echo "Ad injection is disabled."
exit 0

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
