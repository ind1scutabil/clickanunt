#!/bin/bash

# RESET CACHE - Rezolva problema cu VS Code crash
# Asta e similar cu ce era ieri cand mergea perfect

echo "🔄 Resetare cache VS Code + TypeScript..."

# 1. Inchide VS Code daca e deschis
pkill -f "Code Helper" 2>/dev/null || true
pkill -f "Electron" 2>/dev/null || true
sleep 2

echo "✓ VS Code inchis"

# 2. Sterge TypeScript cache
rm -rf /Users/ind1scutabil/projects/auto-platform/node_modules/.vite 2>/dev/null || true
rm -rf /Users/ind1scutabil/projects/auto-platform/.next/cache 2>/dev/null || true
rm -f /Users/ind1scutabil/projects/auto-platform/tsconfig.tsbuildinfo 2>/dev/null || true

echo "✓ TypeScript cache sters"

# 3. Sterge VS Code workspace cache
rm -rf ~/.vscode/workspaceStorage 2>/dev/null || true

echo "✓ Workspace storage sters"

# 4. Sterge Copilot Chat cache (consumer de RAM!)
rm -rf ~/.vscode/extensions/github.copilot-chat-0.36.2/dist 2>/dev/null || true

echo "✓ Copilot Chat cache sters"

# 5. Rebuild TypeScript
cd /Users/ind1scutabil/projects/auto-platform
npm run build 2>&1 | grep -E "error|warning|✓" | head -10 || echo "Build in progress..."

echo ""
echo "✅ RESET COMPLET!"
echo "🚀 Deschide VS Code: code ."
echo ""
echo "💡 Daca inca mai cade:"
echo "   1. Deschide Activity Monitor"
echo "   2. Find: 'Code Helper (Plugin)'"
echo "   3. Force quit"
echo "   4. Reopen VS Code"
