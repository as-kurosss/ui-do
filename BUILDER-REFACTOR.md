# ui-do: Рефакторинг из визуального конструктора в IR → Codegen пайплайн

> **Кому:** AI-агенту-кодировщику.
> **Что:** Превратить проект из визуального DnD-конструктора в headless-пайплайн:
> JSON-spec (IR) → валидация → детерминированный codegen → готовый Vite-проект.
> **Принцип:** Убираем всё, что обслуживало визуальный редактор (canvas, DnD, inspector,
> палитра, темы в UI). Оставляем и усиливаем ядро: IR, реестр, tree-операции, codegen,
> LOGIC-контракт, экспорт.

---

## 0. Контекст: зачем это делается

Проект строился как визуальный конструктор (drag-and-drop shadcn-компонентов → codegen).
Практика показала, что DnD-канвас — лишний слой: пользователь общается с AI-агентом
словами, агент генерирует JSON-spec, codegen превращает его в рабочий проект.
Визуальный редактор не нужен. Нужен **надёжный, детерминированный пайплайн**:

```
Агент пишет JSON (ProjectSpec)
        │
        ▼
  Валидация по схеме (zod)
        │
        ▼
  Детерминированный codegen → screens/*.tsx + index.css + App.tsx
        │
        ▼
  Копирование в template/ → готовый Vite-проект
        │
        ▼
  npm run dev → живой preview в браузере
        │
        ▼
  Пользователь смотрит, говорит агенту правки → цикл
```

---

## 1. Текущая структура проекта (что есть сейчас)

```
ui-do/
├── src/
│   ├── codegen/            ← ОСТАВИТЬ (ядро)
│   │   ├── generate.ts
│   │   ├── generate.test.ts
│   │   ├── logic.ts
│   │   └── logic.test.ts
│   ├── components/         ← УДАЛИТЬ ПОЛНОСТЬЮ
│   │   ├── ui/             (shadcn для канваса — не нужны)
│   │   ├── Canvas.tsx
│   │   ├── CanvasErrorBoundary.tsx
│   │   ├── CanvasRenderer.tsx
│   │   ├── ComponentMap.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── DragOverlayContent.tsx
│   │   ├── DropIndicators.tsx
│   │   ├── Editor.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── Inspector.tsx
│   │   ├── LayersPanel.tsx
│   │   ├── Palette.tsx
│   │   ├── ProjectMenu.tsx
│   │   ├── ScreenTabs.tsx
│   │   ├── TokenColors.tsx
│   │   ├── TokenInjector.tsx
│   │   ├── TokensPanel.tsx
│   │   └── UndoRedo.tsx
│   ├── core/               ← ОСТАВИТЬ (ядро), кроме dnd-strategy.ts
│   │   ├── ir.ts
│   │   ├── registry.ts / registry.test.ts
│   │   ├── tree.ts / tree.test.ts
│   │   ├── validate.ts / validate.test.ts
│   │   ├── create-node.ts
│   │   ├── color.ts / color.test.ts
│   │   └── dnd-strategy.ts  ← УДАЛИТЬ
│   ├── fixtures/           ← УДАЛИТЬ (demo-spec для канваса)
│   ├── hooks/              ← УДАЛИТЬ (useKeyboard, useFontLoader)
│   ├── lib/                ← УДАЛИТЬ (cn() для редактора)
│   ├── store/              ← УДАЛИТЬ (Zustand-стор редактора)
│   ├── testing/            ← УДАЛИТЬ (setup для jsdom)
│   ├── App.tsx             ← УДАЛИТЬ
│   ├── main.tsx            ← УДАЛИТЬ
│   └── index.css           ← УДАЛИТЬ
├── public/                 ← УДАЛИТЬ
├── scripts/
│   └── export.ts           ← ОСТАВИТЬ, доработать
├── template/               ← ОСТАВИТЬ (шаблон экспортируемого проекта)
│   ├── src/components/ui/  (shadcn для экспорта — нужны)
│   ├── src/lib/
│   ├── src/index.css
│   ├── src/main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── examples/
│   └── test-project.json   ← ОСТАВИТЬ
├── index.html              ← УДАЛИТЬ (точка входа редактора)
├── vite.config.ts          ← УДАЛИТЬ (конфиг редактора)
├── components.json         ← УДАЛИТЬ (shadcn-конфиг редактора)
├── package.json            ← ПЕРЕПИСАТЬ
├── tsconfig.json           ← АДАПТИРОВАТЬ
├── tsconfig.app.json       ← АДАПТИРОВАТЬ / УДАЛИТЬ
├── tsconfig.node.json      ← АДАПТИРОВАТЬ
├── AGENTS.md               ← ПЕРЕПИСАТЬ
├── README.md               ← ПЕРЕПИСАТЬ
├── AGENTS-STATUS.md        ← УДАЛИТЬ
├── refactoring-3-report.md ← УДАЛИТЬ
└── .prettierrc, .prettierignore, .oxlintrc.json ← ОСТАВИТЬ
```

