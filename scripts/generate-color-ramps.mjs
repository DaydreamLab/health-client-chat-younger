#!/usr/bin/env node
/**
 * 600 錨點 → 11 階色票 + 日夜語意映射
 *
 * 彩色：對白 tint / 對黑 shade，比例沿用舊 brand 色階距離。
 * Neutral：同一規則，比例沿用舊 mist（較不飽和、底較灰）。
 *
 *   node scripts/generate-color-ramps.mjs
 */

const ANCHORS = {
  brand: '#0784B1',
  mist: '#42698E',
  forest: '#17C114',
  sand: '#F2A01D',
  coral: '#E00017',
  lagoon: '#278AFB'
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const CHROMATIC_MIX = {
  50: ['W', 0.939],
  100: ['W', 0.852],
  200: ['W', 0.707],
  300: ['W', 0.545],
  400: ['W', 0.344],
  500: ['W', 0.134],
  700: ['B', 0.239],
  800: ['B', 0.458],
  900: ['B', 0.626],
  950: ['B', 0.731]
}

const NEUTRAL_MIX = {
  50: ['W', 0.958],
  100: ['W', 0.925],
  200: ['W', 0.818],
  300: ['W', 0.679],
  400: ['W', 0.490],
  500: ['W', 0.263],
  700: ['B', 0.250],
  800: ['B', 0.496],
  900: ['B', 0.709],
  950: ['B', 0.798]
}

const WHITE = [1, 1, 1]
const BLACK = [0, 0, 0]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
}

function rgbToHex(rgb) {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function mix(a, b, t) {
  return a.map((channel, i) => channel * (1 - t) + b[i] * t)
}

function rampFromAnchor(anchorHex, recipe) {
  const src = hexToRgb(anchorHex)
  const out = {}
  for (const step of STEPS) {
    if (step === 600) {
      out[step] = anchorHex.toUpperCase()
      continue
    }
    const [toward, t] = recipe[step]
    out[step] = rgbToHex(mix(src, toward === 'W' ? WHITE : BLACK, t))
  }
  return out
}

function buildPalettes() {
  return {
    brand: rampFromAnchor(ANCHORS.brand, CHROMATIC_MIX),
    mist: rampFromAnchor(ANCHORS.mist, NEUTRAL_MIX),
    forest: rampFromAnchor(ANCHORS.forest, CHROMATIC_MIX),
    sand: rampFromAnchor(ANCHORS.sand, CHROMATIC_MIX),
    coral: rampFromAnchor(ANCHORS.coral, CHROMATIC_MIX),
    lagoon: rampFromAnchor(ANCHORS.lagoon, CHROMATIC_MIX)
  }
}

function cssVars(name, ramp) {
  return STEPS.map((step) => `  --color-${name}-${step}: ${ramp[step]};`).join('\n')
}

function semanticTokens(palettes) {
  const { brand, mist, forest, sand, coral, lagoon } = palettes
  const elevatedDark = rgbToHex(mix(hexToRgb(mist[900]), hexToRgb(mist[800]), 0.35))
  return {
    light: {
      '--ui-bg': mist[50],
      '--ui-bg-muted': mist[100],
      '--ui-bg-elevated': '#FFFFFF',
      '--ui-bg-accented': mist[200],
      '--ui-text': mist[600],
      '--ui-text-muted': mist[500],
      '--ui-text-toned': mist[500],
      '--ui-text-dimmed': mist[400],
      '--ui-text-highlighted': mist[600],
      '--ui-border': mist[200],
      '--ui-primary': 'var(--ui-color-primary-600)',
      '--ui-success': 'var(--ui-color-success-600)',
      '--ui-warning': 'var(--ui-color-warning-600)',
      '--ui-error': 'var(--ui-color-error-600)',
      '--ui-info': 'var(--ui-color-info-600)'
    },
    dark: {
      '--ui-bg': mist[950],
      '--ui-bg-muted': mist[900],
      '--ui-bg-elevated': elevatedDark,
      '--ui-bg-accented': mist[800],
      '--ui-text': mist[50],
      '--ui-text-muted': mist[400],
      '--ui-text-toned': mist[400],
      '--ui-text-dimmed': mist[500],
      '--ui-text-highlighted': mist[50],
      '--ui-border': mist[800],
      '--ui-primary': 'var(--ui-color-primary-400)',
      '--ui-success': 'var(--ui-color-success-400)',
      '--ui-warning': 'var(--ui-color-warning-400)',
      '--ui-error': 'var(--ui-color-error-400)',
      '--ui-info': 'var(--ui-color-info-400)'
    },
    hex: {
      brand,
      mist,
      forest,
      sand,
      coral,
      lagoon,
      chartPrimary: brand[600],
      elevatedDark,
      primaryLight: brand[600],
      primaryDark: brand[400],
      successLight: forest[600],
      successDark: forest[400],
      warningLight: sand[600],
      warningDark: sand[400],
      errorLight: coral[600],
      errorDark: coral[400],
      infoLight: lagoon[600],
      infoDark: lagoon[400]
    }
  }
}

function block(selector, tokens) {
  const body = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  return `${selector} {\n${body}\n}`
}

const palettes = buildPalettes()
const semantic = semanticTokens(palettes)

const themeCss = [
  '/* Candor brand → mapped to Nuxt UI primary */',
  cssVars('brand', palettes.brand),
  '',
  '/* Blue-gray neutral */',
  cssVars('mist', palettes.mist),
  '',
  '/* Semantic palettes */',
  cssVars('forest', palettes.forest),
  '',
  cssVars('sand', palettes.sand),
  '',
  cssVars('coral', palettes.coral),
  '',
  cssVars('lagoon', palettes.lagoon),
  '',
  `  --color-chart-primary: ${semantic.hex.chartPrimary};`
].join('\n')

console.log('=== @theme palettes ===\n')
console.log(themeCss)
console.log('\n=== semantic tokens ===\n')
console.log(block(':root', semantic.light))
console.log()
console.log(block('.dark', semantic.dark))
console.log('\n=== JSON ===\n')
console.log(JSON.stringify({ anchors: ANCHORS, palettes, semantic: semantic.hex }, null, 2))
