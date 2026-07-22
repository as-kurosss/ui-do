import type { SpecNode } from './ir';
import type { NodeId } from './ir';

// ── Types ──

export interface ComponentDef {
  id: string; // 'Button'
  module: string; // '@/components/ui/button'
  namedExport: string; // 'Button'
  isContainer: boolean;
  defaults: {
    variants?: Record<string, string>;
    props?: Record<string, unknown>;
    className?: string;
    children?: () => SpecNode[];
  };
  inspector: InspectorField[];
  events?: string[]; // ['onClick'] — разрешённые события
}

export type InspectorField =
  | { kind: 'select'; target: 'variant' | 'prop'; prop: string; label: string; options: string[] }
  | { kind: 'text'; target: 'prop' | 'text'; prop: string; label: string }
  | { kind: 'toggle'; target: 'prop'; prop: string; label: string }
  | { kind: 'spacing'; label: string }
  | { kind: 'width'; label: string; options: string[] };

// ── Family tags for nesting rules ──

type Family = 'card' | 'card-header' | 'tabs' | 'leaf' | 'container' | 'select' | 'select-content' | 'sidebar-provider' | 'sidebar' | 'sidebar-content' | 'sidebar-group' | 'sidebar-group-content' | 'sidebar-menu' | 'sidebar-menu-item' | 'sidebar-menu-button' | 'sidebar-menu-action' | 'sidebar-menu-sub' | 'sidebar-menu-sub-item' | 'sidebar-menu-sub-button';

const componentFamily: Record<string, Family> = {
  Button: 'leaf',
  Input: 'leaf',
  Label: 'leaf',
  Textarea: 'leaf',
  Checkbox: 'leaf',
  Switch: 'leaf',
  Select: 'select',
  SelectTrigger: 'leaf',
  SelectValue: 'leaf',
  SelectContent: 'select-content',
  SelectItem: 'leaf',
  Card: 'card',
  CardHeader: 'card-header',
  CardTitle: 'leaf',
  CardDescription: 'leaf',
  CardContent: 'container',
  CardFooter: 'container',
  Badge: 'leaf',
  Alert: 'container',
  Separator: 'leaf',
  Avatar: 'leaf',
  Progress: 'leaf',
  Tabs: 'tabs',
  TabsList: 'card-header', // shares card-header-like restrictions
  TabsTrigger: 'leaf',
  TabsContent: 'container',
  // Sidebar family
  SidebarProvider: 'sidebar-provider',
  Sidebar: 'sidebar',
  SidebarHeader: 'container',
  SidebarContent: 'sidebar-content',
  SidebarFooter: 'container',
  SidebarRail: 'leaf',
  SidebarInset: 'container',
  SidebarTrigger: 'leaf',
  SidebarSeparator: 'leaf',
  SidebarGroup: 'sidebar-group',
  SidebarGroupLabel: 'leaf',
  SidebarGroupContent: 'sidebar-group-content',
  SidebarMenu: 'sidebar-menu',
  SidebarMenuItem: 'sidebar-menu-item',
  SidebarMenuButton: 'sidebar-menu-button',
  SidebarMenuAction: 'leaf',
  SidebarMenuSub: 'sidebar-menu-sub',
  SidebarMenuSubItem: 'leaf',
  SidebarMenuSubButton: 'leaf',
  // Collapsible family
  Collapsible: 'container',
  CollapsibleTrigger: 'leaf',
  CollapsibleContent: 'container',
  // DropdownMenu family
  DropdownMenu: 'container',
  DropdownMenuTrigger: 'leaf',
  DropdownMenuContent: 'container',
  DropdownMenuItem: 'leaf',
  DropdownMenuSeparator: 'leaf',
  DropdownMenuLabel: 'leaf',
  DropdownMenuGroup: 'container',
  DropdownMenuShortcut: 'leaf',
};

const LEAF_FAMILIES: Family[] = ['leaf'];
const CARD_FAMILY: Family[] = ['card', 'card-header'];
const TABS_FAMILY: Family[] = ['tabs'];

