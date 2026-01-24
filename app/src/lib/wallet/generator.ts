/**
 * Wallet generation using native SDKs for each ecosystem
 */
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import bs58 from 'bs58';
import type { Ecosystem } from '@/types';

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

/**
 * Generate an EVM wallet using ethers.js
 */
export function generateEvmWallet(): GeneratedWallet {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.publicKey,
  };
}

/**
 * Generate a Solana wallet using @solana/web3.js
 */
export function generateSolanaWallet(): GeneratedWallet {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * Generate an Aptos wallet using @aptos-labs/ts-sdk
 */
export function generateAptosWallet(): GeneratedWallet {
  const privateKey = Ed25519PrivateKey.generate();
  const account = Account.fromPrivateKey({ privateKey });
  return {
    address: account.accountAddress.toString(),
    privateKey: privateKey.toString(),
    publicKey: account.publicKey.toString(),
  };
}

/**
 * Generate a wallet for the specified ecosystem
 */
export function generateWallet(ecosystem: Ecosystem): GeneratedWallet {
  switch (ecosystem) {
    case 'evm':
      return generateEvmWallet();
    case 'solana':
      return generateSolanaWallet();
    case 'aptos':
      return generateAptosWallet();
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

/**
 * Derive wallet from private key for the specified ecosystem
 */
export function deriveWalletFromPrivateKey(
  privateKey: string,
  ecosystem: Ecosystem
): GeneratedWallet {
  switch (ecosystem) {
    case 'evm': {
      const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const wallet = new ethers.Wallet(pk);
      return {
        address: wallet.address,
        privateKey: pk,
        publicKey: wallet.signingKey.publicKey,
      };
    }
    case 'solana': {
      // Solana private key is typically base58 encoded secret key (64 bytes)
      const secretKey = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      return {
        address: keypair.publicKey.toBase58(),
        privateKey: privateKey,
        publicKey: keypair.publicKey.toBase58(),
      };
    }
    case 'aptos': {
      // Aptos private key is hex encoded (with or without 0x prefix)
      const pkHex = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const pk = new Ed25519PrivateKey(pkHex);
      const account = Account.fromPrivateKey({ privateKey: pk });
      return {
        address: account.accountAddress.toString(),
        privateKey: pkHex,
        publicKey: account.publicKey.toString(),
      };
    }
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}
