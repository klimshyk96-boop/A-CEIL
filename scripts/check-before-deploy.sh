#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

python3 scripts/check-runtime.py || exit 1
node tests/voice-number.test.cjs || exit 1
node tests/autocount-profile.test.cjs || exit 1
node tests/linear-autocount.test.cjs || exit 1
node tests/insert-choice.test.cjs || exit 1
node tests/canvas-hit-guard.test.cjs || exit 1
node tests/honest-geometry.test.cjs || exit 1
node tests/curve-geometry.test.cjs || exit 1
node tests/curve-segments.test.cjs || exit 1
node tests/single-arc.test.cjs || exit 1
node tests/mixed-curve.test.cjs || exit 1
node tests/curve-diagonal-input.test.cjs || exit 1
node tests/history-actions.test.cjs || exit 1
node tests/diagonal-hints.test.cjs || exit 1
node tests/multiple-curve-diagonals.test.cjs || exit 1
node tests/pipeline-contract.test.cjs || exit 1
node tests/render-pipeline.test.cjs || exit 1
node tests/stability-regression.test.cjs || exit 1
node scripts/check-architecture.cjs || exit 1
node tests/global-surface.test.cjs || exit 1
if [[ -n "${ACEIL_GLOBAL_BASELINE:-}" ]]; then
  node scripts/diff-global-surface.cjs "$ACEIL_GLOBAL_BASELINE" "$ROOT_DIR" "--allow=${ACEIL_GLOBAL_ALLOW:-}" || exit 1
fi

errors=0
checked=0

fail() {
  printf 'ПОМИЛКА: %s\n' "$1" >&2
  errors=$((errors + 1))
}

build_versions="$(grep -Eo '(src|href)="[^"]+\.(js|css)\?v=[^"]+"' index.html | sed -E 's/.*\?v=([^"]+)"/\1/' | sort -u)"
if [[ "$(printf '%s\n' "$build_versions" | sed '/^$/d' | wc -l)" -ne 1 ]]; then
  fail "локальні JS/CSS мають різні cache-busting версії: $(printf '%s' "$build_versions" | tr '\n' ' ')"
fi

asset_build="$(printf '%s\n' "$build_versions" | sed '/^$/d' | head -n 1)"
sw_build="$(sed -nE 's/.*SHELL_CACHE="aceil-shell-([^"]+)".*/\1/p' sw.js | head -n 1)"
update_build="$(sed -nE 's/.*updateKey="aceil-pwa-update-([^"]+)".*/\1/p' index.html | head -n 1)"
register_build="$(sed -nE 's/.*serviceWorker\.register\("\/sw\.js\?v=([^"]+)".*/\1/p' index.html | head -n 1)"
if [[ -z "$asset_build" || "$asset_build" != "$sw_build" || "$asset_build" != "$update_build" || "$asset_build" != "$register_build" ]]; then
  fail "версії PWA не узгоджені: assets=$asset_build sw=$sw_build update=$update_build register=$register_build"
fi

if [[ ! -f .vercelignore ]]; then
  fail "немає .vercelignore"
else
  for pattern in '/tests/' '/scripts/' '/docs/' '/*.md' '/VERSION'; do
    grep -Fxq "$pattern" .vercelignore || fail ".vercelignore не містить $pattern"
  done
fi

duplicate_prefixes="$(find js -type f -name '[0-9][0-9][0-9]-*.js' -printf '%f\n' | cut -d- -f1 | sort | uniq -d)"
if [[ -n "$duplicate_prefixes" ]]; then
  fail "дубльовані числові префікси JS: $(printf '%s' "$duplicate_prefixes" | tr '\n' ' ')"
fi

duplicate_files="$(python3 - <<'PY'
from collections import defaultdict
from pathlib import Path
import hashlib
import re

for mode in ("exact", "without_whitespace"):
    groups = defaultdict(list)
    for file in Path("js").rglob("*.js"):
        data = file.read_bytes()
        if mode == "without_whitespace":
            data = re.sub(rb"\s+", b"", data)
        groups[hashlib.sha256(data).hexdigest()].append(str(file))
    for files in groups.values():
        if len(files) > 1:
            print(mode + ": " + " | ".join(files))
PY
)"
if [[ -n "$duplicate_files" ]]; then
  fail "знайдено однакові JS-файли: $duplicate_files"
fi

legacy_handlers='rmCurveSetMode|rmCurveDelete|rmCurveApply|rmComplexAddRow|rmWizardBack|rmWizardNext|rmComplexApply|rmComplexDelete|rmShapeOpenArc|rmSimpleCurveClose|rmSimpleCurveDirection|rmSimpleCurveStraight|rmSimpleCurveApply'
if grep -Eq "onclick=\"[^\"]*($legacy_handlers)" index.html; then
  fail "index.html містить недоступні legacy-обробники кривих стін"
fi

while IFS= read -r -d '' file; do
  checked=$((checked + 1))
  if ! node --check "$file" >/dev/null 2>&1; then
    fail "помилка синтаксису JavaScript: $file"
  fi
  if head -c 320 "$file" | grep -Eiq '(^|[^[:alpha:]])(404|403|502|503)[[:space:]]|not found|bad gateway|service unavailable|access denied'; then
    fail "схоже, замість JavaScript збережено текст HTTP-помилки: $file"
  fi
done < <(find js -type f -name '*.js' -print0)

if [[ ! -f index.html ]]; then
  fail "у корені немає index.html"
else
  while IFS= read -r src; do
    src="${src%%\?*}"
    case "$src" in
      http://*|https://*|//*|'') continue ;;
    esac
    [[ -f "$src" ]] || fail "index.html підключає відсутній файл: $src"
  done < <(grep -Eo '<script[^>]+src="[^"]+"' index.html | sed -E 's/.*src="([^"]+)"/\1/')
fi

if [[ -f sw.js ]] && ! node --check sw.js >/dev/null 2>&1; then
  fail "помилка синтаксису JavaScript: sw.js"
fi

if (( errors > 0 )); then
  printf '\nПеревірка не пройдена: %d помилок, перевірено %d JS-файлів.\n' "$errors" "$checked" >&2
  exit 1
fi

printf 'Перевірка пройдена: %d JS-файлів, усі локальні script-src існують.\n' "$checked"
