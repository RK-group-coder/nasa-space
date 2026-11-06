import type { ReactNode } from 'react'
import { AlertTriangle, Maximize2 } from 'lucide-react'
import type { Level } from '../types/health'
import { useCriteria } from '../lib/criteriaContext'
import { useI18n } from '../lib/i18nContext'

const LABEL: Record<Level, string> = { nominal: 'NOMINAL', advisory: 'ADVISORY', warning: 'WARNING' }

export function Badge({
  level = 'nominal',
  untested = false,
  infoKey,
}: {
  level?: Level
  untested?: boolean
  infoKey?: string
}) {
  const { openCriteria, canViewAnalytics } = useCriteria()
  const { t } = useI18n()
  const helpTip = canViewAnalytics ? t('criteria.helpTip') : t('criteria.helpTipLocked')
  return (
    <span className="badge-group">
      {untested ? (
        <span className="badge badge-untested">{t('level.untested')}</span>
      ) : (
        <span className={`badge badge-${level}`}>{LABEL[level]}</span>
      )}
      {infoKey && (
        <button
          type="button"
          className="badge-help-btn"
          title={helpTip}
          aria-label={helpTip}
          onClick={(e) => {
            e.stopPropagation()
            openCriteria(infoKey)
          }}
        >
          ?
        </button>
      )}
    </span>
  )
}

export function TestCard(props: {
  id: string
  step: string
  title: string
  sub: string
  duration: string
  level?: Level
  done?: boolean
  infoKey?: string
  children: ReactNode
}) {
  const { openCriteria, canViewAnalytics } = useCriteria()
  const { t, lang } = useI18n()
  const infoKey = props.infoKey || props.id.replace('test-', '')
  const helpTip = canViewAnalytics ? t('criteria.helpTip') : t('criteria.helpTipLocked')

  return (
    <section id={props.id} className={`test-card ${props.done ? 'is-done' : ''}`}>
      <div className={`test-today-ribbon ${props.done ? 'is-done' : 'is-pending'}`}>
        <span className="today-ribbon-status">
          <i className="today-ribbon-dot" />
          {props.done
            ? lang === 'en'
              ? '✓ Completed Today'
              : '✓ 今日已完成測驗'
            : lang === 'en'
            ? 'Pending Today'
            : '今日尚未完成測驗'}
        </span>
        <span className="duration">{props.duration}</span>
      </div>
      <header className="test-head">
        <span className="test-step">{props.step}</span>
        <div className="test-titles">
          <h3>{props.title}</h3>
          <p>{props.sub}</p>
        </div>
        <div className="test-meta">
          {props.done && props.level ? (
            <Badge level={props.level} infoKey={infoKey} />
          ) : (
            <button
              type="button"
              className="badge-help-btn standalone-help"
              title={helpTip}
              aria-label={helpTip}
              onClick={() => openCriteria(infoKey)}
            >
              ?
            </button>
          )}
        </div>
      </header>
      <div className="test-body">{props.children}</div>
    </section>
  )
}

export function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}<small>{unit}</small></span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export function StartTestButton({
  id,
  done,
  onClick,
}: {
  id: string
  done: boolean
  onClick: () => void
}) {
  const { lang } = useI18n()
  return (
    <button
      id={id}
      type="button"
      className={`btn-primary ${done ? '' : 'btn-untested'}`}
      onClick={onClick}
    >
      {done ? (
        <>
          <Maximize2 size={15} />
          <span>{lang === 'en' ? 'Retest Fullscreen' : '全螢幕重新測驗'}</span>
        </>
      ) : (
        <>
          <AlertTriangle size={16} className="btn-warn-icon" />
          <span>{lang === 'en' ? '(Pending Today) Start Test' : '(今日未測驗) 開始測驗'}</span>
        </>
      )}
    </button>
  )
}

export async function openStream(c: MediaStreamConstraints): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('此瀏覽器不支援相機／麥克風 API（請使用 https 或 localhost）')
  try {
    return await navigator.mediaDevices.getUserMedia(c)
  } catch (err: any) {
    if (c.video) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      } catch (fallbackErr: any) {
        throw fallbackErr
      }
    }
    throw err
  }
}

export function stopStream(s: MediaStream | null, videoEl?: HTMLVideoElement | null) {
  if (videoEl) {
    try {
      videoEl.pause()
      videoEl.srcObject = null
    } catch {}
  }
  if (!s) return
  try {
    s.getTracks().forEach((t) => {
      t.stop()
      t.enabled = false
    })
  } catch {}
}

export const median = (a: number[]) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function movingAvg(a: number[], w: number): number[] {
  const out: number[] = []
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i]
    if (i >= w) sum -= a[i - w]
    out.push(sum / Math.min(i + 1, w))
  }
  return out
}
