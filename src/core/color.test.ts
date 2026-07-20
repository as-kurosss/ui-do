import { describe, it, expect } from 'vitest';
import { hexToOklch } from './color';

describe('hexToOklch', () => {
  it('converts black #000000', () => {
    expect(hexToOklch('#000000')).toBe('oklch(0 0 0)');
  });

  it('converts white #ffffff', () => {
    expect(hexToOklch('#ffffff')).toBe('oklch(1 0 0)');
  });

  it('converts a gray #808080', () => {
    const result = hexToOklch('#808080');
    expect(result).toBe('oklch(0.6 0 0)');
  });

  it('converts red #ff0000', () => {
    const result = hexToOklch('#ff0000');
    // Red: L > 0.6, C > 0.1, H ~30
    expect(result).toMatch(/^oklch\(/);
    const [, L, C] = result.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!;
    expect(Number(L)).toBeGreaterThan(0.6);
    expect(Number(C)).toBeGreaterThan(0.1);
  });

  it('converts a shadcn default blue #2563eb', () => {
    const result = hexToOklch('#2563eb');
    expect(result).toMatch(/^oklch\(/);
    const [, L, C] = result.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!;
    expect(Number(L)).toBeGreaterThan(0.4);
    expect(Number(L)).toBeLessThan(0.6);
    expect(Number(C)).toBeGreaterThan(0.1);
  });

  it('throws on invalid hex string (#xyz)', () => {
    expect(() => hexToOklch('#xyz')).toThrow('Invalid hex color');
  });

  it('throws on short hex (#fff)', () => {
    expect(() => hexToOklch('#fff')).toThrow('Invalid hex color');
  });

  it('throws on hex without # prefix', () => {
    expect(() => hexToOklch('000000')).toThrow('Invalid hex color');
  });

  it('continues to convert valid hex', () => {
    expect(hexToOklch('#000000')).toBe('oklch(0 0 0)');
    expect(hexToOklch('#ffffff')).toBe('oklch(1 0 0)');
  });
});
