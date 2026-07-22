import { describe, it, expect } from 'vitest';
import { parseProjectSpec, safeParseProjectSpec } from './schema';

const VALID_SPEC = {
  version: 1,
  name: 'test-project',
  screens: [
    {
      version: 1,
      id: 's1',
      name: 'Login',
      route: '/login',
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
      root: {
        kind: 'layout',
        id: 'n1',
        display: 'flex',
        direction: 'column',
        gap: 4,
        align: 'center',
        justify: 'center',
        className: 'min-h-screen',
        children: [
          {
            kind: 'component',
            id: 'n2',
            component: 'Card',
            className: 'w-80',
            children: [],
          },
        ],
      },
    },
  ],
} as const;

describe('parseProjectSpec', () => {
  it('validates a correct spec', () => {
    const result = parseProjectSpec(VALID_SPEC);
    expect(result.name).toBe('test-project');
    expect(result.screens).toHaveLength(1);
    expect(result.screens[0].name).toBe('Login');
  });

  it('rejects missing kind', () => {
    const invalid = { ...VALID_SPEC, screens: [{ ...VALID_SPEC.screens[0], root: { ...VALID_SPEC.screens[0].root, kind: 'banana' as string } }] };
    expect(() => parseProjectSpec(invalid)).toThrow();
  });

  it('rejects invalid hex (#fff)', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        tokens: { ...VALID_SPEC.screens[0].tokens, colors: { ...VALID_SPEC.screens[0].tokens.colors, background: '#fff' } },
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex (red)', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        tokens: { ...VALID_SPEC.screens[0].tokens, colors: { ...VALID_SPEC.screens[0].tokens.colors, primary: 'red' } },
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex (123456 — no #)', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        tokens: { ...VALID_SPEC.screens[0].tokens, colors: { ...VALID_SPEC.screens[0].tokens.colors, primary: '123456' } },
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects gap above 24', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        root: { ...VALID_SPEC.screens[0].root, gap: 25 },
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects route without leading slash', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        route: 'login',
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty screens array', () => {
    const invalid = { ...VALID_SPEC, screens: [] };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects nested invalid child kind', () => {
    const invalid = {
      ...VALID_SPEC,
      screens: [{
        ...VALID_SPEC.screens[0],
        root: {
          ...VALID_SPEC.screens[0].root,
          children: [
            { kind: 'layout', id: 'x1', display: 'flex', children: [
              { kind: 'whatisthis', id: 'x2' },
            ]},
          ],
        },
      }],
    };
    const result = safeParseProjectSpec(invalid);
    expect(result.success).toBe(false);
  });

  it('safeParseProjectSpec returns { success: false, error } for garbage', () => {
    const result = safeParseProjectSpec(null);
    expect(result.success).toBe(false);
  });

  it('safeParseProjectSpec returns { success: false } for string', () => {
    const result = safeParseProjectSpec('garbage');
    expect(result.success).toBe(false);
  });
});
