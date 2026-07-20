# BN-Builder — визуальный конструктор интерфейсов (Vite + React + TS + shadcn/ui + Tailwind v4)

> Рабочий документ агента. Лежит в корне репозитория (`AGENT.md`). Перечитывай его перед каждым майлстоуном.

---

## 0. Миссия и контекст

Мы строим визуальный конструктор, в котором человек собирает экраны из компонентов shadcn/ui, а конструктор **детерминированно** генерирует из этой схемы готовый фронтенд-проект. Сгенерированный код затем дорабатывается внешним AI-агентом — но **только в специально помеченных слотах** (LOGIC-блок). Визуальная структура — собственность конструктора, логика — собственность агента. Это ключевое разделение ответственности, ради которого всё затевается.

Следствия:
- Кодген обязан быть детерминированным: одинаковый spec → байт-в-байт одинаковый файл.
- Каждый узел в DOM получает `data-bn-id` — якорь для внешнего агента.
- LOGIC-блок в сгенерированном файле переживает любую перегенерацию нетронутым.
- **Стиль = данные.** Tailwind выбран не «для красоты», а потому что классы — это строки, которые хранятся в IR и выводятся конкатенацией. Никакой генерации CSS-файлов из конструктора, кроме одного `index.css` с токенами.

## 1. Стек и железные ограничения

| Слой | Решение |
|---|---|
| Ядро | Vite 7, React 19, TypeScript 5.x (`strict: true`) |
| Стили | **Tailwind CSS 4** (плагин `@tailwindcss/vite`, CSS-first конфигурация), shadcn/ui (последняя CLI-версия) |
| Стор | Zustand 5 + zundo 2 (undo/redo) |
| Drag-and-drop | @dnd-kit/core 6, @dnd-kit/sortable 10, @dnd-kit/utilities, @dnd-kit/modifiers |
| ID | nanoid (8 символов, префикс `n`) |
| Тесты | Vitest |
| Иконки редактора | lucide-react |
| Экспорт | Node-скрипт на tsx; jszip — опционально |

**Железные правила:**
1. `strict` TS. Никаких `any` и `@ts-ignore` без комментария с причиной.
2. Код, идентификаторы, комментарии в коде, коммиты — английский. Общение со мной — русский.
3. Новые зависимости — только через вопрос ко мне. Список выше закрыт.
4. Детерминизм кодгена: явная сортировка всего, что итерируется; никаких дат/рандома в выводе.
5. Коммит после каждого майлстоуна, conventional commits (`feat:`, `fix:`, `test:`).
6. Перед отчётом о майлстоуне: `npx tsc --noEmit`, `npm run lint`, `npm test` — всё зелёное.
7. Файлы ≤ 300 строк, где возможно — разбивай.
8. Неоднозначность в ТЗ → остановись и спроси. Не додумывай.
9. **Классы в IR — только из контролируемого словаря.** Инспектор генерирует `className` из пресетов (spacing, width, flex-свойства). Произвольный CSS и arbitrary-значения вида `w-[327px]` запрещены, кроме явных числовых полей инспектора, которые валидируются и превращаются в стандартные утилиты (`w-80`, `gap-4`, `p-6`...).
10. **Tailwind v4, только CSS-first.** Не создавать `tailwind.config.js`, не писать `content: [...]`, не использовать директивы `@tailwind base/components/utilities`. Конфигурация живёт в CSS: `@import "tailwindcss"` + блок `@theme inline`. Если рука тянется к `tailwind.config.js` — это галлюцинация из v3, остановись и перечитай Appendix D.

## 2. Архитектура

```
 palette ──┐
 canvas ───┼──▶ Zustand (ProjectSpec = IR) ──▶ codegen ──▶ screens/*.tsx + index.css + App.tsx
 inspector ┘            │                                   │
                        └──▶ живой рендер (edit/preview)     ▼
                                                       template/ ──▶ готовый проект/
```

**Единственный источник правды — реестр компонентов** (`src/core/registry.ts`). Он управляет сразу всем: содержимым палитры, рендером на канвасе, полями инспектора, импортами в кодгене. Добавление компонента = одна запись в реестре, ноль правок в других местах.

## 3. Доменная модель (IR)

Создай дословно (это контракт, менять нельзя без вопроса):

