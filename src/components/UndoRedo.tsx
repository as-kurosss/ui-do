import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/store/editor'

export function UndoRedo() {
  const { pastStates, futureStates } = useSyncExternalStore(
    useEditorStore.temporal.subscribe,
    () => useEditorStore.temporal.getState(),
  )

  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  const undo = () => useEditorStore.temporal.getState().undo()
  const redo = () => useEditorStore.temporal.getState().redo()

  return (
    <div className="flex items-center gap-0.5">
      <button
        className={cn(
          'rounded px-1.5 py-0.5 text-xs transition-colors',
          canUndo
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
            : 'text-muted-foreground/30 cursor-default',
        )}
        disabled={!canUndo}
        onClick={undo}
        title="Undo (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        className={cn(
          'rounded px-1.5 py-0.5 text-xs transition-colors',
          canRedo
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
            : 'text-muted-foreground/30 cursor-default',
        )}
        disabled={!canRedo}
        onClick={redo}
        title="Redo (Ctrl+Y)"
      >
        ↪
      </button>
    </div>
  )
}
