import type { CSSProperties, ReactNode } from 'react'
import type { ModelBrand, ProviderKind } from '../../../shared/types'
import { brandForProviderInfo, brandLabels, detectBrand } from '../../../shared/modelNames'
import { BRAND_ART, type BrandId } from './brandPaths'
import { vendorLogos } from './vendorLogos'

/** ModelBrand plus Claude, which gets its own mark even though it is an Anthropic model. */
export type LogoBrand = ModelBrand | 'claude'

/** Brands with hand-tuned art keep it; everything else uses the vendor icon set. */
const HAND_ART: Partial<Record<LogoBrand, BrandId>> = {
  openai: 'openai',
  anthropic: 'anthropic',
  claude: 'claude',
  deepseek: 'deepseek',
  openrouter: 'openrouter',
  ollama: 'ollama',
  google: 'gemini',
  mistral: 'mistral',
  qwen: 'qwen',
  meta: 'meta',
  huggingface: 'huggingface'
}

const VENDOR_KEY: Partial<Record<LogoBrand, string>> = {
  openai: 'openai',
  anthropic: 'anthropic',
  claude: 'claude',
  google: 'gemini',
  deepseek: 'deepseek',
  mistral: 'mistralai',
  groq: 'groq',
  xai: 'xai',
  ollama: 'ollama',
  openrouter: 'openrouter',
  github: 'githubcopilot',
  azure: 'azureopenai',
  aws: 'aws',
  huggingface: 'huggingface',
  cohere: 'cohere',
  perplexity: 'perplexity',
  together: 'together',
  fireworks: 'fireworks',
  moonshot: 'moonshotai',
  qwen: 'qwen',
  zhipu: 'zhipu',
  minimax: 'minimax',
  nvidia: 'nvidia',
  cerebras: 'cerebras',
  sambanova: 'sambanova',
  codeium: 'codeium',
  cursor: 'cursor',
  lmstudio: 'lmstudio',
  meta: 'meta',
  apple: 'apple',
  stability: 'stability',
  baidu: 'baidu',
  tencent: 'tencent',
  volcengine: 'volcengine',
  opencode: 'opencode'
}

/** Accent for brands whose icon ships without a colour. */
const FALLBACK_ACCENT: Partial<Record<LogoBrand, string>> = {
  groq: '#f55036',
  xai: '#d6d6d0',
  aws: '#ff9900',
  cohere: '#6e8e7e',
  together: '#0f6fff',
  fireworks: '#f26522',
  zhipu: '#3859ff',
  cerebras: '#f15a29',
  sambanova: '#ee7624',
  stability: '#8b5cf6',
  baidu: '#2932e1',
  tencent: '#0052d9',
  volcengine: '#1664ff',
  opencode: '#d7d7d1',
  generic: '#4f6ef7'
}

const DEFAULT_ACCENT = '#4f6ef7'

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value.padEnd(6, '0').slice(0, 6)
  const num = Number.parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

interface BrandStyle {
  color: string
  label: string
  /** Ink marks need a lift on dark themes, pale marks need a dip on light themes. */
  tone: '' | 'ink' | 'pale'
}

const styleCache = new Map<LogoBrand, BrandStyle>()

function styleFor(brand: LogoBrand): BrandStyle {
  const cached = styleCache.get(brand)
  if (cached) return cached
  const vendor = VENDOR_KEY[brand] ? vendorLogos[VENDOR_KEY[brand] ?? ''] : undefined
  const color = vendor?.hex ? `#${vendor.hex}` : (FALLBACK_ACCENT[brand] ?? DEFAULT_ACCENT)
  const [r, g, b] = hexToRgb(color)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  const style: BrandStyle = {
    color,
    label: brand === 'claude' ? 'Claude' : brandLabels[brand as ModelBrand],
    tone: luminance < 0.34 ? 'ink' : luminance > 0.74 ? 'pale' : ''
  }
  styleCache.set(brand, style)
  return style
}

export function brandLabel(brand: LogoBrand): string {
  return styleFor(brand).label
}

export function brandColor(brand: LogoBrand): string {
  return styleFor(brand).color
}

export function brandForProvider(provider: {
  label?: string
  baseUrl?: string
  kind?: ProviderKind | string
}): LogoBrand {
  const label = provider.label ?? ''
  const baseUrl = provider.baseUrl ?? ''
  if (!label && !baseUrl && provider.kind !== 'anthropic') return 'generic'
  const brand = brandForProviderInfo(
    label,
    baseUrl,
    provider.kind === 'anthropic' ? 'anthropic' : 'openai'
  )
  return claudeOr(brand, label)
}

export function brandForModel(model: string | null | undefined): LogoBrand | null {
  if (!model) return null
  return claudeOr(detectBrand(model), model)
}

/** Anthropic models read better with the Claude mark; other vendors keep their own brand. */
function claudeOr(brand: LogoBrand, haystack: string): LogoBrand {
  if (brand !== 'anthropic') return brand
  return /claude|sonnet|opus|haiku/i.test(haystack) ? 'claude' : 'anthropic'
}

/** Mark for providers the catalog does not know: a terminal prompt, never a letter. */
function GenericMark({ size }: { size: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 7.5 10 12l-5.5 4.5" />
      <path d="M12.5 17h7" />
    </svg>
  )
}

function BrandMark({ brand, size }: { brand: LogoBrand; size: number }): ReactNode {
  if (brand === 'generic') return <GenericMark size={size} />

  const hand = HAND_ART[brand] ? BRAND_ART[HAND_ART[brand] as BrandId] : undefined
  if (hand) {
    return (
      <svg width={size} height={size} viewBox={hand.viewBox} fill="currentColor" aria-hidden="true">
        {hand.paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </svg>
    )
  }

  const slug = VENDOR_KEY[brand]
  const vendor = slug ? vendorLogos[slug] : undefined
  if (vendor) {
    const paths = vendor.paths ?? (vendor.path ? [vendor.path] : [])
    if (paths.length) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {paths.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </svg>
      )
    }
  }

  return <GenericMark size={size} />
}

interface ProviderLogoProps {
  brand: LogoBrand
  size?: number
  className?: string
  title?: string
}

export function ProviderLogo({
  brand,
  size = 22,
  className,
  title
}: ProviderLogoProps): ReactNode {
  const style = styleFor(brand)
  return (
    <span
      className={`brand-logo${style.tone ? ` ${style.tone}` : ''}${className ? ` ${className}` : ''}`}
      style={
        {
          width: size,
          height: size,
          '--brand-color': style.color
        } as CSSProperties
      }
      title={title ?? style.label}
      aria-hidden={title ? undefined : true}
    >
      <BrandMark brand={brand} size={size} />
    </span>
  )
}
