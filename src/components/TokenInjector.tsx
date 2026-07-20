import { useEffect } from 'react'
import { useEditorStore } from '@/store/editor'
import { useFontLoader } from '@/hooks/useFontLoader'

/**
 * Applies the active screen's tokens as CSS custom properties on document.documentElement.
 * This gives live preview of theme changes across the entire editor.
 */
export function TokenInjector() {
  const { project, activeScreenId } = useEditorStore()
  const screen = project.screens.find((s) => s.id === activeScreenId)
    ?? project.screens[0]

  // Load fonts dynamically
  useFontLoader(screen?.tokens.fonts.sans ?? 'Inter', screen?.tokens.fonts.display)

  useEffect(() => {
    if (!screen) return

    const root = document.documentElement
    const t = screen.tokens

    // Apply colors as CSS custom properties
    for (const [key, value] of Object.entries(t.colors)) {
      // Convert camelCase to kebab-case: primaryForeground → primary-foreground
      const cssName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(`--bn-${cssName}`, value)
    }

    // Apply radius
    root.style.setProperty('--bn-radius', `${t.radius}px`)

    // Apply fonts
    root.style.setProperty('--bn-font-sans', t.fonts.sans)
    if (t.fonts.display) {
      root.style.setProperty('--bn-font-display', t.fonts.display)
    }

    // Also override shadcn CSS variables for immediate visual feedback
    // Colors
    root.style.setProperty('--background', t.colors.background)
    root.style.setProperty('--foreground', t.colors.foreground)
    root.style.setProperty('--card', t.colors.card)
    root.style.setProperty('--primary', t.colors.primary)
    root.style.setProperty('--primary-foreground', t.colors.primaryForeground)
    root.style.setProperty('--muted', t.colors.muted)
    root.style.setProperty('--muted-foreground', t.colors.mutedForeground)
    root.style.setProperty('--accent', t.colors.accent)
    root.style.setProperty('--accent-foreground', t.colors.accentForeground)
    root.style.setProperty('--destructive', t.colors.destructive)
    root.style.setProperty('--destructive-foreground', t.colors.destructiveForeground)
    root.style.setProperty('--border', t.colors.border)
    root.style.setProperty('--input', t.colors.input)
    root.style.setProperty('--radius', `${t.radius}px`)
  }, [screen])

  return null // This component doesn't render anything
}
