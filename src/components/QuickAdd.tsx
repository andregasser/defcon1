import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

interface Props {
  onSubmit: (text: string) => void
  onClose: () => void
}

/**
 * Stays open after submitting so a whole batch of tasks can be typed in one go:
 * type, Enter, type, Enter, Escape.
 */
export function QuickAdd({ onSubmit, onClose }: Props) {
  const t = useT()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="quick-add">
      <input
        ref={inputRef}
        type="text"
        value={text}
        placeholder={t.quickAdd.placeholder}
        aria-label={t.quickAdd.label}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === '') onClose()
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            const value = text.trim()
            if (value === '') {
              onClose()
              return
            }
            onSubmit(value)
            setText('')
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
      />
      <div className="quick-add-hint">
        <kbd>!1</kbd>–<kbd>!5</kbd> {t.quickAdd.hintDefcon} ·{' '}
        {t.quickAdd.hintTokens.map((token) => (
          <span key={token}>
            <kbd>{token}</kbd>{' '}
          </span>
        ))}
        {t.quickAdd.hintDue}
      </div>
    </div>
  )
}
