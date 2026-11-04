#!/usr/bin/env bash
# Builds the static site and publishes it to the gh-pages branch (GitHub Pages "deploy from branch").
# The AI reading API route needs a server, so it is left out of this build.
set -euo pipefail

cd "$(dirname "$0")/.."
WEB="$PWD"
REMOTE="$(git -C "$WEB" remote get-url origin)"
REPO_NAME="$(basename -s .git "$REMOTE")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

npm run verify

# Build from a copy so the working tree (and its API route) is never touched.
rsync -a --exclude node_modules --exclude .next --exclude out ./ "$WORK/app/"
ln -s "$WEB/node_modules" "$WORK/app/node_modules"
rm -rf "$WORK/app/src/app/api"
(cd "$WORK/app" && STATIC_EXPORT=1 BASE_PATH="/$REPO_NAME" ./node_modules/.bin/next build)

# _next/ starts with an underscore, so Jekyll must be disabled.
touch "$WORK/app/out/.nojekyll"
cd "$WORK/app/out"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(git -C "$WEB" rev-parse --short HEAD)"
git push -q -f "$REMOTE" gh-pages
echo "Published to https://$(git -C "$WEB" remote get-url origin | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#').github.io/$REPO_NAME/"
