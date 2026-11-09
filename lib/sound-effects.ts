'use client'

/**
 * Enterprise Luxury Haptic Sound Synthesizer.
 * Designed specifically for POS & PIN Keypads on mobile/tablet devices.
 * 
 * Features:
 * - Pure Sine Wave acoustic modelling (zero harshness, zero synthetic buzz).
 * - Calibrated frequency sweep (1250Hz -> 650Hz) engineered to be 100% audible on tablet speakers.
 * - Teardrop gain envelope (3ms linear attack + 42ms exponential decay) preventing speaker pop.
 * - Handles Android AudioContext suspension with automatic async unlock.
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

/**
 * Internal synthesis for the luxury mechanical tactile "tock"
 */
function triggerPinSound(ctx: AudioContext, digit?: string) {
  try {
    const now = ctx.currentTime
    const digitNum = digit ? parseInt(digit, 10) || 5 : 5
    // Micro-pitch variation (1150Hz - 1350Hz) so each key feels tactile and organic
    const startFreq = 1180 + digitNum * 18
    const endFreq = 620 + digitNum * 8

    // Primary warm sine wave (sweet rounded pop)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(startFreq, now)
    osc1.frequency.exponentialRampToValueAtTime(endFreq, now + 0.038)

    // Smooth teardrop envelope: 3ms attack prevents DAC click, 42ms natural decay
    gain1.gain.setValueAtTime(0.01, now)
    gain1.gain.linearRampToValueAtTime(0.9, now + 0.003)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.048)

    // Subtle luxury harmonic overtone (adds tactile depth)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(startFreq * 1.75, now)
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.75, now + 0.025)

    gain2.gain.setValueAtTime(0.01, now)
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.002)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.028)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now)
    osc2.stop(now + 0.03)
  } catch {}
}

/**
 * Play luxury mechanical PIN key tap
 */
export function playPinKeySound(digit?: string) {
  try {
    const ctx = initAudio()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        triggerPinSound(ctx, digit)
      }).catch(() => {})
      return
    }

    triggerPinSound(ctx, digit)
  } catch {}
}

/**
 * Tactile downward drop tone for Backspace
 */
function triggerBackspaceSound(ctx: AudioContext) {
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(850, now)
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.045)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.75, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.052)
  } catch {}
}

export function playBackspaceSound() {
  try {
    const ctx = initAudio()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => triggerBackspaceSound(ctx)).catch(() => {})
      return
    }

    triggerBackspaceSound(ctx)
  } catch {}
}

/**
 * Double tactile sweep for Clear
 */
function triggerClearSound(ctx: AudioContext) {
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(950, now)
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.055)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.7, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.065)
  } catch {}
}

export function playClearSound() {
  try {
    const ctx = initAudio()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => triggerClearSound(ctx)).catch(() => {})
      return
    }

    triggerClearSound(ctx)
  } catch {}
}

/**
 * Luxury Hotel / Apple Pay grade verification chime (A5 -> E6)
 */
function triggerSuccessChime(ctx: AudioContext) {
  try {
    const now = ctx.currentTime

    // Note 1: A5 (880 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    gain1.gain.setValueAtTime(0.01, now)
    gain1.gain.linearRampToValueAtTime(0.6, now + 0.005)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.24)

    // Note 2: E6 (1318.5 Hz) - Pure glass sparkle
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.5, now + 0.08)
    gain2.gain.setValueAtTime(0.01, now + 0.08)
    gain2.gain.linearRampToValueAtTime(0.65, now + 0.085)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.4)
  } catch {}
}

export function playSuccessChime() {
  try {
    const ctx = initAudio()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => triggerSuccessChime(ctx)).catch(() => {})
      return
    }

    triggerSuccessChime(ctx)
  } catch {}
}

/**
 * Soft double tactile knock on invalid PIN
 */
function triggerErrorBuzz(ctx: AudioContext) {
  try {
    const now = ctx.currentTime

    // Knock 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(420, now)
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.05)
    gain1.gain.setValueAtTime(0.01, now)
    gain1.gain.linearRampToValueAtTime(0.6, now + 0.003)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.065)

    // Knock 2
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(360, now + 0.07)
    osc2.frequency.exponentialRampToValueAtTime(150, now + 0.12)
    gain2.gain.setValueAtTime(0.01, now + 0.07)
    gain2.gain.linearRampToValueAtTime(0.55, now + 0.073)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.07)
    osc2.stop(now + 0.135)
  } catch {}
}

export function playErrorBuzz() {
  try {
    const ctx = initAudio()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => triggerErrorBuzz(ctx)).catch(() => {})
      return
    }

    triggerErrorBuzz(ctx)
  } catch {}
}

export const soundEffects = {
  keyClick: (digit?: string) => playPinKeySound(digit),
  backspace: () => playBackspaceSound(),
  clear: () => playClearSound(),
  success: () => playSuccessChime(),
  error: () => playErrorBuzz(),
}

