import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'vitest'

import {
  appendIndex,
  cellId,
  checklistProgress,
  createDemoData,
  groupByCell,
  moveTask,
  moveTaskBefore,
  parseCellId,
  projectStats,
  reorderProject,
  sortProjects,
  staleDays,
} from '../lib/board'
import { ALARM_TRACKS, alarmUrl, nextTrack, playAlarm, preloadAlarm } from '../lib/alarm'
import { DEFCONS } from '../constants'
import { de } from '../i18n/de'
import { en } from '../i18n/en'
import { detectLang, isLang, LANGS } from '../i18n/lang'
import {
  daysSince,
  daysUntil,
  formatCountdown,
  formatDate,
  formatDateShort,
  parseISODate,
  todayISO,
} from '../lib/date'
import { parseQuickAdd } from '../lib/quickAdd'
import { normalizeData, parseBackup } from '../lib/storage'
import type { TodaySection, TodaySectionId } from '../lib/today'
import { todayCount, todayList } from '../lib/today'
import type { Defcon, Project, Status, Task } from '../types'

/* ------------------------------------------------------------------ helpers */

function task(id: string, projectId: string, status: Status, order: number, defcon: Defcon = 4): Task {
  return {
    id,
    projectId,
    title: id,
    note: '',
    status,
    defcon,
    due: null,
    order,
    createdAt: '2026-01-01T00:00:00.000Z',
    statusSince: '2026-01-01T00:00:00.000Z',
    doneAt: null,
    checklist: [],
  }
}

/** A task that entered its current status `days` ago. */
function aged(
  id: string,
  status: Status,
  days: number,
  now = new Date(),
  defcon: Defcon = 4,
): Task {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 9)
  return { ...task(id, 'p1', status, 0, defcon), statusSince: since.toISOString() }
}

function project(id: string, order: number, deadline: string | null = null): Project {
  return { id, name: id, description: '', color: '#0a84ff', deadline, order }
}

/** Ids of a cell, in stored order. */
function orderOf(tasks: Task[], projectId: string, status: Status): string[] {
  return tasks
    .filter((t) => t.projectId === projectId && t.status === status)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id)
}

/* -------------------------------------------------------------------- cells */

describe('cell ids', () => {
  it('round-trips project and status', () => {
    const id = cellId('p1', 'doing')
    assert.deepEqual(parseCellId(id), { projectId: 'p1', status: 'doing' })
  })

  it('survives project ids containing colons', () => {
    const id = cellId('p:weird:1', 'blocked')
    assert.deepEqual(parseCellId(id), { projectId: 'p:weird:1', status: 'blocked' })
  })

  it('rejects task ids and unknown statuses', () => {
    assert.equal(parseCellId('t_abc'), null)
    assert.equal(parseCellId('cell:p1:nonsense'), null)
  })
})

describe('groupByCell', () => {
  it('buckets and sorts by order', () => {
    const tasks = [task('b', 'p1', 'todo', 1), task('a', 'p1', 'todo', 0), task('c', 'p1', 'done', 0)]
    const groups = groupByCell(tasks)
    assert.deepEqual(groups.get(cellId('p1', 'todo'))?.map((t) => t.id), ['a', 'b'])
    assert.deepEqual(groups.get(cellId('p1', 'done'))?.map((t) => t.id), ['c'])
  })

  it('puts the most urgent task on top in defcon mode', () => {
    const tasks = [
      task('calm', 'p1', 'todo', 0, 5),
      task('normal', 'p1', 'todo', 1, 4),
      task('now', 'p1', 'todo', 2, 1),
    ]
    const groups = groupByCell(tasks, 'defcon')
    assert.deepEqual(groups.get(cellId('p1', 'todo'))?.map((t) => t.id), ['now', 'normal', 'calm'])
  })

  it('keeps the hand order within the same defcon level', () => {
    const tasks = [
      task('second', 'p1', 'todo', 1, 2),
      task('first', 'p1', 'todo', 0, 2),
      task('later', 'p1', 'todo', 2, 3),
    ]
    const groups = groupByCell(tasks, 'defcon')
    assert.deepEqual(
      groups.get(cellId('p1', 'todo'))?.map((t) => t.id),
      ['first', 'second', 'later'],
    )
  })

  it('leaves order untouched, so manual mode restores the hand order', () => {
    const tasks = [task('calm', 'p1', 'todo', 0, 5), task('now', 'p1', 'todo', 1, 1)]
    groupByCell(tasks, 'defcon')
    assert.deepEqual(
      groupByCell(tasks, 'manual').get(cellId('p1', 'todo'))?.map((t) => t.id),
      ['calm', 'now'],
    )
  })
})

