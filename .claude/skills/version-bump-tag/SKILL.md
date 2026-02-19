---
name: version-bump-tag
description: Programmatically bump package versions, create git tags, push to remote, and handle redeployments. Use when users need to bump version, version bump, create tag, push tag, release version, increment version, patch version, minor version, major version, semver bump, tag and push, new release, redeploy, re-release, retrigger release, or handle a failed release.
---

# Version Bump and Tag Management

This skill provides guidance for programmatically bumping package versions, creating git tags, and pushing them to trigger releases.

---

## Table of Contents

1. [Quick Reference - This Project](#1-quick-reference---this-project)
2. [Understanding Semantic Versioning](#2-understanding-semantic-versioning)
3. [Files That Contain Versions](#3-files-that-contain-versions)
4. [Programmatic Version Bumping](#4-programmatic-version-bumping)
5. [Pre-Push Validation](#5-pre-push-validation)
6. [Git Tag Operations](#6-git-tag-operations)
7. [Complete Release Workflow](#7-complete-release-workflow)
8. [Redeployments](#8-redeployments)
9. [Common Patterns](#9-common-patterns)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Quick Reference - This Project

This project has a version bumping script. Use npm scripts for convenience:

```bash
# From the app/ directory
npm run version:patch   # 0.1.0 -> 0.1.1
npm run version:minor   # 0.1.0 -> 0.2.0
npm run version:major   # 0.1.0 -> 1.0.0

# Then push to trigger release
git push && git push --tags
```

Or use the script directly:

```bash
./app/scripts/bump-version.sh patch          # Bump patch version
./app/scripts/bump-version.sh minor          # Bump minor version
./app/scripts/bump-version.sh major          # Bump major version
./app/scripts/bump-version.sh --set 2.0.0    # Set explicit version
./app/scripts/bump-version.sh patch --dry-run # Preview without changes
./app/scripts/bump-version.sh patch --no-git  # Skip git commit/tag
```

---

## 2. Understanding Semantic Versioning

Semantic versioning (semver) follows the pattern: `MAJOR.MINOR.PATCH`

| Component | When to Increment | Example |
|-----------|-------------------|---------|
| **MAJOR** | Breaking changes / incompatible API changes | 1.0.0 -> 2.0.0 |
| **MINOR** | New features (backward compatible) | 1.0.0 -> 1.1.0 |
| **PATCH** | Bug fixes (backward compatible) | 1.0.0 -> 1.0.1 |

### Pre-release Versions

```
1.0.0-alpha.1    # Early development
1.0.0-beta.1     # Feature complete, testing
1.0.0-rc.1       # Release candidate
```

---

## 3. Files That Contain Versions

Different project types have different version files:

### Node.js / npm Projects

| File | Format | Location |
|------|--------|----------|
| `package.json` | `"version": "X.Y.Z"` | Root or app directory |
| `package-lock.json` | Auto-updated by npm | Same as package.json |

### Tauri Applications (This Project)

| File | Format |
|------|--------|
| `package.json` | `"version": "X.Y.Z"` |
| `src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |
| `src-tauri/Cargo.toml` | `version = "X.Y.Z"` |
| `src-tauri/Cargo.lock` | Auto-updated by cargo |
| UI components | Display strings like `v0.1.0` |

### Rust Projects

| File | Format |
|------|--------|
| `Cargo.toml` | `version = "X.Y.Z"` |
| `Cargo.lock` | Auto-updated by cargo |

### Python Projects

| File | Format |
|------|--------|
| `pyproject.toml` | `version = "X.Y.Z"` |
| `setup.py` | `version="X.Y.Z"` |
| `__init__.py` | `__version__ = "X.Y.Z"` |

---

## 4. Programmatic Version Bumping

### Method 1: Using npm (Node.js Projects)

```bash
# Built-in npm version command
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0

# With message and no git tag
npm version patch --no-git-tag-version

# Set explicit version
npm version 2.0.0
```

### Method 2: Direct File Editing (Cross-Platform)

For agents, directly edit version files using the Edit tool:

```typescript
// Example: Bump version in package.json
// 1. Read current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// 2. Calculate new version
const newVersion = `${major}.${minor}.${patch + 1}`; // patch bump

// 3. Update file
packageJson.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
```

### Method 3: Using sed (Bash)

```bash
# Update package.json
OLD_VERSION="0.1.0"
NEW_VERSION="0.1.1"
sed -i '' "s/\"version\": \"${OLD_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json

# Update Cargo.toml (first occurrence)
sed -i '' "0,/^version = \"${OLD_VERSION}\"/s/^version = \"${OLD_VERSION}\"/version = \"${NEW_VERSION}\"/" Cargo.toml

# Update tauri.conf.json
sed -i '' "s/\"version\": \"${OLD_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
```

### Method 4: Using jq (JSON files)

```bash
# Read current version
CURRENT=$(jq -r '.version' package.json)

# Update version
jq '.version = "0.1.1"' package.json > tmp.json && mv tmp.json package.json
```

---

## 5. Pre-Push Validation

**IMPORTANT:** Before pushing tags or releasing, always verify the repository state is clean and all changes are committed and pushed.

### Check for Uncommitted Changes

```bash
# Check if working directory is clean
if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: Uncommitted changes detected"
    git status --short
    exit 1
fi
```

### Check for Unpushed Commits

```bash
# Check if local branch is ahead of remote
UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null)
if [[ -n "$UNPUSHED" ]]; then
    echo "ERROR: Unpushed commits detected:"
    echo "$UNPUSHED"
    echo "Run: git push"
    exit 1
fi
```

### Complete Pre-Push Validation Function

```bash
validate_ready_to_release() {
    # 1. Check for uncommitted changes
    if [[ -n "$(git status --porcelain)" ]]; then
        echo "ERROR: Uncommitted changes. Commit or stash them first."
        git status --short
        return 1
    fi

    # 2. Check for unpushed commits
    git fetch origin --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

    if [[ -z "$REMOTE" ]]; then
        echo "WARNING: No upstream branch set"
    elif [[ "$LOCAL" != "$REMOTE" ]]; then
        AHEAD=$(git log @{u}..HEAD --oneline | wc -l | tr -d ' ')
        BEHIND=$(git log HEAD..@{u} --oneline | wc -l | tr -d ' ')

        if [[ "$AHEAD" -gt 0 ]]; then
            echo "ERROR: $AHEAD unpushed commit(s). Run: git push"
            return 1
        fi
        if [[ "$BEHIND" -gt 0 ]]; then
            echo "ERROR: $BEHIND commits behind remote. Run: git pull"
            return 1
        fi
    fi

    # 3. Verify on correct branch (optional)
    BRANCH=$(git branch --show-current)
    if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
        echo "WARNING: Not on main/master branch (currently on: $BRANCH)"
    fi

    echo "Repository is clean and ready for release"
    return 0
}

# Usage
validate_ready_to_release || exit 1
```

### Agent Pre-Release Checklist

Before bumping version and creating tags, agents MUST:

1. **Run `git status`** - Verify no uncommitted changes
2. **Run `git fetch origin`** - Update remote refs
3. **Compare local/remote** - Ensure no unpushed commits
4. **Stage and commit** any pending changes if needed
5. **Push commits** before creating tags

```bash
# Quick validation one-liner
git status --porcelain | grep -q . && echo "UNCOMMITTED CHANGES" && exit 1
git fetch origin && git log @{u}..HEAD --oneline | grep -q . && echo "UNPUSHED COMMITS" && exit 1
echo "Ready to release"
```

---

## 6. Git Tag Operations

### Creating Tags

```bash
# Lightweight tag (not recommended for releases)
git tag v1.0.0

# Annotated tag (recommended)
git tag -a v1.0.0 -m "Release v1.0.0"

# Tag with longer message
git tag -a v1.0.0 -m "Release v1.0.0

- Feature: Added user authentication
- Fix: Resolved memory leak
- Chore: Updated dependencies"
```

### Pushing Tags

```bash
# Push a specific tag
git push origin v1.0.0

# Push all tags
git push --tags

# Push commits and tags together
git push && git push --tags
```

### Listing Tags

```bash
# List all tags
git tag -l

# List tags matching pattern
git tag -l "v1.*"

# Show tag details
git show v1.0.0

# List remote tags
git ls-remote --tags origin
```

### Deleting Tags

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0
# or
git push origin --delete v1.0.0
```

### Recreating a Tag (Re-release)

```bash
# Delete and recreate (useful for failed releases)
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 7. Complete Release Workflow

### Standard Release (Step by Step)

```bash
# 1. Ensure clean working directory
git status  # Should show no uncommitted changes

# 2. Get current version
CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' package.json | head -1 | sed 's/"version": *"\(.*\)"/\1/')
echo "Current: $CURRENT_VERSION"

# 3. Calculate new version (example: patch bump)
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
NEW_VERSION="${major}.${minor}.$((patch + 1))"
echo "New: $NEW_VERSION"

# 4. Update version files
# (Use project-specific script or manual updates)

# 5. Stage changes
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock

# 6. Commit
git commit -m "chore: bump version to v${NEW_VERSION}"

# 7. Create annotated tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

# 8. Push commit and tag
git push && git push --tags
```

### One-Liner Release (Using Project Script)

```bash
# This project
cd app && npm run version:patch && git push && git push --tags

# Generic npm project
npm version patch && git push && git push --tags
```

### Agent Workflow (Recommended Steps)

When an agent needs to bump version and release:

1. **Check git status** - Ensure clean working directory
2. **Read current version** - From package.json or primary version file
3. **Determine bump type** - patch/minor/major based on changes
4. **Update all version files** - Keep them in sync
5. **Update Cargo.lock** - If Rust project, run `cargo update`
6. **Commit changes** - With conventional commit message
7. **Create annotated tag** - With release message
8. **Push to remote** - Both commits and tags
9. **Verify** - Check that CI/CD pipeline triggered

---

## 8. Redeployments

When a release fails or needs to be re-triggered without changing the version, use redeployment.

### This Project - Redeploy Script

```bash
# From app/ directory - redeploy current version
npm run redeploy

# Or use the script directly
./app/scripts/redeploy.sh              # Redeploy current version
./app/scripts/redeploy.sh v0.1.5       # Redeploy specific version
./app/scripts/redeploy.sh --dry-run    # Preview without changes
./app/scripts/redeploy.sh --no-push    # Recreate locally only
```

### What Redeploy Does

1. Deletes the tag locally (if exists)
2. Deletes the tag on remote origin (if exists)
3. Recreates the annotated tag at HEAD
4. Pushes the new tag to origin
5. This re-triggers the CI/CD release workflow

### Manual Redeployment

If no script is available:

```bash
VERSION="v0.1.5"

# 1. Verify clean state first
git status --porcelain | grep -q . && echo "Uncommitted changes!" && exit 1

# 2. Delete local tag
git tag -d "$VERSION" 2>/dev/null || echo "No local tag"

# 3. Delete remote tag
git push origin ":refs/tags/$VERSION" 2>/dev/null || echo "No remote tag"

# 4. Recreate tag at HEAD
git tag -a "$VERSION" -m "Release $VERSION"

# 5. Push the new tag
git push origin "refs/tags/$VERSION"

echo "Redeployed $VERSION"
```

### When to Use Redeployment

- CI/CD workflow failed mid-build
- Build artifacts were corrupted
- Code signing failed
- Need to rebuild with updated secrets/environment
- Artifact upload failed

### Important Notes

- Redeployment does NOT change the version number
- The tag points to the current HEAD commit
- Ensure all fixes are committed and pushed BEFORE redeploying
- CI/CD will run against the commit HEAD points to

---

## 9. Common Patterns

### Conventional Commit for Version Bumps

```bash
git commit -m "chore: bump version to v${VERSION}"
# or
git commit -m "release: v${VERSION}"
```

### Checking if Tag Exists

```bash
if git rev-parse "v1.0.0" >/dev/null 2>&1; then
    echo "Tag exists"
else
    echo "Tag does not exist"
fi
```

### Getting Latest Tag

```bash
# Latest tag on current branch
git describe --tags --abbrev=0

# Latest semver tag
git tag -l "v*" | sort -V | tail -1
```

### Version Comparison

```bash
# Parse current version
VERSION="1.2.3"
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Bump
PATCH=$((PATCH + 1))          # 1.2.4
# or
MINOR=$((MINOR + 1)); PATCH=0 # 1.3.0
# or
MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 # 2.0.0

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
```

### Tauri-Specific: Update Cargo.lock

```bash
# After updating Cargo.toml version
cd src-tauri && cargo update -p <package-name> --quiet
```

---

## 10. Troubleshooting

### "Tag already exists"

```bash
# Delete and recreate
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### "Version mismatch between files"

Check all version files match:

```bash
echo "package.json: $(jq -r '.version' package.json)"
echo "tauri.conf.json: $(jq -r '.version' src-tauri/tauri.conf.json)"
echo "Cargo.toml: $(grep '^version' src-tauri/Cargo.toml | head -1)"
```

### "Push rejected - tag already exists on remote"

```bash
# Force push tag (use with caution)
git push origin v1.0.0 --force

# Or delete and recreate
git push origin :refs/tags/v1.0.0
git push origin v1.0.0
```

### "CI/CD not triggered after tag push"

- Verify workflow triggers on tag push (`on: push: tags: ["v*"]`)
- Check tag format matches workflow pattern
- Ensure push includes the tag: `git push --tags`

### "Unsigned tag warning"

```bash
# Create signed tag (requires GPG setup)
git tag -s v1.0.0 -m "Release v1.0.0"
```

---

## Quick Commands Summary

| Action | Command |
|--------|---------|
| Check ready to release | `git status --porcelain && git log @{u}..HEAD --oneline` |
| Bump patch (this project) | `cd app && npm run version:patch` |
| Bump minor (this project) | `cd app && npm run version:minor` |
| Bump major (this project) | `cd app && npm run version:major` |
| Push release | `git push && git push --tags` |
| Redeploy (this project) | `cd app && npm run redeploy` |
| Redeploy specific version | `./app/scripts/redeploy.sh v0.1.5` |
| View current version | `jq -r '.version' app/package.json` |
| List all tags | `git tag -l` |
| Delete tag | `git tag -d v1.0.0 && git push origin :refs/tags/v1.0.0` |
| Recreate tag | Delete, then `git tag -a v1.0.0 -m "msg" && git push origin v1.0.0` |
