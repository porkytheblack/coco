import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, VersionedTransaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import type { ChainAdapter, CallResult, WalletBalance } from './types';
import type { Contract, ContractFunction, TokenBalance, WalletTransaction, AccountRequirement, PdaDefinition, PdaSeed } from '@/types';
import bs58 from 'bs58';

/**
 * Simple Wallet implementation for Anchor that wraps a Keypair
 */
class KeypairWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs.map((tx) => {
      if (tx instanceof Transaction) {
        tx.partialSign(this.payer);
      }
      return tx;
    });
  }
}

// Legacy Anchor IDL format (< 0.30)
interface LegacyIDLInstruction {
  name: string;
  args?: { name: string; type: unknown }[];
  accounts?: { name: string; isMut: boolean; isSigner: boolean }[];
}

interface LegacyIDLType {
  version?: string;
  name?: string;
  instructions?: LegacyIDLInstruction[];
  accounts?: { name: string; type: unknown }[];
}

// New Anchor IDL format (>= 0.30)
interface NewIDLAccount {
  name: string;
  writable?: boolean;
  signer?: boolean;
  address?: string;
  pda?: unknown;
  relations?: string[];
}

interface NewIDLInstruction {
  name: string;
  discriminator?: number[];
  docs?: string[];
  args?: { name: string; type: unknown }[];
  accounts?: NewIDLAccount[];
  returns?: unknown;
}

interface NewIDLType {
  address?: string;
  metadata?: {
    name: string;
    version: string;
    spec?: string;
    description?: string;
  };
  docs?: string[];
  instructions?: NewIDLInstruction[];
  accounts?: { name: string; discriminator?: number[] }[];
  events?: { name: string; discriminator?: number[] }[];
  errors?: { code: number; name: string; msg?: string }[];
  types?: { name: string; type: unknown }[];
}

// Union type for both formats
type IDLType = LegacyIDLType | NewIDLType;

/**
 * Detect if the IDL is in the new Anchor format (>= 0.30)
 */
function isNewAnchorFormat(idl: IDLType): idl is NewIDLType {
  return 'address' in idl || 'metadata' in idl;
}

/**
 * Normalize an instruction to a common format for processing
 */
interface NormalizedAccount {
  name: string;
  isMut: boolean;
  isSigner: boolean;
  address?: string;
  pda?: PdaDefinition;
}

interface NormalizedInstruction {
  name: string;
  args: { name: string; type: unknown }[];
  accounts: NormalizedAccount[];
}

/**
 * Parse PDA definition from new Anchor format
 */
function parsePdaDefinition(pda: unknown): PdaDefinition | undefined {
  if (!pda || typeof pda !== 'object') return undefined;

  const pdaObj = pda as { seeds?: unknown[]; program?: { kind: string; value?: unknown } };
  if (!pdaObj.seeds || !Array.isArray(pdaObj.seeds)) return undefined;

  const seeds: PdaSeed[] = pdaObj.seeds.map((seed: unknown) => {
    const seedObj = seed as { kind: string; value?: unknown; path?: string; account?: string };

    if (seedObj.kind === 'const') {
      // Const seed - can be a string or byte array
      if (typeof seedObj.value === 'string') {
        return { kind: 'const' as const, value: seedObj.value };
      } else if (Array.isArray(seedObj.value)) {
        return { kind: 'const' as const, value: seedObj.value as number[] };
      }
    } else if (seedObj.kind === 'account') {
      // Account reference seed
      return { kind: 'account' as const, path: seedObj.path || seedObj.account };
    } else if (seedObj.kind === 'arg') {
      // Argument reference seed
      return { kind: 'arg' as const, path: seedObj.path };
    }

    return { kind: 'const' as const, value: String(seedObj.value || '') };
  });

  return { seeds };
}

