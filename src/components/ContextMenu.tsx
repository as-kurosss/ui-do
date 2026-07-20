import { useEffect, useRef } from 'react'
import type { NodeId } from '@/core/ir'
import { useEditorStore } from '@/store/editor'
import { findNode } from '@/core/tree'

interface ContextMenuProps {
  x: number
  y: number
  nodeId: NodeId
  onClose: () => void
}

export function ContextMenu({ x, y, nodeId, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  const clipboard = useEditorStore((s) => s.clipboard)
  const copyNode = useEditorStore((s) => s.copyNode)
  const cutNode = useEditorStore((s) => s.cutNode)
  const pasteNode = useEditorStore((s) => s.pasteNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const removeNode = useEditorStore((s) => s.removeNode)
  const wrapInLayout = useEditorStore((s) => s.wrapInLayout)
  const ungroupNode = useEditorStore((s) => s.ungroupNode)

  // Determine if the target node is a Layout (for Ungroup)
  const state = useEditorStore.getState()
  const screen = state.project.screens.find((s) => s.id === state.activeScreenId) ?? state.project.screens[0]
  const targetNode = screen ? findNode(screen.root, nodeId) : undefined
  const isLayoutNode = targetNode?.kind === 'layout'
  const isRoot = isLayoutNode && screen ? (targetNode as any)?.id === screen.root.id : false

  // Select the node on open
  useEffect(() => {
    useEditorStore.getState().select(nodeId)
  }, [nodeId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid closing on the right-click that opened it
    const id = setTimeout(() => window.addEventListener('click', handler), 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('click', handler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-popover py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { copyNode(nodeId); onClose() }}
      >
        Copy
      </button>
      <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { cutNode(nodeId); onClose() }}
      >
        Cut
      </button>
      <button
        disabled={!clipboard}
        className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors ${
          clipboard
            ? 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
            : 'cursor-not-allowed text-muted-foreground/40'
        }`}
        onClick={() => { pasteNode(); onClose() }}
      >
        Paste
      </button>
      <div className="my-1 border-t border-border" />
      <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { duplicateNode(nodeId); onClose() }}
      >
        Duplicate
      </button>
      <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { removeNode(nodeId); onClose() }}
      >
        Delete
      </button>
      <div className="my-1 border-t border-border" />
      <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { wrapInLayout(nodeId); onClose() }}
      >
        Wrap in Layout
      </button>
      {isLayoutNode && !isRoot && (
        <button
        className="flex w-full items-center px-3 py-1.5 text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { ungroupNode(nodeId); onClose() }}
        >
          Ungroup
      </button>
      )}
    </div>
  )
}
