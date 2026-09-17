// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../App'
import { PREFS_KEY } from '../constants'
import { playAlarm } from '../lib/alarm'
import { createDemoData } from '../lib/board'
import { daysUntil, formatCountdown, formatDate } from '../lib/date'

/**
 * Smoke tests for the real component tree. No server is reachable here, so the
 * app takes its localStorage fallback path — which is also worth covering.
 * Drag & drop itself needs a real pointer and is verified in the browser.
 */

// jsdom cannot decode audio, so playback is stubbed: what matters here is when
// the app decides to sound the alarm. The file lookup is covered in logic.test.ts.
vi.mock('../lib/alarm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/alarm')>()),
  playAlarm: vi.fn(),
  preloadAlarm: vi.fn(),
}))

const alarm = vi.mocked(playAlarm)

beforeEach(() => {
  alarm.mockClear()
  localStorage.clear()
  // jsdom reports en-US, which would hand the app its English dictionary. Pin
  // the language so the assertions below can stay in one language.
  localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'de' }))
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

/**
 * The five cells of one swimlane. The board is one flat CSS grid, so a lane is
 * its header followed by its cells — they are siblings, not children.
 */
function laneCells(projectName: string): HTMLElement[] {
  const head = Array.from(document.querySelectorAll('.lane-head')).find(
    (element) => element.querySelector('.lane-name')?.textContent === projectName,
  )
  assert.ok(head, `Keine Swimlane "${projectName}"`)
  const cells: HTMLElement[] = []
  let node = head.nextElementSibling
  while (node && node.classList.contains('cell')) {
    cells.push(node as HTMLElement)
    node = node.nextElementSibling
  }
  return cells
}

function laneNames(): string[] {
  return Array.from(document.querySelectorAll('.lane-name')).map((el) => el.textContent ?? '')
}

