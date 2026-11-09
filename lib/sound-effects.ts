'use client'

/**
 * Ultra-low-latency Web Audio API synthesizer for tactile POS & PIN keypad feedback.
 * Synthesizes crisp mechanical clicks, backspace drops, success chimes, and error buzzers
 * with 0 network latency and 0 asset downloads.
 */

let audioCtx: AudioContext | null = null

export function initAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null

  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
      }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
  } catch {}

  return audioCtx
}

function getAudioContext(): AudioContext | null {
  return initAudio()
}

/**
 * Crisp, punchy mechanical key tap sound with micro-pitch variation per digit.
 * Calibrated with increased gain to be clearly audible on tablet / mobile phone speakers.
 */
export function playPinKeySound(digit?: string) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // Ensure context is running on user tap
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const digitNum = digit ? parseInt(digit, 10) || 5 : 5
    // Micro-pitch modulation (620Hz - 880Hz) — high clarity for tablet speakers
    const baseFreq = 620 + digitNum * 26

    // Primary click transient
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045)

    // Increased volume (0.55) so it's loud, punchy and distinct
    gain.gain.setValueAtTime(0.55, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.048)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)

    // Secondary body thud for mechanical tactile weight
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()

    thud.type = 'triangle'
    thud.frequency.setValueAtTime(240, now)
    thud.frequency.exponentialRampToValueAtTime(70, now + 0.038)

    thudGain.gain.setValueAtTime(0.35, now)
    thudGain.gain.exponentialRampToValueAtTime(0.005, now + 0.04)

    thud.connect(thudGain)
    thudGain.connect(ctx.destination)

    thud.start(now)
    thud.stop(now + 0.042)
  } catch {
    // Ignore audio policy exceptions on older/restricted browsers
  }
}

/**
 * Tactile backspace drop tone
 */
export function playBackspaceSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, now)
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.05)

    gain.gain.setValueAtTime(0.45, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.052)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.055)
  } catch {}
}

/**
 * Reset / clear sweep sound
 */
export function playClearSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(360, now)
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.062)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.065)
  } catch {}
}

/**
 * Pleasant harmonic verification chime (E5 -> B5)
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.2)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.22)

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(987.77, now + 0.09)
    gain2.gain.setValueAtTime(0.4, now + 0.09)
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.09)
    osc2.stop(now + 0.38)
  } catch {}
}

/**
 * Subtle low-pitch buzz on invalid PIN entry
 */
export function playErrorBuzz() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.setValueAtTime(110, now + 0.08)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  } catch {}
}
