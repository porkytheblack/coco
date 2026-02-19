# DevRel Agent Skills

This directory contains agent skills for setting up and managing Tauri application deployments.

## Available Skills

### 1. `tauri-deployment-setup`

Comprehensive guide for setting up:
- GitHub Actions release workflows
- Version management across project files
- Tauri configuration for multi-platform deployment
- Code signing for macOS and Windows
- Cloudflare R2 artifact storage

**Trigger phrases:** "setup deployment", "github workflow", "tauri release", "version management"

### 2. `oasis-server-setup`

Detailed guide for configuring the Oasis update server:
- Tauri updater plugin configuration
- Signing key generation and management
- Oasis SDK integration for crash reporting
- Feedback collection implementation
- Update flow architecture

**Trigger phrases:** "oasis setup", "update server", "crash reporting", "auto update"

### 3. `version-bump-tag`

Guide for programmatically bumping package versions and managing git tags:
- Pre-push validation (uncommitted changes, unpushed commits)
- Semantic versioning (semver) guidelines
- Version files across different project types (Node.js, Rust, Tauri)
- Git tag creation and pushing
- Complete release workflows
- Redeployments for failed releases
- Using this project's bump-version.sh and redeploy.sh scripts

**Trigger phrases:** "bump version", "create tag", "push tag", "release version", "redeploy", "failed release"

## Usage

Reference these skills when setting up new Tauri applications or troubleshooting deployment issues.

## File Structure

```
skills/
├── README.md                           # This file
├── tauri-deployment-setup.md           # Main deployment guide
├── tauri-deployment-setup.skill.json   # Skill definition
├── oasis-server-setup.md               # Oasis-specific guide
├── oasis-server-setup.skill.json       # Skill definition
├── version-bump-tag.md                 # Version bumping guide
└── version-bump-tag.skill.json         # Skill definition
```
