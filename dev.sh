#!/usr/bin/env bash
set -e

# ==========================================================
# 🧶 Knit — Script de lancement en mode développement (Watch)
# ==========================================================

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

MODE="${1:-desktop}"

echo -e "\033[1;35m==========================================================\033[0m"
echo -e "\033[1;36m 🧶 Knit — Environnement de Développement (Watch Mode)    \033[0m"
echo -e "\033[1;35m==========================================================\033[0m"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KNIT_APP_DIR="$REPO_ROOT/knit-app"

if [ ! -d "$KNIT_APP_DIR/node_modules" ]; then
    echo -e "\033[1;33m📦 Installation initiale des dépendances npm...\033[0m"
    cd "$KNIT_APP_DIR" && npm install
fi

if [ "$MODE" = "web" ]; then
    echo -e "\033[1;32m🌐 Lancement en mode Web (Vite HMR sur http://localhost:5173)...\033[0m"
    cd "$KNIT_APP_DIR" && npm run dev
else
    echo -e "\033[1;32m🖥️ Lancement en mode Desktop Tauri v2 (Rechargement automatique complet)...\033[0m"
    cd "$KNIT_APP_DIR" && npm run tauri dev
fi
