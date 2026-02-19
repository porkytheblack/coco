---
name: tauri-deployment-setup
description: Setup GitHub workflows, version management, and Tauri configuration for deployment with Oasis update server. Use when users need help with setup deployment, github workflow, tauri release, version management, oasis server, update server, CI/CD setup, release workflow, code signing, or tauri config.
---

# Tauri Deployment Setup Guide

This skill provides comprehensive guidance for setting up GitHub workflows, version management, and Tauri configuration for deployment, including integration with the Oasis update server.

---

## Table of Contents

1. [Project Structure Overview](#1-project-structure-overview)
2. [Version Management](#2-version-management)
3. [GitHub Workflows Setup](#3-github-workflows-setup)
4. [Tauri Configuration for Deployment](#4-tauri-configuration-for-deployment)
5. [Oasis Update Server Setup](#5-oasis-update-server-setup)
6. [Secrets & Environment Variables](#6-secrets--environment-variables)
7. [Release Flow](#7-release-flow)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Project Structure Overview

A production-ready Tauri application should have the following structure:

```
your-app/
├── .github/
│   └── workflows/
│       └── release.yaml          # CI/CD pipeline
├── app/
│   ├── package.json              # Frontend dependencies & version
│   ├── scripts/
│   │   ├── bump-version.sh       # Version management script
│   │   └── redeploy.sh           # Re-trigger releases
│   ├── src/                      # Frontend source (Next.js/React/Vue)
│   ├── src-tauri/
│   │   ├── Cargo.toml            # Rust dependencies & version
│   │   ├── tauri.conf.json       # Tauri configuration
│   │   ├── capabilities/
│   │   │   └── default.json      # Security permissions
│   │   └── icons/                # App icons for all platforms
│   └── packages/
│       └── oasis-sdk/            # Oasis SDK (optional)
└── README.md
```

---

## 2. Version Management

### Version Files to Keep in Sync

When releasing, these files must have matching versions:

| File | Version Location |
|------|------------------|
| `package.json` | `"version": "X.Y.Z"` |
| `tauri.conf.json` | `"version": "X.Y.Z"` |
| `Cargo.toml` | `version = "X.Y.Z"` |
| Status bar/UI | Display version string |

### Automated Version Bumping Script

Create `scripts/bump-version.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/bump-version.sh <major|minor|patch> [--dry-run] [--no-git]
#   ./scripts/bump-version.sh --set <version>      [--dry-run] [--no-git]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Files to update
PACKAGE_JSON="$APP_DIR/package.json"
TAURI_CONF="$APP_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$APP_DIR/src-tauri/Cargo.toml"

# Get current version from package.json
get_current_version() {
  grep -o '"version": *"[^"]*"' "$PACKAGE_JSON" | head -1 | sed 's/"version": *"\(.*\)"/\1/'
}

# Parse semver
parse_semver() {
  local version="$1"
  version="${version#v}"
  if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    SEMVER_MAJOR="${BASH_REMATCH[1]}"
    SEMVER_MINOR="${BASH_REMATCH[2]}"
    SEMVER_PATCH="${BASH_REMATCH[3]}"
  else
    echo "Invalid semver: $version" >&2
    exit 1
  fi
}

# Compute next version
compute_next_version() {
  local bump_type="$1" current="$2"
  parse_semver "$current"
  case "$bump_type" in
    major) echo "$((SEMVER_MAJOR + 1)).0.0" ;;
    minor) echo "${SEMVER_MAJOR}.$((SEMVER_MINOR + 1)).0" ;;
    patch) echo "${SEMVER_MAJOR}.${SEMVER_MINOR}.$((SEMVER_PATCH + 1))" ;;
  esac
}

# Update files
update_files() {
  local old="$1" new="$2"
  sed -i '' "s/\"version\": \"${old}\"/\"version\": \"${new}\"/" "$PACKAGE_JSON"
  sed -i '' "s/\"version\": \"${old}\"/\"version\": \"${new}\"/" "$TAURI_CONF"
  sed -i '' "0,/^version = \"${old}\"/s/^version = \"${old}\"/version = \"${new}\"/" "$CARGO_TOML"
  (cd "$APP_DIR/src-tauri" && cargo update -p your-app --quiet 2>/dev/null) || true
}

# Parse args and run
BUMP_TYPE="${1:-}"
CURRENT_VERSION=$(get_current_version)
NEW_VERSION=$(compute_next_version "$BUMP_TYPE" "$CURRENT_VERSION")

update_files "$CURRENT_VERSION" "$NEW_VERSION"

# Git operations
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: bump version to v${NEW_VERSION}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo "Version bumped to v${NEW_VERSION}"
echo "Push with: git push && git push --tags"
```

### NPM Scripts for Convenience

Add to `package.json`:

```json
{
  "scripts": {
    "version:patch": "./scripts/bump-version.sh patch",
    "version:minor": "./scripts/bump-version.sh minor",
    "version:major": "./scripts/bump-version.sh major",
    "redeploy": "./scripts/redeploy.sh"
  }
}
```

---

## 3. GitHub Workflows Setup

### Release Workflow (`.github/workflows/release.yaml`)

```yaml
name: Release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (skip uploads and registration)"
        required: false
        default: false
        type: boolean

permissions:
  contents: write

jobs:
  release:
    uses: porkytheblack/oasis/.github/workflows/tauri-release.yml@main
    permissions:
      contents: write
    with:
      app_slug: your-app-slug        # Unique app identifier
      app_name: Your App Name        # Display name
      artifact_prefix: YourApp       # Prefix for build artifacts
      app_dir: app                   # Path to app directory
      distribute_to: r2,oasis,github # Distribution targets
      dry_run: ${{ inputs.dry_run || false }}
      r2_public_url: ${{ vars.R2_PUBLIC_URL }}
    secrets:
      # Apple Code Signing (macOS)
      APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
      APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
      APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
      APPLE_ID: ${{ secrets.APPLE_ID }}
      APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
      APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      # Tauri Update Signing
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

      # Cloudflare R2 Storage
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      CLOUDFLARE_R2_ACCESS_KEY_ID: ${{ secrets.CLOUDFLARE_R2_ACCESS_KEY_ID }}
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${{ secrets.CLOUDFLARE_R2_SECRET_ACCESS_KEY }}
      R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}

      # Oasis Update Server
      OASIS_SERVER_URL: ${{ secrets.OASIS_SERVER_URL }}
      OASIS_CI_KEY: ${{ secrets.OASIS_CI_KEY }}

      # Frontend Environment
      NEXT_PUBLIC_OASIS_API_KEY: ${{ secrets.NEXT_PUBLIC_OASIS_API_KEY }}
      NEXT_PUBLIC_OASIS_SERVER_URL: ${{ secrets.NEXT_PUBLIC_OASIS_SERVER_URL }}
```

### Distribution Targets

| Target | Purpose |
|--------|---------|
| `github` | GitHub Releases - User downloads, changelog |
| `r2` | Cloudflare R2 - CDN storage for artifacts |
| `oasis` | Oasis Server - Update manifest & crash reporting |

---

## 4. Tauri Configuration for Deployment

### Complete `tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Your App",
  "version": "0.1.0",
  "identifier": "com.yourcompany.yourapp",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Your App",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "hiddenTitle": true,
        "titleBarStyle": "Overlay",
        "dragDropEnabled": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; img-src 'self' data: https:; font-src 'self' data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/*"]
  },
  "plugins": {
    "shell": {
      "open": true
    },
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://your-oasis-server.com/{app_slug}/update/{{target}}-{{arch}}/{{current_version}}"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

### Capabilities Configuration (`capabilities/default.json`)

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for the app",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "shell:default",
    "shell:allow-open",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "dialog:allow-confirm",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "http:default",
    "updater:default",
    "updater:allow-check",
    "updater:allow-download-and-install",
    "process:default",
    "process:allow-restart"
  ]
}
```

### Cargo.toml Dependencies

```toml
[package]
name = "your-app"
version = "0.1.0"
edition = "2021"

[lib]
name = "your_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-http = "2"
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

[profile.release]
strip = true
lto = true
codegen-units = 1
panic = "abort"
```

---

## 5. Oasis Update Server Setup

### Overview

Oasis is a self-hosted release and analytics server for Tauri applications. It provides:

- **Update manifests** - Platform-specific update endpoints
- **Crash reporting** - Automatic crash collection
- **Feedback collection** - In-app user feedback
- **Release management** - Version tracking and distribution

### Update Endpoint Format

```
https://your-oasis-server.com/{app_slug}/update/{target}-{arch}/{current_version}
```

Template variables:
- `{{target}}` - OS target (darwin, linux, windows)
- `{{arch}}` - Architecture (x86_64, aarch64)
- `{{current_version}}` - Current app version

### Generating Signing Keys

Generate a keypair for update signature verification:

```bash
# Generate private/public key pair
npx @tauri-apps/cli signer generate -w ~/.tauri/keys/your-app.key

# Output:
# Public key: dW50cnVzdGVk...
# Private key saved to: ~/.tauri/keys/your-app.key
```

Store the public key in `tauri.conf.json` and the private key as a GitHub secret.

### Oasis SDK Integration

Install the SDK for crash reporting and feedback:

```bash
npm install @oasis/sdk
```

Initialize in your app:

```typescript
import { initOasis } from '@oasis/sdk';

const oasis = initOasis({
  apiKey: 'pk_your-app_randomchars',      // From Oasis dashboard
  serverUrl: 'https://your-oasis-server.com',
  appVersion: '0.1.0',                     // Current app version
  enableAutoCrashReporting: true,
});

// Submit feedback
await oasis.feedback.submit({
  category: 'bug',
  message: 'Description of the issue',
  email: 'user@example.com',
});

// Capture exceptions
try {
  riskyOperation();
} catch (error) {
  oasis.crashes.captureException(error);
}
```

### API Key Format

Oasis API keys follow this format:
```
pk_{app-slug}_{random-chars}
```

Example: `pk_coco_a1b2c3d4e5f6g7h8`

### Oasis Server Environment Variables

For CI/CD:

| Variable | Description |
|----------|-------------|
| `OASIS_SERVER_URL` | Base URL of your Oasis server |
| `OASIS_CI_KEY` | CI authentication key for publishing releases |
| `NEXT_PUBLIC_OASIS_API_KEY` | Public API key for SDK |
| `NEXT_PUBLIC_OASIS_SERVER_URL` | Server URL exposed to frontend |

---

## 6. Secrets & Environment Variables

### Required GitHub Secrets

#### Apple Code Signing (macOS/iOS)

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password |
| `APPLE_SIGNING_IDENTITY` | Certificate name (e.g., "Developer ID Application: Your Name") |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

#### Tauri Signing

| Secret | Description |
|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key for update signing |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Private key password |

#### Cloudflare R2

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |

#### Oasis

| Secret | Description |
|--------|-------------|
| `OASIS_SERVER_URL` | Oasis server URL |
| `OASIS_CI_KEY` | CI authentication key |
| `NEXT_PUBLIC_OASIS_API_KEY` | Public SDK API key |
| `NEXT_PUBLIC_OASIS_SERVER_URL` | Public server URL |

### Repository Variables

| Variable | Description |
|----------|-------------|
| `R2_PUBLIC_URL` | Public CDN URL for R2 bucket |

---

## 7. Release Flow

### Standard Release Process

```bash
# 1. Bump version (creates commit + tag)
npm run version:patch   # 0.1.0 -> 0.1.1
# or
npm run version:minor   # 0.1.0 -> 0.2.0
# or
npm run version:major   # 0.1.0 -> 1.0.0

# 2. Push to trigger release
git push && git push --tags
```

### Re-deploy Failed Release

If a release fails, use the redeploy script:

```bash
npm run redeploy
# or for a specific version:
./scripts/redeploy.sh v0.1.5
```

This script:
1. Deletes the tag locally and on origin
2. Recreates the tag at HEAD
3. Pushes to re-trigger the workflow

### Manual Workflow Trigger

For testing without creating a release:

1. Go to GitHub Actions
2. Select "Release" workflow
3. Click "Run workflow"
4. Check "Dry run" to skip uploads

---

## 8. Troubleshooting

### Common Issues

#### "Tag already exists"
```bash
# Delete existing tag and recreate
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

#### "Code signing failed" (macOS)
- Verify certificate is not expired
- Check `APPLE_SIGNING_IDENTITY` matches certificate name exactly
- Ensure app-specific password is used (not Apple ID password)

#### "Update signature verification failed"
- Verify public key in `tauri.conf.json` matches private key
- Regenerate keys if mismatch

#### "Oasis server unreachable"
- Check `OASIS_SERVER_URL` includes protocol (`https://`)
- Verify `OASIS_CI_KEY` has publish permissions

### Debug Commands

```bash
# Check current version
cat package.json | grep version

# Verify tag exists
git tag -l "v*"

# Check remote tags
git ls-remote --tags origin

# View workflow runs
gh run list --workflow=release.yaml

# View specific run logs
gh run view <run-id> --log
```

---

## Quick Reference

### Release Checklist

- [ ] All changes committed
- [ ] Tests passing
- [ ] Version bumped in all files
- [ ] Tag created and pushed
- [ ] GitHub Actions workflow completed
- [ ] Downloads available on GitHub Releases
- [ ] Update endpoint returning new version
- [ ] Oasis dashboard showing new release

### Key URLs

- **GitHub Releases:** `https://github.com/{owner}/{repo}/releases`
- **Update Endpoint:** `https://oasis.server.com/{app_slug}/update/{target}-{arch}/{version}`
- **Oasis Dashboard:** `https://oasis.server.com/dashboard`
- **R2 Artifacts:** `https://{r2-public-url}/{app_slug}/`
