'use client';

import { useState, useEffect, useMemo } from 'react';
import { FolderOpen, FileCode, Terminal, Hexagon, Code2, Flame, Anchor, Cpu } from 'lucide-react';
import { Modal, Input, Button } from '@/components/ui';
import { useCreateScript, useUpdateScript } from '@/hooks';
import { useToastStore } from '@/stores';
import { pickFile, pickDirectory, SCRIPT_FILE_FILTERS } from '@/lib/tauri/commands';
import type { Script, ScriptRunner, Ecosystem } from '@/types';

interface AddScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  editingScript: Script | null;
  ecosystem?: Ecosystem;
}

interface RunnerOption {
  value: ScriptRunner;
  label: string;
  icon: typeof Terminal;
  description: string;
  fileExtensions: string[];
  ecosystems: Ecosystem[] | 'all'; // Which ecosystems this runner is available for
  category: 'general' | 'evm-foundry' | 'evm-hardhat' | 'solana' | 'aptos';
}

const RUNNER_OPTIONS: RunnerOption[] = [
  // General runners (available for all ecosystems)
  {
    value: 'bash',
    label: 'Bash',
    icon: Terminal,
    description: 'Shell scripts (.sh, .bash)',
    fileExtensions: ['sh', 'bash', 'zsh'],
    ecosystems: 'all',
    category: 'general',
  },
  {
    value: 'node',
    label: 'Node.js',
    icon: Hexagon,
    description: 'JavaScript/TypeScript files',
    fileExtensions: ['js', 'ts', 'mjs', 'mts'],
    ecosystems: 'all',
    category: 'general',
  },
  {
    value: 'bun',
    label: 'Bun',
    icon: Flame,
    description: 'JavaScript/TypeScript with Bun',
    fileExtensions: ['js', 'ts', 'mjs', 'mts'],
    ecosystems: 'all',
    category: 'general',
  },
  {
    value: 'python',
    label: 'Python',
    icon: Code2,
    description: 'Python scripts (.py)',
    fileExtensions: ['py'],
    ecosystems: 'all',
    category: 'general',
  },
  {
    value: 'npx',
    label: 'npx',
    icon: FileCode,
    description: 'Run npm packages',
    fileExtensions: ['*'],
    ecosystems: 'all',
    category: 'general',
  },
  {
    value: 'custom',
    label: 'Custom',
    icon: Terminal,
    description: 'Specify custom command',
    fileExtensions: ['*'],
    ecosystems: 'all',
    category: 'general',
  },
  // EVM/Hedera - Foundry (forge)
  {
    value: 'forge',
    label: 'Forge Script',
    icon: Hexagon,
    description: 'forge script (deploy scripts)',
    fileExtensions: ['sol'],
    ecosystems: ['evm'],
    category: 'evm-foundry',
  },
  {
    value: 'forge-test',
    label: 'Forge Test',
    icon: Hexagon,
    description: 'forge test (run tests)',
    fileExtensions: ['*'],
    ecosystems: ['evm'],
    category: 'evm-foundry',
  },
  {
    value: 'forge-build',
    label: 'Forge Build',
    icon: Hexagon,
    description: 'forge build (compile contracts)',
    fileExtensions: ['*'],
    ecosystems: ['evm'],
    category: 'evm-foundry',
  },
  // EVM/Hedera - Hardhat
  {
    value: 'hardhat',
    label: 'Hardhat Run',
    icon: Hexagon,
    description: 'npx hardhat run (deploy scripts)',
    fileExtensions: ['js', 'ts'],
    ecosystems: ['evm'],
    category: 'evm-hardhat',
  },
  {
    value: 'hardhat-test',
    label: 'Hardhat Test',
    icon: Hexagon,
    description: 'npx hardhat test (run tests)',
    fileExtensions: ['*'],
    ecosystems: ['evm'],
    category: 'evm-hardhat',
  },
  {
    value: 'hardhat-compile',
    label: 'Hardhat Compile',
    icon: Hexagon,
    description: 'npx hardhat compile',
    fileExtensions: ['*'],
    ecosystems: ['evm'],
    category: 'evm-hardhat',
  },
  // Solana - Anchor
  {
    value: 'anchor',
    label: 'Anchor Run',
    icon: Anchor,
    description: 'anchor run (custom scripts)',
    fileExtensions: ['ts', 'js'],
    ecosystems: ['solana'],
    category: 'solana',
  },
  {
    value: 'anchor-test',
    label: 'Anchor Test',
    icon: Anchor,
    description: 'anchor test (run tests)',
    fileExtensions: ['*'],
    ecosystems: ['solana'],
    category: 'solana',
  },
  {
    value: 'anchor-build',
    label: 'Anchor Build',
    icon: Anchor,
    description: 'anchor build (compile programs)',
    fileExtensions: ['*'],
    ecosystems: ['solana'],
    category: 'solana',
  },
  // Aptos - Move
  {
    value: 'aptos-move-compile',
    label: 'Move Compile',
    icon: Cpu,
    description: 'aptos move compile',
    fileExtensions: ['*'],
    ecosystems: ['aptos'],
    category: 'aptos',
  },
  {
    value: 'aptos-move-test',
    label: 'Move Test',
    icon: Cpu,
    description: 'aptos move test',
    fileExtensions: ['*'],
    ecosystems: ['aptos'],
    category: 'aptos',
  },
  {
    value: 'aptos-move-publish',
    label: 'Move Publish',
    icon: Cpu,
    description: 'aptos move publish (deploy)',
    fileExtensions: ['*'],
    ecosystems: ['aptos'],
    category: 'aptos',
  },
];

