#!/usr/bin/env node
/**
 * ui-do Preview — live preview of a spec in the browser.
 *
 * Usage:
 *   npx tsx src/preview.ts <path-to-spec.json>
 *
 * Generates a project from the spec, installs dependencies,
 * and starts Vite dev server. Temp dir is auto-cleaned on exit.
 */

import { execSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const specPath = process.argv[2];

if (!specPath || process.argv.includes('--help')) {
  console.log('Usage: tsx src/preview.ts <path-to-spec.json>');
  process.exit(0);
}

const resolvedSpec = resolve(specPath);
if (!existsSync(resolvedSpec)) {
  console.error(`Error: Spec file not found: ${resolvedSpec}`);
  process.exit(1);
}

const tmpDir = mkdtempSync(join(tmpdir(), 'ui-do-preview-'));
console.log(`Preview dir: ${tmpDir}`);

let vite: ReturnType<typeof spawn> | null = null;

function cleanup() {
  if (vite) vite.kill();
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

try {
  // 1. Generate project via CLI
  console.log('\nGenerating project...');
  execSync(`npx tsx src/cli.ts --spec "${resolvedSpec}" --out "${tmpDir}"`, {
    stdio: 'inherit',
  });

  // 2. Install dependencies
  console.log('\nInstalling dependencies...');
  execSync('npm install', { cwd: tmpDir, stdio: 'inherit' });

  // 3. Start dev server
  console.log('\n🚀 Starting dev server...\n');
  vite = spawn('npx', ['vite', '--open'], {
    cwd: tmpDir,
    stdio: 'inherit',
  });

  vite.on('exit', () => {
    cleanup();
  });
} catch (e) {
  cleanup();
  console.error('Preview failed:', e);
  process.exit(1);
}
