import { useState, useEffect } from 'react';
import { X, Play, Code, GitBranch, Database, Wrench, Key, Copy, Check, Plus, Trash, Info, AlertTriangle, AlertCircle, Save, FastForward } from 'lucide-react';
import { useEnvVars } from '@/hooks/use-env-vars';
import { slugify } from '@/lib/workflow/engine';
import type {
  WorkflowNode,
  WorkflowEdge,
  TransactionNode,
  ScriptNode,
  PredicateNode,
  AdapterNode,
  TransformNode,
  LoggingNode,
  PredicateOperator,
  ScriptOutputExtraction,
} from '@/lib/workflow/types';
import { Button, IconButton } from '@/components/ui';
import type { Transaction, Contract } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface WorkflowPanelProps {
  node: WorkflowNode | null;
  transactions: Transaction[];
  contracts: Contract[];
  scripts: { id: string; name: string }[];
  wallets: { id: string; name: string }[];
  onClose: () => void;
  onUpdate: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
  workspaceId?: string;
  definition: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  onSave?: () => void;
  isSaving?: boolean;
  // Execution mode callbacks
  onRunSingleNode?: (nodeId: string) => void;
  onRunUpToNode?: (nodeId: string) => void;
  isExecuting?: boolean;
}

// ============================================================================
// Predicate Operators
// ============================================================================

