import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject
} from 'react'
import type {
  ChatAttachment,
  ContextState,
  EffortLevel,
  ModelLoad,
  SettingsView
} from '../../../shared/types'
import type { RunOverview } from '../chat'
import { formatBytes } from '../utils'
import { useT } from '../i18n'
import { ContextMeter } from './ContextMeter'
import { ModelLoadMeter } from './ModelLoadMeter'
import {
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  FolderIcon,
  PaperclipIcon,
  ScreenIcon,
  SendIcon,
  SparkIcon,
  StopIcon,
  XIcon
} from './Icons'
import { ModelPicker } from './ModelPicker'
import { EffortPicker } from './EffortPicker'

const ACCEPT = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  '.txt', '.md', '.markdown', '.mdx', '.json', '.jsonc', '.ts', '.tsx', '.js', '.jsx',
  '.mjs', '.cjs', '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg', '.yml',
  '.yaml', '.toml', '.ini', '.env', '.py', '.go', '.rs', '.java', '.kt', '.kts', '.c',
  '.h', '.cpp', '.hpp', '.cs', '.php', '.rb', '.sh', '.bash', '.ps1', '.sql', '.vue',
  '.svelte', '.astro', '.graphql', '.prisma', '.lock', '.gitignore', '.dockerignore'
].join(',')

interface ComposerProps {
  settings: SettingsView
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  streaming: boolean
  compacting: boolean
  effort: EffortLevel
  onEffortChange: (effort: EffortLevel) => void
  load: ModelLoad | null
  attachments: ChatAttachment[]
  onAddFiles: (files: File[]) => void
  onCaptureScreen: () => void
  onRemoveAttachment: (index: number) => void
  context: ContextState | null
  canCompact: boolean
  onCompact: () => void
  onSelectModel: (providerId: string, model: string) => void
  onAddProject: () => void
  onOpenSettings: () => void
  run: RunOverview | null
  opinionLoading: boolean
  onAskOpinion: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function Composer({
  settings,
  input,
  onInputChange,
  onSend,
  onStop,
  streaming,
  compacting,
  effort,
  onEffortChange,
  load,
  attachments,
  onAddFiles,
  onCaptureScreen,
  onRemoveAttachment,
  context,
  canCompact,
  onCompact,
  onSelectModel,
  onAddProject,
  onOpenSettings,
  run,
  opinionLoading,
  onAskOpinion,
  textareaRef
}: ComposerProps): ReactNode {
  const { t, tc } = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const activeProvider =
    settings.providers.find((provider) => provider.id === settings.activeProviderId) ?? null
  const ready = Boolean(activeProvider && settings.activeModel)
  const hasContent = Boolean(input.trim()) || attachments.length > 0
  const projectName = settings.projects.find((p) => p.path === settings.activeProjectPath)?.name ?? ''
  const busy = streaming || compacting
  const showRun = Boolean(run && (run.steps > 0 || run.failed > 0 || streaming))

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [input, textareaRef, settings.windowMode])

  function openFileDialog(): void {
    fileInputRef.current?.click()
  }

  function handleFiles(files: FileList | null): void {
    if (!files?.length) return
    onAddFiles(Array.from(files))
  }

  function onPaste(event: ReactClipboardEvent<HTMLTextAreaElement>): void {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
    if (!files.length) return
    event.preventDefault()
    onAddFiles(files)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      if (busy) return
      event.preventDefault()
      onSend()
    }
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (event.dataTransfer.files.length) onAddFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="composer-area">
      <div className="composer-inner">
        {showRun && run && (
          <div className="run-strip" aria-live="polite">
            <span className="run-step">
              {streaming ? (
                <span className="spinner" />
              ) : run.failed > 0 ? (
                <XIcon size={12} className="run-fail-icon" />
              ) : (
                <CheckIcon size={12} className="run-check" />
              )}
              <span>{t('run.step', { n: run.done })}</span>
              <span className="run-total">/ {Math.max(1, run.steps)}</span>
            </span>
            {run.files > 0 && (
              <span className="run-files">
                <strong>{tc('unit.file', run.files)}</strong> {tc('run.changed', run.files)}
              </span>
            )}
            {(run.added > 0 || run.removed > 0) && (
              <span className="run-diff">
                {run.added > 0 && <b>+{run.added}</b>}
                {run.removed > 0 && <i>-{run.removed}</i>}
              </span>
            )}
            {run.failed > 0 && <span className="run-fail">{tc('unit.error', run.failed)}</span>}
            {!streaming && !compacting && (
              <button
                type="button"
                className="run-opinion"
                onClick={onAskOpinion}
                disabled={opinionLoading}
                title={t('run.opinionHint')}
              >
                {opinionLoading ? <span className="spinner" /> : <SparkIcon size={12} />}
                {t('run.opinion')}
              </button>
            )}
          </div>
        )}