/* -------------------------------------------------------------------- moves */

describe('moveTask', () => {
  const base = [
    task('a', 'p1', 'todo', 0),
    task('b', 'p1', 'todo', 1),
    task('c', 'p1', 'todo', 2),
  ]

  it('reorders inside a cell like arrayMove', () => {
    assert.deepEqual(orderOf(moveTask(base, 'a', 'p1', 'todo', 2), 'p1', 'todo'), ['b', 'c', 'a'])
    assert.deepEqual(orderOf(moveTask(base, 'c', 'p1', 'todo', 0), 'p1', 'todo'), ['c', 'a', 'b'])
    assert.deepEqual(orderOf(moveTask(base, 'b', 'p1', 'todo', 1), 'p1', 'todo'), ['a', 'b', 'c'])
  })

  it('renumbers the source cell after moving across columns', () => {
    const next = moveTask(base, 'a', 'p1', 'doing', 0)
    assert.deepEqual(orderOf(next, 'p1', 'todo'), ['b', 'c'])
    assert.deepEqual(
      next.filter((t) => t.status === 'todo').map((t) => t.order),
      [0, 1],
    )
    assert.deepEqual(orderOf(next, 'p1', 'doing'), ['a'])
  })

  it('moves across projects, i.e. between swimlanes', () => {
    const tasks = [...base, task('x', 'p2', 'doing', 0)]
    const next = moveTask(tasks, 'b', 'p2', 'doing', 0)
    assert.deepEqual(orderOf(next, 'p2', 'doing'), ['b', 'x'])
    assert.deepEqual(orderOf(next, 'p1', 'todo'), ['a', 'c'])
    assert.equal(next.find((t) => t.id === 'b')?.projectId, 'p2')
  })

  it('stamps doneAt on the way in and clears it on the way out', () => {
    const done = moveTask(base, 'a', 'p1', 'done', 0)
    const stamped = done.find((t) => t.id === 'a')
    assert.ok(stamped?.doneAt)

    const back = moveTask(done, 'a', 'p1', 'todo', 0)
    assert.equal(back.find((t) => t.id === 'a')?.doneAt, null)
  })

  it('restarts the status clock only on a real column change', () => {
    const old = '2026-01-01T00:00:00.000Z'

    const moved = moveTask(base, 'a', 'p1', 'doing', 0).find((t) => t.id === 'a')
    assert.notEqual(moved?.statusSince, old, 'Spaltenwechsel muss die Uhr neu starten')

    // Reordering inside the cell, or handing the card to another project, does
    // not change how long it has been waiting.
    const reordered = moveTask(base, 'a', 'p1', 'todo', 2).find((t) => t.id === 'a')
    assert.equal(reordered?.statusSince, old)

    const handedOver = moveTask(base, 'a', 'p2', 'todo', 0).find((t) => t.id === 'a')
    assert.equal(handedOver?.statusSince, old)
  })

  it('clamps out-of-range indexes instead of creating holes', () => {
    assert.deepEqual(orderOf(moveTask(base, 'a', 'p1', 'todo', 99), 'p1', 'todo'), ['b', 'c', 'a'])
    assert.deepEqual(orderOf(moveTask(base, 'c', 'p1', 'todo', -5), 'p1', 'todo'), ['c', 'a', 'b'])
  })

  it('is a no-op for an unknown task', () => {
    assert.equal(moveTask(base, 'nope', 'p1', 'doing', 0), base)
  })
})

describe('moveTaskBefore', () => {
  const base = [
    task('a', 'p1', 'todo', 0),
    task('b', 'p1', 'todo', 1),
    task('c', 'p1', 'todo', 2),
    task('d', 'p1', 'todo', 3),
  ]

  it('inserts in front of the anchor', () => {
    assert.deepEqual(orderOf(moveTaskBefore(base, 'd', 'p1', 'todo', 'b'), 'p1', 'todo'), [
      'a',
      'd',
      'b',
      'c',
    ])
  })

  it('appends when the anchor is null', () => {
    assert.deepEqual(orderOf(moveTaskBefore(base, 'a', 'p1', 'todo', null), 'p1', 'todo'), [
      'b',
      'c',
      'd',
      'a',
    ])
  })

  it('keeps filtered-out neighbours in place', () => {
    // 'b' is hidden by a filter; dropping 'd' in front of the visible 'c' must
    // not reshuffle 'b' out of its slot.
    const next = moveTaskBefore(base, 'd', 'p1', 'todo', 'c')
    assert.deepEqual(orderOf(next, 'p1', 'todo'), ['a', 'b', 'd', 'c'])
  })

  it('appends when the anchor does not exist', () => {
    assert.deepEqual(orderOf(moveTaskBefore(base, 'a', 'p1', 'doing', 'ghost'), 'p1', 'doing'), ['a'])
  })
})

