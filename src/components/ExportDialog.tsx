import { useState } from 'react'
import { useEditorStore } from '@/store/editor'
import { generateScreen } from '@/codegen/generate'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { project, activeScreenId } = useEditorStore()
  const screen = project.screens.find((s) => s.id === activeScreenId)
    ?? project.screens[0]
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const { tsx: code } = screen ? generateScreen(screen) : { tsx: '' }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[700px] max-h-[80vh] flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 className="text-sm font-semibold">
            Export — {screen?.name ?? 'Screen'}
          </h2>
          <button
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Code area */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="rounded-md border border-border bg-muted/30 p-4 text-xs leading-relaxed overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
          <button
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              copied
                ? 'bg-green-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button
            className="rounded px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
