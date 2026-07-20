import { useEditorStore } from '@/store/editor';

/**
 * Глобальные индикаторы позиции дропа.
 * Рендерит линию (top/bottom) или пунктирную рамку (inside).
 */
export function DropIndicators() {
  const dropHint = useEditorStore((s) => s.dropHint);
  if (!dropHint) return null;

  const el = document.querySelector(`[data-bn-id="${dropHint.parentId}"]`);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const isRow =
    style.display === 'flex' &&
    (style.flexDirection === 'row' || style.flexDirection === 'row-reverse');

  if (dropHint.edge === 'inside') {
    return (
      <div
        className="pointer-events-none fixed z-50"
        style={{
          top: rect.top + 2,
          left: rect.left + 2,
          width: rect.width - 4,
          height: rect.height - 4,
          border: '2px dashed #3b82f6',
          borderRadius: style.borderRadius || '4px',
        }}
      />
    );
  }

  // top / bottom — линия между детьми
  const children = Array.from(el.children).filter((child) => child.getAttribute('data-bn-id'));
  let lineTop: number;
  let lineLeft: number;
  let lineWidth: number;
  let lineHeight: number;

  if (dropHint.index >= children.length) {
    // После последнего ребёнка
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      const lastRect = lastChild.getBoundingClientRect();
      if (isRow) {
        lineTop = rect.top;
        lineLeft = lastRect.right;
        lineWidth = 2;
        lineHeight = rect.height;
      } else {
        lineTop = lastRect.bottom;
        lineLeft = rect.left;
        lineWidth = rect.width;
        lineHeight = 2;
      }
    } else {
      // Пустой контейнер — у левого/верхнего края
      lineTop = rect.top;
      lineLeft = rect.left;
      lineWidth = 2;
      lineHeight = rect.height;
    }
  } else {
    // Перед ребёнком на позиции index
    const child = children[dropHint.index];
    const childRect = child.getBoundingClientRect();
    if (isRow) {
      lineTop = rect.top;
      lineLeft = childRect.left;
      lineWidth = 2;
      lineHeight = rect.height;
    } else {
      lineTop = childRect.top;
      lineLeft = rect.left;
      lineWidth = rect.width;
      lineHeight = 2;
    }
  }

  return (
    <div
      className="pointer-events-none fixed z-50 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"
      style={{
        top: lineTop,
        left: lineLeft,
        width: lineWidth,
        height: lineHeight,
      }}
    />
  );
}