```ts
// src/core/ir.ts
export type NodeId = string; // 'n' + nanoid(8)

export interface ComponentNode {
  kind: 'component';
  id: NodeId;
  component: string;                    // id из реестра: 'Button', 'Card', ...
  variants?: Record<string, string>;    // { variant: 'outline', size: 'sm' }
  props?: Record<string, string | number | boolean>; // placeholder, disabled...
  className?: string;                   // только tailwind-утилиты из контролируемого словаря
  events?: Record<string, string>;      // { onClick: 'handleSubmit' } — имя функции в LOGIC-блоке
  children?: SpecNode[];
}

export interface LayoutNode {
  kind: 'layout';
  id: NodeId;
  display: 'flex' | 'grid';
  direction?: 'row' | 'column';
  gap?: number;                         // → gap-{n}
  align?: string;                       // 'center' | 'start' | 'end' | 'stretch'
  justify?: string;
  wrap?: boolean;
  className?: string;
  children: SpecNode[];
}

export interface TextNode {
  kind: 'text';
  id: NodeId;
  text: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  className?: string;
}

export interface CodeNode {
  kind: 'code';
  id: NodeId;
  label: string;                        // 'CustomChart'
  source: string;                       // хранится и выводится дословно, никогда не трансформируется
}

export type SpecNode = ComponentNode | LayoutNode | TextNode | CodeNode;

export interface TokenSet {
  colors: Record<
    | 'background' | 'foreground' | 'card'
    | 'primary' | 'primaryForeground'
    | 'muted' | 'mutedForeground'
    | 'accent' | 'accentForeground'
    | 'destructive' | 'destructiveForeground'
    | 'border' | 'input',
    string                              // hex '#rrggbb'
  >;
  radius: number;                       // px
  fonts: { sans: string; display?: string }; // имена Google Fonts
}

export interface ScreenSpec {
  version: 1;
  id: string;
  name: string;                         // 'Login' → файл Login.tsx
  route: string;                        // '/login'
  tokens: TokenSet;
  root: LayoutNode;                     // корень — всегда layout, неудаляем
}

export interface ProjectSpec {
  version: 1;
  name: string;
  screens: ScreenSpec[];
}
```

## 4. Реестр компонентов

```ts
// src/core/registry.ts
export interface ComponentDef {
  id: string;                           // 'Button'
  module: string;                       // '@/components/ui/button'
  namedExport: string;                  // 'Button'
  isContainer: boolean;
  defaults: {
    variants?: Record<string, string>;
    props?: Record<string, unknown>;
    className?: string;
    children?: () => SpecNode[];        // Card → [CardHeader, CardContent]
  };
  inspector: InspectorField[];
  events?: string[];                    // ['onClick'] — разрешённые события
}

export type InspectorField =
  | { kind: 'select'; target: 'variant' | 'prop'; prop: string; label: string; options: string[] }
  | { kind: 'text'; target: 'prop' | 'text'; prop: string; label: string }
  | { kind: 'toggle'; target: 'prop'; prop: string; label: string }
  | { kind: 'spacing'; label: string }; // пресеты margin/padding → className
```

MVP-состав: `Button, Input, Label, Textarea, Checkbox, Switch, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Alert, Separator, Avatar, Progress, Tabs, TabsList, TabsTrigger, TabsContent`.

**Правила вложенности** (`canContain(parent, child): boolean`, покрыть unit-тестами):
- `LayoutNode` принимает всё.
- `Card` → только `CardHeader | CardContent | CardFooter`.
- `CardHeader` → только `CardTitle | CardDescription | Text`.
- `CardContent`, `CardFooter`, `Alert` → всё, кроме семейства Card и Tabs.
- `Tabs` → только `TabsList | TabsContent`; `TabsList` → только `TabsTrigger`; `TabsContent` → всё, кроме семейства Tabs.
- Листовые компоненты (`Button`, `Input`, ...) и `CodeNode` не принимают ничего.

## 5. Стор

```ts
// src/store/editor.ts — Zustand + zundo (temporal, limit: 100)
interface EditorState {
  project: ProjectSpec;
  activeScreenId: string;
  selectedId: NodeId | null;
  dropHint: DropHint | null;            // транзиент, ИСКЛЮЧЁН из undo (partialize)

  insertNode(parentId: NodeId, index: number, node: SpecNode): void;
  moveNode(nodeId: NodeId, toParentId: NodeId, toIndex: number): void;
  removeNode(nodeId: NodeId): void;
  patchNode(nodeId: NodeId, patch: Partial<SpecNode>): void;
  setTokens(patch: DeepPartial<TokenSet>): void;
  select(id: NodeId | null): void;
  setDropHint(h: DropHint | null): void;
  undo(): void;
  redo(): void;
}
```

