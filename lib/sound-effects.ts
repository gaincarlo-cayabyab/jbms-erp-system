'use client'

/**
 * Ultra-low-latency Web Audio API synthesizer for tactile POS & PIN keypad feedback.
 * Synthesizes crisp mechanical clicks, backspace drops, success chimes, and error buzzers
 * with 0 network latency and 0 asset downloads.
 * Specially calibrated with multi-layer harmonics and boosted gain for clear, punchy playback
 * on tablet & mobile phone built-in speakers.
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
 * Loud, crisp, and punchy mechanical key tap sound with micro-pitch variation per digit.
 * Utilizes a 3-layer sound design (triangle harmonic click + high transient snap + punch body)
 * specifically tuned to cut through tablet speaker grills with satisfying mechanical volume.
 */
export function playPinKeySound(digit?: string) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const digitNum = digit ? parseInt(digit, 10) || 5 : 5
    // Micro-pitch modulation (750Hz - 1050Hz) — high-presence vocal range for mobile speaker clarity
    const baseFreq = 750 + digitNum * 30

    // Master volume bus
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.95, now)
    masterGain.connect(ctx.destination)

    // Layer 1: Triangle harmonic transient (punchy keycap attack)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(baseFreq * 1.4, now)
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.055)

    gain1.gain.setValueAtTime(0.85, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.06)
    osc1.connect(gain1)
    gain1.connect(masterGain)
    osc1.start(now)
    osc1.stop(now + 0.065)

    // Layer 2: High tactile snap (1800Hz - 2400Hz) — maximum clarity on tablet speakers
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1800 + digitNum * 50, now)
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.035)

    gain2.gain.setValueAtTime(0.7, now)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.04)
    osc2.connect(gain2)
    gain2.connect(masterGain)
    osc2.start(now)
    osc2.stop(now + 0.045)

    // Layer 3: Solid tactile punch body (340Hz -> 120Hz)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(340, now)
    osc3.frequency.exponentialRampToValueAtTime(120, now + 0.05)

    gain3.gain.setValueAtTime(0.75, now)
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.055)
    osc3.connect(gain3)
    gain3.connect(masterGain)
    osc3.start(now)
    osc3.stop(now + 0.06)
  } catch {
    // Ignore audio policy exceptions on older/restricted browsers
  }
}

/**
 * Loud, tactile backspace drop tone
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

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.065)

    gain.gain.setValueAtTime(0.85, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.075)
  } catch {}
}

/**
 * Loud reset / clear sweep sound
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

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(450, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08)

    gain.gain.setValueAtTime(0.8, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.085)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.09)
  } catch {}
}

/**
 * Loud pleasant harmonic verification chime (E5 -> B5)
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
    gain1.gain.setValueAtTime(0.65, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.24)

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(987.77, now + 0.08)
    gain2.gain.setValueAtTime(0.75, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.4)
  } catch {}
}

/**
 * Loud low-pitch buzz on invalid PIN entry
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
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.setValueAtTime(130, now + 0.09)

    gain.gain.setValueAtTime(0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.26)
  } catch {}
}
