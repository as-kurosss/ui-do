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
    | 'background' | 'foreground' | 'card' | 'cardForeground'
    | 'primary' | 'primaryForeground'
    | 'secondary' | 'secondaryForeground'
    | 'muted' | 'mutedForeground'
    | 'accent' | 'accentForeground'
    | 'popover' | 'popoverForeground'
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
