'use client';

import { useState, useEffect } from 'react';
import { Key, Trash2, Edit, Copy, Check } from 'lucide-react';
import { Card, IconButton } from '@/components/ui';
import { getEnvValue } from '@/lib/tauri/commands';
import type { EnvironmentVariable } from '@/types';

interface EnvVarCardProps {
  envVar: EnvironmentVariable;
  onEdit: (envVar: EnvironmentVariable) => void;
  onDelete: (envVar: EnvironmentVariable) => void;
}

export function EnvVarCard({ envVar, onEdit, onDelete }: EnvVarCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch the decrypted value on mount
  useEffect(() => {
    getEnvValue(envVar.workspaceId, envVar.key)
      .then(setValue)
      .catch(() => setValue(null));
  }, [envVar.workspaceId, envVar.key]);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card
      className="p-4 transition-all hover:border-coco-accent/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
            <Key className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono font-medium text-coco-text-primary truncate">
              {envVar.key}
            </h3>
            {/* Show the actual value */}
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono text-coco-text-secondary bg-coco-bg-tertiary px-2 py-0.5 rounded truncate max-w-[300px]">
                {value ?? '••••••••'}
              </code>
              {value && (
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
                  title="Copy value"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-coco-text-tertiary" />
                  )}
                </button>
              )}
            </div>
            {envVar.description && (
              <p className="text-xs text-coco-text-tertiary mt-1 line-clamp-1">
                {envVar.description}
              </p>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-1 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <IconButton
            icon={<Edit className="w-4 h-4" />}
            label="Edit variable"
            onClick={() => onEdit(envVar)}
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete variable"
            onClick={() => onDelete(envVar)}
            variant="danger"
          />
        </div>
      </div>
    </Card>
  );
}
