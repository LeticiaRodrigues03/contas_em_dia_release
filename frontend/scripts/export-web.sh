#!/usr/bin/env bash
# Gera a versão web do app para o GitHub Pages em /docs
# Uso: ./scripts/export-web.sh [base-path]   (padrão: /contas_em_dia_release)
set -euo pipefail

BASE_PATH="${1:-/contas_em_dia_release}"
FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_DIR="$FRONTEND_DIR/../docs"
DIST_DIR="$FRONTEND_DIR/dist"

cd "$FRONTEND_DIR"

# Define baseUrl apenas durante o export (não afeta o servidor de desenvolvimento)
cp app.json app.json.bak
trap 'mv "$FRONTEND_DIR/app.json.bak" "$FRONTEND_DIR/app.json"' EXIT
jq --arg b "$BASE_PATH" '.expo.experiments.baseUrl = $b' app.json.bak > app.json

npx expo export --platform web --output-dir "$DIST_DIR" --clear

# Preserva privacy.html e substitui o restante do conteúdo de docs
mkdir -p "$DOCS_DIR"
[ -f "$DOCS_DIR/privacy.html" ] && cp "$DOCS_DIR/privacy.html" /tmp/privacy.html.keep
find "$DOCS_DIR" -mindepth 1 -maxdepth 1 ! -name privacy.html -exec rm -r {} +
cp -r "$DIST_DIR"/. "$DOCS_DIR"/
[ -f /tmp/privacy.html.keep ] && mv /tmp/privacy.html.keep "$DOCS_DIR/privacy.html"

# GitHub Pages: ignora Jekyll (pastas com "_") e usa 404.html como fallback de rotas (SPA)
touch "$DOCS_DIR/.nojekyll"
cp "$DOCS_DIR/index.html" "$DOCS_DIR/404.html"

echo "✔ Build web gerado em $DOCS_DIR (base: $BASE_PATH)"
