'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Sparkles,
  Layers,
  Cpu,
  Flame,
  Printer,
  Shirt,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Scan,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CraftingPhase {
  id: string
  title: string
  category: string
  badgeText: string
  description: string
  specs: string[]
  accentColor: string
  secondaryColor: string
  particleColor: string
  meshType: 'jersey' | 'uniform' | 'gantry' | 'dtg' | 'large_fabric' | 'print_roll'
  laserColor: string
  glowClass: string
}

const CRAFTING_PHASES: CraftingPhase[] = [
  {
    id: 'sublimation',
    title: 'Full Sublimation Printing',
    category: 'Thermal Dye Diffusion',
    badgeText: 'Phase 01 • All-Over Dye Infusion',
    description:
      'High-density 220°C gas-infusion process bonding ultra-vivid CMYK pigments directly into synthetic fibers for seamless, fade-proof activewear and team jerseys.',
    specs: ['Zero-Hand Feel Inks', 'Edge-to-Edge Coverage', '220°C Thermal Transfer', '100% Breathable'],
    accentColor: '#06B6D4', // Cyan
    secondaryColor: '#EC4899', // Magenta
    particleColor: '#38BDF8',
    meshType: 'jersey',
    laserColor: '#00F5FF',
    glowClass: 'from-cyan-500/20 via-pink-500/10 to-transparent',
  },
  {
    id: 'uniforms',
    title: 'Commercial Apparel & Uniforms',
    category: 'Corporate & Industrial Manufacturing',
    badgeText: 'Phase 02 • Structured Tailoring & Embroidery',
    description:
      'Industrial-grade corporate blazers, heavy-duty safety workwear, hotelier hospitality sets & high-durability company uniforms engineered for professional longevity.',
    specs: ['Reinforced Seams', 'Industrial Poly-Cotton', 'High-Density Crest Embroidery', 'Stain-Resistant'],
    accentColor: '#3B82F6', // Cobalt Blue
    secondaryColor: '#F59E0B', // Amber Gold
    particleColor: '#60A5FA',
    meshType: 'uniform',
    laserColor: '#FBBF24',
    glowClass: 'from-blue-500/20 via-amber-500/10 to-transparent',
  },
  {
    id: 'diverse-tech',
    title: 'Diverse Printing Technologies',
    category: 'Hybrid Print Gantry Matrix',
    badgeText: 'Phase 03 • Specialized Surface Finishes',
    description:
      'Multi-process finishing arrays integrating silicone 3D puff, holographic foils, high-reflectivity 3M compounds, screen-press metallic inks and UV-curable polymer coats.',
    specs: ['Silicone High-Density 3D', 'Holographic & Gold Foil', 'UV-Curable Polymers', '12-Color Indexing'],
    accentColor: '#8B5CF6', // Violet
    secondaryColor: '#10B981', // Emerald
    particleColor: '#A78BFA',
    meshType: 'gantry',
    laserColor: '#C084FC',
    glowClass: 'from-violet-500/20 via-emerald-500/10 to-transparent',
  },
  {
    id: 'dtg',
    title: 'Garment (DTG)',
    category: 'Direct-to-Garment Micro-Jet',
    badgeText: 'Phase 04 • 2400 DPI Photographic Print',
    description:
      'Industrial piezo-electric print heads depositing nano-droplet pigments with white underbase onto 100% ring-spun cotton for ultra-high-definition photographic artwork.',
    specs: ['2400 × 1200 DPI Micro-Jet', 'High-Opacity White Base', 'Eco-Passport Pigments', 'Photorealistic Precision'],
    accentColor: '#EC4899', // Pink / Magenta
    secondaryColor: '#6366F1', // Indigo
    particleColor: '#F472B6',
    meshType: 'dtg',
    laserColor: '#F43F5E',
    glowClass: 'from-pink-500/20 via-indigo-500/10 to-transparent',
  },
  {
    id: 'merchandise',
    title: 'Merchandise & Large-Format Sublimation, Fabric',
    category: 'Grand Format & Promotional Branding',
    badgeText: 'Phase 05 • Wide Tension Canvas & Promos',
    description:
      'Massive 3.2-meter wide tension fabric displays, feather flags, architectural soft signage, custom branded tote bags, caps, lanyards and premium event collateral.',
    specs: ['3.2m Seamless Fabric Width', 'Tension Backdrops & Flags', 'Promotional Swag & Caps', 'Vivid Color Fastness'],
    accentColor: '#10B981', // Emerald
    secondaryColor: '#06B6D4', // Cyan
    particleColor: '#34D399',
    meshType: 'large_fabric',
    laserColor: '#10B981',
    glowClass: 'from-emerald-500/20 via-cyan-500/10 to-transparent',
  },
  {
    id: 'print-roll',
    title: 'Print Roll Services',
    category: 'Industrial Roll-to-Roll Calender',
    badgeText: 'Phase 06 • High-Capacity Rotary Press',
    description:
      'Continuous rotary drum calender sublimation for textile converters, independent fashion lines, wholesale fabric bolts, custom curtain drapery and bulk textile yards.',
    specs: ['Continuous Rotary Press', 'Thousands of Meters / Day', 'Uniform Thermal Nip Pressure', 'Contract Roll Output'],
    accentColor: '#F59E0B', // Amber
    secondaryColor: '#EF4444', // Red-Orange
    particleColor: '#FBBF24',
    meshType: 'print_roll',
    laserColor: '#F97316',
    glowClass: 'from-amber-500/20 via-orange-500/10 to-transparent',
  },
]

