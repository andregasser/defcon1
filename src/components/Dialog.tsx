import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
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

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const backdrop = panel.parentElement
    const background = Array.from(backdrop?.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({ element, inert: element.hasAttribute('inert') }))
    background.forEach(({ element }) => element.setAttribute('inert', ''))

    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), textarea, select, button, a[href], [tabindex]',
    )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
      !element.closest('[hidden], [inert]') && getComputedStyle(element).display !== 'none' &&
      getComputedStyle(element).visibility !== 'hidden')
    const initial = focusable().find((element) => element.matches('input, textarea, select'))
      ?? focusable()[0] ?? panel
    initial.focus()

    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0] ?? panel
      const last = elements.at(-1) ?? panel
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
        event.preventDefault()
        first.focus()
      }
    }
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) {
        (focusable()[0] ?? panel).focus()
      }
    }
    document.addEventListener('keydown', trapTab, true)
    document.addEventListener('focusin', keepFocus)
    return () => {
      document.removeEventListener('keydown', trapTab, true)
      document.removeEventListener('focusin', keepFocus)
      background.forEach(({ element, inert }) => { if (!inert) element.removeAttribute('inert') })
      if (previous?.isConnected) previous.focus()
    }
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
        tabIndex={-1}
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
