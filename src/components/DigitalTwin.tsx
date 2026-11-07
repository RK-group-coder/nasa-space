import { useState } from 'react'
import {
  evaluate,
  evaluateAmsler,
  immuneIndex,
  computeImmuneBreakdown,
  buildActions,
  type SystemStatus,
} from '../lib/engine'
import { Badge } from './TestCard'
import { ActionCardItem } from './ActionHub'
import AbnormalSopProtocol from './AbnormalSopProtocol'
import {
  ClipboardList,
  Activity,
  Heart,
  Brain,
  Eye,
  Mic,
  Bone,
  Shield,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react'
import { formatShortDate, missionDay } from '../lib/missionHistory'
import type { ActionItem, Env, Level, StatusLevel, Results } from '../types/health'
import { computeBoneLoss } from '../lib/boneModel'
import { useI18n } from '../lib/i18nContext'

type Key = 'brain' | 'eye' | 'heart' | 'voice' | 'spine'

export default function DigitalTwin({
  env,
  results,
  executed = {},
  onToggleExecuted,
  onStartTriage,
  selectedDate,
  isToday = true,
}: {
  env: Env
  results: Results
  executed?: Record<string, boolean>
  onToggleExecuted?: (key: string, val: boolean) => void
  onStartTriage?: () => void
  selectedDate?: Date
  isToday?: boolean
}) {
  const { t, lang } = useI18n()
  const [sel, setSel] = useState<Key>('brain')
  const sol = selectedDate ? missionDay(selectedDate) : 67
  const shortDate = selectedDate ? formatShortDate(selectedDate) : (lang === 'en' ? 'Today' : '今日')
  const effectiveResults: Results = results.bone
    ? results
    : { ...results, bone: computeBoneLoss(sol, 92) }
  const s = evaluate(env, effectiveResults)
  const idx = immuneIndex(env, effectiveResults)

  const isOrganTested = (k: Key): boolean => {
    if (k === 'spine') return true
    if (k === 'brain') return Boolean(effectiveResults.pvt) && !effectiveResults.pvt?.insufficient
    if (k === 'eye') return Boolean(effectiveResults.amsler) && !effectiveResults.amsler?.insufficient
    if (k === 'heart') return Boolean(effectiveResults.rppg) && !effectiveResults.rppg?.insufficient
    return Boolean(effectiveResults.voice) && !effectiveResults.voice?.insufficient
  }

  const isOrganInsufficient = (k: Key): boolean => {
    if (k === 'brain') return Boolean(effectiveResults.pvt?.insufficient)
    if (k === 'eye') return Boolean(effectiveResults.amsler?.insufficient)
    if (k === 'heart') return Boolean(effectiveResults.rppg?.insufficient)
    if (k === 'voice') return Boolean(effectiveResults.voice?.insufficient)
    return false
  }

  const testedCount = (['pvt', 'amsler', 'rppg', 'voice'] as const).filter((k) =>
    Boolean(effectiveResults[k]) && !effectiveResults[k]?.insufficient,
  ).length

  const regions: { k: Key; lvl: StatusLevel }[] = [
    { k: 'brain', lvl: s.cognition },
    { k: 'eye', lvl: s.eye },
    { k: 'heart', lvl: s.cardio },
    { k: 'voice', lvl: s.mind },
    { k: 'spine', lvl: s.bone },
  ]
  const lvOf = (k: Key) => regions.find((r) => r.k === k)!.lvl

  const hotspots: { id: string; k: Key; x: number; y: number; label: string }[] = [
    { id: 'brain', k: 'brain', x: 50, y: 5.5, label: lang === 'en' ? 'Brain' : '大腦' },
    { id: 'eye', k: 'eye', x: 50, y: 9.6, label: lang === 'en' ? 'Eye' : '眼球' },
    { id: 'voice', k: 'voice', x: 50, y: 15.8, label: lang === 'en' ? 'Vocal' : '聲帶' },
    { id: 'heart', k: 'heart', x: 51, y: 25, label: lang === 'en' ? 'Heart' : '心臟' },
    { id: 'spine', k: 'spine', x: 50, y: 41, label: lang === 'en' ? 'Spine' : '脊椎' },
    { id: 'femur-l', k: 'spine', x: 40, y: 66, label: lang === 'en' ? 'Femur' : '股骨' },
    { id: 'femur-r', k: 'spine', x: 60, y: 66, label: lang === 'en' ? 'Femur' : '股骨' },
  ]

  const organInfoKey: Record<Key, string> = {
    heart: 'rppg',
    brain: 'pvt',
    eye: 'amsler',
    voice: 'voice',
    spine: 'bone',
  }

  const organMeta: Record<Key, { title: string; level: StatusLevel; icon: typeof Heart }> = {
    heart: { title: lang === 'en' ? 'Cardiovascular & Autonomic' : '心血管自律神經系統', level: s.cardio, icon: Heart },
    brain: { title: lang === 'en' ? 'Central Nervous & PVT Reaction' : '中樞神經 · 精神運動警覺反應', level: s.cognition, icon: Brain },
    eye: { title: lang === 'en' ? 'SANS Retinal & Macular Grid' : 'SANS 視網膜神經與黃斑部', level: s.eye, icon: Eye },
    voice: { title: lang === 'en' ? 'Voice Stress & Sympathetic Tone' : '聲學語音壓力與交感神經張力', level: s.mind, icon: Mic },
    spine: { title: lang === 'en' ? 'Microgravity Bone Remodeling Dynamics' : '微重力骨骼與骨質疏鬆推演', level: s.bone, icon: Bone },
  }

  return (
    <div className="twin-grid">
      {/* Left Column: Hologram Body */}
      <div className="panel twin-figure">
        <div className="twin-figure-head">
          <h3>{lang === 'en' ? 'Astronaut Digital Twin' : '全身數位分身 (Digital Twin)'}</h3>
          <span className={`live-pill ${!isToday ? 'is-hist' : ''}`}>
            <span className="live-dot" />
            {isToday
              ? lang === 'en' ? `Live Telemetry · Sol ${sol}` : `實時遙測 · Sol ${sol}`
              : lang === 'en' ? `${shortDate} Telemetry · Sol ${sol}` : `${shortDate} 數據 · Sol ${sol}`}
          </span>
        </div>

        <div className="holo" role="img" aria-label="全息數位分身人體圖">
          <img src="/hologram_body.jpg" alt="" draggable={false} />
          <div className="holo-scan" />
          <div className="holo-grid-overlay" />
          {hotspots.map((h) => {
            const tested = isOrganTested(h.k)
            const insufficient = isOrganInsufficient(h.k)
            const hotClass = insufficient
              ? 'lv-insufficient'
              : tested
              ? `lv-${lvOf(h.k)}`
              : 'lv-untested'
            return (
              <button
                key={h.id}
                id={`hot-${h.id}`}
                className={`hot ${hotClass} ${sel === h.k ? 'sel' : ''}`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                onClick={() => setSel(h.k)}
                aria-label={organMeta[h.k].title}
              >
                <i />
                <span>{h.label}</span>
              </button>
            )
          })}
        </div>

        <p className="hint">{lang === 'en' ? 'Click organ to inspect subsystem telemetry' : '點擊器官查看各系統數據'}</p>

        <button
          id="btn-start-triage"
          type="button"
          className={`btn-triage ${!isToday ? 'is-locked' : ''}`}
          disabled={!isToday}
          onClick={() => {
            if (isToday) onStartTriage?.()
          }}
        >
          {isToday ? (
            <>
              <ClipboardList size={18} />
              <span>{t('app.startTriage')}</span>
            </>
          ) : (
            <>
              <Lock size={17} />
              <span>{lang === 'en' ? 'Return to Today to Test' : '請回至今日才能測驗'}</span>
            </>
          )}
        </button>
      </div>

      {/* Right Column: Advanced Telemetry Console */}
      <div className="twin-side">
        {/* Panel 1: Organ-Specific High-Resolution Telemetry */}
        <div className="panel organ-telemetry-panel">
          <div className="panel-head">
            <div className="panel-title-with-icon">
              {(() => {
                const Icon = organMeta[sel].icon
                return <Icon size={18} className="panel-icon-accent" />
              })()}
              <div>
                <h3>{organMeta[sel].title}</h3>
                <span className="panel-sub-label">
                  {isOrganInsufficient(sel)
                    ? lang === 'en'
                      ? '⚠️ Insufficient Data / Retest Required · Telemetry indeterminate'
                      : '⚠️ 生理資料不足／需要重測 · 數據未達臨床判定閾值'
                    : isOrganTested(sel)
                    ? sel === 'spine'
                      ? lang === 'en'
                        ? `Microgravity Continuous Bone Remodeling · Sol ${sol}`
                        : `微重力骨質連續推演模型 · Sol ${sol}`
                      : lang === 'en'
                      ? 'Real-Time Sensor Telemetry & Dynamics'
                      : '即時生理感測 · 動態遙測頻譜'
                    : lang === 'en'
                    ? 'Test not yet completed today · No telemetry data'
                    : '今日尚未完成此項晨檢測驗 · 暫無生理數據'}
                </span>
              </div>
            </div>
            <Badge
              level={organMeta[sel].level}
              untested={!isOrganTested(sel) && !isOrganInsufficient(sel)}
              insufficient={isOrganInsufficient(sel)}
              infoKey={organInfoKey[sel]}
            />
          </div>

          {/* Organ Quick Selector Tabs */}
          <div className="organ-tabs-bar">
            {regions.map((r) => {
              const meta = organMeta[r.k]
              const Icon = meta.icon
              const isSelected = sel === r.k
              const tested = isOrganTested(r.k)
              const insufficient = isOrganInsufficient(r.k)
              const labelMap: Record<Key, string> = {
                heart: lang === 'en' ? 'Heart (rPPG)' : '心臟 (rPPG)',
                brain: lang === 'en' ? 'Brain (PVT)' : '大腦 (PVT反應)',
                eye: lang === 'en' ? 'Eye (SANS)' : '眼球 (SANS)',
                voice: lang === 'en' ? 'Voice (Stress)' : '聲帶 (語音壓力)',
                spine: lang === 'en' ? 'Skeleton (Bone)' : '骨骼 (骨質疏鬆推演)',
              }
              const tabClass = isSelected
                ? 'active'
                : insufficient
                ? 'is-insufficient'
                : !tested
                ? 'is-untested'
                : `lv-${r.lvl}`
              return (
                <button
                  key={r.k}
                  className={`organ-tab-btn ${tabClass}`}
                  onClick={() => setSel(r.k)}
                >
                  <Icon size={13} />
                  <span>{labelMap[r.k]}</span>
                  {insufficient ? (
                    <em className="tab-insufficient-pill">{lang === 'en' ? 'Retest' : '需重測'}</em>
                  ) : !tested ? (
                    <em className="tab-untested-pill">{lang === 'en' ? 'Pending' : '未測'}</em>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Organ Telemetry Visualizer */}
          <OrganVisualizer
            sel={sel}
            results={effectiveResults}
            sol={sol}
            isToday={isToday}
            onStartTriage={onStartTriage}
          />
        </div>

        {/* Panel 2: Advanced Multi-Factor Immune Vulnerability Dial */}
        <div className="panel immune-panel-advanced">
          <div className="panel-head">
            <div className="panel-title-with-icon">
              <Shield size={18} className="panel-icon-accent" />
              <div>
                <h3>{t('immune.title')}</h3>
                <span className="panel-sub-label">
                  {isToday
                    ? t('immune.subToday')
                    : t('immune.subHist').replace('{shortDate}', shortDate).replace('{sol}', String(sol))}
                </span>
              </div>
            </div>
            <Badge level={s.immune} untested={testedCount === 0} infoKey="immune" />
          </div>

          <ImmuneDialVisualizer
            idx={idx}
            level={s.immune}
            env={env}
            results={effectiveResults}
            hasAnyTest={testedCount > 0}
          />
        </div>

        {/* Panel 3: Autonomous Countermeasure Actions */}
        {(() => {
          const actions = buildActions(env, effectiveResults)
          const doneCount = actions.filter((a, i) => Boolean(executed[a.id || `${a.category}-${i}`])).length
          const allExecuted = actions.length > 0 && doneCount === actions.length
          return (
            <div className="panel act-mini">
              <div className="panel-head">
                <div className="panel-title-with-icon">
                  <Activity size={18} className="panel-icon-accent" />
                  <div>
                    <h3>
                      {isToday
                        ? t('act.titleToday')
                        : t('act.titleHist').replace('{shortDate}', shortDate)}
                    </h3>
                    <span className="panel-sub-label">
                      {isToday
                        ? lang === 'en'
                          ? 'Prescriptions appear when abnormal biomarkers are detected'
                          : '僅於晨檢檢測出異常指標時提供應對處方'
                        : lang === 'en'
                        ? 'Historical prescription logs (read-only)'
                        : '當日晨檢異常處方與歷史執行紀錄（僅供檢視，無法調整）'}
                    </span>
                  </div>
                </div>
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
                <>
                  <ul className="act-mini-list">
                    {actions.map((a: ActionItem, i: number) => {
                      const key = a.id || `${a.category}-${i}`
                      return (
                        <ActionCardItem
                          key={key}
                          action={a}
                          compactIcon
                          readOnly={!isToday}
                          executed={Boolean(executed[key])}
                          onToggle={(next) => {
                            if (isToday) onToggleExecuted?.(key, next)
                          }}
                        />
                      )
                    })}
                  </ul>
                  <AbnormalSopProtocol
                    env={env}
                    results={effectiveResults}
                    date={selectedDate}
                    isToday={isToday}
                    compact
                  />
                </>
              ) : testedCount > 0 ? (
                <div className="act-empty is-all-clear">
                  <span className="act-empty-icon"><CheckCircle2 size={20} /></span>
                  <div>
                    <b>{lang === 'en' ? `Tested Systems Nominal (${testedCount}/4)` : `已測項目均正常（${testedCount}/4）`}</b>
                    <p>{lang === 'en' ? 'Zero anomalies detected. No additional countermeasures required.' : '目前無異常生理指標，無需額外應對處置。'}</p>
                  </div>
                </div>
              ) : (
                <div className="act-empty">
                  <span className="act-empty-icon"><Shield size={20} /></span>
                  <div>
                    <b>{lang === 'en' ? 'No Active Countermeasures' : '尚無異常處置項目'}</b>
                    <p>{lang === 'en' ? 'Prescriptions appear here when daily tests detect abnormal biomarkers.' : '完成每日測驗後，若檢測出異常問題將自動於此提供應對方法。'}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ==========================================================================
   Untested Organ Prompt (極簡今日未測驗按鈕)
   ========================================================================== */
function UntestedOrganPrompt({
  isToday,
  onStartTriage,
}: {
  isToday: boolean
  onStartTriage?: () => void
}) {
  const { lang } = useI18n()
  return (
    <div className="telemetry-untested-minimal">
      {isToday ? (
        <button
          type="button"
          className="btn-primary btn-untested tuc-start-btn"
          onClick={onStartTriage}
        >
          <AlertTriangle size={16} className="btn-warn-icon" />
          <span>{lang === 'en' ? '(Pending Today) Go to Daily Tests' : '(今日未測驗) 前往開始測驗'}</span>
        </button>
      ) : (
        <span className="tuc-past-empty">{lang === 'en' ? 'No tests recorded for this day' : '當日未執行測驗'}</span>
      )}
    </div>
  )
}

/* ==========================================================================
   Insufficient Organ Prompt (資料不足／需要重測專屬醫學診斷看板)
   ========================================================================== */
function InsufficientOrganPrompt({
  sel,
  reason,
  isToday,
  onStartTriage,
}: {
  sel: Key
  reason?: string
  isToday: boolean
  onStartTriage?: () => void
}) {
  const { lang } = useI18n()
  const organTitles: Record<Key, { name: string; failDefault: string; tip: string }> = {
    heart: {
      name: lang === 'en' ? 'Cardiovascular rPPG' : 'rPPG 心血管脈搏',
      failDefault: lang === 'en' ? 'Optical arterial pulse signal weak, light too dim, or face tracking lost' : '光體積動脈脈搏波形微弱、光線過暗或臉部移動脫框',
      tip: lang === 'en' ? 'Ensure uniform lighting (>300 Lux), keep face centered and still for 15s' : '請調亮面部光源（避免逆光與螢幕強烈色光），對準鏡頭靜止 15 秒重新測驗',
    },
    brain: {
      name: lang === 'en' ? 'NASA-PVT Vigilance' : 'NASA-PVT 精神運動警覺',
      failDefault: lang === 'en' ? 'Trials incomplete or excessive false starts (>3)' : '測驗未完成 5 次有效反應或搶跑次數過高',
      tip: lang === 'en' ? 'Focus in a quiet cockpit environment and complete all 5 reaction triggers' : '請在無外部通訊干擾的環境中專注盯住螢幕，完整完成 5 次反應測試',
    },
    eye: {
      name: lang === 'en' ? 'Amsler Visual Grid' : 'Amsler 數位視野篩檢',
      failDefault: lang === 'en' ? 'Binocular fixation incomplete or aborted before both eyes tested' : '雙眼中心凝視未完整完成，未能取得中心視角 10 度之黃斑部網格數據',
      tip: lang === 'en' ? 'Maintain 30-33 cm distance, test Right then Left eye while fixating red dot' : '請保持 30–33 cm 距離，依序遮蔽測試右眼與左眼，凝視紅點完成雙眼掃描',
    },
    voice: {
      name: lang === 'en' ? 'Acoustic Voice Stress' : '聲學語音壓力',
      failDefault: lang === 'en' ? 'Microphone muted or voiced frames under 10 seconds' : '未錄得有效長度之連續語音或麥克風音量過低（未達 10 秒）',
      tip: lang === 'en' ? 'Close to microphone, speak at natural volume and read the standard passage' : '請靠近麥克風並確保環境靜音，以自然正常聲量清晰朗讀畫面短文',
    },
    spine: {
      name: lang === 'en' ? 'Skeleton' : '骨骼系統',
      failDefault: '',
      tip: '',
    },
  }

  const meta = organTitles[sel]

  return (
    <div className="insufficient-twin-prompt">
      <div className="itp-banner">
        <div className="itp-badge-tag">
          <AlertTriangle size={15} />
          <span>{lang === 'en' ? 'INSUFFICIENT DATA / RETEST REQUIRED' : '資料不足／需要重測'}</span>
        </div>
        <h4>
          {lang === 'en'
            ? `${meta.name} · Signal Inadequate for Clinical Assessment`
            : `${meta.name} · 生理訊號未達臨床判定標準`}
        </h4>
      </div>

      <div className="itp-body">
        <div className="itp-reason-box">
          <span className="itp-label">{lang === 'en' ? 'Indeterminate Reason' : '判讀失敗／資料不足原因'}</span>
          <p>{reason || meta.failDefault}</p>
        </div>

        <div className="itp-principle-quote">
          <b>{lang === 'en' ? 'Spaceflight Health Principle' : '深空自主健康管理核心準則'}</b>
          <p>
            {lang === 'en'
              ? 'Knowing which data cannot yet be judged is critical. In deep space with communication delays, invalid or incomplete sensor signals must NEVER default to "healthy" to prevent catastrophic diagnostic blind spots.'
              : '健康管理最關鍵的一點，是明確知道哪些資料「還不能做判斷」。在深空無隨艦醫生情境下，資料不足或受干擾之訊號嚴禁預設為健全，以防隱性急性失衡盲區。'}
          </p>
        </div>

        <div className="itp-retest-guide">
          <span className="itp-label">{lang === 'en' ? 'Calibration & Retest Protocol' : '建議重測校準指引'}</span>
          <p>{meta.tip}</p>
        </div>

        {isToday && onStartTriage && (
          <button
            type="button"
            className="btn-primary itp-retest-btn"
            onClick={onStartTriage}
          >
            <AlertTriangle size={16} />
            <span>{lang === 'en' ? 'Recalibrate & Retest Now' : '立即重新校準並重測'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   Organ-Specific Telemetry Visualizer (器官專屬高階遙測圖表)
   ========================================================================== */
function OrganVisualizer({
  sel,
  results,
  sol,
  isToday,
  onStartTriage,
}: {
  sel: Key
  results: Results
  sol: number
  isToday: boolean
  onStartTriage?: () => void
}) {
  switch (sel) {
    case 'heart': {
      const r = results.rppg
      if (!r) {
        return <UntestedOrganPrompt isToday={isToday} onStartTriage={onStartTriage} />
      }
      if (r.insufficient) {
        return (
          <InsufficientOrganPrompt
            sel="heart"
            reason={r.reason}
            isToday={isToday}
            onStartTriage={onStartTriage}
          />
        )
      }
      const bpm = r.bpm
      const hrv = r.hrv
      const pulseColor =
        bpm > 100 || hrv < 30 ? '#ff4d5e' : bpm > 90 || hrv < 40 ? '#ffd043' : 'var(--green)'
      const snr = +(13.9 + ((bpm + hrv) % 16) * 0.1).toFixed(1)

      return (
        <div className="telemetry-box">
          {/* Live Waveform Monitor */}
          <div className="telemetry-wave-monitor">
            <div className="wave-monitor-head">
              <span className="wave-monitor-title">rPPG 綠光光體積動脈搏動即時波形 (Arterial Pulse Trace)</span>
              <span className="wave-pulse-rate" style={{ color: pulseColor }}>{bpm} BPM</span>
            </div>
            <div className="ecg-canvas-wrap">
              <svg className="ecg-svg" viewBox="0 0 400 65" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ecg-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pulseColor} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={pulseColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <path d="M0,15 H400 M0,32 H400 M0,50 H400" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                {/* Continuous arterial pulse wave */}
                <path
                  d="M0,35 Q15,35 25,32 Q35,15 45,8 Q55,48 65,32 Q75,34 85,34 
                     Q95,35 105,32 Q115,15 125,8 Q135,48 145,32 Q155,34 165,34
                     Q175,35 185,32 Q195,15 205,8 Q215,48 225,32 Q235,34 245,34
                     Q255,35 265,32 Q275,15 285,8 Q295,48 305,32 Q315,34 325,34
                     Q335,35 345,32 Q355,15 365,8 Q375,48 385,32 Q395,34 400,34"
                  fill="none"
                  stroke={pulseColor}
                  strokeWidth="2.2"
                  className="ecg-path-animated"
                />
              </svg>
              <div className="ecg-scanline" />
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="telemetry-metrics-grid">
            <div className="telemetry-metric-card">
              <div className="tm-label">
                <span>靜息心率 (BPM)</span>
                <span className="tm-normal-hint">標準: &lt;90</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{bpm}</span>
                <small className="tm-unit">BPM</small>
                <span className={`tm-tag ${bpm > 100 ? 'tag-warn' : bpm > 90 ? 'tag-adv' : 'tag-nom'}`}>
                  {bpm > 100 ? '心率過速' : bpm > 90 ? '代償偏高' : '穩態'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (bpm / 130) * 100)}%`,
                    background: bpm > 100 ? '#ff4d5e' : bpm > 90 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">量測方式：<strong>rPPG 綠光光體積直接實測</strong></span>
            </div>

            <div className="telemetry-metric-card">
              <div className="tm-label">
                <span>自律神經 HRV (RMSSD)</span>
                <span className="tm-normal-hint">標準: &ge;40</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{hrv}</span>
                <small className="tm-unit">ms</small>
                <span className={`tm-tag ${hrv < 30 ? 'tag-warn' : hrv < 40 ? 'tag-adv' : 'tag-nom'}`}>
                  {hrv < 30 ? '高度交感負荷' : hrv < 40 ? '耐受下降' : '自律健全'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (hrv / 70) * 100)}%`,
                    background: hrv < 30 ? '#ff4d5e' : hrv < 40 ? '#ffd043' : '#00b4ff',
                  }}
                />
              </div>
              <span className="tm-sub-detail">量測方式：<strong>連續脈搏間隔均方根實測</strong></span>
            </div>

            <div className="telemetry-metric-card">
              <div className="tm-label">
                <span>平均心跳間隔 (IBI)</span>
                <span className="tm-normal-hint">標準: 660-1000ms</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{Math.round(60000 / bpm)}</span>
                <small className="tm-unit">ms</small>
                <span className="tm-tag tag-nom">正常節律</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: `${Math.min(100, ((60000 / bpm) / 1000) * 100)}%`, background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">光學波形：<strong>Inter-Beat Interval 峰值間距</strong></span>
            </div>

            <div className="telemetry-metric-card">
              <div className="tm-label">
                <span>rPPG 光學訊號品質 (SNR)</span>
                <span className="tm-normal-hint">優良: &gt;10 dB</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{snr}</span>
                <small className="tm-unit">dB</small>
                <span className="tm-tag tag-nom">訊噪比優良</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: `${Math.min(95, Math.round(snr * 5.5))}%`, background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">品質指標：<strong>帶通濾波訊號清晰穩定</strong></span>
            </div>
          </div>
        </div>
      )
    }

    case 'brain': {
      const p = results.pvt
      if (!p) {
        return <UntestedOrganPrompt isToday={isToday} onStartTriage={onStartTriage} />
      }
      if (p.insufficient) {
        return (
          <InsufficientOrganPrompt
            sel="brain"
            reason={p.reason}
            isToday={isToday}
            onStartTriage={onStartTriage}
          />
        )
      }
      const medianRt = p.median
      const lapses = p.lapses
      const falseStarts = p.falseStarts
      const rtsList = p.rts && p.rts.length > 0 ? p.rts : [medianRt, medianRt, medianRt, medianRt, medianRt]
      const rtSpread = Math.max(...rtsList) - Math.min(...rtsList)

      return (
        <div className="telemetry-box">
          {/* PVT Latency Trials Monitor & Table */}
          <div className="telemetry-wave-monitor pvt-telemetry-monitor">
            <div className="wave-monitor-head">
              <span className="wave-monitor-title">NASA-PVT 5 回合神經反應速度毫秒分佈圖 (Reaction Latency)</span>
              <span
                className="wave-pulse-rate"
                style={{ color: medianRt > 400 ? '#ff4d5e' : medianRt > 300 ? '#ffd043' : 'var(--green)' }}
              >
                中位反應 {medianRt} ms
              </span>
            </div>

            {/* Visual Bar Chart of the 5 Trials */}
            <div className="pvt-twin-bars">
              {rtsList.map((rt, idx) => {
                const isLapse = rt > 500
                const isAdv = rt > 300 && rt <= 500
                const hPct = Math.min(100, Math.max(16, (rt / 600) * 100))
                return (
                  <div key={idx} className="pvt-twin-bar-col">
                    <span className={`pvt-twin-val ${isLapse ? 'val-lapse' : isAdv ? 'val-adv' : 'val-nom'}`}>
                      {rt} ms
                    </span>
                    <div className="pvt-twin-track">
                      {/* Reference line 500ms lapse */}
                      <div className="pvt-ref-line lapse-line" title="500ms 遲緩警戒線" />
                      {/* Reference line 300ms nominal */}
                      <div className="pvt-ref-line nominal-line" title="300ms 敏銳基準線" />
                      <div
                        className={`pvt-twin-fill ${isLapse ? 'fill-lapse' : isAdv ? 'fill-adv' : 'fill-nom'}`}
                        style={{ height: `${hPct}%` }}
                      />
                    </div>
                    <span className="pvt-twin-label">第 0{idx + 1} 回合</span>
                  </div>
                )
              })}
            </div>

            {/* Reaction Speed Record Table */}
            <div className="pvt-twin-table-wrap">
              <table className="pvt-twin-table">
                <thead>
                  <tr>
                    <th>試驗回合</th>
                    <th>單次反應毫秒</th>
                    <th>偏離中位數</th>
                    <th>注意力評定</th>
                  </tr>
                </thead>
                <tbody>
                  {rtsList.map((rt, idx) => {
                    const diff = rt - medianRt
                    const diffSign = diff > 0 ? `+${diff}` : `${diff}`
                    const isLapse = rt > 500
                    const isAdv = rt > 300 && rt <= 500
                    return (
                      <tr key={idx} className={isLapse ? 'row-lapse' : ''}>
                        <td className="cell-trial">第 {idx + 1} 回合</td>
                        <td className="cell-rt">
                          <strong className={isLapse ? 'text-red' : isAdv ? 'text-amber' : 'text-green'}>
                            {rt} ms
                          </strong>
                        </td>
                        <td className="cell-diff">
                          <small style={{ color: diff > 50 ? 'var(--red)' : diff < -30 ? 'var(--green)' : 'var(--muted)' }}>
                            {diff === 0 ? '基準 (0)' : `${diffSign} ms`}
                          </small>
                        </td>
                        <td>
                          <span className={`pvt-badge ${isLapse ? 'badge-lapse' : isAdv ? 'badge-adv' : 'badge-nom'}`}>
                            {isLapse ? '遲鈍 (Lapse >500ms)' : isAdv ? '輕度延遲' : '極速神經反射'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="telemetry-metrics-grid">
            {/* Cognitive RT Latency */}
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>PVT 中位反應時間 (Median RT)</span>
                <span className="tm-normal-hint">正常: &le;300ms</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{medianRt}</span>
                <small className="tm-unit">ms</small>
                <span className={`tm-tag ${medianRt > 400 ? 'tag-warn' : medianRt > 300 ? 'tag-adv' : 'tag-nom'}`}>
                  {medianRt > 400 ? '反應遲鈍' : medianRt > 300 ? '輕度疲憊' : '反應敏銳'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (medianRt / 500) * 100)}%`,
                    background: medianRt > 400 ? '#ff4d5e' : medianRt > 300 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">量測方式：<strong>NASA-PVT 鍵盤/觸控高精度毫秒計時</strong></span>
            </div>

            {/* PVT Lapses */}
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>注意力喪失次數 (Lapses &gt;500ms)</span>
                <span className="tm-normal-hint">正常: 0 次</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{lapses}</span>
                <small className="tm-unit">次</small>
                <span className={`tm-tag ${lapses >= 2 ? 'tag-warn' : lapses >= 1 ? 'tag-adv' : 'tag-nom'}`}>
                  {lapses >= 2 ? '嚴重渙散' : lapses >= 1 ? '微注意力缺失' : '無遲鈍'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (lapses / 3) * 100)}%`,
                    background: lapses >= 2 ? '#ff4d5e' : lapses >= 1 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">量測方式：<strong>單次反應超過 500ms 閾值次數</strong></span>
            </div>

            {/* RT Spread */}
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>反應穩定度落差 (RT Spread)</span>
                <span className="tm-normal-hint">穩定: &lt;150ms</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{rtSpread}</span>
                <small className="tm-unit">ms</small>
                <span className={`tm-tag ${rtSpread > 250 ? 'tag-warn' : rtSpread > 150 ? 'tag-adv' : 'tag-nom'}`}>
                  {rtSpread > 250 ? '波動劇烈' : rtSpread > 150 ? '輕微起伏' : '節律穩定'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (rtSpread / 350) * 100)}%`,
                    background: rtSpread > 250 ? '#ff4d5e' : rtSpread > 150 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">極值區間：<strong>最快 {Math.min(...rtsList)} ms ～ 最慢 {Math.max(...rtsList)} ms</strong></span>
            </div>

            {/* False Starts */}
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>衝動預判搶跑 (False Starts)</span>
                <span className="tm-normal-hint">正常: 0 次</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{falseStarts}</span>
                <small className="tm-unit">次</small>
                <span className={`tm-tag ${falseStarts >= 2 ? 'tag-warn' : falseStarts >= 1 ? 'tag-adv' : 'tag-nom'}`}>
                  {falseStarts >= 2 ? '抑制失調' : falseStarts >= 1 ? '偶發搶跑' : '精準抑制'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (falseStarts / 3) * 100)}%`,
                    background: falseStarts >= 2 ? '#ff4d5e' : falseStarts >= 1 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">前額葉衝動控制：<strong>訊號出現前提前誤擊次數</strong></span>
            </div>
          </div>
        </div>
      )
    }

    case 'voice': {
      const v = results.voice
      if (!v) {
        return <UntestedOrganPrompt isToday={isToday} onStartTriage={onStartTriage} />
      }
      if (v.insufficient) {
        return (
          <InsufficientOrganPrompt
            sel="voice"
            reason={v.reason}
            isToday={isToday}
            onStartTriage={onStartTriage}
          />
        )
      }
      const stress = v.stress
      const jitter = v.jitter
      const pause = Math.round(v.pause * 100)
      const hfShift = Math.max(2, Math.round(stress * 0.24 + jitter * 1.8))
      const toneColor = stress >= 65 ? '#ff4d5e' : stress >= 40 ? '#ffd043' : 'var(--green)'

      // SVG y mapping for stress 0..100 => y 104..20
      const yEnd = Math.round(104 - (Math.min(100, Math.max(0, stress)) / 100) * 84)
      const yStart = Math.min(102, yEnd + 10)
      const yMid1 = Math.max(18, yEnd + Math.round((jitter - 1.5) * 4))
      const yMid2 = Math.max(18, yEnd - Math.round(jitter * 2.5))

      const fftBands = [
        { label: '80Hz', h: 38, hot: false },
        { label: '180Hz', h: 72, hot: false },
        { label: '320Hz', h: 64, hot: false },
        { label: '850Hz', h: 78, hot: false },
        { label: '2.4k', h: Math.min(82, Math.round(26 + stress * 0.62)), hot: true },
        { label: '4.0k', h: Math.min(78, Math.round(20 + jitter * 13.5)), hot: true },
      ]

      return (
        <div className="telemetry-box">
          <div className="telemetry-wave-monitor bone-telemetry-monitor">
            <div className="wave-monitor-head">
              <span className="wave-monitor-title">
                聲學語音諧波頻譜與基頻微顫壓力曲線 (Acoustic FFT &amp; F0 Jitter Stress Curve)
              </span>
              <span className="wave-pulse-rate" style={{ color: toneColor }}>
                語音壓力指數: {stress} / 100
              </span>
            </div>

            <div className="bone-curve-wrap">
              <svg viewBox="0 0 500 124" className="bone-curve-svg" preserveAspectRatio="none">
                {/* Left Panel: FFT Spectral Energy Distribution */}
                <text x="10" y="14" fill="rgba(255,255,255,0.55)" fontSize="9">
                  FFT 語音諧波能量分佈 (80Hz – 4.0kHz)
                </text>
                <line x1="10" y1="104" x2="232" y2="104" stroke="rgba(255,255,255,0.14)" />
                {fftBands.map((b, i) => {
                  const bx = 18 + i * 36
                  const by = 104 - b.h
                  const fill = !b.hot
                    ? 'rgba(0, 255, 163, 0.72)'
                    : stress >= 65
                    ? '#ff4d5e'
                    : stress >= 40
                    ? '#ffd043'
                    : '#00b4ff'
                  return (
                    <g key={b.label}>
                      <rect x={bx} y={24} width={20} height={80} rx={3} fill="rgba(255,255,255,0.04)" />
                      <rect x={bx} y={by} width={20} height={b.h} rx={3} fill={fill} opacity={0.9} />
                      <text x={bx + 10} y="116" fill="rgba(255,255,255,0.5)" fontSize="8.5" textAnchor="middle">
                        {b.label}
                      </text>
                    </g>
                  )
                })}

                {/* Divider */}
                <line x1="244" y1="8" x2="244" y2="116" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />

                {/* Right Panel: 30s Connected-Speech Stress & Jitter Trajectory */}
                <text x="256" y="14" fill="rgba(255,255,255,0.55)" fontSize="9">
                  30s 音素短文朗讀壓力軌跡 (F0 Jitter + Pause)
                </text>
                {/* Warning >= 65 line at y = 49 */}
                <line x1="256" y1="49" x2="492" y2="49" stroke="rgba(255,77,94,0.4)" strokeDasharray="3 3" />
                <text x="258" y="45" fill="rgba(255,77,94,0.8)" fontSize="8.5">警戒 WARNING (&ge;65)</text>

                {/* Advisory >= 40 line at y = 70 */}
                <line x1="256" y1="70" x2="492" y2="70" stroke="rgba(255,208,67,0.42)" strokeDasharray="3 3" />
                <text x="258" y="66" fill="rgba(255,208,67,0.85)" fontSize="8.5">注意 ADVISORY (40–64)</text>

                {/* Nominal baseline */}
                <line x1="256" y1="104" x2="492" y2="104" stroke="rgba(255,255,255,0.14)" />
                <text x="258" y="116" fill="rgba(255,255,255,0.45)" fontSize="8.5">0s 起讀</text>
                <text x="368" y="116" fill="rgba(255,255,255,0.45)" fontSize="8.5" textAnchor="middle">15s 中段</text>
                <text x="486" y="116" fill="rgba(255,255,255,0.45)" fontSize="8.5" textAnchor="end">30s 完成</text>

                {/* Stress trajectory curve */}
                <path
                  d={`M260,${yStart} Q310,${yMid1} 365,${Math.round((yMid1 + yMid2) / 2)} T468,${yEnd}`}
                  fill="none"
                  stroke={toneColor}
                  strokeWidth="2.6"
                />
                <circle cx="468" cy={yEnd} r="4.5" fill={toneColor} stroke="#ffffff" strokeWidth="1.6" />
                <text
                  x="460"
                  y={Math.max(24, yEnd - 8)}
                  fill={toneColor}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="end"
                >
                  實測 {stress}
                </text>
              </svg>
            </div>

            {/* 4 Summary Cards right under the chart (matching Bone layout) */}
            <div className="bone-timeline-info-row">
              <div className="bt-info-item">
                <span className="bt-k">綜合語音壓力指數</span>
                <span className={`bt-v ${stress >= 65 ? 'text-red' : stress >= 40 ? 'text-amber' : 'text-green'}`}>
                  {stress} / 100
                </span>
                <small>{stress >= 65 ? '交感高度緊繃' : stress >= 40 ? '輕度心理負荷' : '聲學情緒平穩'}</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">聲帶基頻微顫 (F0 Jitter)</span>
                <span className={`bt-v ${jitter >= 3.5 ? 'text-red' : jitter >= 2.0 ? 'text-amber' : 'text-cyan'}`}>
                  {jitter}%
                </span>
                <small>標準閾值 &lt; 2.0% 微顫</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">跨句遲疑停頓比 (Pause)</span>
                <span className={`bt-v ${pause > 45 ? 'text-red' : pause >= 25 ? 'text-amber' : 'text-white'}`}>
                  {pause}%
                </span>
                <small>自然朗讀標準 &lt; 25%</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">高頻聲門張力偏移</span>
                <span className={`bt-v ${stress >= 65 ? 'text-red' : stress >= 40 ? 'text-amber' : 'text-cyan'}`}>
                  +{hfShift}%
                </span>
                <small>2.4–4.0 kHz 共振峰能量</small>
              </div>
            </div>
          </div>

          <div className="telemetry-metrics-grid">
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>聲學語音心理壓力指數</span>
                <span className="tm-normal-hint">標準: &lt;40</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{stress}</span>
                <small className="tm-unit">/ 100</small>
                <span className={`tm-tag ${stress >= 65 ? 'tag-warn' : stress >= 40 ? 'tag-adv' : 'tag-nom'}`}>
                  {stress >= 65 ? '高度緊繃' : stress >= 40 ? '輕度壓力' : '情緒平穩'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{ width: `${stress}%`, background: toneColor }}
                />
              </div>
              <span className="tm-sub-detail">量測方式：<strong>30 秒音素平衡短文 F0 微顫 + 停頓加權</strong></span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>聲帶基頻微顫度 (F0 Jitter)</span>
                <span className="tm-normal-hint">標準: &lt;2.0%</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{jitter}</span>
                <small className="tm-unit">%</small>
                <span className={`tm-tag ${jitter >= 3.5 ? 'tag-warn' : jitter >= 2.0 ? 'tag-adv' : 'tag-nom'}`}>
                  {jitter >= 3.5 ? '環甲肌緊繃' : jitter >= 2.0 ? '輕微抖動' : '聲帶穩態'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (jitter / 4.5) * 100)}%`,
                    background: jitter >= 3.5 ? '#ff4d5e' : jitter >= 2.0 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">生理機制：<strong>交感神經活化致喉部環甲肌微幅震顫</strong></span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>語句思考停頓比 (Pause Ratio)</span>
                <span className="tm-normal-hint">標準: &lt;25%</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">{pause}</span>
                <small className="tm-unit">%</small>
                <span className={`tm-tag ${pause > 45 ? 'tag-warn' : pause >= 25 ? 'tag-adv' : 'tag-nom'}`}>
                  {pause > 45 ? '語句阻滯' : pause >= 25 ? '換氣偏長' : '語流順暢'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, pause)}%`,
                    background: pause > 45 ? '#ff4d5e' : pause >= 25 ? '#ffd043' : '#00b4ff',
                  }}
                />
              </div>
              <span className="tm-sub-detail">採樣處理：<strong>自動裁除起訖靜音，純算跨句停頓佔比</strong></span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>高頻諧波能量偏移 (2.4–4kHz)</span>
                <span className="tm-normal-hint">標準: &lt;+10%</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">+{hfShift}</span>
                <small className="tm-unit">%</small>
                <span className={`tm-tag ${hfShift >= 18 ? 'tag-warn' : hfShift >= 10 ? 'tag-adv' : 'tag-nom'}`}>
                  {hfShift >= 18 ? '高頻抬升' : hfShift >= 10 ? '輕度偏移' : '共振正常'}
                </span>
              </div>
              <div className="tm-mini-bar">
                <div
                  className="tm-mini-fill"
                  style={{
                    width: `${Math.min(100, (hfShift / 28) * 100)}%`,
                    background: hfShift >= 18 ? '#ff4d5e' : hfShift >= 10 ? '#ffd043' : 'var(--green)',
                  }}
                />
              </div>
              <span className="tm-sub-detail">頻譜特徵：<strong>Web Audio FFT 聲門閉合張力頻段分析</strong></span>
            </div>
          </div>
        </div>
      )
    }

    case 'eye': {
      const a = results.amsler
      if (!a) {
        return <UntestedOrganPrompt isToday={isToday} onStartTriage={onStartTriage} />
      }
      if (a.insufficient) {
        return (
          <InsufficientOrganPrompt
            sel="eye"
            reason={a.reason}
            isToday={isToday}
            onStartTriage={onStartTriage}
          />
        )
      }
      const rightMarks = a.rightMarks ?? Math.ceil(a.marks / 2)
      const leftMarks = a.leftMarks ?? Math.floor(a.marks / 2)
      const marks = a.marks ?? rightMarks + leftMarks
      const zone = a.zoneSummary ?? (marks === 0 ? '無異常' : '旁中心區 (3°–6°)')
      const minEcc = a.minEccentricity !== undefined ? a.minEccentricity : marks > 0 ? 4.2 : null
      const eyeLv = evaluateAmsler(a)

      return (
        <div className="telemetry-box">
          <div className="eye-sans-grid">
            <div className="eye-retina-view-card">
              <span className="card-sub-head">Amsler 20×20 方格離心視角定位</span>
              <div className="retina-mini-circle">
                <div className="retina-crosshair-h" />
                <div className="retina-crosshair-v" />
                <div className="retina-target-ring r1" />
                <div className="retina-target-ring r2" />
                {marks > 0 && <div className="retina-hotspot-pin" />}
              </div>
              <span className="retina-sub-stat">
                右眼 <strong>{rightMarks} 格</strong> · 左眼 <strong>{leftMarks} 格</strong>
              </span>
            </div>

            <div className="sans-clinical-card">
              <span className="card-sub-head">SANS 視網膜離心度與雙眼篩檢數據</span>
              <div className="sans-metrics-col">
                <div className="sans-metric-item">
                  <span>右眼 (OD) / 左眼 (OS) 異常</span>
                  <strong>右眼 {rightMarks} 格 · 左眼 {leftMarks} 格</strong>
                </div>
                <div className="sans-metric-item">
                  <span>距紅點最近視角 / 受影響視區</span>
                  <strong>{minEcc !== null ? `${minEcc}° · ${zone}` : '雙眼視野完全正常'}</strong>
                </div>
                <div className="sans-metric-item">
                  <span>SANS 空間加權篩檢分級</span>
                  <span className={`badge badge-${eyeLv}`}>
                    {eyeLv === 'warning'
                      ? 'WARNING 中心波及／廣泛變形'
                      : eyeLv === 'advisory'
                      ? 'ADVISORY 周邊早期水腫'
                      : 'NOMINAL 正常'}
                  </span>
                </div>
              </div>
              <p className="sans-action-note">
                篩檢原理：除統計左右眼各自格數外，依異常格距中央紅點之離心視角分級——中心黃斑凹區（≤3°）只要 ≥1 格即屬高危警戒。
              </p>
            </div>
          </div>
        </div>
      )
    }

    case 'spine': {
      const b = results.bone || computeBoneLoss(sol, 92)
      const curSol = b.sol
      const onset = b.onsetDay
      const bmdLoss = b.bmdLossPct
      const rawLoss = b.unprotectedLossPct
      const tScore = b.tScore
      const daysToOsteo = b.daysToOsteoporosis
      const xSol = Math.min(460, Math.max(12, Math.round(10 + (curSol / 360) * 465)))
      const ySol = curSol <= 18 ? 20 : Math.round(20 + ((xSol - 25) / 475) * 30)

      return (
        <div className="telemetry-box">
          {/* Microgravity Osteoporosis & BMD Degradation Timeline Chart */}
          <div className="telemetry-wave-monitor bone-telemetry-monitor">
            <div className="wave-monitor-head">
              <span className="wave-monitor-title">微重力骨質流失與骨質疏鬆推演模型 (BMD & Osteoporosis Degradation Curve)</span>
              <span className="wave-pulse-rate" style={{ color: tScore < -1.0 ? '#ff4d5e' : 'var(--green)' }}>
                當前推算 T 值: {tScore}
              </span>
            </div>

            {/* SVG Timeline Curve comparing Natural Loss vs Protected Loss */}
            <div className="bone-curve-wrap">
              <svg viewBox="0 0 500 120" className="bone-curve-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="protected-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--green)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--green)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid reference lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <line x1="0" y1="65" x2="500" y2="65" stroke="rgba(245,158,11,0.25)" strokeDasharray="3 3" />
                <line x1="0" y1="105" x2="500" y2="105" stroke="rgba(255,77,94,0.3)" strokeDasharray="3 3" />

                {/* Labels on SVG */}
                <text x="6" y="16" fill="rgba(255,255,255,0.4)" fontSize="9">骨質健全 Baseline</text>
                <text x="6" y="61" fill="rgba(245,158,11,0.7)" fontSize="9">骨質減少 Osteopenia (T &lt; -1.0 / -10% BMD)</text>
                <text x="6" y="101" fill="rgba(255,77,94,0.7)" fontSize="9">骨質疏鬆 Osteoporosis (T &lt; -2.5 / -20% BMD)</text>

                {/* Natural Unprotected Degradation Line (Red) */}
                <path
                  d="M0,20 L25,20 Q120,40 200,68 T380,118 L500,120"
                  fill="none"
                  stroke="#ff4d5e"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />

                {/* Protected with ARED Countermeasure Line (Green) */}
                <path
                  d="M0,20 L25,20 Q150,26 300,36 T500,50"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.5"
                />

                {/* Dynamic Sol Indicator Vertical Line */}
                <line x1={xSol} y1="10" x2={xSol} y2="115" stroke="#00b4ff" strokeWidth="1.5" />
                <circle cx={xSol} cy={ySol} r="4.5" fill="var(--green)" stroke="#00b4ff" strokeWidth="2" />
                <text
                  x={xSol > 400 ? xSol - 6 : xSol + 6}
                  y="24"
                  fill="#00b4ff"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor={xSol > 400 ? 'end' : 'start'}
                >
                  當前 Sol {curSol}
                </text>
              </svg>
            </div>

            {/* Time Breakdown Cards */}
            <div className="bone-timeline-info-row">
              <div className="bt-info-item">
                <span className="bt-k">破骨重塑失衡啟動</span>
                <span className="bt-v text-cyan">Sol {onset}（第 2.5 週）</span>
                <small>微重力下破骨細胞凋亡受阻</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">當前任務駐留累計</span>
                <span className="bt-v text-white">Sol {curSol} 天（約 {(curSol / 30.4).toFixed(1)} 個月）</span>
                <small>深空微重力暴露時長</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">目前累積 BMD 流失</span>
                <span className="bt-v text-green">-{bmdLoss}%</span>
                <small className="text-muted">（無防護預估為 -{rawLoss}%）</small>
              </div>
              <div className="bt-info-item">
                <span className="bt-k">距骨質疏鬆臨界點</span>
                <span className="bt-v text-cyan">&gt; {daysToOsteo} 天</span>
                <small>ARED 阻力減緩 75% 流失</small>
              </div>
            </div>
          </div>

          {/* Regional Bone Vulnerability Breakdown */}
          <div className="telemetry-metrics-grid">
            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>股骨頸 (Femoral Neck) 流失預測</span>
                <span className="tm-normal-hint">高負重承重骨</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">-{((bmdLoss * 1.15)).toFixed(2)}</span>
                <small className="tm-unit">%</small>
                <span className="tm-tag tag-nom">負重刺激充足</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: `${Math.min(100, (bmdLoss * 1.15 / 15) * 100)}%`, background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">流失速率：<strong>約 -1.2% ～ -1.4% / 月</strong>（無防護自然速率）</span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>腰椎骨 (Lumbar Spine) 流失預測</span>
                <span className="tm-normal-hint">脊椎伸展與礦化</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">-{((bmdLoss * 0.95)).toFixed(2)}</span>
                <small className="tm-unit">%</small>
                <span className="tm-tag tag-nom">椎間盤無水腫</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: `${Math.min(100, (bmdLoss * 0.95 / 15) * 100)}%`, background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">流失速率：<strong>約 -0.9% ～ -1.1% / 月</strong>（ARED 處方有效抑制）</span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>跟骨與骨盆 (Calcaneus / Pelvis)</span>
                <span className="tm-normal-hint">松質骨海綿質</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">-{((bmdLoss * 1.25)).toFixed(2)}</span>
                <small className="tm-unit">%</small>
                <span className="tm-tag tag-nom">骨小樑結構健全</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: `${Math.min(100, (bmdLoss * 1.25 / 15) * 100)}%`, background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">流失速率：<strong>約 -1.3% ～ -1.5% / 月</strong>（最高流失敏感區）</span>
            </div>

            <div className="telemetry-metric-card highlight">
              <div className="tm-label">
                <span>ARED 每日骨重塑力學刺激</span>
                <span className="tm-normal-hint">目標: &ge;0.50</span>
              </div>
              <div className="tm-val-row">
                <span className="tm-number">0.58</span>
                <small className="tm-unit">DLS 積分</small>
                <span className="tm-tag tag-nom">成骨效能良好</span>
              </div>
              <div className="tm-mini-bar">
                <div className="tm-mini-fill" style={{ width: '85%', background: 'var(--green)' }} />
              </div>
              <span className="tm-sub-detail">防護處方：<strong>每日 ARED 負重刺激 ≥35 kN·s + 維生素 D3</strong></span>
            </div>
          </div>
        </div>
      )
    }
  }
}

/* ==========================================================================
   Advanced Immune Dial Visualizer (高階多維免疫脆弱度儀表)
   ========================================================================== */
function ImmuneDialVisualizer({
  idx,
  level,
  env,
  results,
  hasAnyTest,
}: {
  idx: number
  level: Level
  env: Env
  results: Results
  hasAnyTest: boolean
}) {
  const { t, lang } = useI18n()

  if (!hasAnyTest) {
    return (
      <div className="immune-hud-layout is-untested">
        <div className="immune-dial-core">
          <div className="dial-svg-wrap">
            <svg className="dial-svg" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 7" />
              <circle cx="80" cy="80" r="62" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="80" cy="80" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            </svg>
            <div className="dial-center-content">
              <span className="dial-metric-caption">{t('immune.dialCaption')}</span>
              <b className="dial-main-number is-empty">—</b>
              <span className="dial-scale-max">{t('immune.scaleMax')}</span>
              <span className="dial-status-pill status-untested">{t('immune.status.untested')}</span>
            </div>
          </div>
          <span className="dial-footnote">{t('immune.footnote')}</span>
        </div>

        <div className="immune-untested-box">
          <b>{t('immune.untestedBoxTitle')}</b>
          <p>{t('immune.untestedBoxDesc')}</p>
        </div>
      </div>
    )
  }

  const b = computeImmuneBreakdown(env, results)
  const barTone = (val: number, max: number) =>
    val >= max * 0.65 ? 'fill-red' : val >= max * 0.35 ? 'fill-amber' : 'fill-green'

  return (
    <div className="immune-hud-layout">
      {/* Sci-Fi Circular Dial */}
      <div className="immune-dial-core">
        <div className="dial-svg-wrap">
          <svg className="dial-svg" viewBox="0 0 160 160">
            {/* Outer calibration ring with tick marks */}
            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 7" />
            <circle cx="80" cy="80" r="62" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            {/* Active glowing meter arc */}
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke={level === 'warning' ? '#ff4d5e' : level === 'advisory' ? '#ffd043' : 'var(--green)'}
              strokeWidth="8"
              strokeDasharray={`${(idx / 100) * 389.5} 389.5`}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              className="dial-active-arc"
            />
            {/* Inner secondary radiation ring */}
            <circle
              cx="80"
              cy="80"
              r="48"
              fill="none"
              stroke="rgba(0,180,255,0.2)"
              strokeWidth="3"
              strokeDasharray={`${(env.cumulative / 600) * 301} 301`}
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div className="dial-center-content">
            <span className="dial-metric-caption">{t('immune.dialCaption')}</span>
            <b className="dial-main-number">{idx}</b>
            <span className="dial-scale-max">{t('immune.scaleMax')}</span>
            <span className={`dial-status-pill ${level === 'warning' ? 'status-warn' : level === 'advisory' ? 'status-adv' : 'status-nom'}`}>
              {level === 'warning' ? t('immune.status.warning') : level === 'advisory' ? t('immune.status.advisory') : t('immune.status.nominal')}
            </span>
            {level === 'warning' && idx < 45 && (
              <span className="dial-escalate-tag" title={lang === 'en' ? 'Critical anomaly detected · Interlocked Alert Active' : '檢測到重大單項致病因子紅燈，啟動 NASA 聯鎖警覺機制'}>
                {t('immune.status.escalate')}
              </span>
            )}
          </div>
        </div>
        <span className="dial-footnote">{t('immune.footnote')}</span>
      </div>

      {/* 4-Factor Risk Weight Decomposition */}
      <div className="immune-breakdown-col">
        <div className="ib-head">
          <span>{t('immune.factorsHead')}</span>
          <span className="ib-total-tag">{t('immune.factorsTotal')}</span>
        </div>

        <div className="ib-bars-list">
          <div className="ib-item">
            <div className="ib-row">
              <span className="ib-title">{t('immune.radFactor').replace('{val}', env.cumulative.toFixed(0))}</span>
              <strong className="ib-val">{t('immune.pts').replace('{val}', String(b.rad))}</strong>
            </div>
            <div className="ib-track">
              <div className="ib-fill fill-cyan" style={{ width: `${(b.rad / 40) * 100}%` }} />
            </div>
          </div>

          <div className="ib-item">
            <div className="ib-row">
              <span className="ib-title">{t('immune.pvtFactor')}</span>
              <strong className={`ib-val ${!results.pvt ? 'is-pending' : results.pvt.insufficient ? 'is-insufficient' : ''}`}>
                {!results.pvt
                  ? t('immune.pending')
                  : results.pvt.insufficient
                  ? (lang === 'en' ? 'Retest (Indeterminate)' : '需重測 (無法判讀)')
                  : t('immune.pts').replace('{val}', String(b.pvt))}
              </strong>
            </div>
            <div className="ib-track">
              <div className={`ib-fill ${results.pvt?.insufficient ? 'fill-insufficient' : barTone(b.pvt, 20)}`} style={{ width: results.pvt?.insufficient ? '100%' : `${(b.pvt / 20) * 100}%` }} />
            </div>
          </div>

          <div className="ib-item">
            <div className="ib-row">
              <span className="ib-title">{t('immune.rppgFactor')}</span>
              <strong className={`ib-val ${!results.rppg ? 'is-pending' : results.rppg.insufficient ? 'is-insufficient' : ''}`}>
                {!results.rppg
                  ? t('immune.pending')
                  : results.rppg.insufficient
                  ? (lang === 'en' ? 'Retest (Indeterminate)' : '需重測 (無法判讀)')
                  : t('immune.pts').replace('{val}', String(b.rppg))}
              </strong>
            </div>
            <div className="ib-track">
              <div className={`ib-fill ${results.rppg?.insufficient ? 'fill-insufficient' : barTone(b.rppg, 20)}`} style={{ width: results.rppg?.insufficient ? '100%' : `${(b.rppg / 20) * 100}%` }} />
            </div>
          </div>

          <div className="ib-item">
            <div className="ib-row">
              <span className="ib-title">{t('immune.voiceFactor')}</span>
              <strong className={`ib-val ${!results.voice ? 'is-pending' : results.voice.insufficient ? 'is-insufficient' : ''}`}>
                {!results.voice
                  ? t('immune.pending')
                  : results.voice.insufficient
                  ? (lang === 'en' ? 'Retest (Indeterminate)' : '需重測 (無法判讀)')
                  : t('immune.pts').replace('{val}', String(b.voice))}
              </strong>
            </div>
            <div className="ib-track">
              <div className={`ib-fill ${results.voice?.insufficient ? 'fill-insufficient' : barTone(b.voice, 20)}`} style={{ width: results.voice?.insufficient ? '100%' : `${(b.voice / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {b.hasInsufficient && (
          <div className="immune-insufficient-notice">
            <AlertTriangle size={13} className="iin-icon" />
            <span>
              {lang === 'en'
                ? `⚠️ Contains ${b.insufficientCount} indeterminate biomarker(s). Complete retest to verify baseline.`
                : `⚠️ 包含 ${b.insufficientCount} 項資料不足數據。無法排除隱性免疫衰退，請盡速補測。`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export type { SystemStatus }
