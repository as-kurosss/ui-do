# BUILDER-REFACTOR — Execution Report

> Refactoring `ui-do` from visual drag-and-drop constructor to headless IR-to-Codegen pipeline.
> Executed by AI agent on 2026-07-22.

## Result

✅ **All 12 steps completed successfully.**

## Final QA

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npm run lint` | ✅ 0 errors, 4 warnings (shadcn/ui template only) |
| `npm test` (123 tests, 8 files) | ✅ all pass |
| Preset validation (8 tests) | ✅ all pass |
| Generation from `examples/test-project.json` | ✅ success |
| Generated project `tsc --noEmit` | ✅ clean |
| Visual editor remnants in `src/` | ❌ none found |

## What was done

1. **Delete** — Removed all visual editor files: `src/components/`, `src/hooks/`, `src/store/`, `src/lib/`, `src/testing/`, `src/blocks/`, `public/`, old docs, editor configs.
2. **package.json** — Stripped React, DnD, zustand, zundo, vite. Kept zod, nanoid, tsx, vitest, typescript, oxlint.
3. **tsconfig** — Rewritten for Node/tsx project (ES2022, bundler resolution).
4. **vitest.config.ts** — Standalone vitest config for node environment.
5. **zod schema** (`src/schema.ts`) — Full ProjectSpec validation with `parseProjectSpec`/`safeParseProjectSpec` helpers. 11 tests.
6. **CLI** (`src/cli.ts`) — `--spec <file> --out <dir>`, validates, copies template, generates screens/App/CSS/HTML.
7. **Preview** (`src/preview.ts`) — Temp dir generation + `vite --open` with auto-cleanup.
8. **6 Presets** — `blank`, `auth`, `landing`, `dashboard`, `settings`, `list-detail` with validation.
9. **AGENT-PROMPT.md** — AI agent instructions for generating JSON specs.
10. **Export script** — Thin wrapper around CLI with zod validation + npm install + tsc.
11. **Documentation** — Updated `README.md` and `AGENTS.md`.
12. **Final verification** — Full QA pipeline passes.

## Architecture

```
JSON-spec (AI agent)
        │
        ▼
  zod-валидация (src/schema.ts)
        │
        ▼
  Детерминированный codegen (src/codegen/)
        │
        ▼
  template/ → готовый Vite-проект
        │
        ▼
  npm run dev → браузер
```

## Files created/modified (key)

| File | Action |
|---|---|
| `src/schema.ts` | new |
| `src/schema.test.ts` | new |
| `src/cli.ts` | new |
| `src/preview.ts` | new |
| `src/presets/*.json` (6) | new |
| `src/presets/index.ts` | new |
| `src/presets/presets.test.ts` | new |
| `AGENT-PROMPT.md` | new |
| `vitest.config.ts` | new |
| `package.json` | rewritten |
| `tsconfig.json` | rewritten |
| `scripts/export.ts` | rewritten |
| `README.md` | rewritten |
| `AGENTS.md` | rewritten |
| `src/codegen/generate.ts` | extended (added exports) |
