'use client';

import { useState } from 'react';
import { X, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  isCreating?: boolean;
}

// ============================================================================
// Modal Component
// ============================================================================

export function CreateWorkflowModal({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}: CreateWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-coco-bg-elevated border border-coco-border-subtle rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coco-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-coco-accent/10">
              <GitBranch className="w-5 h-5 text-coco-accent" />
            </div>
            <h2 className="text-lg font-semibold text-coco-text-primary">New Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-coco-text-tertiary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-coco-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent"
              placeholder="e.g., Deploy Token Workflow"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-coco-text-secondary mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-coco-bg-primary border border-coco-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-coco-accent resize-none"
              placeholder="Describe what this workflow does..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
