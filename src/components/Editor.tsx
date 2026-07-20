import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { Palette } from './Palette';
import { Canvas } from './Canvas';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { Inspector } from './Inspector';
import { LayersPanel } from './LayersPanel';
import { ContextMenu } from './ContextMenu';
import { DragOverlayContent } from './DragOverlayContent';
import { DropIndicators } from './DropIndicators';
import { UndoRedo } from './UndoRedo';
import { ScreenTabs } from './ScreenTabs';
import { ProjectMenu } from './ProjectMenu';
import { ExportDialog } from './ExportDialog';
import { TokensPanel } from './TokensPanel';
import { TokenInjector } from './TokenInjector';
import { useKeyboard } from '@/hooks/useKeyboard';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editor';
import type { DragData } from '@/core/dnd-strategy';
import { treeStrategy, computeDropHint } from '@/core/dnd-strategy';
import { createNode } from '@/core/create-node';
import type { NodeId } from '@/core/ir';

type ViewportWidth = 'full' | '375' | '768' | '1280';

export function Editor() {
  const [previewWidth, setPreviewWidth] = useState<ViewportWidth>('full');
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [rightTab, setRightTab] = useState<'properties' | 'theme'>('properties');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: NodeId } | null>(
    null,
  );

  useKeyboard();

  const insertNode = useEditorStore((s) => s.insertNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const setDropHint = useEditorStore((s) => s.setDropHint);

  const handleContextMenu = (nodeId: NodeId, e: React.MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) setActiveDrag(data);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, activatorEvent } = event;
    if (over) {
      const overId = String(over.id);
      if (overId.startsWith('node:')) {
        const parentId = overId.slice(5);
        if (activatorEvent && 'clientX' in activatorEvent) {
          const hint = computeDropHint(
            parentId,
            (activatorEvent as MouseEvent).clientX,
            (activatorEvent as MouseEvent).clientY,
          );
          setDropHint(hint);
          return;
        }
      }
    }
    setDropHint(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      const overId = String(over.id);
      if (overId.startsWith('node:')) {
        const dropHint = useEditorStore.getState().dropHint;
        if (dropHint) {
          const data = active.data.current as DragData | undefined;
          if (data?.type === 'palette') {
            const node = createNode(data.componentId);
            insertNode(dropHint.parentId as NodeId, dropHint.index, node);
          } else if (data?.type === 'move') {
            moveNode(data.nodeId as NodeId, dropHint.parentId as NodeId, dropHint.index);
          }
        }
      }
    }
    setActiveDrag(null);
    setDropHint(null);
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
    setDropHint(null);
  };

  const isPreview = previewWidth !== 'full';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={treeStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        {/* Toolbar */}
        <header className="flex h-10 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <ProjectMenu />
            <span className="text-xs text-muted-foreground/30">|</span>
            <UndoRedo />
            <span className="text-xs text-muted-foreground/30">|</span>
            <ScreenTabs />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Preview:</span>
            {(['full', '1280', '768', '375'] as const).map((w) => (
              <button
                key={w}
                className={cn(
                  'rounded px-2 py-0.5 text-xs transition-colors',
                  previewWidth === w
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                onClick={() => setPreviewWidth(w)}
              >
                {w === 'full' ? 'Free' : `${w}px`}
              </button>
            ))}
            <span className="text-xs text-muted-foreground/30">|</span>
            <button
              className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setShowExport(true)}
            >
              Export
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — only in editor mode */}
          {!isPreview && (
            <aside className="flex w-64 flex-col overflow-y-auto border-r border-border bg-background">
              <Palette />
              <div className="border-t border-border" />
              <LayersPanel onContextMenu={handleContextMenu} />
            </aside>
          )}

          {/* Canvas */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {isPreview ? (
              <PreviewCanvas width={previewWidth}>
                <Canvas onContextMenu={handleContextMenu} />
              </PreviewCanvas>
            ) : (
              <CanvasErrorBoundary>
                <Canvas onContextMenu={handleContextMenu} />
              </CanvasErrorBoundary>
            )}
          </main>

          {/* Right sidebar — only in editor mode */}
          {!isPreview && (
            <aside className="flex w-72 flex-col border-l border-border bg-background">
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  className={cn(
                    'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                    rightTab === 'properties'
                      ? 'bg-background text-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setRightTab('properties')}
                >
                  Properties
                </button>
                <button
                  className={cn(
                    'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                    rightTab === 'theme'
                      ? 'bg-background text-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setRightTab('theme')}
                >
                  Theme
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {rightTab === 'properties' ? <Inspector /> : <TokensPanel />}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Drop indicators (global, positioned via fixed) */}
      <DropIndicators />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Drag overlay */}
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeDrag && <DragOverlayContent data={activeDrag} />}
      </DragOverlay>

      {/* Export dialog */}
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />

      {/* Token CSS injection */}
      <TokenInjector />
    </DndContext>
  );
}

function PreviewCanvas({ width, children }: { width: ViewportWidth; children: React.ReactNode }) {
  const maxW =
    width === '375'
      ? 'max-w-[375px]'
      : width === '768'
        ? 'max-w-[768px]'
        : width === '1280'
          ? 'max-w-[1280px]'
          : '';

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/50 p-4">
      <div
        className={cn(
          'w-full min-h-full rounded-lg border border-border bg-background shadow-sm',
          maxW,
        )}
      >
        {children}
      </div>
    </div>
  );
}
