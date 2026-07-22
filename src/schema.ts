import { z } from 'zod';

// ── Nodes ──

export const textNodeSchema = z.object({
  kind: z.literal('text'),
  id: z.string().min(1),
  text: z.string(),
  as: z.enum(['p', 'h1', 'h2', 'h3', 'span']).optional(),
  className: z.string().optional(),
});

export const codeNodeSchema = z.object({
  kind: z.literal('code'),
  id: z.string().min(1),
  label: z.string(),
  source: z.string(),
  blockId: z.string().optional(),
});

export const componentNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    kind: z.literal('component'),
    id: z.string().min(1),
    component: z.string().min(1),
    variants: z.record(z.string()).optional(),
    props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    className: z.string().optional(),
    events: z.record(z.string()).optional(),
    children: z.array(specNodeSchema).optional(),
  })
);

export const layoutNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    kind: z.literal('layout'),
    id: z.string().min(1),
    display: z.enum(['flex', 'grid']),
    direction: z.enum(['row', 'column']).optional(),
    gap: z.number().int().min(0).max(24).optional(),
    align: z.string().optional(),
    justify: z.string().optional(),
    wrap: z.boolean().optional(),
    className: z.string().optional(),
    children: z.array(specNodeSchema),
  })
);

// NOTE: Must use z.union, not z.discriminatedUnion. The variant schemas
// (componentNodeSchema, layoutNodeSchema) are themselves wrapped in z.lazy
// for recursive children, and z.discriminatedUnion tries to eagerly read
// the discriminator from each variant, which fails on lazy schemas.
export const specNodeSchema: z.ZodType = z.lazy(() =>
  z.union([
    textNodeSchema,
    codeNodeSchema,
    componentNodeSchema,
    layoutNodeSchema,
  ])
);

// ── Tokens ──

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be #rrggbb');

export const tokenSetSchema = z.object({
  colors: z.object({
    background: hexColor,
    foreground: hexColor,
    card: hexColor,
    cardForeground: hexColor,
    primary: hexColor,
    primaryForeground: hexColor,
    secondary: hexColor,
    secondaryForeground: hexColor,
    muted: hexColor,
    mutedForeground: hexColor,
    accent: hexColor,
    accentForeground: hexColor,
    popover: hexColor,
    popoverForeground: hexColor,
    destructive: hexColor,
    destructiveForeground: hexColor,
    border: hexColor,
    input: hexColor,
  }),
  radius: z.number().min(0).max(24),
  fonts: z.object({
    sans: z.string().min(1),
    display: z.string().optional(),
  }),
});

// ── Screen and project ──

export const screenSpecSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().startsWith('/'),
  tokens: tokenSetSchema,
  root: layoutNodeSchema,
  // Optional block fields (only used by advanced template logic)
  blockLogic: z.string().optional(),
  blockExtraImports: z.array(z.string()).optional(),
});

export const projectSpecSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  screens: z.array(screenSpecSchema).min(1),
});

// ── Helpers ──

export type ProjectSpecInput = z.input<typeof projectSpecSchema>;

export function parseProjectSpec(json: unknown) {
  return projectSpecSchema.parse(json);
}

export function safeParseProjectSpec(json: unknown) {
  return projectSpecSchema.safeParse(json);
}
