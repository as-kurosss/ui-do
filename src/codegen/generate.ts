import type { ComponentNode, LayoutNode, SpecNode, ScreenSpec, TextNode } from '../core/ir';
import { getComponentDef } from '../core/registry';
import { hexToOklch } from '../core/color';
import { defaultStubs, preserveLogic } from './logic';

// ── Public types ──

export interface GenerateOptions {
  /** Previous TSX to preserve LOGIC block from. */
  prevTsx?: string;
  /** Additional import lines needed by CodeNode blocks. */
  extraImports?: string[];
  /**
   * Custom LOGIC block content (with markers) that replaces default stubs.
   * Used by block templates that provide custom functions, data, and hooks.
   */
  blockLogic?: string;
}

export interface GenerateResult {
  tsx: string;
  css: string;
  htmlHead: string;
}

// ── Component collection ──

function collectComponents(node: SpecNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: SpecNode) {
    if (n.kind === 'component') {
      ids.add(n.component);
      if (n.children) n.children.forEach(walk);
    } else if (n.kind === 'layout') {
      n.children.forEach(walk);
    }
  }
  walk(node);
  return ids;
}

// ── Imports ──

interface ImportGroup {
  path: string;
  names: string[];
}

function buildImports(spec: ScreenSpec): ImportGroup[] {
  const compIds = collectComponents(spec.root);
  const moduleMap = new Map<string, Set<string>>();

  for (const id of compIds) {
    const def = getComponentDef(id);
    if (def) {
      const existing = moduleMap.get(def.module) ?? new Set<string>();
      existing.add(def.namedExport);
      moduleMap.set(def.module, existing);
    }
  }

  const groups: ImportGroup[] = [];
  for (const [path, names] of moduleMap) {
    groups.push({ path, names: [...names].sort() });
  }
  groups.sort((a, b) => a.path.localeCompare(b.path));

  return groups;
}

// ── Layout class generation ──

function layoutClasses(node: LayoutNode): string {
  const classes: string[] = [];

  if (node.display === 'flex') {
    classes.push('flex');
    if (node.direction) {
      classes.push(node.direction === 'row' ? 'flex-row' : 'flex-col');
    }
    if (node.gap !== undefined && node.gap > 0) {
      classes.push(`gap-${node.gap}`);
    }
    if (node.align) classes.push(`items-${node.align}`);
    if (node.justify) classes.push(`justify-${node.justify}`);
    if (node.wrap) classes.push('flex-wrap');
  } else if (node.display === 'grid') {
    classes.push('grid');
    if (node.gap !== undefined && node.gap > 0) {
      classes.push(`gap-${node.gap}`);
    }
    if (node.align) classes.push(`items-${node.align}`);
    if (node.justify) classes.push(`justify-${node.justify}`);
  }

  if (node.className) classes.push(node.className);
  return classes.join(' ');
}

// ── JSX text escaping ──

function escapeJsxText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

// ── Resolve className (registry default + node className, deduplicated) ──

function resolveClassName(node: ComponentNode): string {
  const def = getComponentDef(node.component);
  const seen = new Set<string>();
  const result: string[] = [];

  const sources = [def?.defaults?.className, node.className];
  for (const src of sources) {
    if (!src) continue;
    for (const cls of src.split(/\s+/).filter(Boolean)) {
      if (!seen.has(cls)) {
        seen.add(cls);
        result.push(cls);
      }
    }
  }

  return result.join(' ');
}

// ── Props rendering ──

function renderComponentProps(node: ComponentNode): string {
  const parts: string[] = [];

  // 1. data-bn-id
  parts.push(`data-bn-id="${node.id}"`);

  // 2. variants (alphabetical)
  if (node.variants) {
    for (const key of Object.keys(node.variants).sort()) {
      parts.push(`${key}="${node.variants[key]}"`);
    }
  }

  // 3. props (alphabetical)
  if (node.props) {
    for (const key of Object.keys(node.props).sort()) {
      const val = node.props[key];
      if (typeof val === 'boolean') {
        parts.push(`${key}={${String(val)}}`);
      } else if (typeof val === 'number') {
        parts.push(`${key}={${val}}`);
      } else {
        parts.push(`${key}="${val}"`);
      }
    }
  }

  // 4. className (registry default + node className)
  const cn = resolveClassName(node);
  if (cn) parts.push(`className="${cn}"`);

  // 5. events (alphabetical)
  if (node.events) {
    for (const key of Object.keys(node.events).sort()) {
      parts.push(`${key}={${node.events[key]}}`);
    }
  }

  return parts.join(' ');
}

function renderLayoutProps(node: LayoutNode): string {
  const parts: string[] = [];
  parts.push(`data-bn-id="${node.id}"`);
  const cls = layoutClasses(node);
  if (cls) parts.push(`className="${cls}"`);
  return parts.join(' ');
}

// ── Node generation ──

