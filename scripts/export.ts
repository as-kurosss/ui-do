/**
 * ui-do export script.
 * Thin wrapper around src/cli.ts that also installs dependencies
 * and validates the generated project with tsc.
 *
 * Usage:
 *   npx tsx scripts/export.ts --spec <project.json> --out <dir>
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProjectSpec } from '../src/schema.js';

// ── Args parsing ──

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const specPath = getArg(args, '--spec');
  const outDir = getArg(args, '--out') ?? './exported';

  if (!specPath) {
    console.error('Usage: npx tsx scripts/export.ts --spec <project.json> --out <output-dir>');
    process.exit(1);
  }

  // 1. Read & validate spec with zod
  const specFile = resolve(specPath);
  if (!existsSync(specFile)) {
    console.error(`Spec file not found: ${specFile}`);
    process.exit(1);
  }

  const { readFileSync } = await import('node:fs');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(specFile, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse spec file: ${err}`);
    process.exit(1);
  }

  try {
    parseProjectSpec(raw);
    console.log('✓ Spec validated successfully');
  } catch (err) {
    console.error('✗ Spec validation failed:');
    if (err instanceof Error) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }

  // 2. Generate project via CLI
  const out = resolve(outDir);
  if (existsSync(out)) {
    rmSync(out, { recursive: true, force: true });
  }

  execSync(`npx tsx src/cli.ts --spec "${specFile}" --out "${out}"`, {
    stdio: 'inherit',
  });

  // 3. Install dependencies and validate
  console.log('\nInstalling dependencies...');
  try {
    execSync('npm install', { cwd: out, stdio: 'inherit' });
  } catch {
    console.error('✗ npm install failed. Fix errors and re-run.');
    process.exit(1);
  }

  console.log('\nValidating with tsc...');
  try {
    execSync('node node_modules/typescript/bin/tsc --noEmit', { cwd: out, stdio: 'inherit' });
    console.log('✓ TypeScript validation passed.');
  } catch {
    console.error('✗ TypeScript validation failed. Fix errors and re-run.');
    process.exit(1);
  }

  console.log(`\nExport complete: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
