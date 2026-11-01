import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANGUAGES, type Lang, type TranslationKey } from '../../../shared/i18n'
import { isImageModel, presentModel } from '../../../shared/modelNames'
import type {
  AccentId,
  ApprovalPolicy,
  DensityId,
  MotionId,
  ProviderDraft,
  ProviderKind,
  ProviderView,
  SettingsView,
  SkillInfo,
  ThemeId,
  WindowMode
} from '../../../shared/types'
import { errorText, formatBytes, newId } from '../utils'
import { useT } from '../i18n'
import { ProviderLogo, brandForModel, brandForProvider, type LogoBrand } from './ProviderLogo'
import {
  BoltIcon,
  BookIcon,
  CheckIcon,
  FolderIcon,
  GlobeIcon,
  LayersIcon,
  PlusIcon,
  RefreshIcon,
  SettingsIcon,
  ShieldIcon,
  SparkIcon,
  CopyIcon,
  TrashIcon,
  UsersIcon,
  XIcon
} from './Icons'

type SectionId =
  | 'general'
  | 'appearance'
  | 'behavior'
  | 'providers'
  | 'models'
  | 'projects'
  | 'access'
  | 'skills'
  | 'agents'

interface Section {
  id: SectionId
  label: TranslationKey
  icon: (props: { size?: number }) => ReactNode
  count: (settings: SettingsView) => number
}

const SECTIONS: Section[] = [
  { id: 'general', label: 's.sectionGeneral', icon: SettingsIcon, count: () => 0 },
  { id: 'appearance', label: 's.sectionAppearance', icon: SparkIcon, count: () => 0 },
  { id: 'behavior', label: 's.sectionBehavior', icon: BoltIcon, count: () => 0 },
  { id: 'providers', label: 's.sectionProviders', icon: GlobeIcon, count: (s) => s.providers.length },
  { id: 'models', label: 's.sectionModels', icon: LayersIcon, count: (s) => modelTotal(s) },
  { id: 'projects', label: 's.sectionProjects', icon: FolderIcon, count: (s) => s.projects.length },
  { id: 'access', label: 's.sectionAccess', icon: ShieldIcon, count: (s) => s.allowedRoots.length },
  { id: 'skills', label: 's.sectionSkills', icon: BookIcon, count: (s) => s.skills.length },
  { id: 'agents', label: 's.sectionAgents', icon: UsersIcon, count: (s) => s.agents.length }
]

const THEMES: { id: ThemeId; label: TranslationKey; hint: TranslationKey }[] = [
  { id: 'graphite', label: 's.theme.graphite', hint: 's.theme.graphiteHint' },
  { id: 'midnight', label: 's.theme.midnight', hint: 's.theme.midnightHint' },
  { id: 'light', label: 's.theme.light', hint: 's.theme.lightHint' }
]

const ACCENTS: { id: AccentId; label: TranslationKey; color: string }[] = [
  { id: 'graphite', label: 's.accent.graphite', color: '#aeb4c0' },
  { id: 'lime', label: 's.accent.lime', color: '#c6f24e' },
  { id: 'violet', label: 's.accent.violet', color: '#a78bfa' },
  { id: 'blue', label: 's.accent.blue', color: '#60a5fa' },
  { id: 'rose', label: 's.accent.rose', color: '#fb7185' },
  { id: 'amber', label: 's.accent.amber', color: '#fbbf24' }
]

const DENSITIES: { id: DensityId; label: TranslationKey }[] = [
  { id: 'comfy', label: 's.density.comfy' },
  { id: 'compact', label: 's.density.compact' }
]

const MOTIONS: { id: MotionId; label: TranslationKey }[] = [
  { id: 'full', label: 's.motion.full' },
  { id: 'calm', label: 's.motion.calm' }
]

const UI_SCALES = [90, 100, 110]

const WINDOW_MODES: { id: WindowMode; label: TranslationKey; hint: TranslationKey }[] = [
  { id: 'app', label: 's.window.app', hint: 's.window.appHint' },
  { id: 'terminal', label: 's.window.terminal', hint: 's.window.terminalHint' }
]

const POLICIES: { id: ApprovalPolicy; label: TranslationKey; desc: TranslationKey }[] = [
  { id: 'always', label: 's.approval.always', desc: 's.approval.alwaysDesc' },
  { id: 'smart', label: 's.approval.smart', desc: 's.approval.smartDesc' },
  { id: 'never', label: 's.approval.never', desc: 's.approval.neverDesc' }
]

