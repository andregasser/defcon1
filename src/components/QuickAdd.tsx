import { useEffect, useRef, useState } from 'react'

interface Props {
  onSubmit: (text: string) => void
  onClose: () => void
}

/**
 * Stays open after submitting so a whole batch of tasks can be typed in one go:
 * type, Enter, type, Enter, Escape.
 */
export function QuickAdd({ onSubmit, onClose }: Props) {
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
        placeholder="Task … !2 @morgen"
        aria-label="Neuer Task"
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
        <kbd>!1</kbd>–<kbd>!5</kbd> DEFCON · <kbd>@morgen</kbd> <kbd>@fr</kbd> <kbd>@+3d</kbd> fällig
      </div>
    </div>
  )
}