describe('appendIndex', () => {
  it('counts only the target cell', () => {
    const tasks = [task('a', 'p1', 'todo', 0), task('b', 'p1', 'doing', 0), task('c', 'p2', 'todo', 0)]
    assert.equal(appendIndex(tasks, 'p1', 'todo'), 1)
    assert.equal(appendIndex(tasks, 'p1', 'blocked'), 0)
  })
})

/* -------------------------------------------------------------------- stats */

describe('projectStats', () => {
  const yesterday = todayISO(new Date(Date.now() - 86_400_000))

  const tasks: Task[] = [
    { ...task('a', 'p1', 'doing', 0, 2), due: yesterday },
    task('b', 'p1', 'blocked', 0, 1),
    task('c', 'p1', 'done', 0, 3),
    task('d', 'p1', 'todo', 0, 5),
    task('e', 'p2', 'todo', 0, 1),
  ]

  it('counts only its own project', () => {
    const stats = projectStats(tasks, 'p1')
    assert.equal(stats.total, 4)
    assert.equal(stats.done, 1)
    assert.equal(stats.open, 3)
    assert.equal(stats.doing, 1)
    assert.equal(stats.blocked, 1)
    assert.equal(stats.percent, 25)
  })

  it('flags hot, overdue and the most urgent open level', () => {
    const stats = projectStats(tasks, 'p1')
    assert.equal(stats.hot, 2)
    assert.equal(stats.overdue, 1)
    assert.equal(stats.topDefcon, 1)
  })

  it('counts tasks that stopped moving', () => {
    const stuck = [aged('a', 'blocked', 6), aged('b', 'doing', 1), aged('c', 'done', 30)]
    assert.equal(projectStats(stuck, 'p1').stale, 1)
  })

  it('ignores done tasks for urgency', () => {
    const stats = projectStats([task('x', 'p3', 'done', 0, 1)], 'p3')
    assert.equal(stats.topDefcon, null)
    assert.equal(stats.hot, 0)
    assert.equal(stats.percent, 100)
  })

  it('reports 0% for an empty project instead of dividing by zero', () => {
    assert.equal(projectStats([], 'p9').percent, 0)
  })
})

/* -------------------------------------------------------------------- aging */

describe('staleDays', () => {
  it('waits for the per-status threshold before complaining', () => {
    // In Progress is allowed three days, Blocked only two.
    assert.equal(staleDays(aged('a', 'doing', 2)), null)
    assert.equal(staleDays(aged('a', 'doing', 3)), 3)
    assert.equal(staleDays(aged('a', 'blocked', 1)), null)
    assert.equal(staleDays(aged('a', 'blocked', 2)), 2)
    assert.equal(staleDays(aged('a', 'blocked', 9)), 9)
  })

  it('ignores columns where waiting is normal', () => {
    assert.equal(staleDays(aged('a', 'backlog', 400)), null)
    assert.equal(staleDays(aged('a', 'todo', 400)), null)
  })

  it('never marks a done task as stuck', () => {
    assert.equal(staleDays(aged('a', 'done', 90)), null)
  })

  it('survives a missing or malformed timestamp', () => {
    assert.equal(staleDays({ ...aged('a', 'blocked', 5), statusSince: '' }), null)
    assert.equal(staleDays({ ...aged('a', 'blocked', 5), statusSince: 'gestern' }), null)
  })
})

/* --------------------------------------------------------------- checklist */

describe('checklistProgress', () => {
  /** A task with `done` of `total` steps ticked. */
  const withSteps = (done: number, total: number): Task => ({
    ...task('t1', 'p1', 'todo', 0),
    checklist: Array.from({ length: total }, (_, index) => ({
      id: `c${index}`,
      text: `Schritt ${index + 1}`,
      done: index < done,
    })),
  })

  it('stays silent for a task without steps', () => {
    // Nothing to show beats a defeated 0/0.
    assert.equal(checklistProgress(task('t1', 'p1', 'todo', 0)), null)
  })

  it('counts the ticked steps and rounds the percentage', () => {
    assert.deepEqual(checklistProgress(withSteps(0, 4)), { done: 0, total: 4, percent: 0 })
    assert.deepEqual(checklistProgress(withSteps(1, 3)), { done: 1, total: 3, percent: 33 })
    assert.deepEqual(checklistProgress(withSteps(2, 3)), { done: 2, total: 3, percent: 67 })
    assert.deepEqual(checklistProgress(withSteps(5, 5)), { done: 5, total: 5, percent: 100 })
  })
})

