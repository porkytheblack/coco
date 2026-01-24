import type { Ecosystem, NetworkType } from '@/types';

export interface NetworkDefinition {
  id: string;
  name: string;
  networkType: NetworkType;
  chainIdNumeric?: number;
  rpcUrl: string;
  blockExplorerUrl?: string;
  blockExplorerApiUrl?: string;
  faucetUrl?: string;
}

export interface BlockchainDefinition {
  id: string;
  name: string;
  ecosystem: Ecosystem;
  nativeCurrency: string;
  currencyDecimals: number;
  iconId: string;
  networks: NetworkDefinition[];
}

export const CHAIN_REGISTRY: BlockchainDefinition[] = [
  // EVM Chains
  {
    id: 'ethereum',
    name: 'Ethereum',
    ecosystem: 'evm',
    nativeCurrency: 'ETH',
    currencyDecimals: 18,
    iconId: 'ethereum',
    networks: [
      {
        id: 'ethereum-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        chainIdNumeric: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        blockExplorerUrl: 'https://etherscan.io',
        blockExplorerApiUrl: 'https://api.etherscan.io/api',
      },
      {
        id: 'ethereum-sepolia',
        name: 'Sepolia',
        networkType: 'testnet',
        chainIdNumeric: 11155111,
        rpcUrl: 'https://rpc.sepolia.org',
        blockExplorerUrl: 'https://sepolia.etherscan.io',
        blockExplorerApiUrl: 'https://api-sepolia.etherscan.io/api',
        faucetUrl: 'https://sepoliafaucet.com',
      },
    ],
  },
  {
    id: 'base',
    name: 'Base',
    ecosystem: 'evm',
    nativeCurrency: 'ETH',
    currencyDecimals: 18,
    iconId: 'base',
    networks: [
      {
        id: 'base-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        chainIdNumeric: 8453,
        rpcUrl: 'https://mainnet.base.org',
        blockExplorerUrl: 'https://basescan.org',
        blockExplorerApiUrl: 'https://api.basescan.org/api',
      },
      {
        id: 'base-sepolia',
        name: 'Sepolia',
        networkType: 'testnet',
        chainIdNumeric: 84532,
        rpcUrl: 'https://sepolia.base.org',
        blockExplorerUrl: 'https://sepolia.basescan.org',
        blockExplorerApiUrl: 'https://api-sepolia.basescan.org/api',
        faucetUrl: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
      },
    ],
  },
  {
    id: 'polygon',
    name: 'Polygon',
    ecosystem: 'evm',
    nativeCurrency: 'POL',
    currencyDecimals: 18,
    iconId: 'polygon',
    networks: [
      {
        id: 'polygon-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        chainIdNumeric: 137,
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorerUrl: 'https://polygonscan.com',
        blockExplorerApiUrl: 'https://api.polygonscan.com/api',
      },
      {
        id: 'polygon-amoy',
        name: 'Amoy',
        networkType: 'testnet',
        chainIdNumeric: 80002,
        rpcUrl: 'https://rpc-amoy.polygon.technology',
        blockExplorerUrl: 'https://amoy.polygonscan.com',
        blockExplorerApiUrl: 'https://api-amoy.polygonscan.com/api',
        faucetUrl: 'https://faucet.polygon.technology/',
      },
    ],
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    ecosystem: 'evm',
    nativeCurrency: 'ETH',
    currencyDecimals: 18,
    iconId: 'arbitrum',
    networks: [
      {
        id: 'arbitrum-one',
        name: 'One',
        networkType: 'mainnet',
        chainIdNumeric: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockExplorerUrl: 'https://arbiscan.io',
        blockExplorerApiUrl: 'https://api.arbiscan.io/api',
      },
      {
        id: 'arbitrum-sepolia',
        name: 'Sepolia',
        networkType: 'testnet',
        chainIdNumeric: 421614,
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        blockExplorerUrl: 'https://sepolia.arbiscan.io',
        blockExplorerApiUrl: 'https://api-sepolia.arbiscan.io/api',
        faucetUrl: 'https://faucet.quicknode.com/arbitrum/sepolia',
      },
    ],
  },
  {
    id: 'optimism',
    name: 'Optimism',
    ecosystem: 'evm',
    nativeCurrency: 'ETH',
    currencyDecimals: 18,
    iconId: 'optimism',
    networks: [
      {
        id: 'optimism-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        chainIdNumeric: 10,
        rpcUrl: 'https://mainnet.optimism.io',
        blockExplorerUrl: 'https://optimistic.etherscan.io',
        blockExplorerApiUrl: 'https://api-optimistic.etherscan.io/api',
      },
      {
        id: 'optimism-sepolia',
        name: 'Sepolia',
        networkType: 'testnet',
        chainIdNumeric: 11155420,
        rpcUrl: 'https://sepolia.optimism.io',
        blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
        blockExplorerApiUrl: 'https://api-sepolia-optimistic.etherscan.io/api',
        faucetUrl: 'https://faucet.quicknode.com/optimism/sepolia',
      },
    ],
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    ecosystem: 'evm',
    nativeCurrency: 'AVAX',
    currencyDecimals: 18,
    iconId: 'avalanche',
    networks: [
      {
        id: 'avalanche-mainnet',
        name: 'C-Chain',
        networkType: 'mainnet',
        chainIdNumeric: 43114,
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        blockExplorerUrl: 'https://snowtrace.io',
        blockExplorerApiUrl: 'https://api.snowtrace.io/api',
      },
      {
        id: 'avalanche-fuji',
        name: 'Fuji',
        networkType: 'testnet',
        chainIdNumeric: 43113,
        rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
        blockExplorerUrl: 'https://testnet.snowtrace.io',
        blockExplorerApiUrl: 'https://api-testnet.snowtrace.io/api',
        faucetUrl: 'https://faucet.avax.network/',
      },
    ],
  },
  {
    id: 'bnb',
    name: 'BNB Chain',
    ecosystem: 'evm',
    nativeCurrency: 'BNB',
    currencyDecimals: 18,
    iconId: 'bnb',
    networks: [
      {
        id: 'bnb-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        chainIdNumeric: 56,
        rpcUrl: 'https://bsc-dataseed.binance.org',
        blockExplorerUrl: 'https://bscscan.com',
        blockExplorerApiUrl: 'https://api.bscscan.com/api',
      },
      {
        id: 'bnb-testnet',
        name: 'Testnet',
        networkType: 'testnet',
        chainIdNumeric: 97,
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        blockExplorerUrl: 'https://testnet.bscscan.com',
        blockExplorerApiUrl: 'https://api-testnet.bscscan.com/api',
        faucetUrl: 'https://testnet.bnbchain.org/faucet-smart',
      },
    ],
  },
  // Non-EVM Chains
  {
    id: 'solana',
    name: 'Solana',
    ecosystem: 'solana',
    nativeCurrency: 'SOL',
    currencyDecimals: 9,
    iconId: 'solana',
    networks: [
      {
        id: 'solana-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        blockExplorerUrl: 'https://explorer.solana.com',
      },
      {
        id: 'solana-devnet',
        name: 'Devnet',
        networkType: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        blockExplorerUrl: 'https://explorer.solana.com?cluster=devnet',
        faucetUrl: 'https://faucet.solana.com/',
      },
    ],
  },
  {
    id: 'aptos',
    name: 'Aptos',
    ecosystem: 'aptos',
    nativeCurrency: 'APT',
    currencyDecimals: 8,
    iconId: 'aptos',
    networks: [
      {
        id: 'aptos-mainnet',
        name: 'Mainnet',
        networkType: 'mainnet',
        rpcUrl: 'https://fullnode.mainnet.aptoslabs.com',
        blockExplorerUrl: 'https://explorer.aptoslabs.com',
      },
      {
        id: 'aptos-testnet',
        name: 'Testnet',
        networkType: 'testnet',
        rpcUrl: 'https://fullnode.testnet.aptoslabs.com',
        blockExplorerUrl: 'https://explorer.aptoslabs.com?network=testnet',
        faucetUrl: 'https://aptoslabs.com/testnet-faucet',
      },
    ],
  },
];

// Helper function to find a blockchain by ID
export function getBlockchain(blockchainId: string): BlockchainDefinition | undefined {
  return CHAIN_REGISTRY.find((b) => b.id === blockchainId);
}

// Helper function to find a network definition
export function getNetworkDefinition(
  blockchainId: string,
  networkId: string
): NetworkDefinition | undefined {
  const blockchain = getBlockchain(blockchainId);
  return blockchain?.networks.find((n) => n.id === networkId);
}

// Get all blockchains grouped by ecosystem
export function getBlockchainsByEcosystem(): Record<Ecosystem, BlockchainDefinition[]> {
  return CHAIN_REGISTRY.reduce(
    (acc, blockchain) => {
      acc[blockchain.ecosystem].push(blockchain);
      return acc;
    },
    { evm: [], solana: [], aptos: [] } as Record<Ecosystem, BlockchainDefinition[]>
  );
}