function generateNode(node: SpecNode, indent: number): string {
  const pad = '  '.repeat(indent);

  switch (node.kind) {
    case 'layout': {
      const props = renderLayoutProps(node);
      const children = node.children;

      if (children.length === 0) {
        return `${pad}<div ${props} />`;
      }

      // Single TextNode child => inline
      if (children.length === 1 && children[0].kind === 'text') {
        const tn = children[0] as TextNode;
        const tag = tn.as ?? 'p';
        const cls = tn.className ? ` className="${tn.className}"` : '';
        return `${pad}<div ${props}>\n${pad}  <${tag}${cls}>${escapeJsxText(tn.text)}</${tag}>\n${pad}</div>`;
      }

      const rendered = children.map((c) => generateNode(c, indent + 1));
      return `${pad}<div ${props}>\n${rendered.join('\n')}\n${pad}</div>`;
    }

    case 'component': {
      const def = getComponentDef(node.component);
      const tag = def?.namedExport ?? node.component;
      const props = renderComponentProps(node);
      const children = node.children;

      if (!children || children.length === 0) {
        return `${pad}<${tag} ${props} />`;
      }

      // Single TextNode child => inline
      if (children.length === 1 && children[0].kind === 'text') {
        const tn = children[0] as TextNode;
        return `${pad}<${tag} ${props}>${escapeJsxText(tn.text)}</${tag}>`;
      }

      const rendered = children.map((c) => generateNode(c, indent + 1));
      return `${pad}<${tag} ${props}>\n${rendered.join('\n')}\n${pad}</${tag}>`;
    }

    case 'text': {
      const tag = node.as ?? 'p';
      const cls = node.className ? ` className="${node.className}"` : '';
      return `${pad}<${tag} data-bn-id="${node.id}"${cls}>${escapeJsxText(node.text)}</${tag}>`;
    }

    case 'code': {
      return node.source
        .split('\n')
        .map((line) => `${pad}${line}`)
        .join('\n');
    }

    default:
      return `${pad}<>unknown</>`;
  }
}

// ── CSS generation (Section 7 format) ──

/** Generate index.css content (Tailwind v4 @theme format) for a screen. */
export function generateCss(spec: ScreenSpec): string {
  const { tokens } = spec;
  const { colors, radius, fonts } = tokens;

  const oklch = (hex: string) => hexToOklch(hex);
  const radiusRem = (radius / 16).toFixed(3);

  const lines: string[] = [];
  lines.push('@import "tailwindcss";');
  lines.push('');
  lines.push(':root {');

  for (const [key, hex] of Object.entries(colors).sort((a, b) => a[0].localeCompare(b[0]))) {
    const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --${kebab}: ${oklch(hex)};`);
  }

  // Derived variables (shadcn/ui compatibility)
  lines.push('  --card-foreground: var(--foreground);');
  lines.push('  --sidebar: oklch(0.985 0 0);');
  lines.push('  --sidebar-foreground: oklch(0.145 0 0);');
  lines.push('  --sidebar-primary: oklch(0.205 0 0);');
  lines.push('  --sidebar-primary-foreground: oklch(0.985 0 0);');
  lines.push('  --sidebar-accent: oklch(0.97 0 0);');
  lines.push('  --sidebar-accent-foreground: oklch(0.205 0 0);');
  lines.push('  --sidebar-border: oklch(0.922 0 0);');
  lines.push('  --sidebar-ring: oklch(0.87 0 0);');
  lines.push('  --popover: var(--background);');
  lines.push('  --popover-foreground: var(--foreground);');
  lines.push('  --secondary: var(--muted);');
  lines.push('  --secondary-foreground: var(--muted-foreground);');
  lines.push('  --chart-1: var(--primary);');
  lines.push('  --chart-2: var(--accent);');
  lines.push('  --chart-3: var(--muted-foreground);');
  lines.push('  --chart-4: var(--destructive);');
  lines.push('  --chart-5: var(--border);');
  lines.push('  --ring: var(--primary);');
  lines.push(`  --radius: ${radiusRem}rem;`);
  lines.push('}');
  lines.push('');
  lines.push('@theme inline {');

  for (const [key] of Object.entries(colors).sort((a, b) => a[0].localeCompare(b[0]))) {
    const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --color-${kebab}: var(--${kebab});`);
  }

  // Derived color mappings
  lines.push('  --color-card-foreground: var(--card-foreground);');
  lines.push('  --color-ring: var(--ring);');
  lines.push('  --color-sidebar: var(--sidebar);');
  lines.push('  --color-sidebar-foreground: var(--sidebar-foreground);');
  lines.push('  --color-sidebar-primary: var(--sidebar-primary);');
  lines.push('  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);');
  lines.push('  --color-sidebar-accent: var(--sidebar-accent);');
  lines.push('  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);');
  lines.push('  --color-sidebar-border: var(--sidebar-border);');
  lines.push('  --color-sidebar-ring: var(--sidebar-ring);');
  lines.push('  --color-popover: var(--popover);');
  lines.push('  --color-popover-foreground: var(--popover-foreground);');
  lines.push('  --color-secondary: var(--secondary);');
  lines.push('  --color-secondary-foreground: var(--secondary-foreground);');
  lines.push('  --color-chart-1: var(--chart-1);');
  lines.push('  --color-chart-2: var(--chart-2);');
  lines.push('  --color-chart-3: var(--chart-3);');
  lines.push('  --color-chart-4: var(--chart-4);');
  lines.push('  --color-chart-5: var(--chart-5);');
  lines.push('  --radius-sm: calc(var(--radius) - 4px);');
  lines.push('  --radius-md: calc(var(--radius) - 2px);');
  lines.push('  --radius-lg: var(--radius);');
  lines.push('  --radius-xl: calc(var(--radius) + 4px);');
  lines.push(`  --font-sans: "${fonts.sans}", ui-sans-serif, system-ui, sans-serif;`);
  if (fonts.display) {
    lines.push(`  --font-display: "${fonts.display}", var(--font-sans);`);
  }

  lines.push('}');
  lines.push('');
  lines.push('@layer base {');
  lines.push('  * { @apply border-border outline-[var(--ring)]; }');
  lines.push('  body { @apply bg-background text-foreground font-sans; }');
  lines.push('}');

  return lines.join('\n');
}

