#!/usr/bin/env node
/**
 * ui-do CLI — IR → Codegen pipeline.
 *
 * Usage:
 *   npx tsx src/cli.ts --spec <path-to-spec.json> [--out <dir>]
 *
 * Reads a ProjectSpec JSON file, validates with zod, and generates
 * a complete Vite + React + Tailwind project from the template/.
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProjectSpec } from './schema.js';
import { generateScreen, generateAppTsx, generateIndexHtml } from './codegen/generate.js';
import type { ProjectSpec } from './core/ir.js';

// ── Helpers ──

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen';
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: tsx src/cli.ts --spec <path-to-spec.json> [--out <dir>]');
    console.log('');
    console.log('Options:');
    console.log('  --spec <path>   Path to ProjectSpec JSON file (required)');
    console.log('  --out  <dir>    Output directory (default: ./output)');
    process.exit(0);
  }

  const specPath = getArg(args, '--spec');
  const outDir = getArg(args, '--out') ?? './output';

  if (!specPath) {
    console.error('Error: --spec is required');
    console.error('Usage: tsx src/cli.ts --spec <path-to-spec.json> [--out <dir>]');
    process.exit(1);
  }

  // 1. Read & validate spec
  const specFile = resolve(specPath);
  if (!existsSync(specFile)) {
    console.error(`Error: Spec file not found: ${specFile}`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(specFile, 'utf-8'));
  } catch (err) {
    console.error(`Error: Failed to parse spec file: ${err}`);
    process.exit(1);
  }

  let spec: ProjectSpec;
  try {
    spec = parseProjectSpec(raw) as ProjectSpec;
  } catch (err) {
    console.error(`Error: Spec validation failed:`);
    if (err instanceof Error) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`✓ Spec valid: "${spec.name}", ${spec.screens.length} screen(s)`);

  // 2. Resolve paths
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDir, '..');
  const templateDir = resolve(projectRoot, 'template');
  const targetDir = resolve(outDir);

  if (!existsSync(templateDir)) {
    console.error(`Error: Template not found: ${templateDir}`);
    process.exit(1);
  }

  // 3. Copy template
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  cpSync(templateDir, targetDir, { recursive: true });
  console.log('✓ Template copied');

  // 4. Generate screens
  const screensDir = join(targetDir, 'src', 'screens');
  mkdirSync(screensDir, { recursive: true });

  let globalCss = '';
  let globalHtmlHead = '';

  for (const screen of spec.screens) {
    const result = generateScreen(screen);
    const fileName = sanitizeName(screen.name) + '.tsx';
    writeFileSync(join(screensDir, fileName), result.tsx, 'utf-8');
    console.log(`  → ${fileName}`);

    if (!globalCss) {
      globalCss = result.css;
      globalHtmlHead = result.htmlHead;
    }
  }

  // 5. Generate index.css (tokens from first screen)
  writeFileSync(join(targetDir, 'src', 'index.css'), globalCss, 'utf-8');
  console.log('  → src/index.css');

  // 6. Generate App.tsx
  const appTsx = generateAppTsx(spec.screens);
  writeFileSync(join(targetDir, 'src', 'App.tsx'), appTsx, 'utf-8');
  console.log('  → src/App.tsx');

  // 7. Generate index.html
  const templateHtmlPath = join(targetDir, 'index.html');
  if (existsSync(templateHtmlPath)) {
    const templateHtml = readFileSync(templateHtmlPath, 'utf-8');
    const finalHtml = generateIndexHtml(templateHtml, spec.name, globalHtmlHead);
    writeFileSync(templateHtmlPath, finalHtml, 'utf-8');
    console.log('  → index.html');
  }

  console.log(`\n✓ Project generated in ${targetDir}`);
  console.log(`  cd ${outDir} && npm install && npm run dev`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
