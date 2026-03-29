#!/usr/bin/env bash
# Alias către fluxul VPS unic (vezi scripts/deploy-vps.sh).
exec "$(cd "$(dirname "$0")" && pwd)/deploy-vps.sh"