const PRESETS: Array<{
  name: string
  labelKey?: TranslationKey
  kind: ProviderKind
  baseUrl: string
  models: string[]
}> = [
  { name: 'OpenAI', kind: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o-mini'] },
  { name: 'Anthropic', kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', models: [] },
  { name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: [] },
  { name: 'Google Gemini', kind: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
  { name: 'Groq', kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile'] },
  { name: 'DeepSeek', kind: 'openai', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { name: 'Mistral AI', kind: 'openai', baseUrl: 'https://api.mistral.ai/v1', models: ['mistral-large-latest', 'codestral-latest'] },
  { name: 'xAI (Grok)', kind: 'openai', baseUrl: 'https://api.x.ai/v1', models: ['grok-2-latest'] },
  {
    name: 'Ollama',
    labelKey: 's.presetOllama',
    kind: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    models: []
  },
  { name: 'custom', labelKey: 's.custom', kind: 'openai', baseUrl: '', models: [] }
]

interface FetchState {
  loading: boolean
  error: string
  info: string
}

interface Row {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  modelsText: string
  apiKey: string
  clearKey: boolean
  hasKey: boolean
  free: boolean
  fetch: FetchState
}

interface SettingsScreenProps {
  settings: SettingsView
  onClose: () => void
  onChanged: (view: SettingsView) => void
}

function toRow(provider: ProviderView): Row {
  return {
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    modelsText: provider.models.join('\n'),
    apiKey: '',
    clearKey: false,
    hasKey: provider.hasKey,
    free: provider.free,
    fetch: { loading: false, error: '', info: '' }
  }
}

function modelTotal(settings: SettingsView): number {
  return settings.providers.reduce((total, provider) => total + provider.models.length, 0)
}

function Card({
  title,
  note,
  aside,
  children,
  className
}: {
  title?: string
  note?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}): ReactNode {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {(title || note || aside) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {note && <p>{note}</p>}
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  )
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' }): ReactNode {
  return <span className={`badge${tone ? ` ${tone}` : ''}`}>{children}</span>
}

export function SettingsScreen({
  settings,
  onClose,
  onChanged
}: SettingsScreenProps): ReactNode {
  const { t, tc } = useT()
  const [section, setSection] = useState<SectionId>(() =>
    settings.providers.length ? 'general' : 'providers'
  )
  const [rows, setRows] = useState<Row[]>(() => settings.providers.map(toRow))
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [compactAt, setCompactAt] = useState(settings.compactAt)

  useEffect(() => {
    setCompactAt(settings.compactAt)
  }, [settings.compactAt])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const dirty = useMemo(
    () =>
      rows.length !== settings.providers.length ||
      rows.some((row) => {
        const original = settings.providers.find((provider) => provider.id === row.id)
        if (!original) return true
        const models = row.modelsText
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean)
        return (
          original.label !== row.label.trim() ||
          original.kind !== row.kind ||
          original.baseUrl !== row.baseUrl.trim() ||
          original.hasKey !== (row.hasKey && !row.clearKey) ||
          original.models.join('\n') !== models.join('\n') ||
          Boolean(row.apiKey.trim()) ||
          row.clearKey
        )
      }),
    [rows, settings.providers]
  )

  function patchRow(id: string, patch: Partial<Row>): void {
    setError('')
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function patchFetch(id: string, patch: Partial<FetchState>): void {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, fetch: { ...row.fetch, ...patch } } : row))
    )
  }

  function addProvider(preset: (typeof PRESETS)[number]): void {
    setError('')
    const label = preset.labelKey ? t(preset.labelKey) : preset.name
    setRows((prev) => [
      ...prev,
      {
        id: newId(),
        label,
        kind: preset.kind,
        baseUrl: preset.baseUrl,
        modelsText: preset.models.join('\n'),
        apiKey: '',
        clearKey: false,
        hasKey: false,
        free: false,
        fetch: { loading: false, error: '', info: '' }
      }
    ])
  }

  function duplicateProvider(source: Row): void {
    setError('')
    const suffix = t('s.accountCopy')
    setRows((prev) => [
      ...prev,
      {
        ...source,
        id: newId(),
        label: `${source.label} (${suffix})`,
        apiKey: '',
        clearKey: false,
        hasKey: false,
        fetch: { loading: false, error: '', info: '' }
      }
    ])
  }

  async function run(action: () => Promise<SettingsView | null>): Promise<void> {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const view = await action()
      if (view) onChanged(view)
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setBusy(false)
    }
  }

  function changeAppearance(patch: Partial<{
    theme: ThemeId
    accent: AccentId
    density: DensityId
    windowMode: WindowMode
    motion: MotionId
    uiScale: number
  }>): void {
    void run(() =>
      window.closecode.setAppearance({
        theme: patch.theme ?? settings.theme,
        accent: patch.accent ?? settings.accent,
        density: patch.density ?? settings.density,
        windowMode: patch.windowMode ?? settings.windowMode,
        motion: patch.motion ?? settings.motion,
        uiScale: patch.uiScale ?? settings.uiScale
      })
    )
  }

  function changeReviewer(value: string): void {
    const selected = reviewers.find((reviewer) => reviewer.value === value)
    void run(() =>
      window.closecode.setSecondOpinion(
        selected
          ? { providerId: selected.providerId, model: selected.model }
          : { providerId: null, model: null }
      )
    )
  }

  function commitCompact(): void {
    if (compactAt === settings.compactAt) return
    void run(() => window.closecode.setCompactAt(compactAt))
  }

  async function loadModels(row: Row): Promise<void> {    if (!row.baseUrl.trim()) {
      patchFetch(row.id, { error: t('s.noBaseUrlForFetch'), info: '' })
      return
    }
    patchFetch(row.id, { loading: true, error: '', info: '' })
    try {
      const models = await window.closecode.fetchModels({
        providerId: row.id,
        kind: row.kind,
        baseUrl: row.baseUrl.trim(),
        apiKey: row.apiKey.trim() || undefined,
        clearKey: row.clearKey || undefined
      })
      if (!models.length) {
        patchFetch(row.id, { loading: false, error: t('s.emptyModelList') })
        return
      }
      patchRow(row.id, {
        modelsText: models.join('\n'),
        fetch: { loading: false, error: '', info: t('s.fetched', { n: models.length }) }
      })
    } catch (failure) {
      patchFetch(row.id, { loading: false, error: errorText(failure) })
    }
  }

  async function saveProviders(): Promise<void> {
    if (saving) return
    setSaving(true)
    setError('')
    const providers: ProviderDraft[] = rows.map((row) => {
      const draft: ProviderDraft = {
        id: row.id,
        label: row.label.trim() || t('s.defaultProvider'),
        kind: row.kind,
        baseUrl: row.baseUrl.trim(),
        models: row.modelsText
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean)
      }
      if (row.apiKey.trim()) draft.apiKey = row.apiKey.trim()
      if (row.clearKey) draft.clearKey = true
      return draft
    })
    try {
      const view = await window.closecode.saveSettings({
        providers,
        activeProviderId: settings.activeProviderId,
        activeModel: settings.activeModel
      })
      setRows(view.providers.map(toRow))
      onChanged(view)
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setSaving(false)
    }
  }

  const needle = query.trim().toLowerCase()
  const modelGroups = settings.providers
    .filter((provider) => provider.models.length > 0)
    .map((provider) => ({
      provider,
      brand: brandForProvider(provider),
      models: provider.models
        .map((raw) => ({ raw, present: presentModel(raw, provider.label, provider.baseUrl) }))
        .filter(
          (item) =>
            !needle ||
            `${item.raw} ${item.present.display} ${provider.label}`.toLowerCase().includes(needle)
        )
    }))
    .filter((group) => group.models.length > 0)
  const matches = modelGroups.reduce((total, group) => total + group.models.length, 0)
  const reviewerValue =
    settings.opinionProviderId && settings.opinionModel
      ? `${settings.opinionProviderId}:${settings.opinionModel}`
      : ''
  const reviewers = settings.providers.flatMap((provider) =>
    provider.models
      .filter((model) => {
        if (isImageModel(model)) return false
        const pair = `${provider.id}:${model}`
        const isActive = provider.id === settings.activeProviderId && model === settings.activeModel
        return !isActive || pair === reviewerValue
      })
      .map((model) => {
        const presentation = presentModel(model, provider.label, provider.baseUrl)
        return {
          value: `${provider.id}:${model}`,
          providerId: provider.id,
          model,
          display: presentation.display,
          providerLabel: provider.label,
          brand: presentation.brand
        }
      })
  )

  return (
    <div className="overlay settings-overlay">
      <div
        className="settings-screen"
        role="dialog"
        aria-modal="true"
        aria-label={t('s.title')}
      >
        <header className="modal-header settings-head">
          <div className="modal-title">
            <h2>{t('s.title')}</h2>
            <p>{t('s.footNote')}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            title={t('s.close')}
            aria-label={t('s.close')}
            onClick={onClose}
            disabled={saving}
          >
            <XIcon size={17} />
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-rail" aria-label={t('s.title')}>
            {SECTIONS.map((item) => {
              const Icon = item.icon
              const count = item.count(settings)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`rail-btn${section === item.id ? ' active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  <span className="rail-icon">
                    <Icon size={15} />
                  </span>
                  <span className="rail-label">{t(item.label)}</span>
                  {count > 0 && <span className="rail-count">{count}</span>}
                </button>
              )
            })}
          </nav>

          <div className="settings-content">
            {section === 'general' && (
              <>
                <Card title={t('s.sectionGeneral')} note={t('s.general')}>
                  <div className="field">
                    <span>{t('s.language')}</span>
                    <div className="segmented" role="group" aria-label={t('s.language')}>
                      {LANGUAGES.map((language) => (
                        <button
                          key={language.id}
                          type="button"
                          className={`seg-btn${settings.language === language.id ? ' active' : ''}`}
                          disabled={busy}
                          onClick={() =>
                            void run(() => window.closecode.setLanguage(language.id as Lang))
                          }
                        >
                          {language.label}
                        </button>
                      ))}
                    </div>
                    <small className="field-note">{t('s.languageHint')}</small>
                  </div>
                </Card>

                <Card title={t('side.securityTitle')} className="card-security">
                  <p className="card-copy">{t('side.securityBody')}</p>
                  <div className="security-points">
                    <span>
                      <ShieldIcon size={14} />
                      {t('w.capKeys')}
                    </span>
                    <span>
                      <CheckIcon size={14} />
                      {t('c.local')}
                    </span>
                    <span>
                      <RefreshIcon size={14} />
                      {t('w.capCompact')}
                    </span>
                  </div>
                </Card>
              </>
            )}

            {section === 'appearance' && (
              <Card title={t('s.appearanceTitle')} note={t('s.appearanceNote')}>
                <div className="field">
                  <span>{t('s.windowType')}</span>
                  <div className="theme-grid mode-grid" role="group" aria-label={t('s.windowType')}>
                    {WINDOW_MODES.map((mode) => {
                      const active = settings.windowMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          className={`mode-card${active ? ' active' : ''}`}
                          aria-pressed={active}
                          disabled={busy}
                          onClick={() => changeAppearance({ windowMode: mode.id })}
                        >
                          <span className={`mode-shot ${mode.id}`} aria-hidden="true">
                            <span className="shot-top">
                              <i />
                              <i />
                            </span>
                            <span className="shot-body">
                              {mode.id === 'app' ? (
                                <>
                                  <span className="shot-rail" />
                                  <span className="shot-main">
                                    <i />
                                    <i />
                                    <i />
                                  </span>
                                </>
                              ) : (
                                <span className="shot-term">
                                  <b>❯</b>
                                  <span>
                                    <i />
                                    <i />
                                    <i />
                                  </span>
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="theme-card-copy">
                            <strong>{t(mode.label)}</strong>
                            <small>{t(mode.hint)}</small>
                          </span>
                          {active && <CheckIcon size={14} className="theme-check" />}
                        </button>
                      )
                    })}
                  </div>
                  <small className="field-note">{t('s.windowTypeHint')}</small>
                </div>

                <div className="field">
                  <span>{t('s.theme')}</span>
                  <div className="theme-grid" role="group" aria-label={t('s.theme')}>
                    {THEMES.map((theme) => {
                      const active = settings.theme === theme.id
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          className={`theme-card${active ? ' active' : ''}`}
                          aria-pressed={active}
                          disabled={busy}
                          onClick={() => changeAppearance({ theme: theme.id })}
                        >
                          <span className={`theme-swatch ${theme.id}`} aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span className="theme-card-copy">
                            <strong>{t(theme.label)}</strong>
                            <small>{t(theme.hint)}</small>
                          </span>
                          {active && <CheckIcon size={14} className="theme-check" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="field">
                  <span>{t('s.accent')}</span>
                  <div className="accent-row" role="group" aria-label={t('s.accent')}>
                    {ACCENTS.map((accent) => {
                      const active = settings.accent === accent.id
                      return (
                        <button
                          key={accent.id}
                          type="button"
                          className={`accent-btn${active ? ' active' : ''}`}
                          aria-pressed={active}
                          aria-label={t(accent.label)}
                          title={t(accent.label)}
                          disabled={busy}
                          onClick={() => changeAppearance({ accent: accent.id })}
                        >
                          <span className="accent-dot" style={{ background: accent.color }} />
                          <span>{t(accent.label)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="field">
                  <span>{t('s.density')}</span>
                  <div className="segmented" role="group" aria-label={t('s.density')}>
                    {DENSITIES.map((density) => (
                      <button
                        key={density.id}
                        type="button"
                        className={`seg-btn${settings.density === density.id ? ' active' : ''}`}
                        disabled={busy}
                        onClick={() => changeAppearance({ density: density.id })}
                      >
                        {t(density.label)}
                      </button>
                    ))}
                  </div>
                  <small className="field-note">{t('s.densityHint')}</small>
                </div>

                <div className="field">
                  <span>{t('s.uiScale')}</span>
                  <div className="segmented" role="group" aria-label={t('s.uiScale')}>
                    {UI_SCALES.map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        className={`seg-btn${settings.uiScale === scale ? ' active' : ''}`}
                        disabled={busy}
                        onClick={() => changeAppearance({ uiScale: scale })}
                      >
                        {scale}%
                      </button>
                    ))}
                  </div>
                  <small className="field-note">{t('s.uiScaleHint')}</small>
                </div>

                <div className="field">
                  <span>{t('s.motion')}</span>
                  <div className="segmented" role="group" aria-label={t('s.motion')}>
                    {MOTIONS.map((motion) => (
                      <button
                        key={motion.id}
                        type="button"
                        className={`seg-btn${settings.motion === motion.id ? ' active' : ''}`}
                        disabled={busy}
                        onClick={() => changeAppearance({ motion: motion.id })}
                      >
                        {t(motion.label)}
                      </button>
                    ))}
                  </div>
                  <small className="field-note">{t('s.motionHint')}</small>
                </div>
              </Card>
            )}

            {section === 'behavior' && (
              <>
                <Card title={t('s.approvalTitle')} note={t('s.approvalNote')}>
                  <div className="policy-list" role="radiogroup" aria-label={t('s.approvalTitle')}>
                    {POLICIES.map((policy) => {
                      const active = settings.approvalPolicy === policy.id
                      return (
                        <button
                          key={policy.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`policy-card${active ? ' active' : ''}`}
                          disabled={busy}
                          onClick={() =>
                            void run(() => window.closecode.setApprovalPolicy(policy.id))
                          }
                        >
                          <span className={`policy-radio${active ? ' on' : ''}`} aria-hidden="true" />
                          <span className="policy-copy">
                            <strong>{t(policy.label)}</strong>
                            <small>{t(policy.desc)}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <Card title={t('s.opinionTitle')} note={t('s.opinionNote')}>
                  <div className="reviewer-pick" role="radiogroup" aria-label={t('s.opinionModel')}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!reviewerValue}
                      className={`reviewer-chip${reviewerValue ? '' : ' active'}`}
                      disabled={busy}
                      onClick={() => changeReviewer('')}
                    >
                      <span className="reviewer-auto-mark" aria-hidden="true">
                        <SparkIcon size={13} />
                      </span>
                      <span className="reviewer-chip-copy">
                        <strong>{t('s.opinionAuto')}</strong>
                        <small>{t('s.opinionAutoSub')}</small>
                      </span>
                      {!reviewerValue && <CheckIcon size={14} className="reviewer-check" />}
                    </button>
                    {reviewers.map((reviewer) => {
                      const active = reviewer.value === reviewerValue
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`reviewer-chip${active ? ' active' : ''}`}
                          key={reviewer.value}
                          disabled={busy}
                          title={`${reviewer.providerLabel} · ${reviewer.model}`}
                          onClick={() => changeReviewer(reviewer.value)}
                        >
                          <ProviderLogo brand={reviewer.brand} size={20} />
                          <span className="reviewer-chip-copy">
                            <strong>{reviewer.display}</strong>
                            <small>{reviewer.providerLabel}</small>
                          </span>
                          {active && <CheckIcon size={14} className="reviewer-check" />}
                        </button>
                      )
                    })}
                  </div>
                  {!reviewers.length && (
                    <small className="field-note">{t('s.opinionNone')}</small>
                  )}
                </Card>

                <Card title={t('s.compactTitle')} note={t('s.compactNote')}>
                  <div className="compact-control">
                    <div className="compact-head">
                      <strong>{t('s.compactAt', { n: compactAt })}</strong>
                      <small>
                        {t('s.compactRange', {
                          min: settings.compactMin,
                          max: settings.compactMax
                        })}
                      </small>
                    </div>
                    <input
                      className="compact-range"
                      type="range"
                      min={settings.compactMin}
                      max={settings.compactMax}
                      step={1}
                      value={compactAt}
                      aria-label={t('s.compactAt', { n: compactAt })}
                      onChange={(event) => setCompactAt(Number(event.target.value))}
                      onPointerUp={commitCompact}
                      onBlur={commitCompact}
                    />
                    <div className="compact-scale">
                      <span>{settings.compactMin}%</span>
                      <span>{settings.compactMax}%</span>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {section === 'providers' && (
              <>
                <Card title={t('s.popularTitle')} note={t('s.addProviderSub')}>
                  <div className="presets">
                    {PRESETS.map((preset) => {
                      const label = preset.labelKey ? t(preset.labelKey) : preset.name
                      const brand: LogoBrand = brandForProvider({
                        label,
                        baseUrl: preset.baseUrl,
                        kind: preset.kind
                      })
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          className="preset-btn"
                          onClick={() => addProvider(preset)}
                        >
                          <ProviderLogo brand={brand} size={21} />
                          {label}
                          <PlusIcon size={13} className="preset-plus" />
                        </button>
                      )
                    })}
                  </div>
                </Card>

                {!rows.length && (
                  <div className="settings-empty">{t('s.noneProviders')}</div>
                )}

                {rows.map((row) => {
                  const brand = brandForProvider({
                    label: row.label,
                    baseUrl: row.baseUrl,
                    kind: row.kind
                  })
                  const models = row.modelsText
                    .split(/[\n,]+/)
                    .map((value) => value.trim())
                    .filter(Boolean)
                  const isActiveProvider = settings.activeProviderId === row.id
                  return (
                    <Card
                      key={row.id}
                      className="card-provider"
                      title={row.label || t('s.defaultProvider')}
                      aside={
                        <div className="card-head-actions">
                          {isActiveProvider && <Badge tone="ok">{t('s.active')}</Badge>}
                          <Badge>{tc('unit.model', models.length)}</Badge>
                          <button
                            type="button"
                            className="icon-btn"
                            title={t('s.duplicateAccount')}
                            aria-label={t('s.duplicateAccount')}
                            onClick={() => duplicateProvider(row)}
                          >
                            <CopyIcon size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title={t('s.removeProvider', { name: row.label })}
                            aria-label={t('s.removeProvider', { name: row.label })}
                            onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      }
                    >
                      <div className="provider-top">
                        <ProviderLogo brand={brand} size={30} />
                        <input
                          className="input name-input"
                          value={row.label}
                          onChange={(event) => patchRow(row.id, { label: event.target.value })}
                          placeholder={t('s.providerNamePlaceholder')}
                          aria-label={t('s.label')}
                        />
                        <select
                          className="input kind-select"
                          value={row.kind}
                          aria-label={t('s.kind')}
                          onChange={(event) =>
                            patchRow(row.id, {
                              kind: event.target.value === 'anthropic' ? 'anthropic' : 'openai'
                            })
                          }
                        >
                          <option value="openai">{t('s.kindOpenai')}</option>
                          <option value="anthropic">{t('s.kindAnthropic')}</option>
                        </select>
                      </div>

                      <div className="field">
                        <span>{t('s.baseUrl')}</span>
                        <input
                          className="input mono"
                          value={row.baseUrl}
                          onChange={(event) => patchRow(row.id, { baseUrl: event.target.value })}
                          placeholder="https://api.example.com/v1"
                          spellCheck={false}
                          aria-label={t('s.baseUrl')}
                        />
                      </div>

                      <div className="field">
                        <span>
                          {t('s.apiKey')}
                          {row.hasKey && !row.clearKey && (
                            <em className="key-badge">{t('s.apiKeyStored')}</em>
                          )}
                          {!row.hasKey && !row.apiKey && row.free && (
                            <em className="key-badge free">{t('s.freeBadge')}</em>
                          )}
                          {!row.hasKey && !row.apiKey && !row.free && (
                            <em className="key-badge warn">{t('s.keyMissing')}</em>
                          )}
                        </span>
                        <div className="key-row">
                          <input
                            className="input mono"
                            type="password"
                            value={row.apiKey}
                            onChange={(event) => patchRow(row.id, { apiKey: event.target.value })}
                            placeholder={
                              row.clearKey
                                ? t('s.apiKeyNew')
                                : row.hasKey
                                  ? t('s.apiKeyKeep')
                                  : t('s.apiKeyPaste')
                            }
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={t('s.apiKey')}
                          />
                          {row.hasKey && !row.clearKey && (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => patchRow(row.id, { clearKey: true })}
                            >
                              {t('s.clearKey')}
                            </button>
                          )}
                          {row.clearKey && (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => patchRow(row.id, { clearKey: false })}
                            >
                              {t('s.cancel')}
                            </button>
                          )}
                        </div>
                        {row.clearKey && <small className="warn-text">{t('s.apiKeyCleared')}</small>}
                        {row.kind === 'openai' && !row.hasKey && !row.apiKey &&
                          row.baseUrl.includes('localhost') && (
                            <small className="field-note">{t('s.localKeyNote')}</small>
                          )}
                        <small className="field-note">{row.free ? t('s.freeNote') : t('s.apiKeyHint')}</small>
                      </div>

                      <div className="field">
                        <span>
                          {t('s.modelList')} <em>{t('s.modelListHint')}</em>
                        </span>
                        <textarea
                          className="input mono"
                          rows={3}
                          value={row.modelsText}
                          onChange={(event) => patchRow(row.id, { modelsText: event.target.value })}
                          placeholder={'gpt-4o-mini\ndeepseek-chat'}
                          spellCheck={false}
                          aria-label={t('s.modelList')}
                        />
                        <div className="models-actions">
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => void loadModels(row)}
                            disabled={row.fetch.loading}
                          >
                            <RefreshIcon size={12} />
                            {row.fetch.loading ? t('s.loadingModels') : t('s.fetchModels')}
                          </button>
                          {row.fetch.error && <span className="error-text">{row.fetch.error}</span>}
                          {row.fetch.info && <span className="ok-text">{row.fetch.info}</span>}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </>
            )}

            {section === 'models' && (
              <Card
                title={t('s.sectionModels')}
                note={t('s.modelsHint')}
                aside={<Badge>{tc('unit.model', modelTotal(settings))}</Badge>}
              >
                {!modelTotal(settings) ? (
                  <div className="settings-empty">{t('s.noModelsYet')}</div>
                ) : (
                  <>
                    <input
                      className="input model-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('s.searchModels')}
                      aria-label={t('s.searchModels')}
                      spellCheck={false}
                    />
                    {!matches && <div className="settings-empty">{t('s.noModelsFound')}</div>}
                    {modelGroups.map((group) => (
                      <div className="model-group" key={group.provider.id}>
                        <div className="model-group-head">
                          <ProviderLogo brand={group.brand} size={19} />
                          <span>{group.provider.label}</span>
                          <em>{tc('unit.model', group.models.length)}</em>
                        </div>
                        {group.models.map((item) => {
                          const active =
                            settings.activeModel === item.raw &&
                            settings.activeProviderId === group.provider.id
                          return (
                            <button
                              key={`${group.provider.id}:${item.raw}`}
                              type="button"
                              className={`model-row${active ? ' active' : ''}`}
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  window.closecode.setActiveModel({
                                    providerId: group.provider.id,
                                    model: item.raw
                                  })
                                )
                              }
                            >
                              <span className="model-row-logo">
                                <ProviderLogo
                                  brand={(brandForModel(item.raw) ?? group.brand) as LogoBrand}
                                  size={24}
                                />
                              </span>
                              <span className="model-row-info">
                                <strong>{item.present.display}</strong>
                                <small className="mono">{item.raw}</small>
                              </span>
                              {isImageModel(item.raw) && (
                                <span className="model-kind-badge">{t('mp.imageBadge')}</span>
                              )}
                              {active ? (
                                <span className="model-check">
                                  <CheckIcon size={14} />
                                </span>
                              ) : (
                                <span className="row-action">{t('s.makeDefault')}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ))}
                    <small className="field-note">{t('s.modelPrefixHint')}</small>
                  </>
                )}
              </Card>
            )}

            {section === 'projects' && (
              <Card
                title={t('s.projectsTitle')}
                note={t('s.projectsHint')}
                aside={
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busy}
                    onClick={() => void run(() => window.closecode.addProject())}
                  >
                    <PlusIcon size={12} />
                    {t('s.addProject')}
                  </button>
                }
              >
                {!settings.projects.length && (
                  <div className="settings-empty">{t('s.noProjects')}</div>
                )}
                {settings.projects.map((project) => {
                  const active = project.path === settings.activeProjectPath
                  return (
                    <div className={`row-item${active ? ' active' : ''}`} key={project.path}>
                      <span className="row-icon">
                        <FolderIcon size={15} />
                      </span>
                      <span className="row-info">
                        <strong>{project.name}</strong>
                        <small className="mono">{project.path}</small>
                      </span>
                      <span className="row-meta">
                        {project.available ? (
                          tc('unit.message', project.messages)
                        ) : (
                          <em>{t('s.missing')}</em>
                        )}
                      </span>
                      {active ? (
                        <Badge tone="ok">{t('s.active')}</Badge>
                      ) : (
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={busy || !project.available}
                          onClick={() =>
                            void run(() => window.closecode.openProject(project.path))
                          }
                        >
                          {t('s.makeActive')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-btn danger"
                        title={t('side.removeProject')}
                        aria-label={`${t('side.removeProject')}: ${project.name}`}
                        disabled={busy}
                        onClick={() =>
                          void run(() => window.closecode.removeProject(project.path))
                        }
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  )
                })}
              </Card>
            )}

            {section === 'access' && (
              <Card title={t('s.accessTitle')} note={t('s.accessHint')}>
                {!settings.allowedRoots.length && (
                  <div className="settings-empty">{t('s.accessNone')}</div>
                )}
                {settings.allowedRoots.map((root) => (
                  <div className="row-item" key={root}>
                    <span className="row-icon">
                      <ShieldIcon size={15} />
                    </span>
                    <span className="row-info">
                      <strong className="mono">{root}</strong>
                    </span>
                    <button
                      type="button"
                      className="ghost-btn danger"
                      disabled={busy}
                      onClick={() =>
                        void run(() => window.closecode.revokeAllowedRoot(root))
                      }
                    >
                      {t('s.revoke')}
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {section === 'skills' && (
              <Card
                title={t('s.skillsTitle')}
                note={t('s.skillsHint')}
                aside={
                  <div className="card-head-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={busy}
                      onClick={() => void run(() => window.closecode.listSkills())}
                    >
                      <RefreshIcon size={12} />
                      {t('s.refresh')}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => void window.closecode.openSkillsFolder()}
                    >
                      <FolderIcon size={12} />
                      {t('s.openSkills')}
                    </button>
                  </div>
                }
              >
                {!settings.skills.length && (
                  <div className="settings-empty">{t('s.noSkills')}</div>
                )}
                {settings.skills.map((skill: SkillInfo) => (
                  <div className={`row-item${skill.enabled ? ' active' : ''}`} key={skill.id}>
                    <span className="row-icon">
                      <BookIcon size={15} />
                    </span>
                    <span className="row-info">
                      <strong>{skill.name}</strong>
                      <small>{skill.description || t('s.skillsHint')}</small>
                    </span>
                    <span className="row-meta">
                      {skill.source === 'project' ? t('s.sourceProject') : t('s.sourceGlobal')}
                      {' · '}
                      {formatBytes(skill.chars)}
                    </span>
                    <button
                      type="button"
                      className={`switch${skill.enabled ? ' on' : ''}`}
                      role="switch"
                      aria-checked={skill.enabled}
                      aria-label={skill.name}
                      title={skill.enabled ? t('s.enabled') : t('s.disabled')}
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          window.closecode.setSkillEnabled(skill.id, !skill.enabled)
                        )
                      }
                    >
                      <span className="switch-knob" />
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {section === 'agents' && (
              <Card
                title={t('s.agentsTitle')}
                note={t('s.agentsHint')}
                aside={
                  <div className="card-head-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={busy}
                      onClick={() => void run(() => window.closecode.listSkills())}
                    >
                      <RefreshIcon size={12} />
                      {t('s.refresh')}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => void window.closecode.openAgentsFolder()}
                    >
                      <FolderIcon size={12} />
                      {t('s.openAgents')}
                    </button>
                  </div>
                }
              >
                {!settings.agents.length && (
                  <div className="settings-empty">{t('s.noAgents')}</div>
                )}
                {settings.agents.map((agent) => (
                  <div className="row-item" key={agent.id}>
                    <span className="row-icon">
                      <UsersIcon size={15} />
                    </span>
                    <span className="row-info">
                      <strong>{agent.name}</strong>
                      <small>{agent.description}</small>
                    </span>
                    <span className="row-meta mono">
                      {agent.model
                        ? presentModel(agent.model).display
                        : t('s.default')}
                    </span>
                    <Badge>{agent.source === 'project' ? t('s.sourceProject') : t('s.sourceGlobal')}</Badge>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <div className="footer-left">
            {error ? (
              <span className="error-text">{error}</span>
            ) : section === 'providers' && dirty ? (
              <span className="warn-text">{t('s.unsaved')}</span>
            ) : (
              <span className="modal-hint">{t('s.footNote')}</span>
            )}
          </div>
          <div className="modal-actions">
            {section === 'providers' ? (
              <>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setRows(settings.providers.map(toRow))
                    setError('')
                  }}
                  disabled={saving || !dirty}
                >
                  {t('s.cancel')}
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => void saveProviders()}
                  disabled={saving || !dirty}
                >
                  {saving ? t('s.saving') : t('s.save')}
                </button>
              </>
            ) : (
              <button type="button" className="primary-btn" onClick={onClose}>
                {t('s.saved')}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
