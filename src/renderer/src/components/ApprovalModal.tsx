import { useEffect, useMemo, type ReactNode } from 'react'
import { structuredPatch } from 'diff'
import type { ApprovalAnswer, ApprovalRequest } from '../../../shared/types'
import { useT } from '../i18n'
import { formatBytes } from '../utils'
import { FileIcon, ImageIcon, KeyIcon, ShieldIcon, XIcon } from './Icons'

interface ApprovalModalProps {
  request: ApprovalRequest
  onRespond: (answer: ApprovalAnswer) => void
}

interface PreparedHunk {
  key: number
  header: string
  lines: Array<{ sign: string; text: string }>
}

const MAX_RENDERED_LINES = 900

export function ApprovalModal({ request, onRespond }: ApprovalModalProps): ReactNode {
  const { t } = useT()
  const imageScope = request.scope === 'image' || request.scope === 'image-outside'
  const imageOutside = request.scope === 'image-outside'
  const outside =
    request.scope === 'write-outside' ||
    request.scope === 'read-outside' ||
    request.scope === 'image-outside'
  const writeOutside = request.scope === 'write-outside'

  const { hunks, added, removed, truncated, empty } = useMemo(() => {
    const patch = structuredPatch(
      'before',
      'after',
      request.oldContent ?? '',
      request.newContent ?? '',
      '',
      '',
      { context: 4 }
    )
    let addedCount = 0
    let removedCount = 0
    let rendered = 0
    let cut = false
    const prepared: PreparedHunk[] = []

    patch.hunks.forEach((hunk, index) => {
      const lines: Array<{ sign: string; text: string }> = []
      for (const raw of hunk.lines) {
        if (!raw) continue
        const marker = raw[0]
        if (marker === '+') addedCount++
        else if (marker === '-') removedCount++
        if (rendered >= MAX_RENDERED_LINES) {
          cut = true
          continue
        }
        if (marker === '\\') {
          lines.push({ sign: '\\', text: raw })
        } else {
          lines.push({ sign: marker === '+' || marker === '-' ? marker : ' ', text: raw.slice(1) })
        }
        rendered++
      }
      prepared.push({
        key: index,
        header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        lines
      })
    })

    return {
      hunks: prepared,
      added: addedCount,
      removed: removedCount,
      truncated: cut,
      empty: patch.hunks.length === 0
    }
  }, [request])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onRespond('deny')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRespond])

  const subtitle = imageScope
    ? t(imageOutside ? 'a.imageOutside' : 'a.image')
    : outside
      ? writeOutside
        ? t('a.outsideWrite')
        : t('a.outsideRead')
      : request.oldContent === null
        ? t('a.newFile')
        : t('a.changeFile')

  return (
    <div className="overlay">
      <div
        className="modal approval-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t(imageScope ? 'a.imageTitle' : outside ? 'a.outsideTitle' : 'a.title')}
      >
        <header className="approval-head">
          <div className="approval-file">
            <span className={`approval-file-icon${outside ? ' outside' : ''}${imageScope ? ' image' : ''}`}>
              {imageScope ? (
                <ImageIcon size={18} />
              ) : outside ? (
                <KeyIcon size={18} />
              ) : (
                <FileIcon size={18} />
              )}
            </span>
            <div className="approval-file-meta">
              <span className="path">{request.path}</span>
              <span className="sub">{subtitle}</span>
            </div>
          </div>
          <div className="approval-head-right">
            {imageScope ? (
              request.image && (
                <span className="image-stat approval-image-stat">
                  {request.image.mime.replace(/^image\//, '').toUpperCase()} ·{' '}
                  {formatBytes(request.image.bytes)}
                </span>
              )
            ) : (
              added + removed > 0 && (
                <div className="diff-stats">
                  {added > 0 && <span className="add">+{added}</span>}
                  {removed > 0 && <span className="del">−{removed}</span>}
                </div>
              )
            )}
            <button
              type="button"
              className="icon-btn"
              title={t('a.deny')}
              aria-label={t('a.deny')}
              onClick={() => onRespond('deny')}
            >
              <XIcon size={16} />
            </button>
          </div>
        </header>

        {imageScope ? (
          <div className="approval-image">
            {request.image ? (
              <div className="approval-image-frame">
                <img src={request.image.dataUrl} alt={request.path} />
              </div>
            ) : (
              <div className="diff-empty">{t('chat.imageFailed')}</div>
            )}
            <div className="approval-image-meta">
              <span className="image-path" title={request.absolutePath}>
                {request.absolutePath}
              </span>
            </div>
          </div>
        ) : (
          <div className="diff-view">
            {outside && !request.newContent ? (
              <div className="diff-outside">
                <ShieldIcon size={16} />
                <span>{request.absolutePath}</span>
              </div>
            ) : empty ? (
              <div className="diff-empty">{t('a.diffEmpty')}</div>
            ) : (
              <>
                {hunks.map((hunk) => (
                  <div className="diff-hunk" key={hunk.key}>
                    <div className="diff-hunk-header">{hunk.header}</div>
                    {hunk.lines.map((line, index) => (
                      <div
                        className={`diff-line ${
                          line.sign === '+'
                            ? 'add'
                            : line.sign === '-'
                              ? 'del'
                              : line.sign === '\\'
                                ? 'meta'
                                : 'ctx'
                        }`}
                        key={index}
                      >
                        <span className="sign">
                          {line.sign === ' ' ? '' : line.sign === '\\' ? '' : line.sign}
                        </span>
                        <span className="code">{line.sign === '\\' ? line.text : line.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {truncated && <div className="diff-truncated">{t('a.truncated', { n: MAX_RENDERED_LINES })}</div>}
              </>
            )}
          </div>
        )}

        <footer className="modal-footer">
          <p className="modal-hint">
            {t(imageScope ? 'a.imageFoot' : outside ? 'a.outsideFoot' : 'a.footNote')}
          </p>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => onRespond('deny')} autoFocus>
              {t('a.deny')}
            </button>
            {outside && (
              <button type="button" className="ghost-btn" onClick={() => onRespond('always')}>
                {t('a.allowAlways')}
              </button>
            )}
            <button type="button" className="primary-btn" onClick={() => onRespond('once')}>
              {t(imageScope ? 'a.saveImage' : outside ? 'a.allowOnce' : 'a.apply')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
