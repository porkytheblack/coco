'use client';

import { useState, useEffect } from 'react';
import { FileCode } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { MoveDefinitionBuilder } from './move-definition-builder';
import type { InterfaceType, AddContractRequest, MoveDefinition, ContractWithChain } from '@/types';
import * as tauri from '@/lib/tauri';

type ContractMode = 'new' | 'reuse';
type AnchorIdlVersion = 'legacy' | 'new';

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
  onAdd: (request: AddContractRequest) => Promise<void>;
  ecosystem: 'evm' | 'solana' | 'aptos';
  blockchain: string;
  chainId: string;
}

export function AddContractModal({
  isOpen,
  onClose,
  onAdd,
  ecosystem,
  blockchain,
  chainId,
}: AddContractModalProps) {
  const [mode, setMode] = useState<ContractMode>('new');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [abiJson, setAbiJson] = useState('');
  const [idlJson, setIdlJson] = useState('');
  const [idlVersion, setIdlVersion] = useState<AnchorIdlVersion>('new');
  const [moveDefinition, setMoveDefinition] = useState<MoveDefinition>({
    moduleName: '',
    moduleAddress: '',
    functions: [],
    structs: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reuse mode state
  const [reusableContracts, setReusableContracts] = useState<ContractWithChain[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Load reusable contracts when modal opens or mode changes to reuse
  useEffect(() => {
    if (isOpen && mode === 'reuse' && blockchain) {
      loadReusableContracts();
    }
  }, [isOpen, mode, blockchain, chainId]);

  const loadReusableContracts = async () => {
    setLoadingContracts(true);
    try {
      const contracts = await tauri.listReusableContracts(blockchain, chainId);
      setReusableContracts(contracts);
    } catch (err) {
      console.error('Failed to load reusable contracts:', err);
      setReusableContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

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

  const handleAdd = async () => {
    // Handle reuse mode
    if (mode === 'reuse') {
      if (!selectedContractId) {
        setError('Please select a contract to reuse');
        return;
      }

      const selectedContract = reusableContracts.find(c => c.id === selectedContractId);
      if (!selectedContract) {
        setError('Selected contract not found');
        return;
      }

      if (!address.trim()) {
        setError('Contract address is required for the new chain');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Parse the ABI from the selected contract
        let parsedAbi: object[] | undefined;
        if (selectedContract.abi) {
          try {
            parsedAbi = JSON.parse(selectedContract.abi);
          } catch {
            // Use as-is if it's already an object
          }
        }

        const request: AddContractRequest = {
          workspaceId: '', // Will be set by the store
          name: name.trim() || selectedContract.name,
          address: address.trim(),
          interfaceType: getInterfaceType(),
          abi: parsedAbi,
        };
        await onAdd(request);
        handleClose();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle new contract mode
    if (!name.trim()) {
      setError('Contract name is required');
      return;
    }
    if (!address.trim()) {
      setError('Contract address is required');
      return;
    }

    // Validate interface based on ecosystem
    let parsedAbi: object[] | undefined;
    let parsedIdl: object | undefined;

    if (ecosystem === 'evm' && abiJson.trim()) {
      try {
        parsedAbi = JSON.parse(abiJson);
        if (!Array.isArray(parsedAbi)) {
          setError('ABI must be a JSON array');
          return;
        }
      } catch {
        setError('Invalid ABI JSON format');
        return;
      }
    }

    if (ecosystem === 'solana' && idlJson.trim()) {
      try {
        parsedIdl = JSON.parse(idlJson);
      } catch {
        setError('Invalid IDL JSON format');
        return;
      }
    }

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

    setIsLoading(true);
    setError(null);

    try {
      const request: AddContractRequest = {
        workspaceId: '', // Will be set by the store
        name: name.trim(),
        address: address.trim(),
        interfaceType: getInterfaceType(),
        abi: parsedAbi,
        idl: parsedIdl,
        moveDefinition: ecosystem === 'aptos' ? moveDefinition : undefined,
      };
      await onAdd(request);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMode('new');
    setName('');
    setAddress('');
    setAbiJson('');
    setIdlJson('');
    setIdlVersion('new');
    setMoveDefinition({
      moduleName: '',
      moduleAddress: '',
      functions: [],
      structs: [],
    });
    setError(null);
    setSelectedContractId(null);
    setReusableContracts([]);
    onClose();
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
          <Button variant="primary" onClick={handleAdd} isLoading={isLoading}>
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
                        onClick={() => setSelectedContractId(contract.id)}
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
                </div>

                <Input
                  label="Contract Name (optional)"
                  placeholder={reusableContracts.find(c => c.id === selectedContractId)?.name || 'Contract'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label={`${getAddressLabel()} (on this chain)`}
                  placeholder={getAddressPlaceholder()}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label={getAddressLabel()}
              placeholder={getAddressPlaceholder()}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            {/* Interface input based on ecosystem */}
            {ecosystem === 'evm' && (
              <div>
                <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
                  ABI (JSON)
                </label>
                <textarea
                  value={abiJson}
                  onChange={(e) => setAbiJson(e.target.value)}
                  placeholder='[{"type":"function","name":"transfer",...}]'
                  className="w-full h-40 px-3 py-2 text-sm font-mono bg-coco-bg-primary border border-coco-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
                />
                <p className="mt-1 text-xs text-coco-text-tertiary">
                  Paste the contract ABI JSON array from your compiled contract or block explorer.
                </p>
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
                  value={idlJson}
                  onChange={(e) => setIdlJson(e.target.value)}
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
                <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
                  Move Module Definition
                </label>
                <p className="mb-3 text-xs text-coco-text-tertiary">
                  Define the module's functions and structs manually since Move doesn't have a standard ABI format.
                </p>
                <MoveDefinitionBuilder
                  value={moveDefinition}
                  onChange={setMoveDefinition}
                />
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