/** The card titles of one cell, top to bottom. */
function cardTitles(cell: HTMLElement): string[] {
  return Array.from(cell.querySelectorAll('.card-title')).map((el) => el.textContent ?? '')
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
    const deadlines = createDemoData('de').projects.map((p) => p.deadline)
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
    assert.deepEqual(laneNames(), ['Reporting Q4', 'Migration Cloud', 'Onboarding Tool'])
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

  it('lifts a task to the top of its column when it becomes a DEFCON 1', async () => {
    const user = await renderWithDemo()

    // Onboarding Tool's backlog holds one DEFCON 5 task; add a second one below it.
    const backlog = () => laneCells('Onboarding Tool')[0]
    await user.click(within(backlog()).getByTitle('Task hinzufügen'))
    await user.type(await screen.findByLabelText('Neuer Task'), 'Nachtrag !5{Enter}')
    await waitFor(() => {
      assert.deepEqual(cardTitles(backlog()), ['Anforderungen sammeln', 'Nachtrag'])
    })

    // Raising its priority is enough — no manual reordering.
    await user.click(cardByTitle('Nachtrag'))
    fireEvent.keyDown(window, { key: '1', shiftKey: true })
    await waitFor(() => {
      assert.deepEqual(cardTitles(backlog()), ['Nachtrag', 'Anforderungen sammeln'])
    })

    // The hand order survives underneath: manual mode brings it back unchanged.
    await user.click(within(document.querySelector('.topbar') as HTMLElement).getByTitle(/genau so/))
    await waitFor(() => {
      assert.deepEqual(cardTitles(backlog()), ['Anforderungen sammeln', 'Nachtrag'])
    })
  })

  it('sounds the alarm when a task reaches DEFCON 1 — and only then', async () => {
    const user = await renderWithDemo()

    fireEvent.keyDown(window, { key: 'n' })
    await user.type(await screen.findByLabelText('Neuer Task'), 'Ruhiger Task !3{Enter}')
    await waitFor(() => cardByTitle('Ruhiger Task'))
    assert.equal(alarm.mock.calls.length, 0, 'DEFCON 3 ist kein Alarm')

    await user.type(screen.getByLabelText('Neuer Task'), 'Produktion steht !1{Enter}')
    await waitFor(() => cardByTitle('Produktion steht'))
    assert.equal(alarm.mock.calls.length, 1)

    // Escalating an existing task is the same event.
    await user.click(cardByTitle('Ruhiger Task'))
    fireEvent.keyDown(window, { key: '1', shiftKey: true })
    await waitFor(() => {
      assert.equal(alarm.mock.calls.length, 2)
    })

    // Already at DEFCON 1: setting it again changes nothing, so it stays quiet.
    fireEvent.keyDown(window, { key: '1', shiftKey: true })
    assert.equal(alarm.mock.calls.length, 2)

    // And the chip mutes it for good.
    const topbar = document.querySelector('.topbar') as HTMLElement
    await user.click(within(topbar).getByTitle(/Alarmton/))
    fireEvent.keyDown(window, { key: 'n' })
    await user.type(await screen.findByLabelText('Neuer Task'), 'Alles brennt !1{Enter}')
    await waitFor(() => cardByTitle('Alles brennt'))
    assert.equal(alarm.mock.calls.length, 2, 'stummgeschaltet, trotzdem gespielt')
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

  it('records a project description and shows all of it in the deck', async () => {
    const user = userEvent.setup()
    render(<App />)

    const text =
      'Ablösung der Altanwendung inklusive Datenmigration, Schulung aller ' +
      'Filialen und Abnahme durch die Revision. Läuft über drei Quartale.'

    await user.click(await screen.findByRole('button', { name: 'Erstes Projekt anlegen' }))
    await user.type(screen.getByLabelText('Projektname'), 'Kernbanken-Release')
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: text } })
    await user.click(screen.getByRole('button', { name: 'Anlegen' }))

    const shown = await waitFor(() => {
      const node = document.querySelector('.tile-desc')
      assert.ok(node, 'Keine Beschreibung in der Projektübersicht')
      return node as HTMLElement
    })
    // Every character of it, not a shortened version.
    assert.equal(shown.textContent, text)

    // And it comes back into the dialog for editing.
    await user.dblClick(shown.closest('.tile') as HTMLElement)
    const field = (await screen.findByLabelText('Beschreibung')) as HTMLTextAreaElement
    assert.equal(field.value, text)
  })

  it('keeps a brand-new project visible while a task filter is active', async () => {
    const user = await renderWithDemo()

    // A project starts out without tasks — the exact case that used to vanish.
    await user.click(screen.getByRole('button', { name: '+ Projekt' }))
    await user.type(screen.getByLabelText('Projektname'), 'Audit 2027')
    await user.click(screen.getByRole('button', { name: 'Anlegen' }))
    await waitFor(() => {
      assert.ok(laneNames().includes('Audit 2027'))
    })

    const topbar = document.querySelector('.topbar') as HTMLElement
    await user.click(within(topbar).getByTitle(/DEFCON 3/))

    await waitFor(() => {
      // Onboarding Tool has tasks, none of them DEFCON 3: filtered away, correctly.
      assert.ok(!laneNames().includes('Onboarding Tool'))
    })
    // The empty project was never filtered — it must stay reachable.
    assert.ok(laneNames().includes('Audit 2027'))

    // And it must still accept its first task.
    const backlog = laneCells('Audit 2027')[0]
    await user.click(within(backlog).getByTitle('Task hinzufügen'))
    // !3 keeps the new task inside the active filter, so the lane stays put.
    await user.type(await screen.findByLabelText('Neuer Task'), 'Scope klären !3{Enter}')

    await waitFor(() => {
      assert.equal(within(laneCells('Audit 2027')[0]).getAllByText('Scope klären').length, 1)
    })
  })

  it('shows every focused project, even one without tasks', async () => {
    const user = await renderWithDemo()

    await user.click(screen.getByRole('button', { name: '+ Projekt' }))
    await user.type(screen.getByLabelText('Projektname'), 'Audit 2027')
    await user.click(screen.getByRole('button', { name: 'Anlegen' }))
    await waitFor(() => {
      assert.equal(document.querySelectorAll('.lane-head').length, 4)
    })

    for (const name of ['Reporting Q4', 'Audit 2027']) {
      const tile = screen.getAllByText(name)[0].closest('.tile')
      assert.ok(tile, name)
      await user.click(tile as HTMLElement)
    }

    await waitFor(() => {
      assert.deepEqual(laneNames().sort(), ['Audit 2027', 'Reporting Q4'])
    })
  })

  it('switches the whole interface to English and back', async () => {
    const user = await renderWithDemo()

    await user.click(screen.getByRole('button', { name: 'EN' }))

    await waitFor(() => {
      assert.ok(screen.getByLabelText('Search tasks'))
    })
    assert.ok(screen.getByRole('button', { name: 'DE' }))
    // Column names are the same in both languages on purpose.
    assert.ok(screen.getByText('Backlog'))
    assert.ok(screen.getByText('unsorted'))
    // Project and task titles are data: they must not change.
    assert.ok(screen.getByText('Terraform-Module refactoren'))
    assert.equal(document.documentElement.lang, 'en')

    await user.click(screen.getByRole('button', { name: 'DE' }))
    await waitFor(() => {
      assert.ok(screen.getByLabelText('Tasks durchsuchen'))
    })
    assert.equal(document.documentElement.lang, 'de')
  })

  it('starts in English for a browser that does not ask for German', async () => {
    localStorage.clear()
    render(<App />)
    assert.ok(await screen.findByRole('button', { name: 'Create the first project' }))
  })
})
