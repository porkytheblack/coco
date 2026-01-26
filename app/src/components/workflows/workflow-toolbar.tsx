'use client';

import { Play, GitBranch, Database, Code, Wrench, Circle, Square, ChevronLeft } from 'lucide-react';
import type { WorkflowNode, WorkflowNodeType } from '@/lib/workflow/types';

// ============================================================================
// Types
// ============================================================================

interface NodeTemplate {
  type: WorkflowNodeType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'core' | 'logic' | 'data';
}

interface WorkflowToolbarProps {
  onAddNode: (type: WorkflowNodeType) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// ============================================================================
// Node Templates
// ============================================================================

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'start',
    label: 'Start',
    icon: <Circle className="w-4 h-4" />,
    description: 'Entry point for the workflow',
    category: 'core',
  },
  {
    type: 'end',
    label: 'End',
    icon: <Square className="w-4 h-4" />,
    description: 'Exit point for the workflow',
    category: 'core',
  },
  {
    type: 'transaction',
    label: 'Transaction',
    icon: <Play className="w-4 h-4" />,
    description: 'Execute a blockchain transaction',
    category: 'core',
  },
  {
    type: 'script',
    label: 'Script',
    icon: <Code className="w-4 h-4" />,
    description: 'Run a script or command',
    category: 'core',
  },
  {
    type: 'predicate',
    label: 'Condition',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Branch based on a condition',
    category: 'logic',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: <Wrench className="w-4 h-4" />,
    description: 'Transform data between steps',
    category: 'logic',
  },
  {
    type: 'adapter',
    label: 'Adapter',
    icon: <Database className="w-4 h-4" />,
    description: 'Connect to external services',
    category: 'data',
  },
  {
    type: 'logging',
    label: 'Logging',
    icon: <Database className="w-4 h-4" />,
    description: 'Log results from steps',
    category: 'core',
  },
];

// ============================================================================
// Toolbar Component
// ============================================================================

export function WorkflowToolbar({ onAddNode, isCollapsed = false, onToggle }: WorkflowToolbarProps) {
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    console.log('[Toolbar] Drag started for:', nodeType);

    // Set the drag data
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType); // Fallback
    event.dataTransfer.effectAllowed = 'move';

    console.log('[Toolbar] Data set, effectAllowed:', event.dataTransfer.effectAllowed);
  };

  const onDragEnd = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    console.log('[Toolbar] Drag ended for:', nodeType, 'dropEffect:', event.dataTransfer.dropEffect);
  };

  const categories = [
    { id: 'core', label: 'Core' },
    { id: 'logic', label: 'Logic' },
    { id: 'data', label: 'Data' },
  ] as const;

  return (
    <div className={`${isCollapsed ? 'w-16 items-center' : 'w-56'} bg-coco-bg-elevated border-r border-coco-border-subtle flex flex-col transition-all duration-300`}>
      <div className={`p-3 border-b border-coco-border-subtle ${isCollapsed ? 'flex justify-center' : ''}`}>
        {!isCollapsed && (
          <>
            <h3 className="text-sm font-semibold text-coco-text-primary">Nodes</h3>
            <p className="text-xs text-coco-text-tertiary mt-1">Drag to add to canvas</p>
          </>
        )}
        {isCollapsed && (
          <button onClick={onToggle} className="p-1 hover:bg-coco-bg-tertiary rounded">
            <Database className="w-5 h-5 text-coco-text-secondary" />
          </button>
        )}
        {!isCollapsed && (
            <button 
                onClick={onToggle} 
                className="ml-auto p-1 hover:bg-coco-bg-tertiary rounded text-coco-text-tertiary"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {categories.map(category => {
          const nodes = NODE_TEMPLATES.filter(n => n.category === category.id);
          if (nodes.length === 0) return null;

          return (
            <div key={category.id}>
              <h4 className="text-xs font-medium text-coco-text-tertiary uppercase tracking-wider px-2 mb-2">
                {category.label}
              </h4>
              <div className="space-y-1">
                {nodes.map(template => (
                  <div
                    key={template.type}
                    draggable={true}
                    onDragStart={(event) => onDragStart(event, template.type)}
                    onDragEnd={(event) => onDragEnd(event, template.type)}
                    onClick={() => onAddNode(template.type)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-coco-bg-tertiary transition-colors group cursor-grab active:cursor-grabbing ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={template.description}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`
                      p-1.5 rounded-md
                      ${template.type === 'start' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                      ${template.type === 'end' ? 'bg-rose-500/20 text-rose-400' : ''}
                      ${template.type === 'transaction' ? 'bg-blue-500/20 text-blue-400' : ''}
                      ${template.type === 'script' ? 'bg-green-500/20 text-green-400' : ''}
                      ${template.type === 'predicate' ? 'bg-amber-500/20 text-amber-400' : ''}
                      ${template.type === 'transform' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                      ${template.type === 'adapter' ? 'bg-purple-500/20 text-purple-400' : ''}
                      ${template.type === 'logging' ? 'bg-slate-500/20 text-slate-400' : ''}
                    `}>
                      {template.icon}
                    </div>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-coco-text-primary truncate">
                          {template.label}
                        </p>
                        <p className="text-xs text-coco-text-tertiary truncate">
                          {template.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Helper to create a new node
// ============================================================================

let nodeIdCounter = 0;

export function createNode(type: WorkflowNodeType, position: { x: number; y: number }): WorkflowNode {
  const id = `${type}-${++nodeIdCounter}-${Date.now()}`;
  const template = NODE_TEMPLATES.find(t => t.type === type);
  const label = template?.label || type;

  const baseNode = {
    id,
    type,
    position,
    label,
  };

  switch (type) {
    case 'start':
      return { ...baseNode, type: 'start' };
    case 'end':
      return { ...baseNode, type: 'end', status: 'success' as const };
    case 'transaction':
      return {
        ...baseNode,
        type: 'transaction',
        config: { transactionId: '' },
      };
    case 'script':
      return {
        ...baseNode,
        type: 'script',
        config: { scriptId: '' },
      };
    case 'predicate':
      return {
        ...baseNode,
        type: 'predicate',
        config: {
          expression: { left: '', operator: 'eq' as const, right: '' },
        },
      };
    case 'adapter':
      return {
        ...baseNode,
        type: 'adapter',
        config: {
          adapterId: 'postgres',
          operation: 'query',
          config: {},
        },
      };
    case 'transform':
      return {
        ...baseNode,
        type: 'transform',
        config: {
          mappings: [],
        },
      };
    case 'logging':
      return {
        ...baseNode,
        type: 'logging',
        config: {
          message: '',
          level: 'info',
        },
      };
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}
