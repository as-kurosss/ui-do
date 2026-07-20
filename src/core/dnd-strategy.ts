import { closestCenter } from '@dnd-kit/core';
import type { Collision, CollisionDetection } from '@dnd-kit/core';
import type { DropHint } from '@/store/editor';
import { canContain } from './registry';

type CollisionDetectionArgs = Parameters<CollisionDetection>[0];

/**
 * Данные, которые передаются с draggable-элементом.
 */
export interface PaletteDragData {
  type: 'palette';
  componentId: string;
}

export interface MoveDragData {
  type: 'move';
  nodeId: string;
  componentId?: string;
}

export type DragData = PaletteDragData | MoveDragData;

/**
 * Извлекает componentId из drag data.
 */
function getComponentId(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const type = data.type;
  if (type === 'palette') return (data.componentId as string) ?? null;
  if (type === 'move') return (data.componentId as string) ?? null;
  return null;
}

/**
 * Кастомная collision detection для древовидного редактора.
 *
 * Алгоритм:
 * 1. `pointerWithin` — находим все droppable под указателем.
 * 2. Фильтруем по `canContain` (проверка вложенности).
 * 3. Среди валидных выбираем deepest container (самый глубокий в DOM).
 * 4. Если ничего не найдено — fallback на `closestCenter`.
 */
export function treeStrategy(args: CollisionDetectionArgs): Collision[] {
  const { droppableContainers, pointerCoordinates } = args;
  if (!pointerCoordinates || droppableContainers.length === 0) return [];

  const activeData = args.active.data.current as Record<string, unknown> | undefined;
  const componentId = getComponentId(activeData);

  // Шаг 1: pointerWithin — находим droppable под указателем
  const contsUnderPointer = droppableContainers.filter((cont: any) => {
    const rect = args.droppableRects.get(cont.id);
    if (!rect) return false;
    return (
      pointerCoordinates.x >= rect.left &&
      pointerCoordinates.x <= rect.right &&
      pointerCoordinates.y >= rect.top &&
      pointerCoordinates.y <= rect.bottom
    );
  });

  // Шаг 2: фильтруем по canContain
  const validConts = contsUnderPointer.filter((cont: any) => {
    const id = String(cont.id);
    const parentId = id.replace(/^node:/, '');
    // Если это layout (не компонент), он принимает всё
    // Для компонентов проверяем canContain
    return canContain(parentId, componentId);
  });

  if (validConts.length > 0) {
    // Шаг 3: deepest container — тот, что вложен глубже (меньше площадь = глубже)
    // или последний добавленный (по ID в DOM порядке)
    const deepest = validConts.reduce((a: any, b: any) => {
      const rectA = args.droppableRects.get(a.id);
      const rectB = args.droppableRects.get(b.id);
      if (!rectA) return b;
      if (!rectB) return a;
      return rectA.width * rectA.height < rectB.width * rectB.height ? a : b;
    });
    return [{ id: deepest.id, data: { containerId: String(deepest.id) } }];
  }

  // Fallback: closestCenter
  return closestCenter(args);
}

/**
 * Вычисляет insert index внутри контейнера на основе позиции указателя.
 * Rects and direction are passed from outside to avoid DOM queries.
 */
export function computeDropHint(
  containerId: string,
  pointerX: number,
  pointerY: number,
  containerRect: DOMRect,
  childRects: { id: string; rect: DOMRect }[],
  direction: 'row' | 'column',
): DropHint | null {
  const isRow = direction === 'row';

  if (childRects.length === 0) {
    const insideX = pointerX >= containerRect.left && pointerX <= containerRect.right;
    const insideY = pointerY >= containerRect.top && pointerY <= containerRect.bottom;
    if (insideX && insideY) {
      return { parentId: containerId, index: 0, edge: 'inside' };
    }
    return null;
  }

  // Find closest child along the primary axis
  let bestIndex = childRects.length;
  let bestEdge: 'top' | 'bottom' = 'bottom';

  for (let i = 0; i < childRects.length; i++) {
    const childRect = childRects[i].rect;
    const childMid = isRow
      ? childRect.left + childRect.width / 2
      : childRect.top + childRect.height / 2;
    const pointerPos = isRow ? pointerX : pointerY;

    if (pointerPos < childMid) {
      bestIndex = i;
      bestEdge = 'top';
      break;
    }
    const childEnd = isRow ? childRect.right : childRect.bottom;
    if (pointerPos <= childEnd) {
      bestIndex = i;
      bestEdge = 'bottom';
      break;
    }
    bestIndex = i + 1;
    bestEdge = 'bottom';
  }

  // Verify pointer is inside container
  const insideContainer =
    pointerX >= containerRect.left &&
    pointerX <= containerRect.right &&
    pointerY >= containerRect.top &&
    pointerY <= containerRect.bottom;

  if (!insideContainer) return null;

  return { parentId: containerId, index: bestIndex, edge: bestEdge };
}
