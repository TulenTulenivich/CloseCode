import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ProviderView } from '../../../shared/types'
import { isImageModel, presentModel, supportsEffort } from '../../../shared/modelNames'
import { useT } from '../i18n'
import { CheckIcon, ChevronDownIcon, PlusIcon, SettingsIcon, SparkIcon } from './Icons'
import { ProviderLogo, brandForProvider, type LogoBrand } from './ProviderLogo'

interface ModelPickerProps {
  providers: ProviderView[]
  activeProviderId: string | null
  activeModel: string | null
  onSelect: (providerId: string, model: string) => void
  onOpenSettings: () => void
}

export function ModelPicker({
  providers,
  activeProviderId,
  activeModel,
  onSelect,
  onOpenSettings
}: ModelPickerProps): ReactNode {
  const { t, tc } = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const activeProvider = providers.find((provider) => provider.id === activeProviderId) ?? null
  const available = providers.filter((provider) => provider.models.length > 0)
  const totalModels = available.reduce((total, provider) => total + provider.models.length, 0)
  const activeBrand: LogoBrand = activeProvider ? brandForProvider(activeProvider) : 'generic'
  const activeShown = activeModel
    ? presentModel(activeModel, activeProvider?.label, activeProvider?.baseUrl).display
    : ''

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return available
      .map((provider) => ({
        provider,
        brand: brandForProvider(provider),
        models: (needle
          ? provider.models.filter((model) =>
              `${model} ${presentModel(model, provider.label, provider.baseUrl).display}`
                .toLowerCase()
                .includes(needle)
            )
          : provider.models
        ).map((model) => ({
          raw: model,
          presentation: presentModel(model, provider.label, provider.baseUrl)
        }))
      }))
      .filter((group) => group.models.length)
  }, [available, query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!totalModels) {
    return (
      <button
        type="button"
        className="model-picker-btn empty"
        onClick={onOpenSettings}
        aria-label={t('s.activeModel')}
        title={t('s.addProvider')}
      >
        <span className="model-picker-plus">
          <PlusIcon size={15} />
        </span>
        <span className="model-picker-copy">
          <strong>{t('s.pickModel')}</strong>
          <small>{t('s.addProvider')}</small>
        </span>
      </button>
    )
  }

  return (
    <div className="model-picker" ref={wrapRef}>
      <button
        type="button"
        className="model-picker-btn"
        onClick={() => {
          setQuery('')
          setOpen((value) => !value)
        }}
        aria-label={t('s.activeModel')}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={
          activeProvider
            ? `${activeProvider.label} · ${activeShown || t('s.pickModel')}`
            : t('s.pickModel')
        }
      >
        <ProviderLogo brand={activeBrand} size={26} />
        <span className="model-picker-copy">
          <strong>{activeShown || t('s.pickModel')}</strong>
          <small>{activeProvider?.label ?? t('mp.providerNone')}</small>
        </span>
        <ChevronDownIcon size={14} className="chev" />
      </button>

      {open && (
        <div className="popover model-popover" role="listbox" aria-label={t('s.sectionModels')}>
          <div className="popover-head">
            <div>
              <strong>{t('mp.title')}</strong>
              <small>{tc('unit.model', totalModels)}</small>
            </div>
            <span className="model-popover-hint">{t('mp.hint')}</span>
          </div>

          {available.length > 1 && (
            <div className="platform-switch-bar" role="tablist" aria-label={t('s.quickAccounts')}>
              {available.map((provider) => {
                const isSelected = provider.id === activeProviderId
                const brand = brandForProvider(provider)
                return (
                  <button
                    key={provider.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`platform-chip${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      const firstModel = provider.models[0] || activeModel || ''
                      if (firstModel) {
                        setOpen(false)
                        onSelect(provider.id, firstModel)
                      }
                    }}
                    title={`${provider.label} · ${provider.models[0] ?? ''}`}
                  >
                    <ProviderLogo brand={brand} size={15} />
                    <span className="platform-chip-label">{provider.label}</span>
                    {isSelected && <span className="platform-chip-dot" />}
                  </button>
                )
              })}
            </div>
          )}

          <input
            className="input model-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('s.searchModels')}
            aria-label={t('s.searchModels')}
            spellCheck={false}
          />

          <div className="model-scroll">
            {!groups.length && <div className="picker-empty">{t('s.noModelsFound')}</div>}
            {groups.map((group) => (
              <div className="model-group" key={group.provider.id}>
                <div className="model-group-head">
                  <ProviderLogo brand={group.brand} size={20} />
                  <span>{group.provider.label}</span>
                  <small>{group.models.length}</small>
                </div>
                {group.models.map((model) => {
                  const selected =
                    group.provider.id === activeProviderId && model.raw === activeModel
                  const imageModel = isImageModel(model.raw)
                  const reasoning = supportsEffort(model.raw) && !imageModel
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`model-option${selected ? ' selected' : ''}`}
                      key={`${group.provider.id}::${model.raw}`}
                      title={model.raw}
                      onClick={() => {
                        setOpen(false)
                        onSelect(group.provider.id, model.raw)
                      }}
                    >
                      <ProviderLogo brand={model.presentation.brand} size={23} />
                      <span className="model-option-copy">
                        <strong>{model.presentation.display}</strong>
                      </span>
                      {reasoning && (
                        <span className="model-kind-badge thinking">
                          <SparkIcon size={10} />
                          {t('mp.thinkingBadge')}
                        </span>
                      )}
                      {imageModel && <span className="model-kind-badge">{t('mp.imageBadge')}</span>}
                      {selected && <CheckIcon size={14} className="model-check" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="model-settings"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            <SettingsIcon size={14} />
            {t('mp.manage')}
          </button>
        </div>
      )}
    </div>
  )
}
