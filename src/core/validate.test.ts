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
          tokens: { colors: { background: '#fff' }, radius: 8, fonts: { sans: 'Inter' } },
          root: { kind: 'layout', id: 'r1', display: 'flex', children: [] },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
