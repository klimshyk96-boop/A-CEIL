#!/usr/bin/env bash
# Повна перевірка. Будь-який провал реально зупиняє скрипт з кодом != 0.
set -euo pipefail

cd "$(dirname "$0")/.."

cleanup() {
  rm -f review-*.png verification*.json tests/review-*.png 2>/dev/null || true
}
trap cleanup EXIT

printf '%s\n' '## static + unit + architecture'
bash scripts/check-before-deploy.sh

for test_name in verify-aceil verify-state verify-storage verify-golden verify-autofill verify-pwa; do
  printf '%s\n' "## $test_name"
  node "tests/$test_name.cjs"
done

printf '%s\n' 'ALL OK'