/** Проверяет, может ли parent принять child в качестве потомка. */
export function canContain(parentId: string, childId: string | null): boolean {
  if (childId === null) return true; // новый компонент без детей — всегда ок

  const pf = componentFamily[parentId] ?? 'container';
  const cf = componentFamily[childId] ?? 'container';

  // Специфические правила для конкретных parent-компонентов

  // TabsList → только TabsTrigger (до семейных правил, т.к. TabsList = family card-header)
  if (parentId === 'TabsList') return childId === 'TabsTrigger';

  // Select → только SelectTrigger | SelectValue | SelectContent
  if (pf === 'select') return ['SelectTrigger', 'SelectValue', 'SelectContent'].includes(childId);

  // SelectContent → принимает всё, кроме карточной и таб-семей
  if (pf === 'select-content') {
    return !CARD_FAMILY.includes(cf) && !TABS_FAMILY.includes(cf);
  }

  // Card → только CardHeader | CardContent | CardFooter
  if (pf === 'card') return cf === 'card-header' || cf === 'container';

  // CardHeader → только CardTitle | CardDescription
  if (pf === 'card-header') {
    return ['CardTitle', 'CardDescription'].includes(childId);
  }

  // Tabs → только TabsList | TabsContent
  if (pf === 'tabs') {
    return ['TabsList', 'TabsContent'].includes(childId);
  }

  // SidebarProvider → только Sidebar | SidebarInset
  if (pf === 'sidebar-provider') {
    return ['Sidebar', 'SidebarInset'].includes(childId);
  }

  // Sidebar → только SidebarHeader | SidebarContent | SidebarFooter | SidebarRail | SidebarSeparator
  if (pf === 'sidebar') {
    return ['SidebarHeader', 'SidebarContent', 'SidebarFooter', 'SidebarRail', 'SidebarSeparator'].includes(childId);
  }

  // SidebarContent → только SidebarGroup
  if (pf === 'sidebar-content') {
    return childId === 'SidebarGroup';
  }

  // SidebarGroup → только SidebarGroupLabel | SidebarGroupContent
  if (pf === 'sidebar-group') {
    return ['SidebarGroupLabel', 'SidebarGroupContent'].includes(childId);
  }

  // SidebarGroupContent → только SidebarMenu
  if (pf === 'sidebar-group-content') {
    return childId === 'SidebarMenu';
  }

  // SidebarMenu → только SidebarMenuItem
  if (pf === 'sidebar-menu') {
    return childId === 'SidebarMenuItem';
  }

  // SidebarMenuItem → только SidebarMenuButton | SidebarMenuAction
  if (pf === 'sidebar-menu-item') {
    return ['SidebarMenuButton', 'SidebarMenuAction'].includes(childId);
  }

  // SidebarMenuButton → только текст/иконки (CodeNode/TextNode) или layout-заполнители
  if (pf === 'sidebar-menu-button') {
    return childId === null;
  }

  // SidebarMenuAction → только leaf (иконки)
  if (pf === 'sidebar-menu-action') {
    return childId === null;
  }

  // SidebarMenuSub → только SidebarMenuSubItem
  if (pf === 'sidebar-menu-sub') {
    return childId === 'SidebarMenuSubItem';
  }

  // SidebarMenuSubItem → только SidebarMenuSubButton
  if (pf === 'sidebar-menu-sub-item') {
    return childId === 'SidebarMenuSubButton';
  }

  // SidebarMenuSubButton → только текст/иконки
  if (pf === 'sidebar-menu-sub-button') {
    return childId === null;
  }

  // Leaf-компоненты не принимают детей
  if (LEAF_FAMILIES.includes(pf)) return false;

  // Card-, Tabs- и Select-семейства не могут быть помещены в произвольные контейнеры
  if (CARD_FAMILY.includes(cf) || TABS_FAMILY.includes(cf) || cf === 'select') return false;

  return true;
}

// ── Registry ──

