import type { TokenSet } from '@/core/ir'

interface TokenColorsProps {
  tokens: TokenSet
  onChange: (patch: Partial<TokenSet>) => void
}

const COLOR_LABELS: Record<keyof TokenSet['colors'], string> = {
  background: 'Background',
  foreground: 'Foreground',
  card: 'Card',
  primary: 'Primary',
  primaryForeground: 'Primary Foreground',
  muted: 'Muted',
  mutedForeground: 'Muted Foreground',
  accent: 'Accent',
  accentForeground: 'Accent Foreground',
  destructive: 'Destructive',
  destructiveForeground: 'Destructive Foreground',
  border: 'Border',
  input: 'Input',
}

export function TokenColors({ tokens, onChange }: TokenColorsProps) {
  const setColor = (key: keyof TokenSet['colors'], value: string) => {
    onChange({
      colors: { ...tokens.colors, [key]: value },
    })
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {(Object.keys(COLOR_LABELS) as (keyof TokenSet['colors'])[]).map((key) => (
        <div key={key} className="flex items-center gap-2">
          <input
            type="color"
            className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
            value={tokens.colors[key]}
            onChange={(e) => setColor(key, e.target.value)}
          />
          <div className="flex flex-col">
            <span className="text-[10px] leading-tight text-muted-foreground">
              {COLOR_LABELS[key]}
            </span>
            <span className="font-mono text-[10px] leading-tight text-foreground/60">
              {tokens.colors[key]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
