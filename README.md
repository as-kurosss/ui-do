# ui-do

Headless-пайплайн: JSON-спецификация → детерминированный codegen → готовый
React + Tailwind + shadcn/ui проект.

## Как это работает

1. AI-агент (или человек) пишет JSON-spec по схеме
2. `npx tsx src/cli.ts --spec spec.json --out ./my-app`
3. `cd ./my-app && npm install && npm run dev`

## Команды

- `npm run generate -- --spec <file> --out <dir>` — генерация проекта
- `npm run preview -- <file>` — генерация + живой preview
- `npm run export -- --spec <file> --out <dir>` — генерация + установка зависимостей + валидация
- `npm test` — тесты (vitest)
- `npm run lint` — линтинг (oxlint)
- `npx tsc --noEmit` — проверка TypeScript

## Структура

- `src/core/` — IR, реестр компонентов, tree-операции, валидация
- `src/codegen/` — детерминированный codegen, LOGIC-контракт
- `src/schema.ts` — zod-валидация входного JSON
- `src/presets/` — layout-пресеты (6 готовых шаблонов)
- `src/cli.ts` — CLI точка входа (generate)
- `src/preview.ts` — скрипт живого preview
- `template/` — шаблон Vite-проекта для экспорта
- `AGENT-PROMPT.md` — инструкция для AI-агента

## Для AI-агентов

Читай `AGENT-PROMPT.md`. Генерируй JSON по схеме. Валидируй перед отправкой.

## Пример

```bash
# Сгенерировать проект из примера
tsx src/cli.ts --spec examples/test-project.json --out /tmp/my-app
cd /tmp/my-app && npm install && npm run dev
```
