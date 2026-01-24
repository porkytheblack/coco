import type { Ecosystem } from '@/types';
import type { ChainAdapter } from './types';
import { evmAdapter } from './evm-adapter';
import { solanaAdapter } from './solana-adapter';
import { aptosAdapter } from './aptos-adapter';

export * from './types';

const adapters: Record<Ecosystem, ChainAdapter> = {
  evm: evmAdapter,
  solana: solanaAdapter,
  aptos: aptosAdapter,
};

export function getAdapter(ecosystem: Ecosystem): ChainAdapter {
  return adapters[ecosystem];
}

export { evmAdapter, solanaAdapter, aptosAdapter };
