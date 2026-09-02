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
  local output="$1"
  local expected="$2"

  if [[ "$output" != *"$expected"* ]]; then
    printf 'Expected validation output to contain: %s\nActual output:\n%s\n' \
      "$expected" "$output" >&2
    exit 1
  fi
}

if [[ "$validation_status" -ne 17 ]]; then
  printf 'Expected validation to preserve status 17, got %s.\nOutput:\n%s\n' \
    "$validation_status" "$validation_output" >&2
  exit 1
fi

assert_contains "$validation_output" '@workspace/blocked-package'
assert_contains "$validation_output" 'https://registry.example.com/@workspace/blocked-package/-/blocked-package-1.0.0.tgz'
assert_contains "$validation_output" 'Possible Replit package firewall rejection(s) detected.'

cat > "$fake_pnpm_dir/pnpm" <<'EOF'
#!/usr/bin/env bash

printf '%s\n' \
  'ERR_PNPM_FETCH_500 GET https://registry.example.com/@workspace/ordinary-package/-/ordinary-package-1.0.0.tgz: Internal Server Error'
exit 23
EOF
chmod +x "$fake_pnpm_dir/pnpm"

set +e
ordinary_validation_output="$(
  PATH="$fake_pnpm_dir:$PATH" \
    bash "$repository_root/scripts/validate-dependencies.sh" 2>&1
)"
ordinary_validation_status=$?
set -e

if [[ "$ordinary_validation_status" -ne 23 ]]; then
  printf 'Expected ordinary validation to preserve status 23, got %s.\nOutput:\n%s\n' \
    "$ordinary_validation_status" "$ordinary_validation_output" >&2
  exit 1
fi

assert_contains "$ordinary_validation_output" 'ERR_PNPM_FETCH_500 GET https://registry.example.com/@workspace/ordinary-package/-/ordinary-package-1.0.0.tgz: Internal Server Error'
assert_contains "$ordinary_validation_output" \
  'Dependency validation failed: pnpm install --frozen-lockfile exited with status 23.'

cat > "$fake_pnpm_dir/pnpm" <<'EOF'
#!/usr/bin/env bash

printf '%s\n' \
  'ERR_PNPM_FETCH_500 GET https://registry.example.com/@workspace/first-package/-/first-package-1.0.0.tgz: Internal Server Error' \
  'ERR_PNPM_FETCH_502 GET https://registry.example.com/@workspace/second-package/-/second-package-2.0.0.tgz: Bad Gateway' \
  'ERR_PNPM_META_FETCH_FAIL GET https://registry.example.com/@workspace/third-package: Request failed'
exit 31
EOF
chmod +x "$fake_pnpm_dir/pnpm"

set +e
multiline_validation_output="$(
  PATH="$fake_pnpm_dir:$PATH" \
    bash "$repository_root/scripts/validate-dependencies.sh" 2>&1
)"
multiline_validation_status=$?
set -e

if [[ "$multiline_validation_status" -ne 31 ]]; then
  printf 'Expected multiline validation to preserve status 31, got %s.\nOutput:\n%s\n' \
    "$multiline_validation_status" "$multiline_validation_output" >&2
  exit 1
fi

assert_contains "$multiline_validation_output" \
  'ERR_PNPM_FETCH_500 GET https://registry.example.com/@workspace/first-package/-/first-package-1.0.0.tgz: Internal Server Error'
assert_contains "$multiline_validation_output" \
  'ERR_PNPM_FETCH_502 GET https://registry.example.com/@workspace/second-package/-/second-package-2.0.0.tgz: Bad Gateway'
assert_contains "$multiline_validation_output" \
  'ERR_PNPM_META_FETCH_FAIL GET https://registry.example.com/@workspace/third-package: Request failed'
assert_contains "$multiline_validation_output" \
  'Dependency validation failed: pnpm install --frozen-lockfile exited with status 31.'

printf '%s\n' 'Dependency validation diagnostic regression tests passed.'
