import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editor';

export function ScreenTabs() {
  const { project, activeScreenId, setActiveScreen, addScreen, removeScreen, renameScreen } =
    useEditorStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const screens = project.screens;

  const handleAdd = () => {
    const count = screens.length + 1;
    addScreen(`Screen ${count}`, `/${`screen-${count}`}`);
  };

  const handleDoubleClick = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) renameScreen(id, trimmed);
    setEditingId(null);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (screens.length <= 1) return;
    removeScreen(id);
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto max-w-[300px]">
      {screens.map((s) => (
        <div
          key={s.id}
          data-active={s.id === activeScreenId}
          className={cn(
            'group relative flex items-center gap-1 rounded-t px-2 py-1 text-xs cursor-pointer transition-colors',
            s.id === activeScreenId
              ? 'bg-background text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
          onClick={() => setActiveScreen(s.id)}
          onDoubleClick={() => handleDoubleClick(s.id, s.name)}
        >
          {editingId === s.id ? (
            <input
              className="h-4 w-20 bg-transparent border-b border-primary text-xs outline-none"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleRenameSubmit(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(s.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate max-w-20">{s.name}</span>
          )}

          {screens.length > 1 && (
            <button
              className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              onClick={(e) => handleRemove(e, s.id)}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <button
        className="flex h-5 w-5 items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={handleAdd}
        title="Add screen"
      >
        +
      </button>
    </div>
  );
}
