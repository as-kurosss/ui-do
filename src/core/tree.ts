import { nanoid } from 'nanoid';
import type { SpecNode, NodeId, LayoutNode } from './ir';
import { getComponentDef } from './registry';

/**
 * Иммутабельно обходит дерево, находит узел по id и применяет fn.
 * Если fn возвращает тот же объект — поддерево не пересоздаётся.
 */
export function mapNode(root: SpecNode, id: NodeId, fn: (node: SpecNode) => SpecNode): SpecNode {
  if (root.id === id) return fn(root);

  if (root.kind === 'layout') {
    const children = root.children.map((child) => mapNode(child, id, fn));
    // Проверяем ссылочно — если ни один ребёнок не изменился, возвращаем root как есть
    if (children.every((child, i) => child === root.children[i])) return root;
    return { ...root, children };
  }

  if (root.kind === 'component' && root.children) {
    const children = root.children.map((child) => mapNode(child, id, fn));
    if (children.every((child, i) => child === root.children![i])) return root;
    return { ...root, children };
  }

  return root;
}

/**
 * Иммутабельно вставляет узел в дерево.
 */
export function insertNode(
  root: SpecNode,
  parentId: NodeId,
  index: number,
  node: SpecNode,
): SpecNode {
  return mapNode(root, parentId, (parent) => {
    if (parent.kind === 'layout') {
      const children = [...parent.children];
      children.splice(index, 0, node);
      return { ...parent, children };
    }
    if (parent.kind === 'component') {
      const children = parent.children ? [...parent.children] : [];
      children.splice(index, 0, node);
      return { ...parent, children };
    }
    return parent;
  });
}

/**
 * Иммутабельно удаляет узел из дерева.
 * Возвращает null если дерево оказалось пустым (root удалён).
 */
export function removeNode(root: SpecNode, id: NodeId): SpecNode | null {
  // Если это сам root — возвращаем null
  if (root.id === id) return null;

  if (root.kind === 'layout') {
    const children: SpecNode[] = [];
    let changed = false;
    for (const child of root.children) {
      if (child.id === id) {
        changed = true;
        continue;
      }
      const result = removeNode(child, id);
      if (result === null) {
        changed = true;
        continue;
      }
      children.push(result);
    }
    if (!changed) return root;
    return { ...root, children };
  }

  if (root.kind === 'component' && root.children) {
    const children: SpecNode[] = [];
    let changed = false;
    for (const child of root.children) {
      if (child.id === id) {
        changed = true;
        continue;
      }
      const result = removeNode(child, id);
      if (result === null) {
        changed = true;
        continue;
      }
      children.push(result);
    }
    if (!changed) return root;
    return { ...root, children };
  }

  return root;
}

/**
 * Иммутабельно перемещает узел из одной позиции в другую.
 * Возвращает null если операция недопустима (перенос в собственного потомка).
 */
export function moveNode(
  root: SpecNode,
  nodeId: NodeId,
  toParentId: NodeId,
  toIndex: number,
): SpecNode | null {
  // Нельзя переместить узел в самого себя
  if (nodeId === toParentId) return null;
  // Проверка: является ли toParentId потомком nodeId?
  if (isDescendantOf(root, toParentId, nodeId)) return null;

  // 1. Извлекаем узел
  let extracted: SpecNode | null = null;
  const afterRemove = mapNode(root, nodeId, (node) => {
    extracted = node;
    return node; // временно оставляем, removeNode обработает
  });
  const cleaned = removeNode(afterRemove, nodeId);
  if (cleaned === null || extracted === null) return null;

  // 2. Вставляем в новое место
  return insertNode(cleaned, toParentId, toIndex, extracted);
}

/**
 * Проверяет, является ли `targetId` потомком узла с id = `ancestorId`.
 */
function isDescendantOf(root: SpecNode, targetId: NodeId, ancestorId: NodeId): boolean {
  const ancestor = findNode(root, ancestorId);
  if (!ancestor) return false;
  // Рекурсивно проверяем, есть ли targetId в поддереве ancestor
  const search = (node: SpecNode): boolean => {
    const children =
      node.kind === 'layout'
        ? node.children
        : node.kind === 'component'
          ? (node.children ?? [])
          : [];
    return children.some((child) => child.id === targetId || search(child));
  };
  return search(ancestor);
}

