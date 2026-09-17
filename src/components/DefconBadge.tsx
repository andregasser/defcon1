import { DEFCON_BY_LEVEL } from '../constants'
import { useT } from '../i18n'
import { vars } from '../lib/css'
import type { Defcon } from '../types'

export function DefconBadge({ level }: { level: Defcon }) {
  const t = useT()
  const meta = DEFCON_BY_LEVEL[level]
  return (
    <span
      className="dc"
      style={vars({ '--dc-color': meta.color, '--dc-ink': meta.ink })}
      title={t.defcon.badgeTitle(level, meta.code, t.defcon.label[level])}
    >
      {level}
    </span>
  )
}