---

## 2. Целевая структура (что должно получиться)

```
ui-do/
├── src/
│   ├── core/                  # Доменное ядро (без изменений)
│   │   ├── ir.ts
│   │   ├── registry.ts / registry.test.ts
│   │   ├── tree.ts / tree.test.ts
│   │   ├── validate.ts / validate.test.ts
│   │   ├── create-node.ts
│   │   └── color.ts / color.test.ts
│   ├── codegen/               # Генерация кода (без изменений)
│   │   ├── generate.ts / generate.test.ts
│   │   └── logic.ts / logic.test.ts
│   ├── schema.ts              # НОВОЕ: zod-схема для ProjectSpec
│   ├── schema.test.ts         # НОВОЕ: тесты схемы
│   ├── cli.ts                 # НОВОЕ: CLI-точка входа
│   ├── preview.ts             # НОВОЕ: скрипт живого preview
│   └── presets/               # НОВОЕ: layout-пресеты
│       ├── index.ts
│       ├── landing.json
│       ├── dashboard.json
│       ├── auth.json
│       ├── settings.json
│       ├── list-detail.json
│       └── blank.json
├── scripts/
│   └── export.ts              # Доработать: использовать schema.ts
├── template/                  # Без изменений
├── examples/
│   ├── test-project.json      # Без изменений
│   └── landing-example.json   # НОВОЕ: пример с пресетом
├── AGENT-PROMPT.md            # НОВОЕ: промпт для AI-агента
├── package.json               # Переписанный
├── tsconfig.json              # Адаптированный
├── AGENTS.md                  # Переписанный
├── README.md                  # Переписанный
└── .prettierrc, .prettierignore, .oxlintrc.json
```

---

## 3. Пошаговый план

> **Правило:** после каждого шага — `npx tsc --noEmit && npm test`.
> Коммит после каждого шага. Conventional commits.

---

### Шаг 1. Удалить визуальный редактор и DnD

Удалить следующие файлы и каталоги **целиком**:

```bash
# Компоненты редактора
rm -rf src/components/

# DnD-стратегия
rm src/core/dnd-strategy.ts

# Хуки редактора
rm -rf src/hooks/

# Фикстура для канваса
rm -rf src/fixtures/

# Стор редактора (Zustand + zundo)
rm -rf src/store/

# Утилиты редактора (cn)
rm -rf src/lib/

# Тестовый сетап (jsdom)
rm -rf src/testing/

# Точка входа и стили редактора
rm src/App.tsx src/main.tsx src/index.css

# Точка входа Vite для редактора
rm index.html

# Конфиг Vite для редактора
rm vite.config.ts

# shadcn-конфиг редактора
rm components.json

# Публичные ассеты редактора
rm -rf public/

# Устаревшие доки
rm AGENTS-STATUS.md refactoring-3-report.md
```

**Проверка:** `ls src/` показывает только `core/` и `codegen/`.
`tsc` и тесты на этом шаге упадут — это ожидаемо, чиним в шаге 2.

---

