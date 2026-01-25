import { create } from 'zustand';
import type {
  Workspace,
  Contract,
  Transaction,
  TransactionRun,
  CreateWorkspaceRequest,
  AddContractRequest,
  UpdateContractRequest,
  ContractFunction,
  Chain,
  InterfaceType,
  MoveDefinition,
} from '@/types';
import * as tauri from '@/lib/tauri';
import { getAdapter } from '@/lib/adapters';

// Execution context for real blockchain transactions
export interface ExecutionContext {
  chain: Chain;
}

interface WorkspaceState {
  // Data
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  contracts: Contract[];
  transactions: Transaction[];
  transactionRuns: Record<string, TransactionRun[]>; // Map transactionId -> runs

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedTransaction: Transaction | null;

  // Actions
  loadWorkspaces: (chainId: string) => Promise<void>;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (request: CreateWorkspaceRequest) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;

  loadContracts: (ecosystem?: 'evm' | 'solana' | 'aptos') => Promise<void>;
  addContract: (request: AddContractRequest) => Promise<void>;
  updateContract: (request: UpdateContractRequest, ecosystem?: 'evm' | 'solana' | 'aptos') => Promise<Contract>;
  deleteContract: (contractId: string) => Promise<void>;

  loadTransactions: () => Promise<void>;
  createTransaction: (name: string, contractId?: string, functionName?: string) => Promise<void>;
  updateTransactionArgs: (transactionId: string, args: Record<string, string>) => Promise<void>;
  executeTransaction: (transactionId: string, payload: Record<string, string>, walletId: string, context?: ExecutionContext) => Promise<TransactionRun>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  getTransactionRuns: (transactionId: string) => TransactionRun[];
  loadTransactionRuns: (transactionId: string) => Promise<void>;

  selectTransaction: (transaction: Transaction | null) => void;
  clearWorkspace: () => void;
}

// Mock data
const mockWorkspaces: Workspace[] = [
  {
    id: 'ws1',
    chainId: 'eth-sepolia',
    name: 'TokenContract',
    path: '/Users/dev/projects/token-contract',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contractCount: 3,
    transactionCount: 24,
    lastActive: '2 hours ago',
  },
  {
    id: 'ws2',
    chainId: 'eth-sepolia',
    name: 'NFTMarketplace',
    path: '/Users/dev/projects/nft-marketplace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contractCount: 5,
    transactionCount: 67,
    lastActive: 'Yesterday',
  },
];

