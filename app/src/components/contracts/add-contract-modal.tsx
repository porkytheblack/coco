'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileCode, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button, Input, Modal } from '@/components/ui';
import { MoveDefinitionBuilder } from './move-definition-builder';
import { useAIStore } from '@/stores';
import { aiService } from '@/lib/ai';
import { useAddContract, useReusableContracts } from '@/hooks';
import type { InterfaceType, AddContractRequest, MoveDefinition } from '@/types';

type ContractMode = 'new' | 'reuse';
type MoveInputMode = 'manual' | 'ai';
type AnchorIdlVersion = 'legacy' | 'new';

// Zod schema for new contract form
const newContractSchema = z.object({
  name: z.string().min(1, 'Contract name is required').max(100, 'Name is too long'),
  address: z.string().min(1, 'Contract address is required'),
  abiJson: z.string().optional(),
  idlJson: z.string().optional(),
});

// Zod schema for reuse contract form
const reuseContractSchema = z.object({
  selectedContractId: z.string().min(1, 'Please select a contract to reuse'),
  name: z.string().optional(),
  address: z.string().min(1, 'Contract address is required'),
});

type NewContractInput = z.infer<typeof newContractSchema>;
type ReuseContractInput = z.infer<typeof reuseContractSchema>;

// Example IDL placeholders for different Anchor versions
const ANCHOR_IDL_EXAMPLES = {
  legacy: `{
  "version": "0.1.0",
  "name": "my_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "authority", "isMut": true, "isSigner": true }
      ],
      "args": [
        { "name": "data", "type": "u64" }
      ]
    }
  ]
}`,
  new: `{
  "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "metadata": {
    "name": "my_program",
    "version": "0.1.0"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [175, 175, 109, 31, 13, 152, 155, 237],
      "accounts": [
        { "name": "authority", "writable": true, "signer": true }
      ],
      "args": [
        { "name": "data", "type": "u64" }
      ]
    }
  ]
}`
};

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (request: AddContractRequest) => Promise<void>;
  ecosystem: 'evm' | 'solana' | 'aptos';
  blockchain: string;
  chainId: string;
  workspaceId: string;
}

