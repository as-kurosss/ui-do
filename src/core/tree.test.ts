import { describe, it, expect } from 'vitest';
import type { SpecNode, LayoutNode, ComponentNode, TextNode } from './ir';
import {
  mapNode,
  insertNode,
  removeNode,
  moveNode,
  findNode,
  createDefaultRoot,
  wrapNode,
  ungroupChildren,
  createNode,
} from './tree';

function makeLayout(id: string, children: SpecNode[] = []): LayoutNode {
  return { kind: 'layout', id: id as never, display: 'flex', children };
}

function makeComponent(id: string, component: string, children: SpecNode[] = []): ComponentNode {
  return { kind: 'component', id: id as never, component, children };
}

function makeText(id: string, text: string): TextNode {
  return { kind: 'text', id: id as never, text };
}

const btn = makeComponent('b1', 'Button');
const input = makeComponent('b2', 'Input');
const text = makeText('t1', 'hello');

const root: LayoutNode = makeLayout('root', [btn, makeLayout('inner', [input, text])]);

describe('mapNode', () => {
  it('traverses and patches a node by id', () => {
    const result = mapNode(root, 'b1', (n) => ({ ...n, component: 'Badge' }));
    const found = findNode(result, 'b1');
    expect(found?.kind === 'component' && found.component).toBe('Badge');
  });

  it('returns same object when no changes', () => {
    const result = mapNode(root, 'nonexistent', (n) => n);
    expect(result).toBe(root);
  });
});

describe('insertNode', () => {
  it('inserts a node at the given index in a layout', () => {
    const newNode = makeComponent('b3', 'Checkbox');
    const result = insertNode(root, 'root', 1, newNode);
    const node = findNode(result, 'root') as LayoutNode;
    expect(node.children).toHaveLength(3);
    expect(node.children[1].id).toBe('b3');
  });

  it('inserts a node at index 0', () => {
    const newNode = makeComponent('b3', 'Checkbox');
    const result = insertNode(root, 'root', 0, newNode);
    const node = findNode(result, 'root') as LayoutNode;
    expect(node.children[0].id).toBe('b3');
  });
});

describe('removeNode', () => {
  it('removes a leaf node', () => {
    const result = removeNode(root, 'b1');
    expect(result).not.toBeNull();
    const found = findNode(result!, 'b1');
    expect(found).toBeUndefined();
  });

  it('removes a node with children', () => {
    const result = removeNode(root, 'inner');
    expect(result).not.toBeNull();
    const found = findNode(result!, 'inner');
    expect(found).toBeUndefined();
  });

  it('returns null when removing root', () => {
    const result = removeNode(root, 'root');
    expect(result).toBeNull();
  });

  it('preserves other children after removal', () => {
    const result = removeNode(root, 'b1');
    expect(result).not.toBeNull();
    const node = findNode(result!, 'root') as LayoutNode;
    expect(node.children).toHaveLength(1);
    expect(node.children[0].id).toBe('inner');
  });
});

describe('moveNode', () => {
  it('moves a node to a new parent', () => {
    const result = moveNode(root, 'b1', 'inner', 0);
    expect(result).not.toBeNull();
    const rootNode = findNode(result!, 'root') as LayoutNode;
    expect(rootNode.children).toHaveLength(1); // inner is left
    const inner = findNode(result!, 'inner') as LayoutNode;
    expect(inner.children).toHaveLength(3); // input + text + btn
    expect(inner.children[0].id).toBe('b1');
  });

  it('returns null when moving into own descendant', () => {
    const result = moveNode(root, 'root', 'inner', 0);
    expect(result).toBeNull();
  });

  it('returns null when moving node to itself', () => {
    const result = moveNode(root, 'b1', 'b1', 0);
    expect(result).toBeNull();
  });
});

describe('findNode', () => {
  it('finds a deeply nested node', () => {
    const found = findNode(root, 't1');
    expect(found).toBeDefined();
    expect(found!.id).toBe('t1');
  });

  it('returns undefined for missing node', () => {
    const found = findNode(root, 'missing');
    expect(found).toBeUndefined();
  });
});

