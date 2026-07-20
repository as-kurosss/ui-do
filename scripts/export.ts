/**
 * BN-Builder export script.
 *
 * Usage:
 *   npx tsx scripts/export.ts --spec ./project.json --out ../exported
 *
 * Reads a ProjectSpec JSON file, copies the template/, and generates:
 *   - src/screens/*.tsx       (one per screen via codegen)
 *   - src/index.css           (CSS tokens in oklch format)
 *   - src/App.tsx             (react-router routes for all screens)
 *   - index.html              (font links + project title)
 *
 * Then validates with `npx tsc --noEmit`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateScreen } from '../src/codegen/generate.js'
import type { ProjectSpec, ScreenSpec } from '../src/core/ir.js'

// ── Args parsing ──

interface Args {
  spec: string
  out: string
}

function parseArgs(argv: string[]): Args {
  let spec = ''
  let out = ''

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--spec' && i + 1 < argv.length) {
      spec = argv[++i]
    } else if (argv[i] === '--out' && i + 1 < argv.length) {
      out = argv[++i]
    }
  }

  if (!spec) {
    console.error('Usage: npx tsx scripts/export.ts --spec <project.json> --out <output-dir>')
    process.exit(1)
  }

  if (!out) {
    out = './exported'
  }

  return { spec, out }
}

// ── App.tsx generation ──

function generateAppTsx(screens: ScreenSpec[]): string {
  const imports = screens
    .map((s) => {
      const name = s.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen'
      return `import ${name} from './screens/${name}.js'`
    })
    .join('\n')

  const routes = screens
    .map((s) => {
      const name = s.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen'
      return `        <Route path="${s.route}" element={<${name} />} />`
    })
    .join('\n')

  return `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

${imports}

function App() {
  return (
    <BrowserRouter>
      <Routes>
${routes}
        <Route path="*" element={<Navigate to="${screens[0]?.route ?? '/'}" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
`
}

// ── Index.html generation ──

function generateIndexHtml(templateHtml: string, title: string, fontLink: string): string {
  return templateHtml
    .replace('{{TITLE}}', escapeHtml(title || 'Project'))
    .replace('{{FONT_LINK}}', fontLink)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Main ──

async function main() {
  const args = parseArgs(process.argv)

  // Resolve paths relative to the script's dir (scripts/)
  const scriptDir = fileURLToPath(new URL('.', import.meta.url))
  const projectRoot = resolve(scriptDir, '..')
  const templateDir = resolve(projectRoot, 'template')
  const outDir = resolve(args.out)

  // 1. Read spec
  const specPath = resolve(args.spec)
  if (!existsSync(specPath)) {
    console.error(`Spec file not found: ${specPath}`)
    process.exit(1)
  }

  let project: ProjectSpec
  try {
    const raw = readFileSync(specPath, 'utf-8')
    project = JSON.parse(raw) as ProjectSpec
  } catch (err) {
    console.error(`Failed to parse spec file: ${err}`)
    process.exit(1)
  }

  console.log(`Project: "${project.name}" (${project.screens.length} screens)`)
  console.log(`Output: ${outDir}`)

  // 2. Copy template
  if (!existsSync(templateDir)) {
    console.error(`Template directory not found: ${templateDir}`)
    process.exit(1)
  }

  if (existsSync(outDir)) {
    console.log(`Removing existing output directory: ${outDir}`)
    const { rmSync } = await import('node:fs')
    rmSync(outDir, { recursive: true, force: true })
  }

  cpSync(templateDir, outDir, { recursive: true })
  console.log('Template copied.')

  // 3. Create screens directory
  const screensDir = join(outDir, 'src', 'screens')
  mkdirSync(screensDir, { recursive: true })

  // 4. Generate each screen
  let css = ''
  let htmlHead = ''

  for (const screen of project.screens) {
    const result = generateScreen(screen)
    const fileName = (screen.name.replace(/[^a-zA-Z0-9_]/g, '') || 'Screen') + '.tsx'
    const filePath = join(screensDir, fileName)
    writeFileSync(filePath, result.tsx, 'utf-8')
    console.log(`  ✓ ${fileName}`)

    // Use first screen's tokens for global CSS / font link
    if (!css) css = result.css
    if (!htmlHead) htmlHead = result.htmlHead
  }

  // 5. Generate index.css
  const cssPath = join(outDir, 'src', 'index.css')
  writeFileSync(cssPath, css, 'utf-8')
  console.log('  ✓ src/index.css')

  // 6. Generate App.tsx
  const appTsx = generateAppTsx(project.screens)
  const appPath = join(outDir, 'src', 'App.tsx')
  writeFileSync(appPath, appTsx, 'utf-8')
  console.log('  ✓ src/App.tsx')

  // 7. Generate index.html
  const templateHtmlPath = join(outDir, 'index.html')
  const templateHtml = readFileSync(templateHtmlPath, 'utf-8')
  const finalHtml = generateIndexHtml(templateHtml, project.name, htmlHead)
  writeFileSync(templateHtmlPath, finalHtml, 'utf-8')
  console.log('  ✓ index.html')

  // 8. Validate
  console.log('\nValidating with tsc...')
  const { execSync } = await import('node:child_process')
  try {
    execSync('npx tsc --noEmit', { cwd: outDir, stdio: 'inherit' })
    console.log('✓ TypeScript validation passed.')
  } catch {
    console.error('✗ TypeScript validation failed. Fix errors and re-run.')
    process.exit(1)
  }

  console.log(`\nExport complete: ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
