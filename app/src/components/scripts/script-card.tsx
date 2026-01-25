'use client';

import { useState } from 'react';
import { Play, Settings, Trash2, Terminal, Hexagon, Code2, Flame, FileCode } from 'lucide-react';
import { Card, IconButton, Badge } from '@/components/ui';
import type { Script, ScriptRunner } from '@/types';

interface ScriptCardProps {
  script: Script;
  onRun: (script: Script) => void;
  onEdit: (script: Script) => void;
  onDelete: (script: Script) => void;
}

const RUNNER_CONFIG: Record<ScriptRunner, { icon: typeof Terminal; label: string; color: string }> = {
  bash: { icon: Terminal, label: 'Bash', color: 'text-green-500' },
  node: { icon: Hexagon, label: 'Node', color: 'text-yellow-500' },
  bun: { icon: Flame, label: 'Bun', color: 'text-orange-500' },
  python: { icon: Code2, label: 'Python', color: 'text-blue-500' },
  forge: { icon: Hexagon, label: 'Script', color: 'text-purple-500' },
  'forge-test': { icon: Hexagon, label: 'Test', color: 'text-purple-500' },
  'forge-build': { icon: Hexagon, label: 'Build', color: 'text-purple-500' },
  npx: { icon: FileCode, label: 'npx', color: 'text-red-500' },
  custom: { icon: Terminal, label: 'Custom', color: 'text-coco-text-secondary' },
};

export function ScriptCard({ script, onRun, onEdit, onDelete }: ScriptCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const runner = script.runner || 'bash';
  const runnerConfig = RUNNER_CONFIG[runner] || RUNNER_CONFIG.bash;
  const RunnerIcon = runnerConfig.icon;

  return (
    <Card
      className="p-4 cursor-pointer transition-all hover:border-coco-accent/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onRun(script)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg bg-coco-bg-tertiary ${runnerConfig.color}`}>
            <RunnerIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-coco-text-primary truncate">{script.name}</h3>
              <Badge variant="pending" className="text-xs px-1.5 py-0">
                {runnerConfig.label}
              </Badge>
            </div>
            {script.description && (
              <p className="text-sm text-coco-text-secondary mt-1 line-clamp-2">
                {script.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-coco-text-tertiary">
              <span className="truncate font-mono max-w-[200px]" title={script.filePath}>
                {script.filePath.split('/').pop()}
              </span>
              {script.workingDirectory && (
                <span className="truncate max-w-[150px]" title={script.workingDirectory}>
                  in {script.workingDirectory.split('/').pop()}
                </span>
              )}
              {script.category && (
                <span className="px-2 py-0.5 rounded bg-coco-bg-tertiary">
                  {script.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            icon={<Play className="w-4 h-4" />}
            label="Run script"
            onClick={() => onRun(script)}
            className="text-green-500 hover:bg-green-500/10"
          />
          <IconButton
            icon={<Settings className="w-4 h-4" />}
            label="Edit script"
            onClick={() => onEdit(script)}
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete script"
            onClick={() => onDelete(script)}
            variant="danger"
          />
        </div>
      </div>
    </Card>
  );
}
