import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { SpecNode, LayoutNode, ComponentNode, TextNode, CodeNode } from '@/core/ir';
import { COMPONENT_MAP } from './ComponentMap';
import type { NodeId } from '@/core/ir';
import type { MoveDragData } from '@/core/dnd-strategy';

// ── Props ──

interface CanvasRendererProps {
  node: SpecNode;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}

// ── Selection highlight ──

const SELECTED_CLASS = 'shadow-[0_0_0_2px_#3b82f6]';

// ── Layout class mapper ──

function layoutClasses(node: LayoutNode): string {
  const parts: string[] = node.className ? [node.className] : [];
  parts.push(node.display === 'grid' ? 'grid' : 'flex');
  if (node.display === 'flex' && node.direction) {
    parts.push(node.direction === 'column' ? 'flex-col' : 'flex-row');
  }
  if (node.gap !== undefined && node.gap >= 0 && node.gap <= 96) {
    parts.push(`gap-${node.gap}`);
  }
  if (node.align) parts.push(`items-${node.align}`);
  if (node.justify) parts.push(`justify-${node.justify}`);
  if (node.wrap) parts.push('flex-wrap');
  return parts.join(' ');
}

// ── Container node with droppable ──

function ContainerNode({
  node,
  selectedId,
  onSelect,
  onContextMenu,
}: {
  node: LayoutNode | ComponentNode;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `node:${node.id}` });
  const isSelected = node.id === selectedId;

  if (node.kind === 'layout') {
    return (
      <LayoutNodeContent
        node={node}
        isSelected={isSelected}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        droppableRef={setNodeRef}
      />
    );
  }

  return (
    <ComponentNodeContent
      node={node}
      isSelected={isSelected}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      droppableRef={setNodeRef}
    />
  );
}

// ── LayoutNode ──

function LayoutNodeContent({
  node,
  isSelected,
  onSelect,
  onContextMenu,
  droppableRef,
}: {
  node: LayoutNode;
  isSelected: boolean;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
  droppableRef: (el: HTMLElement | null) => void;
}) {
  const className = ['relative', layoutClasses(node), isSelected ? SELECTED_CLASS : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={droppableRef}
      data-bn-id={node.id}
      data-bn-direction={node.direction ?? 'column'}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(node.id, e);
      }}
    >
      {node.children.map((child) => (
        <CanvasNode
          key={child.id}
          node={child}
          selectedId={null}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
      {isSelected && <DragHandle nodeId={node.id} />}
    </div>
  );
}

// ── ComponentNode ──

function ComponentNodeContent({
  node,
  isSelected,
  onSelect,
  onContextMenu,
  droppableRef,
}: {
  node: ComponentNode;
  isSelected: boolean;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
  droppableRef: (el: HTMLElement | null) => void;
}) {
  const Comp = COMPONENT_MAP[node.component];

  if (!Comp) {
    const borderRadius =
      getComputedStyle(document.body).getPropertyValue('--radius').trim() || '0.5rem';
    return (
      <div
        ref={droppableRef}
        data-bn-id={node.id}
        className={`border-2 border-dashed border-orange-400 rounded-[${borderRadius}] p-2 text-xs text-orange-600 ${isSelected ? SELECTED_CLASS : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(node.id, e);
        }}
      >
        ⚠ {node.component}
        {node.children?.map((child) => (
          <CanvasNode
            key={child.id}
            node={child}
            selectedId={null}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))}
        {isSelected && <DragHandle nodeId={node.id} />}
      </div>
    );
  }

  const allProps: Record<string, unknown> = {
    'data-bn-id': node.id,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    ref: droppableRef,
  };

  if (isSelected) {
    allProps.className = `${node.className ?? ''} ${SELECTED_CLASS}`.trim();
  } else if (node.className) {
    allProps.className = node.className;
  }

  if (node.variants) Object.assign(allProps, node.variants);
  if (node.props) Object.assign(allProps, node.props);
  if (node.events) Object.assign(allProps, node.events);

  const children = node.children?.map((child) => (
    <CanvasNode
      key={child.id}
      node={child}
      selectedId={null}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    />
  ));

  return (
    <>
      {/* Context menu trigger via wrapper */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(node.id, e);
        }}
      >
        <Comp {...allProps}>{children}</Comp>
      </div>
      {isSelected && <DragHandle nodeId={node.id} />}
    </>
  );
}

// ── DragHandle (for selected nodes) ──

function DragHandle({ nodeId }: { nodeId: NodeId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `move:${nodeId}`,
    data: { type: 'move', nodeId } satisfies MoveDragData,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute -top-2 -right-2 z-40 flex h-5 w-5 cursor-grab items-center justify-center rounded-full border bg-background text-xs shadow-sm transition-colors hover:bg-muted ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      ⠿
    </button>
  );
}

// ── TextNode ──

const TEXT_TAGS = { p: 'p', h1: 'h1', h2: 'h2', h3: 'h3', span: 'span' } as const;

function TextNodeContent({
  node,
  onSelect,
  onContextMenu,
}: {
  node: TextNode;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  const tag = TEXT_TAGS[node.as ?? 'p'] || 'p';
  const className = node.className ?? '';

  const Tag = tag as React.ElementType;

  return (
    <Tag
      data-bn-id={node.id}
      className={className}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onContextMenu={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(node.id, e);
      }}
    >
      {node.text}
    </Tag>
  );
}

// ── CodeNode ──

function CodeNodeContent({
  node,
  onSelect,
  onContextMenu,
}: {
  node: CodeNode;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  return (
    <div
      data-bn-id={node.id}
      className="border-2 border-dashed border-muted-foreground/30 rounded-md p-4 text-center text-sm text-muted-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(node.id, e);
      }}
    >
      <div className="font-mono text-xs">[{node.label}]</div>
      <div className="text-xs mt-1">Code block — reserved for external agent</div>
    </div>
  );
}

// ── CanvasNode — dispatcher ──

function CanvasNode({
  node,
  selectedId,
  onSelect,
  onContextMenu,
}: {
  node: SpecNode;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void;
}) {
  switch (node.kind) {
    case 'layout':
    case 'component':
      return (
        <ContainerNode
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      );
    case 'text':
      return <TextNodeContent node={node} onSelect={onSelect} onContextMenu={onContextMenu} />;
    case 'code':
      return <CodeNodeContent node={node} onSelect={onSelect} onContextMenu={onContextMenu} />;
    default:
      return null;
  }
}

// ── Main renderer ──

export function CanvasRenderer({ node, selectedId, onSelect, onContextMenu }: CanvasRendererProps) {
  return (
    <CanvasNode
      node={node}
      selectedId={selectedId}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    />
  );
}
