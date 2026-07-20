# BN-Builder

Визуальный конструктор интерфейсов на React. Позволяет собирать экраны из shadcn/ui-компонентов перетаскиванием и детерминированно генерировать готовый frontend-проект.

## Стек

- **Ядро:** Vite 7, React 19, TypeScript 5 (strict)
- **Стили:** Tailwind CSS 4 (CSS-first), shadcn/ui
- **Стор:** Zustand 5 + zundo (undo/redo)
- **Drag-and-drop:** @dnd-kit
- **Тесты:** Vitest

## Быстрый старт

```bash
npm install
npm run dev
```

## Команды

- `npm run dev` — Dev-сервер
- `npm test` — Запуск тестов
- `npm run lint` — Линтинг (oxlint)
- `npx tsc --noEmit` — Проверка TS

## Экспорт

Собранный проект экспортируется в отдельную папку:

```bash
npx tsx scripts/export.ts --spec examples/test-project.json --out ../my-app
```
