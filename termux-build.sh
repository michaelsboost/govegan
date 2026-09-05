#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

project_dir="$(pwd -P)"

if [[ ! -f "$project_dir/package.json" ]]; then
  echo "Error: package.json was not found in:"
  echo "  $project_dir"
  echo "Run this from inside your Go Vegan project folder:"
  echo "  bash termux-build.sh"
  exit 1
fi

if [[ -z "${PREFIX:-}" || "$PREFIX" != /data/data/com.termux/files/usr ]]; then
  echo "Error: this script must be run inside Termux."
  exit 1
fi

missing=()
for command_name in node npm rsync sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || missing+=("$command_name")
done

if (( ${#missing[@]} )); then
  echo "Missing required commands: ${missing[*]}"
  echo "Install them with:"
  echo "  pkg update"
  echo "  pkg install nodejs-lts rsync coreutils"
  exit 1
fi

project_id="$(printf '%s' "$project_dir" | sha256sum | cut -c1-12)"
build_dir="$PREFIX/var/tmp/govegan-build-$project_id"
npm_cache_dir="$PREFIX/var/cache/govegan-npm"

case "$build_dir" in
  "$PREFIX"/var/tmp/govegan-build-*) ;;
  *) echo "Error: unsafe build directory."; exit 1 ;;
esac

mkdir -p "$build_dir" "$npm_cache_dir"

echo "Synchronizing project into Termux private storage..."
rsync -a --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.dependency-hash' \
  "$project_dir/" "$build_dir/"

dependency_hash="$({
  sha256sum "$build_dir/package.json"
  if [[ -f "$build_dir/package-lock.json" ]]; then
    sha256sum "$build_dir/package-lock.json"
  fi
} | sha256sum | cut -d' ' -f1)"
installed_hash=""
[[ -f "$build_dir/.dependency-hash" ]] && installed_hash="$(<"$build_dir/.dependency-hash")"

if [[ ! -d "$build_dir/node_modules" || "$dependency_hash" != "$installed_hash" ]]; then
  echo "Installing dependencies inside Termux private storage..."
  cd "$build_dir"
  if [[ -f package-lock.json ]]; then
    npm_config_cache="$npm_cache_dir" npm ci --no-audit --no-fund
  else
    npm_config_cache="$npm_cache_dir" npm install --no-audit --no-fund
  fi
  printf '%s\n' "$dependency_hash" > "$build_dir/.dependency-hash"
else
  echo "Dependencies are already installed."
fi

echo "Building Go Vegan..."
cd "$build_dir"
npm_config_cache="$npm_cache_dir" npm run build

if [[ ! -d "$build_dir/dist" ]]; then
  echo "Error: the build completed without creating a dist directory."
  exit 1
fi

echo "Copying finished build back to the project..."
mkdir -p "$project_dir/dist"
rsync -a "$build_dir/dist/" "$project_dir/dist/"

echo
echo "Build complete."
echo "Output: $project_dir/dist"
