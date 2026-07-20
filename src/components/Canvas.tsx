import { useEditorStore } from '@/store/editor'
import { CanvasRenderer } from './CanvasRenderer'
import type { NodeId } from '@/core/ir'

export function Canvas({ onContextMenu }: {
  onContextMenu?: (id: NodeId, e: React.MouseEvent) => void
}) {
  const { project, activeScreenId, selectedId, select } = useEditorStore()
  const screen = project.screens.find((s) => s.id === activeScreenId)
    ?? project.screens[0]

  if (!screen) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">No screens — add one to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-auto bg-muted/30">
      <div className="flex-1 p-8">
        <div className="mx-auto min-h-full w-full max-w-4xl rounded-lg border border-border bg-background p-6 shadow-sm">
          <CanvasRenderer
            node={screen.root}
            selectedId={selectedId}
            onSelect={select}
            onContextMenu={onContextMenu}
          />
        </div>
      </div>
    </div>
  )
}
