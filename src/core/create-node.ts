import { nanoid } from 'nanoid';
import type { NodeId, SpecNode } from './ir';
import { getComponentDef } from './registry';

function newId(): NodeId {
  return `n${nanoid(8)}` as NodeId;
}

/** Recursively assigns unique IDs to a node and all its children. */
function assignIds(node: SpecNode): SpecNode {
  const id = newId();
  if (node.kind === 'layout') {
    return { ...node, id, children: node.children.map(assignIds) };
  }
  if (node.kind === 'component' && node.children) {
    return { ...node, id, children: node.children.map(assignIds) };
  }
  return { ...node, id };
}

/**
 * Creates a full component node from the registry with real IDs.
 * Throws if the component ID is unknown.
 */
export function createNode(componentId: string): SpecNode {
  const def = getComponentDef(componentId);
  if (!def) throw new Error(`Unknown component ${componentId}`);

  const rawChildren = def.defaults.children?.();

  const base: SpecNode = {
    kind: 'component',
    id: newId(),
    component: componentId,
    variants: def.defaults.variants ? { ...def.defaults.variants } : undefined,
    props: def.defaults.props as Record<string, string | number | boolean> | undefined,
    className: def.defaults.className,
    children: rawChildren ? rawChildren.map(assignIds) : undefined,
  };

  return base;
}
