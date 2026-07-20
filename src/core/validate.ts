import { REGISTRY_BY_ID } from './registry';

/**
 * Validates a ProjectSpec structure (e.g., loaded from JSON).
 * Returns { valid, errors } with all found issues.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_KINDS = ['component', 'layout', 'text', 'code'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function validateNode(node: unknown, path: string, errors: string[]): void {
  if (!node || typeof node !== 'object') {
    errors.push(`${path}: not an object`);
    return;
  }
  const n = node as Record<string, unknown>;

  if (!VALID_KINDS.includes(n.kind as string)) {
    errors.push(`${path}: invalid kind ${n.kind}`);
    return;
  }
  if (typeof n.id !== 'string' || !n.id) {
    errors.push(`${path}: missing or empty id`);
  }
  if (n.kind === 'component') {
    if (typeof n.component !== 'string' || !REGISTRY_BY_ID[n.component as string]) {
      errors.push(`${path}: unknown component ${n.component}`);
    }
  }
  if (n.kind === 'text' && typeof n.text !== 'string') {
    errors.push(`${path}: text node missing text string`);
  }

  const children = n.children;
  if (Array.isArray(children)) {
    children.forEach((child, i) => validateNode(child, `${path}.children[${i}]`, errors));
  }
}

function validateTokens(tokens: unknown, path: string, errors: string[]): void {
  if (!tokens || typeof tokens !== 'object') {
    errors.push(`${path}: tokens is not an object`);
    return;
  }
  const t = tokens as Record<string, unknown>;
  if (typeof t.radius !== 'number' || t.radius < 0) {
    errors.push(`${path}: radius must be a non-negative number`);
  }
  const colors = t.colors as Record<string, unknown> | undefined;
  if (colors && typeof colors === 'object') {
    for (const [key, val] of Object.entries(colors)) {
      if (typeof val !== 'string' || !HEX_RE.test(val)) {
        errors.push(`${path}.colors.${key}: invalid hex ${val}`);
      }
    }
  }
  const fonts = t.fonts as Record<string, unknown> | undefined;
  if (fonts) {
    if (typeof fonts.sans !== 'string' || !fonts.sans) {
      errors.push(`${path}.fonts.sans missing or invalid`);
    }
  }
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
    } else {
      validateTokens(screen.tokens, `screens[${i}].tokens`, errors);
    }
    if (!screen.root || typeof screen.root !== 'object') {
      errors.push(`screens[${i}]: missing or invalid root`);
    } else {
      validateNode(screen.root, `screens[${i}].root`, errors);
    }
  }

  return { valid: errors.length === 0, errors };
}
