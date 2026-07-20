import type { DragData } from '@/core/dnd-strategy';
import { getComponentDef } from '@/core/registry';

interface DragOverlayContentProps {
  data: DragData | null;
}

export function DragOverlayContent({ data }: DragOverlayContentProps) {
  if (!data) return null;

  if (data.type === 'palette') {
    const def = getComponentDef(data.componentId);
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-sm">
        <span>◈</span>
        <span>{def?.namedExport ?? data.componentId}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-600 shadow-sm backdrop-blur-sm">
      <span>↕</span>
      <span>Move</span>
    </div>
  );
}
