/**
 * Transfer funds using native SDKs for each ecosystem
 */
import { ethers } from 'ethers';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { Aptos, AptosConfig, Account, Ed25519PrivateKey, AccountAddress } from '@aptos-labs/ts-sdk';
import bs58 from 'bs58';
import type { Chain } from '@/types';
import { getWalletPrivateKey } from '@/lib/tauri/commands';
import { formatPriv, getNetworkFromRPC } from '../adapters/aptos-adapter';

interface SendTransactionParams {
  walletId: string;
  recipient: string;
  amount: string; // Human-readable amount (e.g., "0.1")
  chain: Chain;
}

/**
 * Send a transaction using the appropriate SDK based on ecosystem
 */
export async function sendTransaction(params: SendTransactionParams): Promise<string> {
  const { walletId, recipient, amount, chain } = params;

  // Get the private key from the backend
  const privateKey = await getWalletPrivateKey(walletId);

  switch (chain.ecosystem) {
    case 'evm':
      return sendEvmTransaction(privateKey, recipient, amount, chain);
    case 'solana':
      return sendSolanaTransaction(privateKey, recipient, amount, chain);
    case 'aptos':
      return sendAptosTransaction(privateKey, recipient, amount, chain);
    default:
      throw new Error(`Unsupported ecosystem: ${chain.ecosystem}`);
  }
}

/**
 * Send EVM transaction using ethers.js
 */
async function sendEvmTransaction(
  privateKey: string,
  recipient: string,
  amount: string,
  chain: Chain
): Promise<string> {
  // Validate and normalize the recipient address to prevent ENS resolution
  if (!recipient || !ethers.isAddress(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }
  const normalizedRecipient = ethers.getAddress(recipient);

  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  // Wait for network detection to ensure chain ID is set (required for EIP-155)
  await provider.getNetwork();

  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(pk, provider);

  // Convert amount to wei
  const amountWei = ethers.parseEther(amount);

  const tx = await wallet.sendTransaction({
    to: normalizedRecipient,
    value: amountWei,
  });

  // Wait for the transaction to be mined
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('Transaction failed: no receipt');
  }

  return tx.hash;
}

/**
 * Send Solana transaction using @solana/web3.js
 */
async function sendSolanaTransaction(
  privateKey: string,
  recipient: string,
  amount: string,
  chain: Chain
): Promise<string> {
  const connection = new Connection(chain.rpcUrl, 'confirmed');

  // Decode the base58 private key
  const secretKey = bs58.decode(privateKey);
  const fromKeypair = Keypair.fromSecretKey(secretKey);

  // Parse recipient public key
  const toPublicKey = new PublicKey(recipient);

  // Convert amount to lamports (1 SOL = 1e9 lamports)
  const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

  // Create transfer instruction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);

  return signature;
}

/**
 * Send Aptos transaction using @aptos-labs/ts-sdk
 */
async function sendAptosTransaction(
  privateKey: string,
  recipient: string,
  amount: string,
  chain: Chain
): Promise<string> {
  // Determine network from chain info
  let network = getNetworkFromRPC(chain.rpcUrl)

  const config = new AptosConfig({
    network
  });
  const aptos = new Aptos(config);

  // Create account from private key
  const pkHex = formatPriv(privateKey);
  const pk = new Ed25519PrivateKey(pkHex);
  const account = Account.fromPrivateKey({ privateKey: pk });
  console.log("got account ok")

  // Convert amount to octas (1 APT = 1e8 octas)
  const octas = Math.floor(parseFloat(amount) * 1e8);

  // Build and submit the transaction
  const transaction = await aptos.transferFungibleAsset({
    sender: account,
    amount: octas,
    fungibleAssetMetadataAddress: "0xa",
    recipient: AccountAddress.fromString(recipient)
  })

  // Sign and submit
  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  // Wait for confirmation
  await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });

  return pendingTransaction.hash;
}