// ── htmlHead (Google Fonts link) ──

const FONT_WEIGHTS: Record<string, string> = {
  Inter: 'wght@100..900',
  Manrope: 'wght@200..800',
  'Golos Text': 'wght@400..900',
  Onest: 'wght@100..900',
  Unbounded: 'wght@200..900',
  'JetBrains Mono': 'wght@100..800',
};

/** Generate Google Fonts <link> tag for a screen's font tokens. */
export function generateHtmlHead(spec: ScreenSpec): string {
  const { fonts } = spec.tokens;
  const names = [fonts.sans, fonts.display].filter(Boolean) as string[];

  const families = names
    .filter((name) => FONT_WEIGHTS[name])
    .map((name) => `family=${name.replace(/\s+/g, '+')}:${FONT_WEIGHTS[name]}`)
    .join('&');

  if (!families) return '';

  return `<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet" />`;
}

/** Generate App.tsx content with react-router routes for all screens. */
export function generateAppTsx(screens: ScreenSpec[]): string {
  const imports = screens
    .map((s) => {
      const name = s.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen';
      return `import ${name} from './screens/${name}.js'`;
    })
    .join('\n');

  const routes = screens
    .map((s) => {
      const name = s.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen';
      return `        <Route path="${s.route}" element={<${name} />} />`;
    })
    .join('\n');

  return `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'\n\n${imports}\n\nfunction App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n${routes}\n        <Route path="*" element={<Navigate to="${screens[0]?.route ?? '/'}" replace />} />\n      </Routes>\n    </BrowserRouter>\n  )\n}\n\nexport default App\n`;
}

/** Generate index.html with title and font link. */
export function generateIndexHtml(templateHtml: string, title: string, fontLink: string): string {
  return templateHtml
    .replace('{{TITLE}}', title)
    .replace('{{FONT_LINK}}', fontLink);
}

// ── Main entry point ──

/**
 * Generate a complete React component file (TSX) from a ScreenSpec.
 * Also returns the matching `index.css` content and `<link>` for fonts.
 *
 * @param spec   The screen specification to convert.
 * @param opts   Optional. Provide `prevTsx` to preserve a previously edited
 *               LOGIC block across re-generation.
 */
export function generateScreen(spec: ScreenSpec, opts?: GenerateOptions): GenerateResult {
  const componentName = spec.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen';

  // ── Build imports ──
  const importGroups = buildImports(spec);
  const importLines = importGroups.map((g) => `import { ${g.names.join(', ')} } from '${g.path}';`);
  const extraImports = opts?.extraImports ?? spec.blockExtraImports;
  if (extraImports) {
    importLines.push(...extraImports);
  }

  // ── Build LOGIC stubs ──
  const logicBlock = opts?.blockLogic ?? spec.blockLogic ?? defaultStubs(spec);

  // ── Build component body ──
  const rootTsx = generateNode(spec.root, 2);

  // ── Assemble TSX ──
  const lines: string[] = [];

  // Header
  lines.push(`// GENERATED by BN-Builder · screen "${spec.name}"`);
  lines.push(
    '// Structure is owned by the builder. Logic edits: BN:LOGIC block only. Do not remove data-bn-id.',
  );
  lines.push('');

  // Imports
  lines.push(...importLines);
  lines.push('');

  // LOGIC block
  lines.push(logicBlock);

  // Component
  lines.push(`export default function ${componentName}() {`);
  lines.push('  return (');
  lines.push(rootTsx);
  lines.push('  );');
  lines.push('}');
  lines.push('');

  let tsx = lines.join('\n');

  // Apply preserveLogic if prevTsx provided
  if (opts?.prevTsx) {
    tsx = preserveLogic(opts.prevTsx, tsx);
  }

  return {
    tsx,
    css: generateCss(spec),
    htmlHead: generateHtmlHead(spec),
  };
}
