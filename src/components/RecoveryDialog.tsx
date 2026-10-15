import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardData, RecoveryTarget, ServerBackupSummary } from '../types'
import type { BoardStore } from '../hooks/useBoard'
import { useLang, useT } from '../i18n'
import { downloadBackup, fetchBackup, fetchBackups } from '../lib/storage'
import { formatDate } from '../lib/date'
import { Dialog } from './Dialog'

interface Props { board: BoardStore; onClose: () => void; onRestored: () => void }
interface Selection { id: string; data: BoardData; capturedAt: string; origin: 'browser' | 'server' }

export function RecoveryDialog({ board, onClose, onRestored }: Props) {
  const t = useT()
  const lang = useLang()
  const [backups, setBackups] = useState<ServerBackupSummary[]>([])
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [target, setTarget] = useState<RecoveryTarget | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [failed, setFailed] = useState(false)
  const requestRef = useRef(0)
  const reviewRef = useRef(0)
  const { mode, reviewRecovery } = board

  const refresh = useCallback(async () => {
    const request = ++reviewRef.current
    setTarget(null)
    setConfirmed(false)
    setListState('loading')
    const [review, list] = await Promise.allSettled([reviewRecovery(), mode === 'server' ? fetchBackups() : Promise.resolve([])])
    if (request !== reviewRef.current) return
    setTarget(review.status === 'fulfilled' ? review.value : null)
    if (list.status === 'fulfilled') { setBackups(list.value); setListState('ready') }
    else setListState('error')
  }, [mode, reviewRecovery])

  useEffect(() => {
    void refresh()
    return () => { reviewRef.current++; requestRef.current++ }
  }, [refresh])

  const selectServer = async (backup: ServerBackupSummary) => {
    const request = ++requestRef.current
    setSelection(null)
    setPreviewLoading(true)
    setConfirmed(false)
    setFailed(false)
    try {
      const data = await fetchBackup(backup.id)
      if (request === requestRef.current) setSelection({ ...backup, data, origin: 'server' })
    } catch { if (request === requestRef.current) setFailed(true) }
    finally { if (request === requestRef.current) setPreviewLoading(false) }
  }
  const stamp = (value: string) => new Date(value).toLocaleString(lang === 'de' ? 'de-CH' : 'en-GB', {
    year: 'numeric', month: lang === 'de' ? '2-digit' : 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const restore = async () => {
    if (!selection || !target || !confirmed) return
    setRestoring(true)
    setFailed(false)
    const success = await board.restoreRecovery(selection.data, target)
    setRestoring(false)
    if (success) { onRestored(); onClose() }
    else { setTarget(null); setConfirmed(false); setFailed(true) }
  }

  return <Dialog title={t.recovery.title} onClose={() => { if (!restoring) onClose() }} wide footer={<>
    <button type="button" className="btn" onClick={onClose} disabled={restoring}>{t.actions.close}</button>
    <button type="button" className="btn" onClick={() => selection && downloadBackup(selection.data)} disabled={!selection || restoring}>{t.recovery.exportCopy}</button>
    <button type="button" className="btn primary" onClick={() => void restore()} disabled={!selection || !target || !confirmed || restoring}>{restoring ? t.recovery.restoring : t.recovery.restore}</button>
  </>}>
    <div className="dialog-body recovery-body">
      <p>{t.recovery.intro}</p>
      {!board.recoveryDurable && <p role="alert">{t.recovery.durability}</p>}
      <div className="recovery-layout">
        <div className="recovery-copies">
          <h3>{t.recovery.browser}</h3>
          {!board.recoverySnapshots.length && <p>{t.recovery.empty}</p>}
          {board.recoverySnapshots.map((copy) => <button key={copy.id} type="button" className="recovery-copy" aria-pressed={selection?.id === copy.id} disabled={restoring} onClick={() => {
            requestRef.current++
            setPreviewLoading(false)
            setSelection({ ...copy, origin: 'browser' })
            setConfirmed(false)
            setFailed(false)
          }}>
            <strong>{t.recovery.browserCopy} · {stamp(copy.capturedAt)}</strong>
            <span>{t.recovery.reason[copy.reason]}</span>
            <span>{t.recovery.counts(copy.data.projects.length, copy.data.tasks.length)}</span>
          </button>)}
          {mode === 'server' && <>
            <h3>{t.recovery.server}</h3>
            {listState === 'loading' && <p role="status">{t.recovery.loading}</p>}
            {listState === 'error' && <p>{t.recovery.unavailable}</p>}
            {listState === 'ready' && !backups.length && <p>{t.recovery.empty}</p>}
            {backups.map((copy) => <button key={copy.id} type="button" className="recovery-copy" aria-pressed={selection?.id === copy.id} disabled={restoring} onClick={() => void selectServer(copy)}>
              <strong>{t.recovery.serverCopy} · {stamp(copy.capturedAt)}</strong>
              <span>{t.recovery.counts(copy.projects, copy.tasks)}</span>
            </button>)}
          </>}
          <button type="button" className="btn" onClick={() => { setFailed(false); void refresh() }} disabled={restoring || listState === 'loading'}>{t.recovery.refresh}</button>
        </div>
        <section className="recovery-preview" aria-label={t.recovery.preview}>
          {previewLoading ? <p role="status">{t.recovery.loading}</p> : !selection ? <p>{t.recovery.select}</p> : <>
            <h3>{selection.origin === 'browser' ? t.recovery.browserCopy : t.recovery.serverCopy}</h3>
            <p>{stamp(selection.capturedAt)} · {t.recovery.counts(selection.data.projects.length, selection.data.tasks.length)}</p>
            {selection.data.projects.map((project) => <article key={project.id}>
              <h4>{project.name}</h4>
              {project.description && <p>{project.description}</p>}
              {project.deadline && <dl className="recovery-fields"><dt>{t.projectDialog.deadlineLabel}</dt><dd>{formatDate(project.deadline, lang)}</dd></dl>}
              <ul>{selection.data.tasks.filter((task) => task.projectId === project.id).map((task) => <li key={task.id}>
                <strong>{task.title}</strong>
                <span className="recovery-task-status">{t.status.hint[task.status]} · {t.defcon.label[task.defcon]}</span>
                <dl className="recovery-fields">
                  {task.due && <><dt>{t.taskDialog.dueLabel}</dt><dd>{formatDate(task.due, lang)}</dd></>}
                  {task.plannedFor && <><dt>{t.taskDialog.plannedFor}</dt><dd>{formatDate(task.plannedFor, lang)}</dd></>}
                  {task.reviewOn && <><dt>{t.taskDialog.reviewOn}</dt><dd>{formatDate(task.reviewOn, lang)}</dd></>}
                  {task.blockedReason && <><dt>{t.taskDialog.blockedReason}</dt><dd>{task.blockedReason}</dd></>}
                </dl>
                {task.note && <p>{task.note}</p>}
                {task.checklist.length > 0 && <ul>{task.checklist.map((item) => <li key={item.id}>{item.done ? '☑' : '☐'} {item.text}</li>)}</ul>}
              </li>)}</ul>
            </article>)}
          </>}
        </section>
      </div>
      {failed && <p role="alert">{t.recovery.failed}</p>}
      {!target && listState !== 'loading' && !failed && <p>{t.recovery.targetUnavailable}</p>}
      <label className="recovery-confirm"><input type="checkbox" checked={confirmed} disabled={!selection || !target || restoring} onChange={(event) => setConfirmed(event.target.checked)} />{t.recovery.confirm}</label>
    </div>
  </Dialog>
}
