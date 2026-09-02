#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT

fake_pnpm_dir="$test_dir/bin"
mkdir -p "$fake_pnpm_dir"
cat > "$fake_pnpm_dir/pnpm" <<'EOF'
#!/usr/bin/env bash

printf '%s\n' \
  'ERR_PNPM_FETCH_403 GET https://registry.example.com/@workspace/blocked-package/-/blocked-package-1.0.0.tgz: Forbidden - package blocked by Replit package firewall'
exit 17
EOF
chmod +x "$fake_pnpm_dir/pnpm"

set +e
validation_output="$(
  PATH="$fake_pnpm_dir:$PATH" \
    bash "$repository_root/scripts/validate-dependencies.sh" 2>&1
)"
validation_status=$?
set -e

assert_contains() {
  local expected="$1"

  if [[ "$validation_output" != *"$expected"* ]]; then
    printf 'Expected validation output to contain: %s\nActual output:\n%s\n' \
      "$expected" "$validation_output" >&2
    exit 1
  fi
}

if [[ "$validation_status" -ne 17 ]]; then
  printf 'Expected validation to preserve status 17, got %s.\nOutput:\n%s\n' \
    "$validation_status" "$validation_output" >&2
  exit 1
fi

assert_contains '@workspace/blocked-package'
assert_contains 'https://registry.example.com/@workspace/blocked-package/-/blocked-package-1.0.0.tgz'
assert_contains 'Possible Replit package firewall rejection(s) detected.'

printf '%s\n' 'Dependency firewall diagnostic regression test passed.'