function normalizeInstruction(
  instruction: LegacyIDLInstruction | NewIDLInstruction,
  isNewFormat: boolean
): NormalizedInstruction {
  if (isNewFormat) {
    const newIx = instruction as NewIDLInstruction;
    return {
      name: newIx.name,
      args: newIx.args || [],
      accounts: (newIx.accounts || []).map((acc) => ({
        name: acc.name,
        isMut: acc.writable === true,
        isSigner: acc.signer === true,
        address: acc.address,
        pda: parsePdaDefinition(acc.pda),
      })),
    };
  } else {
    const legacyIx = instruction as LegacyIDLInstruction;
    return {
      name: legacyIx.name,
      args: legacyIx.args || [],
      accounts: (legacyIx.accounts || []).map((acc) => ({
        name: acc.name,
        isMut: acc.isMut,
        isSigner: acc.isSigner,
      })),
    };
  }
}

/**
 * Decode a Solana private key from various formats
 * Supports: base58, hex (with or without 0x prefix), and raw bytes
 */
function decodePrivateKey(privateKey: string): Uint8Array {
  // Try base58 first (most common for Solana)
  try {
    const decoded = bs58.decode(privateKey);
    if (decoded.length === 64 || decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Not valid base58, try other formats
  }

  // Try hex format
  const hexKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  if (/^[0-9a-fA-F]+$/.test(hexKey)) {
    const bytes = new Uint8Array(hexKey.length / 2);
    for (let i = 0; i < hexKey.length; i += 2) {
      bytes[i / 2] = parseInt(hexKey.slice(i, i + 2), 16);
    }
    if (bytes.length === 64 || bytes.length === 32) {
      return bytes;
    }
  }

  throw new Error(
    'Invalid Solana private key format. Expected base58 or hex encoded key (32 or 64 bytes)'
  );
}

/**
 * Convert argument value based on its IDL type
 * Handles BN conversion for u64/i64/u128/i128 types
 */
function convertArgValue(value: unknown, argType: unknown): unknown {
  // Get the type string (handles both simple types and complex type objects)
  const typeStr = typeof argType === 'string' ? argType : JSON.stringify(argType);

  // Check if this is a numeric type that needs BN conversion
  const needsBN = /\b(u64|i64|u128|i128)\b/.test(typeStr);

  if (needsBN && value !== null && value !== undefined) {
    // Convert to BN if it's a number or string
    if (typeof value === 'number' || typeof value === 'string') {
      return new BN(value.toString());
    }
  }

  // For PublicKey types, convert strings to PublicKey
  if (/\b(publicKey|pubkey)\b/i.test(typeStr) && typeof value === 'string') {
    try {
      return new PublicKey(value);
    } catch {
      // Return as-is if not a valid pubkey
    }
  }

  return value;
}

export const solanaAdapter: ChainAdapter = {
  ecosystem: 'solana',

  parseInterface(contract: Contract): ContractFunction[] {
    if (!contract.idl) return [];
    const idl = contract.idl as IDLType;
    const isNewFormat = isNewAnchorFormat(idl);

    const instructions = idl.instructions || [];

    return instructions.map((ix) => {
      const normalized = normalizeInstruction(ix, isNewFormat);

      // Convert normalized accounts to AccountRequirement format
      // Include PDA and address info for automatic derivation
      const accounts: AccountRequirement[] = normalized.accounts.map((acc) => ({
        name: acc.name,
        isMut: acc.isMut,
        isSigner: acc.isSigner,
        address: acc.address,
        pda: acc.pda,
      }));

      return {
        name: normalized.name,
        type: 'write' as const, // Solana instructions are typically state-changing
        inputs: normalized.args.map((a) => ({
          name: a.name,
          type: formatSolanaType(a.type),
        })),
        outputs: [],
        accounts,
      };
    });
  },

  async call(
    rpcUrl,
    contractAddress,
    _functionName,
    _args,
    _contractInterface
  ): Promise<CallResult> {
    // Solana read operations typically use account data fetching
    try {
      const connection = new Connection(rpcUrl);
      const accountInfo = await connection.getAccountInfo(
        new PublicKey(contractAddress)
      );

      if (!accountInfo) {
        return { success: false, error: 'Account not found' };
      }

      return {
        success: true,
        data: {
          lamports: accountInfo.lamports,
          owner: accountInfo.owner.toBase58(),
          executable: accountInfo.executable,
          dataLength: accountInfo.data.length,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async sendTransaction(
    rpcUrl,
    _contractAddress,
    functionName,
    args,
    contractInterface,
    privateKey,
    _options
  ): Promise<CallResult> {
    try {
      // Validate inputs
      if (!contractInterface) {
        return {
          success: false,
          error: 'IDL is required for Solana transactions. Please import an Anchor IDL.',
        };
      }

      // Decode the private key
      let keypairBytes: Uint8Array;
      try {
        keypairBytes = decodePrivateKey(privateKey);
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
        };
      }

      // Create keypair - handle both 32-byte seed and 64-byte full keypair
      let keypair: Keypair;
      if (keypairBytes.length === 32) {
        keypair = Keypair.fromSeed(keypairBytes);
      } else if (keypairBytes.length === 64) {
        keypair = Keypair.fromSecretKey(keypairBytes);
      } else {
        return {
          success: false,
          error: `Invalid private key length: ${keypairBytes.length}. Expected 32 or 64 bytes.`,
        };
      }

      // Create connection and provider
      const connection = new Connection(rpcUrl, 'confirmed');
      const wallet = new KeypairWallet(keypair);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
      });

      // Create program from IDL
      const idl = contractInterface as Idl;
      const program = new Program(idl, provider);

      // Find the instruction in the IDL
      const idlTyped = contractInterface as IDLType;
      const isNewFormat = isNewAnchorFormat(idlTyped);
      const rawInstruction = idlTyped.instructions?.find(
        (ix) => ix.name === functionName || ix.name === camelToSnake(functionName)
      );

      if (!rawInstruction) {
        return {
          success: false,
          error: `Instruction '${functionName}' not found in IDL`,
        };
      }

      // Normalize the instruction to handle both legacy and new formats
      const instruction = normalizeInstruction(rawInstruction, isNewFormat);

      // Extract account addresses and PDA seeds from args if present (passed as JSON in first arg)
      let providedAccounts: Record<string, string> = {};
      let providedPdaSeeds: Record<string, string> = {};
      if (args.length > 0 && typeof args[0] === 'string') {
        try {
          const parsed = JSON.parse(args[0] as string);
          if (parsed.__solana_accounts__ || parsed.__solana_pda_seeds__) {
            providedAccounts = parsed.__solana_accounts__ || {};
            providedPdaSeeds = parsed.__solana_pda_seeds__ || {};
            args.shift(); // Remove the accounts object from args
          }
        } catch {
          // Not a JSON accounts object, continue normally
        }
      }

      // Get program ID from IDL for PDA derivation
      const programId = program.programId;

      // Well-known program addresses
      const WELL_KNOWN_PROGRAMS: Record<string, PublicKey> = {
        'system_program': SystemProgram.programId,
        'systemProgram': SystemProgram.programId,
        '11111111111111111111111111111111': SystemProgram.programId,
      };

      // Build accounts object using provided addresses, PDAs, or well-known addresses
      const accounts: Record<string, PublicKey> = {};
      const resolvedAccounts: Record<string, PublicKey> = {}; // Track resolved accounts for PDA seeds

      for (const acc of instruction.accounts) {
        let resolvedAddress: PublicKey | null = null;

        if (acc.isSigner) {
          // Signer accounts use the wallet keypair
          resolvedAddress = keypair.publicKey;
        } else if (acc.address) {
          // Well-known address specified in IDL
          if (WELL_KNOWN_PROGRAMS[acc.address]) {
            resolvedAddress = WELL_KNOWN_PROGRAMS[acc.address];
          } else {
            try {
              resolvedAddress = new PublicKey(acc.address);
            } catch {
              return {
                success: false,
                error: `Invalid well-known address for account '${acc.name}': ${acc.address}`,
              };
            }
          }
        } else if (WELL_KNOWN_PROGRAMS[acc.name]) {
          // Account name matches a well-known program
          resolvedAddress = WELL_KNOWN_PROGRAMS[acc.name];
        } else if (acc.pda && acc.pda.seeds.length > 0) {
          // Try to derive PDA from IDL seeds first (new IDL format has byte arrays directly)
          try {
            const seedBuffers: Buffer[] = [];
            let allSeedsResolved = true;

            for (const seed of acc.pda.seeds) {
              if (seed.kind === 'const') {
                if (typeof seed.value === 'string') {
                  seedBuffers.push(Buffer.from(seed.value));
                } else if (Array.isArray(seed.value)) {
                  // New IDL format: value is already a byte array e.g. [100, 97, 116, 97] = "data"
                  seedBuffers.push(Buffer.from(seed.value));
                }
              } else if (seed.kind === 'account' && seed.path) {
                // Reference to another account - check if it's the signer or already resolved
                const refName = seed.path.split('.')[0]; // Handle paths like "authority.key"
                if (refName === 'authority' || refName === 'signer' || refName === 'payer') {
                  seedBuffers.push(keypair.publicKey.toBuffer());
                } else if (resolvedAccounts[refName]) {
                  seedBuffers.push(resolvedAccounts[refName].toBuffer());
                } else if (providedAccounts[refName]) {
                  seedBuffers.push(new PublicKey(providedAccounts[refName]).toBuffer());
                } else {
                  // Can't resolve this seed reference
                  console.warn(`[Solana] Could not resolve account reference '${refName}' for PDA seed`);
                  allSeedsResolved = false;
                }
              } else if (seed.kind === 'arg' && seed.path) {
                // Reference to a function argument
                const argIndex = instruction.args.findIndex((a) => a.name === seed.path);
                if (argIndex >= 0 && args[argIndex] !== undefined) {
                  const argValue = args[argIndex];
                  if (typeof argValue === 'string') {
                    // Could be a pubkey or a string seed
                    try {
                      const pk = new PublicKey(argValue);
                      seedBuffers.push(pk.toBuffer());
                    } catch {
                      seedBuffers.push(Buffer.from(argValue));
                    }
                  } else if (typeof argValue === 'number') {
                    // Numeric seed - use little-endian encoding
                    const buf = Buffer.alloc(8);
                    buf.writeBigUInt64LE(BigInt(argValue));
                    seedBuffers.push(buf);
                  }
                } else {
                  allSeedsResolved = false;
                }
              }
            }

            if (allSeedsResolved && seedBuffers.length > 0) {
              const [pda] = PublicKey.findProgramAddressSync(seedBuffers, programId);
              resolvedAddress = pda;
              console.log(`[Solana] Derived PDA for '${acc.name}' from IDL seeds:`, pda.toBase58());
            }
          } catch (pdaError) {
            console.warn(`[Solana] Failed to derive PDA for account '${acc.name}':`, pdaError);
          }
        }

        // Fallback: User provided a seed string for this PDA (for legacy IDLs without seed info)
        if (!resolvedAddress && acc.pda && providedPdaSeeds[acc.name]) {
          try {
            const seedString = providedPdaSeeds[acc.name];
            const [pda] = PublicKey.findProgramAddressSync(
              [Buffer.from(seedString), keypair.publicKey.toBuffer()],
              programId
            );
            resolvedAddress = pda;
            console.log(`[Solana] Derived PDA for '${acc.name}' using user-provided seed "${seedString}":`, pda.toBase58());
          } catch (pdaError) {
            return {
              success: false,
              error: `Failed to derive PDA for account '${acc.name}' with seed "${providedPdaSeeds[acc.name]}": ${(pdaError as Error).message}`,
            };
          }
        }

        // If still not resolved, check if user provided a direct address
        if (!resolvedAddress && providedAccounts[acc.name]) {
          try {
            resolvedAddress = new PublicKey(providedAccounts[acc.name]);
          } catch {
            return {
              success: false,
              error: `Invalid public key for account '${acc.name}': ${providedAccounts[acc.name]}`,
            };
          }
        }

        // If still not resolved, error with helpful message
        if (!resolvedAddress) {
          if (acc.pda) {
            return {
              success: false,
              error: `Account '${acc.name}' is a PDA. Please provide the seed string to derive it.`,
            };
          }
          return {
            success: false,
            error: `Account '${acc.name}' address is required. Please provide it in the Accounts section.`,
          };
        }

        accounts[acc.name] = resolvedAddress;
        resolvedAccounts[acc.name] = resolvedAddress;
      }

      // Get the method from the program
      const methodName = toCamelCase(functionName);
      const method = program.methods[methodName];

      if (!method) {
        return {
          success: false,
          error: `Method '${methodName}' not found in program`,
        };
      }

      // Convert arguments based on their IDL types (e.g., numbers to BN for u64/i64)
      const convertedArgs = args.map((arg, index) => {
        const argDef = instruction.args[index];
        if (argDef) {
          return convertArgValue(arg, argDef.type);
        }
        return arg;
      });

      // Execute the transaction
      const tx = await method(...convertedArgs)
        .accounts(accounts)
        .rpc();

      // Get transaction details
      const txInfo = await connection.getTransaction(tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      return {
        success: true,
        txHash: tx,
        blockNumber: txInfo?.slot,
        gasUsed: txInfo?.meta?.computeUnitsConsumed?.toString(),
        fee: txInfo?.meta?.fee?.toString(),
      };
    } catch (error) {
      console.error('[Solana sendTransaction] Error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  },

  async getBalance(rpcUrl: string, address: string, nativeSymbol: string): Promise<WalletBalance> {
    try {
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);

      return {
        native: balance.toString(),
        nativeFormatted: (balance / LAMPORTS_PER_SOL).toFixed(9),
        nativeDecimals: 9,
        nativeSymbol,
      };
    } catch (error) {
      console.error('Failed to fetch Solana balance:', error);
      return {
        native: '0',
        nativeFormatted: '0',
        nativeDecimals: 9,
        nativeSymbol,
      };
    }
  },

  async getTransactionHistory(
    rpcUrl: string,
    address: string,
    _blockExplorerApiUrl?: string
  ): Promise<WalletTransaction[]> {
    try {
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(address);

      // Get recent signatures for the address
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 20,
      });

      // Convert to WalletTransaction format
      return signatures.map((sig, index) => ({
        id: `sol-tx-${index}-${sig.signature.slice(0, 8)}`,
        walletId: '', // Will be set by the caller
        txHash: sig.signature,
        type: 'contract_call' as const, // Solana transactions are typically program calls
        from: address,
        to: undefined,
        value: '0', // Solana transactions don't have a simple value
        timestamp: sig.blockTime
          ? new Date(sig.blockTime * 1000).toISOString()
          : new Date().toISOString(),
        status: sig.err ? ('failed' as const) : ('success' as const),
        blockNumber: sig.slot,
      }));
    } catch (error) {
      console.error('Failed to fetch Solana transaction history:', error);
      return [];
    }
  },

  async getTokenBalances(
    rpcUrl: string,
    address: string,
  ): Promise<TokenBalance[]> {
    try {
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(address);

      // Use getParsedTokenAccountsByOwner to get all SPL tokens
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens: TokenBalance[] = [];

      for (const { account } of tokenAccounts.value) {
        const parsed = account.data.parsed;
        if (parsed?.info?.tokenAmount) {
          const amount = parsed.info.tokenAmount;
          // Skip zero balances
          if (amount.uiAmount === 0 || amount.amount === '0') continue;

          const mint = parsed.info.mint as string;
          tokens.push({
            address: mint,
            name: mint.slice(0, 8) + '...',
            symbol: 'SPL',
            decimals: amount.decimals ?? 9,
            balance: amount.amount,
          });
        }
      }

      // Try to enrich with metadata from RPC (get mint info)
      await enrichSolanaTokenMetadata(connection, tokens);

      return tokens;
    } catch (error) {
      console.error('[getTokenBalances] Solana failed:', error);
      return [];
    }
  },
};

/**
 * Enrich SPL token metadata using the Metaplex token metadata program
 * or Solana token list as a fallback
 */
async function enrichSolanaTokenMetadata(connection: Connection, tokens: TokenBalance[]): Promise<void> {
  // Use the known Solana token list for well-known tokens
  const KNOWN_TOKENS: Record<string, { name: string; symbol: string; logoUrl?: string }> = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { name: 'USD Coin', symbol: 'USDC', logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { name: 'Tether USD', symbol: 'USDT', logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg' },
    'So11111111111111111111111111111111111111112': { name: 'Wrapped SOL', symbol: 'wSOL' },
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { name: 'Marinade staked SOL', symbol: 'mSOL' },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { name: 'Bonk', symbol: 'BONK' },
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { name: 'Jupiter', symbol: 'JUP' },
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { name: 'Ether (Wormhole)', symbol: 'ETH' },
    'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { name: 'Render Token', symbol: 'RNDR' },
  };

  for (const token of tokens) {
    const known = KNOWN_TOKENS[token.address];
    if (known) {
      token.name = known.name;
      token.symbol = known.symbol;
      if (known.logoUrl) token.logoUrl = known.logoUrl;
    }
  }

  // For unknown tokens, try to fetch on-chain metadata via Metaplex
  try {
    const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const unknownTokens = tokens.filter((t) => !KNOWN_TOKENS[t.address]);

    for (const token of unknownTokens) {
      try {
        const mintPk = new PublicKey(token.address);
        const [metadataPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), mintPk.toBuffer()],
          TOKEN_METADATA_PROGRAM
        );
        const accountInfo = await connection.getAccountInfo(metadataPda);
        if (accountInfo?.data) {
          // Parse basic metadata (name starts at offset 65, symbol after name)
          const data = accountInfo.data;
          const nameLen = data.readUInt32LE(65);
          if (nameLen > 0 && nameLen < 100) {
            const name = data.slice(69, 69 + nameLen).toString('utf8').replace(/\0/g, '').trim();
            if (name) token.name = name;
          }
          const symbolOffset = 69 + nameLen;
          const symbolLen = data.readUInt32LE(symbolOffset);
          if (symbolLen > 0 && symbolLen < 20) {
            const symbol = data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLen).toString('utf8').replace(/\0/g, '').trim();
            if (symbol) token.symbol = symbol;
          }
          const uriOffset = symbolOffset + 4 + symbolLen;
          const uriLen = data.readUInt32LE(uriOffset);
          if (uriLen > 0 && uriLen < 500) {
            const uri = data.slice(uriOffset + 4, uriOffset + 4 + uriLen).toString('utf8').replace(/\0/g, '').trim();
            if (uri && uri.startsWith('http')) {
              // The URI points to a JSON with an image field - store for potential future fetching
              // We won't fetch it here to avoid performance issues
            }
          }
        }
      } catch {
        // Skip tokens that fail metadata lookup
      }
    }
  } catch {
    // Metadata enrichment is best-effort
  }
}

function formatSolanaType(type: unknown): string {
  if (typeof type === 'string') return type;
  if (type && typeof type === 'object') {
    const obj = type as Record<string, unknown>;
    if ('vec' in obj) return `Vec<${formatSolanaType(obj.vec)}>`;
    if ('option' in obj) return `Option<${formatSolanaType(obj.option)}>`;
    if ('defined' in obj) {
      // New format: { defined: { name: "TypeName" } }
      // Legacy format: { defined: "TypeName" }
      const defined = obj.defined;
      if (typeof defined === 'string') {
        return defined;
      } else if (defined && typeof defined === 'object' && 'name' in (defined as Record<string, unknown>)) {
        return String((defined as Record<string, unknown>).name);
      }
      return String(defined);
    }
    if ('array' in obj) {
      const arr = obj.array as [unknown, number];
      return `[${formatSolanaType(arr[0])}; ${arr[1]}]`;
    }
  }
  return JSON.stringify(type);
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
