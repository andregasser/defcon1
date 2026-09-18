import { useT } from '../i18n'

export function DemoBanner({ onReset }: { onReset: () => void }) {
  const t = useT()
  return (
    <section className="demo-banner" aria-label={t.browserDemo.label}>
      <div className="demo-copy">
        <strong>{t.browserDemo.label}</strong>
        <span>{t.browserDemo.description}</span>
      </div>
      <div className="demo-actions">
        <button type="button" className="btn sm" onClick={onReset}>
          {t.browserDemo.reset}
        </button>
        <a className="btn sm primary" href="https://github.com/andregasser/defcon1#quickstart">
          {t.browserDemo.install}
        </a>
      </div>
    </section>
  )
}
