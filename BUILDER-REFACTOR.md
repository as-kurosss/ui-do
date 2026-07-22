# REFACTOR-PASS-2: Удаление мусора и финализация

Предыдущий агент добавил новую функциональность (schema, cli, presets, 
AGENT-PROMPT), но НЕ удалил старый визуальный редактор и НЕ обновил 
конфигурацию. Исправить.

## 1. Удалить файлы и каталоги

rm -rf src/components/
rm -rf src/hooks/
rm -rf src/store/
rm -rf src/fixtures/
rm -rf src/lib/
rm -rf src/testing/
rm src/App.tsx src/main.tsx src/index.css
rm index.html vite.config.ts components.json
rm -rf public/
rm AGENTS-STATUS.md refactoring-3-report.md

## 2. Переписать package.json

Удалить ВСЕ зависимости, кроме:
  dependencies: nanoid, zod
  devDependencies: @types/node, oxlint, prettier, tsx, typescript, vitest

Удалить скрипты dev, build (vite), preview (vite).
Добавить скрипты:
  "generate": "tsx src/cli.ts"
  "preview": "tsx src/preview.ts"
  "build": "tsc --noEmit"

rm -rf node_modules package-lock.json && npm install

## 3. Переписать tsconfig.json

Убрать всё Vite-специфичное. target ES2022, module ESNext, 
moduleResolution bundler, types ["node"]. 
Удалить tsconfig.app.json и tsconfig.node.json если есть.

## 4. Создать vitest.config.ts

import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});

## 5. Починить specNodeSchema

Заменить z.union на z.discriminatedUnion('kind', [...]) 
для точных ошибок валидации.

## 6. Разобраться с blockId / blockLogic / blockExtraImports

Если codegen их использует — оставить и добавить в AGENT-PROMPT.md.
Если нет — удалить из схемы.

## 7. Ветка main

Сделать main активной веткой (git checkout main, merge master 
или reset на master). Убедиться что GitHub default branch 
показывает актуальный код.

## 8. Финальная проверка

npx tsc --noEmit
npm run lint  
npm test
npx tsx src/cli.ts --spec examples/test-project.json --out /tmp/test
cd /tmp/test && npm install && npx tsc --noEmit
grep -r "dnd-kit\|zustand\|zundo\|Canvas\|Inspector\|Palette" src/
# → должно быть пусто