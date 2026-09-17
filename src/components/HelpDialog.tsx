import { DEFCONS } from '../constants'
import type { StorageMode } from '../types'
import { Dialog } from './Dialog'

interface Props {
  mode: StorageMode
  onClose: () => void
  onLoadDemo: () => void
}

export function HelpDialog({ mode, onClose, onLoadDemo }: Props) {
  return (
    <Dialog
      title="Defcon 1 — Bedienung"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Schliessen
          </button>
          <span className="spacer" />
          <button type="button" className="btn sm" onClick={onLoadDemo}>
            Demo-Daten laden
          </button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="help-list">
          <span className="help-section">Tastatur</span>
          <span>
            <kbd>/</kbd>
          </span>
          <span>Suche fokussieren</span>
          <span>
            <kbd>n</kbd>
          </span>
          <span>Neuer Task im ersten sichtbaren Projekt (Backlog)</span>
          <span>
            <kbd>p</kbd>
          </span>
          <span>Neues Projekt</span>
          <span>
            <kbd>1</kbd> … <kbd>5</kbd>
          </span>
          <span>Markierten Task in Spalte 1–5 verschieben</span>
          <span>
            <kbd>⇧</kbd> + <kbd>1</kbd> … <kbd>5</kbd>
          </span>
          <span>DEFCON-Stufe des markierten Tasks setzen</span>
          <span>
            <kbd>e</kbd>
          </span>
          <span>Markierten Task bearbeiten</span>
          <span>
            <kbd>x</kbd>
          </span>
          <span>Markierten Task auf Done / zurück auf Todo</span>
          <span>
            <kbd>⌫</kbd>
          </span>
          <span>Markierten Task löschen</span>
          <span>
            <kbd>c</kbd>
          </span>
          <span>Alle Swimlanes ein-/ausklappen</span>
          <span>
            <kbd>d</kbd>
          </span>
          <span>Dichte umschalten (Komfort / Kompakt)</span>
          <span>
            <kbd>Esc</kbd>
          </span>
          <span>Dialog schliessen, Auswahl und Filter aufheben</span>

          <span className="help-section">Maus</span>
          <span>Ziehen</span>
          <span>Task in eine andere Spalte oder eine andere Swimlane schieben</span>
          <span>Klick</span>
          <span>Task markieren</span>
          <span>Doppelklick</span>
          <span>Task bearbeiten</span>
          <span>Klick auf Kachel</span>
          <span>Auf dieses Projekt fokussieren (mehrere möglich)</span>
          <span>Doppelklick auf Kachel</span>
          <span>Projekt bearbeiten (Name, Deadline, Farbe)</span>
          <span>Klick auf Lane-Namen</span>
          <span>Nur dieses Projekt anzeigen</span>

          <span className="help-section">Schnellerfassung</span>
          <span>
            <kbd>!1</kbd> … <kbd>!5</kbd>
          </span>
          <span>DEFCON-Stufe direkt im Titel setzen</span>
          <span>
            <kbd>@heute</kbd> <kbd>@morgen</kbd>
          </span>
          <span>Fälligkeitsdatum</span>
          <span>
            <kbd>@fr</kbd> <kbd>@mo</kbd>
          </span>
          <span>Nächster Wochentag</span>
          <span>
            <kbd>@+3d</kbd> <kbd>@+2w</kbd>
          </span>
          <span>In 3 Tagen / in 2 Wochen</span>
          <span>
            <kbd>@20.09.</kbd> <kbd>@2026-09-20</kbd>
          </span>
          <span>Konkretes Datum</span>
        </div>

        <div className="field">
          <label>Defcon-Stufen</label>
          <div className="dl">
            {DEFCONS.map((meta) => (
              <span key={meta.level} style={{ display: 'contents' }}>
                <code style={{ color: meta.color }}>DEFCON {meta.level}</code>
                <span>
                  {meta.label} — {meta.code}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Speicherort</label>
          <p style={{ margin: 0, color: 'var(--fg-1)', lineHeight: 1.55 }}>
            {mode === 'server' ? (
              <>
                Alle Daten liegen in <code>data/board.json</code> im Projektordner. Damit sehen
                Safari, Firefox und Chrome dasselbe Board, und Änderungen aus einem anderen
                Browser erscheinen nach wenigen Sekunden automatisch. Vor jedem Schreibvorgang
                legt der Server eine Kopie unter <code>data/backups/</code> ab.
              </>
            ) : (
              <>
                Es läuft kein Server, deshalb liegen die Daten nur im Speicher dieses Browsers und
                sind in anderen Browsern nicht sichtbar. Für browserübergreifende Speicherung im
                Projektordner <code>npm start</code> ausführen und{' '}
                <code>http://127.0.0.1:7777</code> öffnen.
              </>
            )}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
