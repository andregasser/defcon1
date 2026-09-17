import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Dialog({ title, onClose, children, footer, wide = false }: Props) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    // Capture phase so the global board shortcuts never see these keys.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  useEffect(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button',
    )
    focusable?.focus()
  }, [])

  return (
    <div
      className="backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={wide ? 'dialog wide' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-head">
          <span className="dialog-title">{title}</span>
          <button
            type="button"
            className="btn icon"
            onClick={onClose}
            title={t.dialog.closeTitle}
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  )
}
