import { useEffect, useRef } from 'react'

/** Curated font list with Cyrillic support */
const FONT_WEIGHTS: Record<string, string> = {
  Inter: 'wght@100..900',
  Manrope: 'wght@200..800',
  'Golos Text': 'wght@400..900',
  Onest: 'wght@100..900',
  Unbounded: 'wght@200..900',
  'JetBrains Mono': 'wght@100..800',
}

const FONT_ID = 'bn-font-loader'

/**
 * Build a Google Fonts CSS2 URL for the given font names.
 */
function buildGoogleFontsUrl(names: string[]): string {
  const families = names
    .filter((name) => FONT_WEIGHTS[name])
    .map((name) => `family=${name.replace(/\s+/g, '+')}:${FONT_WEIGHTS[name]}`)
    .join('&')

  if (!families) return ''

  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

/**
 * Dynamically loads Google Fonts by injecting a <link> tag into <head>.
 * Replaces any previous font link on re-render with new font names.
 * Cleans up on unmount.
 */
export function useFontLoader(sans: string, display?: string) {
  const prevUrlRef = useRef<string>('')

  useEffect(() => {
    const names = [sans, display].filter(Boolean) as string[]
    const url = buildGoogleFontsUrl(names)
    if (!url || url === prevUrlRef.current) return

    prevUrlRef.current = url

    // Remove existing font link
    const existing = document.getElementById(FONT_ID)
    if (existing) existing.remove()

    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)

    return () => {
      const el = document.getElementById(FONT_ID)
      if (el) el.remove()
    }
  }, [sans, display])
}
