import type { SpecNode } from './ir';

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
  | { kind: 'spacing'; label: string };

// ── Family tags for nesting rules ──

type Family = 'card' | 'card-header' | 'tabs' | 'leaf' | 'container' | 'select' | 'select-content';

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
    isContainer: false,
    defaults: {
      variants: { variant: 'default', size: 'default' },
    },
    inspector: [
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
          id: '' as never,
          component: 'SelectTrigger',
          children: [
            { kind: 'component', id: '' as never, component: 'SelectValue', children: [] },
          ],
        },
        {
          kind: 'component',
          id: '' as never,
          component: 'SelectContent',
          children: [{ kind: 'component', id: '' as never, component: 'SelectItem' }],
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
      children: () => [
        { kind: 'component', id: '' as never, component: 'CardHeader', children: [] },
        { kind: 'component', id: '' as never, component: 'CardContent', children: [] },
      ],
    },
    inspector: [{ kind: 'spacing', label: 'Padding' }],
  },
  {
    id: 'CardHeader',
    module: '@/components/ui/card',
    namedExport: 'CardHeader',
    isContainer: true,
    defaults: {
      children: () => [
        { kind: 'component', id: '' as never, component: 'CardTitle', children: [] },
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
      children: () => [{ kind: 'component', id: '' as never, component: 'TabsTrigger' }],
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