const PREDICATE_OPERATORS: { value: PredicateOperator; label: string }[] = [
  { value: 'eq', label: 'Equals (==)' },
  { value: 'neq', label: 'Not Equals (!=)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater or Equal (>=)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less or Equal (<=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
];

// ============================================================================
// Panel Component
// ============================================================================

export function WorkflowPanel({
  node,
  transactions,
  contracts,
  scripts,
  wallets,
  onClose,
  onUpdate,
  onDelete,
  workspaceId,
  definition,
  onSave,
  isSaving = false,
  onRunSingleNode,
  onRunUpToNode,
  isExecuting = false,
}: WorkflowPanelProps) {
  if (!node) return null;

  return (
    <div className="w-full h-full bg-coco-bg-elevated border-l border-coco-border-subtle flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-coco-border-subtle">
        <div className="flex items-center gap-2">
          {node.type === 'transaction' && <Play className="w-4 h-4 text-blue-400" />}
          {node.type === 'script' && <Code className="w-4 h-4 text-green-400" />}
          {node.type === 'predicate' && <GitBranch className="w-4 h-4 text-amber-400" />}
          {node.type === 'adapter' && <Database className="w-4 h-4 text-purple-400" />}
          {node.type === 'transform' && <Wrench className="w-4 h-4 text-cyan-400" />}
          {node.type === 'logging' && <Database className="w-4 h-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-coco-text-primary capitalize">
            {node.type} Node
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
        >
          <X className="w-4 h-4 text-coco-text-tertiary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-coco-text-secondary mb-1">
            Label
          </label>
          <input
            type="text"
            value={node.label || ''}
            onChange={(e) => onUpdate({ ...node, label: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
            placeholder="Node label"
          />
        </div>

        {/* Variable Reference */}
        <VariableReference node={node} definition={definition} />

        {/* Transaction Node Config */}
        {node.type === 'transaction' && (
          <TransactionNodeConfig
            node={node}
            transactions={transactions}
            contracts={contracts}
            wallets={wallets}
            onUpdate={onUpdate}
          />
        )}

        {/* Script Node Config */}
        {node.type === 'script' && (
          <ScriptNodeConfig
            node={node}
            scripts={scripts}
            onUpdate={onUpdate}
          />
        )}

        {/* Predicate Node Config */}
        {node.type === 'predicate' && (
          <PredicateNodeConfig
            node={node}
            onUpdate={onUpdate}
          />
        )}

        {/* Adapter Node Config */}
        {node.type === 'adapter' && (
          <AdapterNodeConfig
            node={node}
            onUpdate={onUpdate}
            workspaceId={workspaceId}
          />
        )}

        {/* Transform Node Config */}
        {node.type === 'transform' && (
          <TransformNodeConfig
            node={node}
            onUpdate={onUpdate}
          />
        )}
        
        {/* Logging Node Config */}
        {node.type === 'logging' && (
          <LoggingNodeConfig
            node={node}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Footer */}
      {(node.type !== 'start' && node.type !== 'end' || onSave) && (
        <div className="p-4 border-t border-coco-border-subtle space-y-2 bg-coco-bg-elevated sticky bottom-0 z-10 transition-shadow">
          {/* Execution buttons for non-start/end nodes */}
          {node.type !== 'start' && node.type !== 'end' && (onRunSingleNode || onRunUpToNode) && (
            <div className="flex gap-2 mb-2">
              {onRunSingleNode && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRunSingleNode(node.id)}
                  disabled={isExecuting}
                  className="flex-1"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  Run Node
                </Button>
              )}
              {onRunUpToNode && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRunUpToNode(node.id)}
                  disabled={isExecuting}
                  className="flex-1"
                >
                  <FastForward className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  Run Up To
                </Button>
              )}
            </div>
          )}

          {onSave && (
            <Button
              variant="primary"
              className="w-full"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Save className="w-4 h-4" />
                  Save Changes
                </span>
              )}
            </Button>
          )}

          {node.type !== 'start' && node.type !== 'end' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(node.id)}
              className="w-full"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Node
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Transaction Node Config
// ============================================================================

function TransactionNodeConfig({
  node,
  transactions,
  contracts,
  wallets,
  onUpdate,
}: {
  node: TransactionNode;
  transactions: Transaction[];
  contracts: Contract[];
  wallets: { id: string; name: string }[];
  onUpdate: (node: WorkflowNode) => void;
}) {
  const transaction = transactions.find(t => t.id === node.config.transactionId);
  const contract = transaction?.contractId ? contracts.find(c => c.id === transaction.contractId) : null;
  const functionDef = contract?.functions?.find(f => f.name === transaction?.functionName);

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Transaction
        </label>
        <select
          value={node.config.transactionId}
          onChange={(e) => {
            const txId = e.target.value;
            // Clear args when changing transaction
            onUpdate({
              ...node,
              config: { 
                ...node.config, 
                transactionId: txId, 
                args: {} 
              },
            });
          }}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          <option value="">Select transaction...</option>
          {transactions.map(tx => (
            <option key={tx.id} value={tx.id}>{tx.name}</option>
          ))}
        </select>
      </div>

      {transaction && functionDef && functionDef.inputs.length > 0 && (
        <div className="space-y-3 p-3 bg-coco-bg-tertiary/30 rounded-lg border border-coco-border-subtle">
          <label className="block text-xs font-semibold text-coco-text-primary">
            Parameters
          </label>
          {functionDef.inputs.map((input, index) => (
            <div key={index}>
              <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                {input.name} <span className="text-coco-text-tertiary">({input.type})</span>
              </label>
              <input
                type="text"
                value={node.config.args?.[input.name] || ''}
                onChange={(e) => {
                  onUpdate({
                    ...node,
                    config: {
                      ...node.config,
                      args: {
                        ...node.config.args,
                        [input.name]: e.target.value
                      }
                    }
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
                placeholder={input.type.includes('int') ? '0' : 'Value or {{variable}}'}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Wallet (Optional)
        </label>
        <select
          value={node.config.walletId || ''}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, walletId: e.target.value || undefined },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          <option value="">Use default wallet</option>
          {wallets.map(wallet => (
            <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Output Variable
        </label>
        <input
          type="text"
          value={node.config.outputVariable || ''}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, outputVariable: e.target.value || undefined },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
          placeholder="e.g., txResult"
        />
        <p className="text-xs text-coco-text-tertiary mt-1">
          Store the result in this variable
        </p>
      </div>
    </>
  );
}

// ============================================================================
// Script Node Config
// ============================================================================

const EXTRACTION_TYPES: { value: ScriptOutputExtraction['type']; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
];

function ScriptNodeConfig({
  node,
  scripts,
  onUpdate,
}: {
  node: ScriptNode;
  scripts: { id: string; name: string }[];
  onUpdate: (node: WorkflowNode) => void;
}) {
  const extractions = node.config.extractions || [];

  const addExtraction = () => {
    onUpdate({
      ...node,
      config: {
        ...node.config,
        extractions: [
          ...extractions,
          { name: '', pattern: '', matchGroup: 1, type: 'string' as const },
        ],
      },
    });
  };

  const updateExtraction = (
    index: number,
    updates: Partial<ScriptOutputExtraction>
  ) => {
    const newExtractions = [...extractions];
    newExtractions[index] = { ...newExtractions[index], ...updates };
    onUpdate({
      ...node,
      config: { ...node.config, extractions: newExtractions },
    });
  };

  const removeExtraction = (index: number) => {
    onUpdate({
      ...node,
      config: {
        ...node.config,
        extractions: extractions.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Script
        </label>
        <select
          value={node.config.scriptId}
          onChange={(e) =>
            onUpdate({
              ...node,
              config: { ...node.config, scriptId: e.target.value },
            })
          }
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          <option value="">Select script...</option>
          {scripts.map((script) => (
            <option key={script.id} value={script.id}>
              {script.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Output Variable
        </label>
        <input
          type="text"
          value={node.config.outputVariable || ''}
          onChange={(e) =>
            onUpdate({
              ...node,
              config: {
                ...node.config,
                outputVariable: e.target.value || undefined,
              },
            })
          }
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
          placeholder="e.g., scriptOutput"
        />
      </div>

      {/* Output Extractions */}
      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-coco-text-primary">
              Output Extractions
            </label>
            <p className="text-[10px] text-coco-text-tertiary mt-0.5">
              Extract values from script output using regex
            </p>
          </div>
          <IconButton
            icon={<Plus className="w-3 h-3" />}
            variant="default"
            onClick={addExtraction}
            label="Add extraction"
          />
        </div>

        {extractions.map((extraction, index) => (
          <div
            key={index}
            className="p-3 bg-coco-bg-tertiary/40 rounded-lg border border-coco-border-subtle space-y-2 relative group"
          >
            <button
              onClick={() => removeExtraction(index)}
              className="absolute top-2 right-2 p-1 text-coco-text-tertiary hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash className="w-3 h-3" />
            </button>

            <div>
              <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
                Variable Name
              </label>
              <input
                type="text"
                value={extraction.name}
                onChange={(e) =>
                  updateExtraction(index, { name: e.target.value })
                }
                className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
                placeholder="deployedAddress"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
                Regex Pattern
              </label>
              <input
                type="text"
                value={extraction.pattern}
                onChange={(e) =>
                  updateExtraction(index, { pattern: e.target.value })
                }
                className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
                placeholder="Deployed at: (0x[a-fA-F0-9]+)"
              />
              <p className="text-[9px] text-coco-text-tertiary mt-1">
                Use capturing groups () to extract the value
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
                  Capture Group
                </label>
                <input
                  type="number"
                  min={0}
                  value={extraction.matchGroup ?? 1}
                  onChange={(e) =>
                    updateExtraction(index, {
                      matchGroup: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={extraction.type || 'string'}
                  onChange={(e) =>
                    updateExtraction(index, {
                      type: e.target.value as ScriptOutputExtraction['type'],
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
                >
                  {EXTRACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {extractions.length === 0 && (
          <div className="text-center py-4 px-3 border border-dashed border-coco-border-subtle rounded-lg">
            <p className="text-xs text-coco-text-tertiary">
              No extractions configured. Click + to add a pattern.
            </p>
          </div>
        )}

        {/* Help text for available output variables */}
        {extractions.length > 0 && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-[10px] text-emerald-400 font-medium mb-1">
              Available in conditions:
            </p>
            <code className="text-[9px] text-emerald-300 block">
              {'{{'}{slugify(node.label || node.type)}.is_success{'}}'}
            </code>
            {extractions
              .filter((e) => e.name)
              .map((e, i) => (
                <code key={i} className="text-[9px] text-emerald-300 block mt-0.5">
                  {'{{'}{slugify(node.label || node.type)}.{e.name}{'}}'}
                </code>
              ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Predicate Node Config
// ============================================================================

function PredicateNodeConfig({
  node,
  onUpdate,
}: {
  node: PredicateNode;
  onUpdate: (node: WorkflowNode) => void;
}) {
  const { expression } = node.config;

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Left Value
        </label>
        <input
          type="text"
          value={expression.left}
          onChange={(e) => onUpdate({
            ...node,
            config: {
              expression: { ...expression, left: e.target.value },
            },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
          placeholder="{{step1.result}}"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Operator
        </label>
        <select
          value={expression.operator}
          onChange={(e) => onUpdate({
            ...node,
            config: {
              expression: { ...expression, operator: e.target.value as PredicateOperator },
            },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          {PREDICATE_OPERATORS.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {!['isEmpty', 'isNotEmpty'].includes(expression.operator) && (
        <div>
          <label className="block text-xs font-medium text-coco-text-secondary mb-1">
            Right Value
          </label>
          <input
            type="text"
            value={String(expression.right ?? '')}
            onChange={(e) => onUpdate({
              ...node,
              config: {
                expression: { ...expression, right: e.target.value },
              },
            })}
            className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
            placeholder="100"
          />
        </div>
      )}

      <div className="p-3 bg-coco-bg-tertiary rounded-lg">
        <p className="text-xs text-coco-text-secondary">
          <span className="font-medium text-amber-400">True</span> branch follows the green handle
        </p>
        <p className="text-xs text-coco-text-secondary mt-1">
          <span className="font-medium text-rose-400">False</span> branch follows the red handle
        </p>
      </div>
    </>
  );
}

// ============================================================================
// Adapter Node Config
// ============================================================================

function AdapterNodeConfig({
  node,
  onUpdate,
  workspaceId,
}: {
  node: AdapterNode;
  onUpdate: (node: WorkflowNode) => void;
  workspaceId?: string;
}) {
  const { data: envVars = [] } = useEnvVars(workspaceId || '');

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Adapter
        </label>
        <select
          value={node.config.adapterId}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, adapterId: e.target.value },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          <option value="postgres">PostgreSQL</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Operation
        </label>
        <select
          value={node.config.operation}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, operation: e.target.value },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
        >
          <option value="query">Query</option>
          <option value="insert">Insert</option>
          <option value="execute">Execute SQL</option>
        </select>
      </div>

      {/* Operation Inputs - Postgres Specific */}
      {node.config.adapterId === 'postgres' && (
        <div className="space-y-4 border-l-2 border-coco-border-subtle pl-3 my-4">
          {(node.config.operation === 'query' || node.config.operation === 'execute') && (
            <div>
              <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                {node.config.operation === 'query' ? 'SQL Query' : 'SQL Command'}
              </label>
              <textarea
                value={(node.config.inputMappings?.query || node.config.inputMappings?.sql) || ''}
                onChange={(e) => {
                  const key = node.config.operation === 'query' ? 'query' : 'sql';
                  onUpdate({
                    ...node,
                    config: {
                      ...node.config,
                      inputMappings: { ...node.config.inputMappings, [key]: e.target.value },
                    },
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono resize-y min-h-[100px]"
                placeholder="SELECT * FROM users WHERE id = $1"
              />
              <p className="text-xs text-coco-text-tertiary mt-1">
                Use $1, $2 for parameters
              </p>
            </div>
          )}

          {(node.config.operation === 'insert') && (
             <div>
               <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                 Table Name
               </label>
               <input
                 type="text"
                 value={node.config.inputMappings?.table || ''}
                 onChange={(e) => onUpdate({
                   ...node,
                   config: {
                     ...node.config,
                     inputMappings: { ...node.config.inputMappings, table: e.target.value },
                   },
                 })}
                 className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
                 placeholder="users"
               />
             </div>
          )}
          
          {node.config.operation === 'insert' && (
              <div>
                  <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                      Columns (comma separated)
                  </label>
                  <input
                      type="text"
                      value={node.config.inputMappings?.columns || ''}
                      onChange={(e) => onUpdate({
                          ...node,
                          config: {
                              ...node.config,
                              inputMappings: { ...node.config.inputMappings, columns: e.target.value },
                          },
                      })}
                      className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
                      placeholder="name, email"
                  />
              </div>
          )}
          
          {/* Params input (JSON array) */}
          <div>
              <label className="block text-xs font-medium text-coco-text-secondary mb-1">
                Parameters (JSON Array)
              </label>
              <input
                type="text"
                value={node.config.inputMappings?.params || ''}
                onChange={(e) => onUpdate({
                  ...node,
                  config: {
                    ...node.config,
                    inputMappings: { ...node.config.inputMappings, params: e.target.value },
                  },
                })}
                className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
                placeholder='[1, "active"]'
              />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-coco-text-secondary">
            Connection String
            </label>
            {envVars.length > 0 && (
                <select
                    className="text-xs bg-transparent text-coco-text-tertiary hover:text-coco-accent focus:outline-none max-w-[120px]"
                    onChange={(e) => {
                        if (e.target.value) {
                             onUpdate({
                                ...node,
                                config: {
                                ...node.config,
                                config: { ...node.config.config, connectionString: `{{env.${e.target.value}}}` },
                                },
                            })
                        }
                    }}
                    value=""
                >
                    <option value="">Use Env Var...</option>
                    {envVars.map(v => (
                        <option key={v.key} value={v.key}>{v.key}</option>
                    ))}
                </select>
            )}
        </div>
        <input
          type="text"
          value={(node.config.config as { connectionString?: string })?.connectionString || ''}
          onChange={(e) => onUpdate({
            ...node,
            config: {
              ...node.config,
              config: { ...node.config.config, connectionString: e.target.value },
            },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
          placeholder="postgresql://user:pass@host:5432/db"
        />
        <p className="text-xs text-coco-text-tertiary mt-1">
            Tip: Use {'{{env.KEY}}'} to reference environment variables
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Output Variable
        </label>
        <input
          type="text"
          value={node.config.outputVariable || ''}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, outputVariable: e.target.value || undefined },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent"
          placeholder="e.g., queryResult"
        />
      </div>
    </>
  );
}

// ============================================================================
// Transform Node Config
// ============================================================================

function TransformNodeConfig({
  node,
  onUpdate,
}: {
  node: TransformNode;
  onUpdate: (node: WorkflowNode) => void;
}) {
  const mappings = node.config.mappings || [];

  const addMapping = () => {
    onUpdate({
      ...node,
      config: {
        ...node.config,
        mappings: [...mappings, { expression: '', outputVariable: '' }],
      },
    });
  };

  const updateMapping = (index: number, updates: Partial<{ expression: string; outputVariable: string }>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onUpdate({
      ...node,
      config: { ...node.config, mappings: newMappings },
    });
  };

  const removeMapping = (index: number) => {
    onUpdate({
      ...node,
      config: {
        ...node.config,
        mappings: mappings.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-coco-text-primary">
          Mappings
        </label>
        <IconButton
          icon={<Plus className="w-3 h-3" />}
          variant="default"
          onClick={addMapping}
          label="Add mapping"
        />
      </div>

      {mappings.map((mapping, index) => (
        <div key={index} className="p-3 bg-coco-bg-tertiary/40 rounded-lg border border-coco-border-subtle space-y-3 relative group">
          <button
            onClick={() => removeMapping(index)}
            className="absolute top-2 right-2 p-1 text-coco-text-tertiary hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash className="w-3 h-3" />
          </button>

          <div>
            <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
              From Expression
            </label>
            <textarea
              value={mapping.expression}
              onChange={(e) => updateMapping(index, { expression: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono resize-none"
              rows={2}
              placeholder="{{step1.result.value}}"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-coco-text-secondary uppercase tracking-wider mb-1">
              To Variable
            </label>
            <input
              type="text"
              value={mapping.outputVariable}
              onChange={(e) => updateMapping(index, { outputVariable: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-coco-bg-primary border border-coco-border-default rounded focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono"
              placeholder="myVar"
            />
          </div>
        </div>
      ))}

      {mappings.length === 0 && (
        <div className="text-center py-6 px-4 border border-dashed border-coco-border-subtle rounded-lg">
          <p className="text-xs text-coco-text-tertiary">
            No transformations yet. Click + to add one.
          </p>
        </div>
      )}

      <p className="text-[10px] text-coco-text-tertiary italic">
        Tip: Map multiple paths from your step results into separate workflow variables.
      </p>
    </div>
  );
}

// ============================================================================
// Logging Node Config
// ============================================================================

function LoggingNodeConfig({
  node,
  onUpdate,
}: {
  node: any; // Using any for brevity since it's a new type
  onUpdate: (node: WorkflowNode) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Message Template
        </label>
        <textarea
          value={node.config.message}
          onChange={(e) => onUpdate({
            ...node,
            config: { ...node.config, message: e.target.value },
          })}
          className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-coco-accent font-mono resize-y min-h-[80px]"
          placeholder="Step result was: {{step1.result}}"
        />
        <p className="text-[10px] text-coco-text-tertiary mt-1">
          Variables in {'{{ }}'} will be replaced with their values.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-coco-text-secondary mb-1">
          Log Level
        </label>
        <div className="flex gap-2">
          {['info', 'warn', 'error'].map((level) => (
            <button
              key={level}
              onClick={() => onUpdate({
                ...node,
                config: { ...node.config, level: level as any },
              })}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg border text-xs font-medium transition-all
                ${node.config.level === level 
                  ? 'bg-coco-bg-tertiary border-coco-accent text-coco-text-primary' 
                  : 'bg-coco-bg-primary border-coco-border-subtle text-coco-text-tertiary hover:border-coco-border-default'}
              `}
            >
              {level === 'info' && <Info className="w-3 h-3 text-blue-400" />}
              {level === 'warn' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              {level === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
              <span className="capitalize">{level}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Variable Reference Display
// ============================================================================

interface ReferenceItem {
  label: string;
  value: string;
  id: string;
  nodeType: string;
}

function VariableReference({ 
    node, 
    definition 
}: { 
    node: WorkflowNode; 
    definition: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } 
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // 1. Find all reachable nodes before this one
  // This is a simple version: show all other nodes except current, start, and end
  const otherNodes = definition.nodes.filter(n => 
    n.id !== node.id && 
    n.type !== 'start' && 
    n.type !== 'end'
  );

  const references: ReferenceItem[] = [];

  // Add global variables if any
  // ... future

  // Add node references
  otherNodes.forEach(n => {
    const label = n.label || n.type;
    const slug = slugify(label);
    
    references.push({
      label: `${label} (Result)`,
      value: `{{${slug}.result}}`,
      id: `${n.id}-result`,
      nodeType: n.type
    });

    const config = (n as any).config;
    if (config?.outputVariable) {
      references.push({
        label: `${label} (Alias)`,
        value: `{{${config.outputVariable}}}`,
        id: `${n.id}-alias`,
        nodeType: n.type
      });
    }
  });

  const filteredReferences = references.filter(ref => 
    ref.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ref.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 bg-coco-bg-tertiary/50 rounded-lg border border-coco-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Key className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-coco-text-secondary uppercase tracking-wider">
            Available Variables
          </span>
        </div>
        <span className="text-[9px] text-coco-text-tertiary">
          {filteredReferences.length} found
        </span>
      </div>

      <input
        type="text"
        placeholder="Filter variables..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-2 py-1 text-[11px] bg-coco-bg-primary border border-coco-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-coco-accent"
      />
      
      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredReferences.map((ref) => (
          <div key={ref.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-coco-text-tertiary uppercase truncate max-w-[150px]">
                {ref.label}
              </label>
              <span className="text-[8px] px-1 bg-coco-bg-tertiary rounded text-coco-text-tertiary capitalize">
                {ref.nodeType}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-coco-bg-primary border border-coco-border-subtle rounded px-2 py-1 group">
              <code className="text-[11px] text-coco-accent font-mono truncate flex-1">
                {ref.value}
              </code>
              <button
                onClick={() => copyToClipboard(ref.value, ref.id)}
                className="p-1 hover:bg-coco-bg-tertiary rounded text-coco-text-tertiary transition-colors"
                title="Copy to clipboard"
              >
                {copied === ref.id ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 hover:text-coco-text-primary" />
                )}
              </button>
            </div>
          </div>
        ))}

        {filteredReferences.length === 0 && (
          <p className="text-[10px] text-center text-coco-text-tertiary py-2 italic">
            No variables found.
          </p>
        )}
      </div>
    </div>
  );
}
