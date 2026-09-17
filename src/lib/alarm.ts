/**
 * The DEFCON 1 alarm.
 *
 * Real recordings from `public/sounds/`, played through a plain <audio> element
 * — synthesised tones sounded like a toy. There is more than one file and the
 * alarm never plays the same one twice in a row, so it keeps its edge instead of
 * turning into background noise.
 *
 * Everything degrades to silence: no `Audio` constructor (tests, SSR) or a
 * missing file means nothing happens, and nothing throws.
 */

/**
 * The alarm files, relative to the site root. Add a name here and drop the file
 * into `public/sounds/` — the rotation picks it up on the next reload.
 */
export const ALARM_TRACKS = ['sounds/defcon1-tannoy.mp3', 'sounds/defcon1-warning.mp3'] as const

/** Loud enough to carry across the room, with a little headroom left. */
export const ALARM_VOLUME = 0.9

/** Turns a track into a URL, honouring a deployment that is not at the root. */
export function alarmUrl(track: string, base = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : `${base}/`}${track}`
}

/**
 * Picks the next track at random — but never the one that just played, so two
 * alarms in a row are always audibly different. Pass `previous = -1` for the
 * first alarm, where every track is fair game.
 */
export function nextTrack(
  previous: number,
  // Annotated, because `ALARM_TRACKS.length` on its own is the literal type 2.
  count: number = ALARM_TRACKS.length,
  random: () => number = Math.random,
): number {
  if (count <= 1) return 0
  const choices = previous >= 0 && previous < count ? count - 1 : count
  // `Math.min` only guards against a `random()` that returns exactly 1.
  const draw = Math.min(choices - 1, Math.floor(random() * choices))
  return choices === count || draw < previous ? draw : draw + 1
}

/** One element per track, built on first use and reused afterwards. */
const elements: (HTMLAudioElement | undefined)[] = []
let previous = -1

function element(at: number): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  const existing = elements[at]
  if (existing) return existing
  const audio = new Audio(alarmUrl(ALARM_TRACKS[at]))
  audio.preload = 'auto'
  audio.volume = ALARM_VOLUME
  elements[at] = audio
  return audio
}

/** Fetches the files while nothing is on fire yet, so the alarm is instant. */
export function preloadAlarm(): void {
  for (let at = 0; at < ALARM_TRACKS.length; at += 1) element(at)
}

/** Sounds the alarm once. Rewinds first, so a rapid second alarm is heard. */
export function playAlarm(): void {
  const at = nextTrack(previous)
  const audio = element(at)
  if (!audio) return
  previous = at
  if (audio.readyState > 0) audio.currentTime = 0
  // A missing file or a browser that blocks autoplay must not break the click
  // that triggered this.
  void audio.play().catch(() => {})
}
