'use client'

/**
 * Premium Haptic Sound Synthesizer for Enterprise PIN Keypad.
 * Modeled after luxury mechanical keyboard "thock" switches (lubed custom switches)
 * and iOS/Stripe terminal tactile feedback.
 * 
 * Uses filtered acoustic transients and warm resonant decay — strictly avoiding
 * harsh synthetic beeps or grating high-frequency square/triangle waves.
 */

let audioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

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

    // Pre-generate noise buffer for tactile switch contacts
    if (audioCtx && !noiseBuffer) {
      const sampleRate = audioCtx.sampleRate
      const bufferSize = Math.floor(sampleRate * 0.015) // 15ms acoustic impulse
      noiseBuffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        // Exponentially decaying acoustic white noise impulse
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28))
      }
    }
  } catch {}

  return audioCtx
}

function getAudioContext(): AudioContext | null {
  return initAudio()
}

/**
 * Premium Luxury Mechanical "Thock"
 * Produces a warm, rich, damped wooden/pebble keycap sound with zero harshness.
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
    // Micro-pitch modulation (360Hz - 480Hz) — warm, deep, comfortable on the ears
    const centerFreq = 380 + digitNum * 12

    // Master bus with gentle acoustic low-pass to eliminate all harshness
    const masterLowPass = ctx.createBiquadFilter()
    masterLowPass.type = 'lowpass'
    masterLowPass.frequency.setValueAtTime(1400, now)
    masterLowPass.Q.setValueAtTime(0.7, now)

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.75, now)
    masterLowPass.connect(masterGain)
    masterGain.connect(ctx.destination)

    // Layer 1: Acoustic mechanical switch contact (Filtered organic impulse)
    if (noiseBuffer) {
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer

      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(1100, now)
      noiseFilter.Q.setValueAtTime(1.5, now)

      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.65, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.015)

      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(masterLowPass)

      noiseSource.start(now)
      noiseSource.stop(now + 0.018)
    }

    // Layer 2: Warm deep resonant chamber ("thock" sine body)
    const bodyOsc = ctx.createOscillator()
    const bodyGain = ctx.createGain()

    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(centerFreq, now)
    bodyOsc.frequency.exponentialRampToValueAtTime(140, now + 0.045)

    bodyGain.gain.setValueAtTime(0.7, now)
    bodyGain.gain.exponentialRampToValueAtTime(0.005, now + 0.048)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(masterLowPass)

    bodyOsc.start(now)
    bodyOsc.stop(now + 0.052)
  } catch {
    // Ignore audio errors gracefully
  }
}

/**
 * Tactile wooden backspace tap
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
    const filter = ctx.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1100, now)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(310, now)
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.05)

    gain.gain.setValueAtTime(0.65, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.052)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.055)
  } catch {}
}

/**
 * Soft tactile reset sweep
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
    const filter = ctx.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1200, now)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.065)

    gain.gain.setValueAtTime(0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.068)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.072)
  } catch {}
}

/**
 * Luxury Hotel / Banking verification chime (Velvety Marimba C5 -> G5)
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Filter to give that warm Rhodes / Marimba bell tone
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, now)
    filter.connect(ctx.destination)

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    gain1.gain.setValueAtTime(0.5, now)
    gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.22)
    osc1.connect(gain1)
    gain1.connect(filter)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // Note 2: G5 (783.99 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(783.99, now + 0.09)
    gain2.gain.setValueAtTime(0.55, now + 0.09)
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.38)
    osc2.connect(gain2)
    gain2.connect(filter)
    osc2.start(now + 0.09)
    osc2.stop(now + 0.42)
  } catch {}
}

/**
 * Soft dual wooden knock on invalid PIN (replaces harsh buzz)
 */
export function playErrorBuzz() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Knock 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(180, now)
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.06)
    gain1.gain.setValueAtTime(0.45, now)
    gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.065)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.07)

    // Knock 2
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(160, now + 0.08)
    osc2.frequency.exponentialRampToValueAtTime(70, now + 0.14)
    gain2.gain.setValueAtTime(0.4, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.145)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.15)
  } catch {}
}
