const HEX_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Converts a hex color (#rrggbb) to Oklch CSS notation.
 *
 * Formula from https://bottosson.github.io/posts/oklab/
 * Used for codegen output — shadcn v4 native format.
 */

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255
  return [r, g, b]
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  // Linear sRGB → LMS
  let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  // LMS → LMS' (cube root)
  l = Math.cbrt(l)
  m = Math.cbrt(m)
  s = Math.cbrt(s)

  // LMS' → Oklab
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s

  return [L, a, b_]
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/**
 * Converts a hex color string to Oklch CSS notation.
 *
 * @param hex - Color in #rrggbb format
 * @returns Oklch string like "oklch(0.5 0.1 250)"
 */
export function hexToOklch(hex: string): string {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex color: "${hex}". Expected #rrggbb format.`)
  }
  const [rRaw, gRaw, bRaw] = hexToRgb(hex)
  const r = srgbToLinear(rRaw)
  const g = srgbToLinear(gRaw)
  const b = srgbToLinear(bRaw)

  const [L, a, b_] = linearToOklab(r, g, b)

  const C = Math.sqrt(a * a + b_ * b_)
  // When chroma is zero, hue is meaningless — set to 0
  const Hnorm = C < 0.0001 ? 0 : (() => {
    const h = Math.atan2(b_, a) * (180 / Math.PI)
    return h < 0 ? h + 360 : h
  })()

  return `oklch(${roundTo(L, 3)} ${roundTo(C, 3)} ${roundTo(Hnorm, 3)})`
}