// Category labels
const categoryLabels: Record<string, string> = {
  general: 'General',
  'evm-foundry': 'Foundry',
  'evm-hardhat': 'Hardhat',
  solana: 'Anchor',
  aptos: 'Aptos Move',
};

// Helper function to get placeholder text for args input
function getArgsPlaceholder(runner: ScriptRunner): string {
  switch (runner) {
    case 'forge':
      return '--rpc-url $RPC_URL --broadcast';
    case 'forge-test':
      return '-vvv --gas-report';
    case 'forge-build':
      return '--optimizer-runs 200';
    case 'hardhat':
      return '--network sepolia';
    case 'hardhat-test':
      return '--parallel';
    case 'hardhat-compile':
      return '--force';
    case 'anchor':
      return '--provider.cluster devnet';
    case 'anchor-test':
      return '--skip-local-validator';
    case 'anchor-build':
      return '--verifiable';
    case 'aptos-move-compile':
      return '--named-addresses my_addr=default';
    case 'aptos-move-test':
      return '--coverage';
    case 'aptos-move-publish':
      return '--profile testnet --assume-yes';
    default:
      return '';
  }
}

// Helper function to get hint text for args input
function getArgsHint(runner: ScriptRunner): string {
  switch (runner) {
    case 'forge':
    case 'forge-test':
    case 'forge-build':
      return 'Additional flags passed to forge command';
    case 'hardhat':
    case 'hardhat-test':
    case 'hardhat-compile':
      return 'Additional flags passed to hardhat command';
    case 'anchor':
    case 'anchor-test':
    case 'anchor-build':
      return 'Additional flags passed to anchor command';
    case 'aptos-move-compile':
    case 'aptos-move-test':
    case 'aptos-move-publish':
      return 'Additional flags passed to aptos move command';
    default:
      return '';
  }
}

