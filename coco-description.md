# Coco

## Your Blockchain Development Workstation

---

## What is Coco?

Coco is a local-first tool for blockchain developers who are tired of chaos—scattered wallets, forgotten transactions, and the constant re-sending of requests just to remember what happened.

Think Postman, but for on-chain work. Every transaction is a request you can save, replay, and inspect. Every contract gets a workspace. Every wallet stays organized. Coco treats blockchain development like the structured workflow it should be—not the mess it usually becomes.

---

## Philosophy

**"Never send the same transaction twice."**

Blockchain development is stateful, but our tools pretend it isn't. You deploy a contract, test a function, get a result—and then it's gone. Lost to the terminal. Lost to the block explorer. Lost to your memory.

Coco remembers everything. Every transaction you send becomes a saved request with its full response—events, logs, gas, errors, all of it. Your development history becomes browsable, searchable, and reusable.

Coco is the lab notebook for on-chain work.

---

## How Coco Works

### The Hierarchy — Chains, Wallets, Contracts

Coco organizes your work the way blockchains actually work:

```
Chain (Ethereum Sepolia)
├── Wallets
│   ├── deployer
│   ├── user-alice
│   └── user-bob
└── Contract Workspaces
    ├── TokenContract
    └── MarketplaceContract

Chain (Solana Devnet)
├── Wallets
│   └── dev-wallet
└── Contract Workspaces
    └── AnchorProgram
```

**Chains** are your top-level containers. Add any network—testnets, local nodes, mainnets.

**Wallets** live under chains. Create them, import them, fund them. Each wallet shows its balance and transaction history at a glance.

**Contract Workspaces** also live under chains. When you create a workspace, you assign wallets from that chain to use for deployments, testing, and interactions.

This structure mirrors how you actually think about your projects: "I'm working on Sepolia with these three test wallets and this contract."

---

### Wallet Management — Organized by Chain

Each chain maintains its own wallet collection:

- **Create** — Generate new wallets directly in Coco
- **Import** — Bring in existing wallets via private key or mnemonic
- **Fund** — One-click faucet requests or transfer from other wallets
- **View** — See balances, token holdings, and full transaction history
- **Label** — Name wallets by role: `deployer`, `admin`, `test-user-1`

Wallets are scoped to their chain but can be assigned to multiple contract workspaces within that chain. Your keys are stored locally, encrypted, and never leave your machine.

---

### Contract Workspaces — Your Project's Home

A contract workspace is where the real work happens. Each workspace contains:

- **Assigned Wallets** — Pick which wallets from the chain to use here
- **Deployed Contracts** — Addresses, ABIs, source code references
- **Saved Transactions** — Every request and response, automatically stored
- **Custom Interfaces** — Forms you build to interact with contract functions
- **Build & Deploy History** — A log of every compilation, deployment, and verification

Create a workspace, assign your wallets, and start building.

---

### Multi-Chain Support — EVM, Solana, Aptos

Coco isn't Ethereum-only. It supports multiple ecosystems, each with their native tooling:

| Ecosystem | Tooling | Contract Type | Artifact Format |
|-----------|---------|---------------|-----------------|
| EVM | Forge (Foundry) | Solidity | ABI (JSON) |
| Solana | Anchor | Rust / Anchor | IDL |
| Aptos | Aptos CLI | Move | Module definitions |

Each ecosystem has its own quirks—different transaction formats, different event structures, different deployment flows. Coco renders everything in chain-native formats so you see the data the way it actually exists on that network.

---

### Contract Discovery — Point to a Directory

Setting up a contract workspace should be simple: point Coco at your project directory and let it figure out what's there.

**How it works:**

1. **Select your project root** — The directory containing your contracts
2. **Coco scans for artifacts** — Based on the ecosystem, it looks in the right places
3. **You pick what to import** — Coco shows what it found; you select the contracts you care about

| Ecosystem | Coco looks in | What it finds |
|-----------|---------------|---------------|
| Forge | `out/` directory | Compiled ABIs and bytecode |
| Anchor | `target/idl/` | IDL files for each program |
| Aptos | `build/` | Compiled Move modules |

Forge projects often have dozens of artifacts—dependencies, interfaces, libraries, test contracts. Coco lists them all, but you choose which ones become part of your workspace. Only import what you'll actually interact with.

For manual setup, you can always add contracts directly: paste an ABI, upload an IDL, or enter a deployed address. Not everything comes from a local project.

---

### Script Editor — Write Native Code, Capture Transactions

Here's the thing about multi-chain development: every ecosystem has its own SDK, its own patterns, its own way of doing things. Ethers.js doesn't look like `@solana/web3.js` doesn't look like the Aptos SDK.

Coco doesn't try to abstract this away. Instead, it gives you a script editor.

**The idea:**

Write TypeScript using whatever SDK you want. Coco provides a `runTransaction()` wrapper that captures the result. You get the flexibility of native code with the organization of Coco's transaction history.

```typescript
// Example: Mint tokens on EVM
import { ethers } from "ethers";

export default async function (payload: MintPayload): Promise<MintResult> {
  const contract = coco.getContract("TokenContract");
  const wallet = coco.getWallet("deployer");
  
  const tx = await contract.connect(wallet).mint(payload.to, payload.amount);
  const receipt = await tx.wait();
  
  return coco.runTransaction(tx, receipt, {
    minted: payload.amount,
    recipient: payload.to,
  });
}
```

**You define the interface:**

```typescript
interface MintPayload {
  to: string;
  amount: bigint;
}

interface MintResult {
  minted: bigint;
  recipient: string;
}
```

