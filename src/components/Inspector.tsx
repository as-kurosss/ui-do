import { useEditorStore } from '@/store/editor';
import { getComponentDef } from '@/core/registry';
import { findNode } from '@/core/tree';
import type { InspectorField } from '@/core/registry';
import type { NodeId, SpecNode, ComponentNode, LayoutNode, TextNode } from '@/core/ir';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function Inspector() {
  const { project, activeScreenId, selectedId, patchNode } = useEditorStore();
  const screen = project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  if (!selectedId || !screen) {
    return <InspectorEmpty />;
  }

  const node = findNode(screen.root, selectedId);
  if (!node) {
    return <InspectorEmpty />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <NodeHeader node={node} />

      {node.kind === 'component' && <ComponentInspector node={node} onPatch={patchNode} />}
      {node.kind === 'layout' && <LayoutInspector node={node} onPatch={patchNode} />}
      {node.kind === 'text' && <TextInspector node={node} onPatch={patchNode} />}

      {/* className field for all node types */}
      {node.kind !== 'code' && (
        <Section title="CSS Class">
          <Input
            className="h-8 text-xs font-mono"
            placeholder="e.g. w-full mt-4"
            value={node.className ?? ''}
            onChange={(e) => patchNode(node.id, { className: e.target.value } as any)}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InspectorEmpty() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Inspector
      </h2>
      <p className="text-sm text-muted-foreground">Select a node to inspect</p>
    </div>
  );
}

// ── Node Header ──

function NodeHeader({ node }: { node: SpecNode }) {
  const kindLabel =
    node.kind === 'component'
      ? (node as ComponentNode).component
      : node.kind === 'layout'
        ? 'Layout'
        : node.kind === 'text'
          ? 'Text'
          : 'Code';
  const colorMap = {
    component: 'text-blue-600',
    layout: 'text-purple-600',
    text: 'text-green-600',
    code: 'text-orange-600',
  } as const;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Inspector
      </h2>
      <div className={`text-xs font-mono ${colorMap[node.kind]}`}>
        {kindLabel} <span className="text-muted-foreground">#{node.id}</span>
      </div>
    </div>
  );
}

// ── Component Inspector ──

function ComponentInspector({
  node,
  onPatch,
}: {
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  const def = getComponentDef(node.component);

  if (!def) {
    return <p className="text-xs text-muted-foreground">Unknown component: {node.component}</p>;
  }

  if (def.inspector.length === 0) {
    return <p className="text-xs text-muted-foreground">No configurable properties</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Section title="Properties">
        {def.inspector.map((field, i) => (
          <InspectorFieldRow key={i} field={field} node={node} onPatch={onPatch} />
        ))}
      </Section>
    </div>
  );
}

function InspectorFieldRow({
  field,
  node,
  onPatch,
}: {
  field: InspectorField;
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  switch (field.kind) {
    case 'select':
      return <SelectField field={field} node={node} onPatch={onPatch} />;
    case 'text':
      return <TextField field={field} node={node} onPatch={onPatch} />;
    case 'toggle':
      return <ToggleField field={field} node={node} onPatch={onPatch} />;
    case 'spacing':
      return <SpacingField field={field} node={node} onPatch={onPatch} />;
    default:
      return null;
  }
}

function SelectField({
  field,
  node,
  onPatch,
}: {
  field: InspectorField & { kind: 'select' };
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  const current =
    field.target === 'variant' ? node.variants?.[field.prop] : node.props?.[field.prop];

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{field.label}</Label>
      <select
        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={(current as string) ?? ''}
        onChange={(e) => {
          if (field.target === 'variant') {
            onPatch(node.id, {
              variants: { ...node.variants, [field.prop]: e.target.value },
            } as any);
          } else {
            onPatch(node.id, {
              props: { ...node.props, [field.prop]: e.target.value },
            } as any);
          }
        }}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  field,
  node,
  onPatch,
}: {
  field: InspectorField & { kind: 'text' };
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  const current = field.target === 'prop' ? node.props?.[field.prop] : (node as any).text;

  // Smart type detection based on prop name
  const propNameLower = field.prop.toLowerCase();
  const isNumeric = ['value', 'min', 'max', 'step', 'count', 'size'].some((k) =>
    propNameLower.includes(k),
  );
  const isColor = ['color', 'bg', 'background'].some((k) => propNameLower.includes(k));

  function handleChange(value: string) {
    if (field.target === 'text') {
      onPatch(node.id, { text: value } as any);
    } else if (isNumeric) {
      onPatch(node.id, {
        props: { ...node.props, [field.prop]: Number(value) },
      } as any);
    } else {
      onPatch(node.id, {
        props: { ...node.props, [field.prop]: value },
      } as any);
    }
  }

  if (isColor) {
    const hexValue = (current as string | undefined) ?? '#000000';
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{field.label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-8 cursor-pointer rounded border border-input bg-background p-0.5"
            value={hexValue}
            onChange={(e) => handleChange(e.target.value)}
          />
          <Input
            className="h-8 flex-1 text-xs font-mono"
            value={hexValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{field.label}</Label>
      <Input
        className="h-8 text-xs"
        type={isNumeric ? 'number' : 'text'}
        value={(current as string | number | undefined) ?? (isNumeric ? 0 : '')}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

function ToggleField({
  field,
  node,
  onPatch,
}: {
  field: InspectorField & { kind: 'toggle' };
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  const checked = node.props?.[field.prop] === true;

  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{field.label}</Label>
      <button
        role="checkbox"
        aria-checked={checked}
        className={`h-5 w-9 rounded-full border border-input transition-colors ${
          checked ? 'bg-primary border-primary' : 'bg-background'
        }`}
        onClick={() => {
          onPatch(node.id, {
            props: { ...node.props, [field.prop]: !checked },
          } as any);
        }}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function SpacingField({
  field,
  node,
  onPatch,
}: {
  field: InspectorField & { kind: 'spacing' };
  node: ComponentNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{field.label}</Label>
      <select
        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
        value={node.className ?? ''}
        onChange={(e) => {
          onPatch(node.id, { className: e.target.value } as any);
        }}
      >
        <option value="">Default</option>
        <option value="p-0">p-0</option>
        <option value="p-2">p-2</option>
        <option value="p-4">p-4</option>
        <option value="p-6">p-6</option>
        <option value="p-8">p-8</option>
        <option value="px-4 py-2">px-4 py-2</option>
        <option value="px-6 py-4">px-6 py-4</option>
      </select>
    </div>
  );
}

// ── Layout Inspector ──

function LayoutInspector({
  node,
  onPatch,
}: {
  node: LayoutNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Display">
        <div className="flex gap-1">
          <button
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              node.display === 'flex'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            onClick={() =>
              onPatch(node.id, { display: 'flex', direction: node.direction ?? 'column' } as any)
            }
          >
            Flex
          </button>
          <button
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              node.display === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onPatch(node.id, { display: 'grid' } as any)}
          >
            Grid
          </button>
        </div>
      </Section>
      <Section title="Direction">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={node.direction ?? 'row'}
          onChange={(e) => onPatch(node.id, { direction: e.target.value } as any)}
        >
          <option value="row">Row</option>
          <option value="column">Column</option>
        </select>
      </Section>
      <Section title="Gap">
        <Input
          className="h-8 text-xs"
          type="number"
          min={0}
          max={96}
          value={node.gap ?? 0}
          onChange={(e) => onPatch(node.id, { gap: Number(e.target.value) } as any)}
        />
      </Section>
      <Section title="Align">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={node.align ?? 'stretch'}
          onChange={(e) => onPatch(node.id, { align: e.target.value } as any)}
        >
          <option value="stretch">Stretch</option>
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
        </select>
      </Section>
      <Section title="Justify">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={node.justify ?? 'start'}
          onChange={(e) => onPatch(node.id, { justify: e.target.value } as any)}
        >
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
          <option value="between">Between</option>
          <option value="around">Around</option>
        </select>
      </Section>
      <Section title="Wrap">
        <div className="flex items-center gap-2">
          <button
            role="checkbox"
            aria-checked={node.wrap ?? false}
            className={`h-5 w-9 rounded-full border border-input transition-colors ${
              node.wrap ? 'bg-primary border-primary' : 'bg-background'
            }`}
            onClick={() => onPatch(node.id, { wrap: !node.wrap } as any)}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                node.wrap ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {node.wrap ? 'Wrap on' : 'Wrap off'}
          </span>
        </div>
      </Section>
    </div>
  );
}

// ── Text Inspector ──

function TextInspector({
  node,
  onPatch,
}: {
  node: TextNode;
  onPatch: (id: NodeId, patch: Partial<SpecNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Content">
        <Textarea
          className="min-h-[60px] text-xs"
          value={node.text}
          onChange={(e) => onPatch(node.id, { text: e.target.value } as any)}
        />
      </Section>
      <Section title="HTML Tag">
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={node.as ?? 'p'}
          onChange={(e) => onPatch(node.id, { as: e.target.value } as any)}
        >
          <option value="p">p</option>
          <option value="h1">h1</option>
          <option value="h2">h2</option>
          <option value="h3">h3</option>
          <option value="span">span</option>
        </select>
      </Section>
    </div>
  );
}
