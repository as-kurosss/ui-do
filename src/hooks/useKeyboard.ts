import { useEffect } from 'react'
import { useEditorStore } from '@/store/editor'

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { selectedId, removeNode, select, copyNode, cutNode, pasteNode, duplicateNode, wrapInLayout } = useEditorStore.getState()
      const target = e.target as HTMLElement
      // Don't trigger shortcuts when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useEditorStore.temporal.getState().undo()
        return
      }

      // Ctrl+Y / Ctrl+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        useEditorStore.temporal.getState().redo()
        return
      }

      // Ctrl+X — cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        if (selectedId) cutNode(selectedId)
        return
      }

      // Ctrl+C — copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        if (selectedId) copyNode(selectedId)
        return
      }

      // Ctrl+V — paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        pasteNode()
        return
      }

      // Ctrl+G — wrap in layout (group)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        if (selectedId) wrapInLayout(selectedId)
        return
      }

      // Ctrl+D — duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedId) {
          duplicateNode(selectedId)
        }
        return
      }

      // Delete / Backspace — remove selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault()
          removeNode(selectedId)
        }
        return
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        select(null)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
