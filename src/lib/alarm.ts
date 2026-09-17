/**
 * The DEFCON 1 klaxon.
 *
 * Synthesised with the Web Audio API instead of shipping an audio file: nothing
 * to load before the first alarm can sound, nothing to keep in the repository,
 * and every trigger follows a click or a keystroke — so no autoplay policy gets
 * in the way.
 */

/** One rising horn blast of the alarm. */
export interface AlarmPulse {
  /** Seconds after the alarm starts. */
  start: number
  duration: number
  /** Sweeps from this pitch in Hz … */
  from: number
  /** … up to this one. */
  to: number
}

const PULSES = 3
const DURATION = 0.34
const GAP = 0.11
const LOW = 300
const HIGH = 620
/** Peak gain per pulse: loud enough to look up, quiet enough to keep working. */
const VOLUME = 0.16

/** Three rising blasts — the classic two-tone air-raid figure. */
export function alarmPulses(): AlarmPulse[] {
  return Array.from({ length: PULSES }, (_, index) => ({
    start: index * (DURATION + GAP),
    duration: DURATION,
    from: LOW,
    to: HIGH,
  }))
}

/** Total length of the alarm in seconds. */
export const ALARM_SECONDS = PULSES * DURATION + (PULSES - 1) * GAP

type AudioContextCtor = typeof AudioContext

/** One context for the whole session — browsers cap how many may exist. */
let shared: AudioContext | null = null

function context(): AudioContext | null {
  if (shared) return shared
  if (typeof window === 'undefined') return null
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null
  try {
    shared = new Ctor()
  } catch {
    // No output device, or the browser says no. Silence beats a crash.
    return null
  }
  return shared
}

/**
 * Sounds the klaxon. Safe to call anywhere: without Web Audio — old browsers,
 * jsdom, a locked-down environment — it simply stays quiet.
 */
export function playAlarm(): void {
  const ctx = context()
  if (!ctx) return
  // Suspended until the first user gesture. Resuming is cheap and idempotent.
  if (ctx.state === 'suspended') void ctx.resume()

  const zero = ctx.currentTime + 0.02
  for (const pulse of alarmPulses()) {
    const start = zero + pulse.start
    const end = start + pulse.duration

    const osc = ctx.createOscillator()
    // A sawtooth has the harsh harmonics of a real horn; a sine sounds friendly.
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(pulse.from, start)
    osc.frequency.linearRampToValueAtTime(pulse.to, end)

    // Short fades on both ends, otherwise the switch-on clicks audibly.
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.04)
    gain.gain.setValueAtTime(VOLUME, end - 0.07)
    gain.gain.linearRampToValueAtTime(0, end)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(end + 0.01)
  }
}