export function AddContractModal({
  isOpen,
  onClose,
  onAdd,
  ecosystem,
  blockchain,
  chainId,
  workspaceId,
}: AddContractModalProps) {
  // UI state (not form data)
  const [mode, setMode] = useState<ContractMode>('new');
  const [idlVersion, setIdlVersion] = useState<AnchorIdlVersion>('new');
  const [moveInputMode, setMoveInputMode] = useState<MoveInputMode>('manual');
  const [error, setError] = useState<string | null>(null);

  // Move definition (complex nested state, kept separate)
  const [moveDefinition, setMoveDefinition] = useState<MoveDefinition>({
    moduleName: '',
    moduleAddress: '',
    functions: [],
    structs: [],
  });

  // AI state
  const { settings: aiSettings } = useAIStore();
  const [moveSourceCode, setMoveSourceCode] = useState('');
  const [evmSourceCode, setEvmSourceCode] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  // TanStack Query hooks
  const addContract = useAddContract();
  const { data: reusableContracts = [], isLoading: loadingContracts } = useReusableContracts(
    mode === 'reuse' ? blockchain : undefined,
    mode === 'reuse' ? chainId : undefined
  );

  // New contract form
  const newForm = useForm<NewContractInput>({
    resolver: zodResolver(newContractSchema),
    defaultValues: {
      name: '',
      address: '',
      abiJson: '',
      idlJson: '',
    },
  });

  // Reuse contract form
  const reuseForm = useForm<ReuseContractInput>({
    resolver: zodResolver(reuseContractSchema),
    defaultValues: {
      selectedContractId: '',
      name: '',
      address: '',
    },
  });

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      newForm.reset({ name: '', address: '', abiJson: '', idlJson: '' });
      reuseForm.reset({ selectedContractId: '', name: '', address: '' });
      setMode('new');
      setIdlVersion('new');
      setMoveInputMode('manual');
      setMoveDefinition({
        moduleName: '',
        moduleAddress: '',
        functions: [],
        structs: [],
      });
      setMoveSourceCode('');
      setEvmSourceCode('');
      setError(null);
      setAIError(null);
    }
  }, [isOpen]);

  // Determine interface type based on ecosystem
  const getInterfaceType = (): InterfaceType => {
    switch (ecosystem) {
      case 'evm':
        return 'abi';
      case 'solana':
        return 'idl';
      case 'aptos':
        return 'move';
      default:
        return 'abi';
    }
  };

  // Handle new contract submission
  const handleNewContract = async (data: NewContractInput) => {
    setError(null);

    // Validate ABI JSON format for EVM
    if (ecosystem === 'evm' && data.abiJson?.trim()) {
      try {
        const parsed = JSON.parse(data.abiJson);
        if (!Array.isArray(parsed)) {
          setError('ABI must be a JSON array');
          return;
        }
      } catch {
        setError('Invalid ABI JSON format');
        return;
      }
    }

    // Validate IDL JSON format for Solana
    if (ecosystem === 'solana' && data.idlJson?.trim()) {
      try {
        JSON.parse(data.idlJson);
      } catch {
        setError('Invalid IDL JSON format');
        return;
      }
    }

    // Validate Move definition for Aptos
    if (ecosystem === 'aptos') {
      if (!moveDefinition.moduleName.trim()) {
        setError('Module name is required for Move contracts');
        return;
      }
      if (moveDefinition.functions.length === 0) {
        setError('At least one function is required');
        return;
      }
    }

    try {
      if (onAdd) {
        // Use the callback if provided (maintains backward compatibility)
        const request: AddContractRequest = {
          workspaceId,
          name: data.name.trim(),
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: data.abiJson?.trim() ? JSON.parse(data.abiJson) : undefined,
          idl: data.idlJson?.trim() ? JSON.parse(data.idlJson) : undefined,
          moveDefinition: ecosystem === 'aptos' ? moveDefinition : undefined,
        };
        await onAdd(request);
      } else {
        // Use the TanStack Query mutation
        await addContract.mutateAsync({
          workspaceId,
          name: data.name.trim(),
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: data.abiJson?.trim() || undefined,
          idl: data.idlJson?.trim() || undefined,
          moveDefinition: ecosystem === 'aptos' ? JSON.stringify(moveDefinition) : undefined,
        });
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Handle reuse contract submission
  const handleReuseContract = async (data: ReuseContractInput) => {
    setError(null);

    const selectedContract = reusableContracts.find(c => c.id === data.selectedContractId);
    if (!selectedContract) {
      setError('Selected contract not found');
      return;
    }

    try {
      if (onAdd) {
        // Parse the ABI for the callback (maintains backward compatibility)
        let parsedAbi: object[] | undefined;
        if (selectedContract.abi) {
          try {
            parsedAbi = JSON.parse(selectedContract.abi);
          } catch {
            // Use as-is if it's already an object
          }
        }

        const request: AddContractRequest = {
          workspaceId,
          name: data.name?.trim() || selectedContract.name,
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: parsedAbi,
        };
        await onAdd(request);
      } else {
        // Use the TanStack Query mutation - pass abi as string
        await addContract.mutateAsync({
          workspaceId,
          name: data.name?.trim() || selectedContract.name,
          address: data.address.trim(),
          interfaceType: getInterfaceType(),
          abi: selectedContract.abi || undefined,
        });
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = () => {
    if (mode === 'new') {
      newForm.handleSubmit(handleNewContract)();
    } else {
      reuseForm.handleSubmit(handleReuseContract)();
    }
  };

  const handleClose = () => {
    newForm.reset();
    reuseForm.reset();
    setMode('new');
    setIdlVersion('new');
    setMoveDefinition({
      moduleName: '',
      moduleAddress: '',
      functions: [],
      structs: [],
    });
    setError(null);
    setMoveInputMode('manual');
    setMoveSourceCode('');
    setEvmSourceCode('');
    setAIError(null);
    onClose();
  };

  // AI: Parse Move module source code
  const handleAIParseMove = async () => {
    if (!moveSourceCode.trim() || !aiSettings.enabled) return;

    setIsAIProcessing(true);
    setAIError(null);

    try {
      const currentConfig = aiSettings.providers[aiSettings.provider];
      aiService.setAdapter(aiSettings.provider, currentConfig);
      const result = await aiService.parseMoveModule(moveSourceCode);

      if (result.success && result.definition) {
        // Only set the module name and functions/structs, not the address
        setMoveDefinition({
          ...result.definition,
          moduleAddress: moveDefinition.moduleAddress || '', // Keep existing address or empty
        });
        setMoveInputMode('manual'); // Switch to manual mode to show the result
      } else {
        setAIError(result.error || 'Failed to parse Move module');
      }
    } catch (err) {
      setAIError(err instanceof Error ? err.message : 'Failed to analyze Move module');
    } finally {
      setIsAIProcessing(false);
    }
  };

  // AI: Generate ABI from EVM source code
  const handleAIGenerateABI = async () => {
    if (!evmSourceCode.trim() || !aiSettings.enabled) return;

    setIsAIProcessing(true);
    setAIError(null);

    try {
      const currentConfig = aiSettings.providers[aiSettings.provider];
      aiService.setAdapter(aiSettings.provider, currentConfig);
      const result = await aiService.generateABI(evmSourceCode);

      if (result.success && result.abi) {
        newForm.setValue('abiJson', JSON.stringify(result.abi, null, 2));
        setEvmSourceCode(''); // Clear source after successful generation
      } else {
        setAIError(result.error || 'Failed to generate ABI');
      }
    } catch (err) {
      setAIError(err instanceof Error ? err.message : 'Failed to generate ABI');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const getEcosystemLabel = () => {
    switch (ecosystem) {
      case 'evm':
        return 'EVM (Solidity)';
      case 'solana':
        return 'Solana (Anchor)';
      case 'aptos':
        return 'Aptos (Move)';
      default:
        return ecosystem;
    }
  };

  const getAddressLabel = () => {
    switch (ecosystem) {
      case 'solana':
        return 'Program ID';
      case 'aptos':
        return 'Module Address';
      default:
        return 'Contract Address';
    }
  };

  const getAddressPlaceholder = () => {
    switch (ecosystem) {
      case 'solana':
        return 'e.g., Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
      case 'aptos':
        return '0x1::module_name';
      default:
        return '0x...';
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isLoading = newForm.formState.isSubmitting ||
    reuseForm.formState.isSubmitting ||
    addContract.isPending;

  // Watch form values for conditional rendering
  const abiJson = newForm.watch('abiJson');
  const idlJson = newForm.watch('idlJson');
  const selectedContractId = reuseForm.watch('selectedContractId');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Contract"
      size={ecosystem === 'aptos' ? 'lg' : 'md'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            {mode === 'reuse' ? 'Add to Workspace' : 'Add Contract'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'new'
                ? 'bg-coco-accent text-white'
                : 'bg-coco-bg-secondary text-coco-text-secondary hover:text-coco-text-primary'
            }`}
          >
            New Contract
          </button>
          <button
            type="button"
            onClick={() => setMode('reuse')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'reuse'
                ? 'bg-coco-accent text-white'
                : 'bg-coco-bg-secondary text-coco-text-secondary hover:text-coco-text-primary'
            }`}
          >
            Reuse Existing
          </button>
        </div>

        {/* Ecosystem indicator */}
        <div className="flex items-center gap-2 p-2 bg-coco-bg-secondary rounded-md">
          <FileCode className="w-4 h-4 text-coco-accent" />
          <span className="text-sm text-coco-text-secondary">
            Adding contract for <span className="font-medium text-coco-text-primary">{getEcosystemLabel()}</span>
          </span>
        </div>

        {/* Reuse mode */}
        {mode === 'reuse' && (
          <>
            {loadingContracts ? (
              <div className="text-center py-4 text-coco-text-secondary">
                Loading contracts...
              </div>
            ) : reusableContracts.length === 0 ? (
              <div className="text-center py-4 text-coco-text-secondary">
                No contracts found on other {blockchain} networks.
                <br />
                <span className="text-xs">Add a contract on another network first.</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-coco-text-primary">
                    Select a contract to reuse
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {reusableContracts.map((contract) => (
                      <button
                        key={contract.id}
                        type="button"
                        onClick={() => reuseForm.setValue('selectedContractId', contract.id)}
                        className={`w-full p-3 text-left rounded-md border transition-colors ${
                          selectedContractId === contract.id
                            ? 'border-coco-accent bg-coco-accent/10'
                            : 'border-coco-border-default bg-coco-bg-secondary hover:border-coco-border-hover'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-coco-text-primary">{contract.name}</div>
                            {contract.deployedAddress && (
                              <div className="text-xs text-coco-text-tertiary font-mono">
                                {truncateAddress(contract.deployedAddress)}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-coco-text-secondary">{contract.chainName}</div>
                            <div className="text-xs text-coco-text-tertiary">{contract.workspaceName}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {reuseForm.formState.errors.selectedContractId && (
                    <p className="text-xs text-coco-error">{reuseForm.formState.errors.selectedContractId.message}</p>
                  )}
                </div>

                <Input
                  label="Contract Name (optional)"
                  placeholder={reusableContracts.find(c => c.id === selectedContractId)?.name || 'Contract'}
                  {...reuseForm.register('name')}
                />

                <Input
                  label={`${getAddressLabel()} (on this chain)`}
                  placeholder={getAddressPlaceholder()}
                  {...reuseForm.register('address')}
                  error={reuseForm.formState.errors.address?.message}
                />

                <p className="text-xs text-coco-text-tertiary">
                  The contract's interface will be copied. Enter the {ecosystem === 'solana' ? 'program ID' : 'deployed address'} on this chain.
                </p>
              </>
            )}
          </>
        )}

        {/* New contract mode */}
        {mode === 'new' && (
          <>
            {/* Basic info */}
            <Input
              label="Contract Name"
              placeholder="Token"
              {...newForm.register('name')}
              error={newForm.formState.errors.name?.message}
            />

            <Input
              label={getAddressLabel()}
              placeholder={getAddressPlaceholder()}
              {...newForm.register('address')}
              error={newForm.formState.errors.address?.message}
            />

            {/* Interface input based on ecosystem */}
            {ecosystem === 'evm' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-coco-text-primary">
                    ABI (JSON)
                  </label>
                  {aiSettings.enabled && (
                    <button
                      type="button"
                      onClick={() => setEvmSourceCode(evmSourceCode ? '' : ' ')} // Toggle source input visibility
                      className="flex items-center gap-1 text-xs text-coco-accent hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      {evmSourceCode ? 'Paste ABI' : 'Generate from source'}
                    </button>
                  )}
                </div>

                {evmSourceCode ? (
                  <div className="space-y-3">
                    <p className="text-xs text-coco-text-tertiary">
                      Paste your Solidity source code and let Coco generate the ABI.
                    </p>
                    <textarea
                      value={evmSourceCode}
                      onChange={(e) => setEvmSourceCode(e.target.value)}
                      placeholder={`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
    mapping(address => uint256) public balances;

    function transfer(address to, uint256 amount) external returns (bool) {
        // ...
    }
}`}
                      className="w-full h-40 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
                      disabled={isAIProcessing}
                    />
                    {aiError && (
                      <p className="text-xs text-coco-error">{aiError}</p>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAIGenerateABI}
                      disabled={!evmSourceCode.trim() || isAIProcessing}
                      className="w-full"
                    >
                      {isAIProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Image src="/brand/coco-paw.png" alt="" width={16} height={16} className="mr-2" />
                          Generate ABI with Coco
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <textarea
                      {...newForm.register('abiJson')}
                      placeholder='[{"type":"function","name":"transfer",...}]'
                      className="w-full h-40 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
                    />
                    <p className="mt-1 text-xs text-coco-text-tertiary">
                      Paste the contract ABI JSON array from your compiled contract or block explorer.
                    </p>
                  </>
                )}
              </div>
            )}

            {ecosystem === 'solana' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-coco-text-primary">
                    Anchor IDL (JSON)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-coco-text-tertiary">Version:</span>
                    <select
                      value={idlVersion}
                      onChange={(e) => setIdlVersion(e.target.value as AnchorIdlVersion)}
                      className="text-xs bg-coco-bg-secondary border border-coco-border-default rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coco-accent"
                    >
                      <option value="new">Anchor 0.30+ (new format)</option>
                      <option value="legacy">Anchor &lt;0.30 (legacy)</option>
                    </select>
                  </div>
                </div>
                <textarea
                  {...newForm.register('idlJson')}
                  placeholder={ANCHOR_IDL_EXAMPLES[idlVersion]}
                  className="w-full h-48 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
                />
                <p className="mt-1 text-xs text-coco-text-tertiary">
                  {idlVersion === 'new' ? (
                    <>Paste the Anchor IDL JSON from your <code className="bg-coco-bg-secondary px-1 rounded">target/idl</code> folder. New format includes <code className="bg-coco-bg-secondary px-1 rounded">address</code> and <code className="bg-coco-bg-secondary px-1 rounded">metadata</code> fields.</>
                  ) : (
                    <>Paste the legacy Anchor IDL JSON. Legacy format uses <code className="bg-coco-bg-secondary px-1 rounded">version</code> and <code className="bg-coco-bg-secondary px-1 rounded">name</code> at the root level.</>
                  )}
                </p>
              </div>
            )}

            {ecosystem === 'aptos' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-coco-text-primary">
                    Move Module Definition
                  </label>
                  {aiSettings.enabled && (
                    <button
                      type="button"
                      onClick={() => setMoveInputMode(moveInputMode === 'manual' ? 'ai' : 'manual')}
                      className="flex items-center gap-1 text-xs text-coco-accent hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      {moveInputMode === 'manual' ? 'Import with AI' : 'Manual entry'}
                    </button>
                  )}
                </div>

                {moveInputMode === 'ai' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-coco-text-tertiary">
                      Paste your Move module source code and let Coco extract the definitions automatically.
                    </p>
                    <textarea
                      value={moveSourceCode}
                      onChange={(e) => setMoveSourceCode(e.target.value)}
                      placeholder={`module my_module::example {
    struct MyStruct has key {
        value: u64
    }

    public entry fun initialize(account: &signer) {
        // ...
    }

    public fun get_value(addr: address): u64 {
        // ...
    }
}`}
                      className="w-full h-48 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
                      disabled={isAIProcessing}
                    />
                    {aiError && (
                      <p className="text-xs text-coco-error">{aiError}</p>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAIParseMove}
                      disabled={!moveSourceCode.trim() || isAIProcessing}
                      className="w-full"
                    >
                      {isAIProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Image src="/brand/coco-paw.png" alt="" width={16} height={16} className="mr-2" />
                          Analyze with Coco
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-coco-text-tertiary">
                      Define the module's functions and structs manually since Move doesn't have a standard ABI format.
                    </p>
                    <MoveDefinitionBuilder
                      value={moveDefinition}
                      onChange={setMoveDefinition}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