interface Point3D {
  x: number
  y: number
  z: number
}

interface Edge3D {
  p1: number
  p2: number
}

interface Particle3D {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

export default function Crafting3DShowcase() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [craftProgress, setCraftProgress] = useState(0) // 0 to 100%
  const [meterCounter, setMeterCounter] = useState(420.5)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const animFrameRef = useRef<number | null>(null)

  const activePhase = CRAFTING_PHASES[currentIdx]

  // Auto-advance through the 6 crafting phases every 6.8 seconds
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % CRAFTING_PHASES.length)
      setCraftProgress(0)
    }, 6800)

    return () => clearInterval(interval)
  }, [isPaused])

  // Continuous meter counter ticker for Phase 6 (Roll Services)
  useEffect(() => {
    const timer = setInterval(() => {
      setMeterCounter((prev) => +(prev + 0.3).toFixed(1))
    }, 400)
    return () => clearInterval(timer)
  }, [])

  // Mouse move parallax listener
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseRef.current.targetX = x * 2
    mouseRef.current.targetY = y * 2
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.targetX = 0
    mouseRef.current.targetY = 0
    setIsPaused(false)
  }, [])

  // ── 3D Canvas Rendering Engine ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = canvas.parentElement?.clientWidth || 460)
    let height = (canvas.height = 280)

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth || 460
      height = canvas.height = 280
    }
    window.addEventListener('resize', handleResize)

    // Build 3D models for each meshType
    function getMesh(meshType: CraftingPhase['meshType']): { points: Point3D[]; edges: Edge3D[] } {
      const points: Point3D[] = []
      const edges: Edge3D[] = []

      if (meshType === 'jersey' || meshType === 'uniform') {
        // 3D T-Shirt / Uniform Jersey model
        // Collar, shoulders, sleeves, torso, hem
        const collarY = -80
        const shoulderY = -75
        const sleeveTipY = -20
        const armpitY = -25
        const hemY = 85

        const pts = [
          // Collar center front/back
          { x: 0, y: collarY + 15, z: 20 },
          { x: 0, y: collarY, z: -20 },
          // Neck left/right
          { x: -28, y: collarY, z: 0 },
          { x: 28, y: collarY, z: 0 },
          // Shoulders
          { x: -68, y: shoulderY, z: 5 },
          { x: 68, y: shoulderY, z: 5 },
          // Sleeve outer tips
          { x: -115, y: sleeveTipY, z: 12 },
          { x: -105, y: sleeveTipY + 25, z: 12 },
          { x: 115, y: sleeveTipY, z: 12 },
          { x: 105, y: sleeveTipY + 25, z: 12 },
          // Armpits
          { x: -62, y: armpitY, z: 0 },
          { x: 62, y: armpitY, z: 0 },
          // Torso mid
          { x: -58, y: 30, z: 8 },
          { x: 58, y: 30, z: 8 },
          { x: 0, y: 30, z: 18 }, // Chest center crest
          // Hem bottom
          { x: -60, y: hemY, z: 5 },
          { x: 60, y: hemY, z: 5 },
          { x: 0, y: hemY, z: 15 },
          // Back hem
          { x: -60, y: hemY, z: -15 },
          { x: 60, y: hemY, z: -15 },
          // Back neck
          { x: -28, y: collarY, z: -10 },
          { x: 28, y: collarY, z: -10 },
        ]

        pts.forEach((p) => points.push(p))

        // Connect edges
        const addEdge = (i1: number, i2: number) => edges.push({ p1: i1, p2: i2 })
        // Collar
        addEdge(2, 0)
        addEdge(0, 3)
        addEdge(2, 1)
        addEdge(1, 3)
        // Shoulders
        addEdge(2, 4)
        addEdge(3, 5)
        // Sleeves L
        addEdge(4, 6)
        addEdge(6, 7)
        addEdge(7, 10)
        // Sleeves R
        addEdge(5, 8)
        addEdge(8, 9)
        addEdge(9, 11)
        // Body sides
        addEdge(10, 12)
        addEdge(12, 15)
        addEdge(11, 13)
        addEdge(13, 16)
        // Hem
        addEdge(15, 17)
        addEdge(17, 16)
        addEdge(15, 18)
        addEdge(16, 19)
        addEdge(18, 19)
        // Front Center / Seam
        addEdge(0, 14)
        addEdge(14, 17)
        // Cross contours for 3D fullness
        addEdge(10, 14)
        addEdge(11, 14)
        addEdge(12, 14)
        addEdge(13, 14)
      } else if (meshType === 'gantry') {
        // Multi-axis Print Gantry Frame + Dual Print Heads
        // Outer box frame
        const w = 110
        const h = 75
        const d = 50
        const corners = [
          { x: -w, y: -h, z: -d },
          { x: w, y: -h, z: -d },
          { x: w, y: h, z: -d },
          { x: -w, y: h, z: -d },
          { x: -w, y: -h, z: d },
          { x: w, y: -h, z: d },
          { x: w, y: h, z: d },
          { x: -w, y: h, z: d },
        ]
        corners.forEach((c) => points.push(c))
        // Edges of frame
        edges.push(
          { p1: 0, p2: 1 },
          { p1: 1, p2: 2 },
          { p1: 2, p2: 3 },
          { p1: 3, p2: 0 },
          { p1: 4, p2: 5 },
          { p1: 5, p2: 6 },
          { p1: 6, p2: 7 },
          { p1: 7, p2: 4 },
          { p1: 0, p2: 4 },
          { p1: 1, p2: 5 },
          { p1: 2, p2: 6 },
          { p1: 3, p2: 7 }
        )
        // Sliding Print Carriage
        const cW = 32
        const cH = 22
        const cD = 25
        const cY = -15
        const cOffset = points.length
        const carriage = [
          { x: -cW, y: cY - cH, z: -cD },
          { x: cW, y: cY - cH, z: -cD },
          { x: cW, y: cY + cH, z: -cD },
          { x: -cW, y: cY + cH, z: -cD },
          { x: -cW, y: cY - cH, z: cD },
          { x: cW, y: cY - cH, z: cD },
          { x: cW, y: cY + cH, z: cD },
          { x: -cW, y: cY + cH, z: cD },
        ]
        carriage.forEach((c) => points.push(c))
        edges.push(
          { p1: cOffset, p2: cOffset + 1 },
          { p1: cOffset + 1, p2: cOffset + 2 },
          { p1: cOffset + 2, p2: cOffset + 3 },
          { p1: cOffset + 3, p2: cOffset },
          { p1: cOffset + 4, p2: cOffset + 5 },
          { p1: cOffset + 5, p2: cOffset + 6 },
          { p1: cOffset + 6, p2: cOffset + 7 },
          { p1: cOffset + 7, p2: cOffset + 4 },
          { p1: cOffset, p2: cOffset + 4 },
          { p1: cOffset + 1, p2: cOffset + 5 },
          { p1: cOffset + 2, p2: cOffset + 6 },
          { p1: cOffset + 3, p2: cOffset + 7 }
        )
      } else if (meshType === 'dtg') {
        // Direct-to-Garment Flatbed Platen + T-Shirt base
        const pW = 95
        const pL = 80
        const bedY = 40
        // Platen base
        const platen = [
          { x: -pW, y: bedY, z: -pL },
          { x: pW, y: bedY, z: -pL },
          { x: pW, y: bedY, z: pL },
          { x: -pW, y: bedY, z: pL },
          { x: -pW, y: bedY + 16, z: -pL },
          { x: pW, y: bedY + 16, z: -pL },
          { x: pW, y: bedY + 16, z: pL },
          { x: -pW, y: bedY + 16, z: pL },
        ]
        platen.forEach((p) => points.push(p))
        edges.push(
          { p1: 0, p2: 1 },
          { p1: 1, p2: 2 },
          { p1: 2, p2: 3 },
          { p1: 3, p2: 0 },
          { p1: 4, p2: 5 },
          { p1: 5, p2: 6 },
          { p1: 6, p2: 7 },
          { p1: 7, p2: 4 },
          { p1: 0, p2: 4 },
          { p1: 1, p2: 5 },
          { p1: 2, p2: 6 },
          { p1: 3, p2: 7 }
        )
        // Print Rail Overhead
        const railOffset = points.length
        const rail = [
          { x: -pW - 15, y: -45, z: 0 },
          { x: pW + 15, y: -45, z: 0 },
          { x: -pW - 15, y: -35, z: 0 },
          { x: pW + 15, y: -35, z: 0 },
          // Nozzle block
          { x: -20, y: -35, z: 0 },
          { x: 20, y: -35, z: 0 },
          { x: 20, y: -15, z: 0 },
          { x: -20, y: -15, z: 0 },
        ]
        rail.forEach((r) => points.push(r))
        edges.push(
          { p1: railOffset, p2: railOffset + 1 },
          { p1: railOffset + 2, p2: railOffset + 3 },
          { p1: railOffset + 4, p2: railOffset + 5 },
          { p1: railOffset + 5, p2: railOffset + 6 },
          { p1: railOffset + 6, p2: railOffset + 7 },
          { p1: railOffset + 7, p2: railOffset + 4 }
        )
      } else if (meshType === 'large_fabric') {
        // Undulating 3.2m Grand Format Canvas Ribbon Mesh
        const cols = 5
        const rows = 4
        const startX = -105
        const stepX = 52
        const startY = -65
        const stepY = 44

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = startX + c * stepX
            const y = startY + r * stepY
            const z = Math.sin((c + r * 0.8) * 1.2) * 22
            points.push({ x, y, z })
          }
        }

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c
            if (c < cols - 1) edges.push({ p1: idx, p2: idx + 1 })
            if (r < rows - 1) edges.push({ p1: idx, p2: idx + cols })
          }
        }
      } else {
        // print_roll: Dual Calender Roll Drums & Continuous Fabric Feed
        // Two horizontal cylinders (Drum 1 Top, Drum 2 Bottom)
        const radius = 28
        const segments = 12
        const drumLength = 110

        // Cylinder 1 (Main Heat Drum)
        const c1Y = -28
        const startC1 = points.length
        for (let i = 0; i < segments; i++) {
          const theta = (i / segments) * Math.PI * 2
          const y = c1Y + Math.sin(theta) * radius
          const z = Math.cos(theta) * radius
          points.push({ x: -drumLength, y, z })
          points.push({ x: drumLength, y, z })
        }
        for (let i = 0; i < segments; i++) {
          const pL1 = startC1 + i * 2
          const pR1 = startC1 + i * 2 + 1
          const nextL1 = startC1 + ((i + 1) % segments) * 2
          const nextR1 = startC1 + ((i + 1) % segments) * 2 + 1

          edges.push({ p1: pL1, p2: nextL1 })
          edges.push({ p1: pR1, p2: nextR1 })
          edges.push({ p1: pL1, p2: pR1 })
        }

        // Secondary Nip Roll (Pressure Drum)
        const c2Y = 42
        const startC2 = points.length
        const r2 = 20
        for (let i = 0; i < segments; i++) {
          const theta = (i / segments) * Math.PI * 2
          const y = c2Y + Math.sin(theta) * r2
          const z = Math.cos(theta) * r2
          points.push({ x: -drumLength, y, z })
          points.push({ x: drumLength, y, z })
        }
        for (let i = 0; i < segments; i++) {
          const pL2 = startC2 + i * 2
          const pR2 = startC2 + i * 2 + 1
          const nextL2 = startC2 + ((i + 1) % segments) * 2
          const nextR2 = startC2 + ((i + 1) % segments) * 2 + 1

          edges.push({ p1: pL2, p2: nextL2 })
          edges.push({ p1: pR2, p2: nextR2 })
        }
      }

      return { points, edges }
    }

    // Particle field
    const particles: Particle3D[] = []
    const PARTICLE_COUNT = 45
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 280,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 160,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.2,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        color: activePhase.particleColor,
        alpha: Math.random() * 0.7 + 0.2,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 80,
      })
    }

    let rotY = 0
    let rotX = 0
    let scanLineY = -100 // Crafting laser scan vertical position
    let scanDirection = 1

    function render(time: number) {
      if (!ctx || !canvas) return

      // Smooth mouse lag
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      rotY = time * 0.0008 + mouseRef.current.x * 0.45
      rotX = Math.sin(time * 0.0006) * 0.12 - mouseRef.current.y * 0.35

      // Laser scan progression
      scanLineY += scanDirection * 1.15
      if (scanLineY > 95) {
        scanDirection = -1
      } else if (scanLineY < -95) {
        scanDirection = 1
      }

      // Update crafting progress for UI
      const normProgress = Math.round(((scanLineY + 95) / 190) * 100)
      setCraftProgress(normProgress)

      ctx.clearRect(0, 0, width, height)

      const fov = 340
      const centerX = width / 2
      const centerY = height / 2

      // 1. Draw glowing holographic grid plane in perspective
      ctx.save()
      const gridZ = 80
      ctx.strokeStyle = `${activePhase.accentColor}18`
      ctx.lineWidth = 1
      for (let gx = -180; gx <= 180; gx += 45) {
        ctx.beginPath()
        ctx.moveTo(centerX + gx * 0.6, centerY + 85)
        ctx.lineTo(centerX + gx * 1.4, centerY + 135)
        ctx.stroke()
      }
      ctx.restore()

      // 2. Render 3D Model Mesh
      const mesh = getMesh(activePhase.meshType)

      // Project 3D points to 2D screen
      const projected = mesh.points.map((p) => {
        // Rotate Y
        const cosY = Math.cos(rotY)
        const sinY = Math.sin(rotY)
        const x1 = p.x * cosY + p.z * sinY
        const z1 = -p.x * sinY + p.z * cosY

        // Rotate X
        const cosX = Math.cos(rotX)
        const sinX = Math.sin(rotX)
        const y2 = p.y * cosX - z1 * sinX
        const z2 = p.y * sinX + z1 * cosX

        const scale = fov / (fov + z2 + 180)
        return {
          x: centerX + x1 * scale,
          y: centerY + y2 * scale,
          z: z2,
          origY: p.y,
          scale,
        }
      })

      // Draw Edges with Laser Scan Shading (Crafting Synthesis Effect)
      mesh.edges.forEach((edge) => {
        const p1 = projected[edge.p1]
        const p2 = projected[edge.p2]
        if (!p1 || !p2) return

        // Compute if this segment is near or below the crafting laser scan
        const avgOrigY = (mesh.points[edge.p1].y + mesh.points[edge.p2].y) / 2
        const isCrafted = avgOrigY <= scanLineY
        const isNearLaser = Math.abs(avgOrigY - scanLineY) < 16

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)

        if (isNearLaser) {
          // Intense neon laser boundary
          ctx.strokeStyle = activePhase.laserColor
          ctx.lineWidth = 2.4
          ctx.shadowColor = activePhase.laserColor
          ctx.shadowBlur = 10
        } else if (isCrafted) {
          // Fully synthesized & baked fabric/surface
          ctx.strokeStyle = `${activePhase.accentColor}DF`
          ctx.lineWidth = 1.6
          ctx.shadowColor = activePhase.accentColor
          ctx.shadowBlur = 4
        } else {
          // Wireframe hologram blueprint (yet to be synthesized)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
          ctx.lineWidth = 0.9
          ctx.shadowBlur = 0
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      })

      // Draw 3D Vertices / Seam Nodes
      projected.forEach((p, idx) => {
        const origY = mesh.points[idx]?.y ?? 0
        const isCrafted = origY <= scanLineY
        const isNearLaser = Math.abs(origY - scanLineY) < 14

        ctx.beginPath()
        ctx.arc(p.x, p.y, isNearLaser ? 2.8 : isCrafted ? 2.0 : 1.2, 0, Math.PI * 2)

        if (isNearLaser) {
          ctx.fillStyle = '#FFFFFF'
          ctx.shadowColor = activePhase.laserColor
          ctx.shadowBlur = 8
        } else if (isCrafted) {
          ctx.fillStyle = activePhase.secondaryColor
          ctx.shadowBlur = 2
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
          ctx.shadowBlur = 0
        }
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // 3. Draw Sweeping 3D Laser Crafting Plane Line
      const laserScale = fov / (fov + 180)
      const laserScreenY = centerY + scanLineY * Math.cos(rotX) * laserScale
      const laserWidth = 175 * laserScale

      const grad = ctx.createLinearGradient(
        centerX - laserWidth,
        laserScreenY,
        centerX + laserWidth,
        laserScreenY
      )
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
      grad.addColorStop(0.2, activePhase.laserColor)
      grad.addColorStop(0.5, '#FFFFFF')
      grad.addColorStop(0.8, activePhase.laserColor)
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(centerX - laserWidth, laserScreenY)
      ctx.lineTo(centerX + laserWidth, laserScreenY)
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.2
      ctx.shadowColor = activePhase.laserColor
      ctx.shadowBlur = 14
      ctx.stroke()

      // Small digital telemetry crosshairs at laser center
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(centerX - 8, laserScreenY)
      ctx.lineTo(centerX + 8, laserScreenY)
      ctx.moveTo(centerX, laserScreenY - 6)
      ctx.lineTo(centerX, laserScreenY + 6)
      ctx.stroke()
      ctx.restore()

      // 4. Update & Draw Floating Micro-Pigment / Spark Particles
      particles.forEach((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.z += pt.vz
        pt.life += 0.5

        if (pt.life >= pt.maxLife || pt.y < -130 || pt.y > 130) {
          pt.x = (Math.random() - 0.5) * 240
          pt.y = scanLineY + (Math.random() - 0.5) * 20
          pt.z = (Math.random() - 0.5) * 120
          pt.life = 0
          pt.color = Math.random() > 0.5 ? activePhase.accentColor : activePhase.secondaryColor
        }

        // Project particle
        const cosY = Math.cos(rotY)
        const sinY = Math.sin(rotY)
        const px = pt.x * cosY + pt.z * sinY
        const pz = -pt.x * sinY + pt.z * cosY
        const pScale = fov / (fov + pz + 180)

        const sx = centerX + px * pScale
        const sy = centerY + pt.y * pScale

        const alpha = Math.sin((pt.life / pt.maxLife) * Math.PI) * pt.alpha

        ctx.beginPath()
        ctx.arc(sx, sy, pt.size * pScale, 0, Math.PI * 2)
        ctx.fillStyle = pt.color
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.shadowColor = pt.color
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1.0
      })

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [activePhase])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
      className="relative z-10 w-full max-w-xl my-auto py-3 select-none transition-all duration-300"
    >
      {/* ── Dynamic Ambient Glow Backdrop ─────────────────────────────── */}
      <div
        className={cn(
          'absolute -inset-4 bg-gradient-to-r rounded-3xl blur-2xl opacity-60 transition-all duration-700 pointer-events-none',
          activePhase.glowClass
        )}
      />

      {/* ── Main 3D Holographic Crafting Container ─────────────────────── */}
      <div className="relative rounded-3xl border border-white/20 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl overflow-hidden">
        {/* Top Header: Phase Badge & Real-Time Telemetry */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-2.5 w-2.5 rounded-full animate-ping"
              style={{ backgroundColor: activePhase.accentColor }}
            />
            <span
              className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border text-white shadow-2xs"
              style={{
                borderColor: `${activePhase.accentColor}60`,
                backgroundColor: `${activePhase.accentColor}25`,
              }}
            >
              {activePhase.badgeText}
            </span>
          </div>

          {/* Synthesis Telemetry Chips */}
          <div className="flex items-center gap-2 text-[10px] text-white/80 font-mono">
            <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
              <Scan className="h-3 w-3 text-cyan-400 animate-pulse" />
              <span>CRAFT: {craftProgress}%</span>
            </span>
            {activePhase.meshType === 'print_roll' ? (
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                {meterCounter} m
              </span>
            ) : (
              <span className="hidden sm:inline bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE 3D
              </span>
            )}
          </div>
        </div>

        {/* ── 3D Viewport Canvas ────────────────────────────────────────── */}
        <div className="relative w-full h-56 sm:h-64 my-1 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            title="Hover or move cursor to tilt 3D perspective"
          />

          {/* Subtle 3D Depth Watermark overlay */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <p className="text-[10px] font-mono tracking-widest uppercase text-white/30">
              JAPA • 3D MATRIX ENGINE
            </p>
          </div>

          <div className="absolute bottom-2 right-2 pointer-events-none">
            <p className="text-[10px] font-mono tracking-widest text-white/30 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              <span>PERSPECTIVE TILT</span>
            </p>
          </div>
        </div>

        {/* ── Title, Category & Description ─────────────────────────────── */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: activePhase.accentColor }}
            >
              {activePhase.category}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{activePhase.title}</span>
            <Sparkles className="h-4 w-4" style={{ color: activePhase.secondaryColor }} />
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100/85 leading-relaxed">
            {activePhase.description}
          </p>
        </div>

        {/* ── Production Specs Pills ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-white/10 mt-3">
          {activePhase.specs.map((spec) => (
            <div
              key={spec}
              className="flex items-center gap-1.5 text-[11px] text-white/90 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl"
            >
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: activePhase.accentColor }}
              />
              <span className="truncate">{spec}</span>
            </div>
          ))}
        </div>

        {/* ── 6 Phase Interactive Stepper / Navigation Bar ──────────────── */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white/60 mb-2">
            <span>PRODUCTION CYCLE</span>
            <span>
              {currentIdx + 1} of {CRAFTING_PHASES.length}
            </span>
          </div>

          {/* 6 Interactive Phase Indicator Pills */}
          <div className="grid grid-cols-6 gap-1.5">
            {CRAFTING_PHASES.map((phase, idx) => {
              const isActive = idx === currentIdx
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => {
                    setCurrentIdx(idx)
                    setCraftProgress(0)
                  }}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300 relative overflow-hidden group',
                    isActive ? 'scale-y-125' : 'bg-white/20 hover:bg-white/40'
                  )}
                  style={{
                    backgroundColor: isActive ? phase.accentColor : undefined,
                    boxShadow: isActive ? `0 0 10px ${phase.accentColor}` : undefined,
                  }}
                  title={`${idx + 1}. ${phase.title}`}
                >
                  <span className="sr-only">{phase.title}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Category Tab Chips */}
          <div className="flex items-center justify-between gap-1 mt-2.5 overflow-x-auto pb-0.5 scrollbar-none">
            {CRAFTING_PHASES.map((phase, idx) => {
              const isActive = idx === currentIdx
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => {
                    setCurrentIdx(idx)
                    setCraftProgress(0)
                  }}
                  className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded-md transition whitespace-nowrap',
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  {idx + 1}. {phase.id === 'sublimation' ? 'Sublimation' : phase.id === 'uniforms' ? 'Uniforms' : phase.id === 'diverse-tech' ? 'Diverse Tech' : phase.id === 'dtg' ? 'DTG' : phase.id === 'merchandise' ? 'Merch' : 'Print Roll'}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
