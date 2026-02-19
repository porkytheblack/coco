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

**Invoke:** `/tauri-deployment-setup` or ask about "setup deployment", "github workflow", "tauri release"

### 2. `oasis-server-setup`

Detailed guide for configuring the Oasis update server:
- Tauri updater plugin configuration
- Signing key generation and management
- Oasis SDK integration for crash reporting
- Feedback collection implementation
- Update flow architecture

**Invoke:** `/oasis-server-setup` or ask about "oasis setup", "update server", "crash reporting"

### 3. `version-bump-tag`

Guide for programmatically bumping package versions and managing git tags:
- Pre-push validation (uncommitted changes, unpushed commits)
- Semantic versioning (semver) guidelines
- Version files across different project types (Node.js, Rust, Tauri)
- Git tag creation and pushing
- Complete release workflows
- Redeployments for failed releases
- Using this project's bump-version.sh and redeploy.sh scripts

**Invoke:** `/version-bump-tag` or ask about "bump version", "create tag", "release version", "redeploy"

## Usage

Reference these skills when setting up new Tauri applications or troubleshooting deployment issues.

## File Structure

```
skills/
├── README.md                              # This file
├── tauri-deployment-setup/
│   └── SKILL.md                           # Main skill with YAML frontmatter
├── oasis-server-setup/
│   └── SKILL.md                           # Main skill with YAML frontmatter
└── version-bump-tag/
    └── SKILL.md                           # Main skill with YAML frontmatter
```

## SKILL.md Format

Each skill uses the new directory-based format with YAML frontmatter:

```yaml
---
name: skill-name
description: What the skill does and when to use it. Include trigger phrases here.
---

# Skill Title

Markdown content with instructions...
```

The `description` field is critical - it tells Claude when to automatically invoke the skill based on user requests.