/**
 * Собирает всех потомков layout-ноды для проверки isDescendantOf
 * (без рекурсивного обхода — используется в moveNode guard).
 */
export function findNode(root: SpecNode, id: NodeId): SpecNode | undefined {
  if (root.id === id) return root;
  const children =
    root.kind === 'layout' ? root.children : root.kind === 'component' ? (root.children ?? []) : [];
  for (const child of children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Находит родителя узла по id потомка.
 * Возвращает { parent, index } или undefined, если узел не найден или является корнем.
 */
function childrenOf(node: SpecNode): SpecNode[] {
  if (node.kind === 'layout') return node.children;
  if (node.kind === 'component') return node.children ?? [];
  return [];
}

export function findParent(
  root: SpecNode,
  childId: NodeId,
): { parent: SpecNode; index: number } | undefined {
  if (root.id === childId) return undefined;

  const children = childrenOf(root);
  const idx = children.findIndex((c) => c.id === childId);
  if (idx !== -1) return { parent: root, index: idx };

  for (const child of children) {
    const found = findParent(child, childId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Обёртывает узел `nodeId` в новый Layout-контейнер.
 * Возвращает новое дерево или null, если узел не найден или является корнем.
 */
export function wrapNode(root: SpecNode, nodeId: NodeId): SpecNode | null {
  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return null;

  const node = findNode(root, nodeId);
  if (!node) return null;

  const wrapperId = `n${nanoid(8)}` as NodeId;
  const wrapper: LayoutNode = {
    kind: 'layout',
    id: wrapperId,
    display: 'flex',
    direction: 'column',
    gap: 4,
    children: [node],
  };

  return mapNode(root, parentInfo.parent.id, (parent) => {
    if (parent.kind === 'layout') {
      const children = [...parent.children];
      children[parentInfo.index] = wrapper;
      return { ...parent, children };
    }
    if (parent.kind === 'component') {
      const children = parent.children ? [...parent.children] : [];
      children[parentInfo.index] = wrapper;
      return { ...parent, children };
    }
    return parent;
  });
}

/**
 * Разгруппировывает Layout-узел: удаляет его и продвигает всех детей на его место.
 * Возвращает новое дерево или null, если узел не Layout или является корнем.
 */
export function ungroupChildren(root: SpecNode, nodeId: NodeId): SpecNode | null {
  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return null;

  const node = findNode(root, nodeId);
  if (!node || node.kind !== 'layout') return null;

  const children = node.children;

  // Удаляем Layout-контейнер
  const afterRemove = removeNode(root, nodeId);
  if (afterRemove === null) return null;

  // Вставляем всех детей на место контейнера (в обратном порядке для сохранения порядка)
  let result = afterRemove;
  for (let i = children.length - 1; i >= 0; i--) {
    result = insertNode(result, parentInfo.parent.id, parentInfo.index, children[i]);
  }

  return result;
}

/**
 * Создаёт узел компонента из реестра, присваивая real ID всем потомкам.
 * Заменяет пустые ID-плейсхолдеры из defaults.children на настоящие nanoid.
 */
export function createNode(componentId: string): SpecNode {
  const def = getComponentDef(componentId);
  const id = `n${nanoid(8)}` as NodeId;

  const rawChildren = def?.defaults.children?.();

  function assignIds(node: SpecNode): SpecNode {
    const newNode = { ...node, id: `n${nanoid(8)}` as NodeId };
    if (newNode.kind === 'component' && newNode.children) {
      return { ...newNode, children: newNode.children.map(assignIds) };
    }
    if (newNode.kind === 'layout' && newNode.children.length > 0) {
      return { ...newNode, children: newNode.children.map(assignIds) };
    }
    return newNode;
  }

  const node: SpecNode = {
    kind: 'component' as const,
    id,
    component: componentId,
    variants: def?.defaults.variants,
    props: def?.defaults.props as Record<string, string | number | boolean> | undefined,
    children: rawChildren ? rawChildren.map(assignIds) : undefined,
  };

  return node;
}

/**
 * layout-корень экрана. Создаёт дефолтный корень.
 */
export function createDefaultRoot(id: NodeId): LayoutNode {
  return {
    kind: 'layout',
    id,
    display: 'flex',
    direction: 'column',
    gap: 4,
    align: 'stretch',
    className: 'min-h-screen',
    children: [],
  };
}
