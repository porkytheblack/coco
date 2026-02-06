#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Coco Redeploy
# ============================================================================
# Deletes a version tag locally and on origin, then recreates and pushes it.
# This re-triggers the release workflow for an existing version.
#
# Usage:
#   ./scripts/redeploy.sh [tag]    # defaults to current version from package.json
#   ./scripts/redeploy.sh v0.1.1
#
# Options:
#   --dry-run   Preview what would happen without making changes
#   --no-push   Recreate tag locally but don't push to origin
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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

get_current_version() {
  grep -o '"version": *"[^"]*"' "$APP_DIR/package.json" | head -1 | sed 's/"version": *"\(.*\)"/\1/'
}

# ============================================================================
# Parse arguments
# ============================================================================

TAG=""
DRY_RUN=false
NO_PUSH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-push)
      NO_PUSH=true
      shift
      ;;
    -h|--help)
      echo -e "${BOLD}Coco Redeploy${NC}"
      echo ""
      echo "Usage:"
      echo "  $0 [tag] [--dry-run] [--no-push]"
      echo ""
      echo "Arguments:"
      echo "  tag         Tag to redeploy (default: vX.Y.Z from package.json)"
      echo ""
      echo "Options:"
      echo "  --dry-run   Preview without making changes"
      echo "  --no-push   Recreate tag locally only"
      echo ""
      exit 0
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      TAG="$1"
      shift
      ;;
  esac
done

# Default tag from package.json version
if [[ -z "$TAG" ]]; then
  VERSION=$(get_current_version)
  [[ -z "$VERSION" ]] && die "Could not read version from package.json"
  TAG="v${VERSION}"
fi

# Ensure tag starts with 'v'
if [[ "$TAG" != v* ]]; then
  TAG="v${TAG}"
fi

# ============================================================================
# Verify state
# ============================================================================

cd "$APP_DIR"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  die "Not inside a git repository"
fi

# Check the tag exists somewhere
LOCAL_EXISTS=false
REMOTE_EXISTS=false

if git rev-parse "refs/tags/${TAG}" &>/dev/null; then
  LOCAL_EXISTS=true
fi

if git ls-remote --tags origin "refs/tags/${TAG}" 2>/dev/null | grep -q "${TAG}"; then
  REMOTE_EXISTS=true
fi

if [[ "$LOCAL_EXISTS" == false && "$REMOTE_EXISTS" == false ]]; then
  die "Tag ${TAG} does not exist locally or on origin. Use bump-version.sh to create it first."
fi

# Get the commit the tag should point to
COMMIT=$(git rev-parse HEAD)
SHORT_COMMIT=$(git rev-parse --short HEAD)

echo ""
echo -e "${BOLD}Redeploy ${TAG}${NC}"
echo -e "  Tag:    ${YELLOW}${TAG}${NC}"
echo -e "  Commit: ${CYAN}${SHORT_COMMIT}${NC} (HEAD)"
echo -e "  Local:  ${LOCAL_EXISTS}"
echo -e "  Remote: ${REMOTE_EXISTS}"
echo ""

# ============================================================================
# Dry run
# ============================================================================

if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run mode - no changes will be made"
  echo ""
  [[ "$LOCAL_EXISTS" == true ]] && info "Would delete local tag ${TAG}"
  [[ "$REMOTE_EXISTS" == true ]] && info "Would delete remote tag ${TAG}"
  info "Would create tag ${TAG} at ${SHORT_COMMIT}"
  [[ "$NO_PUSH" == false ]] && info "Would push tag ${TAG} to origin"
  echo ""
  exit 0
fi

# ============================================================================
# Execute
# ============================================================================

# 1. Delete local tag
if [[ "$LOCAL_EXISTS" == true ]]; then
  git tag -d "${TAG}" >/dev/null 2>&1
  success "Deleted local tag ${TAG}"
else
  info "No local tag to delete"
fi

# 2. Delete remote tag
if [[ "$REMOTE_EXISTS" == true ]]; then
  git push origin ":refs/tags/${TAG}" >/dev/null 2>&1
  success "Deleted remote tag ${TAG}"
else
  info "No remote tag to delete"
fi

# 3. Recreate tag at HEAD
git tag -a "${TAG}" -m "Release ${TAG}" "${COMMIT}"
success "Created tag ${TAG} at ${SHORT_COMMIT}"

# 4. Push
if [[ "$NO_PUSH" == false ]]; then
  git push origin "refs/tags/${TAG}"
  success "Pushed tag ${TAG} to origin"
else
  warn "Skipped push (--no-push)"
  echo -e "  Push manually: ${CYAN}git push origin refs/tags/${TAG}${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}Done!${NC} Tag ${TAG} redeployed at ${SHORT_COMMIT}"
echo ""