### Шаг 2. Переписать package.json

Удалить все зависимости, которые обслуживали визуальный редактор.
Оставить только то, что нужно для ядра, codegen, CLI, тестов.

```jsonc
{
  "name": "ui-do",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "IR → Codegen pipeline: JSON spec to production React + Tailwind project",
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint",
    "generate": "tsx src/cli.ts",
    "preview": "tsx src/preview.ts",
    "export": "tsx scripts/export.ts"
  },
  "dependencies": {
    "nanoid": "^6.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^24.13.2",
    "oxlint": "^1.71.0",
    "prettier": "^3.9.5",
    "tsx": "^4.23.1",
    "typescript": "~6.0.2",
    "vitest": "^4.1.10"
  }
}
```

**Что удалено и почему:**

| Пакет | Причина |
|---|---|
| `react`, `react-dom`, `@types/react`, `@types/react-dom` | Редактор удалён. React живёт в `template/package.json` |
| `@dnd-kit/*` (4 пакета) | DnD удалён |
| `zustand`, `zundo` | Стор редактора удалён |
| `@base-ui/react` | Зависимость shadcn в редакторе |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Утилиты shadcn для канваса |
| `lucide-react` | Иконки редактора |
| `tailwindcss`, `@tailwindcss/vite` | Стили редактора. Tailwind живёт в `template/` |
| `@vitejs/plugin-react`, `vite` | Vite для редактора. Vite живёт в `template/` |
| `jsdom`, `@testing-library/*` | Тесты DOM-рендера редактора |

**Что добавлено:**

| Пакет | Причина |
|---|---|
| `zod` | Runtime-валидация входного JSON-spec |

После edits:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Проверка:** `npm ls` — нет ошибок. `npx tsc --noEmit` — может ругаться
на удалённые файлы, если tsconfig ещё не обновлён (чиним в шаге 3).

---

### Шаг 3. Адаптировать TypeScript-конфиг

Проект больше не Vite-приложение. Это Node/tsx-проект с тестами.

**Удалить:** `tsconfig.app.json` (конфиг для Vite-приложения).

**Переписать `tsconfig.json`:**

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts"],
  "exclude": ["node_modules", "dist", "template"]
}
```

**Удалить** `tsconfig.node.json` (больше не нужен без Vite).

**Проверка:** `npx tsc --noEmit` — зелёный. Все тесты ядра и codegen проходят:
`npm test`. Если какие-то тесты ссылались на удалённые модули — удалить
эти тестовые файлы (они тестировали редактор).

---

### Шаг 4. Обновить vitest-конфиг

Создать `vitest.config.ts` в корне (ранее конфиг был внутри `vite.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

**Проверка:** `npm test` — все оставшиеся тесты зелёные.
Ожидаемое количество: тесты `core/` (tree, registry, validate, color, create-node)
+ тесты `codegen/` (generate, logic). Примерно 50–60 тестов.

---

### Шаг 5. Создать zod-схему для ProjectSpec

**Файл:** `src/schema.ts`

Задача: описать zod-схему, которая **один-в-один** соответствует типам из
`src/core/ir.ts`. Это runtime-валидация входного JSON от агента.

