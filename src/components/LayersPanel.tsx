import { useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { SpecNode, NodeId } from '@/core/ir';
import { useEditorStore } from '@/store/editor';
import { getComponentDef } from '@/core/registry';
import { findParent } from '@/core/tree';

export function LayersPanel({
  onContextMenu,
}: {
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  const { project, activeScreenId, selectedId, select, moveNode } = useEditorStore();
  const [activeDragId, setActiveDragId] = useState<NodeId | null>(null);
  const screen = project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!screen) return null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as NodeId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = String(active.id) as NodeId;
      const overId = String(over.id) as NodeId;

      const overParentInfo = findParent(screen.root, overId);
      if (overParentInfo) {
        let targetIndex = overParentInfo.index;

        // If active node is in the same parent and comes before over node,
        // adjust index since active is removed first (shifts indices left)
        const activeParentInfo = findParent(screen.root, activeId);
        if (
          activeParentInfo &&
          activeParentInfo.parent.id === overParentInfo.parent.id &&
          activeParentInfo.index < overParentInfo.index
        ) {
          targetIndex = Math.max(0, overParentInfo.index - 1);
        }

        moveNode(activeId, overParentInfo.parent.id, targetIndex);
      }
    }
    setActiveDragId(null);
  };

  const handleDragCancel = () => setActiveDragId(null);

  const activeNodeLabel = activeDragId ? getNodeLabelFromTree(screen.root, activeDragId) : '';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-1 p-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Layers
        </h2>
        <LayerNode
          node={screen.root}
          depth={0}
          selectedId={selectedId}
          onSelect={select}
          onContextMenu={onContextMenu}
        />
      </div>

      <DragOverlay>
        {activeDragId && (
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-lg">
            {activeNodeLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function getNodeLabelFromTree(root: SpecNode, id: NodeId): string {
  const node = findNodeInTree(root, id);
  if (!node) return '';
  return getNodeLabel(node);
}

function findNodeInTree(root: SpecNode, id: NodeId): SpecNode | undefined {
  if (root.id === id) return root;
  const children =
    root.kind === 'layout' ? root.children : root.kind === 'component' ? (root.children ?? []) : [];
  for (const c of children) {
    const found = findNodeInTree(c, id);
    if (found) return found;
  }
  return undefined;
}

interface LayerNodeProps {
  node: SpecNode;
  depth: number;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}

function getNodeLabel(node: SpecNode): string {
  switch (node.kind) {
    case 'layout':
      return `Layout (${node.display})`;
    case 'component': {
      const def = getComponentDef(node.component);
      return def?.namedExport ?? node.component;
    }
    case 'text':
      return `Text: "${node.text.slice(0, 20)}${node.text.length > 20 ? '…' : ''}"`;
    case 'code':
      return `[${node.label}]`;
    default:
      return 'Unknown';
  }
}

function getNodeIcon(node: SpecNode): string {
  switch (node.kind) {
    case 'layout':
      return '▣';
    case 'component':
      return '◈';
    case 'text':
      return 'T';
    case 'code':
      return '◇';
    default:
      return '?';
  }
}

function getNodeColor(node: SpecNode): string {
  switch (node.kind) {
    case 'layout':
      return 'text-purple-600';
    case 'component':
      return 'text-blue-600';
    case 'text':
      return 'text-green-600';
    case 'code':
      return 'text-orange-600';
    default:
      return 'text-muted-foreground';
  }
}

function DraggableLayerItem({
  node,
  depth,
  isSelected,
  onSelect,
  onContextMenu,
}: {
  node: SpecNode;
  depth: number;
  isSelected: boolean;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: { nodeId: node.id },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { nodeId: node.id },
  });

  return (
    <div ref={setDropRef}>
      <button
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(node.id, e);
        }}
      >
        <span className={`${getNodeColor(node)} text-xs shrink-0`}>{getNodeIcon(node)}</span>
        <span className="truncate">{getNodeLabel(node)}</span>
      </button>
    </div>
  );
}

function LayerNode({ node, depth, selectedId, onSelect, onContextMenu }: LayerNodeProps) {
  const isSelected = node.id === selectedId;
  const hasChildren =
    (node.kind === 'layout' && node.children.length > 0) ||
    (node.kind === 'component' && (node.children?.length ?? 0) > 0);

  const children =
    node.kind === 'layout' ? node.children : node.kind === 'component' ? (node.children ?? []) : [];

  return (
    <>
      <DraggableLayerItem
        node={node}
        depth={depth}
        isSelected={isSelected}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
      />
      {hasChildren &&
        children.map((child) => (
          <LayerNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))}
    </>
  );
}