        <div
          className={`composer${dragging ? ' dragging' : ''}`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragging && (
            <div className="drop-hint">
              <PaperclipIcon size={20} />
              <span>{t('c.dropHere')}</span>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="attach-row">
              {attachments.map((file, index) => (
                <span
                  className={`attach-chip${file.kind === 'image' ? ' image' : ''}`}
                  key={`${file.name}-${file.size}-${index}`}
                >
                  {file.kind === 'image' ? (
                    <img className="attach-thumb" src={file.content} alt="" draggable={false} />
                  ) : (
                    <span className="attach-chip-icon">
                      <FileIcon size={13} />
                    </span>
                  )}
                  <span className="attach-chip-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="attach-chip-size">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="attach-chip-remove"
                    onClick={() => onRemoveAttachment(index)}
                    aria-label={t('c.removeFile', { name: file.name })}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="composer-input">
            <span className="composer-prompt" aria-hidden="true">
              ❯
            </span>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={t(ready ? 'c.placeholder' : 'c.placeholderNoKey')}
              rows={1}
              spellCheck={false}
              aria-label={t('c.ariaMessage')}
            />
          </div>

          <div className="composer-bar">
            <div className="composer-bar-left">
              <button
                type="button"
                className="composer-tool"
                onClick={openFileDialog}
                title={t('c.attach')}
                aria-label={t('c.attach')}
              >
                <PaperclipIcon size={16} />
              </button>

              <button
                type="button"
                className="composer-tool"
                onClick={onCaptureScreen}
                disabled={busy}
                title={t('c.screenshot')}
                aria-label={t('c.screenshot')}
              >
                <ScreenIcon size={16} />
              </button>

              <EffortPicker
                value={effort}
                model={settings.activeModel}
                disabled={busy || !settings.activeModel}
                onChange={onEffortChange}
              />
            </div>

            <div className="composer-bar-right">
              <ModelPicker
                providers={settings.providers}
                activeProviderId={settings.activeProviderId}
                activeModel={settings.activeModel}
                onSelect={onSelectModel}
                onOpenSettings={onOpenSettings}
              />

              {streaming ? (
                <button
                  type="button"
                  className="send-btn stop-btn"
                  onClick={onStop}
                  title={t('c.stop')}
                  aria-label={t('c.stop')}
                >
                  <StopIcon size={14} />
                </button>
              ) : compacting ? (
                <button
                  type="button"
                  className="send-btn"
                  disabled
                  title={t('c.compacting')}
                  aria-label={t('c.compacting')}
                >
                  <span className="spinner" />
                </button>
              ) : (
                <button
                  type="button"
                  className="send-btn"
                  onClick={onSend}
                  disabled={!hasContent}
                  title={t('c.send')}
                  aria-label={t('c.send')}
                >
                  <SendIcon size={16} />
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="file-input"
            aria-label={t('c.ariaFiles')}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>

        <div className="workspace-footer">
          <div className="workspace-footer-left">
            <button
              type="button"
              className={`project-chip${settings.activeProjectPath ? ' has-project' : ''}`}
              onClick={onAddProject}
              disabled={busy}
              title={settings.activeProjectPath ?? t('side.addProject')}
            >
              <FolderIcon size={12} />
              <span>{projectName || t('side.addProject')}</span>
              <ChevronDownIcon size={11} className="chev" />
            </button>
          </div>

          <div className="workspace-footer-right">
            <ModelLoadMeter load={load} />
            <ContextMeter
              context={context}
              streaming={streaming}
              compacting={compacting}
              canCompact={canCompact}
              onCompact={onCompact}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