When you run the script, Coco shows a form matching your payload interface. You fill it in, execute, and the transaction is captured—with your custom result structure attached.

**Why this matters:**

- **Complex interactions** — Multi-step flows, conditional logic, batch operations—just write the code
- **Chain-native patterns** — Use the SDK you know, the way it's meant to be used
- **Deployment scripts** — Your deploy logic is just another script, fully captured and replayable
- **No translation layer** — You're not learning "Coco's way" of doing things; you're writing real code

**The script library:**

Scripts are saved per workspace. Build up a collection:

- `deploy.ts` — Your deployment flow
- `mint.ts` — Mint tokens to an address
- `full-flow.ts` — End-to-end test scenario
- `airdrop.ts` — Batch transfer to multiple addresses

Each script has its payload interface, its result interface, and its full execution history. Run it once or a hundred times—every execution is logged.

**The editor:**

A minimal TypeScript editor lives inside Coco. Syntax highlighting, type checking against your interfaces, access to `coco.*` helpers. Nothing fancy—just enough to write and run scripts without leaving the app.

---

### CLI Integration — Your Tools, Coco's Interface

Blockchain development depends on CLI tools: Forge for EVM, Anchor for Solana, Aptos CLI for Move. Coco doesn't replace these—it wraps them.

**How it works:**

1. **Configure once** — Point Coco to your installed CLI tools (Forge, Anchor, Aptos CLI)
2. **Run from the UI** — Trigger builds, tests, deployments, and verifications with a click
3. **Watch it happen** — A built-in terminal panel streams the CLI output in real-time

You get the convenience of a GUI with the power of your existing toolchain. No magic, no abstraction—just your tools, running visibly, with results captured and saved.

**Supported actions:**

- **Build** — Compile contracts, see errors inline
- **Test** — Run your test suites, stream results live
- **Deploy** — Push to any configured network
- **Verify** — Submit source to block explorers

Every action is logged. Every output is saved. If a deploy failed last Tuesday, you can see exactly what happened.

---

### Transactions as Requests — Send, Save, Inspect

Coco treats every transaction like Postman treats HTTP requests:

- **Compose** — Build your transaction with a clean interface
- **Send** — Execute on your target network using an assigned wallet
- **Save** — The transaction and its response are stored automatically
- **Inspect** — View the result in blockchain-native format: events parsed, logs decoded, gas breakdown included

Need to check what happened three days ago? It's there. Need to re-send with different parameters? Duplicate and go.

**What gets saved:**

- Full request parameters
- Transaction hash and block confirmation
- Decoded events and logs
- Gas used and fees paid
- Revert reasons (when things fail)
- Timestamps and wallet used

Your transaction history becomes documentation.

---

### AI Assistance — Context-Aware Help

Coco's AI understands your workspace. It sees your contracts, your transaction history, your errors. It can:

- Explain transaction failures in plain language
- Suggest fixes for reverted calls
- Help decode unfamiliar events or logs
- Generate transaction sequences for testing flows
- Answer questions about chain-specific behavior

The AI doesn't guess—it works with the context you've already built.

---

## What Coco Is Not

**Not a wallet app.** Coco manages development wallets, not your personal funds. Keep mainnet assets elsewhere.

**Not a block explorer.** Coco saves *your* transactions for *your* projects. It doesn't index chains.

**Not cloud-dependent.** Your data lives on your machine. No accounts, no sync, no subscriptions.

**Not a CLI replacement.** Coco wraps Forge, Anchor, and Aptos CLI—it doesn't reimplement them. Your existing scripts and configs still work.

---

## Who Coco Is For

- Developers testing contracts across multiple chains
- Teams building on EVM, Solana, and Aptos who want one unified workflow
- Anyone who's lost track of what they deployed and where
- Builders who want Postman's structure for on-chain work
- People who value local-first tools and data ownership

---

## The Coco Experience

You open Coco. You add Ethereum Sepolia as a chain.

You create three wallets: `deployer`, `alice`, `bob`. You fund them from the faucet—one click each. Their balances appear.

You create a contract workspace for your new token. You point Coco at your Forge project directory. It scans `out/`, finds your contracts, and you select the ones you need. ABIs imported, ready to go.

You hit **Build**. The terminal panel opens, Forge compiles, output streams in real-time. No errors.

You write a deployment script in the editor—TypeScript, ethers.js, nothing fancy. You define the payload interface (constructor args) and hit run. The terminal shows the deployment, Coco captures the transaction, and your contract address appears in the workspace.

You write a few more scripts: `mint.ts`, `transfer.ts`, `check-balance.ts`. Each one defines its inputs and outputs. Each one becomes a form you can fill out and execute.

You test the full flow with `alice` and `bob`. Every script execution is saved—payload, result, transaction details, logs.

A week later, a bug report. You scroll through your transaction history. There's the failing call: the script that ran, the payload that was passed, the exact revert reason.

You fix the contract, rebuild, re-run your deploy script. You re-execute the failing script with the same payload. It passes.

You close Coco. Tomorrow, it's all still there—the scripts, the history, the wallets, everything.

---

## Summary

Coco is a blockchain development workstation that brings order to on-chain chaos. Organize chains, wallets, and contracts in a clear hierarchy. Point to your project directory and import contracts automatically. Write interaction scripts in TypeScript using native SDKs—Coco captures every transaction without abstracting away chain differences. Build, test, deploy, and verify using your existing CLI tools with a real-time terminal view. Support for EVM, Solana, and Aptos out of the box. Local-first, AI-assisted, and built for developers who want their blockchain workflow to finally make sense.
