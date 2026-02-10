#!/bin/bash

# Diagnostic tool - Verifica ce consumă resurse în VS Code

echo "📊 DIAGNOSTIC VSCODE - USAGE RESURSE"
echo "======================================"
echo ""

echo "🖥️  RAM disponibil pe sistem:"
vm_stat | grep "Pages free" | awk '{printf "   - Liberi: %.0f MB\n", $3 * 4096 / 1024 / 1024}'
vm_stat | grep "Pages active" | awk '{printf "   - Activi: %.0f MB\n", $3 * 4096 / 1024 / 1024}'

echo ""
echo "⚙️  Procese VS Code + Node.js:"
ps aux | grep -E "Code|node|tsserver" | grep -v grep | awk '{printf "%s\t%s MB\n", $1, int($6/1024)}'

echo ""
echo "🔝 Top 10 procese (dupa RAM):"
ps aux | sort -rn -k6 | head -11 | tail -10 | awk '{printf "%s\t%s MB\t%s\n", $1, int($6/1024), $NF}'

echo ""
echo "📁 Folder sizes (auto-platform):"
du -sh /Users/ind1scutabil/projects/auto-platform/* 2>/dev/null | sort -rh | head -10

echo ""
echo "🗂️  File count in node_modules:"
find /Users/ind1scutabil/projects/auto-platform/node_modules -type f 2>/dev/null | wc -l | awk '{printf "   Total files: %d\n", $1}'

echo ""
echo "💾 Disk I/O (procese blocate):"
lsof -p $$ 2>/dev/null | grep -E "\.next|node_modules|\.git" | head -5 || echo "   N/A pe macOS"

echo ""
echo "✅ Diagnostic terminat!"