```ts
// src/schema.ts
import { z } from 'zod';

// ── Узлы ──

export const textNodeSchema = z.object({
  kind: z.literal('text'),
  id: z.string().min(1),
  text: z.string(),
  as: z.enum(['p', 'h1', 'h2', 'h3', 'span']).optional(),
  className: z.string().optional(),
});

export const codeNodeSchema = z.object({
  kind: z.literal('code'),
  id: z.string().min(1),
  label: z.string(),
  source: z.string(),
});

export const componentNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    kind: z.literal('component'),
    id: z.string().min(1),
    component: z.string().min(1),
    variants: z.record(z.string()).optional(),
    props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    className: z.string().optional(),
    events: z.record(z.string()).optional(),
    children: z.array(specNodeSchema).optional(),
  })
);

export const layoutNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    kind: z.literal('layout'),
    id: z.string().min(1),
    display: z.enum(['flex', 'grid']),
    direction: z.enum(['row', 'column']).optional(),
    gap: z.number().int().min(0).max(24).optional(),
    align: z.string().optional(),
    justify: z.string().optional(),
    wrap: z.boolean().optional(),
    className: z.string().optional(),
    children: z.array(specNodeSchema),
  })
);

export const specNodeSchema: z.ZodType = z.lazy(() =>
  z.discriminatedUnion('kind', [
    textNodeSchema,
    codeNodeSchema,
    componentNodeSchema,
    layoutNodeSchema,
  ])
);

// ── Токены ──

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be #rrggbb');

export const tokenSetSchema = z.object({
  colors: z.object({
    background: hexColor,
    foreground: hexColor,
    card: hexColor,
    primary: hexColor,
    primaryForeground: hexColor,
    muted: hexColor,
    mutedForeground: hexColor,
    accent: hexColor,
    accentForeground: hexColor,
    destructive: hexColor,
    destructiveForeground: hexColor,
    border: hexColor,
    input: hexColor,
  }),
  radius: z.number().min(0).max(24),
  fonts: z.object({
    sans: z.string(),
    display: z.string().optional(),
  }),
});

// ── Экран и проект ──

export const screenSpecSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().startsWith('/'),
  tokens: tokenSetSchema,
  root: layoutNodeSchema,
});

export const projectSpecSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  screens: z.array(screenSpecSchema).min(1),
});

// ── Хелперы ──

export type ProjectSpecInput = z.input<typeof projectSpecSchema>;

export function parseProjectSpec(json: unknown) {
  return projectSpecSchema.parse(json);
}

export function safeParseProjectSpec(json: unknown) {
  return projectSpecSchema.safeParse(json);
}
```

**Важно:**
- `gap` ограничен `max(24)` — это spacing scale (Tailwind: 0–24 → 0–96px).
- `hexColor` — строгий формат `#rrggbb`.
- `route` обязан начинаться с `/`.
- `z.lazy()` для рекурсивных типов (children).
- `z.discriminatedUnion` по полю `kind`.

**Файл:** `src/schema.test.ts`

Тесты:
1. Валидный spec из `examples/test-project.json` проходит.
2. Отсутствует `kind` → ошибка.
3. Неверный hex (`#fff`, `red`, `123456`) → ошибка.
4. `gap: 25` → ошибка (вне scale).
5. `route` без `/` → ошибка.
6. Пустой `screens: []` → ошибка.
7. Вложенный `children` с неверным `kind` → ошибка с указанием пути.
8. `safeParseProjectSpec` возвращает `{ success: false, error }` для мусора.

**Проверка:** `npm test` — все тесты зелёные, включая новые.

---

### Шаг 6. Создать CLI

**Файл:** `src/cli.ts`

CLI — главная точка входа. Принимает JSON-spec, валидирует, генерирует проект.

```ts
// src/cli.ts
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseProjectSpec } from './schema.js';
import { generateScreen } from './codegen/generate.js';
import { generateIndexCss } from './codegen/generate.js'; // если есть, иначе вынести
import { generateApp } from './codegen/generate.js';     // если есть, иначе вынести

// ── Parse args ──
const args = process.argv.slice(2);
const specPath = getArg(args, '--spec');
const outDir = getArg(args, '--out') ?? './output';

if (!specPath) {
  console.error('Usage: tsx src/cli.ts --spec <path-to-spec.json> [--out <dir>]');
  process.exit(1);
}

// ── Read & validate ──
const raw = JSON.parse(readFileSync(resolve(specPath), 'utf-8'));
const spec = parseProjectSpec(raw); // бросает ZodError с понятными сообщениями

console.log(`✓ Spec valid: "${spec.name}", ${spec.screens.length} screen(s)`);

// ── Generate ──
const templateDir = resolve(import.meta.dirname, '..', 'template');
const targetDir = resolve(outDir);

if (!existsSync(templateDir)) {
  console.error(`Template not found: ${templateDir}`);
  process.exit(1);
}

// Копируем template
cpSync(templateDir, targetDir, { recursive: true });

// Генерируем экраны
const screensDir = join(targetDir, 'src', 'screens');
mkdirSync(screensDir, { recursive: true });

for (const screen of spec.screens) {
  const result = generateScreen(screen);
  const filePath = join(screensDir, `${screen.name}.tsx`);
  writeFileSync(filePath, result.tsx, 'utf-8');
  console.log(`  → ${screen.name}.tsx`);
}

// Генерируем index.css (токены первого экрана или общие)
// Генерируем App.tsx (роутинг)
// Генерируем index.html (шрифты, title)
// ... (адаптировать из scripts/export.ts)

console.log(`\n✓ Project generated in ${targetDir}`);
console.log(`  cd ${outDir} && npm install && npm run dev`);

// ── Helpers ──
function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}
```

