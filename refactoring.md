# BN-Builder — Инструкция по исправлению и улучшению

> Документ для агента. Цель: закрыть все найденные баги, несоответствия спецификации и улучшить код.
> Выполнять по разделам, после каждого раздела — коммит (`fix:` или `refactor:`).
> После каждого раздела: `npx tsc --noEmit && npm run lint && npm test` — всё зелёное.

---

## Раздел 1. Критичные исправления (блокируют реальное использование)

### 1.1. Недостающие CSS-переменные в TokenSet и generateCss

**Проблема:** `TokenSet.colors` не содержит `cardForeground`, `secondary`, `secondaryForeground`, `popover`, `popoverForeground`. Без них shadcn-компоненты (Button secondary, Select dropdown, Card) рендерятся с невидимым текстом / прозрачным фоном.

**Что сделать:**

1. В `src/core/ir.ts` расширить `TokenSet.colors`:

```ts
export interface TokenSet {
  colors: Record<
    | 'background' | 'foreground' | 'card' | 'cardForeground'
    | 'primary' | 'primaryForeground'
    | 'secondary' | 'secondaryForeground'
    | 'muted' | 'mutedForeground'
    | 'accent' | 'accentForeground'
    | 'destructive' | 'destructiveForeground'
    | 'popover' | 'popoverForeground'
    | 'border' | 'input',
    string
  >;
  radius: number;
  fonts: { sans: string; display?: string };
}
```

2. В `src/codegen/generate.ts` (`generateCss`) добавить деривацию для переменных, которые пользователь не редактирует напрямую, но которые нужны shadcn:

```ts
// После вывода основных переменных, добавить деривации:
const derived: Record<string, string> = {
  '--card-foreground': 'var(--foreground)',
  '--popover': 'var(--background)',
  '--popover-foreground': 'var(--foreground)',
  '--secondary': 'var(--muted)',
  '--secondary-foreground': 'var(--muted-foreground)',
  '--chart-1': 'var(--primary)',
  '--chart-2': 'var(--accent)',
  '--chart-3': 'var(--muted)',
  '--chart-4': 'var(--destructive)',
  '--chart-5': 'var(--border)',
};
```

Выводить деривации после основных переменных в `:root`, отсортированными по ключу.

3. Обновить `src/fixtures/demo-spec.ts` и `examples/test-project.json` — добавить новые ключи в `colors`.

4. Обновить `src/components/TokenColors.tsx` — сгруппировать новые пикеры:
   - Группа «Фоны»: background, foreground, card, cardForeground
   - Группа «Акценты»: primary, primaryForeground, secondary, secondaryForeground, muted, mutedForeground, accent, accentForeground
   - Группа «Системные»: popover, popoverForeground, destructive, destructiveForeground, border, input

5. Обновить snapshot-тесты кодгена (они сломаются из-за новых переменных — это ожидаемо, обновить снапшоты).

6. Обновить `src/components/TokenInjector.tsx` — инлайновые CSS-переменные на канвасе должны включать новые ключи.

**Проверка:** экспортировать demo-spec → в `index.css` присутствуют `--card-foreground`, `--secondary`, `--popover` и т.д. → `tsc` зелёный.

---

### 1.2. Заменить Math.random на nanoid

**Проблема:** `generateId()` в `src/store/editor.ts` использует `Math.random().toString(36)`. Спецификация требует nanoid.

**Что сделать:**

```ts
import { nanoid } from 'nanoid';

function generateId(): NodeId {
  return `n${nanoid(8)}`;
}
```

Удалить комментарий `// nanoid будет добавлен позже`.

**Проверка:** `npm test` — все тесты зелёные (если тесты завязаны на формат ID — обновить regex в assertions на `/^n[a-zA-Z0-9_-]{8}$/`).

---

### 1.3. Починить ID в wrapNode

**Проблема:** `wrapNode` генерирует ID как `nodeId + '_wrap'`. При undo → redo → wrap снова возникает коллизия с историей zundo.

**Что сделать:**

```ts
// Было:
const wrapperId = nodeId + '_wrap';

// Стало:
const wrapperId = generateId();
```

**Проверка:** тест — wrap → undo → wrap → ID разные.

---

## Раздел 2. Важные исправления

### 2.1. Сортировка ключей в generateCss

**Проблема:** `Object.entries(colors)` не сортируется. Два одинаковых по значению spec, созданных в разном порядке, дадут разный CSS → нарушение детерминизма.

**Что сделать:**

