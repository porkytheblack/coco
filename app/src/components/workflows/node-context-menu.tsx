'use client';

import { useEffect, useRef } from 'react';
import { Play, FastForward, RotateCcw } from 'lucide-react';

interface NodeContextMenuProps {
  position: { x: number; y: number };
  nodeId: string;
  nodeName: string;
  nodeType: string;
  canResume?: boolean;
  onRunSingle: (nodeId: string) => void;
  onRunUpTo: (nodeId: string) => void;
  onResumeFrom?: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeContextMenu({
  position,
  nodeId,
  nodeName,
  nodeType,
  canResume = false,
  onRunSingle,
  onRunUpTo,
  onResumeFrom,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Prevent scroll issues
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    // Adjust position if menu would go off screen
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${position.x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${position.y - rect.height}px`;
    }
  }, [position]);

  // Don't show execution options for start/end nodes
  const isExecutable = nodeType !== 'start' && nodeType !== 'end';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-coco-bg-elevated border border-coco-border-subtle rounded-lg shadow-lg py-1 overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-coco-border-subtle">
        <p className="text-xs text-coco-text-tertiary">Node Actions</p>
        <p className="text-sm font-medium text-coco-text-primary truncate">{nodeName}</p>
      </div>

      {isExecutable && (
        <div className="py-1">
          {/* Run Single Node */}
          <button
            onClick={() => {
              onRunSingle(nodeId);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coco-text-secondary hover:bg-coco-bg-tertiary hover:text-coco-text-primary transition-colors"
          >
            <Play className="w-4 h-4 text-emerald-500" />
            Run This Node
          </button>

          {/* Run Up To This Node */}
          <button
            onClick={() => {
              onRunUpTo(nodeId);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coco-text-secondary hover:bg-coco-bg-tertiary hover:text-coco-text-primary transition-colors"
          >
            <FastForward className="w-4 h-4 text-blue-500" />
            Run Up To Here
          </button>

          {/* Resume From Here (only if can resume) */}
          {canResume && onResumeFrom && (
            <button
              onClick={() => {
                onResumeFrom(nodeId);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coco-text-secondary hover:bg-coco-bg-tertiary hover:text-coco-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-500" />
              Resume From Here
            </button>
          )}
        </div>
      )}

      {!isExecutable && (
        <div className="px-3 py-2">
          <p className="text-xs text-coco-text-tertiary italic">
            {nodeType === 'start' ? 'Start node - use Run button' : 'End node - no actions'}
          </p>
        </div>
      )}
    </div>
  );
}
