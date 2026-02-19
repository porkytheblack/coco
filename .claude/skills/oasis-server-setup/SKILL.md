---
name: oasis-server-setup
description: Setup Oasis update server for Tauri applications with crash reporting and feedback collection. Use when users need help with oasis setup, oasis server, update server, crash reporting, feedback collection, tauri updater, or auto update configuration.
---

# Oasis Update Server Setup Guide

This guide covers the complete setup of the Oasis update server for Tauri applications, including server configuration, client SDK integration, and CI/CD pipeline setup.

---

## Table of Contents

1. [What is Oasis?](#1-what-is-oasis)
2. [Server Deployment](#2-server-deployment)
3. [App Registration](#3-app-registration)
4. [Tauri Updater Configuration](#4-tauri-updater-configuration)
5. [Oasis SDK Integration](#5-oasis-sdk-integration)
6. [CI/CD Pipeline Integration](#6-cicd-pipeline-integration)
7. [Update Flow Architecture](#7-update-flow-architecture)
8. [API Reference](#8-api-reference)

---

## 1. What is Oasis?

Oasis is a self-hosted release management and analytics server specifically designed for Tauri applications. It provides:

### Core Features

| Feature | Description |
|---------|-------------|
| **Update Manifests** | Platform-specific update endpoints for Tauri's built-in updater |
| **Release Management** | Version tracking, artifact storage, and distribution |
| **Crash Reporting** | Automatic crash collection with stack traces and breadcrumbs |
| **Feedback Collection** | In-app user feedback with categorization |
| **Device Analytics** | Platform, OS version, and architecture insights |

### Architecture

```
+------------------+     +------------------+     +------------------+
|   Tauri App      |---->|  Oasis Server    |---->|   Storage (R2)   |
|   + Oasis SDK    |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        |                       |
        | Check for updates     | Register releases
        | Submit crashes        | Serve update manifests
        | Send feedback         | Store analytics
        v                       v
+------------------------------------------------------------------+
|                        GitHub Actions                             |
|   Build -> Sign -> Upload to R2 -> Register with Oasis            |
+------------------------------------------------------------------+
```

---

## 2. Server Deployment

### Using the Reusable Workflow

The Oasis server is deployed separately. Your app integrates with it via the reusable GitHub workflow:

```yaml
jobs:
  release:
    uses: porkytheblack/oasis/.github/workflows/tauri-release.yml@main
```

### Server Endpoints

The Oasis server exposes these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{app_slug}/update/{target}-{arch}/{version}` | GET | Update manifest |
| `/sdk/{app_slug}/feedback` | POST | Submit feedback |
| `/sdk/{app_slug}/crashes` | POST | Report crashes |
| `/api/releases/{app_slug}` | POST | Register new release (CI only) |

### Update Manifest Response

When a client checks for updates, Oasis returns:

```json
{
  "version": "0.2.0",
  "notes": "Bug fixes and improvements",
  "pub_date": "2024-01-15T10:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://cdn.example.com/coco/v0.2.0/Coco_0.2.0_x64.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://cdn.example.com/coco/v0.2.0/Coco_0.2.0_aarch64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://cdn.example.com/coco/v0.2.0/Coco_0.2.0_x64-setup.nsis.zip"
    },
    "linux-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://cdn.example.com/coco/v0.2.0/Coco_0.2.0_amd64.AppImage.tar.gz"
    }
  }
}
```

---

## 3. App Registration

### Creating an App in Oasis

1. Access the Oasis dashboard
2. Create a new app with:
   - **App Slug**: Unique identifier (e.g., `coco`)
   - **App Name**: Display name (e.g., `Coco`)
   - **Description**: Brief description

### API Keys

Oasis uses two types of keys:

| Key Type | Format | Purpose |
|----------|--------|---------|
| **Public Key** | `pk_{app-slug}_{random}` | SDK operations (feedback, crashes) |
| **CI Key** | `ci_{app-slug}_{random}` | Release registration |

Example:
```
Public: pk_coco_a1b2c3d4e5f6g7h8
CI:     ci_coco_x9y8z7w6v5u4t3s2
```

---

## 4. Tauri Updater Configuration

### Generate Signing Keys

First, generate a keypair for update verification:

```bash
# Generate keypair (saves private key to file, outputs public key)
npx @tauri-apps/cli signer generate -w ~/.tauri/keys/app-name.key

# Output example:
# Please enter a password to protect the secret key: ****
# Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6...
# Private key saved to: /Users/you/.tauri/keys/app-name.key
```

### Configure tauri.conf.json

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_FROM_GENERATION_STEP",
      "endpoints": [
        "https://oasis.yourdomain.com/{app_slug}/update/{{target}}-{{arch}}/{{current_version}}"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

### Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{target}}` | Operating system | `darwin`, `windows`, `linux` |
| `{{arch}}` | CPU architecture | `x86_64`, `aarch64` |
| `{{current_version}}` | Current app version | `0.1.0` |

### Required Capabilities

Add to `capabilities/default.json`:

```json
{
  "permissions": [
    "updater:default",
    "updater:allow-check",
    "updater:allow-download-and-install",
    "process:default",
    "process:allow-restart"
  ]
}
```

### Check for Updates in Frontend

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  try {
    const update = await check();

    if (update?.available) {
      console.log(`Update available: ${update.version}`);

      // Download and install
      await update.downloadAndInstall();

      // Relaunch to apply
      await relaunch();
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
```

---

## 5. Oasis SDK Integration

### Installation

```bash
npm install @oasis/sdk
# or
pnpm add @oasis/sdk
# or
yarn add @oasis/sdk
```

### Initialization

```typescript
// lib/oasis.ts
import { initOasis } from '@oasis/sdk';

export const oasis = initOasis({
  // Required
  apiKey: process.env.NEXT_PUBLIC_OASIS_API_KEY!,
  serverUrl: process.env.NEXT_PUBLIC_OASIS_SERVER_URL!,
  appVersion: '0.1.0', // Match tauri.conf.json version

  // Optional
  enableAutoCrashReporting: true,  // Catch uncaught errors
  maxBreadcrumbs: 50,              // Breadcrumb history limit
  timeout: 10000,                  // Request timeout (ms)
  debug: false,                    // Debug logging

  // Hooks
  beforeSend: (event) => {
    // Filter sensitive data
    if (event.message?.includes('password')) {
      return null; // Drop event
    }
    return event;
  },
  onError: (error) => {
    console.error('Oasis error:', error);
  },
});
```

### Feedback Submission

```typescript
// Submit categorized feedback
await oasis.feedback.submit({
  category: 'bug',        // 'bug' | 'feature' | 'general'
  message: 'Description of the issue',
  email: 'user@example.com',  // Optional
  metadata: {                  // Optional
    screen: 'settings',
    action: 'save',
  },
});

// Convenience methods
await oasis.feedback.reportBug('The save button does not work');
await oasis.feedback.requestFeature('Add dark mode support');
await oasis.feedback.sendFeedback('Great app!');
```

### Crash Reporting

```typescript
// Manual exception capture
try {
  riskyOperation();
} catch (error) {
  await oasis.crashes.captureException(error, {
    appState: { currentScreen: 'checkout' },
    severity: 'error',  // 'warning' | 'error' | 'fatal'
  });
}

// Full crash report
await oasis.crashes.report({
  error: new Error('Critical failure'),
  appState: { userId: 'user-123' },
  severity: 'fatal',
});

// Auto-capture toggle
oasis.crashes.enableAutoCrashReporting();
oasis.crashes.disableAutoCrashReporting();
```

### Breadcrumbs

Breadcrumbs provide context for crash reports:

```typescript
// Navigation
oasis.breadcrumbs.addNavigation('/home', '/settings');

// User actions
oasis.breadcrumbs.addClick('Save Button');
oasis.breadcrumbs.addUserAction('Changed notification settings');

// HTTP requests
oasis.breadcrumbs.addHttp('POST', '/api/save', 200);

// Custom
oasis.breadcrumbs.addCustom('wallet', 'Connected MetaMask', {
  address: '0x1234...',
});
```

### User Context

Track affected users without PII:

```typescript
// Set user (call after authentication)
oasis.setUser({
  id: 'user-123',
  email: 'user@example.com',  // Optional
  username: 'johndoe',        // Optional
});

// Clear on logout
oasis.setUser(null);
```

---

## 6. CI/CD Pipeline Integration

### Release Workflow Configuration

```yaml
# .github/workflows/release.yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    uses: porkytheblack/oasis/.github/workflows/tauri-release.yml@main
    with:
      app_slug: coco
      app_name: Coco
      artifact_prefix: Coco
      app_dir: app
      distribute_to: r2,oasis,github
    secrets:
      # Tauri signing
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

      # Apple signing (macOS)
      APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
      APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
      APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
      APPLE_ID: ${{ secrets.APPLE_ID }}
      APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
      APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      # Storage
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      CLOUDFLARE_R2_ACCESS_KEY_ID: ${{ secrets.CLOUDFLARE_R2_ACCESS_KEY_ID }}
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${{ secrets.CLOUDFLARE_R2_SECRET_ACCESS_KEY }}
      R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}

      # Oasis
      OASIS_SERVER_URL: ${{ secrets.OASIS_SERVER_URL }}
      OASIS_CI_KEY: ${{ secrets.OASIS_CI_KEY }}

      # Frontend env
      NEXT_PUBLIC_OASIS_API_KEY: ${{ secrets.NEXT_PUBLIC_OASIS_API_KEY }}
      NEXT_PUBLIC_OASIS_SERVER_URL: ${{ secrets.NEXT_PUBLIC_OASIS_SERVER_URL }}
```

### What the Workflow Does

1. **Build** - Compiles for Windows, macOS, and Linux
2. **Sign** - Apple notarization + Tauri update signatures
3. **Upload to R2** - Stores artifacts in Cloudflare R2
4. **Register with Oasis** - Creates update manifest entry
5. **GitHub Release** - Creates release with changelog

---

## 7. Update Flow Architecture

### Client Update Check Flow

```
+---------------------------------------------------------------------+
|                         User's Desktop App                           |
+---------------------------------------------------------------------+
                                  |
                                  | 1. check() called
                                  v
+---------------------------------------------------------------------+
| GET https://oasis.server.com/coco/update/darwin-aarch64/0.1.0       |
+---------------------------------------------------------------------+
                                  |
                                  | 2. Oasis returns manifest
                                  v
+---------------------------------------------------------------------+
| {                                                                    |
|   "version": "0.2.0",                                               |
|   "url": "https://cdn.../Coco_0.2.0_aarch64.app.tar.gz",           |
|   "signature": "dW50cnVzdGVk..."                                    |
| }                                                                    |
+---------------------------------------------------------------------+
                                  |
                                  | 3. Download from CDN (R2)
                                  v
+---------------------------------------------------------------------+
| Download Coco_0.2.0_aarch64.app.tar.gz                              |
| Verify signature with embedded pubkey                                |
| Extract and install                                                  |
+---------------------------------------------------------------------+
                                  |
                                  | 4. Relaunch
                                  v
+---------------------------------------------------------------------+
|                         App v0.2.0 Running                           |
+---------------------------------------------------------------------+
```

### Release Publishing Flow

```
+------------------+     +------------------+     +------------------+
|  Developer       |     |  GitHub Actions  |     |  Oasis Server    |
+------------------+     +------------------+     +------------------+
        |                       |                       |
        | git push --tags       |                       |
        |---------------------->|                       |
        |                       |                       |
        |                       | Build for all         |
        |                       | platforms             |
        |                       |                       |
        |                       | Sign with:            |
        |                       | - Apple certs         |
        |                       | - Tauri privkey       |
        |                       |                       |
        |                       | Upload to R2          |
        |                       | ------------------->  | CDN
        |                       |                       |
        |                       | POST /api/releases    |
        |                       |---------------------->|
        |                       |                       |
        |                       |                       | Store release
        |                       |                       | metadata
        |                       |                       |
        |                       | Create GitHub         |
        |                       | Release               |
        |                       |                       |
```

---

## 8. API Reference

### Update Endpoint

**Request:**
```
GET /{app_slug}/update/{target}-{arch}/{current_version}
```

**Response (update available):**
```json
{
  "version": "0.2.0",
  "notes": "Release notes...",
  "pub_date": "2024-01-15T10:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://..."
    }
  }
}
```

**Response (no update):**
```
HTTP 204 No Content
```

### Feedback Endpoint

**Request:**
```
POST /sdk/{app_slug}/feedback
X-API-Key: pk_coco_...

{
  "category": "bug",
  "message": "Description",
  "email": "user@example.com",
  "appVersion": "0.1.0",
  "platform": "darwin",
  "osVersion": "14.0",
  "deviceInfo": {...}
}
```

### Crash Endpoint

**Request:**
```
POST /sdk/{app_slug}/crashes
X-API-Key: pk_coco_...

{
  "errorType": "TypeError",
  "errorMessage": "Cannot read property 'x' of undefined",
  "stackTrace": "...",
  "appVersion": "0.1.0",
  "platform": "darwin",
  "osVersion": "14.0",
  "deviceInfo": {...},
  "appState": {...},
  "breadcrumbs": [...],
  "severity": "error",
  "userId": "user-123"
}
```

---

## Quick Setup Checklist

- [ ] Generate Tauri signing keypair
- [ ] Configure `tauri.conf.json` updater with pubkey and endpoint
- [ ] Add updater capabilities to `default.json`
- [ ] Install and initialize Oasis SDK
- [ ] Set up GitHub secrets:
  - [ ] `TAURI_SIGNING_PRIVATE_KEY`
  - [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - [ ] `OASIS_SERVER_URL`
  - [ ] `OASIS_CI_KEY`
  - [ ] `NEXT_PUBLIC_OASIS_API_KEY`
  - [ ] `NEXT_PUBLIC_OASIS_SERVER_URL`
- [ ] Configure release workflow
- [ ] Test update flow with dry run
