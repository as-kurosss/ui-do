import type { ProjectSpec } from '@/core/ir'

export const DEMO_SPEC: ProjectSpec = {
  version: 1,
  name: 'demo',
  screens: [{
    version: 1,
    id: 's1',
    name: 'Login',
    route: '/login',
    tokens: {
      colors: {
        background: '#ffffff',
        foreground: '#0a0a0a',
        card: '#ffffff',
        cardForeground: '#0a0a0a',
        primary: '#171717',
        primaryForeground: '#fafafa',
        secondary: '#f5f5f5',
        secondaryForeground: '#737373',
        muted: '#f5f5f5',
        mutedForeground: '#737373',
        accent: '#f5f5f5',
        accentForeground: '#171717',
        popover: '#ffffff',
        popoverForeground: '#0a0a0a',
        destructive: '#dc2626',
        destructiveForeground: '#fafafa',
        border: '#e5e5e5',
        input: '#e5e5e5',
      },
      radius: 10,
      fonts: { sans: 'Inter', display: 'Unbounded' },
    },
    root: {
      kind: 'layout',
      id: 'n1' as never,
      display: 'flex',
      direction: 'column',
      gap: 4,
      align: 'center',
      justify: 'center',
      className: 'min-h-screen',
      children: [{
        kind: 'component',
        id: 'n2' as never,
        component: 'Card',
        className: 'w-80',
        children: [
          {
            kind: 'component',
            id: 'n3' as never,
            component: 'CardHeader',
            children: [
              {
                kind: 'component',
                id: 'n4' as never,
                component: 'CardTitle',
                children: [
                  { kind: 'text', id: 'n5' as never, text: 'Вход в аккаунт' },
                ],
              },
            ],
          },
          {
            kind: 'component',
            id: 'n6' as never,
            component: 'CardContent',
            children: [
              {
                kind: 'component',
                id: 'n7' as never,
                component: 'Input',
                props: { placeholder: 'Email' },
                events: { onChange: 'onEmail' },
              },
              {
                kind: 'component',
                id: 'n8' as never,
                component: 'Button',
                className: 'w-full',
                events: { onClick: 'submit' },
                children: [
                  { kind: 'text', id: 'n9' as never, text: 'Войти' },
                ],
              },
            ],
          },
        ],
      }],
    },
  }],
}
