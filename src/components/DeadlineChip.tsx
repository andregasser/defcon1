import { useLang, useT } from '../i18n'
import { dateTone, formatCountdown, formatDate } from '../lib/date'

interface Props {
  deadline: string | null
  /** Hides the absolute date and keeps only the countdown. */
  compact?: boolean
}

/**
 * A project deadline always shows both halves: the calendar day (the fact) and
 * the countdown (the pressure). Colour comes from the countdown.
 */
export function DeadlineChip({ deadline, compact = false }: Props) {
  const t = useT()
  const lang = useLang()
  const tone = dateTone(deadline, 14)

  if (!deadline) {
    return (
      <span className="deadline" data-tone="none" title={t.deadline.noneTitle}>
        ◇ {t.deadline.none}
      </span>
    )
  }

  const date = formatDate(deadline, lang)
  const countdown = formatCountdown(deadline, lang)

  return (
    <span className="deadline" data-tone={tone} title={t.deadline.title(date, countdown)}>
      <span aria-hidden="true">{tone === 'overdue' ? '▲' : '◆'}</span>
      {!compact && <span className="deadline-date">{date}</span>}
      <span>{countdown}</span>
    </span>
  )
}