/* ------------------------------------------------------------- heute-liste */

describe('todayList', () => {
  const now = new Date(2026, 2, 10, 9)
  const day = (offset: number) => todayISO(new Date(2026, 2, 10 + offset))

  /** `task()` with a due date, so the sections can be told apart. */
  const due = (id: string, status: Status, defcon: Defcon, offset: number | null): Task => ({
    ...task(id, 'p1', status, 0, defcon),
    due: offset === null ? null : day(offset),
  })

  const ids = (sections: TodaySection[], id: TodaySectionId) =>
    sections.find((section) => section.id === id)?.tasks.map((t) => t.id) ?? []

  it('files every task under exactly one heading', () => {
    const sections = todayList(
      [
        due('late', 'doing', 4, -2),
        due('now', 'todo', 4, 0),
        due('running', 'doing', 4, null),
        due('burning', 'backlog', 1, null),
        due('later', 'todo', 4, 5),
      ],
      now,
    )

    // "late" is overdue and in progress; the sharper reason wins.
    assert.deepEqual(ids(sections, 'overdue'), ['late'])
    assert.deepEqual(ids(sections, 'today'), ['now'])
    assert.deepEqual(ids(sections, 'doing'), ['running'])
    assert.deepEqual(ids(sections, 'hot'), ['burning'])

    // Nothing appears twice, and a calm task due next week stays off the list.
    assert.equal(todayCount(sections), 4)
  })

  it('leaves finished work out', () => {
    const sections = todayList([due('shipped', 'done', 1, -3)], now)
    assert.deepEqual(sections, [])
    assert.equal(todayCount(sections), 0)
  })

  it('sorts the overdue block by date and the rest by DEFCON', () => {
    const sections = todayList(
      [
        due('older', 'todo', 5, -9),
        due('recent', 'todo', 1, -1),
        due('calm', 'todo', 4, 0),
        due('urgent', 'todo', 2, 0),
      ],
      now,
    )

    // Overdue: the longest-forgotten first, whatever its level.
    assert.deepEqual(ids(sections, 'overdue'), ['older', 'recent'])
    // Everything else: the most urgent level first.
    assert.deepEqual(ids(sections, 'today'), ['urgent', 'calm'])
  })

  it('says nothing at all when nothing is pressing', () => {
    assert.deepEqual(todayList([due('quiet', 'backlog', 4, 30), due('idle', 'todo', 3, null)], now), [])
  })
})

/* -------------------------------------------------------------- lane sorting */

describe('sortProjects', () => {
  it('puts the nearest deadline first and undated projects last', () => {
    const future = todayISO(new Date(Date.now() + 30 * 86_400_000))
    const soon = todayISO(new Date(Date.now() + 2 * 86_400_000))
    const projects = [project('none', 0), project('far', 1, future), project('soon', 2, soon)]
    assert.deepEqual(
      sortProjects(projects, 'deadline').map((p) => p.id),
      ['soon', 'far', 'none'],
    )
  })

  it('honours the manual order', () => {
    const projects = [project('b', 1), project('a', 0)]
    assert.deepEqual(
      sortProjects(projects, 'manual').map((p) => p.id),
      ['a', 'b'],
    )
  })

  it('does not mutate the input', () => {
    const projects = [project('b', 1), project('a', 0)]
    sortProjects(projects, 'manual')
    assert.equal(projects[0].id, 'b')
  })
})

describe('reorderProject', () => {
  const projects = [project('a', 0), project('b', 1), project('c', 2)]

  it('moves up and down, renumbering densely', () => {
    assert.deepEqual(
      sortProjects(reorderProject(projects, 'c', -1), 'manual').map((p) => p.id),
      ['a', 'c', 'b'],
    )
    assert.deepEqual(
      sortProjects(reorderProject(projects, 'a', 1), 'manual').map((p) => p.id),
      ['b', 'a', 'c'],
    )
  })

  it('clamps at the edges', () => {
    assert.equal(reorderProject(projects, 'a', -1), projects)
    assert.equal(reorderProject(projects, 'c', 1), projects)
  })
})

/* ---------------------------------------------------------------- quick add */

