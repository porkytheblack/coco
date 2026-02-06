#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Coco Version Bumper
# ============================================================================
# Bumps the version across all project files that contain it:
#   - package.json
#   - src-tauri/tauri.conf.json
#   - src-tauri/Cargo.toml
#   - src/components/layout/status-bar.tsx
#
# Usage:
#   ./scripts/bump-version.sh <major|minor|patch> [--dry-run] [--no-git]
#   ./scripts/bump-version.sh --set <version>      [--dry-run] [--no-git]
#
# Examples:
#   ./scripts/bump-version.sh patch          # 0.1.0 → 0.1.1
#   ./scripts/bump-version.sh minor          # 0.1.0 → 0.2.0
#   ./scripts/bump-version.sh major          # 0.1.0 → 1.0.0
#   ./scripts/bump-version.sh --set 2.0.0    # → 2.0.0
#   ./scripts/bump-version.sh patch --dry-run # preview changes without writing
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Files to update (relative to APP_DIR)
PACKAGE_JSON="$APP_DIR/package.json"
TAURI_CONF="$APP_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$APP_DIR/src-tauri/Cargo.toml"
STATUS_BAR="$APP_DIR/src/components/layout/status-bar.tsx"

# ============================================================================
# Helpers
# ============================================================================

usage() {
  echo -e "${BOLD}Coco Version Bumper${NC}"
  echo ""
  echo "Usage:"
  echo "  $0 <major|minor|patch> [--dry-run] [--no-git]"
  echo "  $0 --set <version>      [--dry-run] [--no-git]"
  echo ""
  echo "Options:"
  echo "  major       Bump the major version (x.0.0)"
  echo "  minor       Bump the minor version (0.x.0)"
  echo "  patch       Bump the patch version (0.0.x)"
  echo "  --set VER   Set an explicit version (e.g., 2.0.0-beta.1)"
  echo "  --dry-run   Preview changes without modifying files"
  echo "  --no-git    Skip creating a git commit and tag"
  echo ""
  exit 1
}

die() {
  echo -e "${RED}Error: $1${NC}" >&2
  exit 1
}

info() {
  echo -e "${CYAN}→${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  echo -e "${YELLOW}!${NC} $1"
}

# Get current version from package.json
get_current_version() {
  if [[ ! -f "$PACKAGE_JSON" ]]; then
    die "package.json not found at $PACKAGE_JSON"
  fi
  grep -o '"version": *"[^"]*"' "$PACKAGE_JSON" | head -1 | sed 's/"version": *"\(.*\)"/\1/'
}

# Parse semver into components
parse_semver() {
  local version="$1"
  # Strip leading 'v' if present
  version="${version#v}"

  # Extract major.minor.patch (ignoring any pre-release suffix for bump)
  if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    SEMVER_MAJOR="${BASH_REMATCH[1]}"
    SEMVER_MINOR="${BASH_REMATCH[2]}"
    SEMVER_PATCH="${BASH_REMATCH[3]}"
  else
    die "Invalid semver: $version"
  fi
}

# Validate a version string
validate_version() {
  local version="$1"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    die "Invalid version format: $version (expected: X.Y.Z or X.Y.Z-pre.release)"
  fi
}

# Compute the next version
compute_next_version() {
  local bump_type="$1"
  local current="$2"

  parse_semver "$current"

  case "$bump_type" in
    major)
      echo "$((SEMVER_MAJOR + 1)).0.0"
      ;;
    minor)
      echo "${SEMVER_MAJOR}.$((SEMVER_MINOR + 1)).0"
      ;;
    patch)
      echo "${SEMVER_MAJOR}.${SEMVER_MINOR}.$((SEMVER_PATCH + 1))"
      ;;
    *)
      die "Unknown bump type: $bump_type"
      ;;
  esac
}

# ============================================================================
# File updaters
# ============================================================================

update_package_json() {
  local old="$1" new="$2"
  if [[ ! -f "$PACKAGE_JSON" ]]; then
    warn "package.json not found, skipping"
    return
  fi
  sed -i '' "s/\"version\": \"${old}\"/\"version\": \"${new}\"/" "$PACKAGE_JSON"
  success "package.json: $old → $new"
}

update_tauri_conf() {
  local old="$1" new="$2"
  if [[ ! -f "$TAURI_CONF" ]]; then
    warn "tauri.conf.json not found, skipping"
    return
  fi
  sed -i '' "s/\"version\": \"${old}\"/\"version\": \"${new}\"/" "$TAURI_CONF"
  success "tauri.conf.json: $old → $new"
}

