import { useMemo, useState, type ReactNode } from 'react'
import type { ActivityDay, ActivityView } from '../../../shared/types'
import { MONTHS, type TranslationKey } from '../../../shared/i18n'
import { useT, type RendererTranslator } from '../i18n'
import { ChevronRightIcon } from './Icons'

interface ActivityHeatmapProps {
  activity: ActivityView | null
}

const SEASON_KEYS: TranslationKey[] = ['act.spring', 'act.summer', 'act.autumn', 'act.winter']
const SEASON_START_MONTHS = [2, 5, 8, 11]
const MAX_OFFSET = 3
const CELLS_PER_MONTH = 42

function scoreOf(day: ActivityDay): number {
  return day.messages + day.tools + day.writes
}

function parseDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function longDate(key: string, months: string[]): string {
  const date = parseDate(key)
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function tooltip(day: ActivityDay, i18n: RendererTranslator): string {
  const months = MONTHS[i18n.lang]
  const score = scoreOf(day)
  if (!score) return i18n.t('act.silence', { date: longDate(day.date, months) })
  const parts: string[] = []
  if (day.messages) parts.push(i18n.tc('unit.task', day.messages))
  if (day.tools) parts.push(i18n.tc('unit.step', day.tools))
  if (day.writes) parts.push(i18n.tc('unit.write', day.writes))
  return `${longDate(day.date, months)} — ${parts.join(', ')}`
}

function levelOf(score: number, busiest: number): number {
  if (score <= 0) return 0
  return Math.max(1, Math.min(4, Math.ceil((score / Math.max(1, busiest)) * 4)))
}

function seasonStart(today: Date, offset: number): Date {
  const month = today.getMonth()
  let year = today.getFullYear()
  let start = 2
  if (month < 2) {
    year -= 1
    start = 11
  } else if (month < 5) {
    start = 2
  } else if (month < 8) {
    start = 5
  } else if (month < 11) {
    start = 8
  } else {
    start = 11
  }
  return new Date(year, start - offset * 3, 1)
}

function seasonIndexOf(date: Date): number {
  return SEASON_START_MONTHS.indexOf(date.getMonth())
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function buildMonth(
  year: number,
  month: number,
  days: Map<string, ActivityDay>
): (ActivityDay | null)[] {
  const first = new Date(year, month, 1)
  const total = new Date(year, month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const cells: (ActivityDay | null)[] = new Array(leading).fill(null)
  for (let day = 1; day <= total; day++) {
    const key = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push(days.get(key) ?? { date: key, messages: 0, tools: 0, writes: 0 })
  }
  while (cells.length < CELLS_PER_MONTH) cells.push(null)
  return cells.slice(0, CELLS_PER_MONTH)
}

export function ActivityHeatmap({ activity }: ActivityHeatmapProps): ReactNode {
  const i18n = useT()
  const months = MONTHS[i18n.lang]
  const [offset, setOffset] = useState(0)
  const days = activity?.days ?? []

  const byDate = useMemo(() => {
    const map = new Map<string, ActivityDay>()
    for (const day of days) map.set(day.date, day)
    return map
  }, [days])

  const start = seasonStart(new Date(), offset)
  const startIndex = seasonIndexOf(start)
  const seasonIndex = startIndex < 0 ? 0 : startIndex
  const seasonYear = start.getFullYear()
  const yearLabel =
    seasonIndex === 3
      ? `${seasonYear}/${String((seasonYear + 1) % 100).padStart(2, '0')}`
      : String(seasonYear)

  const monthData = useMemo(
    () =>
      [0, 1, 2].map((index) => {
        const month = (start.getMonth() + index) % 12
        const year = start.getFullYear() + Math.floor((start.getMonth() + index) / 12)
        return {
          month,
          year,
          cells: buildMonth(year, month, byDate)
        }
      }),
    [start, byDate]
  )

  let seasonMessages = 0
  let seasonTools = 0
  let seasonWrites = 0
  let busiest = 0
  for (const month of monthData) {
    for (const day of month.cells) {
      if (!day) continue
      seasonMessages += day.messages
      seasonTools += day.tools
      seasonWrites += day.writes
      busiest = Math.max(busiest, scoreOf(day))
    }
  }
  const hasData = seasonMessages + seasonTools + seasonWrites > 0

  return (
    <div className="heatmap side seasonal">
      <div className="heatmap-head">
        <span className="heatmap-title">{i18n.t('side.activity')}</span>
        <div className="season-nav">
          <button
            type="button"
            className="season-arrow prev"
            title={i18n.t('act.prevSeason')}
            aria-label={i18n.t('act.prevSeason')}
            disabled={offset >= MAX_OFFSET}
            onClick={() => setOffset((value) => Math.min(MAX_OFFSET, value + 1))}
          >
            <ChevronRightIcon size={12} />
          </button>
          <span className="season-label">
            {i18n.t('act.seasonOf', { season: i18n.t(SEASON_KEYS[seasonIndex]), year: yearLabel })}
          </span>
          <button
            type="button"
            className="season-arrow next"
            title={i18n.t('act.nextSeason')}
            aria-label={i18n.t('act.nextSeason')}
            disabled={offset <= 0}
            onClick={() => setOffset((value) => Math.max(0, value - 1))}
          >
            <ChevronRightIcon size={12} />
          </button>
        </div>
      </div>

      <div className="season-months">
        {monthData.map((month) => (
          <div className="season-month" key={`${month.year}-${month.month}`}>
            <span className="season-month-label">{months[month.month]}</span>
            <div
              className="season-grid"
              role="img"
              aria-label={`${months[month.month]} ${month.year}`}
            >
              {month.cells.map((day, index) =>
                day ? (
                  <span
                    key={day.date}
                    className={`heat-cell level-${levelOf(scoreOf(day), busiest)}`}
                    title={tooltip(day, i18n)}
                  />
                ) : (
                  <span key={`blank-${index}`} className="heat-cell blank" />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="heatmap-foot">
        <span className="heatmap-summary">
          {hasData
            ? i18n.t('act.summary', {
                messages: i18n.tc('unit.message', seasonMessages),
                steps: i18n.tc('unit.step', seasonTools),
                writes: i18n.tc('unit.write', seasonWrites)
              })
            : i18n.t('act.empty')}
        </span>
        <span className="heatmap-legend" aria-hidden="true">
          <i className="heat-cell level-0" />
          <i className="heat-cell level-1" />
          <i className="heat-cell level-2" />
          <i className="heat-cell level-3" />
          <i className="heat-cell level-4" />
        </span>
      </div>
    </div>
  )
}