describe('parseQuickAdd', () => {
  const now = new Date(2026, 8, 17) // Thursday, 17.09.2026

  it('keeps a plain title untouched', () => {
    assert.deepEqual(parseQuickAdd('Runbook schreiben', now), {
      title: 'Runbook schreiben',
      defcon: null,
      due: null,
    })
  })

  it('extracts the DEFCON level', () => {
    assert.deepEqual(parseQuickAdd('Deploy !2', now), {
      title: 'Deploy',
      defcon: 2,
      due: null,
    })
  })

  it('resolves relative dates', () => {
    assert.equal(parseQuickAdd('x @heute', now).due, '2026-09-17')
    assert.equal(parseQuickAdd('x @morgen', now).due, '2026-09-18')
    assert.equal(parseQuickAdd('x @+3d', now).due, '2026-09-20')
    assert.equal(parseQuickAdd('x @+2w', now).due, '2026-10-01')
  })

  it('resolves the next weekday, never today', () => {
    assert.equal(parseQuickAdd('x @fr', now).due, '2026-09-18')
    assert.equal(parseQuickAdd('x @do', now).due, '2026-09-24')
  })

  it('accepts absolute dates in both notations', () => {
    assert.equal(parseQuickAdd('x @2026-12-01', now).due, '2026-12-01')
    assert.equal(parseQuickAdd('x @01.12.', now).due, '2026-12-01')
    assert.equal(parseQuickAdd('x @01.12.2027', now).due, '2027-12-01')
  })

  it('rolls a bare day.month into next year when it is already past', () => {
    assert.equal(parseQuickAdd('x @05.01.', now).due, '2027-01-05')
  })

  it('leaves unparseable tokens in the title', () => {
    assert.deepEqual(parseQuickAdd('Mail an @chef schicken !9', now), {
      title: 'Mail an @chef schicken !9',
      defcon: null,
      due: null,
    })
  })

  it('rejects impossible dates', () => {
    assert.equal(parseQuickAdd('x @31.02.', now).due, null)
  })

  it('combines both tokens and trims the title', () => {
    assert.deepEqual(parseQuickAdd('  Firewall  !1   @morgen ', now), {
      title: 'Firewall',
      defcon: 1,
      due: '2026-09-18',
    })
  })
})

/* --------------------------------------------------------------------- dates */

describe('date helpers', () => {
  it('parses ISO days as local midnight', () => {
    const date = parseISODate('2026-09-17')
    assert.equal(date?.getFullYear(), 2026)
    assert.equal(date?.getMonth(), 8)
    assert.equal(date?.getDate(), 17)
    assert.equal(date?.getHours(), 0)
  })

  it('rejects malformed input', () => {
    assert.equal(parseISODate('17.09.2026'), null)
    assert.equal(parseISODate(null), null)
  })

  it('formats Swiss style', () => {
    assert.equal(formatDate('2026-09-17'), '17.09.2026')
    assert.equal(formatDateShort('2026-09-17'), '17.09.')
  })

  it('spells the month out in English so 09/20 can never be misread', () => {
    assert.equal(formatDate('2026-09-17', 'en'), '17 Sep 2026')
    assert.equal(formatDateShort('2026-09-17', 'en'), '17 Sep')
  })

  it('counts whole days in both directions', () => {
    const from = new Date(2026, 8, 17, 23, 30)
    assert.equal(daysUntil('2026-09-18', from), 1)
    assert.equal(daysUntil('2026-09-17', from), 0)
    assert.equal(daysUntil('2026-09-10', from), -7)
  })

  it('counts whole days since a timestamp', () => {
    const from = new Date(2026, 8, 17, 7, 15)
    // Late yesterday evening is "1 T" this morning: calendar days, not hours.
    assert.equal(daysSince(new Date(2026, 8, 16, 22, 40).toISOString(), from), 1)
    assert.equal(daysSince(new Date(2026, 8, 17, 6, 0).toISOString(), from), 0)
    assert.equal(daysSince(new Date(2026, 8, 10, 12, 0).toISOString(), from), 7)
    assert.equal(daysSince(null, from), null)
    assert.equal(daysSince('irgendwann', from), null)
  })

  it('describes the countdown in German', () => {
    const now = new Date()
    const inDays = (n: number) =>
      todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n))

    assert.equal(formatCountdown(inDays(0)), 'heute')
    assert.equal(formatCountdown(inDays(1)), 'morgen')
    assert.equal(formatCountdown(inDays(12)), 'in 12 T')
    assert.equal(formatCountdown(inDays(70)), 'in 10 Wo')
    assert.equal(formatCountdown(inDays(300)), 'in 10 Mt')
    assert.equal(formatCountdown(inDays(-3)), 'überfällig · 3 T')
    assert.equal(formatCountdown(null), '')
  })

  it('describes the countdown in English', () => {
    const now = new Date()
    const inDays = (n: number) =>
      todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n))

    assert.equal(formatCountdown(inDays(0), 'en'), 'today')
    assert.equal(formatCountdown(inDays(1), 'en'), 'tomorrow')
    assert.equal(formatCountdown(inDays(12), 'en'), 'in 12 d')
    assert.equal(formatCountdown(inDays(70), 'en'), 'in 10 wk')
    assert.equal(formatCountdown(inDays(300), 'en'), 'in 10 mo')
    assert.equal(formatCountdown(inDays(-3), 'en'), 'overdue · 3 d')
  })
})

