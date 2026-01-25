'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, FileCode, Terminal, Hexagon, Code2, Flame } from 'lucide-react';
import { Modal, Input, Button } from '@/components/ui';
import { useCreateScript, useUpdateScript } from '@/hooks';
import { useToastStore } from '@/stores';
import { pickFile, pickDirectory, SCRIPT_FILE_FILTERS } from '@/lib/tauri/commands';
import type { Script, ScriptRunner } from '@/types';

interface AddScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  editingScript: Script | null;
}

interface RunnerOption {
  value: ScriptRunner;
  label: string;
  icon: typeof Terminal;
  description: string;
  fileExtensions: string[];
}

const RUNNER_OPTIONS: RunnerOption[] = [
  {
    value: 'bash',
    label: 'Bash',
    icon: Terminal,
    description: 'Shell scripts (.sh, .bash)',
    fileExtensions: ['sh', 'bash', 'zsh'],
  },
  {
    value: 'node',
    label: 'Node.js',
    icon: Hexagon,
    description: 'JavaScript/TypeScript files',
    fileExtensions: ['js', 'ts', 'mjs', 'mts'],
  },
  {
    value: 'bun',
    label: 'Bun',
    icon: Flame,
    description: 'JavaScript/TypeScript with Bun',
    fileExtensions: ['js', 'ts', 'mjs', 'mts'],
  },
  {
    value: 'python',
    label: 'Python',
    icon: Code2,
    description: 'Python scripts (.py)',
    fileExtensions: ['py'],
  },
  {
    value: 'forge',
    label: 'Forge Script',
    icon: Hexagon,
    description: 'forge script (deploy scripts)',
    fileExtensions: ['sol'],
  },
  {
    value: 'forge-test',
    label: 'Forge Test',
    icon: Hexagon,
    description: 'forge test (run tests)',
    fileExtensions: ['*'],
  },
  {
    value: 'forge-build',
    label: 'Forge Build',
    icon: Hexagon,
    description: 'forge build (compile)',
    fileExtensions: ['*'],
  },
  {
    value: 'npx',
    label: 'npx',
    icon: FileCode,
    description: 'Run npm packages',
    fileExtensions: ['*'],
  },
  {
    value: 'custom',
    label: 'Custom',
    icon: Terminal,
    description: 'Specify custom command',
    fileExtensions: ['*'],
  },
];

export function AddScriptModal({
  isOpen,
  onClose,
  workspaceId,
  editingScript,
}: AddScriptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [runner, setRunner] = useState<ScriptRunner>('bash');
  const [filePath, setFilePath] = useState('');
  const [command, setCommand] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [category, setCategory] = useState('');

  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const { addToast } = useToastStore();

  const isEditing = !!editingScript;

  useEffect(() => {
    if (editingScript) {
      setName(editingScript.name);
      setDescription(editingScript.description || '');
      setRunner(editingScript.runner || 'bash');
      setFilePath(editingScript.filePath);
      setCommand(editingScript.command || '');
      setWorkingDirectory(editingScript.workingDirectory || '');
      setCategory(editingScript.category || '');
    } else {
      setName('');
      setDescription('');
      setRunner('bash');
      setFilePath('');
      setCommand('');
      setWorkingDirectory('');
      setCategory('');
    }
  }, [editingScript, isOpen]);

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
  const filePathRequired = !['forge-test', 'forge-build', 'custom'].includes(runner);

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
      if (isEditing) {
        await updateScript.mutateAsync({
          scriptId: editingScript.id,
          workspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
          runner,
          filePath: filePath.trim(),
          command: command.trim() || undefined,
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
          command: command.trim() || undefined,
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

        {/* Runner Selection */}
        <div>
          <label className="block text-sm font-medium text-coco-text-primary mb-2">
            Runner
          </label>
          <div className="grid grid-cols-4 gap-2">
            {RUNNER_OPTIONS.map((option) => {
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
                        ? 'border-coco-accent bg-coco-accent-subtle text-coco-accent'
                        : 'border-coco-border-default hover:border-coco-border-strong hover:bg-coco-bg-secondary text-coco-text-secondary'
                    }
                  `}
                  title={option.description}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
          {selectedRunner && (
            <p className="mt-1.5 text-xs text-coco-text-tertiary">{selectedRunner.description}</p>
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

        {/* Optional test filter for forge-test */}
        {runner === 'forge-test' && (
          <div>
            <label className="block text-sm font-medium text-coco-text-primary mb-1.5">
              Test Filter <span className="text-coco-text-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="test/MyContract.t.sol"
              className="input"
            />
            <p className="mt-1 text-xs text-coco-text-tertiary">
              Filter tests by file path (uses --match-path)
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