export const REGISTRY: ComponentDef[] = [
  {
    id: 'Button',
    module: '@/components/ui/button',
    namedExport: 'Button',
    isContainer: true,
    defaults: {
      variants: { variant: 'default', size: 'default' },
      children: () => [
        { kind: 'text', id: '' as NodeId, text: 'Button' } as unknown as SpecNode,
      ],
    },
    inspector: [
      {
        kind: 'text',
        target: 'text',
        prop: 'text',
        label: 'Text',
      },
      {
        kind: 'select',
        target: 'variant',
        prop: 'variant',
        label: 'Variant',
        options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
      },
      {
        kind: 'select',
        target: 'variant',
        prop: 'size',
        label: 'Size',
        options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      },
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'disabled',
        label: 'Disabled',
      },
    ],
    events: ['onClick'],
  },
  {
    id: 'Input',
    module: '@/components/ui/input',
    namedExport: 'Input',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'placeholder',
        label: 'Placeholder',
      },
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'disabled',
        label: 'Disabled',
      },
    ],
    events: ['onChange', 'onFocus', 'onBlur'],
  },
  {
    id: 'Label',
    module: '@/components/ui/label',
    namedExport: 'Label',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'children',
        label: 'Text',
      },
    ],
  },
  {
    id: 'Textarea',
    module: '@/components/ui/textarea',
    namedExport: 'Textarea',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'placeholder',
        label: 'Placeholder',
      },
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'disabled',
        label: 'Disabled',
      },
    ],
    events: ['onChange', 'onFocus', 'onBlur'],
  },
  {
    id: 'Checkbox',
    module: '@/components/ui/checkbox',
    namedExport: 'Checkbox',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'checked',
        label: 'Checked',
      },
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'disabled',
        label: 'Disabled',
      },
    ],
    events: ['onCheckedChange'],
  },
  {
    id: 'Switch',
    module: '@/components/ui/switch',
    namedExport: 'Switch',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'toggle',
        target: 'prop',
        prop: 'checked',
        label: 'Checked',
      },
    ],
    events: ['onCheckedChange'],
  },
  {
    id: 'Select',
    module: '@/components/ui/select',
    namedExport: 'Select',
    isContainer: true,
    defaults: {
      children: () => [
        {
          kind: 'component',
          id: '' as NodeId, /* placeholder, replaced by createNode() */
          component: 'SelectTrigger',
          children: [
            { kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'SelectValue', children: [] },
          ],
        },
        {
          kind: 'component',
          id: '' as NodeId, /* placeholder, replaced by createNode() */
          component: 'SelectContent',
          children: [{ kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'SelectItem' }],
        },
      ],
    },
    inspector: [
      {
        kind: 'select',
        target: 'prop',
        prop: 'placeholder',
        label: 'Placeholder',
        options: ['Select an option'],
      },
    ],
    events: ['onValueChange'],
  },
  {
    id: 'SelectTrigger',
    module: '@/components/ui/select',
    namedExport: 'SelectTrigger',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SelectValue',
    module: '@/components/ui/select',
    namedExport: 'SelectValue',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SelectContent',
    module: '@/components/ui/select',
    namedExport: 'SelectContent',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SelectItem',
    module: '@/components/ui/select',
    namedExport: 'SelectItem',
    isContainer: false,
    defaults: {
      props: { value: 'option-1' },
    },
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'value',
        label: 'Value',
      },
    ],
  },
  {
    id: 'Card',
    module: '@/components/ui/card',
    namedExport: 'Card',
    isContainer: true,
    defaults: {
      className: 'w-full',
      children: () => [
        { kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'CardHeader', children: [] },
        { kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'CardContent', children: [] },
      ],
    },
    inspector: [
      { kind: 'spacing', label: 'Padding' },
      {
        kind: 'width',
        label: 'Width',
        options: ['w-full', 'w-auto', 'w-80', 'w-96', 'w-[300px]', 'w-[400px]', 'w-[500px]'],
      },
    ],
  },
  {
    id: 'CardHeader',
    module: '@/components/ui/card',
    namedExport: 'CardHeader',
    isContainer: true,
    defaults: {
      children: () => [
        { kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'CardTitle', children: [] },
      ],
    },
    inspector: [],
  },
  {
    id: 'CardTitle',
    module: '@/components/ui/card',
    namedExport: 'CardTitle',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'text',
        target: 'text',
        prop: 'text',
        label: 'Title',
      },
    ],
  },
  {
    id: 'CardDescription',
    module: '@/components/ui/card',
    namedExport: 'CardDescription',
    isContainer: false,
    defaults: {},
    inspector: [
      {
        kind: 'text',
        target: 'text',
        prop: 'text',
        label: 'Description',
      },
    ],
  },
  {
    id: 'CardContent',
    module: '@/components/ui/card',
    namedExport: 'CardContent',
    isContainer: true,
    defaults: {},
    inspector: [{ kind: 'spacing', label: 'Padding' }],
  },
  {
    id: 'CardFooter',
    module: '@/components/ui/card',
    namedExport: 'CardFooter',
    isContainer: true,
    defaults: {},
    inspector: [{ kind: 'spacing', label: 'Padding' }],
  },
  {
    id: 'Badge',
    module: '@/components/ui/badge',
    namedExport: 'Badge',
    isContainer: false,
    defaults: {
      variants: { variant: 'default' },
    },
    inspector: [
      {
        kind: 'select',
        target: 'variant',
        prop: 'variant',
        label: 'Variant',
        options: ['default', 'secondary', 'outline', 'destructive'],
      },
    ],
  },
  {
    id: 'Alert',
    module: '@/components/ui/alert',
    namedExport: 'Alert',
    isContainer: true,
    defaults: {
      variants: { variant: 'default' },
    },
    inspector: [
      {
        kind: 'select',
        target: 'variant',
        prop: 'variant',
        label: 'Variant',
        options: ['default', 'destructive'],
      },
    ],
  },
  {
    id: 'Separator',
    module: '@/components/ui/separator',
    namedExport: 'Separator',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'Collapsible',
    module: '@/components/ui/collapsible',
    namedExport: 'Collapsible',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'CollapsibleTrigger',
    module: '@/components/ui/collapsible',
    namedExport: 'CollapsibleTrigger',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'CollapsibleContent',
    module: '@/components/ui/collapsible',
    namedExport: 'CollapsibleContent',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenu',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenu',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuTrigger',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuTrigger',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuContent',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuContent',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuItem',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuItem',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuSeparator',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuSeparator',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuLabel',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuLabel',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuGroup',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuGroup',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'DropdownMenuShortcut',
    module: '@/components/ui/dropdown-menu',
    namedExport: 'DropdownMenuShortcut',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'Avatar',
    module: '@/components/ui/avatar',
    namedExport: 'Avatar',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'Progress',
    module: '@/components/ui/progress',
    namedExport: 'Progress',
    isContainer: false,
    defaults: {
      props: { value: 50 },
    },
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'value',
        label: 'Value',
      },
    ],
  },
  {
    id: 'Tabs',
    module: '@/components/ui/tabs',
    namedExport: 'Tabs',
    isContainer: true,
    defaults: {
      variants: { defaultValue: 'tab-1' },
    },
    inspector: [],
  },
  {
    id: 'TabsList',
    module: '@/components/ui/tabs',
    namedExport: 'TabsList',
    isContainer: true,
    defaults: {
      children: () => [{ kind: 'component', id: '' as NodeId /* placeholder, replaced by createNode() */, component: 'TabsTrigger' }],
    },
    inspector: [],
  },
  {
    id: 'TabsTrigger',
    module: '@/components/ui/tabs',
    namedExport: 'TabsTrigger',
    isContainer: false,
    defaults: {
      props: { value: 'tab-1' },
    },
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'value',
        label: 'Value',
      },
    ],
  },
  {
    id: 'TabsContent',
    module: '@/components/ui/tabs',
    namedExport: 'TabsContent',
    isContainer: true,
    defaults: {
      props: { value: 'tab-1' },
    },
    inspector: [
      {
        kind: 'text',
        target: 'prop',
        prop: 'value',
        label: 'Value',
      },
    ],
  },
  // ── Sidebar components ──
  {
    id: 'SidebarProvider',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarProvider',
    isContainer: true,
    defaults: {
      variants: { defaultOpen: 'true' },
    },
    inspector: [],
  },
  {
    id: 'Sidebar',
    module: '@/components/ui/sidebar',
    namedExport: 'Sidebar',
    isContainer: true,
    defaults: {
      variants: { collapsible: 'icon', side: 'left', variant: 'sidebar' },
    },
    inspector: [
      {
        kind: 'select',
        target: 'variant',
        prop: 'collapsible',
        label: 'Collapsible',
        options: ['offcanvas', 'icon', 'none'],
      },
      {
        kind: 'select',
        target: 'variant',
        prop: 'side',
        label: 'Side',
        options: ['left', 'right'],
      },
      {
        kind: 'select',
        target: 'variant',
        prop: 'variant',
        label: 'Variant',
        options: ['sidebar', 'floating', 'inset'],
      },
    ],
  },
  {
    id: 'SidebarHeader',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarHeader',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarContent',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarContent',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarFooter',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarFooter',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarRail',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarRail',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarInset',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarInset',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarTrigger',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarTrigger',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarSeparator',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarSeparator',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarGroup',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarGroup',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarGroupLabel',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarGroupLabel',
    isContainer: false,
    defaults: {
      children: () => [
        { kind: 'text', id: '' as NodeId, text: 'Section' } as unknown as SpecNode,
      ],
    },
    inspector: [
      {
        kind: 'text',
        target: 'text',
        prop: 'text',
        label: 'Label',
      },
    ],
  },
  {
    id: 'SidebarGroupContent',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarGroupContent',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenu',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenu',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenuItem',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuItem',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenuButton',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuButton',
    isContainer: false,
    defaults: {
      children: () => [
        { kind: 'text', id: '' as NodeId, text: 'Menu Item' } as unknown as SpecNode,
      ],
    },
    inspector: [
      {
        kind: 'text',
        target: 'text',
        prop: 'text',
        label: 'Label',
      },
    ],
  },
  {
    id: 'SidebarMenuAction',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuAction',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenuSub',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuSub',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenuSubItem',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuSubItem',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'SidebarMenuSubButton',
    module: '@/components/ui/sidebar',
    namedExport: 'SidebarMenuSubButton',
    isContainer: false,
    defaults: {},
    inspector: [],
  },
  {
    id: 'AppSidebar',
    module: '@/components/app-sidebar',
    namedExport: 'AppSidebar',
    isContainer: true,
    defaults: {},
    inspector: [],
  },
];

/** Индекс компонентов по id */
export const REGISTRY_BY_ID: Record<string, ComponentDef> = Object.fromEntries(
  REGISTRY.map((def) => [def.id, def]),
);

/** Возвращает ComponentDef по id. */
export function getComponentDef(id: string): ComponentDef | undefined {
  return REGISTRY_BY_ID[id];
}

/** Проверяет, является ли компонент контейнером. */
export function isContainerComponent(id: string): boolean {
  return REGISTRY_BY_ID[id]?.isContainer ?? false;
}
