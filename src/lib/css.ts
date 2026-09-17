import type { CSSProperties } from 'react'

/** Lets us hand CSS custom properties to `style` without fighting the types. */
export function vars(entries: Record<string, string | number>): CSSProperties {
  return entries as CSSProperties
}
