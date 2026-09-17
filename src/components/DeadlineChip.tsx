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
  const tone = dateTone(deadline, 14)

  if (!deadline) {
    return (
      <span className="deadline" data-tone="none" title="Keine Deadline gesetzt">
        ◇ keine Deadline
      </span>
    )
  }

  return (
    <span
      className="deadline"
      data-tone={tone}
      title={`Deadline: ${formatDate(deadline)} — ${formatCountdown(deadline)}`}
    >
      <span aria-hidden="true">{tone === 'overdue' ? '▲' : '◆'}</span>
      {!compact && <span className="deadline-date">{formatDate(deadline)}</span>}
      <span>{formatCountdown(deadline)}</span>
    </span>
  )
}
