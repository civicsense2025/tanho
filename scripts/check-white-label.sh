#!/usr/bin/env bash
# White-label gate: application code must contain ZERO brand strings from the
# design's sample content. Brand/sample data may exist ONLY under seed/.
# Add patterns here if new sample content sneaks into the design source.
set -euo pipefail

PATTERNS=(
  "Tan Ho"
  "tanho\.studio"
  "tan@studio"
  "tan@tanho"
  "TanHoDesignSystem"
  "Fiveable"
)

FAIL=0
for p in "${PATTERNS[@]}"; do
  if grep -rniE --exclude-dir=node_modules "$p" src/ docs/ 2>/dev/null; then
    echo "✗ Forbidden brand string matched pattern: $p"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 1 ]; then
  echo "White-label check FAILED — brand strings belong only in seed/demo-tanho.ts"
  exit 1
fi
echo "White-label check passed: no brand strings in src/ or docs/"
