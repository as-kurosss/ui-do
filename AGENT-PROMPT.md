# UI-DO: Инструкция для агента-генератора интерфейсов

## Твоя задача

Ты генерируешь JSON-спецификацию (ProjectSpec) для пайплайна ui-do.
На выходе — JSON-файл, который превращается в рабочий React + Tailwind проект
с shadcn/ui компонентами.

## Процесс

1. Пользователь описывает желаемый экран(ы) словами
2. Ты выбираешь подходящий layout-пресет (или строишь с нуля)
3. Ты заполняешь дерево компонентами, текстами, стилями
4. Ты генерируешь JSON-файл согласно схеме ниже
5. Пользователь запускает `npm run generate -- --spec spec.json --out ./app`
6. Готовый проект открывается в браузере

## Формат спецификации (ProjectSpec)

```jsonc
{
  "version": 1,
  "name": "my-project",        // Имя проекта
  "screens": [                  // Массив экранов, минимум 1
    {
      "version": 1,
      "id": "s1",               // Уникальный ID экрана
      "name": "Login",          // → файл Login.tsx (PascalCase, без пробелов)
      "route": "/login",        // Начинается с /
      "tokens": { /* см. Цветовые токены */ },
      "root": { /* LayoutNode — корень экрана */ },
      "blockLogic": "// ── BN:LOGIC:BEGIN ── ...",  // опционально: кастомный LOGIC-блок
      "blockExtraImports": ["import ..."]           // опционально: доп. импорты
    }
  ]
}
```

## Типы узлов дерева

### LayoutNode — контейнер-компоновщик

```jsonc
{
  "kind": "layout",
  "id": "n1",                   // Уникальный в пределах экрана
  "display": "flex",            // "flex" | "grid"
  "direction": "column",        // "row" | "column" (только для flex)
  "gap": 4,                     // 0–24, шаг 4px (Tailwind spacing scale)
  "align": "center",            // "start" | "center" | "end" | "stretch"
  "justify": "center",          // flex-выравнивание
  "wrap": false,                // flex-wrap
  "className": "min-h-screen",  // Только Tailwind-утилиты, без w-[...]
  "children": [ /* SpecNode[] */ ]
}
```

### ComponentNode — shadcn/ui компонент

```jsonc
{
  "kind": "component",
  "id": "n2",
  "component": "Button",        // ID из реестра (см. таблицу ниже)
  "variants": {                 // Варианты компонента
    "variant": "default",
    "size": "default"
  },
  "props": {                    // Пропсы (строки, числа, булевы)
    "placeholder": "Email",
    "disabled": false
  },
  "className": "w-full",        // Tailwind-утилиты (без arbitrary)
  "events": {                   // Обработчики → попадают в LOGIC-блок
    "onClick": "handleSubmit"
  },
  "children": [ /* SpecNode[] */ ]
}
```

### TextNode — текст

```jsonc
{
  "kind": "text",
  "id": "n3",
  "text": "Hello World",
  "as": "p",                    // "p" | "h1" | "h2" | "h3" | "span"
  "className": "text-lg font-bold"
}
```

### CodeNode — произвольный JSX (для кастомных блоков)

```jsonc
{
  "kind": "code",
  "id": "n4",
  "label": "CustomChart",
  "source": "<LineChart data={data} />",
  "blockId": "my-chart-block"        // опционально: ID блока для кастомной логики
}
```

## Цветовые токены

18 обязательных цветовых ролей в формате `#rrggbb`:

| Роль | Пример | Назначение |
|---|---|---|
| `background` | `#ffffff` | Фон страницы |
| `foreground` | `#0a0a0a` | Основной текст |
| `card` | `#ffffff` | Фон карточек |
| `cardForeground` | `#0a0a0a` | Текст в карточках |
| `primary` | `#171717` | Основной акцентный цвет |
| `primaryForeground` | `#fafafa` | Текст на primary |
| `secondary` | `#f5f5f5` | Вторичный цвет |
| `secondaryForeground` | `#737373` | Текст на secondary |
| `muted` | `#f5f5f5` | Приглушённый фон |
| `mutedForeground` | `#737373` | Приглушённый текст |
| `accent` | `#f5f5f5` | Акцентный фон |
| `accentForeground` | `#171717` | Текст на accent |
| `popover` | `#ffffff` | Фон всплывающих окон |
| `popoverForeground` | `#0a0a0a` | Текст в popover |
| `destructive` | `#dc2626` | Деструктивные действия |
| `destructiveForeground` | `#fafafa` | Текст на destructive |
| `border` | `#e5e5e5` | Границы |
| `input` | `#e5e5e5` | Границы полей ввода |

Дополнительные поля:
- `radius: number` — скругление в px (0–24)
- `fonts: { sans: string, display?: string }` — имена шрифтов (с кириллицей)

## Доступные компоненты

