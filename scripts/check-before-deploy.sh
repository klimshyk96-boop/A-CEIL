#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

errors=0
checked=0

fail() {
  printf 'ПОМИЛКА: %s\n' "$1" >&2
  errors=$((errors + 1))
}

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
