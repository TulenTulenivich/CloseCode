import { useEffect, useState, type ReactNode } from 'react'
import type { UnlockerStatusView, RemoteControlStatusView } from '../../../shared/types'
import { ShieldIcon, SparkIcon, XIcon, CheckIcon, RefreshIcon } from './Icons'

interface UnlockerModalProps {
  onClose: () => void
  onGoogleImported?: () => void
}

export function UnlockerModal({ onClose, onGoogleImported }: UnlockerModalProps): ReactNode {
  const [unlocker, setUnlocker] = useState<UnlockerStatusView | null>(null)
  const [remote, setRemote] = useState<RemoteControlStatusView | null>(null)
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')

  async function refresh(): Promise<void> {
    setLoading(true)
    setError('')
    try {
      const u = await window.closecode.getUnlockerStatus()
      const r = await window.closecode.getRemoteControlStatus()
      setUnlocker(u)
      setRemote(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
      if ((event.ctrlKey || event.metaKey) && (event.key === 'u' || event.key === 'U')) {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function toggleUnlocker(): Promise<void> {
    if (!unlocker) return
    try {
      const updated = await window.closecode.setUnlockerEnabled(!unlocker.enabled)
      setUnlocker(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function toggleRemote(): Promise<void> {
    if (!remote) return
    try {
      const updated = await window.closecode.setRemoteControl(!remote.running, 4242)
      setRemote(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleImportGoogle(): Promise<void> {
    setLoading(true)
    setError('')
    try {
      await window.closecode.importAntigravityGoogle()
      setImported(true)
      onGoogleImported?.()
      setTimeout(() => setImported(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card unlocker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-title">
            <span className="unlocker-badge-icon">
              <ShieldIcon size={18} />
            </span>
            <div>
              <h3>AgyUnlocker & Antigravity Pro</h3>
              <small>Обход блокировок, тарифы Google и удалённое управление · Ctrl+U</small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <XIcon size={16} />
          </button>
        </div>

        {error && <div className="unlocker-error">{error}</div>}

        <div className="unlocker-sections">
          {/* Section 1: AgyUnlocker */}
          <div className="unlocker-card">
            <div className="unlocker-card-header">
              <div className="unlocker-card-title">
                <strong>Служба AgyUnlocker (confeden)</strong>
                <div className="unlocker-status-row">
                  <span className={`status-dot ${unlocker?.alive ? 'online' : 'offline'}`} />
                  <span>
                    {unlocker?.alive
                      ? `Порт 127.0.0.1:${unlocker.port} активен`
                      : 'Локальная служба не обнаружена'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`toggle-btn ${unlocker?.enabled ? 'active' : ''}`}
                onClick={() => void toggleUnlocker()}
              >
                {unlocker?.enabled ? 'Включено' : 'Выключено'}
              </button>
            </div>
            <p className="unlocker-desc">
              Автоматически направляет запросы к Google Cloud, Gemini, OpenAI и Anthropic через
              локальный прокси для обхода ошибки 400 («User location is not supported») и блокировок РКН.
            </p>
          </div>

          {/* Section 2: Google Antigravity OAuth Account */}
          <div className="unlocker-card">
            <div className="unlocker-card-header">
              <div className="unlocker-card-title">
                <strong>Google Аккаунт (Gemini Pro/Ultra)</strong>
                <div className="unlocker-status-row">
                  <span
                    className={`status-dot ${unlocker?.googleAccount?.hasToken ? 'online' : 'offline'}`}
                  />
                  <span>
                    {unlocker?.googleAccount?.email
                      ? `Найден аккаунт Antigravity: ${unlocker.googleAccount.email}`
                      : 'Сессия Google не найдена в ~/.gemini'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="action-btn primary"
                disabled={!unlocker?.googleAccount?.hasToken || loading}
                onClick={() => void handleImportGoogle()}
              >
                {imported ? (
                  <>
                    <CheckIcon size={14} /> Подключено!
                  </>
                ) : (
                  <>
                    <SparkIcon size={14} /> Подключить Pro/Ultra
                  </>
                )}
              </button>
            </div>
            <p className="unlocker-desc">
              Использует подписку Google One AI Premium (Gemini Advanced/Pro/Ultra) напрямую из вашей
              сессии Antigravity без необходимости заводить отдельные API-ключи.
            </p>
          </div>

          {/* Section 3: Antigravity Remote Control */}
          <div className="unlocker-card">
            <div className="unlocker-card-header">
              <div className="unlocker-card-title">
                <strong>Удалённое управление (Remote Control)</strong>
                <div className="unlocker-status-row">
                  <span className={`status-dot ${remote?.running ? 'online' : 'offline'}`} />
                  <span>
                    {remote?.running
                      ? `Сервер активен на порту ${remote.port}`
                      : 'Сервер удалённого контроля выключен'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`toggle-btn ${remote?.running ? 'active' : ''}`}
                onClick={() => void toggleRemote()}
              >
                {remote?.running ? 'Остановить' : 'Запустить'}
              </button>
            </div>
            <p className="unlocker-desc">
              Позволяет управлять агентом и отправлять задачи со смартфона или другого ПК по локальной
              сети через веб-интерфейс{' '}
              {remote?.running && (
                <a
                  href={`http://localhost:${remote.port}`}
                  target="_blank"
                  rel="noreferrer"
                  className="unlocker-link"
                >
                  http://localhost:{remote.port}
                </a>
              )}
              .
            </p>
          </div>
        </div>

        <div className="modal-foot">
          <small className="hotkey-tip">Быстрое открытие этого окна в любой момент: <strong>Ctrl+U</strong></small>
          <button type="button" className="btn secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshIcon size={14} /> Обновить статус
          </button>
        </div>
      </div>
    </div>
  )
}