update_cargo_toml() {
  local old="$1" new="$2"
  if [[ ! -f "$CARGO_TOML" ]]; then
    warn "Cargo.toml not found, skipping"
    return
  fi
  # Only update the package version line (first occurrence under [package])
  sed -i '' "0,/^version = \"${old}\"/s/^version = \"${old}\"/version = \"${new}\"/" "$CARGO_TOML"
  success "Cargo.toml: $old → $new"
}

update_status_bar() {
  local old="$1" new="$2"
  if [[ ! -f "$STATUS_BAR" ]]; then
    warn "status-bar.tsx not found, skipping"
    return
  fi
  # Replace any v<semver> pattern in the status bar
  sed -i '' "s/v${old}/v${new}/g" "$STATUS_BAR"
  success "status-bar.tsx: v$old → v$new"
}

update_cargo_lock() {
  # Regenerate Cargo.lock to reflect the new version
  if [[ -f "$APP_DIR/src-tauri/Cargo.lock" ]]; then
    (cd "$APP_DIR/src-tauri" && cargo update -p coco --quiet 2>/dev/null) || true
    success "Cargo.lock updated"
  fi
}

# ============================================================================
# Main
# ============================================================================

BUMP_TYPE=""
SET_VERSION=""
DRY_RUN=false
NO_GIT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    major|minor|patch)
      BUMP_TYPE="$1"
      shift
      ;;
    --set)
      [[ $# -lt 2 ]] && die "--set requires a version argument"
      SET_VERSION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-git)
      NO_GIT=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

# Validate arguments
if [[ -z "$BUMP_TYPE" && -z "$SET_VERSION" ]]; then
  usage
fi

if [[ -n "$BUMP_TYPE" && -n "$SET_VERSION" ]]; then
  die "Cannot use both bump type and --set"
fi

# Get current version
CURRENT_VERSION=$(get_current_version)
if [[ -z "$CURRENT_VERSION" ]]; then
  die "Could not determine current version from package.json"
fi

# Compute new version
if [[ -n "$SET_VERSION" ]]; then
  validate_version "$SET_VERSION"
  NEW_VERSION="$SET_VERSION"
else
  NEW_VERSION=$(compute_next_version "$BUMP_TYPE" "$CURRENT_VERSION")
fi

# Display plan
echo ""
echo -e "${BOLD}Version Bump${NC}"
echo -e "  Current:  ${RED}${CURRENT_VERSION}${NC}"
echo -e "  New:      ${GREEN}${NEW_VERSION}${NC}"
echo ""

if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
  die "New version is the same as the current version"
fi

# Dry run - just show what would happen
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run mode - no files will be modified"
  echo ""
  info "Would update:"
  echo "  • package.json"
  echo "  • src-tauri/tauri.conf.json"
  echo "  • src-tauri/Cargo.toml"
  echo "  • src/components/layout/status-bar.tsx"
  echo "  • src-tauri/Cargo.lock"
  if [[ "$NO_GIT" == false ]]; then
    echo ""
    info "Would create git commit and tag:"
    echo "  • commit: \"chore: bump version to v${NEW_VERSION}\""
    echo "  • tag: v${NEW_VERSION}"
  fi
  echo ""
  exit 0
fi

# Update all files
info "Updating version in all files..."
echo ""
update_package_json "$CURRENT_VERSION" "$NEW_VERSION"
update_tauri_conf "$CURRENT_VERSION" "$NEW_VERSION"
update_cargo_toml "$CURRENT_VERSION" "$NEW_VERSION"
update_status_bar "$CURRENT_VERSION" "$NEW_VERSION"
update_cargo_lock
echo ""

# Git commit and tag
if [[ "$NO_GIT" == false ]]; then
  # Check if we're in a git repo
  if git -C "$APP_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
    info "Creating git commit and tag..."

    git -C "$APP_DIR" add \
      package.json \
      src-tauri/tauri.conf.json \
      src-tauri/Cargo.toml \
      src-tauri/Cargo.lock \
      src/components/layout/status-bar.tsx \
      2>/dev/null || true

    git -C "$APP_DIR" commit -m "chore: bump version to v${NEW_VERSION}" --quiet 2>/dev/null || {
      warn "No changes to commit (files may already be at v${NEW_VERSION})"
    }

    # Create annotated tag
    git -C "$APP_DIR" tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}" 2>/dev/null || {
      warn "Tag v${NEW_VERSION} already exists"
    }

    success "Git commit and tag v${NEW_VERSION} created"
    echo ""
    echo -e "  Push with: ${CYAN}git push && git push --tags${NC}"
  else
    warn "Not inside a git repository, skipping git operations"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}Done!${NC} Version bumped to ${GREEN}v${NEW_VERSION}${NC}"
echo ""
