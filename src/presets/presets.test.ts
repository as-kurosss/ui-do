import { describe, it, expect } from 'vitest';
import { layoutNodeSchema } from '../schema';
import { presets } from './index';

describe('presets', () => {
  for (const [name, preset] of Object.entries(presets)) {
    it(`"${name}" has a valid LayoutNode root`, () => {
      const root = (preset as Record<string, unknown>).root;
      expect(root).toBeDefined();

      // Validate that root.id starts with PRESET_ (placeholder)
      const layoutRoot = root as Record<string, unknown>;
      expect(typeof layoutRoot.id).toBe('string');
      expect((layoutRoot.id as string).startsWith('PRESET_')).toBe(true);

      // Validate the root against layoutNodeSchema
      const result = layoutNodeSchema.safeParse(root);
      if (!result.success) {
        console.error(`"${name}" validation errors:`, result.error.issues);
      }
      expect(result.success).toBe(true);
    });
  }

  it('all presets have unique names in the index', () => {
    const names = Object.keys(presets);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('presets index has 6 entries', () => {
    expect(Object.keys(presets)).toHaveLength(6);
  });
});
