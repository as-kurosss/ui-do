import type { TokenSet } from '@/core/ir';

interface TokenColorsProps {
  tokens: TokenSet;
  onChange: (patch: Partial<TokenSet>) => void;
}

const COLOR_LABELS: Record<keyof TokenSet['colors'], string> = {
  background: 'Background',
  foreground: 'Foreground',
  card: 'Card',
  cardForeground: 'Card Foreground',
  primary: 'Primary',
  primaryForeground: 'Primary Foreground',
  secondary: 'Secondary',
  secondaryForeground: 'Secondary Foreground',
  muted: 'Muted',
  mutedForeground: 'Muted Foreground',
  accent: 'Accent',
  accentForeground: 'Accent Foreground',
  popover: 'Popover',
  popoverForeground: 'Popover Foreground',
  destructive: 'Destructive',
  destructiveForeground: 'Destructive Foreground',
  border: 'Border',
  input: 'Input',
};

const FONTS_GROUP: (keyof TokenSet['colors'])[] = [
  'background',
  'foreground',
  'card',
  'cardForeground',
];

const ACCENTS_GROUP: (keyof TokenSet['colors'])[] = [
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'muted',
  'mutedForeground',
  'accent',
  'accentForeground',
];

const SYSTEM_GROUP: (keyof TokenSet['colors'])[] = [
  'popover',
  'popoverForeground',
  'destructive',
  'destructiveForeground',
  'border',
  'input',
];

function ColorRow({
  tokens,
  onChange,
  keys,
}: {
  tokens: TokenSet;
  onChange: (patch: Partial<TokenSet>) => void;
  keys: (keyof TokenSet['colors'])[];
}) {
  const setColor = (key: keyof TokenSet['colors'], value: string) => {
    onChange({ colors: { ...tokens.colors, [key]: value } });
  };

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {keys.map((key) => (
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
  );
}

export function TokenColors({ tokens, onChange }: TokenColorsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold text-foreground">Фоны</h4>
        <ColorRow tokens={tokens} onChange={onChange} keys={FONTS_GROUP} />
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold text-foreground">Акценты</h4>
        <ColorRow tokens={tokens} onChange={onChange} keys={ACCENTS_GROUP} />
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold text-foreground">Системные</h4>
        <ColorRow tokens={tokens} onChange={onChange} keys={SYSTEM_GROUP} />
      </div>
    </div>
  );
}
