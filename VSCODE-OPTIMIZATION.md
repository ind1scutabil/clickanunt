# Optimizare VS Code - Extensii

## Extensii dezactivate (grele/inutile)
- ❌ Python / Pylance
- ❌ Remote SSH / Containers / WSL
- ❌ Kubernetes
- ❌ Docker
- ❌ GoLang
- ❌ Rust Analyzer
- ❌ C++ Tools
- ❌ GitLens

## Extensii recomandare (pentru Next.js)
- ✅ ESLint - dbaeumer.vscode-eslint
- ✅ Prettier - esbenp.prettier-vscode
- ✅ Tailwind CSS - bradlc.vscode-tailwindcss
- ✅ Prisma - Prisma.prisma
- ✅ TypeScript - ms-vscode.vscode-typescript-next
- ✅ Code Spell Checker - streetsidesoftware.code-spell-checker
- ✅ GitHub Copilot - GitHub.copilot (optional)

## Configurări aplicate
1. TypeScript InlayHints - **dezactivate**
2. Quick Suggestions - **dezactivate**
3. Auto-Save - **dezactivate**
4. ESLint - **dezactivate**
5. TypeScript validation - **dezactivate**
6. Git Auto-Fetch - **dezactivate**
7. Extensions Auto-Update - **dezactivate**

## Pentru a reactiva o extensie dezactivata
```bash
# Cauta folderul dezactivat
ls ~/.vscode/extensions | grep -i "extensie-name"

# Redenumeste-l (sterge .disabled)
mv ~/.vscode/extensions/extensie-name.disabled ~/.vscode/extensions/extensie-name

# Restarteaza VS Code
```

## Memorie alocata
- Node.js: **4096 MB** (4GB)
- TypeScript Server: **4096 MB**

Status: ✅ Optimizata pentru performance cu proiect mare