Требования:
- Все операции над деревом — иммутабельная рекурсия через утилиту `mapNode(root, id, fn)` (`src/core/tree.ts`).
- `moveNode` обязан отклонять перенос узла в собственного потомка (guard + тест).
- `removeNode` неприменим к `root`.
- Тесты: insert/move/remove/patch, guard потомка, undo/redo через `useTemporalStore`.

## 6. Канвас и drag-and-drop

**Рендер без обёрток.** Никаких wrapper-div вокруг узлов — они ломают flex/grid. dnd-слушатели, `data-bn-id` и обработчик выделения навешиваются **проп-спредом на корневой элемент компонента** (shadcn-компоненты пробрасывают props и ref). Для составных (`Select`, `Tabs`) — на корневой контейнер. Выделение — условный className `shadow-[0_0_0_2px_var(--bn-accent)]` (не влияет на layout).

**DnD-схема:**
- `DndContext`, сенсоры: `PointerSensor { activationConstraint: { distance: 6 } }` + `KeyboardSensor`.
- Draggable: элементы палитры (`palette:{component}`), узлы канваса (`move:{id}` — за drag-ручку на выделенном узле, чтобы клик оставался выделением).
- Droppable: каждый узел канваса (`node:{id}`).
- `DragOverlay`: чип с именем компонента + иконкой, `restrictToWindowEdges`.

**Алгоритм резолва дропа** (кастомная `collisionDetection: treeStrategy`):
1. `pointerWithin` по контейнерам, прошедшим `canContain(draggedType, container)` → нашли активный контейнер.
2. Индекс внутри контейнера: проекция указателя на главную ось контейнера, сравнение с серединами детей → `index`.
3. Если указатель вне любого контейнера — `closestCenter` по узлам; половина указателя (верх/них или лево/право) → `before | after` относительно этого узла (вставка в его родителя).
4. Результат — `DropHint { parentId, index, edge: 'top' | 'bottom' | 'inside' }` в транзиент-стор.

**Индикаторы:** один глобальный абсолютно-позиционированный элемент, координаты — из `getBoundingClientRect` цели. `top/bottom` → линия 2px акцентного цвета между детьми; `inside` → пунктирная рамка контейнера.

**Запрещённый дроп** (canContain = false): индикатор не показывается, `onDragEnd` — no-op.

## 7. Токены и тема (Tailwind v4, CSS-first)

- Токены применяются к канвасу скоупленно: CSS-переменные инлайном на контейнер канваса (хром редактора тему пользователя не наследует).
- Формат вывода в кодген — `oklch(...)` (родной формат shadcn v4). Утилита `hexToOklch` в `src/core/color.ts` + unit-тесты (`#000000` → `oklch(0 0 0)`, `#ffffff` → `oklch(1 0 0)`).
- `--ring` выводится равным `--primary`. `--radius` → rem (`radius / 16`).
- Шрифты: kurаторский список с **обязательной кириллицей**: Inter, Manrope, Golos Text, Onest, Unbounded, JetBrains Mono. Кодген — `<link>` на Google Fonts в index.html. В редакторе — хук `useFontLoader`, подменяющий link при смене токенов.
- UI редактора токенов: сгруппированные color-пикеры (фоны / акценты / destructive), слайдер radius, селекты шрифтов.

**Точный формат `index.css`, который выдаёт кодген** (v4, без config-файла):

```css
@import "tailwindcss";

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: var(--primary);
  --radius: 0.625rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Unbounded", var(--font-sans);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans; }
}
```

## 8. Кодген и LOGIC-контракт

`src/codegen/generate.ts`: `generateScreen(spec, opts?: { prevTsx?: string }) → { tsx, css, htmlHead }`.

Правила вывода:
- Импорты: react → ui-модули (алфавит по пути модуля), дубликаты сливаются.
- Порядок пропсов узла: `data-bn-id` → variants → props (алфавит) → `className` → события.
- `className`: дефолт реестра + className узла, конкатенация с дедупликацией, без `cn()` в выводе.
- Одиночный TextNode-ребёнок — инлайн, иначе multiline. Indent 2 пробела, singleQuote, semi, trailingComma 'all' (совпадает с prettier шаблона).
- Каждый узел — `data-bn-id="{id}"`.

**LOGIC-блок** — единственное место для внешнего агента:

```
// ── BN:LOGIC:BEGIN ── do not move, do not reformat ──
// ── BN:LOGIC:END ──
```

