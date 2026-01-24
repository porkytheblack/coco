# Coco

A blockchain development workstation for multi-chain workflows. Local-first desktop app that organizes your contracts, transactions, and wallets across EVM, Solana, and Aptos.

## Features

- **Multi-Chain Support** - EVM (Ethereum), Solana, Aptos with native SDK integration
- **Wallet Management** - Create, import, and organize development wallets by chain
- **Contract Workspaces** - Project spaces with assigned wallets, deployed contracts, and saved transactions
- **Contract Discovery** - Auto-scan Forge `out/`, Anchor `target/idl/`, and Aptos `build/` directories
- **Script Editor** - TypeScript scripts with ethers.js, @solana/web3.js, @aptos-labs/ts-sdk
- **CLI Integration** - Wrap Forge, Anchor, Aptos CLI for builds, tests, and deploys
- **Transaction History** - Every transaction saved with parameters, response, events, gas, timestamps

## Tech Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand

**Backend:** Tauri 2 (Rust), SQLite, ethers.rs

**Blockchain SDKs:** ethers.js, @solana/web3.js, @aptos-labs/ts-sdk, @coral-xyz/anchor

## Prerequisites

- Node.js and npm
- Rust toolchain
- CLI tools for your target ecosystems (Forge, Anchor CLI, Aptos CLI)

## Installation

```bash
cd app
npm install
```

## Development

```bash
# Run the Tauri app with live reload
npm run tauri:dev

# Frontend-only dev server
npm run dev

# Run tests
npm run test
npm run test:e2e
```

## Build

```bash
npm run tauri:build
```

## License

MIT