```ts
// В generateCss:
const sortedColors = Object.entries(spec.tokens.colors)
  .sort(([a], [b]) => a.localeCompare(b));

for (const [key, value] of sortedColors) {
  // ...
}
```

Аналогично для `derived` — сортировать по ключу перед выводом.

**Проверка:** тест — создать два TokenSet с одинаковыми значениями, но разным порядком ключей → `generateCss` выдаёт идентичный результат.

---

### 2.2. Валидация hex в color.ts

**Проблема:** `hexToOklch('#xyz')` → `NaN` в выводе. Не падает, но генерирует мусорный CSS.

**Что сделать:**

```ts
const HEX_RE = /^#([0-9a-f]{6})$/i;

export function hexToOklch(hex: string): string {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex color: "${hex}". Expected format: #rrggbb`);
  }
  // ... существующая логика
}
```

Добавить тесты:
- `hexToOklch('#xyz')` → throws
- `hexToOklch('red')` → throws
- `hexToOklch('#fff')` → throws (shorthand не поддерживаем, явно)
- `hexToOklch('#FF5733')` → корректный oklch

**Проверка:** 6 + 4 = 10 тестов в color.test.ts.

---

### 2.3. Select → составной компонент или убрать из палитры

**Проблема:** `Select` в реестре — `isContainer: false`, без детей. При дропе из палитры рендерится пустая оболочка `<Select />` без триггера и вариантов.

**Что сделать (вариант А — предпочтительный):**

Превратить Select в составной:

```ts
{
  id: 'Select',
  module: '@/components/ui/select',
  namedExport: 'Select',
  isContainer: true,
  defaults: {
    children: () => [
      { kind: 'component', id: '', component: 'SelectTrigger', children: [
        { kind: 'component', id: '', component: 'SelectValue', props: { placeholder: 'Выберите...' } }
      ]},
      { kind: 'component', id: '', component: 'SelectContent', children: [
        { kind: 'component', id: '', component: 'SelectItem', props: { value: 'option1' }, children: [
          { kind: 'text', id: '', text: 'Вариант 1' }
        ]},
      ]},
    ],
  },
  inspector: [
    { kind: 'text', target: 'prop', prop: 'placeholder', label: 'Placeholder' },
  ],
  events: ['onValueChange'],
}
```

Добавить в реестр: `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`.

Обновить `canContain`:
- `Select` → только `SelectTrigger | SelectContent`
- `SelectTrigger` → только `SelectValue`
- `SelectContent` → только `SelectItem`
- `SelectItem` → только `Text`

Обновить `template/src/components/ui/` — убедиться, что все sub-компоненты экспортируются.

**Проверка:** дроп Select из палитры → рендерится триггер + контент с одним вариантом. canContain-тесты обновлены.

---

### 2.4. Добавить Prettier

**Проблема:** Спецификация требует Prettier. В проекте его нет. Сгенерированный код форматируется вручную в кодгене, но если кто-то прогонит prettier поверх — будет diff.

**Что сделать:**

1. `npm i -D prettier`
2. Создать `.prettierrc` в корне:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

3. Скопировать `.prettierrc` в `template/`.
4. Добавить в `package.json` (корень и template): `"format": "prettier --write \"src/**/*.{ts,tsx,css}\""`.
5. Прогнать `npm run format` по всему проекту — зафиксировать результат коммитом `style: apply prettier`.

**Проверка:** `npx prettier --check "src/**/*.{ts,tsx}"` — 0 файлов требуют форматирования.

---

### 2.5. Убрать .js-расширения в импортах export.ts (или подтвердить корректность)

**Проблема:** `export.ts` генерирует `import Login from './screens/Login.js'`. Корректно для `moduleResolution: "bundler"`, но нужно убедиться, что template/tsconfig.app.json содержит именно `"moduleResolution": "bundler"`.

**Что сделать:**

1. Проверить `template/tsconfig.app.json` — должно быть:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

2. Если стоит `"node16"` или `"nodenext"` — заменить на `"bundler"`.
3. Если всё ок — добавить комментарий в `export.ts`:
```ts
// .js extensions in imports are required for ESM; moduleResolution: "bundler" in tsconfig handles this.
```

**Проверка:** `cd template && npx tsc --noEmit` после экспорта — 0 ошибок.

---

## Раздел 3. Улучшения (не баги, но сделают систему надёжнее)

### 3.1. Рефакторинг Card.defaults.children — убрать `id: '' as never`

**Проблема:** Тайп-хак. Если путь создания забудет назначить ID — в дереве узел с пустым id.

**Что сделать:**

Ввести фабрику `createNode(componentId: string): SpecNode` в `src/core/tree.ts`:

```ts
import { nanoid } from 'nanoid';

