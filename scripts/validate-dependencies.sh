#!/usr/bin/env bash

set -o pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

install_log="$(mktemp)"
trap 'rm -f "$install_log"' EXIT

pnpm install --frozen-lockfile 2>&1 | tee "$install_log"
install_status=${PIPESTATUS[0]}

if [[ "$install_status" -eq 0 ]]; then
  exit 0
fi

printf '\nDependency validation failed: pnpm install --frozen-lockfile exited with status %s.\n' \
  "$install_status" >&2

firewall_errors="$(
  grep -Eai \
    'firewall|blocked|forbidden|not allowed|rejected|ERR_PNPM_FETCH_(401|403)' \
    "$install_log" || true
)"

if [[ -n "$firewall_errors" ]]; then
  printf 'Possible Replit package firewall rejection(s) detected. Review the package names or registry URLs in these lines:\n%s\n' \
    "$firewall_errors" >&2
else
  printf 'If the output above names a package rejected by Replit''s package firewall, update or remove that dependency before merging.\n' \
    >&2
fi

exit "$install_status"