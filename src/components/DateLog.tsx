import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Brain,
  Eye,
  Mic,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  RotateCcw,
} from 'lucide-react'
import { buildActions, evaluateAmsler, worst } from '../lib/engine'
import {
  MISSION_START,
  dateKey,
  formatFullDate,
  getHistoricalDayData,
  hasCoreResults,
  isSameDay,
  missionDay,
  startOfDay,
} from '../lib/missionHistory'
import type { ActionItem, Env, Level, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

const DAY_NAMES_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_SHORT_ZH = ['日', '一', '二', '三', '四', '五', '六']
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FUTURE = 5
const HALF = 5

function pvtLevel(p: NonNullable<Results['pvt']>): Level {
  if (p.median > 400 || p.lapses >= 2) return 'warning'
  if (p.median > 300 || p.lapses >= 1) return 'advisory'
  return 'nominal'
}

function bpmLevel(bpm: number): Level {
  if (bpm > 100) return 'warning'
  if (bpm > 90) return 'advisory'
  return 'nominal'
}

function hrvLevel(hrv: number): Level {
  if (hrv < 30) return 'warning'
  if (hrv < 40) return 'advisory'
  return 'nominal'
}

function voiceLevel(stress: number): Level {
  if (stress >= 65) return 'warning'
  if (stress >= 40) return 'advisory'
  return 'nominal'
}

interface DaySummary {
  results: Results | null
  worstLv: Level | null
  anomCount: number
  /** 4 core tests in order: 01 PVT, 02 Amsler, 03 rPPG, 04 Voice */
  sysLevels: (Level | 'none')[]
  actions: ActionItem[]
  executedMap: Record<string, boolean>
  execDone: number
  execTotal: number
}

function summarizeDay(
  d: Date,
  today: Date,
  todayResults: Results,
  todayEnv: Env,
  todayExecuted: Record<string, boolean>,
  histOverrides: Record<string, Record<string, boolean>>,
): DaySummary {
  const clean = startOfDay(d)
  if (clean > today || clean < MISSION_START) {
    return {
      results: null,
      worstLv: null,
      anomCount: 0,
      sysLevels: ['none', 'none', 'none', 'none'],
      actions: [],
      executedMap: {},
      execDone: 0,
      execTotal: 0,
    }
  }

  const isT = isSameDay(clean, today)
  let r: Results | null = null
  let dayEnv: Env = todayEnv
  let executedMap: Record<string, boolean> = {}

  if (isT) {
    r = hasCoreResults(todayResults) ? todayResults : null
    dayEnv = todayEnv
    executedMap = todayExecuted
  } else {
    const hist = getHistoricalDayData(clean)
    r = hist.results
    dayEnv = hist.env
    const k = dateKey(clean)
    executedMap = { ...hist.defaultExecuted, ...(histOverrides[k] ?? {}) }
  }

  if (!r) {
    return {
      results: null,
      worstLv: null,
      anomCount: 0,
      sysLevels: ['none', 'none', 'none', 'none'],
      actions: [],
      executedMap: {},
      execDone: 0,
      execTotal: 0,
    }
  }

  const lPvt: Level | 'none' = r.pvt ? pvtLevel(r.pvt) : 'none'
  const lEye: Level | 'none' = r.amsler ? evaluateAmsler(r.amsler) : 'none'
  const lRppg: Level | 'none' = r.rppg ? worst(bpmLevel(r.rppg.bpm), hrvLevel(r.rppg.hrv)) : 'none'
  const lVoice: Level | 'none' = r.voice ? voiceLevel(r.voice.stress) : 'none'
  const sysLevels: (Level | 'none')[] = [lPvt, lEye, lRppg, lVoice]

  const testedLevels = sysLevels.filter((x): x is Level => x !== 'none')
  const worstLv = testedLevels.length > 0 ? worst(...testedLevels) : null
  const anomCount = testedLevels.filter((x) => x !== 'nominal').length

  const actions = buildActions(dayEnv, r)
  const execTotal = actions.length
  const execDone = actions.filter((a) => a.id && executedMap[a.id]).length

  return {
    results: r,
    worstLv,
    anomCount,
    sysLevels,
    actions,
    executedMap,
    execDone,
    execTotal,
  }
}

function buildCalendarMonth(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const cells: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function DateLog({
  selectedDate,
  onSelectDate,
  todayResults,
  env,
  todayExecuted = {},
  histExecutedOverrides = {},
  onToggleAction,
}: {
  selectedDate: Date
  onSelectDate: (d: Date) => void
  todayResults: Results
  env: Env
  todayExecuted?: Record<string, boolean>
  histExecutedOverrides?: Record<string, Record<string, boolean>>
  onToggleAction?: (d: Date, key: string, val: boolean) => void
}) {
  const { t, lang } = useI18n()
  const today = startOfDay(new Date())
  const pastSpan = Math.max(44, Math.floor((today.getTime() - MISSION_START.getTime()) / 86400000))
  const grandTotal = pastSpan + 1 + FUTURE
  const todayIdx = pastSpan

  const days = Array.from({ length: grandTotal }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (pastSpan - i))
    return d
  })

  const foundIdx = days.findIndex((d) => isSameDay(d, selectedDate))
  const selIdx = foundIdx >= 0 && foundIdx <= todayIdx ? foundIdx : todayIdx

  const [calOpen, setCalOpen] = useState(false)
  const [calYear, setCalYear] = useState(selectedDate.getFullYear())
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth())

  // Keep calendar month synced when selectedDate moves to another month
  useEffect(() => {
    setCalYear(selectedDate.getFullYear())
    setCalMonth(selectedDate.getMonth())
  }, [selectedDate])

  const nav = (dir: number) => {
    const nextIdx = Math.max(0, Math.min(todayIdx, selIdx + dir))
    const nextDay = days[nextIdx]
    if (nextDay && nextDay >= MISSION_START && nextDay <= today) {
      onSelectDate(nextDay)
    }
  }

  const selDate = days[selIdx]
  const isToday = selIdx === todayIdx
  const selSummary = summarizeDay(
    selDate,
    today,
    todayResults,
    env,
    todayExecuted,
    histExecutedOverrides,
  )
  const log = selSummary.results

  const slots = Array.from({ length: HALF * 2 + 1 }, (_, i) => {
    const offset = i - HALF
    const idx = selIdx + offset
    return { offset, idx, day: idx >= 0 && idx < grandTotal ? days[idx] : null }
  })

  const drumStyle = (offset: number) => {
    const abs = Math.abs(offset)
    return {
      transform: `rotateY(${offset * 18}deg) scale(${1 - abs * 0.09})`,
      opacity: Math.max(0.18, 1 - abs * 0.15),
      filter: abs > 1 ? `blur(${(abs - 1) * 0.55}px)` : 'none',
      zIndex: HALF - abs + 1,
    }
  }

  const calCells = buildCalendarMonth(calYear, calMonth)
  const navMonth = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setCalYear(y)
    setCalMonth(m)
  }

  const selectCalDate = (d: Date) => {
    if (d >= MISSION_START && d <= today) {
      onSelectDate(startOfDay(d))
    }
  }

  const monthValidDays = calCells.filter(
    (d): d is Date => Boolean(d && d >= MISSION_START && d <= today),
  )
  const monthSummaries = monthValidDays.map((d) =>
    summarizeDay(d, today, todayResults, env, todayExecuted, histExecutedOverrides),
  )
  const loggedDaysCount = monthSummaries.filter((s) => s.results !== null).length
  const anomDaysCount = monthSummaries.filter(
    (s) => s.worstLv === 'advisory' || s.worstLv === 'warning',
  ).length
  const monthTotalActions = monthSummaries.reduce((acc, s) => acc + s.execTotal, 0)
  const monthDoneActions = monthSummaries.reduce((acc, s) => acc + s.execDone, 0)

  return (
    <div className="date-log panel">
      {/* ── Drum Wheel ── */}
      <div className="drum-wrap">
        <button className="cal-nav" onClick={() => nav(-1)} aria-label="上一天">
          <ChevronLeft size={15} />
        </button>

        <div className="drum-stage">
          {slots.map(({ offset, idx, day }) => {
            if (!day)
              return <div key={offset} className="drum-cell drum-empty" style={drumStyle(offset)} />
            const isCenter = offset === 0
            const isTodayEl = idx === todayIdx
            const isFuture = idx > todayIdx || day < MISSION_START
            const isPast = idx < todayIdx && day >= MISSION_START
            const ds = !isFuture
              ? summarizeDay(day, today, todayResults, env, todayExecuted, histExecutedOverrides)
              : null

            return (
              <button
                key={idx}
                className={`drum-cell${isCenter ? ' drum-center' : ''}${isTodayEl ? ' drum-today' : ''}${isFuture ? ' drum-future' : ''}${isPast ? ' drum-past' : ''}`}
                style={drumStyle(offset)}
                onClick={() => !isFuture && onSelectDate(startOfDay(day))}
                disabled={isFuture}
              >
                <span className="drum-dow">{(lang === 'en' ? DAY_SHORT_EN : DAY_SHORT_ZH)[day.getDay()]}</span>
                <span className="drum-num">{day.getDate()}</span>
                <span className="drum-mo">{lang === 'en' ? MONTH_NAMES_EN[day.getMonth()] : `${day.getMonth() + 1}月`}</span>
                {ds && ds.worstLv && (
                  <span className="drum-ind-capsule">
                    <i className={`drum-dot lv-${ds.worstLv}`} />
                    {ds.execTotal > 0 && (
                      <em className={`drum-exec-mark ${ds.execDone === ds.execTotal ? 'done' : 'pend'}`}>
                        {ds.execDone === ds.execTotal ? '✓' : '!'}
                      </em>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button className="cal-nav" onClick={() => nav(1)} aria-label="下一天" disabled={isToday}>
          <ChevronRight size={15} />
        </button>

        {!isToday && (
          <button
            type="button"
            className="cal-today-jump"
            onClick={() => onSelectDate(today)}
            title={lang === 'en' ? 'Back to Today' : '返回今日實時數據'}
          >
            <RotateCcw size={12} />
            <span>{lang === 'en' ? 'Today' : '返回今日'}</span>
          </button>
        )}

        <button
          id="btn-cal-expand"
          className={`cal-expand-btn${calOpen ? ' active' : ''}`}
          onClick={() => setCalOpen((o) => !o)}
          aria-label={calOpen ? '收合月曆' : '查看日誌'}
        >
          <Calendar size={13} />
          <span>{calOpen ? (lang === 'en' ? 'Collapse Calendar' : '收合任務月曆') : (lang === 'en' ? 'Mission Flight Log' : '查看日誌紀錄')}</span>
        </button>
      </div>

      {/* ── Premium Full Month Mission Telemetry Calendar ── */}
      {calOpen && (
        <div className="fullcal">
          <div className="fullcal-head">
            <div className="fullcal-nav-group">
              <button className="cal-nav" onClick={() => navMonth(-1)} aria-label="上個月">
                <ChevronLeft size={14} />
              </button>
              <div className="fullcal-title-block">
                <span className="fullcal-title">
                  {lang === 'en'
                    ? `${MONTH_NAMES_EN[calMonth]} ${calYear}`
                    : `${calYear} 年 ${String(calMonth + 1).padStart(2, '0')} 月`}
                </span>
                <small className="fullcal-sub">MISSION HEALTH & COUNTERMEASURE LOG</small>
              </div>
              <button className="cal-nav" onClick={() => navMonth(1)} aria-label="下個月">
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="fullcal-kpis">
              <span className="fc-kpi-pill">
                {lang === 'en' ? (
                  <>Tested <b>{loggedDaysCount}</b> d</>
                ) : (
                  <>已晨檢 <b>{loggedDaysCount}</b> 天</>
                )}
              </span>
              <span className={`fc-kpi-pill ${anomDaysCount > 0 ? 'kpi-amber' : 'kpi-green'}`}>
                {lang === 'en' ? (
                  <>Anomalies <b>{anomDaysCount}</b> d</>
                ) : (
                  <>檢出異常 <b>{anomDaysCount}</b> 天</>
                )}
              </span>
              <span className="fc-kpi-pill kpi-green">
                {lang === 'en' ? 'Actions ' : '處置執行 '}
                <b>
                  {monthTotalActions > 0
                    ? `${monthDoneActions}/${monthTotalActions}`
                    : lang === 'en'
                    ? 'All Nominal'
                    : '全數正常'}
                </b>
              </span>
            </div>

            <button className="cal-close" onClick={() => setCalOpen(false)} aria-label="關閉月曆">
              <X size={14} />
            </button>
          </div>

          <div className="fullcal-scroll">
            <div className="fullcal-grid">
              {(lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_ZH).map((d) => (
                <div key={d} className="fullcal-dow">
                  {d}
                </div>
              ))}

              {calCells.map((d, i) => {
                if (!d) return <div key={i} className="fullcal-cell empty" />
                const isT = isSameDay(d, today)
                const isFut = d > today
                const isPre = d < MISSION_START
                const isPst = d < today && !isPre
                const isSelected = isSameDay(d, selDate)
                const sol = missionDay(d)
                const cs = summarizeDay(
                  d,
                  today,
                  todayResults,
                  env,
                  todayExecuted,
                  histExecutedOverrides,
                )
                const lvClass = cs.worstLv ? ` fc-lv-${cs.worstLv}` : ''

                return (
                  <button
                    key={i}
                    type="button"
                    className={`fullcal-cell${isT ? ' fc-today' : ''}${isFut ? ' fc-future' : ''}${isPre ? ' fc-pre' : ''}${isPst ? ' fc-past' : ''}${isSelected ? ' fc-selected' : ''}${lvClass}`}
                    disabled={isFut || isPre}
                    onClick={() => selectCalDate(d)}
                  >
                    <div className="fc-row-top">
                      <div className="fc-date-grp">
                        <span className="fc-day-num">{String(d.getDate()).padStart(2, '0')}</span>
                        {isT ? (
                          <em className="fc-today-tag">{lang === 'en' ? 'Today' : '今日'}</em>
                        ) : !isPre ? (
                          <small className="fc-sol-tag">S{sol}</small>
                        ) : null}
                      </div>

                      {cs.worstLv === 'nominal' && (
                        <span className="fc-anom-pill lv-nominal">
                          <i />
                          {lang === 'en' ? 'Nominal' : '正常'}
                        </span>
                      )}
                      {cs.worstLv === 'advisory' && (
                        <span className="fc-anom-pill lv-advisory">
                          <i />
                          {lang === 'en' ? 'Adv' : '注意'} {cs.anomCount}
                        </span>
                      )}
                      {cs.worstLv === 'warning' && (
                        <span className="fc-anom-pill lv-warning">
                          <i />
                          {lang === 'en' ? 'Warn' : '警示'} {cs.anomCount}
                        </span>
                      )}
                      {!cs.worstLv && isT && (
                        <span className="fc-anom-pill lv-pending">{lang === 'en' ? 'Pending' : '待晨檢'}</span>
                      )}
                    </div>

                    {!isFut && !isPre && (
                      <div
                        className="fc-sys-bars"
                        title={lang === 'en' ? '4 Morning Tests: 01 PVT · 02 Vision · 03 Pulse · 04 Voice' : '四項晨檢狀態：01 PVT · 02 視覺 · 03 心跳 · 04 語音'}
                      >
                        {cs.sysLevels.map((sl, idx2) => (
                          <span key={idx2} className={`fc-sys-seg seg-${sl}`} />
                        ))}
                      </div>
                    )}

                    <div className="fc-row-bot">
                      {isFut ? (
                        <span className="fc-exec-badge is-muted">{lang === 'en' ? 'Future' : '尚未到達'}</span>
                      ) : isPre ? (
                        <span className="fc-exec-badge is-muted">{lang === 'en' ? 'Pre-mission' : '任務前'}</span>
                      ) : !cs.results ? (
                        <span className="fc-exec-badge is-muted">
                          {isT ? (lang === 'en' ? '○ Tests Pending' : '○ 尚未完成測驗') : (lang === 'en' ? '— No Records' : '— 無晨檢紀錄')}
                        </span>
                      ) : cs.execTotal === 0 ? (
                        <span className="fc-exec-badge is-nominal">
                          <ShieldCheck size={11} />
                          {lang === 'en' ? 'No Action' : '無須處置'}
                        </span>
                      ) : cs.execDone === cs.execTotal ? (
                        <span className="fc-exec-badge is-done">
                          <CheckCircle2 size={11} />
                          {lang === 'en' ? 'Completed ' : '處置已完成 '}{cs.execDone}/{cs.execTotal}
                        </span>
                      ) : (
                        <span className="fc-exec-badge is-pending">
                          <AlertTriangle size={11} />
                          {lang === 'en' ? 'Pending ' : '處置未完成 '}{cs.execDone}/{cs.execTotal}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="fullcal-foot">
            <div className="fc-foot-meta">
              <span>{lang === 'en' ? `Mission Start: ${formatFullDate(MISSION_START)}` : `任務起算：${formatFullDate(MISSION_START)}`}</span>
              <span>·</span>
              <span>{lang === 'en' ? `Today Sol ${missionDay(today)} (Click any date to view synchronized telemetry)` : `今日任務第 ${missionDay(today)} 天（點擊任一日期，全頁儀表板同步切換至該日數據）`}</span>
            </div>

            <div className="fc-foot-legends">
              <span className="fc-leg-group">
                <b>{lang === 'en' ? 'Status' : '異常狀態'}</b>
                <em className="lg-item lg-nom">
                  <i />
                  {lang === 'en' ? 'Nominal' : '正常'}
                </em>
                <em className="lg-item lg-adv">
                  <i />
                  {lang === 'en' ? 'Advisory' : '注意'}
                </em>
                <em className="lg-item lg-warn">
                  <i />
                  {lang === 'en' ? 'Warning' : '警示'}
                </em>
              </span>
              <span className="fc-leg-sep">|</span>
              <span className="fc-leg-group">
                <b>{lang === 'en' ? 'Actions' : '推薦行動'}</b>
                <em className="fc-leg-exec done">{lang === 'en' ? '✓ Done' : '✓ 已執行'}</em>
                <em className="fc-leg-exec pend">{lang === 'en' ? '! Pending' : '! 未完成'}</em>
                <em className="fc-leg-exec none">{lang === 'en' ? '— None' : '— 無須處置'}</em>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Selected Day Log Bar ── */}
      <div className="log-bar-wrap">
        <div className="log-bar">
          <div className="log-meta">
            <span className="log-date-label">{formatFullDate(selDate)}</span>
            {isToday ? (
              <span className="log-today-badge">{lang === 'en' ? 'Today' : '今日'}</span>
            ) : (
              <span className="log-hist-badge">{lang === 'en' ? 'History' : '歷史數據'}</span>
            )}
            <span className="log-md">{lang === 'en' ? `Mission Sol ${missionDay(selDate)}` : `任務第 ${missionDay(selDate)} 天`}</span>

            {log && selSummary.worstLv && (
              <div className="log-day-badges">
                {selSummary.worstLv === 'nominal' ? (
                  <span className="log-summary-pill lv-nominal">{lang === 'en' ? '✓ All Nominal' : '✓ 全項正常'}</span>
                ) : selSummary.worstLv === 'advisory' ? (
                  <span className="log-summary-pill lv-advisory">
                    ▲ {lang === 'en' ? `${selSummary.anomCount} Advisory` : `檢出 ${selSummary.anomCount} 項注意`}
                  </span>
                ) : (
                  <span className="log-summary-pill lv-warning">
                    ▲ {lang === 'en' ? `${selSummary.anomCount} Warning` : `檢出 ${selSummary.anomCount} 項警示`}
                  </span>
                )}

                {selSummary.execTotal > 0 ? (
                  <span
                    className={`log-exec-pill ${
                      selSummary.execDone === selSummary.execTotal ? 'is-done' : 'is-pending'
                    }`}
                  >
                    {selSummary.execDone === selSummary.execTotal ? (
                      <>
                        <CheckCircle2 size={11} /> {lang === 'en' ? 'Actions Completed' : '推薦行動已完成'} ({selSummary.execDone}/
                        {selSummary.execTotal})
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} /> {lang === 'en' ? 'Actions Pending' : '推薦行動未完成'} ({selSummary.execDone}/
                        {selSummary.execTotal})
                      </>
                    )}
                  </span>
                ) : (
                  <span className="log-exec-pill is-none">{lang === 'en' ? 'No Countermeasures Needed' : '無異常處置需求'}</span>
                )}
              </div>
            )}
          </div>

          {log ? (
            <div className="log-chips">
              {log.pvt && (
                <div className={`log-chip lv-${pvtLevel(log.pvt)}`}>
                  <i className="log-chip-dot" />
                  <Brain size={12} />
                  <span>PVT</span>
                  <b>{log.pvt.median} ms</b>
                </div>
              )}
              {log.amsler && (
                <div className={`log-chip lv-${evaluateAmsler(log.amsler)}`}>
                  <i className="log-chip-dot" />
                  <Eye size={12} />
                  <span>Amsler</span>
                  <b>
                    {lang === 'en'
                      ? `OD ${log.amsler.rightMarks ?? 0} / OS ${log.amsler.leftMarks ?? 0}`
                      : `右${log.amsler.rightMarks ?? 0} / 左${log.amsler.leftMarks ?? 0}格`}
                  </b>
                </div>
              )}
              {log.rppg && (
                <div className={`log-chip lv-${bpmLevel(log.rppg.bpm)}`}>
                  <i className="log-chip-dot" />
                  <Activity size={12} />
                  <span>{lang === 'en' ? 'Heart Rate' : '心率'}</span>
                  <b>{log.rppg.bpm} BPM</b>
                </div>
              )}
              {log.rppg && (
                <div className={`log-chip lv-${hrvLevel(log.rppg.hrv)}`}>
                  <i className="log-chip-dot" />
                  <Activity size={12} />
                  <span>HRV</span>
                  <b>{log.rppg.hrv} ms</b>
                </div>
              )}
              {log.voice && (
                <div className={`log-chip lv-${voiceLevel(log.voice.stress)}`}>
                  <i className="log-chip-dot" />
                  <Mic size={12} />
                  <span>{lang === 'en' ? 'Stress' : '壓力'}</span>
                  <b>{log.voice.stress}/100</b>
                </div>
              )}
            </div>
          ) : (
            <p className="log-empty">
              {isToday
                ? (lang === 'en' ? "Today's tests pending" : '今日尚未完成晨檢項目')
                : (lang === 'en' ? 'No records for this day' : '此日無晨檢紀錄')}
            </p>
          )}

          <div className="log-legend" aria-label="狀態顏色注示">
            <span className="lg-item lg-nom">
              <i />
              {lang === 'en' ? 'Nominal' : '正常'}
            </span>
            <span className="lg-item lg-adv">
              <i />
              {lang === 'en' ? 'Advisory' : '注意'}
            </span>
            <span className="lg-item lg-warn">
              <i />
              {lang === 'en' ? 'Warning' : '警示'}
            </span>
          </div>
        </div>

        {log && selSummary.actions.length > 0 && (
          <div className="log-actions-strip">
            <span className="las-label">{lang === 'en' ? 'Recommended Countermeasures:' : '當日推薦處置：'}</span>
            <div className="las-items">
              {selSummary.actions.map((act, idx3) => {
                const key = act.id ?? `${act.category}-${idx3}`
                const done = Boolean(act.id && selSummary.executedMap[act.id])
                const clickable = isToday && Boolean(onToggleAction && act.id)
                return clickable ? (
                  <button
                    key={key}
                    type="button"
                    className={`las-pill ${done ? 'is-done' : 'is-pending'} is-clickable`}
                    onClick={() => act.id && onToggleAction!(selDate, act.id, !done)}
                    title={lang === 'en' ? 'Click to toggle status' : '點擊切換執行狀態'}
                  >
                    {done ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    <b>{act.title}</b>
                    <em>{done ? (lang === 'en' ? 'Executed' : '已執行') : (lang === 'en' ? 'Pending' : '未執行')}</em>
                  </button>
                ) : (
                  <span key={key} className={`las-pill ${done ? 'is-done' : 'is-pending'}`}>
                    {done ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    <b>{act.title}</b>
                    <em>{done ? (lang === 'en' ? 'Executed' : '已執行') : (lang === 'en' ? 'Pending' : '未執行')}</em>
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
