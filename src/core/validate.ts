/**
 * Validates a ProjectSpec structure (e.g., loaded from JSON).
 * Returns { valid, errors } with all found issues.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProjectSpec(spec: unknown): ValidationResult {
  const errors: string[] = [];

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Input is not an object'] };
  }

  const obj = spec as Record<string, unknown>;

  if (obj.version !== 1) {
    errors.push('Missing or invalid version (expected 1)');
  }

  if (typeof obj.name !== 'string' || !obj.name) {
    errors.push('Missing or invalid name');
  }

  if (!Array.isArray(obj.screens) || obj.screens.length === 0) {
    errors.push('Missing or empty screens array');
    return { valid: false, errors };
  }

  for (let i = 0; i < obj.screens.length; i++) {
    const screen = obj.screens[i] as Record<string, unknown>;
    if (!screen || typeof screen !== 'object') {
      errors.push(`screens[${i}]: not an object`);
      continue;
    }
    if (typeof screen.name !== 'string' || !screen.name) {
      errors.push(`screens[${i}]: missing or invalid name`);
    }
    if (typeof screen.route !== 'string') {
      errors.push(`screens[${i}]: missing or invalid route`);
    }
    if (!screen.tokens || typeof screen.tokens !== 'object') {
      errors.push(`screens[${i}]: missing or invalid tokens`);
    }
    if (!screen.root || typeof screen.root !== 'object') {
      errors.push(`screens[${i}]: missing or invalid root`);
    }
  }

  return { valid: errors.length === 0, errors };
}