export function AddScriptModal({
  isOpen,
  onClose,
  workspaceId,
  editingScript,
  ecosystem = 'evm',
}: AddScriptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [runner, setRunner] = useState<ScriptRunner>('bash');
  const [filePath, setFilePath] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState(''); // Additional arguments/flags
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [category, setCategory] = useState('');

  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const { addToast } = useToastStore();

  const isEditing = !!editingScript;

  // Filter and group runners based on ecosystem
  const groupedRunners = useMemo(() => {
    const filtered = RUNNER_OPTIONS.filter((opt) => {
      if (opt.ecosystems === 'all') return true;
      return opt.ecosystems.includes(ecosystem);
    });

    // Group by category
    const groups: Record<string, RunnerOption[]> = {};
    filtered.forEach((opt) => {
      if (!groups[opt.category]) {
        groups[opt.category] = [];
      }
      groups[opt.category].push(opt);
    });

    return groups;
  }, [ecosystem]);

  // Get ecosystem-specific categories order
  const categoryOrder = useMemo(() => {
    switch (ecosystem) {
      case 'evm':
        return ['evm-foundry', 'evm-hardhat', 'general'];
      case 'solana':
        return ['solana', 'general'];
      case 'aptos':
        return ['aptos', 'general'];
      default:
        return ['general'];
    }
  }, [ecosystem]);

  useEffect(() => {
    if (editingScript) {
      setName(editingScript.name);
      setDescription(editingScript.description || '');
      setRunner(editingScript.runner || 'bash');
      setFilePath(editingScript.filePath);
      setCommand(editingScript.command || '');
      setArgs('');
      setWorkingDirectory(editingScript.workingDirectory || '');
      setCategory(editingScript.category || '');
    } else {
      setName('');
      setDescription('');
      // Set default runner based on ecosystem
      const defaultRunner = ecosystem === 'evm' ? 'forge-build' : ecosystem === 'solana' ? 'anchor-build' : ecosystem === 'aptos' ? 'aptos-move-compile' : 'bash';
      setRunner(defaultRunner);
      setFilePath('');
      setCommand('');
      setArgs('');
      setWorkingDirectory('');
      setCategory('');
    }
  }, [editingScript, isOpen, ecosystem]);

  // Auto-detect runner from file extension
  const detectRunner = (path: string): ScriptRunner | null => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    for (const option of RUNNER_OPTIONS) {
      if (option.fileExtensions.includes(ext)) {
        return option.value;
      }
    }
    return null;
  };

  const handlePickFile = async () => {
    try {
      const result = await pickFile({
        title: 'Select Script File',
        filters: SCRIPT_FILE_FILTERS,
      });
      if (result && typeof result === 'string') {
        setFilePath(result);

        // Auto-detect and set runner
        const detected = detectRunner(result);
        if (detected) {
          setRunner(detected);
        }

        // Auto-set name from filename if empty
        if (!name) {
          const filename = result.split('/').pop()?.split('.')[0] || '';
          setName(filename.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
        }

        // Auto-set working directory to parent folder
        if (!workingDirectory) {
          const parentDir = result.substring(0, result.lastIndexOf('/'));
          setWorkingDirectory(parentDir);
        }
      }
    } catch (error) {
      console.error('Failed to pick file:', error);
    }
  };

  const handlePickDirectory = async () => {
    try {
      const result = await pickDirectory({
        title: 'Select Working Directory',
      });
      if (result) {
        setWorkingDirectory(result);
      }
    } catch (error) {
      console.error('Failed to pick directory:', error);
    }
  };

  // Check if file path is required for the current runner
  // Build/test/compile runners don't need a specific file - they operate on the project
  const filePathRequired = ![
    'forge-test',
    'forge-build',
    'hardhat-test',
    'hardhat-compile',
    'anchor-test',
    'anchor-build',
    'aptos-move-compile',
    'aptos-move-test',
    'aptos-move-publish',
    'custom',
  ].includes(runner);

  // Check if this runner supports additional arguments
  const supportsArgs = [
    'forge',
    'forge-test',
    'forge-build',
    'hardhat',
    'hardhat-test',
    'hardhat-compile',
    'anchor',
    'anchor-test',
    'anchor-build',
    'aptos-move-compile',
    'aptos-move-test',
    'aptos-move-publish',
  ].includes(runner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation error',
        message: 'Name is required',
      });
      return;
    }

    if (filePathRequired && !filePath.trim()) {
      addToast({
        type: 'error',
        title: 'Validation error',
        message: 'Script file is required for this runner',
      });
      return;
    }

    if (runner === 'custom' && !command.trim()) {
      addToast({
        type: 'error',
        title: 'Validation error',
        message: 'Custom command is required when using custom runner',
      });
      return;
    }

    try {
      // Build command with args if provided
      const finalCommand = args.trim() ? `${command.trim() || ''} ${args.trim()}`.trim() : command.trim();

      if (isEditing) {
        await updateScript.mutateAsync({
          scriptId: editingScript.id,
          workspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
          runner,
          filePath: filePath.trim(),
          command: finalCommand || undefined,
          workingDirectory: workingDirectory.trim() || undefined,
          category: category.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Script updated',
          message: `"${name}" has been updated`,
        });
      } else {
        await createScript.mutateAsync({
          workspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
          runner,
          filePath: filePath.trim(),
          command: finalCommand || undefined,
          workingDirectory: workingDirectory.trim() || undefined,
          category: category.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Script created',
          message: `"${name}" has been added`,
        });
      }
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: isEditing ? 'Failed to update script' : 'Failed to create script',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const isPending = createScript.isPending || updateScript.isPending;
  const selectedRunner = RUNNER_OPTIONS.find((r) => r.value === runner);

  // Determine if form is valid
  const isFormValid =
    name.trim() &&
    (!filePathRequired || filePath.trim()) &&
    (runner !== 'custom' || command.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Script' : 'Add Script'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || !isFormValid}
          >
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Script'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="My Deployment Script"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Runner Selection - Grouped by Category */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-coco-text-primary">
            Runner
          </label>

          {categoryOrder.map((cat) => {
            const runners = groupedRunners[cat];
            if (!runners || runners.length === 0) return null;

            return (
              <div key={cat}>
                <p className="text-xs font-medium text-coco-text-tertiary uppercase tracking-wider mb-2">
                  {categoryLabels[cat]}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {runners.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRunner(option.value)}
                        className={`
                          flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
                          ${
                            runner === option.value
                              ? 'border-coco-accent bg-coco-accent/10 text-coco-accent'
                              : 'border-coco-border-default hover:border-coco-border-strong hover:bg-coco-bg-secondary text-coco-text-secondary'
                          }
                        `}
                        title={option.description}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {selectedRunner && (
            <p className="text-xs text-coco-text-tertiary">{selectedRunner.description}</p>
          )}
        </div>

        {/* File Path with picker - only shown for runners that need it */}
        {filePathRequired && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Script File
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/script.sh"
                  className="input pr-10"
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePickFile}
                className="flex-shrink-0"
              >
                <FolderOpen className="w-4 h-4 mr-1.5" />
                Browse
              </Button>
            </div>
            <p className="mt-1 text-xs text-coco-text-tertiary">
              Select the script file to run
            </p>
          </div>
        )}

        {/* Optional test filter for test runners */}
        {['forge-test', 'hardhat-test', 'anchor-test', 'aptos-move-test'].includes(runner) && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Test Filter <span className="text-coco-text-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder={
                runner === 'forge-test'
                  ? 'test/MyContract.t.sol'
                  : runner === 'hardhat-test'
                  ? 'test/MyContract.test.ts'
                  : runner === 'anchor-test'
                  ? 'tests/my-program.ts'
                  : 'my_module_tests'
              }
              className="input"
            />
            <p className="mt-1 text-xs text-coco-text-tertiary">
              {runner === 'forge-test'
                ? 'Filter tests by file path (uses --match-path)'
                : runner === 'hardhat-test'
                ? 'Filter tests by file path'
                : runner === 'anchor-test'
                ? 'Filter tests by file'
                : 'Filter tests by module name'}
            </p>
          </div>
        )}

        {/* Additional arguments/flags for supported runners */}
        {supportsArgs && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Additional Flags <span className="text-coco-text-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder={getArgsPlaceholder(runner)}
              className="input"
            />
            <p className="mt-1 text-xs text-coco-text-tertiary">
              {getArgsHint(runner)}
            </p>
          </div>
        )}

        {/* Custom Command (only for custom runner) */}
        {runner === 'custom' && (
          <Input
            label="Custom Command"
            placeholder="cargo run --release"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            hint="The command to execute (file path will be appended)"
            required
          />
        )}

        {/* Working Directory with picker */}
        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
            Working Directory
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="/path/to/project"
                className="input"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePickDirectory}
              className="flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4 mr-1.5" />
              Browse
            </Button>
          </div>
          <p className="mt-1 text-xs text-coco-text-tertiary">
            Directory where the script will be executed
          </p>
        </div>

        <Input
          label="Description"
          placeholder="Deploys contracts to mainnet"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label="Category"
          placeholder="deployment"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          hint="Optional category for organization"
        />
      </form>
    </Modal>
  );
}