`src/codegen/logic.ts`:
- `defaultStubs(spec)`: для каждого `events[*]` → `function {name}() { /* TODO */ }`.
- `preserveLogic(prevTsx, nextTsx)`: извлечь блок из prev регуляркой; если есть — вставить дословно вместо стабов, затем **дозаписать** стабы для event-имён, отсутствующих в старом блоке (дифф по `function\s+(\w+)`). Если блока нет — стабы по умолчанию.
- Блок никогда не переформатируется.

Шапка файла:
```ts
// GENERATED by BN-Builder · screen "{name}"
// Structure is owned by the builder. Logic edits: BN:LOGIC block only. Do not remove data-bn-id.
```

Тесты: snapshot-тесты кодгена; тест «перегенерация сохраняет LOGIC»; тест «новый event получил стаб, старые функции не тронуты».

## 9. Экспорт

`template/` — готовый vite-проект (Tailwind v4 через `@tailwindcss/vite`, shadcn, `components/ui/*` для всего реестра, `lib/utils.ts`), лежит в репозитории конструктора. В шаблоне **нет** `tailwind.config.js` — тема приходит из сгенерированного `index.css`.

`scripts/export.ts` (запуск `npx tsx scripts/export.ts --out ../exported`):
1. Копирует `template/`.
2. Записывает `src/screens/*.tsx` (codegen), `src/index.css` (токены → oklch-переменные, формат из раздела 7), `src/App.tsx` (react-router, маршруты из spec), `index.html` (шрифты, title).
3. Валидация в скрипте: `npx tsc --noEmit` в целевой папке.

## 10. Майлстоуны — выполнять строго по одному

> После каждого майлстоуна: **чекпоинт**. Остановись, прогони проверки, отрапортуй: сделано / результаты команд / план на следующий. Продолжай только после моего подтверждения.

**M0 — Скелет.** Vite+React+TS strict; **Tailwind 4 через `@tailwindcss/vite`** (в `src/index.css` — `@import "tailwindcss"`, тема через `@theme inline`; файла `tailwind.config.js` быть не должно); `shadcn init`; ESLint, Prettier, Vitest. Layout редактора: палитра | канвас | инспектор (shadcn-хром). *Проверка:* dev-сервер, tsc, lint; `ls tailwind.config.*` — пусто.
**M1 — Ядро.** `ir.ts`, `registry.ts` (весь MVP-состав), `tree.ts`, стор + undo/redo. *Проверка:* unit-тесты зелёные.
**M2 — Канвас.** Рекурсивный рендер spec, выделение, инспектор по `registry.inspector`, панель слоёв, режим Preview (рендер без хрома, ширины 375/768/1280), демо-spec из Приложения А как фикстура. *Проверка:* чек-лист вручную.
**M3 — Drag-and-drop.** Всё из раздела 6. *Проверка:* чек-лист — дроп из палитры, reorder, вложенность, запрещённый дроп отклонён, индикаторы, undo после переноса.
**M4 — Токены.** Редактор темы из раздела 7, `color.ts` + тесты, live-применение на канвасе.
**M5 — Кодген.** Всё из раздела 8. *Проверка:* сгенерированный экран компилируется в fixture-проекте (`tsc`), тесты сохранения LOGIC.
**M6 — Экспорт.** Всё из раздела 9. *Проверка:* экспортированный проект: `npm i && npx tsc --noEmit && npm run build` — зелёные.
**M7 — Полировка.** Хоткеи (Delete, ⌘Z/⌘⇧Z), автосохранение в localStorage, импорт/экспорт spec-JSON, управление списком экранов (добавить/переименовать/удалить), empty states.

## 11. Не-цели (не делать, даже если очень хочется)

Бэкенд, авторизация, БД. Sandpack/WebContainers. Импорт существующего кода. Произвольные npm-компоненты. Figma-импорт. AI внутри конструктора. Тёмная тема. Коллаборация. Мобильная версия редактора. Кастомный CSS сверх tailwind-утилит.

## 12. Приложение А — демо-спека (фикстура M2)

