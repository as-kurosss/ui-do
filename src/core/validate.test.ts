import { describe, it, expect } from 'vitest';
import { validateProjectSpec } from './validate';

describe('validateProjectSpec', () => {
  it('returns errors for non-object input', () => {
    const result = validateProjectSpec(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Input is not an object');
  });

  it('returns errors for string input', () => {
    const result = validateProjectSpec('invalid');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Input is not an object');
  });

  it('returns errors for missing version', () => {
    const result = validateProjectSpec({ name: 'test', screens: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid version (expected 1)');
  });

  it('returns errors for wrong version', () => {
    const result = validateProjectSpec({ version: 2, name: 'test', screens: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid version (expected 1)');
  });

  it('returns errors for missing name', () => {
    const result = validateProjectSpec({ version: 1, screens: [{ root: {}, tokens: {} }] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid name');
  });

  it('returns errors for empty screens', () => {
    const result = validateProjectSpec({ version: 1, name: 'test', screens: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or empty screens array');
  });

  it('returns errors for missing screens array', () => {
    const result = validateProjectSpec({ version: 1, name: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or empty screens array');
  });

  it('detects screen-level errors', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [{ name: 'Login' }], // missing route, tokens, root
    });
    expect(result.valid).toBe(false);
    const errors = result.errors.join(' ');
    expect(errors).toContain('screens[0]');
  });

  it('validates a correct spec', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { background: '#ffffff' }, radius: 8, fonts: { sans: 'Inter' } },
          root: { kind: 'layout', id: 'r1', display: 'flex', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('catches invalid node kind', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { background: '#ffffff' }, radius: 8, fonts: { sans: 'Inter' } },
          root: { kind: 'banana', id: 'r1', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('banana'))).toBe(true);
  });

  it('catches unknown component', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { background: '#ffffff' }, radius: 8, fonts: { sans: 'Inter' } },
          root: {
            kind: 'component',
            id: 'r1',
            component: 'FakeWidget',
            children: [],
          },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('FakeWidget'))).toBe(true);
  });

  it('rejects invalid hex color', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { primary: '#xyz' }, radius: 8, fonts: { sans: 'Inter' } },
          root: { kind: 'layout', id: 'r1', display: 'flex', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('#xyz'))).toBe(true);
  });

  it('rejects non-numeric radius', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { background: '#ffffff' }, radius: 'big', fonts: { sans: 'Inter' } },
          root: { kind: 'layout', id: 'r1', display: 'flex', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('radius'))).toBe(true);
  });

  it('rejects empty font name', () => {
    const result = validateProjectSpec({
      version: 1,
      name: 'test',
      screens: [
        {
          name: 'Login',
          route: '/login',
          tokens: { colors: { background: '#ffffff' }, radius: 8, fonts: { sans: '' } },
          root: { kind: 'layout', id: 'r1', display: 'flex', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('sans'))).toBe(true);
  });
});
