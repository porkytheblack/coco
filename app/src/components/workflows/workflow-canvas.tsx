'use client';

import { useState, useCallback, useRef } from 'react';
import type { WorkflowNode, WorkflowEdge, WorkflowDefinition, WorkflowNodeType } from '@/lib/workflow/types';
import { createNode } from './workflow-toolbar';

// ============================================================================
// Types
// ============================================================================

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

interface DragState {
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
}

interface ConnectionState {
  sourceId: string | null;
  sourceHandle: string | null;
}

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeAdd: (node: WorkflowNode) => void;
  onEdgeAdd: (edge: WorkflowEdge) => void;
  onEdgeDelete: (edgeId: string) => void;
  nodeStatus?: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'skipped'>;
}

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

// ============================================================================
// Node Colors
// ============================================================================

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  start: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400' },
  end: { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400' },
  transaction: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  script: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  predicate: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400' },
  adapter: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  transform: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  logging: { bg: 'bg-slate-500/20', border: 'border-slate-500', text: 'text-slate-400' },
};

// ============================================================================
// Canvas Component
// ============================================================================

export function WorkflowCanvas({
  definition,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeAdd,
  onEdgeAdd,
  onEdgeDelete,
  nodeStatus = {},
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<CanvasState>({ zoom: 1, panX: 0, panY: 0 });
  const [drag, setDrag] = useState<DragState>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const [connection, setConnection] = useState<ConnectionState>({ sourceId: null, sourceHandle: null });
  const [tempConnectionEnd, setTempConnectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Handle mouse wheel for zoom
  // Handle mouse wheel for zoom and pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Prevent browser zoom etc
    if (e.ctrlKey) {
        // Pinch gesture is treated as wheel with ctrlKey on many browsers
        e.preventDefault();
        const delta = e.deltaY * -0.01; // Scale down the delta
        setCanvas(prev => ({
          ...prev,
          zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta)),
        }));
    } else {
        // Normal scroll is treated as pan
        // Don't prevent default if we want standard page scroll? 
        // But user said "canvas", implies they want to pan the canvas.
        // If we preventDefault, page won't scroll.
        // Usually canvases capture scroll.
        e.preventDefault();
        setCanvas(prev => ({
            ...prev,
            panX: prev.panX - e.deltaX,
            panY: prev.panY - e.deltaY,
        }));
    }
  }, []);

  // Handle drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
    
    // Validate type
    if (!type || !['start', 'end', 'transaction', 'script', 'predicate', 'adapter', 'transform', 'logging'].includes(type as string)) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
        const x = (event.clientX - rect.left - canvas.panX) / canvas.zoom;
        const y = (event.clientY - rect.top - canvas.panY) / canvas.zoom;
        
        // Center the node on cursor (approx)
        const centeredX = x - NODE_WIDTH / 2;
        const centeredY = y - NODE_HEIGHT / 2;

        const newNode = createNode(type, { x: centeredX, y: centeredY });
        onNodeAdd(newNode);
    }
  }, [canvas, onNodeAdd]);

  // Handle canvas click for deselection
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on left click and if not clicking strictly on an interactive element (though they should stop propagation)
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
    }
  }, [canvas.panX, canvas.panY]);

  // Handle mouse move for panning and dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCanvas(prev => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
    }

    if (drag.nodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - canvas.panX) / canvas.zoom - drag.offsetX;
        const y = (e.clientY - rect.top - canvas.panY) / canvas.zoom - drag.offsetY;
        // Snap to grid
        const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
        onNodeMove(drag.nodeId, snappedX, snappedY);
      }
    }

    if (connection.sourceId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
        const y = (e.clientY - rect.top - canvas.panY) / canvas.zoom;
        setTempConnectionEnd({ x, y });
      }
    }
  }, [isPanning, panStart, drag, connection.sourceId, canvas.panX, canvas.panY, canvas.zoom, onNodeMove]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDrag({ nodeId: null, offsetX: 0, offsetY: 0 });
    setConnection({ sourceId: null, sourceHandle: null });
    setTempConnectionEnd(null);
  }, []);

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = definition.nodes.find(n => n.id === nodeId);
    if (node) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - canvas.panX) / canvas.zoom - node.position.x;
        const y = (e.clientY - rect.top - canvas.panY) / canvas.zoom - node.position.y;
        setDrag({ nodeId, offsetX: x, offsetY: y });
      }
    }
  }, [definition.nodes, canvas.panX, canvas.panY, canvas.zoom]);

  // Handle connection start
  const handleConnectionStart = useCallback((nodeId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnection({ sourceId: nodeId, sourceHandle: handle });
  }, []);

  // Handle connection end
  const handleConnectionEnd = useCallback((targetId: string, targetHandle: string | null) => {
    if (connection.sourceId && connection.sourceId !== targetId) {
      const edgeId = `edge-${Date.now()}`;
      onEdgeAdd({
        id: edgeId,
        sourceId: connection.sourceId,
        targetId,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
      });
    }
    setConnection({ sourceId: null, sourceHandle: null });
    setTempConnectionEnd(null);
  }, [connection, onEdgeAdd]);

  // Calculate edge path
  const getEdgePath = useCallback((edge: WorkflowEdge) => {
    const sourceNode = definition.nodes.find(n => n.id === edge.sourceId);
    const targetNode = definition.nodes.find(n => n.id === edge.targetId);
    
    if (!sourceNode || !targetNode) return '';

    // Calculate source point (bottom center or specific handle)
    let sourceX = sourceNode.position.x + NODE_WIDTH / 2;
    const sourceY = sourceNode.position.y + NODE_HEIGHT;
    
    if (edge.sourceHandle === 'true') {
      sourceX = sourceNode.position.x + NODE_WIDTH * 0.25;
    } else if (edge.sourceHandle === 'false') {
      sourceX = sourceNode.position.x + NODE_WIDTH * 0.75;
    }

    // Calculate target point (top center)
    const targetX = targetNode.position.x + NODE_WIDTH / 2;
    const targetY = targetNode.position.y;

    // Create bezier curve
    const midY = (sourceY + targetY) / 2;
    return `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
  }, [definition.nodes]);

  // Get temp connection path
  const getTempPath = useCallback(() => {
    if (!connection.sourceId || !tempConnectionEnd) return '';

    const sourceNode = definition.nodes.find(n => n.id === connection.sourceId);
    if (!sourceNode) return '';

    let sourceX = sourceNode.position.x + NODE_WIDTH / 2;
    let sourceY = sourceNode.position.y + NODE_HEIGHT;
    
    if (connection.sourceHandle === 'true') {
      sourceX = sourceNode.position.x + NODE_WIDTH * 0.25;
    } else if (connection.sourceHandle === 'false') {
      sourceX = sourceNode.position.x + NODE_WIDTH * 0.75;
    }

    const targetX = tempConnectionEnd.x;
    const targetY = tempConnectionEnd.y;
    const midY = (sourceY + targetY) / 2;

    return `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
  }, [connection, tempConnectionEnd, definition.nodes]);

  // Render grid
  const renderGrid = () => {
    const gridPattern = `
      <pattern id="grid" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">
        <circle cx="${GRID_SIZE / 2}" cy="${GRID_SIZE / 2}" r="1" fill="currentColor" opacity="0.3"/>
      </pattern>
    `;

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none text-coco-text-tertiary"
      >
        <g
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs dangerouslySetInnerHTML={{ __html: gridPattern }} />
          <rect width="1000000" height="1000000" x="-500000" y="-500000" fill="url(#grid)" />
        </g>
      </svg>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-coco-bg-primary overflow-hidden cursor-grab"
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ cursor: isPanning ? 'grabbing' : drag.nodeId ? 'move' : 'grab' }}
    >
      {/* Grid */}
      {renderGrid()}

      {/* Edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <g
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-coco-text-tertiary" />
          </marker>
        </defs>
        {definition.edges.map(edge => (
          <g key={edge.id}>
            <path
              d={getEdgePath(edge)}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-coco-text-tertiary"
              markerEnd="url(#arrowhead)"
            />
            {/* Clickable area for edge deletion */}
            <path
              d={getEdgePath(edge)}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              className="pointer-events-auto cursor-pointer"
              onClick={() => onEdgeDelete(edge.id)}
            />
          </g>
        ))}

        {/* Temp Connection Line */}
        {connection.sourceId && tempConnectionEnd && (
          <path
            d={getTempPath()}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="text-coco-accent"
            markerEnd="url(#arrowhead)"
          />
        )}
        </g>
      </svg>

      {/* Nodes */}
      <div
        className="absolute"
        style={{
          transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {definition.nodes.map(node => {
          const colors = NODE_COLORS[node.type] || NODE_COLORS.transform;
          const isSelected = node.id === selectedNodeId;

          return (
            <div
              key={node.id}
              className={`
                absolute rounded-lg border-2 transition-shadow
                ${colors.bg} ${colors.border}
                ${isSelected ? 'ring-2 ring-coco-accent ring-offset-2 ring-offset-coco-bg-primary' : ''}
                ${nodeStatus[node.id] === 'running' ? 'animate-pulse ring-2 ring-blue-400 ring-offset-2' : ''}
                ${nodeStatus[node.id] === 'completed' ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
                ${nodeStatus[node.id] === 'failed' ? 'ring-2 ring-rose-400 ring-offset-2' : ''}
              `}
              style={{
                left: node.position.x,
                top: node.position.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(node.id);
              }}
              onMouseDown={(e) => handleNodeDragStart(node.id, e)}
            >
              {/* Node content */}
              <div className="flex items-center justify-center h-full px-3">
                <span className={`text-sm font-medium truncate ${colors.text}`}>
                  {node.label || node.type}
                </span>
              </div>

              {/* Input handle (top) */}
              {node.type !== 'start' && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-coco-bg-tertiary border-2 border-coco-text-tertiary cursor-crosshair hover:border-coco-accent"
                  onMouseUp={() => handleConnectionEnd(node.id, null)}
                />
              )}

              {/* Output handle (bottom) */}
              {node.type !== 'end' && node.type !== 'predicate' && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-coco-bg-tertiary border-2 border-coco-text-tertiary cursor-crosshair hover:border-coco-accent"
                  onMouseDown={(e) => handleConnectionStart(node.id, 'default', e)}
                />
              )}

              {/* Predicate handles (true/false) */}
              {node.type === 'predicate' && (
                <>
                  <div
                    className="absolute bottom-0 left-1/4 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500/50 border-2 border-emerald-500 cursor-crosshair hover:border-emerald-400"
                    onMouseDown={(e) => handleConnectionStart(node.id, 'true', e)}
                    title="True"
                  />
                  <div
                    className="absolute bottom-0 left-3/4 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-rose-500/50 border-2 border-rose-500 cursor-crosshair hover:border-rose-400"
                    onMouseDown={(e) => handleConnectionStart(node.id, 'false', e)}
                    title="False"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-coco-bg-elevated border border-coco-border-subtle rounded-lg p-1">
        <button
          className="p-1.5 hover:bg-coco-bg-tertiary rounded text-coco-text-secondary"
          onClick={() => setCanvas(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - 0.1) }))}
        >
          −
        </button>
        <span className="text-xs text-coco-text-secondary w-12 text-center">
          {Math.round(canvas.zoom * 100)}%
        </span>
        <button
          className="p-1.5 hover:bg-coco-bg-tertiary rounded text-coco-text-secondary"
          onClick={() => setCanvas(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + 0.1) }))}
        >
          +
        </button>
      </div>
    </div>
  );
}