/* ------------------------------------------------------------------- alarm */

describe('the DEFCON 1 alarm', () => {
  it('ships more than one MP3 under public/sounds', () => {
    // MP3 throughout: it is the one format every browser decodes.
    assert.ok(ALARM_TRACKS.length >= 2, 'the rotation needs at least two files')
    for (const track of ALARM_TRACKS) {
      assert.match(track, /^sounds\/defcon1-[a-z0-9-]+\.mp3$/)
      assert.ok(
        existsSync(new URL(`../../public/${track}`, import.meta.url)),
        `${track} is missing from public/`,
      )
    }
    assert.equal(new Set(ALARM_TRACKS).size, ALARM_TRACKS.length)
  })

  it('builds a URL that survives a non-root base', () => {
    assert.equal(alarmUrl('sounds/a.mp3', '/'), '/sounds/a.mp3')
    assert.equal(alarmUrl('sounds/a.mp3', '/defcon1/'), '/defcon1/sounds/a.mp3')
    // A base without its trailing slash must not glue the path onto the folder.
    assert.equal(alarmUrl('sounds/a.mp3', '/defcon1'), '/defcon1/sounds/a.mp3')
  })

  it('never plays the same track twice in a row', () => {
    // The first alarm may pick anything …
    assert.equal(nextTrack(-1, 3, () => 0), 0)
    assert.equal(nextTrack(-1, 3, () => 0.99), 2)

    // … afterwards the previous track is skipped, so the draw shifts past it.
    assert.equal(nextTrack(0, 3, () => 0), 1)
    assert.equal(nextTrack(0, 3, () => 0.99), 2)
    assert.equal(nextTrack(1, 3, () => 0), 0)
    assert.equal(nextTrack(1, 3, () => 0.99), 2)
    assert.equal(nextTrack(2, 3, () => 0.99), 1)

    // Two files therefore simply alternate, whatever the dice say.
    assert.equal(nextTrack(0, 2, () => 0), 1)
    assert.equal(nextTrack(0, 2, () => 0.99), 1)
    assert.equal(nextTrack(1, 2, () => 0.99), 0)

    // A single file always wins, and a real dice roll stays inside the list.
    assert.equal(nextTrack(0, 1), 0)
    for (let round = 0; round < 50; round += 1) {
      const at = nextTrack(round % ALARM_TRACKS.length)
      assert.ok(at >= 0 && at < ALARM_TRACKS.length)
      assert.notEqual(at, round % ALARM_TRACKS.length)
    }
  })

  it('stays quiet where there is no audio element at all', () => {
    // Node has no `Audio`: calling this must not throw, it must do nothing.
    assert.equal(typeof (globalThis as { Audio?: unknown }).Audio, 'undefined')
    preloadAlarm()
    playAlarm()
  })
})

/* ------------------------------------------------------------ defcon scale */

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string): number {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (light + 0.05) / (dark + 0.05)
}

describe('the official DEFCON colours', () => {
  it('runs red, orange, yellow, green, blue from 1 to 5', () => {
    assert.deepEqual(
      DEFCONS.map((meta) => [meta.level, meta.color]),
      [
        [1, '#ff1f1f'],
        [2, '#ff8c00'],
        [3, '#ffd400'],
        [4, '#22b14c'],
        [5, '#0057d8'],
      ],
    )
  })

  it('keeps the level readable on its own badge', () => {
    // The badge paints the number in `ink` on `color`; 4.5:1 is the WCAG floor
    // for small text, and this text is very small.
    for (const meta of DEFCONS) {
      const ratio = contrast(meta.color, meta.ink)
      assert.ok(ratio >= 4.5, `DEFCON ${meta.level}: only ${ratio.toFixed(2)}:1`)
    }
  })
})

/* -------------------------------------------------------------------- i18n */

