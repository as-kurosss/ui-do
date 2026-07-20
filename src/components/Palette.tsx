import { useDraggable } from '@dnd-kit/core'
import type { PaletteDragData } from '@/core/dnd-strategy'
import { REGISTRY } from '@/core/registry'

// Группировка компонентов по категориям
const CATEGORIES: Record<string, string[]> = {
  Form: ['Input', 'Textarea', 'Label', 'Checkbox', 'Switch', 'Select'],
  Buttons: ['Button'],
  Layout: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter', 'Separator'],
  Feedback: ['Badge', 'Alert', 'Progress'],
  Navigation: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
  Media: ['Avatar'],
}

export function Palette() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Components
      </h2>
      {Object.entries(CATEGORIES).map(([category, ids]) => (
        <div key={category} className="flex flex-col gap-1">
          <h3 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            {category}
          </h3>
          <div className="flex flex-wrap gap-1">
            {ids.map((id) => {
              const def = REGISTRY.find((d) => d.id === id)
              if (!def) return null
              return <PaletteItem key={id} componentId={id} label={def.namedExport} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaletteItem({ componentId, label }: { componentId: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${componentId}`,
    data: { type: 'palette', componentId } satisfies PaletteDragData,
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
        isDragging
          ? 'border-primary/30 bg-primary/10 text-primary opacity-50'
          : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
      }`}
    >
      <span className="text-blue-500">◈</span>
      {label}
    </button>
  )
}