**Важно:**
- Логика генерации `index.css`, `App.tsx`, `index.html` уже есть в
  `scripts/export.ts`. Перенести её в `src/codegen/generate.ts` как
  отдельные экспортируемые функции (`generateIndexCss`, `generateAppTs`,
  `generateIndexHtml`), чтобы и CLI, и export-скрипт использовали один код.
- `scripts/export.ts` после этого становится тонкой обёрткой над `src/cli.ts`
  или удаляется (по ситуации).

**Проверка:**

```bash
npx tsx src/cli.ts --spec examples/test-project.json --out /tmp/test-out
cd /tmp/test-out && npm install && npx tsc --noEmit
```

---

### Шаг 7. Создать скрипт живого preview

**Файл:** `src/preview.ts`

Задача: spec → codegen → template → `vite dev` в temp-директории.
Пользователь видит результат в браузере без ручных шагов.

```ts
// src/preview.ts
import { execSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: tsx src/preview.ts <path-to-spec.json>');
  process.exit(1);
}

const tmpDir = mkdtempSync(join(tmpdir(), 'ui-do-preview-'));
console.log(`Preview dir: ${tmpDir}`);

try {
  // 1. Генерация (переиспользуем CLI-логику)
  execSync(`npx tsx src/cli.ts --spec ${resolve(specPath)} --out ${tmpDir}`, {
    stdio: 'inherit',
  });

  // 2. npm install
  execSync('npm install', { cwd: tmpDir, stdio: 'inherit' });

  // 3. vite dev
  console.log('\n🚀 Starting dev server...\n');
  const vite = spawn('npx', ['vite', '--open'], {
    cwd: tmpDir,
    stdio: 'inherit',
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    vite.kill();
    rmSync(tmpDir, { recursive: true, force: true });
    process.exit(0);
  });
} catch (e) {
  rmSync(tmpDir, { recursive: true, force: true });
  throw e;
}
```

**Проверка:** `npx tsx src/preview.ts examples/test-project.json` —
открывается браузер с Login-экраном.

---

### Шаг 8. Создать layout-пресеты

**Каталог:** `src/presets/`

Пресеты — это готовые JSON-фрагменты `root: LayoutNode`, которые агент
использует как стартовую точку. Не нужно генерировать дерево с нуля —
берёшь пресет, подставляешь свои тексты/компоненты.

**Файлы:**

| Файл | Что внутри |
|---|---|
| `blank.json` | Пустой flex-column, `min-h-screen`, один child-слот |
| `auth.json` | Центрированная карточка (Card + CardHeader + CardContent), как в demo |
| `landing.json` | Hero-секция + features-grid (3 колонки) + CTA-блок + footer |
| `dashboard.json` | Sidebar (flex-row) + content area с grid-виджетами |
| `settings.json` | Двухколоночный layout: nav слева, форма справа |
| `list-detail.json` | Список слева (flex-col), детальная панель справа |

Формат каждого файла:

