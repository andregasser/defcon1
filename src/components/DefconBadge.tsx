import { DEFCON_BY_LEVEL } from '../constants'
import { vars } from '../lib/css'
import type { Defcon } from '../types'

export function DefconBadge({ level }: { level: Defcon }) {
  const meta = DEFCON_BY_LEVEL[level]
  return (
    <span
      className="dc"
      style={vars({ '--dc-color': meta.color })}
      title={`DEFCON ${level} — ${meta.code} (${meta.label})`}
    >
      {level}
    </span>
  )
}
