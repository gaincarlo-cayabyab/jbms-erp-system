/**
 * Product Presentation & Formatting Engine
 * Parses raw SKU/item_name strings from legacy spreadsheet imports into:
 *   1. Clean human-readable Product Title (e.g., "Gildan 76000 Premium Adult T-Shirt")
 *   2. Structured Variant Details (e.g., "Color: Black • Size: 2XL • Fit: Oversized")
 *   3. Unique Alphanumeric SKU Code (e.g., "76000 GILDAN PREMIUM OVS-BLACK-4XL-ADULT RN")
 */

const APPAREL_SIZES = ['6XL', '5XL', '4XL', '3XL', '2XL', '2XS', 'XS', 'SM', 'MD', 'LG', 'XL']

export interface ParsedProductPresentation {
  title: string
  variantDetails: string
  color: string
  size: string
  specs: string
  sku: string
}

function toTitleCase(str: string): string {
  if (!str) return ''
  return str.replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
}

export function parseProductPresentation(p: {
  sku: string
  item_name?: string | null
  brand?: string | null
  category?: string | null
  tab?: string | null
}): ParsedProductPresentation {
  const rawSku = (p.sku || '').trim()
  const rawName = (p.item_name || rawSku).trim()
  const brand = (p.brand || '').trim()
  const cat = (p.category || '').trim().toUpperCase()
  const tab = (p.tab || '').trim().toUpperCase()

  let title = ''
  let color = ''
  let size = ''
  let specs = ''

  // ── 1. Digital Consumables: Headwear / Caps ──────────────────────────────────
  if (rawSku.toUpperCase().startsWith('1.1 CAPS-') || rawSku.toUpperCase().startsWith('1.1 CAPS/')) {
    const body = rawSku.replace(/^1\.1 CAPS[-/]\s*/i, '')
    const tokens = body.split(/[-/]/).map((t) => t.trim()).filter(Boolean)

    let capType = tokens[0] || 'Cap'
    const upCap = capType.toUpperCase()
    if (upCap.includes('BUCKET')) capType = 'Bucket Hat'
    else if (upCap.includes('BULLCAP')) capType = 'Bullcap / Baseball Cap'
    else if (upCap.includes('MESH')) capType = 'Mesh Trucker Cap'
    else capType = toTitleCase(capType)

    let finish = ''
    const colorTokens: string[] = []
    tokens.slice(1).forEach((tok) => {
      const up = tok.toUpperCase()
      if (up.includes('ACID WASH')) finish = 'Acid Wash'
      else if (up.includes('DENIM')) finish = 'Denim'
      else colorTokens.push(tok)
    })

    title = finish ? `${capType} (${finish})` : capType

    let colorStr = colorTokens.join(' / ')
    const upColor = colorStr.toUpperCase().replace(/\s+/g, ' ')
    if (upColor === 'BLK BLK' || upColor === 'BLK - BLK') colorStr = 'Black / Black'
    else if (upColor === 'BLK WHT' || upColor === 'BLK - WHT') colorStr = 'Black / White'
    else if (upColor === 'CAMOU WHT' || upColor === 'CAMOU - WHT') colorStr = 'Camouflage / White'
    else if (upColor === 'PINK WHT' || upColor === 'PINK - WHT') colorStr = 'Pink / White'
    else if (upColor === 'RBLUE WHT' || upColor === 'RBLUE - WHT') colorStr = 'Royal Blue / White'
    else if (upColor === 'RED WHT' || upColor === 'RED - WHT') colorStr = 'Red / White'
    else if (upColor === 'YELLOW WHT' || upColor === 'YELLOW - WHT') colorStr = 'Yellow / White'
    else if (upColor.includes('ASST')) colorStr = 'Assorted Colors'
    else colorStr = toTitleCase(colorStr)

    color = colorStr
    return {
      title,
      variantDetails: color ? `Color: ${color}` : '',
      color,
      size: '',
      specs: finish,
      sku: rawSku,
    }
  }

  // ── 2. Digital Consumables: Cotton Twill Tape ───────────────────────────────
  if (rawSku.toUpperCase().startsWith('1.2 COTTON')) {
    const widthMatch = rawSku.match(/\(([^)]+)\)/)
    const width = widthMatch ? widthMatch[1].replace('-', '/') + ' inch' : ''
    const colorMap: Record<string, string> = {
      BLK: 'Black',
      WHT: 'White',
      NBLUE: 'Navy Blue',
      RED: 'Red',
      RBLUE: 'Royal Blue',
    }
    let c = ''
    for (const [code, val] of Object.entries(colorMap)) {
      if (rawSku.toUpperCase().includes(code)) {
        c = val
        break
      }
    }
    const details = [c ? `Color: ${c}` : '', width ? `Width: ${width}` : ''].filter(Boolean).join(' • ')
    return {
      title: 'Cotton Twill Tape',
      variantDetails: details,
      color: c,
      size: width,
      specs: width,
      sku: rawSku,
    }
  }

  // ── 3. Digital Consumables: Foldable Fans ──────────────────────────────────
  if (rawSku.toUpperCase().startsWith('1.3 FAN')) {
    const c = toTitleCase(rawSku.replace(/^1\.3 FAN[- ]/i, '').replace(/[-_]/g, ' ').trim())
    return {
      title: 'Sublimation Foldable Hand Fan',
      variantDetails: c ? `Color: ${c}` : '',
      color: c,
      size: '',
      specs: 'Foldable Fan',
      sku: rawSku,
    }
  }

  // ── 4. Inks & Consumables ──────────────────────────────────────────────────
  if (cat === 'INKS' || rawSku.toUpperCase().startsWith('CUYI PIGMENT')) {
    if (rawSku.toUpperCase().startsWith('CUYI PIGMENT INK-') || rawSku.toUpperCase().startsWith('CUYI PIGMENT')) {
      const c = toTitleCase(rawSku.replace(/^CUYI PIGMENT INK[- ]/i, '').replace(/100ML/i, '').replace(/[-_ ]+$/, '').trim())
      return {
        title: 'Cuyi Pigment Ink (100ml)',
        variantDetails: `Color: ${c} • Volume: 100ml`,
        color: c,
        size: '100ml',
        specs: 'Pigment Ink',
        sku: rawSku,
      }
    }
  }

  // ── 5. Silkscreen Supplies: Tulco Paints, Pigments & Auxiliaries ────────────
  if (cat.startsWith('TULCO') || brand === 'Tulco' || rawSku.toUpperCase().startsWith('TULCO') || rawSku.toUpperCase().startsWith('ECCO MIGHTY')) {
    let paintFamily = 'Tulco Textile Screen Printing Paint'
    if (cat.includes('PIGMENT')) paintFamily = 'Tulco Screen Printing Pigment Concentrate'
    else if (cat.includes('AUXILIAR')) paintFamily = 'Tulco Textile Auxiliary Chemical'

    const cleanDesc = rawSku.replace(/^TULCO[- ]/i, '').replace(/[- ]1KG/i, '').replace(/[-_]/g, ' ').trim()
    return {
      title: paintFamily,
      variantDetails: `Color/Type: ${toTitleCase(cleanDesc)} • Weight: 1kg`,
      color: toTitleCase(cleanDesc),
      size: '1kg',
      specs: '1kg Can',
      sku: rawSku,
    }
  }

  if (cat.includes('JJ VIRGO') || brand === 'JJ Virgo' || rawSku.toUpperCase().startsWith('JJ VIRGO')) {
    const cleanDesc = rawSku.replace(/^JJ VIRGO[- ]/i, '').replace(/[- ]1KG/i, '').replace(/[-_]/g, ' ').trim()
    return {
      title: 'JJ Virgo Textile Printing Ink',
      variantDetails: `Specs: ${toTitleCase(cleanDesc)} • Weight: 1kg`,
      color: '',
      size: '1kg',
      specs: '1kg Can',
      sku: rawSku,
    }
  }

  // ── 6. Heat Transfer Vinyl ──────────────────────────────────────────────────
  if (cat.includes('VINYL') || rawSku.toUpperCase().startsWith('VINYL ')) {
    const colorPart = rawSku.replace(/^VINYL\s+/i, '').replace(/\/.*$/i, '').trim()
    const cleanC = toTitleCase(colorPart)
    return {
      title: 'Heat Transfer Vinyl Roll (HTV)',
      variantDetails: `Color: ${cleanC} • Unit: Per Meter`,
      color: cleanC,
      size: 'Per Meter',
      specs: 'HTV Roll',
      sku: rawSku,
    }
  }

  // ── 7. Transfer Papers & Media Supply ───────────────────────────────────────
  if (cat.includes('STICKERS') || cat.includes('PAPERS') || tab === 'MEDIA SUPPLY' || cat.includes('TARPAULIN')) {
    if (rawSku.includes('3G US JET OPAQUE')) {
      return {
        title: '3G Jet-Opaque Heat Transfer Paper',
        variantDetails: 'Application: Dark Fabrics (DTP)',
        color: '',
        size: 'A4 / Sheet',
        specs: 'Dark Transfer Paper',
        sku: rawSku,
      }
    }
    if (rawSku.includes('3G US JET PRO')) {
      return {
        title: 'Jet-Pro SS Heat Transfer Paper',
        variantDetails: 'Application: Light Fabrics (LTP)',
        color: '',
        size: 'A4 / Sheet',
        specs: 'Light Transfer Paper',
        sku: rawSku,
      }
    }
    if (rawSku.includes('ECO-WHITE-SUBLI-PAPER')) {
      const match = rawSku.match(/\(([^)]+)\)/)
      const roll = match ? match[1] : 'Roll'
      return {
        title: 'Eco-White Sublimation Paper Roll',
        variantDetails: `Roll Size: ${roll}`,
        color: 'White',
        size: roll,
        specs: 'Sublimation Paper',
        sku: rawSku,
      }
    }
    if (rawSku.toUpperCase().includes('TARPAULIN')) {
      const match = rawSku.match(/\(([^)]+)\)/)
      const roll = match ? match[1].replace('/', '•') : '50M Roll'
      return {
        title: 'Frontlit Tarpaulin Banner Roll (50m)',
        variantDetails: `Specs: ${roll}`,
        color: 'Glossy White',
        size: '50m',
        specs: roll,
        sku: rawSku,
      }
    }
  }

  // ── 8. Apparel Brands (Gildan, Smilee, 3K, AIIZ, Fruit of the Loom, Blue Corner, Simple, etc.) ────
  const isApparel =
    tab === 'APPAREL BRAND' ||
    tab === 'SUBLIMATION APPARELS' ||
    ['GILDAN', 'SMILEE', '3K', 'AIIZ', 'FRUIT OF THE LOOM', 'BLUE CORNER', 'SIMPLE', 'WINNER', 'YALEX', 'ARTIX'].includes(
      brand.toUpperCase()
    ) ||
    cat.includes('GIL') ||
    cat.includes('3K') ||
    cat.includes('SMILEE') ||
    cat.includes('FOTL') ||
    cat.includes('BC-') ||
    cat.includes('AIIZ') ||
    cat.includes('SIMPLE') ||
    cat.includes('WIN-') ||
    cat.includes('YALEX') ||
    cat.includes('ARTIX')

  if (isApparel) {
    let familyTitle = ''

    if (cat === '76000-GIL-PREM') familyTitle = 'Gildan 76000 Premium Adult T-Shirt'
    else if (cat === '76000B-GIL-YOUTH') familyTitle = 'Gildan 76000B Youth T-Shirt'
    else if (cat.includes('HA00')) familyTitle = 'Gildan Hammer Heavyweight T-Shirt'
    else if (cat.includes('88500')) familyTitle = 'Gildan 88500 Pullover Hooded Sweatshirt'
    else if (cat === 'SMILEE-BW-PQ') familyTitle = 'Smilee BW Pique Collared Poloshirt'
    else if (cat === 'SMILEE-BW-RN') familyTitle = 'Smilee BW Plain Round Neck T-Shirt'
    else if (cat === 'SMILEE-ECONO') familyTitle = 'Smilee Econo Everyday Round Neck T-Shirt'
    else if (cat.includes('PW-TIPPED')) familyTitle = 'Smilee PW Tipped Pique Poloshirt'
    else if (cat.includes('COOLPASS')) familyTitle = 'Smilee Coolpass Performance Poloshirt'
    else if (cat.includes('SMILEE-CB-FLEECE-HOODIE')) familyTitle = 'Smilee CB Fleece Pullover Hoodie'
    else if (cat.includes('FLEECE-HOODIE-WITH-ZIP')) familyTitle = 'Smilee Fleece Zipper Hoodie'
    else if (cat.includes('COLLARED JACKET')) familyTitle = 'Smilee Collared Zipper Jacket'
    else if (cat.includes('SWEATSHIRT')) familyTitle = 'Smilee Fleece Crewneck Sweatshirt'
    else if (cat.includes('TUCK-POLO')) familyTitle = 'Smilee Tuck Pique Poloshirt'
    else if (cat === 'SMILEE-COOLFIT') familyTitle = 'Smilee Cool-Fit Performance Shirt'
    else if (cat === '3K COTTON LITE' || cat.includes('3K-COTLT')) familyTitle = '3K Cotton Lite Round Neck T-Shirt (180gsm)'
    else if (cat === '3K PREMIUM' || cat.includes('3K-PC')) familyTitle = '3K Premium Combed Cotton T-Shirt'
    else if (cat === '3K HOODIE') familyTitle = '3K Heavyweight Pullover Hoodie'
    else if (cat === '3K COTTONBLEND' || cat.includes('3K-CB')) familyTitle = '3K Cotton-Blend Everyday T-Shirt'
    else if (cat === '3K PROMAX' || cat.includes('3K-PM')) familyTitle = '3K ProMax Heavyweight Oversized T-Shirt'
    else if (cat.includes('FOTL-CS')) familyTitle = 'Fruit of the Loom Classic Adult Round Neck T-Shirt'
    else if (cat.includes('FOTL-SP-LADIES')) familyTitle = 'Fruit of the Loom Soft Premium Lady-Fit T-Shirt'
    else if (cat.includes('FOTL-SP')) familyTitle = 'Fruit of the Loom Soft Premium Adult T-Shirt'
    else if (cat.includes('FOTL-KIDS')) familyTitle = 'Fruit of the Loom Kids T-Shirt'
    else if (cat.includes('BC-POLO')) familyTitle = 'Blue Corner Plain Pique Poloshirt'
    else if (cat.includes('BC-ADULT')) familyTitle = 'Blue Corner Adult Round Neck T-Shirt'
    else if (cat.includes('AIIZ')) familyTitle = 'AIIZ Basic Round Neck Adult T-Shirt'
    else if (cat.includes('SIMPLE DRI-KD')) familyTitle = 'Simple Active Dri-Fit Kids T-Shirt'
    else if (cat.includes('SIMPLE DRI')) familyTitle = 'Simple Active Dri-Fit T-Shirt'
    else if (cat.includes('SIMPLE ACT')) familyTitle = 'Simple Active Cotton T-Shirt'
    else if (cat.includes('WIN-XTR') || cat.includes('WINNER')) familyTitle = 'Winner X-Treme Combed Cotton T-Shirt'
    else if (cat.includes('YALEX')) familyTitle = 'Yalex Gold Adult Round Neck T-Shirt'
    else if (cat.includes('ARTIX')) familyTitle = 'Artix Combed Cotton Adult Round Neck T-Shirt'
    else if (cat.includes('JERSEY UNIFORMS')) familyTitle = 'Custom Sublimation Jersey Uniform'
    else if (cat.includes('CYCLING')) familyTitle = 'Custom Sublimation Cycling Jersey'
    else if (cat.includes('JACKET AND JOGGING')) familyTitle = 'Custom Sublimation Jacket & Jogging Pants'
    else if (cat.includes('POLO SHIRTS')) familyTitle = 'Custom Sublimation Polo Shirt'
    else if (cat.includes('BANNERS')) familyTitle = 'Custom Sublimation Fabric Banner'
    else if (brand) familyTitle = `${brand} Apparel`
    else familyTitle = 'Apparel Blank'

    // Extract size
    const tokens = rawSku.split(/[-/]/).map((t) => t.trim()).filter(Boolean)
    let foundSize = ''
    for (const sz of APPAREL_SIZES) {
      if (tokens.some((t) => t.toUpperCase() === sz)) {
        foundSize = sz
        break
      }
    }

    // Extract color
    const ignoreWords = [
      '76000', '76000B', 'HA00', '88500', 'GILDAN', 'PREMIUM', 'OVS', 'ADULT', 'RN', 'YOUTH',
      'SWEATSHIRT', 'PULLOVER', 'HOODED', 'NO ZIP', 'SMILEE', 'BW', 'PQ', 'PIQUE', 'POLOSHIRT',
      'COLLARED', 'COOLFIT', '3K', 'PC', 'COTLT', '180GSM', 'CB', 'PM', 'OVERSIZED', 'HOODIE',
      'FOTL', 'CLASSIC', 'SP', 'BC', 'TS', 'AIIZ', 'SIMPLE', 'DRI', 'ACT', 'WINNER', 'WIN', 'XTR',
      'ARTIX', 'COTTON', 'PLAIN', 'LADY-FIT', 'YALEX', 'KD', 'KIDS', 'ECONO', 'PW', 'TIPPED', 'COOLPASS',
    ]

    const colorTokens = tokens.filter((tok) => {
      const up = tok.toUpperCase().trim()
      if (APPAREL_SIZES.includes(up)) return false
      if (ignoreWords.includes(up)) return false
      if (up.startsWith('S0') || up.startsWith('S1') || up.includes('YEAR') || up.includes('Y-')) return false
      const subWords = up.split(' ')
      if (subWords.every((w) => ignoreWords.includes(w))) return false
      return true
    })

    let cleanColorStr = colorTokens.join(' / ').trim()
    ignoreWords.forEach((w) => {
      const reg = new RegExp('^' + w + '\\s+', 'i')
      cleanColorStr = cleanColorStr.replace(reg, '')
    })
    cleanColorStr = toTitleCase(cleanColorStr)

    const detailsArr: string[] = []
    if (cleanColorStr) detailsArr.push(`Color: ${cleanColorStr}`)
    if (foundSize) detailsArr.push(`Size: ${foundSize}`)
    if (rawSku.toUpperCase().includes('OVERSIZED') || rawSku.toUpperCase().includes('OVS')) detailsArr.push('Fit: Oversized')
    else if (rawSku.toUpperCase().includes('COLLARED')) detailsArr.push('Style: Collared')
    else if (rawSku.toUpperCase().includes('YOUTH') || rawSku.toUpperCase().includes('KIDS') || rawSku.toUpperCase().includes('KD')) detailsArr.push('Cut: Youth / Kids')

    return {
      title: familyTitle,
      variantDetails: detailsArr.join(' • '),
      color: cleanColorStr,
      size: foundSize,
      specs: familyTitle,
      sku: rawSku,
    }
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  const cleanFallback = rawName.replace(/^[-/]+|[-/]+$/g, '').trim()
  return {
    title: toTitleCase(cleanFallback.replace(/[-_]/g, ' ')),
    variantDetails: '',
    color: '',
    size: '',
    specs: '',
    sku: rawSku,
  }
}