/** Recursive shape of a dictionary: same keys, same kind of value everywhere. */
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}:fn/${(value as () => void).length}`]
  if (Array.isArray(value)) return [`${path}:array/${value.length}`]
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) => shape((value as Record<string, unknown>)[key], `${path}.${key}`))
  }
  return [`${path}:${typeof value}`]
}

describe('dictionaries', () => {
  it('cover exactly the same keys with the same kind of value', () => {
    // The `Dict` type already guards the keys at compile time; this catches a
    // string where the other language has a function, which types allow.
    assert.deepEqual(shape(en), shape(de))
  })

  it('translate every entry', () => {
    const flat = (dict: unknown): string[] =>
      typeof dict === 'string'
        ? [dict]
        : Array.isArray(dict)
          ? dict.flatMap(flat)
          : dict && typeof dict === 'object'
            ? Object.values(dict).flatMap(flat)
            : []

    // Deliberate exceptions: identical in both languages on purpose — loan
    // words, file paths, column names, the language-agnostic date tokens and the
    // empty label of the idle save state.
    const shared = new Set([
      '',
      'Export',
      'Import',
      'OK',
      'Defcon',
      'Deadline',
      'Status',
      'DEFCON',
      'In Progress',
      '+ Task',
      'Lanes',
      'Tasks',
      'Alarm',
      'normal',
      'data/board.json',
      '@+3d',
      '@20.09.',
      '@2026-09-20',
    ])
    const german = new Set(flat(de).filter((value) => !shared.has(value)))
    const untranslated = flat(en).filter((value) => german.has(value))
    assert.deepEqual(untranslated, [])
  })

  it('accepts only known language codes', () => {
    assert.deepEqual(LANGS, ['de', 'en'])
    assert.ok(isLang('de'))
    assert.ok(!isLang('fr'))
    assert.ok(!isLang(undefined))
  })

  it('follows the browser languages, German only when asked for', () => {
    assert.equal(detectLang(['de-CH', 'en-US']), 'de')
    assert.equal(detectLang(['en-GB', 'de']), 'de')
    assert.equal(detectLang(['fr-CH', 'it-CH']), 'en')
    assert.equal(detectLang([]), 'en')
    // Whatever the machine reports, the result has to be a language we have.
    assert.ok(isLang(detectLang()))
  })
})

/* --------------------------------------------------------------------- css */

/** The declaration block of one top-level rule, looked up by exact selector. */
function cssBlock(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  assert.notEqual(start, -1, `the rule ${selector} is gone`)
  return css.slice(start, css.indexOf('}', start))
}

describe('text on the board is never truncated', () => {
  // Whether a project name, a description or a task title fits is decided in CSS
  // alone, so this is the only place where the promise "you always see all of it"
  // can be kept.
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

  for (const selector of ['.lane-name', '.tile-name', '.tile-desc', '.card-title']) {
    it(`${selector} wraps instead of cutting off`, () => {
      const block = cssBlock(css, selector)
      assert.ok(!block.includes('text-overflow: ellipsis'), `${selector} truncates`)
      assert.ok(!block.includes('white-space: nowrap'), `${selector} refuses to wrap`)
      assert.ok(!block.includes('line-clamp'), `${selector} clamps the line count`)
      assert.ok(block.includes('overflow-wrap: anywhere'), `${selector} cannot break a long word`)
    })
  }

  it('lets a card keep its full height inside a capped cell', () => {
    // The cell caps its height and lays its children out with flex, so they would
    // shrink by default — and because the card sets `overflow: hidden` for its
    // stripe, `min-height: auto` does not save it. A wrapped title lost its last
    // line that way. Without this rule the bug is invisible until a cell fills up.
    const cell = cssBlock(css, '.cell')
    assert.ok(cell.includes('display: flex'), 'the cell is no longer a flex container')
    const children = cssBlock(css, '.cell > *')
    assert.match(children, /flex:\s*0 0 auto|flex-shrink:\s*0/)
  })

  it('has no density override that clamps a card title', () => {
    // Compact density used to squeeze titles onto one line with an ellipsis.
    // Any rule that mentions .card-title has to leave the wrapping alone.
    for (const rule of css.matchAll(/[^\n}]*\.card-title[^{]*\{[^}]*\}/g)) {
      assert.doesNotMatch(rule[0], /white-space:\s*nowrap|text-overflow:\s*ellipsis|line-clamp/)
    }
  })
})

/* ------------------------------------------------------------- normalisation */

describe('normalizeData', () => {
  it('survives complete garbage', () => {
    assert.deepEqual(normalizeData(null), { projects: [], tasks: [] })
    assert.deepEqual(normalizeData({ projects: 'nope', tasks: 42 }), { projects: [], tasks: [] })
  })

  it('fills in missing fields', () => {
    const result = normalizeData({ projects: [{ id: 'p1' }], tasks: [{ id: 't1', projectId: 'p1' }] })
    assert.equal(result.projects[0].name, 'Untitled project')
    // A board written before descriptions existed must still load.
    assert.equal(result.projects[0].description, '')
    assert.equal(result.projects[0].deadline, null)
    assert.equal(result.tasks[0].status, 'backlog')
    assert.equal(result.tasks[0].defcon, 4)
  })

  it('drops orphaned tasks so the board cannot render ghosts', () => {
    const result = normalizeData({
      projects: [{ id: 'p1' }],
      tasks: [{ id: 't1', projectId: 'gone' }, { id: 't2', projectId: 'p1' }],
    })
    assert.deepEqual(result.tasks.map((t) => t.id), ['t2'])
  })

  it('clamps a bogus DEFCON level and rejects bogus dates', () => {
    const result = normalizeData({
      projects: [{ id: 'p1', deadline: 'irgendwann' }],
      tasks: [{ id: 't1', projectId: 'p1', defcon: 99, due: '2026-9-1' }],
    })
    assert.equal(result.projects[0].deadline, null)
    assert.equal(result.tasks[0].defcon, 4)
    assert.equal(result.tasks[0].due, null)
  })

  it('dates the status back to creation for boards without the field', () => {
    const result = normalizeData({
      projects: [{ id: 'p1' }],
      tasks: [{ id: 't1', projectId: 'p1', createdAt: '2026-02-03T10:00:00.000Z' }],
    })
    assert.equal(result.tasks[0].statusSince, '2026-02-03T10:00:00.000Z')
  })

  it('repairs a checklist and throws away nameless steps', () => {
    const result = normalizeData({
      projects: [{ id: 'p1' }],
      tasks: [
        {
          id: 't1',
          projectId: 'p1',
          checklist: [
            { id: 'c1', text: 'Schritt eins', done: true },
            { text: '  Schritt zwei  ' },
            { id: 'c3', text: '   ' },
            null,
            { id: 'c4', text: 'Schritt drei', done: 'ja' },
          ],
        },
        { id: 't2', projectId: 'p1', checklist: 'kaputt' },
      ],
    })

    const steps = result.tasks[0].checklist
    assert.deepEqual(
      steps.map((item) => [item.text, item.done]),
      [
        ['Schritt eins', true],
        ['Schritt zwei', false],
        // A non-boolean "done" is not a yes.
        ['Schritt drei', false],
      ],
    )
    // Every step needs an id, even the one that arrived without.
    assert.ok(steps.every((item) => item.id !== ''))
    assert.equal(new Set(steps.map((item) => item.id)).size, 3)

    // Boards from before the checklist existed just get an empty one.
    assert.deepEqual(result.tasks[1].checklist, [])
  })

  it('gives every done task a doneAt timestamp', () => {
    const result = normalizeData({
      projects: [{ id: 'p1' }],
      tasks: [{ id: 't1', projectId: 'p1', status: 'done' }],
    })
    assert.ok(result.tasks[0].doneAt)
  })
})

describe('parseBackup', () => {
  const board = { projects: [{ id: 'p1', name: 'A' }], tasks: [] }

  it('accepts a wrapped export file', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'defcon1', version: 1, data: board }))
    assert.equal(parsed.projects.length, 1)
  })

  it('accepts a bare board', () => {
    assert.equal(parseBackup(JSON.stringify(board)).projects.length, 1)
  })

  it('refuses an empty board rather than wiping the current one', () => {
    assert.throws(() => parseBackup('{"projects":[],"tasks":[]}'))
  })

  it('refuses invalid JSON', () => {
    assert.throws(() => parseBackup('not json'))
  })
})

/* ----------------------------------------------------------------- demo data */

describe('createDemoData', () => {
  it('produces a consistent board', () => {
    const demo = createDemoData('de')
    assert.equal(demo.projects.length, 3)
    assert.ok(demo.tasks.length > 5)

    const ids = new Set(demo.projects.map((p) => p.id))
    for (const item of demo.tasks) assert.ok(ids.has(item.projectId))

    // Orders must be dense per cell so drag & drop starts from a clean slate.
    for (const project of demo.projects) {
      const groups = groupByCell(demo.tasks.filter((t) => t.projectId === project.id))
      for (const bucket of groups.values()) {
        assert.deepEqual(
          bucket.map((t) => t.order),
          bucket.map((_, index) => index),
        )
      }
    }
  })

  it('describes every project in the interface language', () => {
    for (const lang of LANGS) {
      for (const project of createDemoData(lang).projects) {
        assert.ok(project.description.length > 20, `${project.name} (${lang})`)
      }
    }
    const [first] = createDemoData('de').projects
    const [firstEn] = createDemoData('en').projects
    assert.notEqual(first.description, firstEn.description)
  })

  it('survives a round-trip through normalizeData unchanged', () => {
    const demo = createDemoData('en')
    assert.deepEqual(normalizeData(demo), demo)
  })
})