```jsonc
{
  "$preset": "landing",
  "$description": "Hero + features grid + CTA + footer",
  "root": {
    "kind": "layout",
    "id": "PRESET_ROOT",   // ← агент заменяет на реальный nanoid
    "display": "flex",
    "direction": "column",
    "gap": 0,
    "className": "min-h-screen",
    "children": [
      // ... дерево узлов с id: "PRESET_1", "PRESET_2", ...
    ]
  }
}
```

**Правила для пресетов:**
- Все `id` — плейсхолдеры `PRESET_*`. Агент заменяет на `nanoid` при использовании.
- `gap` — только из scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24.
- `className` — только стандартные Tailwind-утилиты (без arbitrary `w-[...]`).
- Компоненты — только из реестра (`src/core/registry.ts`).
- Каждый пресет — **валидный `LayoutNode`** по zod-схеме (кроме id-плейсхолдеров).

**Файл:** `src/presets/index.ts`

```ts
import blank from './blank.json';
import auth from './auth.json';
import landing from './landing.json';
import dashboard from './dashboard.json';
import settings from './settings.json';
import listDetail from './list-detail.json';

export const presets = { blank, auth, landing, dashboard, settings, 'list-detail': listDetail } as const;
export type PresetName = keyof typeof presets;
```

**Проверка:** каждый пресет проходит `layoutNodeSchema.safeParse()`
(с поправкой на PRESET_* id). Написать тест `src/presets/presets.test.ts`.

---

### Шаг 9. Создать AGENT-PROMPT.md

**Файл:** `AGENT-PROMPT.md` в корне проекта.

Это **главный артефакт** — инструкция для AI-агента, который будет
генерировать JSON-spec. Без этого файла агент не знает правил.

Структура файла:

```markdown
# UI-DO: Инструкция для агента-генератора интерфейсов

## Твоя задача
Ты генерируешь JSON-спецификацию (ProjectSpec) для пайплайна ui-do.
На выходе — JSON-файл, который превращается в рабочий React + Tailwind проект.

## Формат спецификации
[Вставить полную JSON Schema или zod-схему в человекочитаемом виде]

## Доступные компоненты
[Таблица из registry.ts: id, isContainer, допустимые variants, props, events]

## Правила вложенности
[canContain-правила из registry.ts]

## Spacing scale (gap, padding, margin)
Допустимые значения: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
(Tailwind: gap-0 ... gap-24, шаг 4px)

## Цветовые токены
[Список 13 обязательных цветовых ролей + формат #rrggbb]

## Шрифты (с кириллицей)
Inter, Manrope, Golos Text, Onest, Unbounded, JetBrains Mono

## Layout-пресеты
[Список 6 пресетов с описанием, когда какой использовать]

## Примеры
### Пример 1: Login-экран
[Полный JSON из examples/test-project.json]

### Пример 2: Landing
[Полный JSON из examples/landing-example.json]

## Ограничения
- Не использовать arbitrary Tailwind: w-[327px], bg-[#abc123]
- Не более 6 уровней вложенности
- Каждый экран — один root LayoutNode
- route начинается с /
- name экрана — PascalCase, без пробелов (станет именем файла)

## Валидация
Перед отправкой JSON убедись:
- Все id уникальны в пределах экрана
- kind всегда указан
- component совпадает с id из реестра
- gap из допустимого scale
```

**Проверка:** файл существует, содержит все секции. Примеры валидны по схеме.

---

### Шаг 10. Обновить scripts/export.ts

Доработать export-скрипт:

1. Добавить валидацию через `parseProjectSpec()` из `src/schema.ts`
   **до** генерации. При невалидном JSON — понятная ошибка с путём к полю.
2. Переиспользовать функции генерации из `src/codegen/generate.ts`
   (не дублировать логику).
3. Убрать любые ссылки на удалённые модули (store, components, hooks).

**Проверка:**

```bash
npx tsx scripts/export.ts --spec examples/test-project.json --out /tmp/export-test
cd /tmp/export-test && npm install && npx tsc --noEmit && npm run build
```

---

### Шаг 11. Обновить документацию

**README.md** — переписать:

