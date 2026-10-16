// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, describe, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayTaskRow } from '../components/TodayTaskRow'
import { createTask } from '../lib/board'
import { todayISO } from '../lib/date'

const day = todayISO()
const props = {
  project: undefined,
  day,
  selected: false,
  focused: false,
  onSelect: vi.fn(),
  onOpen: vi.fn(),
  onFocusTask: vi.fn(),
  onUpdate: vi.fn(),
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Today task row action hierarchy', () => {
  it('uses the task state to expose one next action before secondary controls', async () => {
    const user = userEvent.setup()
    const pending = createTask('project', 'todo', 'Pending', 0)
    const { rerender } = render(<TodayTaskRow {...props} task={pending} />)
    let row = screen.getByRole('article', { name: 'Pending' })
    assert.ok(within(row).getByRole('button', { name: 'In den Fokus nehmen' }))
    assert.ok(!within(row).queryByRole('button', { name: 'Starten' }))
    await user.click(within(row).getByRole('button', { name: 'In den Fokus nehmen' }))
    assert.equal(props.onFocusTask.mock.lastCall?.[0], pending.id)

    rerender(<TodayTaskRow {...props} task={pending} focused />)
    row = screen.getByRole('article', { name: 'Pending' })
    assert.ok(within(row).getByRole('button', { name: 'Starten' }))
    assert.ok(!within(row).queryByRole('button', { name: 'Erledigen' }))
    await user.click(within(row).getByRole('button', { name: 'Starten' }))
    assert.deepEqual(props.onUpdate.mock.lastCall, [pending.id, { status: 'doing', reviewOn: null }])

    rerender(<TodayTaskRow {...props} task={{ ...pending, status: 'doing' }} focused />)
    row = screen.getByRole('article', { name: 'Pending' })
    await user.click(within(row).getByRole('button', { name: 'Erledigen' }))
    assert.deepEqual(props.onUpdate.mock.lastCall, [pending.id, { status: 'done' }])

    rerender(<TodayTaskRow {...props} task={{ ...pending, status: 'blocked' }} />)
    row = screen.getByRole('article', { name: 'Pending' })
    await user.click(within(row).getByRole('button', { name: 'Weiterarbeiten' }))
    assert.deepEqual(props.onUpdate.mock.lastCall, [pending.id, { status: 'doing', reviewOn: null }])

    rerender(<TodayTaskRow {...props} task={{ ...pending, status: 'done' }} />)
    row = screen.getByRole('article', { name: 'Pending' })
    await user.click(within(row).getByRole('button', { name: 'Wieder öffnen' }))
    assert.deepEqual(props.onUpdate.mock.lastCall, [pending.id, { status: 'todo' }])
  })

  it('makes secondary actions keyboard reachable only after expansion', async () => {
    const user = userEvent.setup()
    const task = { ...createTask('project', 'todo', 'With steps', 0), checklist: [{ id: 'step', text: 'Check release', done: false }] }
    render(<TodayTaskRow {...props} task={task} />)
    const row = screen.getByRole('article', { name: 'With steps' })
    const more = within(row).getByRole('button', { name: 'Mehr Aktionen' })
    assert.equal(more.getAttribute('aria-expanded'), 'false')
    assert.ok(more.getAttribute('aria-controls'))
    assert.ok(!within(row).queryByRole('button', { name: 'Details öffnen' }))
    assert.ok(within(row).getByRole('button', { name: '0 von 1 Schritten' }))
    more.focus()
    await user.keyboard('{Enter}')
    assert.equal(more.getAttribute('aria-expanded'), 'true')
    assert.ok(within(row).getByRole('button', { name: 'Details öffnen' }))
    assert.ok(within(row).getByRole('combobox', { name: 'Priorität ändern' }))
  })

  it('opens plan controls from tomorrow rows without showing execution actions', async () => {
    const user = userEvent.setup()
    const task = { ...createTask('project', 'todo', 'Tomorrow', 0), plannedFor: '2026-10-17', checklist: [{ id: 'step', text: 'Pack files', done: false }] }
    render(<TodayTaskRow {...props} task={task} planningMode="tomorrow" tomorrow="2026-10-17" />)
    const row = screen.getByRole('article', { name: 'Tomorrow' })
    assert.ok(!within(row).queryByRole('button', { name: 'Starten' }))
    assert.ok(within(row).getByRole('button', { name: '0 von 1 Schritten' }))
    assert.ok(!within(row).queryByRole('button', { name: 'Datum übernehmen' }))
    await user.click(within(row).getByRole('button', { name: 'Plan ändern' }))
    assert.ok(within(row).getByLabelText('Anderes Plandatum'))
  })
})
