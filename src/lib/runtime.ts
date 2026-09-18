/** The demo is an explicit build mode, never inferred from a missing server. */
export function isBrowserDemo(): boolean {
  return import.meta.env.MODE === 'demo'
}