```markdown
# ui-do

Headless-пайплайн: JSON-спецификация → детерминированный codegen → готовый
React + Tailwind + shadcn/ui проект.

## Как это работает
1. AI-агент (или человек) пишет JSON-spec по схеме
2. `npx tsx src/cli.ts --spec spec.json --out ./my-app`
3. `cd my-app && npm install && npm run dev`

## Команды
- `npm run generate -- --spec <file> --out <dir>` — генерация проекта
- `npm run preview -- <file>` — генерация + живой preview
- `npm run export -- --spec <file> --out <dir>` — то же, что generate
- `npm test` — тесты
- `npm run lint` — линтинг

## Структура
- `src/core/` — IR, реестр компонентов, tree-операции, валидация
- `src/codegen/` — детерминированный codegen, LOGIC-контракт
- `src/schema.ts` — zod-валидация входного JSON
- `src/presets/` — layout-пресеты
- `template/` — шаблон Vite-проекта для экспорта
- `AGENT-PROMPT.md` — инструкция для AI-агента

## Для AI-агентов
Читай `AGENT-PROMPT.md`. Генерируй JSON по схеме. Валидируй перед отправкой.
```

**AGENTS.md** — переписать под новую архитектуру. Убрать разделы про
DnD, канвас, инспектор, палитру, токены в UI. Оставить:
- Миссия (обновлённая: headless-пайплайн)
- Стек (обновлённый: без DnD, без React в корне)
- IR (без изменений)
- Реестр (без изменений)
- Кодген и LOGIC (без изменений)
- Экспорт (обновлённый)
- Пресеты (новый раздел)
- Не-цели (обновлённые)

**Удалить:** `AGENTS-STATUS.md`, `refactoring-3-report.md`.

---

### Шаг 12. Финальная проверка

Прогнать **всё**:

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Линтер
npm run lint

# 3. Тесты
npm test

# 4. Генерация из примера
npx tsx src/cli.ts --spec examples/test-project.json --out /tmp/final-test

# 5. Сгенерированный проект компилируется
cd /tmp/final-test && npm install && npx tsc --noEmit

# 6. Сгенерированный проект собирается
npm run build

# 7. Preview работает
cd <project-root>
npx tsx src/preview.ts examples/test-project.json
# → браузер открылся, Login-экран виден

# 8. В проекте нет мусора
ls src/
# → core/ codegen/ schema.ts schema.test.ts cli.ts preview.ts presets/

# 9. Нет упоминаний удалённых модулей
grep -r "dnd-kit\|Canvas\|Inspector\|Palette\|LayersPanel\|zustand\|zundo" src/
# → пусто

# 10. Пресеты валидны
npm test -- --grep preset
```

---

## 4. Железные правила (напоминание)

1. `strict` TS. Никаких `any` и `@ts-ignore`.
2. Код, идентификаторы, комментарии — английский.
3. Детерминизм кодгена: одинаковый spec → байт-в-байт одинаковый файл.
4. Файлы ≤ 300 строк.
5. Коммит после каждого шага. Conventional commits.
6. Перед коммитом: `npx tsc --noEmit && npm run lint && npm test`.
7. Tailwind v4, CSS-first. В `template/` нет `tailwind.config.js`.
8. shadcn-компоненты в `template/src/components/ui/` — **не трогать**.
   Они нужны для экспортируемого проекта.
9. Не добавлять зависимости кроме `zod` (уже согласовано).
10. Не создавать визуальный UI. Проект — headless. Единственный «интерфейс»
    — это CLI + браузер с результатом `vite dev`.

---

## 5. Чего НЕ делать

- Не переписывать `src/core/ir.ts` — это контракт.
- Не менять формат LOGIC-блока.
- Не менять `template/` (кроме случаев, когда codegen требует нового файла).
- Не добавлять React-зависимости в корневой `package.json`.
- Не создавать `tailwind.config.js` нигде.
- Не делать веб-интерфейс, форму, страницу для загрузки JSON.
  CLI + файлы. Всё.
- Не удалять `data-bn-id` из codegen.
- Не менять правила `canContain` в реестре без вопроса.