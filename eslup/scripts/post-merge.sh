#!/bin/bash
set -euo pipefail

CI=1 pnpm install --frozen-lockfile --prefer-offline
