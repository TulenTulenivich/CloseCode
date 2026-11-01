import type { ReactNode } from 'react'
import type { ActivityView, SettingsView } from '../../../shared/types'
import { useT, type RendererTranslator } from '../i18n'
import { ActivityHeatmap } from './ActivityHeatmap'
import { ComposeIcon, FolderIcon, LockIcon, PlusIcon, ShieldIcon, XIcon } from './Icons'

interface SidebarProps {
  settings: SettingsView
  taskTitle: string
  activity: ActivityView | null
  streaming: boolean
  compacting: boolean
  ready: boolean
  privateSession: boolean
  onNewTask: () => void
  onAddProject: () => void
  onOpenProject: (path: string) => void
  onRemoveProject: (path: string) => void
  onTogglePrivate: () => void
  onOpenSettings: () => void
}

function samePath(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase()
}

function timeAgo(stamp: number, i18n: RendererTranslator): string {
  const diff = Date.now() - stamp
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 1000) return i18n.t('side.justNow')
  if (diff < day) return i18n.t('side.today')
  if (diff < day * 2) return i18n.t('side.yesterday')
  const days = Math.floor(diff / day)
  if (days < 14) return i18n.t('side.daysAgo', { n: days })
  return i18n.t('side.weeksAgo', { n: Math.floor(days / 7) })
}

export function Sidebar({
  settings,
  taskTitle,
  activity,
  streaming,
  compacting,
  ready,
  privateSession,
  onNewTask,
  onAddProject,
  onOpenProject,
  onRemoveProject,
  onTogglePrivate,
  onOpenSettings
}: SidebarProps): ReactNode {
  const i18n = useT()
  const { t, tc } = i18n
  const busy = streaming || compacting
  const projects = [...settings.projects].sort((a, b) => b.lastUsedAt - a.lastUsedAt)

  return (
    <aside className="sidebar" aria-label={t('c.ariaWorkspace')}>
      <div className="sidebar-top">
        <button type="button" className="side-new" onClick={onNewTask} disabled={busy}>
          <span className="side-new-icon">
            <ComposeIcon size={15} />
          </span>
          <span>{t('side.newTask')}</span>
        </button>

        {taskTitle && (
          <div className="task-row has-project">
            <span className="task-eyebrow">{t('side.currentTask')}</span>
            <span className="task-title">
              <span className={`task-dot${streaming ? ' live' : ''}${ready ? '' : ' idle'}`} />
              <span className="task-name" title={taskTitle}>
                {taskTitle}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="sidebar-scroll">
        <section className="side-section" aria-label={t('side.projects')}>
          <div className="side-head">
            <span>{t('side.projects')}</span>
            <button
              type="button"
              className="side-head-btn"
              onClick={onAddProject}
              disabled={busy}
              title={t('side.addProject')}
              aria-label={t('side.addProject')}
            >
              <PlusIcon size={12} />
            </button>
          </div>

          {!projects.length && (
            <button type="button" className="project-empty" onClick={onAddProject} disabled={busy}>
              <span className="project-empty-icon">
                <FolderIcon size={16} />
              </span>
              <span>
                <strong>{t('side.addProject')}</strong>
                <small>{t('side.noProject')}</small>
              </span>
            </button>
          )}

          <div className="project-list">
            {projects.map((project) => {
              const isActive = samePath(project.path, settings.activeProjectPath)
              return (
                <div
                  className={`project-card${isActive ? ' active' : ''}${project.available ? '' : ' gone'}`}
                  key={project.path}
                >
                  <button
                    type="button"
                    className="project-open"
                    onClick={() => onOpenProject(project.path)}
                    disabled={busy || !project.available}
                    title={project.path}
                  >
                    <span className="project-glyph" aria-hidden="true">
                      <FolderIcon size={13} />
                    </span>
                    <span className="project-copy">
                      <strong>{project.name}</strong>
                      <small>
                        {project.available
                          ? t('side.projectMeta', {
                              messages: project.messages
                                ? tc('unit.message', project.messages)
                                : t('side.noMessages'),
                              time: timeAgo(project.lastUsedAt, i18n)
                            })
                          : t('s.missing')}
                      </small>
                    </span>
                    {isActive && <span className="project-active-dot" aria-label={t('s.active')} />}
                  </button>
                  <button
                    type="button"
                    className="project-remove"
                    onClick={() => onRemoveProject(project.path)}
                    disabled={busy}
                    title={t('side.removeProject')}
                    aria-label={`${t('side.removeProject')} ${project.name}`}
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <ActivityHeatmap activity={activity} />

        <button
          type="button"
          className={`private-toggle${privateSession ? ' on' : ''}`}
          role="switch"
          aria-checked={privateSession}
          onClick={onTogglePrivate}
          disabled={busy}
          title={t('side.privateHint')}
        >
          <span className="private-icon">
            <LockIcon size={14} />
          </span>
          <span className="private-copy">
            <strong>{t('side.private')}</strong>
            <small>{t(privateSession ? 'side.privateOn' : 'side.privateOff')}</small>
          </span>
          <span className="switch" aria-hidden="true">
            <span className="switch-knob" />
          </span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className="side-security"
          onClick={onOpenSettings}
          title={t('side.providerKeys')}
        >
          <span className="side-security-icon">
            <ShieldIcon size={16} />
          </span>
          <span className="side-security-copy">
            <strong>{t('side.securityTitle')}</strong>
            <span>{t('side.securityBody')}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
