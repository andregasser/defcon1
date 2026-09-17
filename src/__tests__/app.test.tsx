// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../App'
import { createDemoData } from '../lib/board'
import { daysUntil, formatCountdown, formatDate } from '../lib/date'

/**
 * Smoke tests for the real component tree. No server is reachable here, so the
 * app takes its localStorage fallback path — which is also worth covering.
 * Drag & drop itself needs a real pointer and is verified in the browser.
 */

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

/** Renders the app and loads the demo board so there is something to look at. */
async function renderWithDemo() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Demo-Daten laden' }))
  await screen.findAllByText('Migration Cloud')
  return user
}

/** The `.cell` a card currently lives in. */
function cellOf(card: HTMLElement): HTMLElement {
  const cell = card.closest('.cell')
  assert.ok(cell, 'Karte liegt in keiner Zelle')
  return cell as HTMLElement
}

function cardByTitle(title: string): HTMLElement {
  const node = screen.getByText(title).closest('.card')
  assert.ok(node, `Keine Karte mit Titel "${title}"`)
  return node as HTMLElement
}

describe('App', () => {
  it('shows the onboarding screen when there is no board yet', async () => {
    render(<App />)
    assert.ok(await screen.findByRole('button', { name: 'Erstes Projekt anlegen' }))
    // Shown twice: as the sync badge and in the storage hint below it.
    assert.equal(screen.getAllByText(/nur dieser Browser/).length, 2)
  })

  it('renders every status column and every project swimlane', async () => {
    await renderWithDemo()

    for (const label of ['Backlog', 'Todo', 'In Progress', 'Blocked', 'Done']) {
      assert.ok(screen.getByText(label), `Spalte "${label}" fehlt`)
    }
    // Once as a deck tile, once as a lane header.
    for (const name of ['Migration Cloud', 'Reporting Q4', 'Onboarding Tool']) {
      assert.equal(screen.getAllByText(name).length, 2, name)
    }
    assert.ok(screen.getByText('Terraform-Module refactoren'))
  })

  it('shows a project deadline as a date plus a countdown', async () => {
    await renderWithDemo()

    // The demo board is relative to today, so pin the offsets first.
    const deadlines = createDemoData().projects.map((p) => p.deadline)
    assert.deepEqual(
      deadlines.map((d) => daysUntil(d)),
      [21, 5, 60],
    )

    // Every deadline must reach the DOM as both halves: the day and the pressure.
    for (const deadline of deadlines) {
      assert.ok(screen.getAllByText(formatDate(deadline)).length > 0, `Datum fehlt: ${deadline}`)
      assert.ok(
        screen.getAllByText(formatCountdown(deadline)).length > 0,
        `Countdown fehlt: ${deadline}`,
      )
    }
  })

  it('sorts swimlanes by deadline, most urgent first', async () => {
    await renderWithDemo()
    const laneNames = Array.from(document.querySelectorAll('.lane-name')).map((el) => el.textContent)
    assert.deepEqual(laneNames, ['Reporting Q4', 'Migration Cloud', 'Onboarding Tool'])
  })

  it('marks a card that has not moved for too long', async () => {
    await renderWithDemo()

    // The demo board parks the firewall approval in Blocked for six days.
    const card = cardByTitle('Netzwerk-Freigabe Firewall')
    const chip = within(card).getByTitle(/Liegt seit 6 Tagen/)
    assert.match(chip.textContent ?? '', /6 T/)

    // A task that only entered its column yesterday stays quiet.
    assert.equal(within(cardByTitle('Terraform-Module refactoren')).queryByTitle(/Liegt seit/), null)
  })

  it('opens the Heute list across all projects and back again', async () => {
    await renderWithDemo()

    // The chip counts before it is even opened: one overdue, two in progress.
    const chip = screen.getByRole('button', { name: /^Heute/ })
    assert.match(chip.textContent ?? '', /3$/)

    fireEvent.keyDown(window, { key: 't' })

    const list = await waitFor(() => {
      const node = document.querySelector('.today')
      assert.ok(node, 'Heute-Ansicht fehlt')
      return node as HTMLElement
    })

    // Grouped by pressure, not by project — and the board is out of the way.
    assert.deepEqual(
      Array.from(list.querySelectorAll('.today-label')).map((el) => el.textContent),
      ['Überfällig', 'In Arbeit'],
    )
    assert.equal(document.querySelectorAll('.lane-head').length, 0)

    const overdue = list.querySelector('.today-group') as HTMLElement
    assert.ok(within(overdue).getByText('Netzwerk-Freigabe Firewall'))
    // Every row names its project, because the swimlane no longer does.
    assert.ok(within(overdue).getByText('Migration Cloud'))

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      assert.equal(document.querySelectorAll('.lane-head').length, 3)
    })
  })

  it('tracks the checklist of a task on its card', async () => {
    const user = await renderWithDemo()

    // The demo runbook arrives with one of three steps ticked.
    const card = cardByTitle('Runbook schreiben')
    assert.match(within(card).getByTitle(/1 von 3 Schritten/).textContent ?? '', /1\/3/)

    await user.dblClick(card)
    await screen.findByRole('dialog', { name: 'Task bearbeiten' })

    await user.click(screen.getByLabelText('Rollback beschreiben abhaken'))
    await user.type(screen.getByPlaceholderText('Schritt hinzufügen …'), 'Freigabe einholen{Enter}')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      const updated = cardByTitle('Runbook schreiben')
      assert.match(within(updated).getByTitle(/2 von 4 Schritten/).textContent ?? '', /2\/4/)
    })

    // A fully ticked list reads as complete rather than as work in progress.
    const finished = within(cardByTitle('Landing Zone aufgesetzt')).getByTitle(
      /2 von 2 Schritten/,
    )
    assert.equal(finished.dataset.complete, 'true')
  })

  it('creates a task from the quick-add mini syntax', async () => {
    const user = await renderWithDemo()

    fireEvent.keyDown(window, { key: 'n' })
    const input = await screen.findByLabelText('Neuer Task')
    await user.type(input, 'Firewall-Ticket eröffnen !2 @morgen{Enter}')

    const card = await waitFor(() => cardByTitle('Firewall-Ticket eröffnen'))
    // The tokens must be consumed, not left in the title.
    assert.equal(within(card).getByText('Firewall-Ticket eröffnen').textContent, 'Firewall-Ticket eröffnen')
    assert.equal(within(card).getByTitle(/DEFCON 2/).textContent, '2')
    assert.equal(cellOf(card).dataset.status, 'backlog')
  })

  it('moves the selected task between columns with the number keys', async () => {
    const user = await renderWithDemo()

    const card = cardByTitle('Kostenmodell prüfen')
    assert.equal(cellOf(card).dataset.status, 'backlog')

    await user.click(card)
    fireEvent.keyDown(window, { key: '3' })

    await waitFor(() => {
      assert.equal(cellOf(cardByTitle('Kostenmodell prüfen')).dataset.status, 'doing')
    })

    fireEvent.keyDown(window, { key: 'x' })
    await waitFor(() => {
      assert.equal(cellOf(cardByTitle('Kostenmodell prüfen')).dataset.status, 'done')
    })
  })

  it('changes the DEFCON level with shift + number', async () => {
    const user = await renderWithDemo()

    await user.click(cardByTitle('Runbook schreiben'))
    fireEvent.keyDown(window, { key: '1', shiftKey: true })

    await waitFor(() => {
      const card = cardByTitle('Runbook schreiben')
      assert.ok(within(card).getByTitle(/DEFCON 1/))
    })
  })

  it('filters the board down to one project when a deck tile is clicked', async () => {
    const user = await renderWithDemo()
    assert.equal(document.querySelectorAll('.lane-head').length, 3)

    const tile = screen.getAllByText('Reporting Q4')[0].closest('.tile')
    assert.ok(tile)
    await user.click(tile as HTMLElement)

    await waitFor(() => {
      assert.equal(document.querySelectorAll('.lane-head').length, 1)
    })
    assert.equal(document.querySelector('.lane-name')?.textContent, 'Reporting Q4')

    // Escape releases the focus filter again.
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      assert.equal(document.querySelectorAll('.lane-head').length, 3)
    })
  })

  it('narrows the search to matching tasks', async () => {
    const user = await renderWithDemo()

    await user.type(screen.getByLabelText('Tasks durchsuchen'), 'terraform')

    await waitFor(() => {
      assert.equal(document.querySelectorAll('.card').length, 1)
    })
    assert.ok(screen.getByText('Terraform-Module refactoren'))
    // Lanes without a hit disappear while a query is active.
    assert.equal(document.querySelectorAll('.lane-head').length, 1)
  })

  it('collapses all swimlanes into one summary row each', async () => {
    await renderWithDemo()

    fireEvent.keyDown(window, { key: 'c' })
    await waitFor(() => {
      assert.equal(document.querySelectorAll('.lane-summary').length, 3)
    })
    assert.equal(document.querySelectorAll('.card').length, 0)
  })

  it('keeps the board in localStorage when no server answers', async () => {
    const user = await renderWithDemo()

    fireEvent.keyDown(window, { key: 'n' })
    await user.type(await screen.findByLabelText('Neuer Task'), 'Persistenz prüfen{Enter}')

    await waitFor(() => {
      const raw = localStorage.getItem('defcon1.data.v1')
      assert.ok(raw, 'Nichts in localStorage')
      assert.match(raw, /Persistenz prüfen/)
    })
  })

  it('creates a project with a deadline through the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Erstes Projekt anlegen' }))
    await user.type(screen.getByLabelText('Projektname'), 'Audit 2027')
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2027-03-31' } })
    await user.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => {
      assert.equal(screen.getAllByText('Audit 2027').length, 2)
    })
    assert.ok(screen.getAllByText('31.03.2027').length > 0)
  })
})
