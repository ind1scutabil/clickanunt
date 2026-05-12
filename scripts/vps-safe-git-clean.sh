#!/usr/bin/env bash
# Run from the application root on the VPS (e.g. cd /var/www/clickanunt).
# Removes untracked files but NEVER deletes local user uploads under public/uploads/.
#
# NEVER run bare: git clean -fd
# That deleted public/uploads/listings/ in production (May 2026 incident).

set -euo pipefail

if [ ! -d .git ]; then
  echo "vps-safe-git-clean: run from a git checkout root" >&2
  exit 1
fi

# Dry-run: append -n (example: ./scripts/vps-safe-git-clean.sh -n)
exec git clean -fd \
  -e public/uploads \
  -e public/uploads/ \
  -e public/uploads/listings \
  -e public/uploads/listings/ \
  -e public/uploads/avatars \
  -e public/uploads/avatars/ \
  -e public/uploads/messages \
  -e public/uploads/messages/ \
  "$@"
