import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { NodeId, SpecNode, ProjectSpec, ScreenSpec, TokenSet } from '../core/ir';
import {
  insertNode as treeInsert,
  removeNode as treeRemove,
  moveNode as treeMove,
  mapNode,
  createDefaultRoot,
  findParent,
  findNode,
  wrapNode as treeWrap,
  ungroupChildren as treeUngroup,
} from '../core/tree';

// ── Persistence ──

const STORAGE_KEY = 'bn-builder-project';

function saveToDisk(project: ProjectSpec): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    /* storage full or unavailable */
  }
}

function loadFromDisk(): ProjectSpec | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'screens' in parsed) {
      return parsed as ProjectSpec;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Drop hint (transient, excluded from undo) ──

export interface DropHint {
  parentId: NodeId;
  index: number;
  edge: 'top' | 'bottom' | 'inside';
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ── Helpers ──

function generateId(): NodeId {
  return `n${nanoid(8)}` as NodeId;
}

function patchNodeInTree(root: SpecNode, id: NodeId, patch: Partial<SpecNode>): SpecNode {
  return mapNode(root, id, (node) => ({ ...node, ...patch }) as SpecNode);
}

// ── State ──

export interface EditorState {
  project: ProjectSpec;
  activeScreenId: string;
  selectedId: NodeId | null;
  dropHint: DropHint | null;
  clipboard: SpecNode | null;

  insertNode: (parentId: NodeId, index: number, node: SpecNode) => void;
  moveNode: (nodeId: NodeId, toParentId: NodeId, toIndex: number) => void;
  removeNode: (nodeId: NodeId) => void;
  duplicateNode: (nodeId: NodeId) => void;
  patchNode: (nodeId: NodeId, patch: Partial<SpecNode>) => void;
  setTokens: (screenId: string, patch: DeepPartial<TokenSet>) => void;
  select: (id: NodeId | null) => void;
  setDropHint: (h: DropHint | null) => void;
  copyNode: (nodeId: NodeId) => void;
  cutNode: (nodeId: NodeId) => void;
  pasteNode: (parentId?: NodeId, index?: number) => void;
  wrapInLayout: (nodeId: NodeId) => void;
  ungroupNode: (nodeId: NodeId) => void;
  addScreen: (name: string, route: string) => void;
  removeScreen: (id: string) => void;
  renameScreen: (id: string, name: string) => void;
  setActiveScreen: (id: string) => void;
  newProject: (name: string) => void;
  importProject: (project: ProjectSpec) => void;
  setProjectName: (name: string) => void;
}

function createFreshProject(name: string): ProjectSpec {
  const screenId = generateId();
  const rootId = generateId();
  return {
    version: 1,
    name,
    screens: [
      {
        version: 1,
        id: screenId,
        name: 'Home',
        route: '/',
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
          fonts: { sans: 'Inter', display: 'Unbounded' },
        },
        root: createDefaultRoot(rootId),
      },
    ],
  };
}

function createDefaultProject(name: string): ProjectSpec {
  const stored = loadFromDisk();
  if (stored) return stored;
  return createFreshProject(name);
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      project: createDefaultProject('Untitled'),
      activeScreenId: '',
      selectedId: null,
      dropHint: null,
      clipboard: null,

      insertNode: (parentId, index, node) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = treeInsert(screen.root, parentId, index, node);
          return updateScreenRoot(state, newRoot);
        });
      },

      moveNode: (nodeId, toParentId, toIndex) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = treeMove(screen.root, nodeId, toParentId, toIndex);
          if (newRoot === null) return state; // недопустимый перенос
          return updateScreenRoot(state, newRoot);
        });
      },

      removeNode: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = treeRemove(screen.root, nodeId);
          if (newRoot === null) return state; // root удалять нельзя
          return {
            ...updateScreenRoot(state, newRoot),
            selectedId: state.selectedId === nodeId ? null : state.selectedId,
          };
        });
      },

      duplicateNode: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const parentInfo = findParent(screen.root, nodeId);
          if (!parentInfo) return state; // корень нельзя дублировать
          const node = findNode(screen.root, nodeId);
          if (!node) return state;

          // Deep clone with new ID
          const clone: SpecNode = JSON.parse(JSON.stringify(node));
          assignNewIds(clone);

          const newRoot = treeInsert(
            screen.root,
            parentInfo.parent.id,
            parentInfo.index + 1,
            clone,
          );
          return updateScreenRoot(state, newRoot);
        });
      },

      patchNode: (nodeId, patch) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = patchNodeInTree(screen.root, nodeId, patch);
          return updateScreenRoot(state, newRoot);
        });
      },

      setTokens: (screenId, patch) => {
        set((state) => {
          const screen = state.project.screens.find((s) => s.id === screenId);
          if (!screen) return state;
          const newTokens = deepMergeTokens(screen.tokens, patch);
          return {
            project: {
              ...state.project,
              screens: state.project.screens.map((s) =>
                s.id === screenId ? { ...s, tokens: newTokens } : s,
              ),
            },
          };
        });
      },

      copyNode: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const node = findNode(screen.root, nodeId);
          if (!node) return state;
          // Deep clone for clipboard isolation
          return { clipboard: JSON.parse(JSON.stringify(node)) as SpecNode };
        });
      },

      cutNode: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const node = findNode(screen.root, nodeId);
          if (!node) return state;
          const parentInfo = findParent(screen.root, nodeId);
          if (!parentInfo) return state; // root can't be cut
          const newRoot = treeRemove(screen.root, nodeId);
          if (newRoot === null) return state;
          return {
            ...updateScreenRoot(state, newRoot),
            clipboard: JSON.parse(JSON.stringify(node)) as SpecNode,
            selectedId: null,
          };
        });
      },

      pasteNode: (parentId, index) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen || !state.clipboard) return state;
          const clone: SpecNode = JSON.parse(JSON.stringify(state.clipboard));
          assignNewIds(clone);
          const targetParent = parentId ?? screen.root.id;
          const targetIndex =
            index ??
            (() => {
              if (!state.selectedId) return 0;
              const parentInfo = findParent(screen.root, state.selectedId);
              return parentInfo ? parentInfo.index + 1 : 0;
            })();
          const newRoot = treeInsert(screen.root, targetParent, targetIndex, clone);
          return updateScreenRoot(state, newRoot);
        });
      },

      wrapInLayout: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = treeWrap(screen.root, nodeId, generateId);
          if (newRoot === null) return state;
          return updateScreenRoot(state, newRoot);
        });
      },

      ungroupNode: (nodeId) => {
        set((state) => {
          const screen = findActiveScreen(state);
          if (!screen) return state;
          const newRoot = treeUngroup(screen.root, nodeId);
          if (newRoot === null) return state;
          return {
            ...updateScreenRoot(state, newRoot),
            selectedId: state.selectedId === nodeId ? null : state.selectedId,
          };
        });
      },

      select: (id) => set({ selectedId: id }),

      setDropHint: (h) => set({ dropHint: h }),

      addScreen: (name, route) => {
        const rootId = generateId();
        const newScreen: ScreenSpec = {
          version: 1,
          id: generateId(),
          name,
          route,
          tokens: get().project.screens[0]?.tokens ?? {
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
          root: createDefaultRoot(rootId),
        };
        set((state) => ({
          project: {
            ...state.project,
            screens: [...state.project.screens, newScreen],
          },
          activeScreenId: newScreen.id,
        }));
      },

      removeScreen: (id) => {
        set((state) => {
          if (state.project.screens.length <= 1) return state; // нельзя удалить последний экран
          const filtered = state.project.screens.filter((s) => s.id !== id);
          const newActive =
            state.activeScreenId === id ? (filtered[0]?.id ?? '') : state.activeScreenId;
          return {
            project: { ...state.project, screens: filtered },
            activeScreenId: newActive,
            selectedId: null,
          };
        });
      },

      renameScreen: (id, name) => {
        set((state) => ({
          project: {
            ...state.project,
            screens: state.project.screens.map((s) => (s.id === id ? { ...s, name } : s)),
          },
        }));
      },

      setActiveScreen: (id) => set({ activeScreenId: id, selectedId: null }),

      newProject: (name) => {
        const fresh = createFreshProject(name);
        set({
          project: fresh,
          activeScreenId: fresh.screens[0]?.id ?? '',
          selectedId: null,
          dropHint: null,
        });
        saveToDisk(fresh);
      },

      importProject: (project) => {
        set({
          project,
          activeScreenId: project.screens[0]?.id ?? '',
          selectedId: null,
          dropHint: null,
        });
        saveToDisk(project);
      },

      setProjectName: (name) => {
        set((state) => ({
          project: { ...state.project, name },
        }));
      },
    }),
    {
      limit: 100,
    partialize: (state: EditorState): Omit<EditorState, 'dropHint' | 'clipboard'> => {
        const { dropHint: _dropHint, clipboard: _clipboard, ...rest } = state;
        return rest;
      },
      equality: (prev, next) => {
        if (prev.selectedId !== next.selectedId) return false;
        if (prev.activeScreenId !== next.activeScreenId) return false;
        if (prev.project !== next.project) return false;
        return true;
      },
    },
  ),
);

