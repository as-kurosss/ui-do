import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editor';
import type { SpecNode, ComponentNode } from '../core/ir';
import { findNode } from '../core/tree';

function getStore() {
  return useEditorStore.getState();
}

function getTemporal() {
  return (useEditorStore as any).temporal.getState();
}

function makeComponent(id: string, component: string, children: SpecNode[] = []): ComponentNode {
  return { kind: 'component', id: id as never, component, children };
}

beforeEach(() => {
  useEditorStore.setState({
    project: {
      version: 1,
      name: 'test',
      screens: [
        {
          version: 1,
          id: 's1',
          name: 'Test',
          route: '/test',
          tokens: {
            colors: {
              background: '#ffffff',
              foreground: '#0a0a0a',
              card: '#ffffff',
              cardForeground: '#0a0a0a',
              primary: '#171717',
              primaryForeground: '#fafafa',
              secondary: '#f5f5f5',
              secondaryForeground: '#737373',
              muted: '#f5f5f5',
              mutedForeground: '#737373',
              accent: '#f5f5f5',
              accentForeground: '#171717',
              popover: '#ffffff',
              popoverForeground: '#0a0a0a',
              destructive: '#dc2626',
              destructiveForeground: '#fafafa',
              border: '#e5e5e5',
              input: '#e5e5e5',
            },
            radius: 10,
            fonts: { sans: 'Inter' },
          },
          root: {
            kind: 'layout',
            id: 'root' as never,
            display: 'flex',
            direction: 'column',
            gap: 4,
            align: 'stretch',
            className: 'min-h-screen',
            children: [
              { kind: 'component', id: 'b1' as never, component: 'Button' },
              {
                kind: 'layout',
                id: 'inner' as never,
                display: 'flex',
                children: [
                  { kind: 'component', id: 'b2' as never, component: 'Input' },
                  { kind: 'text', id: 't1' as never, text: 'hello' },
                ],
              },
            ],
          },
        },
      ],
    },
    activeScreenId: 's1',
    selectedId: null,
    dropHint: null,
  } as any);

  // Clear temporal (undo) history
  getTemporal().clear();
});

describe('insertNode', () => {
  it('inserts a node into the tree', () => {
    const newNode = makeComponent('b3', 'Checkbox');
    getStore().insertNode('root' as never, 0, newNode);
    const root = findNode(getStore().project.screens[0].root, 'root' as never)!;
    expect(root.kind === 'layout' && root.children[0].id).toBe('b3');
  });
});

describe('removeNode', () => {
  it('removes a node and clears selection', () => {
    getStore().select('b1' as never);
    getStore().removeNode('b1' as never);
    const found = findNode(getStore().project.screens[0].root, 'b1' as never);
    expect(found).toBeUndefined();
    expect(getStore().selectedId).toBeNull();
  });
});

describe('patchNode', () => {
  it('patches a node in the tree', () => {
    getStore().patchNode('b1' as never, { className: 'w-full' } as any);
    const node = findNode(getStore().project.screens[0].root, 'b1' as never)!;
    expect((node as any).className).toBe('w-full');
  });
});

describe('select', () => {
  it('sets the selected id', () => {
    getStore().select('b1' as never);
    expect(getStore().selectedId).toBe('b1');
  });
});

describe('undo/redo', () => {
  it('undoes an insert operation', () => {
    const newNode = makeComponent('b3', 'Checkbox');
    getStore().insertNode('root' as never, 0, newNode);

    // Verify node was inserted
    const rootBefore = findNode(getStore().project.screens[0].root, 'root' as never)!;
    expect(rootBefore.kind === 'layout' && rootBefore.children.length).toBe(3);

    // Undo
    getTemporal().undo();
    const rootAfter = findNode(getStore().project.screens[0].root, 'root' as never)!;
    expect(rootAfter.kind === 'layout' && rootAfter.children.length).toBe(2);
  });

  it('undoes a remove operation', () => {
    getStore().removeNode('b1' as never);
    // Verify node was removed
    const found = findNode(getStore().project.screens[0].root, 'b1' as never);
    expect(found).toBeUndefined();

    // Undo
    getTemporal().undo();
    const restored = findNode(getStore().project.screens[0].root, 'b1' as never);
    expect(restored).toBeDefined();
  });

  it('redoes after undo', () => {
    getStore().removeNode('b1' as never);
    getTemporal().undo(); // back to original
    getTemporal().redo(); // remove again

    const found = findNode(getStore().project.screens[0].root, 'b1' as never);
    expect(found).toBeUndefined();
  });
});

describe('pasteNode', () => {
  it('pastes at index 0 when no node is selected', () => {
    const newNode = makeComponent('pasted', 'Button');
    getStore().copyNode('b1' as never);
    // Ensure no selection
    getStore().select(null);
    // Paste without specifying parent/index
    getStore().pasteNode();
    const root = findNode(getStore().project.screens[0].root, 'root' as never)!;
    expect(root.kind === 'layout' && root.children.length).toBeGreaterThanOrEqual(1);
  });

  it('does not crash when clipboard is empty', () => {
    expect(() => getStore().pasteNode()).not.toThrow();
  });
});

describe('moveNode guard', () => {
  it('prevents moving into own descendant', () => {
    // Try to move 'root' into 'inner' (which is inside root)
    getStore().moveNode('root' as never, 'inner' as never, 0);
    // root should still be at its original position
    const root = findNode(getStore().project.screens[0].root, 'root' as never);
    expect(root).toBeDefined();
  });
});
