#!/usr/bin/env bash
set -euo pipefail
export SRCFILENAME="fix-search-order.user.js"

show_help() {
  cat <<EOF
Usage:
  $0 [option]

Create and push a new release tag.

Options:
  --major     Increment major version (v1.2.3 -> v2.0.0)
  --minor     Increment minor version (v1.2.3 -> v1.3.0)
  --patch     Increment patch version (v1.2.3 -> v1.2.4)

Recommended:
  $0 --patch
EOF
}

checkargs() {
  if [[ $# -ne 1 ]]; then
    show_help
    exit 1
  fi

  case "$1" in
  --major | --minor | --patch)
    BUMP="$1"
    ;;
  *)
    show_help
    exit 1
    ;;
  esac
}

gitmustbecleanordie() {

  if [[ "$(git branch --show-current)" != "main" ]]; then
    echo "ERROR: Not on main"
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: Working tree is not clean"
    git status --short
    exit 1
  fi
}

refreshgit() {
  git pull --ff-only
  git fetch --tags --prune
}

performtests() {
  if ! command -v pre-commit &>/dev/null; then
    echo "pre-commit is not installed. Please install it to run tests."
    exit 1
  fi

  if ! command -v npm &>/dev/null; then
    echo "npm is not installed. Please install it to run tests."
    exit 1
  fi

  pre-commit run --all-files --show-diff-on-failure
  npm test
}

findlatesttag() {
  LATEST=$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)

  if [[ -z "$LATEST" ]]; then
    echo "No valid release tags found. Defaulting to v1.0.0"
    LATEST="v1.0.0"
  fi

  if [[ ! "$LATEST" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "ERROR: Invalid latest release tag: $LATEST"
    exit 1
  fi

  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
}

evaluatenextversion() {
  case "$BUMP" in
  --major)
    ((MAJOR++))
    MINOR=0
    PATCH=0
    ;;
  --minor)
    ((MINOR++))
    PATCH=0
    ;;
  --patch)
    ((PATCH++))
    ;;
  esac

  RELEASE="v${MAJOR}.${MINOR}.${PATCH}"

  echo
  echo "Latest release: $LATEST"
  echo "New release:    $RELEASE"
  echo

  read -r -p "Create this release? [y/N] " CONFIRM

  if [[ "$CONFIRM" != "y" ]]; then
    echo "Cancelled"
    exit 0
  fi

  if git rev-parse "$RELEASE" >/dev/null 2>&1; then
    echo "ERROR: Tag already exists locally"
    exit 1
  fi

  if git ls-remote --exit-code --tags origin "refs/tags/$RELEASE" >/dev/null 2>&1; then
    echo "ERROR: Tag already exists remotely"
    exit 1
  fi

}

createdistversion() {
  DSTAMP=$(date "+%Y-%m-%dT%H:%M:%S%z")
  RELEASENUMBER="${RELEASE#v}"
  grep -Ev '^\/\/.*@(version|released)' src/${SRCFILENAME} |
    awk -v release="$RELEASENUMBER" -v dstamp="$DSTAMP" '
    /\/\/ @name[[:space:]]/ {
    print
    print "// @version      " release
    print "// @released     " dstamp
    next
    }
    { print }
    ' >${SRCFILENAME}
}

createtagandpush() {
  git add "${SRCFILENAME}" package.json package-lock.json
  git commit -m "Release ${RELEASE}"
  git push origin main
  git tag -a "$RELEASE" -m "Release $RELEASE"
  git push origin "$RELEASE" || echo "Tag already exists remotely"
  gh release create "$RELEASE" "${SRCFILENAME}" --title "$RELEASE" --notes "Release $RELEASE"
  echo "Released $RELEASE"
}
updatepackagejson() {
  node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  npm version "$VERSION" --no-git-tag-version
}
checkargs "$@"
gitmustbecleanordie
refreshgit
performtests
gitmustbecleanordie
findlatesttag
evaluatenextversion
createdistversion
updatepackagejson
createtagandpush