const mockContracts: Contract[] = [
  {
    id: 'c1',
    workspaceId: 'ws1',
    name: 'Token',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f3a9F',
    interfaceType: 'abi',
    abi: [
      { type: 'function', name: 'name', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
      { type: 'function', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
      { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
      { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
      { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
      { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
      { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
      { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    ],
    createdAt: new Date().toISOString(),
  },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    workspaceId: 'ws1',
    name: 'mint-tokens',
    contractId: 'c1',
    walletId: 'w1',
    functionName: 'mint',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx2',
    workspaceId: 'ws1',
    name: 'check-balance',
    contractId: 'c1',
    walletId: 'w1',
    functionName: 'balanceOf',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Parse contract interface to extract functions
function parseContractFunctions(contract: Contract, ecosystem: 'evm' | 'solana' | 'aptos'): ContractFunction[] {
  const adapter = getAdapter(ecosystem);
  return adapter.parseInterface(contract);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  contracts: [],
  transactions: [],
  transactionRuns: {},
  isLoading: false,
  error: null,
  selectedTransaction: null,

  loadWorkspaces: async (chainId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        const workspaces = await tauri.listWorkspaces(chainId);
        set({ workspaces, isLoading: false });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const workspaces = mockWorkspaces.filter((w) => w.chainId === chainId);
        set({ workspaces, isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      let workspace: Workspace | null = null;
      if (tauri.checkIsTauri()) {
        workspace = await tauri.getWorkspace(workspaceId);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300));
        // First check already loaded workspaces (includes newly created ones)
        const { workspaces } = get();
        workspace = workspaces.find((w) => w.id === workspaceId) || null;
        // Fall back to mock data if not found
        if (!workspace) {
          workspace = mockWorkspaces.find((w) => w.id === workspaceId) || null;
        }
      }

      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      set({ currentWorkspace: workspace, isLoading: false });

      // Get the chain to determine ecosystem for contract parsing
      let ecosystem: 'evm' | 'solana' | 'aptos' = 'evm';
      if (tauri.checkIsTauri()) {
        try {
          const chain = await tauri.getChain(workspace.chainId);
          ecosystem = chain.ecosystem || 'evm';
        } catch (err) {
          console.warn('Failed to get chain for ecosystem detection, defaulting to evm:', err);
        }
      }

      // Load contracts first, then transactions (transactions need contracts to be loaded)
      await get().loadContracts(ecosystem);
      await get().loadTransactions();
    } catch (error) {
      console.error('Failed to load workspace:', error);
      set({ currentWorkspace: null, error: (error as Error).message, isLoading: false });
    }
  },

  createWorkspace: async (request: CreateWorkspaceRequest) => {
    set({ isLoading: true, error: null });
    try {
      let workspace: Workspace;
      if (tauri.checkIsTauri()) {
        workspace = await tauri.createWorkspace(request);
      } else {
        workspace = {
          id: `ws-${Date.now()}`,
          chainId: request.chainId,
          name: request.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contractCount: 0,
          transactionCount: 0,
        };
      }
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        isLoading: false,
      }));
      return workspace;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (tauri.checkIsTauri()) {
        await tauri.deleteWorkspace(workspaceId);
      }
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
        currentWorkspace:
          state.currentWorkspace?.id === workspaceId ? null : state.currentWorkspace,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadContracts: async (ecosystem: 'evm' | 'solana' | 'aptos' = 'evm') => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    try {
      if (tauri.checkIsTauri()) {
        const rawContracts = await tauri.listContracts(currentWorkspace.id);
        // Parse interfaces from strings and add functions
        const contracts: Contract[] = rawContracts.map((contract) => {
          // Backend uses deployedAddress, frontend uses address
          const backendContract = contract as Contract & { deployedAddress?: string };

          // Determine interface type from backend or default based on ecosystem
          let interfaceType: InterfaceType = 'abi';
          if (backendContract.interfaceType) {
            interfaceType = backendContract.interfaceType as InterfaceType;
          } else if (ecosystem === 'solana') {
            interfaceType = 'idl';
          } else if (ecosystem === 'aptos') {
            interfaceType = 'move';
          }

          // Parse the appropriate interface based on type
          let parsedAbi: object[] | undefined = undefined;
          let parsedIdl: object | undefined = undefined;
          let parsedMoveDefinition: MoveDefinition | undefined = undefined;

          if (interfaceType === 'abi' && contract.abi) {
            if (typeof contract.abi === 'string') {
              try {
                parsedAbi = JSON.parse(contract.abi);
              } catch {
                parsedAbi = undefined;
              }
            } else if (Array.isArray(contract.abi)) {
              parsedAbi = contract.abi as object[];
            }
          }

          if (interfaceType === 'idl' && backendContract.idl) {
            if (typeof backendContract.idl === 'string') {
              try {
                parsedIdl = JSON.parse(backendContract.idl);
              } catch {
                parsedIdl = undefined;
              }
            } else if (typeof backendContract.idl === 'object') {
              parsedIdl = backendContract.idl as object;
            }
          }

          if (interfaceType === 'move' && backendContract.moveDefinition) {
            if (typeof backendContract.moveDefinition === 'string') {
              try {
                parsedMoveDefinition = JSON.parse(backendContract.moveDefinition);
              } catch {
                parsedMoveDefinition = undefined;
              }
            } else if (typeof backendContract.moveDefinition === 'object') {
              parsedMoveDefinition = backendContract.moveDefinition as MoveDefinition;
            }
          }

          const contractWithInterface: Contract = {
            id: contract.id,
            workspaceId: contract.workspaceId,
            name: contract.name,
            address: backendContract.deployedAddress || contract.address || '',
            interfaceType,
            abi: parsedAbi,
            idl: parsedIdl,
            moveDefinition: parsedMoveDefinition,
            createdAt: contract.createdAt,
            functions: [],
          };

          contractWithInterface.functions = parseContractFunctions(contractWithInterface, ecosystem);
          return contractWithInterface;
        });
        set({ contracts });
      } else {
        // Use mock contracts and parse their functions
        const contracts = mockContracts
          .filter((c) => c.workspaceId === currentWorkspace.id)
          .map((contract) => ({
            ...contract,
            functions: parseContractFunctions(contract, ecosystem),
          }));
        set({ contracts });
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  },

  addContract: async (request: AddContractRequest) => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    try {
      // Determine ecosystem from the current workspace's chain
      // For now, default to 'evm' - in real implementation, get from chain store
      const ecosystem = 'evm' as const;

      let contract: Contract;

      if (tauri.checkIsTauri()) {
        // Persist to database via Tauri - serialize all interface types
        const abiString = request.abi ? JSON.stringify(request.abi) : undefined;
        const idlString = request.idl ? JSON.stringify(request.idl) : undefined;
        const moveDefString = request.moveDefinition ? JSON.stringify(request.moveDefinition) : undefined;

        const created = await tauri.addContract(
          currentWorkspace.id,
          request.name,
          request.address,
          request.interfaceType,
          abiString,
          idlString,
          moveDefString
        );

        // Build full contract object with parsed functions
        contract = {
          ...created,
          interfaceType: request.interfaceType,
          abi: request.abi,
          idl: request.idl,
          moveDefinition: request.moveDefinition,
          address: request.address,
        };
      } else {
        // Fallback for non-Tauri (browser dev)
        contract = {
          id: `c-${Date.now()}`,
          workspaceId: currentWorkspace.id,
          name: request.name,
          address: request.address,
          interfaceType: request.interfaceType,
          abi: request.abi,
          idl: request.idl,
          moveDefinition: request.moveDefinition,
          createdAt: new Date().toISOString(),
        };
      }

      // Parse functions from the interface
      contract.functions = parseContractFunctions(contract, ecosystem);

      set((state) => ({
        contracts: [...state.contracts, contract],
      }));
    } catch (error) {
      console.error('Failed to add contract:', error);
      throw error;
    }
  },

  deleteContract: async (contractId: string) => {
    try {
      if (tauri.checkIsTauri()) {
        await tauri.deleteContract(contractId);
      }
      set((state) => ({
        contracts: state.contracts.filter((c) => c.id !== contractId),
      }));
    } catch (error) {
      console.error('Failed to delete contract:', error);
      throw error;
    }
  },

  updateContract: async (request: UpdateContractRequest, ecosystem: 'evm' | 'solana' | 'aptos' = 'evm') => {
    try {
      let contract: Contract;

      if (tauri.checkIsTauri()) {
        // Persist to database via Tauri - serialize all interface types
        const abiString = request.abi ? JSON.stringify(request.abi) : undefined;
        const idlString = request.idl ? JSON.stringify(request.idl) : undefined;
        const moveDefString = request.moveDefinition ? JSON.stringify(request.moveDefinition) : undefined;

        const updated = await tauri.updateContract(
          request.contractId,
          request.name,
          request.address,
          request.interfaceType,
          abiString,
          idlString,
          moveDefString
        );

        // Build full contract object with parsed functions
        contract = {
          ...updated,
          interfaceType: request.interfaceType,
          abi: request.abi,
          idl: request.idl,
          moveDefinition: request.moveDefinition,
          address: request.address,
        };
      } else {
        // Fallback for non-Tauri (browser dev)
        const { contracts } = get();
        const existing = contracts.find((c) => c.id === request.contractId);
        if (!existing) {
          throw new Error('Contract not found');
        }

        contract = {
          ...existing,
          name: request.name,
          address: request.address,
          interfaceType: request.interfaceType,
          abi: request.abi,
          idl: request.idl,
          moveDefinition: request.moveDefinition,
        };
      }

      // Parse functions from the interface
      contract.functions = parseContractFunctions(contract, ecosystem);

      set((state) => ({
        contracts: state.contracts.map((c) => (c.id === request.contractId ? contract : c)),
      }));

      return contract;
    } catch (error) {
      console.error('Failed to update contract:', error);
      throw error;
    }
  },

  loadTransactions: async () => {
    const { currentWorkspace, contracts } = get();
    if (!currentWorkspace) return;

    try {
      let rawTransactions: Transaction[];
      if (tauri.checkIsTauri()) {
        rawTransactions = await tauri.listTransactions(currentWorkspace.id);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 200));
        rawTransactions = mockTransactions.filter(
          (t) => t.workspaceId === currentWorkspace.id
        );
      }

      // Populate contract objects on transactions and parse args
      const transactions = rawTransactions.map((tx) => {
        const updated = { ...tx };

        // Attach contract if available
        if (tx.contractId) {
          const contract = contracts.find((c) => c.id === tx.contractId);
          if (contract) {
            updated.contract = contract;
          }
        }

        // Parse args from backend - backend returns it as an array with the JSON object as first element
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendArgs = (tx as any).args;
        if (backendArgs && Array.isArray(backendArgs) && backendArgs.length > 0) {
          // First element should be the JSON object of form values
          const argsObj = backendArgs[0];
          if (argsObj && typeof argsObj === 'object' && !Array.isArray(argsObj)) {
            updated.args = argsObj as Record<string, string>;
          }
        }

        return updated;
      });

      set({ transactions });
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  },

  createTransaction: async (name: string, contractId?: string, functionName?: string) => {
    const { currentWorkspace, contracts } = get();
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    console.log('Creating transaction for workspace:', currentWorkspace.id, 'name:', name);

    try {
      let transaction: Transaction;
      if (tauri.checkIsTauri()) {
        console.log('Using Tauri to create transaction');
        transaction = await tauri.createTransaction(
          currentWorkspace.id,
          name,
          contractId,
          functionName
        );
        console.log('Transaction created:', transaction);
      } else {
        console.log('Using mock to create transaction');
        transaction = {
          id: `tx-${Date.now()}`,
          workspaceId: currentWorkspace.id,
          name,
          contractId,
          functionName,
          createdAt: new Date().toISOString(),
        };
      }

      // Attach contract object if contractId is provided
      if (contractId) {
        const contract = contracts.find((c) => c.id === contractId);
        if (contract) {
          transaction.contract = contract;
        }
      }

      set((state) => ({
        transactions: [...state.transactions, transaction],
      }));
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  },

  updateTransactionArgs: async (transactionId: string, args: Record<string, string>) => {
    try {
      // Save args to backend
      await tauri.updateTransaction(transactionId, { args: JSON.stringify(args) });

      // Update local state
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === transactionId ? { ...t, args } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to update transaction args:', error);
      throw error;
    }
  },

  executeTransaction: async (transactionId: string, payload: Record<string, string>, walletId: string, context?: ExecutionContext): Promise<TransactionRun> => {
    const { currentWorkspace, transactions } = get();
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) throw new Error('Transaction not found');

    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      let result: TransactionRun;

      // If we have execution context and all required data, execute on-chain
      if (context?.chain && transaction.contract && transaction.functionName && tauri.checkIsTauri()) {
        try {
          // Get private key from backend
          let privateKey: string;
          try {
            privateKey = await tauri.getWalletPrivateKey(walletId);
          } catch (pkErr) {
            throw new Error(`Failed to get wallet private key: ${(pkErr as Error).message}. Make sure you imported this wallet with a private key.`);
          }

          // Get the adapter for this chain's ecosystem
          const adapter = getAdapter(context.chain.ecosystem);

          // Convert payload to args array based on function inputs
          const contractFunction = transaction.contract.functions?.find(
            (f) => f.name === transaction.functionName
          );
          const args = contractFunction?.inputs.map((input) => {
            const value = payload[input.name] || payload[`arg${contractFunction.inputs.indexOf(input)}`] || '';
            return value;
          }) || Object.values(payload);

          // For Solana, extract account addresses and PDA seeds from payload
          // Format: JSON object with account name -> address/seed mapping
          if (context.chain.ecosystem === 'solana') {
            const accountPayload: Record<string, string> = {};
            const pdaSeedPayload: Record<string, string> = {};

            for (const key of Object.keys(payload)) {
              if (key.startsWith('account:')) {
                const accountName = key.slice('account:'.length);
                accountPayload[accountName] = payload[key];
              } else if (key.startsWith('pda_seed:')) {
                const accountName = key.slice('pda_seed:'.length);
                pdaSeedPayload[accountName] = payload[key];
              }
            }

            // Add accounts and PDA seeds as first argument if there are any
            if (Object.keys(accountPayload).length > 0 || Object.keys(pdaSeedPayload).length > 0) {
              args.unshift(JSON.stringify({
                __solana_accounts__: accountPayload,
                __solana_pda_seeds__: pdaSeedPayload,
              }));
            }
          }

          // For Aptos, extract type arguments from payload
          // Format: type_arg:0 -> "0x1::coin::CoinType"
          if (context.chain.ecosystem === 'aptos') {
            const typeArgs: string[] = [];

            for (const key of Object.keys(payload)) {
              if (key.startsWith('type_arg:')) {
                const index = parseInt(key.slice('type_arg:'.length), 10);
                if (!isNaN(index) && payload[key]) {
                  typeArgs[index] = payload[key];
                }
              }
            }

            // Add type arguments as first argument if there are any
            if (typeArgs.length > 0 && typeArgs.some(t => t)) {
              args.unshift(JSON.stringify({
                __aptos_type_args__: typeArgs.filter(t => t), // Remove empty entries
              }));
            }
          }

          // Get the appropriate contract interface based on interface type
          let contractInterface: object[] | object | undefined;
          switch (transaction.contract.interfaceType) {
            case 'abi':
              contractInterface = transaction.contract.abi;
              break;
            case 'idl':
              contractInterface = transaction.contract.idl;
              break;
            case 'move':
              contractInterface = transaction.contract.moveDefinition;
              break;
            default:
              contractInterface = transaction.contract.abi;
          }

          // Check if this is a view/read function
          const isViewFunction = contractFunction?.type === 'read';

          console.log('[executeTransaction] Executing on-chain:', {
            rpcUrl: context.chain.rpcUrl,
            contractAddress: transaction.contract.address,
            functionName: transaction.functionName,
            args,
            interfaceType: transaction.contract.interfaceType,
            isViewFunction,
          });

          // Execute the transaction on-chain
          // Use call() for view functions, sendTransaction() for write functions
          const txResult = isViewFunction
            ? await adapter.call(
                context.chain.rpcUrl,
                transaction.contract.address,
                transaction.functionName,
                args,
                contractInterface
              )
            : await adapter.sendTransaction(
                context.chain.rpcUrl,
                transaction.contract.address,
                transaction.functionName,
                args,
                contractInterface,
                privateKey
              );

          console.log('[executeTransaction] Result:', txResult);

          const finishedAt = new Date().toISOString();
          const durationMs = Date.now() - startTime;

          if (txResult.success) {
            result = {
              id: `run-${Date.now()}`,
              transactionId,
              payload,
              result: txResult.data ? { returnValue: txResult.data } : undefined,
              txHash: txResult.txHash,
              blockNumber: txResult.blockNumber,
              gasUsed: txResult.gasUsed ? parseInt(txResult.gasUsed, 10) : undefined,
              fee: txResult.fee,
              status: 'success',
              events: txResult.events?.map((e: { name: string; args: Record<string, unknown> }) => ({
                name: e.name,
                args: e.args,
              })),
              startedAt,
              finishedAt,
              durationMs,
            };
          } else {
            result = {
              id: `run-${Date.now()}`,
              transactionId,
              payload,
              status: 'failed',
              errorMessage: txResult.error || 'Transaction failed on-chain',
              startedAt,
              finishedAt,
              durationMs,
            };
          }
        } catch (err) {
          // If on-chain execution fails, return error result with detailed message
          console.error('[executeTransaction] Error:', err);
          const finishedAt = new Date().toISOString();
          const errorMessage = err instanceof Error
            ? `${err.message}${err.stack ? `\n\nStack trace:\n${err.stack}` : ''}`
            : String(err);
          result = {
            id: `run-${Date.now()}`,
            transactionId,
            payload,
            status: 'failed',
            errorMessage,
            startedAt,
            finishedAt,
            durationMs: Date.now() - startTime,
          };
        }
      } else if (!context?.chain && tauri.checkIsTauri()) {
        // Fallback to backend mock execution if no context provided
        result = await tauri.executeTransaction(transactionId, payload, walletId);
      } else {
        // Fallback simulation for browser development
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const now = new Date().toISOString();
        result = {
          id: `run-${Date.now()}`,
          transactionId,
          payload,
          status: 'success',
          txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 12000000,
          gasUsed: Math.floor(Math.random() * 100000) + 21000,
          startedAt: now,
          finishedAt: now,
          durationMs: 1500,
        };
      }

      // Save to backend if running in Tauri
      if (tauri.checkIsTauri()) {
        try {
          await tauri.saveTransactionRun(result);
        } catch (saveErr) {
          console.warn('Failed to save transaction run to backend:', saveErr);
        }
      }

      // Add the run to the history (newest first)
      set((state) => ({
        transactionRuns: {
          ...state.transactionRuns,
          [transactionId]: [result, ...(state.transactionRuns[transactionId] || [])],
        },
        transactions: state.transactions.map((t) =>
          t.id === transactionId ? { ...t, lastRun: result } : t
        ),
        selectedTransaction: state.selectedTransaction?.id === transactionId
          ? { ...state.selectedTransaction, lastRun: result }
          : state.selectedTransaction,
      }));

      return result;
    } catch (error) {
      console.error('Failed to execute transaction:', error);
      throw error;
    }
  },

  getTransactionRuns: (transactionId: string): TransactionRun[] => {
    return get().transactionRuns[transactionId] || [];
  },

  loadTransactionRuns: async (transactionId: string) => {
    try {
      if (tauri.checkIsTauri()) {
        const runs = await tauri.listTransactionRuns(transactionId);
        set((state) => ({
          transactionRuns: {
            ...state.transactionRuns,
            [transactionId]: runs,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load transaction runs:', error);
    }
  },

  deleteTransaction: async (transactionId: string) => {
    try {
      if (tauri.checkIsTauri()) {
        await tauri.deleteTransaction(transactionId);
      }
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== transactionId),
        selectedTransaction:
          state.selectedTransaction?.id === transactionId ? null : state.selectedTransaction,
      }));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  },

  selectTransaction: (transaction: Transaction | null) => {
    set({ selectedTransaction: transaction });
    // Load transaction runs when selecting a transaction
    if (transaction) {
      get().loadTransactionRuns(transaction.id);
    }
  },

  clearWorkspace: () => {
    set({
      currentWorkspace: null,
      contracts: [],
      transactions: [],
      transactionRuns: {},
      selectedTransaction: null,
    });
  },
}));
