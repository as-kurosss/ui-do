import type { ScreenSpec, SpecNode } from '../core/ir';

export const LOGIC_BEGIN =
  '// \u2500\u2500 BN:LOGIC:BEGIN \u2500\u2500 do not move, do not reformat \u2500\u2500';
export const LOGIC_END = '// \u2500\u2500 BN:LOGIC:END \u2500\u2500';

const LOGIC_RE =
  /^(\/\/ ── BN:LOGIC:BEGIN ── do not move, do not reformat ──\n)([\s\S]*?)(\n\/\/ ── BN:LOGIC:END ──)/m;

/** Collect all unique event handler names from the spec tree. */
function collectHandlerNames(spec: ScreenSpec): string[] {
  const names = new Set<string>();
  function walk(n: SpecNode) {
    if (n.kind === 'component' && n.events) {
      for (const handler of Object.values(n.events)) {
        names.add(handler);
      }
    }
    if ('children' in n && n.children) {
      for (const c of n.children) walk(c);
    }
  }
  walk(spec.root);
  return [...names].sort();
}

/** Extract function names from LOGIC block content. */
function extractFunctionNames(block: string): Set<string> {
  const names = new Set<string>();
  const re = /function\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    names.add(match[1]);
  }
  return names;
}

/**
 * Generate default function stubs for all event handlers in the spec.
 * Returns a complete LOGIC block (with markers).
 */
export function defaultStubs(spec: ScreenSpec): string {
  const handlers = collectHandlerNames(spec);
  if (handlers.length === 0) {
    return LOGIC_BEGIN + '\n' + LOGIC_END + '\n';
  }

  const stubs = handlers.map((name) => `function ${name}(/* args */) { /* TODO */ }`).join('\n');

  return LOGIC_BEGIN + '\n' + stubs + '\n' + LOGIC_END + '\n';
}

/**
 * Merge LOGIC block from `prevTsx` into `nextTsx`.
 * Existing functions are preserved verbatim; new functions (not present in
 * the old block) get default stubs appended.
 * If `prevTsx` has no LOGIC block, returns `nextTsx` unchanged (default stubs).
 */
export function preserveLogic(prevTsx: string, nextTsx: string): string {
  const prevMatch = prevTsx.match(LOGIC_RE);
  if (!prevMatch) {
    // No previous LOGIC block — use the default stubs from nextTsx
    return nextTsx;
  }

  const prevBlock = prevMatch[2].trim();
  const prevFunctions = extractFunctionNames(prevBlock);

  // Parse new stubs to find functions that need stubs
  const newMatch = nextTsx.match(LOGIC_RE);
  const newBlock = newMatch ? newMatch[2].trim() : '';
  const newFunctions = extractFunctionNames(newBlock);

  // Functions present in new but missing in prev -> need a stub
  const addedFunctions: string[] = [];
  for (const fn of newFunctions) {
    if (!prevFunctions.has(fn)) {
      addedFunctions.push(fn);
    }
  }

  // Build the merged block
  const addedStubs =
    addedFunctions.length > 0
      ? '\n' +
        addedFunctions.map((name) => `function ${name}(/* args */) { /* TODO */ }`).join('\n')
      : '';

  const mergedBlock = LOGIC_BEGIN + '\n' + prevBlock + addedStubs + '\n' + LOGIC_END;

  // Replace the LOGIC block in nextTsx
  return nextTsx.replace(LOGIC_RE, mergedBlock);
}