```json
{
  "version": 1, "id": "p1", "name": "demo",
  "screens": [{
    "version": 1, "id": "s1", "name": "Login", "route": "/login",
    "tokens": {
      "colors": {
        "background": "#ffffff", "foreground": "#0a0a0a", "card": "#ffffff",
        "primary": "#171717", "primaryForeground": "#fafafa",
        "muted": "#f5f5f5", "mutedForeground": "#737373",
        "accent": "#f5f5f5", "accentForeground": "#171717",
        "destructive": "#dc2626", "destructiveForeground": "#fafafa",
        "border": "#e5e5e5", "input": "#e5e5e5"
      },
      "radius": 10,
      "fonts": { "sans": "Inter", "display": "Unbounded" }
    },
    "root": {
      "kind": "layout", "id": "n1", "display": "flex", "direction": "column",
      "gap": 4, "align": "center", "justify": "center", "className": "min-h-screen",
      "children": [{
        "kind": "component", "id": "n2", "component": "Card", "className": "w-80",
        "children": [
          { "kind": "component", "id": "n3", "component": "CardHeader", "children": [
              { "kind": "component", "id": "n4", "component": "CardTitle", "children": [
                  { "kind": "text", "id": "n5", "text": "Вход в аккаунт" } ] } ] },
          { "kind": "component", "id": "n6", "component": "CardContent", "children": [
              { "kind": "component", "id": "n7", "component": "Input",
                "props": { "placeholder": "Email" }, "events": { "onChange": "onEmail" } },
              { "kind": "component", "id": "n8", "component": "Button",
                "className": "w-full", "events": { "onClick": "submit" },
                "children": [ { "kind": "text", "id": "n9", "text": "Войти" } ] } ] }
        ]
      }]
    }
  }]
}
```

## 13. Приложение Б — ожидаемый вид Login.tsx после кодгена

```tsx
// GENERATED by BN-Builder · screen "Login"
// Structure is owned by the builder. Logic edits: BN:LOGIC block only. Do not remove data-bn-id.
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// ── BN:LOGIC:BEGIN ── do not move, do not reformat ──
function onEmail(e: React.ChangeEvent<HTMLInputElement>) { /* TODO */ }
function submit() { /* TODO */ }
// ── BN:LOGIC:END ──

export default function Login() {
  return (
    <div data-bn-id="n1" className="min-h-screen flex flex-col gap-4 items-center justify-center">
      <Card data-bn-id="n2" className="w-80">
        <CardHeader data-bn-id="n3">
          <CardTitle data-bn-id="n4">Вход в аккаунт</CardTitle>
        </CardHeader>
        <CardContent data-bn-id="n6">
          <Input data-bn-id="n7" placeholder="Email" onChange={onEmail} />
          <Button data-bn-id="n8" className="w-full" onClick={submit}>Войти</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 14. Приложение В — формат task-файла для агента логики (контракт)

```json
{
  "task": "add-email-validation",
  "screen": "Login",
  "target": "src/screens/Login.tsx",
  "anchor": "n7",
  "instruction": "Добавить валидацию email для Input с data-bn-id='n7'. Реализация — только внутри BN:LOGIC-блока.",
  "rules": [
    "не изменять JSX вне BN:LOGIC-блока",
    "не удалять и не переименовывать data-bn-id",
    "не переносить и не переформатировать BN:LOGIC-блок"
  ],
  "verify": ["npx tsc --noEmit", "npm run lint"]
}
```

## 15. Приложение D — Tailwind v4: антигаллюцинационный чек-лист

Перед коммитом всего, что касается стилей, проверь:

- [ ] В репозитории **нет** `tailwind.config.js` / `tailwind.config.ts` / `postcss.config.js`.
- [ ] В CSS **нет** директив `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` — вместо них одна строка `@import "tailwindcss";`.
- [ ] В `vite.config.ts` подключён плагин `@tailwindcss/vite`.
- [ ] Тема описана в CSS: переменные в `:root` + маппинг в `@theme inline` (формат — раздел 7).
- [ ] Цвета в `oklch(...)`, не в hex и не в `hsl()` (hex допустим только как входной формат `TokenSet` в IR).
- [ ] В IR нет arbitrary-значений (`w-[...]`, `bg-[#...]`), кроме разрешённых пресетов инспектора.
- [ ] `npm ls tailwindcss` показывает версию `4.x`.

Если хоть один пункт не выполняется — ты где-то применяешь паттерны Tailwind v3. Исправь до чекпоинта.

## 16. Глоссарий

- **IR / spec** — JSON-дерево экрана, единственный источник правды.
- **Узел** — элемент дерева (`ComponentNode | LayoutNode | TextNode | CodeNode`).
- **data-bn-id** — сквозной якорь узла в DOM и в коде.
- **LOGIC-блок** — огороженная зона в сгенерированном файле для внешнего агента.
- **DropHint** — транзиентное состояние «куда упадёт dragged».
- **CSS-first** — конфигурация Tailwind v4 через CSS (`@theme`), без JS-config-файла.