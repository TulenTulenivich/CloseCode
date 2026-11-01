function AssistantRow({
  item,
  isLast,
  streaming
}: {
  item: Extract<ChatItem, { kind: 'assistant' }>
  isLast: boolean
  streaming: boolean
}): ReactNode {
  const { t } = useT()
  const [copied, setCopied] = useState(false)

  const copy = (): void => {
    void navigator.clipboard.writeText(item.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="assistant-row" key={item.id}>
      <div className="assistant-body">
        <Markdown>{item.text}</Markdown>
        {isLast && streaming && <span className="cursor" />}
      </div>
      {!streaming && item.text.trim() && (
        <div className="assistant-actions" style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <button
            type="button"
            className="chat-action-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              opacity: 0.7,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
            onClick={copy}
            title={copied ? t('c.copied') : t('c.copy')}
            aria-label={copied ? t('c.copied') : t('c.copy')}
          >
            {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            <span>{copied ? t('c.copied') : t('c.copy')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ChatItem, CompactionItem, ImageItem, ToolItem } from '../chat'
import { toolLabel } from '../chat'
import { formatBytes } from '../utils'
import { useT } from '../i18n'
import { Markdown } from './Markdown'
import {
  AlertIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  CompressIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  SparkIcon,
  UsersIcon,
  XIcon
} from './Icons'

interface ChatLogProps {
  items: ChatItem[]
  streaming: boolean
  compacting: boolean
}

type Block =
  | { kind: 'tool-group'; id: string; tools: ToolItem[] }
  | { kind: 'item'; item: Exclude<ChatItem, ToolItem> }

function groupItems(items: ChatItem[]): Block[] {
  const blocks: Block[] = []
  for (const item of items) {
    if (item.kind === 'tool') {
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'tool-group') {
        last.tools.push(item)
      } else {
        blocks.push({ kind: 'tool-group', id: item.id, tools: [item] })
      }
    } else {
      blocks.push({ kind: 'item', item })
    }
  }
  return blocks
}

function childrenByParent(tools: ToolItem[]): Map<string, ToolItem[]> {
  const map = new Map<string, ToolItem[]>()
  for (const tool of tools) {
    if (!tool.parent) continue
    const list = map.get(tool.parent)
    if (list) list.push(tool)
    else map.set(tool.parent, [tool])
  }
  return map
}

function ToolRow({
  item,
  children,
  depth = 0
}: {
  item: ToolItem
  children: Map<string, ToolItem[]>
  depth?: number
}): ReactNode {
  const nested = children.get(item.id)
  return (
    <>
      <div className={`tool-row ${item.status}`} title={item.detail || undefined}>
        <span className="tool-status">
          {item.status === 'running' ? (
            <span className="spinner" />
          ) : item.status === 'ok' ? (
            <CheckIcon size={12} />
          ) : (
            <XIcon size={12} />
          )}
        </span>
        {item.agent && <UsersIcon size={12} className="tool-agent-icon" />}
        <span className="tool-label">{toolLabel(item.name)}</span>
        {item.agent && <span className="tool-agent">{item.agent}</span>}
        {item.path && item.path !== '.' && <span className="tool-path">{item.path}</span>}
        {item.status === 'error' && item.detail && <span className="tool-error">{item.detail}</span>}
      </div>
      {nested?.map((child) => (
        <div className={`tool-nested depth-${depth + 1}`} key={child.id}>
          <ToolRow item={child} children={children} depth={depth + 1} />
        </div>
      ))}
    </>
  )
}

function ToolGroup({ tools }: { tools: ToolItem[] }): ReactNode {
  const { t, tc } = useT()
  const running = tools.some((tool) => tool.status === 'running')
  const failed = tools.filter((tool) => tool.status === 'error').length
  const [open, setOpen] = useState(running)
  const [now, setNow] = useState(() => Date.now())
  const wasRunning = useRef(running)
  const children = childrenByParent(tools)
  const topLevel = tools.filter((tool) => !tool.parent || !tools.some((p) => p.id === tool.parent))

  useEffect(() => {
    if (running) setOpen(true)
    else if (wasRunning.current) setOpen(false)
    wasRunning.current = running
  }, [running])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const start = tools[0].startedAt
  const end = tools[tools.length - 1].finishedAt ?? now
  const seconds = Math.max(0, Math.round((end - start) / 1000))

  return (
    <div className="tool-group">
      <button
        type="button"
        className="tool-group-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <ChevronRightIcon size={12} className={`chev${open ? ' open' : ''}`} />
        {running ? (
          <span className="spinner" />
        ) : failed ? (
          <AlertIcon size={13} className="group-error-icon" />
        ) : (
          <CheckIcon size={13} className="group-ok-icon" />
        )}
        <span>
          {t(running ? 'chat.groupDoing' : 'chat.groupDid')} {tc('unit.tool', topLevel.length)}
        </span>
        {seconds >= 1 && (
          <span className="group-duration">{t('chat.duration', { n: seconds })}</span>
        )}
        {failed > 0 && !running && (
          <span className="group-failed">{tc('unit.error', failed)}</span>
        )}
      </button>

      {open && (
        <div className="tool-group-body">
          {topLevel.map((tool) => (
            <ToolRow key={tool.id} item={tool} children={children} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompactionRow({ item }: { item: CompactionItem }): ReactNode {
  const { t } = useT()
  return (
    <div className={`compaction-row ${item.status}`}>
      <span className="compaction-line" aria-hidden="true" />
      <span className="compaction-icon">
        {item.status === 'running' ? (
          <span className="spinner" />
        ) : item.status === 'ok' ? (
          <CompressIcon size={14} />
        ) : (
          <AlertIcon size={14} />
        )}
      </span>
      <span className="compaction-copy">
        <strong>
          {item.status === 'running'
            ? t('chat.compacting')
            : item.status === 'ok'
              ? t('chat.compacted')
              : t('chat.compactFailed')}
        </strong>
        {item.detail && <small>{item.detail}</small>}
      </span>
      <span className="compaction-line" aria-hidden="true" />
    </div>
  )
}

function UserRow({ item }: { item: Extract<ChatItem, { kind: 'user' }> }): ReactNode {
  const { t } = useT()
  const [zoom, setZoom] = useState<string | null>(null)
  const photos = item.images ?? []
  const showText =
    item.text &&
    !(photos.length && (item.text === t('chat.imageOnly') || item.text === t('chat.attachmentOnly')))

  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  return (
    <div className="user-row">
      <div className="user-bubble">
        {photos.length > 0 && (
          <div className={`user-images${photos.length > 1 ? ' multi' : ''}`}>
            {photos.map((photo, index) => (
              <button
                type="button"
                className="user-image"
                key={`${photo.name}-${index}`}
                onClick={() => setZoom(photo.src)}
                aria-label={t('chat.openImage')}
                title={photo.name}
              >
                <img src={photo.src} alt={photo.name} draggable={false} />
              </button>
            ))}
          </div>
        )}
        {showText && <span className="user-text">{item.text}</span>}
        {item.files && item.files.length > 0 && (
          <span className="message-files">
            {item.files.map((file, index) => (
              <span className="message-file" key={`${file.name}-${index}`}>
                <FileIcon size={12} />
                <span>{file.name}</span>
                <small>{formatBytes(file.size)}</small>
              </span>
            ))}
          </span>
        )}
      </div>
      {zoom && (
        <div
          className="user-image-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={t('chat.openImage')}
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="" draggable={false} />
          <button
            type="button"
            className="user-image-close"
            aria-label={t('chat.imageClose')}
            onClick={(event) => {
              event.stopPropagation()
              setZoom(null)
            }}
          >
            <XIcon size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function ImageRow({ item }: { item: ImageItem }): ReactNode {
  const { t } = useT()
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    let live = true
    setSrc(null)
    setFailed(false)
    window.closecode
      .readImage(item.absolutePath)
      .then((data) => {
        if (live) setSrc(data)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [item.absolutePath])

  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setZoom(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const format = item.mime.replace(/^image\//, '').toUpperCase()

  return (
    <div className="image-row">
      <figure className="image-card">
        {src ? (
          <button
            type="button"
            className="image-frame"
            onClick={() => setZoom(true)}
            aria-label={t('chat.imageOpen')}
          >
            <img src={src} alt={item.path} />
          </button>
        ) : (
          <div className={`image-frame image-placeholder${failed ? ' failed' : ''}`} role="status">
            {failed ? <AlertIcon size={16} /> : <span className="spinner" />}
            <span>{t(failed ? 'chat.imageFailed' : 'chat.imageLoading')}</span>
          </div>
        )}
        <figcaption className="image-caption">
          <ImageIcon size={14} className="image-caption-icon" />
          <span className="image-path" title={item.absolutePath}>
            {item.path}
          </span>
          <span className="image-size">
            {format} · {formatBytes(item.bytes)}
          </span>
          <button
            type="button"
            className="image-reveal"
            title={t('chat.imageReveal')}
            aria-label={t('chat.imageReveal')}
            onClick={() => {
              void window.closecode.revealPath(item.absolutePath).catch(() => undefined)
            }}
          >
            <FolderIcon size={13} />
          </button>
        </figcaption>
      </figure>

      {zoom && src && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t('chat.imageOpen')}
          onClick={() => setZoom(false)}
        >
          <img src={src} alt={item.path} onClick={(event) => event.stopPropagation()} />
          <span className="image-lightbox-path">{item.path}</span>
          <button
            type="button"
            className="image-lightbox-close"
            aria-label={t('chat.imageClose')}
            title={t('chat.imageClose')}
            onClick={() => setZoom(false)}
          >
            <XIcon size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

export function ChatLog({ items, streaming, compacting }: ChatLogProps): ReactNode {
  const { t } = useT()
  const blocks = groupItems(items)
  const lastItem = items[items.length - 1]
  const waiting = streaming && !compacting && (!lastItem || lastItem.kind !== 'assistant')

  return (
    <>
      {blocks.map((block) => {
        if (block.kind === 'tool-group') {
          return <ToolGroup tools={block.tools} key={`group-${block.id}`} />
        }

        const item = block.item
        if (item.kind === 'user') return <UserRow item={item} key={item.id} />
        if (item.kind === 'assistant') {
          const isLast = lastItem?.kind === 'assistant' && lastItem.id === item.id
          return <AssistantRow item={item} isLast={isLast} streaming={streaming} key={item.id} />
        }
        if (item.kind === 'compaction') return <CompactionRow item={item} key={item.id} />
        if (item.kind === 'image') return <ImageRow item={item} key={item.id} />
        if (item.kind === 'notice') {
          return (
            <div className="notice-row" key={item.id} role="status">
              <AlertIcon size={14} />
              <span>{item.text}</span>
            </div>
          )
        }
        return (
          <div className="error-row" key={item.id}>
            <AlertIcon size={15} />
            <span>{item.text}</span>
          </div>
        )
      })}

      {waiting && (
        <div className="thinking-row" role="status">
          <SparkIcon size={14} className="thinking-spark" />
          <span className="thinking-label">{t('chat.thinking')}</span>
          <span className="thinking-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </>
  )
}
