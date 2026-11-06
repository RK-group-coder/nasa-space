import {
  Dumbbell,
  Pill,
  Lightbulb,
  Moon,
  Send,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { buildActions } from '../lib/engine'
import { Badge } from './TestCard'
import type { ActionItem, Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

const ICON: Record<ActionItem['category'], typeof Dumbbell> = {
  exercise: Dumbbell,
  nutrition: Pill,
  environment: Lightbulb,
  rest: Moon,
  comms: Send,
}

export function ActionCardItem({
  action,
  executed,
  onToggle,
  compactIcon,
  readOnly = false,
}: {
  action: ActionItem
  executed: boolean
  onToggle: (next: boolean) => void
  compactIcon?: boolean
  readOnly?: boolean
}) {
  const { t, lang } = useI18n()
  const Icon = ICON[action.category]
  return (
    <li className={`act-item lv-${action.level} ${executed ? 'is-executed' : ''}`}>
      <span className="act-icon">
        <Icon size={compactIcon ? 16 : 18} />
      </span>
      <div className="act-item-copy">
        <b>{action.title}</b>
        <p>{action.detail}</p>
      </div>
      <div className="act-item-right">
        <Badge level={action.level} />
        <button
          type="button"
          role="switch"
          aria-checked={executed}
          disabled={readOnly}
          className={`act-exec-toggle ${executed ? 'is-on' : ''} ${readOnly ? 'is-readonly' : ''}`}
          onClick={() => {
            if (!readOnly) onToggle(!executed)
          }}
          title={
            readOnly
              ? lang === 'en' ? 'Historical record view only' : '歷史紀錄僅供檢視，無法調整'
              : executed
              ? lang === 'en' ? 'Click to mark as pending' : '點擊切換為未執行'
              : lang === 'en' ? 'Click to mark as executed' : '點擊標記為已執行'
          }
        >
          <span className="act-toggle-switch" aria-hidden="true">
            <i className="act-toggle-knob" />
          </span>
          <span className="act-toggle-text">{executed ? t('act.executed') : t('act.execute')}</span>
        </button>
      </div>
    </li>
  )
}

export default function ActionHub({
  env,
  results,
  executed = {},
  onToggleExecuted,
  dateLabel = '今日',
  readOnly = false,
}: {
  env: Env
  results: Results
  executed?: Record<string, boolean>
  onToggleExecuted?: (key: string, val: boolean) => void
  dateLabel?: string
  readOnly?: boolean
}) {
  const { t, lang } = useI18n()
  const actions = buildActions(env, results)
  const testedCount = (['pvt', 'amsler', 'rppg', 'voice'] as const).filter((k) => Boolean(results[k])).length
  const doneCount = actions.filter((a, i) => Boolean(executed[a.id || `${a.category}-${i}`])).length
  const allExecuted = actions.length > 0 && doneCount === actions.length

  const headerTitle = dateLabel === '今日' || dateLabel === 'Today'
    ? t('act.titleToday')
    : `${dateLabel} ${lang === 'en' ? 'Autonomous Countermeasures' : '自主處置行動'}`

  return (
    <div className="panel act-list">
      <div className="act-head">
        <h3>{headerTitle}</h3>
        {actions.length > 0 && (
          <span
            className={`act-count-pill ${
              allExecuted
                ? 'is-done'
                : actions.some((a) => a.level === 'warning')
                ? 'is-warn'
                : ''
            }`}
          >
            {allExecuted
              ? t('act.allDonePill').replace('{done}', String(doneCount)).replace('{total}', String(actions.length))
              : doneCount > 0
              ? t('act.partialDonePill').replace('{done}', String(doneCount)).replace('{total}', String(actions.length))
              : t('act.warnPill').replace('{total}', String(actions.length))}
          </span>
        )}
      </div>

      {actions.length > 0 ? (
        <ul>
          {actions.map((a, i) => {
            const key = a.id || `${a.category}-${i}`
            return (
              <ActionCardItem
                key={key}
                action={a}
                executed={Boolean(executed[key])}
                readOnly={readOnly}
                onToggle={(next) => onToggleExecuted?.(key, next)}
              />
            )
          })}
        </ul>
      ) : testedCount > 0 ? (
        <div className="act-empty is-all-clear">
          <span className="act-empty-icon"><CheckCircle2 size={20} /></span>
          <div>
            <b>{lang === 'en' ? `Tested Systems Nominal (${testedCount}/4)` : `已測項目均正常（${testedCount}/4）`}</b>
            <p>{lang === 'en' ? 'Zero anomalies detected. No additional countermeasures required.' : '未檢測出異常問題，目前無需額外應對處置。'}</p>
          </div>
        </div>
      ) : (
        <div className="act-empty">
          <span className="act-empty-icon"><ShieldCheck size={20} /></span>
          <div>
            <b>{lang === 'en' ? 'No Active Countermeasures' : '尚無異常處置項目'}</b>
            <p>{lang === 'en' ? 'Prescriptions appear here when sensor abnormalities are detected.' : '完成左側測驗後，僅在檢測出問題時於此提供對應的應對方法。'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