| ID | Контейнер? | Варианты | Пропсы | События |
|---|---|---|---|---|
| **Button** | Да | `variant`: default/outline/secondary/ghost/destructive/link<br>`size`: default/xs/sm/lg/icon | `disabled` | `onClick` |
| **Input** | Нет | — | `placeholder`, `disabled` | `onChange`, `onFocus`, `onBlur` |
| **Label** | Нет | — | `children` | — |
| **Textarea** | Нет | — | `placeholder`, `disabled` | `onChange`, `onFocus`, `onBlur` |
| **Checkbox** | Нет | — | `checked`, `disabled` | `onCheckedChange` |
| **Switch** | Нет | — | `checked` | `onCheckedChange` |
| **Select** | Да | — | `placeholder` | `onValueChange` |
| **SelectTrigger** | Нет | — | — | — |
| **SelectValue** | Нет | — | — | — |
| **SelectContent** | Да | — | — | — |
| **SelectItem** | Нет | — | `value` | — |
| **Card** | Да | — | — | — |
| **CardHeader** | Да | — | — | — |
| **CardTitle** | Нет | — | `text` | — |
| **CardDescription** | Нет | — | `text` | — |
| **CardContent** | Да | — | — | — |
| **CardFooter** | Да | — | — | — |
| **Badge** | Нет | `variant`: default/secondary/outline/destructive | — | — |
| **Alert** | Да | `variant`: default/destructive | — | — |
| **Separator** | Нет | — | — | — |
| **Avatar** | Нет | — | — | — |
| **Progress** | Нет | — | `value` | — |
| **Tabs** | Да | — | — | — |
| **TabsList** | Да | — | — | — |
| **TabsTrigger** | Нет | — | `value` | — |
| **TabsContent** | Да | — | `value` | — |
| **AppSidebar** | Да | — | — | — |
| **SidebarProvider** | Да | — | — | — |
| **Sidebar** | Да | `collapsible`: offcanvas/icon/none<br>`side`: left/right<br>`variant`: sidebar/floating/inset | — | — |

## Правила вложенности

- `LayoutNode` — принимает всё
- `Card` → только `CardHeader`, `CardContent`, `CardFooter`
- `CardHeader` → только `CardTitle`, `CardDescription`
- `CardContent`, `CardFooter`, `Alert` → всё, кроме Card- и Tabs-семейства
- `Tabs` → только `TabsList`, `TabsContent`
- `TabsList` → только `TabsTrigger`
- `TabsContent` → всё, кроме Tabs-семейства
- `Select` → только `SelectTrigger`, `SelectValue`, `SelectContent`
- `SelectContent` → всё, кроме Card- и Tabs-семейства
- Листовые компоненты (`Button`, `Input`, `Checkbox`, и т.д.) — не принимают детей
- Sidebar-компоненты — строгая иерархия: Provider > Sidebar > Content > Group > Menu > Item > Button

## Layout-пресеты

| Пресет | Когда использовать |
|---|---|
| `blank` | Чистый лист, пустая flex-колонка на весь экран |
| `auth` | Формы входа/регистрации — центрированная карточка |
| `landing` | Landing page: hero + 3 feature cards + CTA + footer |
| `dashboard` | Админка: боковое меню + контент с сеткой виджетов |
| `settings` | Настройки: навигация слева, форма справа |
| `list-detail` | Почта/задачи: список слева, детали справа |

## Spacing scale (gap, padding, margin)

Допустимые значения: `0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24`
(шаг 4px: `gap-0` = 0px, `gap-1` = 4px, ..., `gap-24` = 96px)

## Шрифты (с кириллицей)

- **Inter** (sans, 100–900)
- **Manrope** (sans, 200–800)
- **Golos Text** (sans, 400–900)
- **Onest** (sans, 100–900)
- **Unbounded** (display, 200–900)
- **JetBrains Mono** (mono, 100–800)

## Ограничения

- Не использовать arbitrary Tailwind: `w-[327px]`, `bg-[#abc123]`, `p-[10px]`
- Все className — только стандартные Tailwind-утилиты
- Не более 6 уровней вложенности от root
- Каждый экран — один root `LayoutNode`
- `route` начинается с `/`
- `name` экрана — PascalCase, без пробелов (станет именем файла)
- Все `id` уникальны в пределах экрана (формат: `n1`, `n2`, ... или nanoid)
- `kind` всегда указан
- Каждый `id` — строка длиной ≥ 1

## Валидация перед отправкой

Перед тем как отдать JSON пользователю, проверь:

- [ ] `version: 1` у проекта и каждого экрана
- [ ] `name` и `id` у проекта и экранов непустые
- [ ] `route` начинается с `/`
- [ ] `screens` — непустой массив
- [ ] Все `id` уникальны в пределах экрана
- [ ] `kind` у каждого узла: `layout`, `component`, `text` или `code`
- [ ] `component` совпадает с ID из таблицы доступных компонентов
- [ ] `gap` из scale: 0–24
- [ ] Все 18 цветовых токенов указаны, формат `#rrggbb`
- [ ] `radius` 0–24
- [ ] `fonts.sans` указан
- [ ] Нет arbitrary Tailwind-значений
- [ ] Не более 6 уровней вложенности
- [ ] Правила вложенности соблюдены
- [ ] Для каждого `events[*]` — человекочитаемое имя функции (camelCase)
