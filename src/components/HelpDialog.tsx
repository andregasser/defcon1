import { DEFCONS } from '../constants'
import { useT } from '../i18n'
import type { StorageMode } from '../types'
import { Dialog } from './Dialog'

interface Props {
  mode: StorageMode
  onClose: () => void
  onLoadDemo: () => void
}

/** Renders the `<kbd>` tokens of one help row, space separated. */
function Keys({ tokens }: { tokens: readonly string[] }) {
  return (
    <span>
      {tokens.map((token, index) => (
        <span key={token}>
          {index > 0 && ' '}
          <kbd>{token}</kbd>
        </span>
      ))}
    </span>
  )
}

export function HelpDialog({ mode, onClose, onLoadDemo }: Props) {
  const t = useT()

  return (
    <Dialog
      title={t.help.title}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t.actions.close}
          </button>
          <span className="spacer" />
          <button type="button" className="btn sm" onClick={onLoadDemo}>
            {t.help.loadDemo}
          </button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="help-list">
          <span className="help-section">{t.help.keyboard}</span>
          <Keys tokens={['Tab']} />
          <span>{t.help.keys.focus}</span>
          <Keys tokens={['Space']} />
          <span>{t.help.keys.keyboardDrag}</span>
          <Keys tokens={['/']} />
          <span>{t.help.keys.search}</span>
          <Keys tokens={['t']} />
          <span>{t.help.keys.today}</span>
          <Keys tokens={['n']} />
          <span>{t.help.keys.newTask}</span>
          <Keys tokens={['p']} />
          <span>{t.help.keys.newProject}</span>
          <span>
            <kbd>1</kbd> … <kbd>5</kbd>
          </span>
          <span>{t.help.keys.moveColumn}</span>
          <span>
            <kbd>⇧</kbd> + <kbd>1</kbd> … <kbd>5</kbd>
          </span>
          <span>{t.help.keys.setDefcon}</span>
          <Keys tokens={['Enter', '/', 'e']} />
          <span>{t.help.keys.edit}</span>
          <Keys tokens={['x']} />
          <span>{t.help.keys.done}</span>
          <Keys tokens={['⌫']} />
          <span>{t.help.keys.delete}</span>
          <Keys tokens={['c']} />
          <span>{t.help.keys.collapse}</span>
          <Keys tokens={['d']} />
          <span>{t.help.keys.density}</span>
          <Keys tokens={['Esc']} />
          <span>{t.help.keys.escape}</span>

          <span className="help-section">{t.help.mouse}</span>
          <span>{t.help.mouseRows.drag}</span>
          <span>{t.help.mouseRows.dragDesc}</span>
          <span>{t.help.mouseRows.click}</span>
          <span>{t.help.mouseRows.clickDesc}</span>
          <span>{t.help.mouseRows.doubleClick}</span>
          <span>{t.help.mouseRows.doubleClickDesc}</span>
          <span>{t.help.mouseRows.tile}</span>
          <span>{t.help.mouseRows.tileDesc}</span>
          <span>{t.help.mouseRows.tileDouble}</span>
          <span>{t.help.mouseRows.tileDoubleDesc}</span>
          <span>{t.help.mouseRows.lane}</span>
          <span>{t.help.mouseRows.laneDesc}</span>

          <span className="help-section">{t.help.quickAdd}</span>
          <span>
            <kbd>!1</kbd> … <kbd>!5</kbd>
          </span>
          <span>{t.help.quickRows.defcon}</span>
          <Keys tokens={t.help.quickRows.datesTokens} />
          <span>{t.help.quickRows.dates}</span>
          <Keys tokens={t.help.quickRows.weekdayTokens} />
          <span>{t.help.quickRows.weekday}</span>
          <Keys tokens={['@+3d', '@+2w']} />
          <span>{t.help.quickRows.relative}</span>
          <Keys tokens={t.help.quickRows.absoluteTokens} />
          <span>{t.help.quickRows.absolute}</span>
        </div>

        <p className="micro" style={{ margin: 0 }}>
          {t.help.quickRows.bothLanguages}
        </p>

        <div className="field">
          <label>{t.defcon.legend}</label>
          <div className="dl">
            {DEFCONS.map((meta) => (
              <span key={meta.level} style={{ display: 'contents' }}>
                {/* The signal colour as a swatch, not as text: the deep blue of
                    DEFCON 5 is unreadable on a dark panel. */}
                <span className="dl-key">
                  <span className="chip-swatch" style={{ background: meta.color }} />
                  <code>DEFCON {meta.level}</code>
                </span>
                <span>
                  {t.defcon.label[meta.level]} — {meta.code}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t.help.priorityLabel}</label>
          <p style={{ margin: 0, color: 'var(--fg-1)', lineHeight: 1.55 }}>{t.help.priorityText}</p>
        </div>

        <div className="field">
          <label>{t.help.storageLabel}</label>
          <p style={{ margin: 0, color: 'var(--fg-1)', lineHeight: 1.55 }}>
            {mode === 'server' ? t.help.storageServer() : t.help.storageLocal()}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
