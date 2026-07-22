# ui-do — Headless IR → Codegen Pipeline

> Рабочий документ агента. Перечитывай перед каждым майлстоуном.

---

## 0. Миссия и контекст

Headless-пайплайн: AI-агент генерирует JSON-спецификацию (ProjectSpec),
ui-do валидирует её и детерминированно превращает в готовый фронтенд-проект.
Визуальный конструктор удалён — он был лишним слоем.

Следствия:
- Кодген обязан быть детерминированным: одинаковый spec → байт-в-байт одинаковый файл.
- Каждый узел в DOM получает `data-bn-id` — якорь для внешнего агента.
- LOGIC-блок в сгенерированном файле переживает любую перегенерацию нетронутым.
- **Стиль = данные.** Tailwin-классы — строки, которые хранятся в IR и выводятся конкатенацией.

## 1. Стек

| Слой | Решение |
|---|---|
| Ядро | TypeScript 6.x (`strict: true`), Node.js/tsx |
| Стили | Tailwind CSS 4 (CSS-first), shadcn/ui (в шаблоне) |
| ID | nanoid (8 символов, префикс `n`) |
| Валидация | zod 3.x |
| Тесты | Vitest |
| Сборка | tsc (проверка), template/ (Vite для экспорта) |

**Железные правила:**
1. `strict` TS. Никаких `any` и `@ts-ignore`.
2. Детерминизм кодгена: явная сортировка всего, что итерируется; никаких дат/рандома в выводе.
3. Файлы ≤ 300 строк, где возможно — разбивай.
4. Tailwind v4, только CSS-first. Без `tailwind.config.js`.
5. Перед коммитом: `npx tsc --noEmit && npm run lint && npm test`.

## 2. Архитектура

```
JSON-spec (агент)
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

**Единственный источник правды — реестр компонентов** (`src/core/registry.ts`).

## 3. Доменная модель (IR)

См. `src/core/ir.ts` — контракт, менять без вопроса нельзя.

## 4. Реестр компонентов

См. `src/core/registry.ts`. Там же `canContain(parent, child)` для правил вложенности.

## 5. Валидация (zod)

`src/schema.ts` — zod-схема, один-в-один с типами IR. Используется в CLI и export-скрипте.

## 6. Кодген и LOGIC-контракт

`src/codegen/generate.ts`:
- `generateScreen(spec, opts?) → { tsx, css, htmlHead }`
- `generateAppTsx(screens) → string` — App.tsx с роутингом
- `generateCss(spec) → string` — index.css в oklch формате
- `generateHtmlHead(spec) → string` — Google Fonts <link>
- `generateIndexHtml(template, title, fontLink) → string` — index.html

**LOGIC-блок:**
```
// ── BN:LOGIC:BEGIN ── do not move, do not reformat ──
// ── BN:LOGIC:END ──
```
`src/codegen/logic.ts`:
- `defaultStubs(spec)`: для каждого `events[*]` → `function {name}() { /* TODO */ }`.
- `preserveLogic(prevTsx, nextTsx)`: сохраняет старый LOGIC-блок, добавляет стабы для новых событий.

## 7. CLI и Preview

- `src/cli.ts` — основная точка входа: `--spec <file> --out <dir>`
- `src/preview.ts` — генерация + `vite dev` в temp-директории: `tsx src/preview.ts <spec>`

## 8. Пресеты

`src/presets/` — 6 готовых layout-шаблонов:
- `blank` — пустая колонка
- `auth` — центрированная карточка
- `landing` — hero + features + CTA + footer
- `dashboard` — sidebar + grid виджетов
- `settings` — навигация слева + форма справа
- `list-detail` — список слева + детали справа

## 9. Экспорт

`template/` — полный Vite-проект. `scripts/export.ts` — валидация + генерация + `npm install` + `tsc`.

## 10. Не-цели

Веб-интерфейс, бэкенд, БД, авторизация, Figma-импорт, AI внутри пайплайна.

## 11. Приложения

- **Приложение А** — `examples/test-project.json` (демо-спека)
- **Приложение Б** — `AGENT-PROMPT.md` (инструкция для AI-агента)
- **Приложение В** — `BUILDER-REFACTOR.md` (документ рефакторинга)

## 12. Глоссарий

- **IR / spec** — JSON-дерево экрана, единственный источник правды.
- **Узел** — элемент дерева (`ComponentNode | LayoutNode | TextNode | CodeNode`).
- **data-bn-id** — сквозной якорь узла в DOM и в коде.
- **LOGIC-блок** — огороженная зона в сгенерированном файле для внешнего агента.
- **CSS-first** — конфигурация Tailwind v4 через CSS (`@theme`), без JS-config-файла.
- **Пресет** — готовый LayoutNode с плейсхолдер-идами.

## 13. Tailwind v4: антигаллюцинационный чек-лист

- [ ] Нет `tailwind.config.js` / `postcss.config.js`
- [ ] В CSS нет `@tailwind base;` — только `@import "tailwindcss";`
- [ ] Тема: `:root` с переменными + `@theme inline`
- [ ] Цвета в `oklch(...)`
- [ ] В IR нет arbitrary Tailwind (`w-[...]`)