export function createNode(componentId: string): SpecNode {
  const def = registry[componentId];
  const id = `n${nanoid(8)}`;

  if (def.defaults.children) {
    return {
      kind: 'component',
      id,
      component: componentId,
      variants: def.defaults.variants ? { ...def.defaults.variants } : undefined,
      props: def.defaults.props ? { ...def.defaults.props } : undefined,
      className: def.defaults.className,
      children: def.defaults.children().map(child => assignIds(child)),
    };
  }

  return {
    kind: 'component',
    id,
    component: componentId,
    variants: def.defaults.variants ? { ...def.defaults.variants } : undefined,
    props: def.defaults.props ? { ...def.defaults.props } : undefined,
    className: def.defaults.className,
  };
}

function assignIds(node: SpecNode): SpecNode {
  const id = `n${nanoid(8)}`;
  if ('children' in node && node.children) {
    return { ...node, id, children: node.children.map(assignIds) };
  }
  return { ...node, id };
}
```

В `registry.ts` — `defaults.children` возвращает узлы **без** поля `id` (или с `id: ''`), а `createNode` назначает реальные ID.

Обновить `Palette.tsx` и `store/editor.ts` — использовать `createNode()` вместо ручного конструирования.

**Проверка:** тест — `createNode('Card')` → все узлы в дереве имеют уникальные ID формата `/^n[a-zA-Z0-9_-]{8}$/`.

---

### 3.2. DnD-стратегия: direction из data-атрибута, не из getComputedStyle

**Проблема:** `computeDropHint` определяет направление flex через `getComputedStyle(el).flexDirection`. Это: (а) layout thrashing при каждом dragMove, (б) зависит от CSS, а не от IR.

**Что сделать:**

1. В `CanvasRenderer.tsx` при рендере LayoutNode добавлять data-атрибут:
```tsx
<div data-bn-id={node.id} data-bn-direction={node.direction ?? 'column'} ...>
```

2. В `dnd-strategy.ts` заменить:
```ts
// Было:
const style = getComputedStyle(el);
const isRow = style.flexDirection === 'row';

// Стало:
const isRow = el.getAttribute('data-bn-direction') === 'row';
```

**Проверка:** drag-and-drop работает идентично (ручной чек-лист M3).

---

### 3.3. Error Boundary для канваса

**Проблема:** Если пользовательский spec содержит невалидные данные (битый JSON при импорте), канвас падает целиком.

**Что сделать:**

Добавить `src/components/CanvasErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full text-destructive">
          <div className="text-center space-y-2">
            <p className="font-medium">Ошибка рендера канваса</p>
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
            <button onClick={() => this.setState({ error: null })}>
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Обернуть `<Canvas />` в `Editor.tsx`.

---

### 3.4. Валидация spec при импорте JSON

**Проблема:** При импорте spec из JSON (M7, ProjectMenu) нет валидации. Битый JSON → краш.

**Что сделать:**

Добавить `src/core/validate.ts`:

```ts
export function validateProjectSpec(data: unknown): { ok: true; spec: ProjectSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { ok: false, errors: ['Spec must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) errors.push(`Unsupported version: ${obj.version}`);
  if (typeof obj.name !== 'string') errors.push('Missing or invalid "name"');
  if (!Array.isArray(obj.screens)) errors.push('"screens" must be an array');

  // ... рекурсивная валидация узлов: kind, id, component (в реестре?), children (массив?)
  // ... валидация tokens: все ключи colors — hex, radius — число, fonts — строки

  return errors.length === 0
    ? { ok: true, spec: data as ProjectSpec }
    : { ok: false, errors };
}
```

Использовать в `ProjectMenu.tsx` перед `setProject()`. При ошибке — toast с списком проблем.

**Проверка:** тесты — валидный spec → ok; битый JSON → errors; неизвестный component → error.

---

### 3.5. README.md для проекта

**Что сделать:** Создать `README.md`:

```markdown
# BN-Builder

Визуальный конструктор интерфейсов для Vite + React + TS + shadcn/ui + Tailwind v4.

## Быстрый старт

npm install
npm run dev

## Экспорт проекта

npx tsx scripts/export.ts --spec examples/test-project.json --out ../my-app

## Тесты

npm test

## Архитектура

См. AGENTS.md — полный технический документ.
```

