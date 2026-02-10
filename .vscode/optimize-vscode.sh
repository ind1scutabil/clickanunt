#!/bin/bash

# Script de optimizare pentru VS Code + Copilot + Extensii (16GB RAM)
# Ruleaza aceasta inainte sa deschizi VS Code

echo "🔧 Optimizare sistem pentru VS Code (16GB RAM)..."

# Mărește limita de fișiere deschise
ulimit -n 4096

# Oprizează procesele vechi care consumă RAM
if pgrep -f "node.*tsserver" > /dev/null; then
  echo "⚠️  Oprire tsserver vechi..."
  pkill -f "node.*tsserver" 2>/dev/null || true
fi

if pgrep -f "Code Helper" > /dev/null; then
  echo "⚠️  Resetare VS Code helpers..."
  # Păstrează doar procesele esențiale
fi

# Golește cacheul npm și node-gyp
rm -rf ~/.npm ~/.node-gyp 2>/dev/null || true

# Setează limita de file descriptor
launchctl limit maxfiles 4096 unlimited 2>/dev/null || true

# Seta variabile de mediu pentru Node.js
export NODE_OPTIONS="--max-old-space-size=6144 --expose-gc --disable-gc-idle"
export NODE_ENV="development"
export NODE_PATH="/usr/local/lib/node_modules:${PWD}/node_modules"

# Reduce swapping pe disk
if command -v sudo &> /dev/null; then
  # Doar daca ruleaza cu sudo
  sysctl -w vm.swappiness=10 2>/dev/null || true
fi

echo "✅ Optimizare completă!"
echo "📊 RAM disponibil: $(vm_stat | grep 'Pages free' | awk '{print $3}' | sed 's/\.//')"
echo "🚀 Deschide VS Code cu: code ."
echo ""
echo "💡 Perii: Dacă VS Code încă merge lent:"
echo "   1. Deschide Activity Monitor"
echo "   2. Sorteaza dupa Memory"
echo "   3. Vede care proces consumă cel mai mult"
echo "   4. Spune-mi procesul și voi optimiza"