// Auto-save project to localStorage on every change
useEditorStore.subscribe((state, prevState) => {
  if (state.project !== prevState.project) {
    saveToDisk(state.project);
  }
});

// ── Helpers ──

function findActiveScreen(state: EditorState): ScreenSpec | undefined {
  const id = state.activeScreenId || state.project.screens[0]?.id || '';
  return state.project.screens.find((s) => s.id === id);
}

function updateScreenRoot(state: EditorState, newRoot: SpecNode): EditorState {
  // Root must always be a LayoutNode by IR contract
  if (newRoot.kind !== 'layout') {
    throw new Error('Root node must be a LayoutNode');
  }
  return {
    ...state,
    project: {
      ...state.project,
      screens: state.project.screens.map((s) =>
        s.id === (state.activeScreenId || state.project.screens[0]?.id)
          ? { ...s, root: newRoot }
          : s,
      ),
    },
  };
}

/** Рекурсивно присваивает новые ID узлу и всем его потомкам. */
function assignNewIds(node: SpecNode): void {
  node.id = generateId();
  const children =
    node.kind === 'layout' ? node.children : node.kind === 'component' ? (node.children ?? []) : [];
  for (const child of children) assignNewIds(child);
}

function deepMergeTokens(base: TokenSet, patch: DeepPartial<TokenSet>): TokenSet {
  return {
    ...base,
    ...patch,
    colors: { ...base.colors, ...patch.colors },
    fonts: { ...base.fonts, ...patch.fonts },
    radius: patch.radius ?? base.radius,
  };
}
