#!/usr/bin/env bash

set -o pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

validate_repository_layout() {
  local invalid_files=()
  local file
  local relative_path

  while IFS= read -r -d '' file; do
    relative_path="${file#./}"

    case "$relative_path" in
      .replit|pnpm-workspace.yaml|pnpm-lock.yaml|package.json)
        ;;
      artifacts/*/package.json|lib/*/package.json|lib/integrations/*/package.json|scripts/package.json)
        ;;
      *)
        invalid_files+=("$relative_path")
        ;;
    esac
  done < <(
    find . \
      \( -path './.git' -o -path './.cache' -o -path './.local' -o -name node_modules \) -prune \
      -o -type f \( \
        -name '.replit' \
        -o -name 'pnpm-workspace.yaml' \
        -o -name 'pnpm-lock.yaml' \
        -o -name 'package.json' \
      \) -print0
  )

  if ((${#invalid_files[@]} > 0)); then
    printf 'Repository layout validation failed. Workspace entry-point files must stay at the repository root.\n' >&2
    printf 'Package manifests are only allowed for workspace packages under artifacts/, lib/, and scripts/.\n' >&2
    printf 'Unexpected files:\n' >&2
    printf '  - %s\n' "${invalid_files[@]}" >&2
    return 1
  fi
}

if ! validate_repository_layout; then
  exit 1
fi

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