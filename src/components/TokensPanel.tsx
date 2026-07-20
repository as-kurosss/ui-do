import { Label } from '@/components/ui/label';
import { useEditorStore } from '@/store/editor';
import { TokenColors } from './TokenColors';
import type { TokenSet } from '@/core/ir';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Playfair Display',
  'Unbounded',
  'JetBrains Mono',
  'Fira Code',
];

export function TokensPanel() {
  const { project, activeScreenId, setTokens } = useEditorStore();
  const screen = project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  if (!screen) {
    return <div className="p-4 text-sm text-muted-foreground">No screen selected</div>;
  }

  const handleChange = (patch: Partial<TokenSet>) => {
    // Merge: patch can contain { colors: { ... } } or { radius } or { fonts: { ... } }
    const merged: Partial<TokenSet> = {};

    if ('colors' in patch && patch.colors) {
      merged.colors = { ...screen.tokens.colors, ...patch.colors };
    }

    if ('radius' in patch) {
      merged.radius = patch.radius;
    }

    if ('fonts' in patch && patch.fonts) {
      merged.fonts = { ...screen.tokens.fonts, ...patch.fonts };
    }

    setTokens(screen.id, merged);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Theme
      </h2>

      {/* Colors */}
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Colors
        </h3>
        <TokenColors tokens={screen.tokens} onChange={(patch) => handleChange(patch)} />
      </section>

      <hr className="border-border" />

      {/* Border radius */}
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Border Radius
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            className="flex-1 h-1.5 cursor-pointer accent-primary"
            value={screen.tokens.radius}
            onChange={(e) => handleChange({ radius: Number(e.target.value) })}
          />
          <span className="w-8 text-right text-xs font-mono text-foreground/60">
            {screen.tokens.radius}px
          </span>
        </div>
        {/* Preview box */}
        <div
          className="mt-2 h-10 w-full border-2 border-primary/30 bg-primary/5"
          style={{ borderRadius: screen.tokens.radius }}
        />
      </section>

      <hr className="border-border" />

      {/* Fonts */}
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fonts
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Sans</Label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={screen.tokens.fonts.sans}
              onChange={(e) => handleChange({ fonts: { sans: e.target.value } })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          {screen.tokens.fonts.display && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Display</Label>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={screen.tokens.fonts.display}
                onChange={(e) =>
                  handleChange({ fonts: { ...screen.tokens.fonts, display: e.target.value } })
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
