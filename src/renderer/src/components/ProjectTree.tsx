import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { TreeEntry } from '../../../shared/types'
import { useT } from '../i18n'
import {
  AlertIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  LayersIcon,
  RefreshIcon,
  XIcon
} from './Icons'

interface ProjectTreeProps {
  projectPath: string
  projectName: string
  onClose: () => void
}

interface Row {
  entry: TreeEntry
  depth: number
}

function absolutePath(projectPath: string, relative: string): string {
  return `${projectPath.replace(/[\\/]+$/, '')}/${relative}`
}

export function ProjectTree({ projectPath, projectName, onClose }: ProjectTreeProps): ReactNode {
  const { t } = useT()
  const [nodes, setNodes] = useState<Record<string, TreeEntry[]>>({})
  const [open, setOpen] = useState<string[]>([])
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')

  const load = useCallback(
    async (dir: string): Promise<void> => {
      setPending((value) => value + 1)
      try {
        const result = await window.closecode.readTree({ path: dir })
        setNodes((current) => ({ ...current, [dir]: result.entries }))
        setError('')
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : String(problem))
      } finally {
        setPending((value) => value - 1)
      }
    },
    []
  )

  useEffect(() => {
    void load('')
  }, [load])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const rows: Row[] = []
  const collect = (dir: string, depth: number): void => {
    for (const entry of nodes[dir] ?? []) {
      rows.push({ entry, depth })
      if (entry.dir && open.includes(entry.path)) collect(entry.path, depth + 1)
    }
  }
  collect('', 0)

  function toggle(entry: TreeEntry): void {
    if (open.includes(entry.path)) {
      setOpen((current) => current.filter((item) => item !== entry.path))
      return
    }
    setOpen((current) => [...current, entry.path])
    if (!nodes[entry.path]) void load(entry.path)
  }

  const reload = (): void => {
    setNodes({})
    for (const dir of ['', ...open]) void load(dir)
  }

  return (
    <div className="overlay tree-overlay" onClick={onClose}>
      <aside
        className="tree-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('tree.title')}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <header className="tree-head">
          <span className="tree-head-icon">
            <LayersIcon size={15} />
          </span>
          <div className="tree-title">
            <strong>{t('tree.title')}</strong>
            <small title={projectPath}>{projectName}</small>
          </div>
          <button type="button" className="icon-btn" onClick={reload} title={t('tree.refresh')}>
            <RefreshIcon size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={onClose} title={t('tree.close')}>
            <XIcon size={15} />
          </button>
        </header>

        <div className="tree-body">
          {error ? (
            <div className="tree-note error">
              <AlertIcon size={15} />
              <span>{error}</span>
            </div>
          ) : !rows.length && !pending ? (
            <div className="tree-note">{t('tree.empty')}</div>
          ) : (
            rows.map(({ entry, depth }) => (
              <button
                key={entry.path}
                type="button"
                className={`tree-row${entry.dir ? ' dir' : ''}`}
                style={{ paddingLeft: `${8 + depth * 13}px` }}
                onClick={() => {
                  if (entry.dir) toggle(entry)
                  else void window.closecode.revealPath(absolutePath(projectPath, entry.path))
                }}
                onDoubleClick={() => {
                  if (!entry.dir) void navigator.clipboard.writeText(entry.path)
                }}
                title={entry.dir ? entry.path : absolutePath(projectPath, entry.path)}
              >
                {entry.dir ? (
                  <ChevronRightIcon
                    size={11}
                    className={`tree-caret${open.includes(entry.path) ? ' open' : ''}`}
                  />
                ) : (
                  <span className="tree-caret" />
                )}
                {entry.dir ? <FolderIcon size={13} /> : <FileIcon size={13} />}
                <span className="tree-name">{entry.name}</span>
              </button>
            ))
          )}
          {pending > 0 && (
            <div className="tree-note busy" role="status">
              <span className="spinner" />
              <span>{t('tree.loading')}</span>
            </div>
          )}
        </div>

        <footer className="tree-foot">
          <small>{t('tree.hint')}</small>
        </footer>
      </aside>
    </div>
  )
}