describe('createDefaultRoot', () => {
  it('creates a flex column layout', () => {
    const r = createDefaultRoot('r1');
    expect(r.kind).toBe('layout');
    expect(r.display).toBe('flex');
    expect(r.direction).toBe('column');
    expect(r.children).toEqual([]);
  });
});

describe('wrapNode', () => {
  it('wraps a leaf node in a Layout', () => {
    const result = wrapNode(root, 'b1');
    expect(result).not.toBeNull();
    const rootNode = findNode(result!, 'root') as LayoutNode;
    expect(rootNode.children).toHaveLength(2);
    const wrapper = rootNode.children[0];
    expect(wrapper.kind).toBe('layout');
    expect((wrapper as LayoutNode).children).toHaveLength(1);
    expect((wrapper as LayoutNode).children[0].id).toBe('b1');
  });

  it('wraps a nested node in a Layout', () => {
    const result = wrapNode(root, 't1');
    expect(result).not.toBeNull();
    const inner = findNode(result!, 'inner') as LayoutNode;
    expect(inner.children).toHaveLength(2);
    const wrapper = inner.children[1];
    expect(wrapper.kind).toBe('layout');
    expect((wrapper as LayoutNode).children).toHaveLength(1);
    expect((wrapper as LayoutNode).children[0].id).toBe('t1');
  });

  it('returns null for root node', () => {
    const result = wrapNode(root, 'root');
    expect(result).toBeNull();
  });

  it('wrapper ID is independent of parent/child IDs', () => {
    const result = wrapNode(root, 'b1');
    expect(result).not.toBeNull();
    const rootNode = findNode(result!, 'root') as LayoutNode;
    const wrapper = rootNode.children[0] as LayoutNode;
    expect(wrapper.id).not.toBe(root.id);
    expect(wrapper.id).not.toBe('b1');
    expect(wrapper.id).toMatch(/^n[0-9a-zA-Z_-]{8}$/);
  });
});

describe('createNode', () => {
  it('creates a Button node with valid nanoid (8 chars)', () => {
    const node = createNode('Button');
    expect(node.kind).toBe('component');
    expect((node as ComponentNode).component).toBe('Button');
    expect(node.id).toMatch(/^n[0-9a-zA-Z_-]{8}$/);
  });

  it('creates a Card node with children that all have valid IDs', () => {
    const node = createNode('Card') as ComponentNode;
    expect(node.component).toBe('Card');
    expect(node.children).toBeDefined();
    expect(node.children!.length).toBeGreaterThanOrEqual(2);
    for (const child of node.children!) {
      expect(child.id).toMatch(/^n[0-9a-zA-Z_-]{8}$/);
    }
  });

  it('creates a leaf node (Input) with no children', () => {
    const node = createNode('Input') as ComponentNode;
    expect(node.component).toBe('Input');
    expect(node.children).toBeUndefined();
  });

  it('each call generates unique IDs', () => {
    const a = createNode('Button');
    const b = createNode('Button');
    expect(a.id).not.toBe(b.id);
  });

  it('all IDs in a subtree are unique', () => {
    const card = createNode('Card') as ComponentNode;
    const allIds = new Set<string>();
    function walk(n: SpecNode) {
      expect(allIds.has(n.id)).toBe(false);
      allIds.add(n.id);
      const children =
        n.kind === 'layout' ? n.children : n.kind === 'component' ? (n.children ?? []) : [];
      children.forEach(walk);
    }
    walk(card);
    expect(allIds.size).toBeGreaterThan(1);
  });
});

describe('ungroupChildren', () => {
  it('ungroups a Layout, promoting its children', () => {
    const result = ungroupChildren(root, 'inner');
    expect(result).not.toBeNull();
    const rootNode = findNode(result!, 'root') as LayoutNode;
    expect(rootNode.children).toHaveLength(3); // b1, input, text
    expect(rootNode.children[0].id).toBe('b1');
    expect(rootNode.children[1].id).toBe('b2');
    expect(rootNode.children[2].id).toBe('t1');
    const inner = findNode(result!, 'inner');
    expect(inner).toBeUndefined();
  });

  it('returns null for non-Layout node', () => {
    const result = ungroupChildren(root, 'b1');
    expect(result).toBeNull();
  });

  it('returns null for root node', () => {
    const result = ungroupChildren(root, 'root');
    expect(result).toBeNull();
  });
});