---

### 3.6. Убрать пометку «M9» из ContextMenu.tsx

**Проблема:** В спеке нет M9. Пометка вводит в заблуждение.

**Что сделать:** В `AGENTS-STATUS.md` заменить `(M9)` на `(дополнительно, вне спеки)`. В коде — убрать любые комментарии с `M9`.

---

## Раздел 4. Тесты — дописать покрытие

### 4.1. Новые тесты для generateCss

- Два TokenSet с разным порядком ключей → идентичный CSS (детерминизм).
- Наличие дериваций (`--card-foreground`, `--secondary`, `--popover`) в выводе.
- `--ring` равен `var(--primary)`.
- `--radius` в rem (10px → `0.625rem`).

### 4.2. Новые тесты для createNode

- `createNode('Card')` → дерево с уникальными ID.
- `createNode('Button')` → листовой узел без children.
- `createNode('Select')` → составной с Trigger + Content + Item.

### 4.3. Новые тесты для validateProjectSpec

- Валидный spec → `{ ok: true }`.
- `version: 2` → ошибка.
- Неизвестный component → ошибка.
- `radius: "big"` → ошибка.
- Пустой screens → ошибка.

### 4.4. Тест для wrapNode ID

- wrap → undo → wrap → ID обёрток разные.

### 4.5. Тест для hexToOklch — невалидный вход

- `'#xyz'`, `'red'`, `'#fff'`, `''` → throws.

---

## Раздел 5. Финальная проверка

После всех разделов:

```bash
npx tsc --noEmit          # 0 errors
npm run lint              # 0 errors
npm test                  # все тесты зелёные (ожидается ~90+)
npx prettier --check "src/**/*.{ts,tsx}"  # 0 файлов требуют форматирования
npx tsx scripts/export.ts --spec examples/test-project.json --out /tmp/bn-test
cd /tmp/bn-test && npm i && npx tsc --noEmit && npm run build  # зелёные
```

Обновить `AGENTS-STATUS.md`:
- Добавить раздел «Исправления по ревью» с датой.
- Отметить все пункты из этой инструкции как ✅.
- Обновить счётчик тестов.

---

## Порядок выполнения и коммиты

| # | Раздел | Коммит |
|---|---|---|
| 1 | 1.1 — TokenSet + generateCss + деривации | `fix: add missing CSS variables (card-fg, secondary, popover)` |
| 2 | 1.2 — nanoid | `fix: replace Math.random with nanoid for node IDs` |
| 3 | 1.3 — wrapNode ID | `fix: use generateId() in wrapNode to prevent ID collision` |
| 4 | 2.1 — сортировка generateCss | `fix: sort color keys in generateCss for determinism` |
| 5 | 2.2 — валидация hex | `fix: validate hex input in hexToOklch` |
| 6 | 2.3 — Select составной | `feat: make Select a compound component with sub-entries` |
| 7 | 2.4 — Prettier | `style: add prettier config and format codebase` |
| 8 | 2.5 — .js импорты / tsconfig | `fix: verify moduleResolution bundler in template tsconfig` |
| 9 | 3.1 — createNode фабрика | `refactor: introduce createNode factory, remove id hacks` |
| 10 | 3.2 — dnd data-атрибут | `refactor: read flex direction from data attribute, not getComputedStyle` |
| 11 | 3.3 — Error Boundary | `feat: add CanvasErrorBoundary` |
| 12 | 3.4 — validate.ts | `feat: add spec validation on JSON import` |
| 13 | 3.5 — README | `docs: add README.md` |
| 14 | 3.6 — убрать M9 | `docs: fix milestone labels in AGENTS-STATUS.md` |
| 15 | 4.* — тесты | `test: expand coverage (css determinism, createNode, validation, hex)` |
| 16 | 5 — финальная проверка | `chore: update AGENTS-STATUS.md with review fixes` |

---

## Правила (напоминание)

1. `strict` TS, никаких `any` без комментария.
2. Код и комментарии — английский.
3. Один раздел = один коммит.
4. После каждого коммита: `tsc && lint && test` — зелёные.
5. Не добавлять зависимости сверх: nanoid (уже в package.json), prettier (dev).
6. Не менять IR-типы сверх того, что указано в разделе 1.1.
7. Не трогать LOGIC-контракт (маркеры, preserveLogic) — он работает корректно.
8. Если что-то в инструкции неоднозначно — спросить, не додумывать.