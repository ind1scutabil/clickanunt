#!/bin/bash

# Dezactivează extensiile grele care cauzează crash-uri

VSCODE_EXTENSIONS_DIR="$HOME/.vscode/extensions"

echo "Dezactivez extensiile grele..."

# Extensii de dezactivat
EXTENSIONS=(
  "ms-python.python"
  "ms-python.vscode-pylance"
  "ms-vscode-remote.remote-ssh"
  "ms-vscode-remote.remote-containers"
  "ms-vscode-remote.remote-wsl"
  "ms-kubernetes-tools.vscode-kubernetes-tools"
  "ms-azuretools.vscode-docker"
  "golang.go"
  "rust-lang.rust-analyzer"
  "ms-vscode.cpptools"
  "eamodio.gitlens"
)

for ext in "${EXTENSIONS[@]}"; do
  ext_folder=$(find "$VSCODE_EXTENSIONS_DIR" -maxdepth 1 -type d -name "${ext}*" 2>/dev/null | head -1)
  if [ -n "$ext_folder" ]; then
    if [ ! -d "${ext_folder}.disabled" ]; then
      mv "$ext_folder" "${ext_folder}.disabled"
      echo "✓ Dezactivata: $ext"
    fi
  fi
done

echo "✅ Gata! Restarteaza VS Code."
