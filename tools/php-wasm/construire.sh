#!/bin/sh
# Reconstruit js/vendor/php-wasm/ (module « code-php ») à partir des paquets npm @php-wasm (WordPress Playground).
# À ne relancer que pour changer de version de PHP : le résultat est versionné dans le dépôt (aucun build pour l'élève).
# Usage : sh tools/php-wasm/construire.sh [version]   (défaut : 3.1.57, qui donne PHP 8.3.33)
set -e
VERSION=${1:-3.1.57}
ICI=$(cd "$(dirname "$0")" && pwd); RACINE=$(cd "$ICI/../.." && pwd)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm init -y >/dev/null
npm install --silent "@php-wasm/universal@$VERSION" "@php-wasm/web-8-3@$VERSION" esbuild >/dev/null
cp "$ICI/entree-worker.js" .
sed -i "s#'@php-wasm/web-8-3/asyncify/php_8_3.js'#'./node_modules/@php-wasm/web-8-3/asyncify/php_8_3.js'#" entree-worker.js
SORTIE="$RACINE/js/vendor/php-wasm"; mkdir -p "$SORTIE"
npx esbuild entree-worker.js --bundle --format=esm --minify --outfile="$SORTIE/php-worker.js" \
  --external:worker_threads --external:fs --external:path --external:crypto --external:os --external:url --external:net --external:child_process --external:events --external:stream --external:util --external:buffer --external:http --external:https --external:tls --external:zlib --external:ws --external:module
cp node_modules/@php-wasm/web-8-3/asyncify/*/php_8_3.wasm "$SORTIE/php_8_3.wasm"
cp node_modules/@php-wasm/universal/LICENSE "$SORTIE/LICENSE"
# pense à changer CACHE_MOTEURS dans sw.js (moteurs-v2…) pour que les appareils rechargent le moteur
echo "@php-wasm $VERSION ($(ls node_modules/@php-wasm/web-8-3/asyncify/ | grep -E '^[0-9]' | tr _ .))" > "$SORTIE/VERSION"
ls -la "$SORTIE"
