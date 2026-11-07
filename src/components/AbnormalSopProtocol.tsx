import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  RotateCcw,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Heart,
  Brain,
  Eye,
  Mic,
  Info,
  Lock,
} from 'lucide-react'
import {
  evaluate,
  immuneIndex,
  type SystemStatus,
} from '../lib/engine'
import { formatShortDate, missionDay, dateKey } from '../lib/missionHistory'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

export interface AbnormalSopProtocolProps {
  env: Env
  results: Results
  date?: Date
  isToday?: boolean
  onRetest?: (testKey: 'pvt' | 'amsler' | 'rppg' | 'voice') => void
  compact?: boolean
}

export interface StoredSymptomLog {
  date: string
  symptoms: string[]
  notes: string
  savedAt: string
  isPriorityLocked?: boolean
  doctorNotified?: boolean
}

const SYMPTOM_OPTIONS = [
  {
    id: 'dizziness',
    icon: '💫',
    zh: '頭暈／輕微眩暈感 (Dizziness / Vertigo)',
    en: 'Dizziness / Mild Vertigo',
    category: 'cardio-neuro',
  },
  {
    id: 'vision_blur',
    icon: '👁️',
    zh: '視力模糊／視野扭曲變形 (Blurred Vision / Grid Distortion)',
    en: 'Blurred Vision / Grid Distortion (SANS)',
    category: 'eye',
  },
  {
    id: 'chest_pressure',
    icon: '💓',
    zh: '胸悶／心悸／換氣微促 (Chest Tightness / Palpitations)',
    en: 'Chest Tightness / Palpitations / Mild Dyspnea',
    category: 'cardio',
  },
  {
    id: 'brain_fog',
    icon: '🧠',
    zh: '顯著嗜睡／注意力渙散／腦霧 (Severe Drowsiness / Brain Fog)',
    en: 'Severe Drowsiness / Brain Fog / Slowed Reaction',
    category: 'cognition',
  },
  {
    id: 'headache',
    icon: '🩸',
    zh: '頭部充血脹感／搏動性頭痛 (Cephalic Congestion / Headache)',
    en: 'Cephalic Fluid Shift / Throbbing Headache',
    category: 'neuro',
  },
  {
    id: 'sleep_deprived',
    icon: '🥱',
    zh: '昨夜睡眠中斷或品質不佳 (Sleep Disruption / Sleep Deprived)',
    en: 'Sleep Disrupted / Severe Sleep Deficit',
    category: 'rest',
  },
  {
    id: 'asymptomatic',
    icon: '🛡️',
    zh: '完全無自覺不適（純感測數據偏離） (Asymptomatic - Telemetry Only)',
    en: 'Completely Asymptomatic (Pure Telemetry Anomaly)',
    category: 'none',
  },
]

export default function AbnormalSopProtocol({
  env,
  results,
  date,
  isToday = true,
  onRetest,
  compact = false,
}: AbnormalSopProtocolProps) {
  const { lang, t } = useI18n()
  const [expanded, setExpanded] = useState(!compact)
  const [showBriefModal, setShowBriefModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeDate = date || new Date()
  const key = dateKey(activeDate)
  const storageKey = `aura_sop_symptoms_${key}`

  const [symptoms, setSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPriorityLocked, setIsPriorityLocked] = useState(false)

  // Load symptom log from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed: StoredSymptomLog = JSON.parse(raw)
        setSymptoms(parsed.symptoms || [])
        setNotes(parsed.notes || '')
        setSavedAt(parsed.savedAt || null)
        setIsPriorityLocked(Boolean(parsed.isPriorityLocked || parsed.doctorNotified))
      } else {
        setSymptoms([])
        setNotes('')
        setSavedAt(null)
        setIsPriorityLocked(false)
      }
    } catch {
      // fallback
    }
  }, [storageKey])

  // Save symptom log to localStorage
  const saveLog = (nextSymptoms: string[], nextNotes: string, nextLocked = isPriorityLocked) => {
    const timestamp = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const data: StoredSymptomLog = {
      date: key,
      symptoms: nextSymptoms,
      notes: nextNotes,
      savedAt: timestamp,
      isPriorityLocked: nextLocked,
      doctorNotified: nextLocked,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
      setSavedAt(timestamp)
    } catch {
      // ignore
    }
  }

  const toggleSymptom = (id: string) => {
    if (!isToday) return
    let next: string[]
    if (id === 'asymptomatic') {
      next = symptoms.includes('asymptomatic') ? [] : ['asymptomatic']
    } else {
      next = symptoms.filter((s) => s !== 'asymptomatic')
      if (next.includes(id)) {
        next = next.filter((s) => s !== id)
      } else {
        next.push(id)
      }
    }
    setSymptoms(next)
    saveLog(next, notes)
  }

  const handleNotesChange = (val: string) => {
    setNotes(val)
  }

  const handleNotesBlur = () => {
    saveLog(symptoms, notes)
  }

  const togglePriorityLock = () => {
    if (!isToday) return
    const next = !isPriorityLocked
    setIsPriorityLocked(next)
    saveLog(symptoms, notes, next)
  }

  const s: SystemStatus = evaluate(env, results)
  const sol = missionDay(activeDate)
  const shortDate = formatShortDate(activeDate)
  const ivi = immuneIndex(env, results)

  // Identify abnormal systems
  const abnormalSystems: {
    key: 'pvt' | 'amsler' | 'rppg' | 'voice'
    nameZh: string
    nameEn: string
    level: 'warning' | 'advisory'
    detailZh: string
    detailEn: string
  }[] = []

  if (results.pvt && !results.pvt.insufficient && (s.cognition === 'warning' || s.cognition === 'advisory')) {
    abnormalSystems.push({
      key: 'pvt',
      nameZh: '精神運動反應警覺 (NASA-PVT)',
      nameEn: 'Psychomotor Vigilance (PVT)',
      level: s.cognition as 'warning' | 'advisory',
      detailZh: `中位反應 ${results.pvt.median} ms · 失神 ${results.pvt.lapses} 次 · 搶跑 ${results.pvt.falseStarts} 次`,
      detailEn: `Median RT ${results.pvt.median} ms · Lapses ${results.pvt.lapses} · False starts ${results.pvt.falseStarts}`,
    })
  }

  if (results.amsler && !results.amsler.insufficient && (s.eye === 'warning' || s.eye === 'advisory')) {
    const rCnt = results.amsler.rightMarks ?? 0
    const lCnt = results.amsler.leftMarks ?? 0
    abnormalSystems.push({
      key: 'amsler',
      nameZh: 'SANS 視網膜黃斑視野 (Amsler)',
      nameEn: 'SANS Macular Grid (Amsler)',
      level: s.eye as 'warning' | 'advisory',
      detailZh: `右眼失真 ${rCnt} 格 · 左眼失真 ${lCnt} 格 · 最距中心 ${results.amsler.minEccentricity ?? '—'}°`,
      detailEn: `Right eye ${rCnt} cells · Left eye ${lCnt} cells · Eccentricity ${results.amsler.minEccentricity ?? '—'}°`,
    })
  }

  if (results.rppg && !results.rppg.insufficient && (s.cardio === 'warning' || s.cardio === 'advisory')) {
    abnormalSystems.push({
      key: 'rppg',
      nameZh: 'rPPG 視訊心率與 HRV (Cardio)',
      nameEn: 'rPPG Optical Cardio & HRV',
      level: s.cardio as 'warning' | 'advisory',
      detailZh: `靜止心率 ${results.rppg.bpm} BPM · HRV 心率變異度 ${results.rppg.hrv} ms`,
      detailEn: `Resting Heart Rate ${results.rppg.bpm} BPM · HRV ${results.rppg.hrv} ms`,
    })
  }

  if (results.voice && !results.voice.insufficient && (s.mind === 'warning' || s.mind === 'advisory')) {
    abnormalSystems.push({
      key: 'voice',
      nameZh: '聲學語音壓力與交感張力 (Voice)',
      nameEn: 'Acoustic Voice Stress & Jitter',
      level: s.mind as 'warning' | 'advisory',
      detailZh: `壓力指數 ${results.voice.stress}/100 · 聲帶微顫 ${results.voice.jitter}% · 停頓比 ${Math.round(results.voice.pause * 100)}%`,
      detailEn: `Stress Index ${results.voice.stress}/100 · Vocal Jitter ${results.voice.jitter}% · Pause ${Math.round(results.voice.pause * 100)}%`,
    })
  }

  const hasAbnormality = abnormalSystems.length > 0 || s.immune === 'warning' || s.immune === 'advisory'
  const hasWarning = abnormalSystems.some((a) => a.level === 'warning') || s.immune === 'warning'

  // Generate Flight Surgeon Brief Text
  const generateBriefText = () => {
    const lines = [
      `======================================================`,
      `【AURA-Space 深空遠距醫療會診摘要單 / Flight Surgeon Telemedicine Brief】`,
      `任務 Sol：Day ${sol} (${shortDate}) · 太空人代號：Astronaut AST-04`,
      `綜合免疫脆弱度 IVI：${ivi}/100 [${s.immune.toUpperCase()}]`,
      `艙內環境：CO₂ ${env.co2.toFixed(1)} mmHg · 艙壓 ${env.pressure.toFixed(1)} psi · 累積輻射 ${env.cumulative.toFixed(0)} mSv`,
      `------------------------------------------------------`,
      `【晨檢異常遙測指標 (Telemetry Anomalies)】:`,
    ]

    if (abnormalSystems.length === 0) {
      lines.push(`- 無核心單項指標異常（系統交叉防禦代償提醒）`)
    } else {
      abnormalSystems.forEach((ab) => {
        lines.push(`- [${ab.level.toUpperCase()}] ${ab.nameZh}: ${ab.detailZh}`)
      })
    }

    lines.push(`------------------------------------------------------`)
    lines.push(`【太空人自覺不適症狀 (Subjective Symptoms Recorded)】:`)
    if (symptoms.length === 0) {
      lines.push(`- 暫未勾選具體症狀`)
    } else {
      symptoms.forEach((symId) => {
        const item = SYMPTOM_OPTIONS.find((o) => o.id === symId)
        if (item) lines.push(`- ${item.zh}`)
      })
    }

    if (notes.trim()) {
      lines.push(`【自述主觀不適備註】: ${notes.trim()}`)
    }

    lines.push(`------------------------------------------------------`)
    lines.push(`【系統重點標記狀態】: ${isPriorityLocked ? '🔒 已鎖定為任務重點追蹤個案 (SYSTEM PRIORITY LOCKED)' : '未鎖定'}`)
    lines.push(`【臨床通報備書與處置決策】:`)
    lines.push(`1. 本單次異常已遵循 4 步驟 SOP 完成測試條件覆核。`)
    lines.push(`2. 自覺症狀與持續偏離達深空遠距醫療通報標準。`)
    lines.push(`3. 請地面飛行航醫 (Flight Surgeon) 評估是否調整活動行程或啟動二線處方。`)
    lines.push(`======================================================`)
    return lines.join('\n')
  }

  const handleCopyBrief = () => {
    const text = generateBriefText()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <section className={`sop-protocol-panel ${hasWarning ? 'is-warning-theme' : 'is-advisory-theme'}`}>
      {/* 1. Header with Clinical Endorsement Banner */}
      <div className="sop-header" onClick={() => setExpanded(!expanded)}>
        <div className="sop-header-title-row">
          <div className="sop-icon-badge">
            <ShieldAlert size={20} className="sop-icon" />
          </div>
          <div className="sop-title-col">
            <div className="sop-tagline">
              <span className="sop-pill-nasa">NASA HRP 臨床監護標準</span>
              <span className="sop-pill-rule">異常處置 4 階段 SOP 規範</span>
              {isPriorityLocked && (
                <span className="sop-locked-header-badge">
                  <Lock size={11} />
                  <span>{lang === 'en' ? 'System Priority: Locked' : '系統重點標記 · 已鎖定'}</span>
                </span>
              )}
            </div>
            <h4>
              {lang === 'en'
                ? 'Clinical Post-Anomaly Protocol & Diagnostic Boundary'
                : '異常處置標準流程 · 臨床背書與診斷邊界提醒'}
            </h4>
          </div>
        </div>
        <button
          type="button"
          className="sop-toggle-btn"
          aria-label={expanded ? '收合流程' : '展開流程'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* 2. Main Protocol Content */}
      {expanded && (
        <div className="sop-body">
          {/* Clinical Disclaimer & Endorsement */}
          <div className="sop-disclaimer-box">
            <div className="sdb-head">
              <Stethoscope size={16} />
              <strong>
                {lang === 'en'
                  ? 'Clinical Endorsement: Telemetry Anomaly ≠ Medical Diagnosis'
                  : '重要聲明與臨床背書：單次測試異常絕不等於確定性疾病診斷'}
              </strong>
            </div>
            <p className="sdb-desc">
              {lang === 'en'
                ? 'AURA-Space daily morning telemetry (PVT, Amsler, rPPG, Voice) serves as an autonomous operational risk screening tool in microgravity. Transient ambient light shifts, acoustic interference, eyelid fatigue, or momentary distraction can cause acute baseline deviations. Do not assume illness from a single reading. Strictly follow the 4-step protocol below to verify conditions, retest, and record symptoms before escalating to medical consultation.'
                : 'AURA-Space 日常晨檢數據（PVT 反應、Amsler 視野、rPPG 心率脈搏、語音微顫）定位為深空微重力環境的「自主作業風險篩檢與生理波動預警工具」，單次測試偏離絕不可直接理解為確定性臨床疾病診斷。太空環境下的光線雜訊、艙內風機噪聲、眨眼疲勞或瞬間注意力分散均可能造成單次數值偏移。請務必依循下列 4 步驟標準程序排除誤差、進行複測並記錄自覺不適；若異常持續，方依任務程序尋求醫療評估。'}
            </p>
          </div>

          {/* 4-Step SOP Cards Grid */}
          <div className="sop-steps-grid">
            {/* Step 1: Verify Conditions */}
            <div className="sop-step-card">
              <div className="ssc-header">
                <span className="ssc-num">01</span>
                <div>
                  <h5>{lang === 'en' ? 'Verify Test Conditions' : '先確認測試條件'}</h5>
                  <span className="ssc-sub">{lang === 'en' ? 'Eliminate external noise & artifacts' : '排除環境干擾與操作誤差'}</span>
                </div>
              </div>
              <ul className="ssc-checklist">
                <li>
                  <span className="ssc-dot" />
                  <span>{lang === 'en' ? 'Lighting: Face uniformly illuminated (≥300 Lux, no backlighting)' : '照明充足：面部均勻受光（≥300 Lux），無強烈陰影'}</span>
                </li>
                <li>
                  <span className="ssc-dot" />
                  <span>{lang === 'en' ? 'Distance: Keep screen 30–33 cm away, eye level with camera' : '凝視距離：螢幕維持 30–33 公分，雙眼正對中央'}</span>
                </li>
                <li>
                  <span className="ssc-dot" />
                  <span>{lang === 'en' ? 'Acoustics: Quiet cabin, speak naturally 15–20 cm from mic' : '聲學降噪：生活艙背景低於 55 dB，平穩自然發音'}</span>
                </li>
                <li>
                  <span className="ssc-dot" />
                  <span>{lang === 'en' ? 'Posture: Sit calm, 3 deep breaths, avoid post-exercise rush' : '平穩姿態：端坐深呼吸 3 次，避免劇烈運動後急測'}</span>
                </li>
              </ul>
            </div>

            {/* Step 2: Retest Verification */}
            <div className="sop-step-card">
              <div className="ssc-header">
                <span className="ssc-num">02</span>
                <div>
                  <h5>{lang === 'en' ? 'Retest / Re-measure' : '重新測驗排除誤差'}</h5>
                  <span className="ssc-sub">{lang === 'en' ? 'Rest 2–3 min to rule out transient swings' : '休息 2–3 分鐘深呼吸後重測'}</span>
                </div>
              </div>
              <p className="ssc-text">
                {lang === 'en'
                  ? 'Over 85% of acute single-session deviations are transient physiological fluctuations or sensor artifacts. Rest quietly for 2 minutes and execute a clean retest.'
                  : '深空醫學統計指出：超過 85% 之單次數值偏離為短暫生理浮動或偽陽性。深呼吸放鬆 2–3 分鐘後，針對異常項目進行二次重測即可有效排除干擾。'}
              </p>
              {abnormalSystems.length > 0 && onRetest && (
                <div className="ssc-retest-actions">
                  {abnormalSystems.map((ab) => (
                    <button
                      key={ab.key}
                      type="button"
                      className="btn-retest-chip"
                      onClick={() => onRetest(ab.key)}
                    >
                      <RotateCcw size={13} />
                      <span>{lang === 'en' ? `Retest ${ab.nameEn}` : `重新測試 ${ab.nameZh}`}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Log Subjective Symptoms */}
            <div className="sop-step-card ssc-full-col">
              <div className="ssc-header">
                <span className="ssc-num">03</span>
                <div>
                  <h5>{lang === 'en' ? 'Log Subjective Symptoms & Discomfort' : '記錄自覺不舒服的情況'}</h5>
                  <span className="ssc-sub">{lang === 'en' ? 'Differentiate asymptomatic swings from clinical illness' : '區分「純感測器數據偏離」與「真實病理徵兆」'}</span>
                </div>
                {savedAt && (
                  <span className="ssc-saved-badge">
                    <CheckCircle2 size={13} />
                    {lang === 'en' ? `Logged at ${savedAt}` : `已於今日 ${savedAt} 記錄`}
                  </span>
                )}
              </div>

              <div className="ssc-symptoms-wrap">
                <span className="ssc-label">
                  {lang === 'en'
                    ? 'Check any current discomfort symptoms (Click to toggle):'
                    : '請勾選您當前是否有任何主觀不適感覺（點擊勾選）：'}
                </span>
                <div className="ssc-symptom-chips">
                  {SYMPTOM_OPTIONS.map((opt) => {
                    const active = symptoms.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`symptom-chip ${active ? 'is-active' : ''} ${!isToday ? 'is-readonly' : ''}`}
                        onClick={() => toggleSymptom(opt.id)}
                        disabled={!isToday}
                      >
                        <span className="sym-icon">{opt.icon}</span>
                        <span className="sym-text">{lang === 'en' ? opt.en : opt.zh}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="ssc-notes-wrap">
                  <label htmlFor="sop-notes-input" className="ssc-label">
                    {lang === 'en'
                      ? 'Specific subjective notes (e.g. sleep duration, pressure headache, fatigue description):'
                      : '自覺不適補充備註（如：睡眠中斷、頭部微痛、艙壓警報影響或疲倦程度描述）：'}
                  </label>
                  <textarea
                    id="sop-notes-input"
                    className="sop-notes-textarea"
                    rows={2}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder={
                      lang === 'en'
                        ? 'Type any subjective observations here...'
                        : '在此輸入太空人主觀自覺感受，點擊框外自動儲存...'
                    }
                    disabled={!isToday}
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Medical Escalation if Persistent */}
            <div className="sop-step-card ssc-full-col ssc-escalate-card">
              <div className="ssc-header">
                <span className="ssc-num">04</span>
                <div>
                  <h5>{lang === 'en' ? 'Escalate to Medical Review if Persistent' : '如果持續異常，依任務程序尋求醫療評估'}</h5>
                  <span className="ssc-sub">{lang === 'en' ? 'Flight Surgeon Consultation & Autonomous Protocol' : '地面航醫會診與自主深空臨床指引'}</span>
                </div>
              </div>
              <div className="ssc-escalate-body">
                <div className="ssc-escalate-copy">
                  <p>
                    {lang === 'en'
                      ? 'Criteria for Medical Escalation: If abnormal readings persist across retests, occur on 2 consecutive mission days, or are accompanied by subjective discomfort symptoms above — DO NOT ignore. Immediately execute the deep-space medical telecommunications protocol.'
                      : '啟動醫療通報門檻：若「重測依然異常」、「連續 2 個 Sol 晨檢呈現同項異常」、或「伴隨上述任何自覺不適症狀」，不可單純依賴日常運動補品自主處置，應立即依深空任務通訊程序生成會診摘要通報地面飛行航醫 (Flight Surgeon) 或啟動自主臨床指南評估。'}
                  </p>
                </div>

                <div className="ssc-escalate-actions">
                  <button
                    type="button"
                    className="btn-sop-brief"
                    onClick={() => setShowBriefModal(true)}
                  >
                    <FileText size={15} />
                    <span>{lang === 'en' ? 'Open Flight Surgeon Consultation Brief' : '生成深空遠距醫療會診摘要單'}</span>
                  </button>

                  <button
                    type="button"
                    className={`btn-sop-lock-focus ${isPriorityLocked ? 'is-locked' : ''}`}
                    onClick={togglePriorityLock}
                    disabled={!isToday}
                    title={
                      isPriorityLocked
                        ? (lang === 'en' ? 'System Priority Marker: Locked (Click to unlock)' : '系統重點標記：已鎖定追蹤（點擊可解除鎖定）')
                        : (lang === 'en' ? 'Click to lock as System Priority Marker' : '點擊鎖定為系統重點標記')
                    }
                  >
                    <Lock size={15} className={`sop-lock-icon ${isPriorityLocked ? 'is-locked-anim' : ''}`} />
                    <span>
                      {isPriorityLocked
                        ? lang === 'en'
                          ? '🔒 System Priority Marker (Locked)'
                          : '🔒 系統重點標記（已鎖定）'
                        : lang === 'en'
                        ? 'System Priority Marker (Click to Lock)'
                        : '系統重點標記（點擊鎖定）'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Flight Surgeon Brief Modal */}
      {showBriefModal && (
        <div className="sop-brief-modal-backdrop" onClick={() => setShowBriefModal(false)}>
          <div className="sop-brief-modal" onClick={(e) => e.stopPropagation()}>
            <header className="sbm-header">
              <div className="sbm-header-title">
                <Stethoscope size={20} className="sbm-icon" />
                <div>
                  <h3>{lang === 'en' ? 'Flight Surgeon Telemedicine Brief' : '深空遠距醫療會診摘要單'}</h3>
                  <span>{lang === 'en' ? 'NASA HRP Standard Clinical Telemetry Package' : 'NASA HRP 標準航醫遙測與自覺症狀評估封包'}</span>
                </div>
              </div>
              <button
                type="button"
                className="sbm-close-btn"
                onClick={() => setShowBriefModal(false)}
              >
                ✕
              </button>
            </header>

            <div className="sbm-body">
              <div className="sbm-meta-grid">
                <div className="sbm-meta-item">
                  <span className="sbm-label">{lang === 'en' ? 'Astronaut' : '太空人'}</span>
                  <b>AST-04 (Commander)</b>
                </div>
                <div className="sbm-meta-item">
                  <span className="sbm-label">{lang === 'en' ? 'Mission Sol' : '任務天數'}</span>
                  <b>Sol {sol} ({shortDate})</b>
                </div>
                <div className="sbm-meta-item">
                  <span className="sbm-label">{lang === 'en' ? 'Immune Index (IVI)' : '綜合免疫脆弱度'}</span>
                  <b className={`ivi-${s.immune}`}>{ivi} / 100 ({s.immune.toUpperCase()})</b>
                </div>
                <div className="sbm-meta-item">
                  <span className="sbm-label">{lang === 'en' ? 'Cabin Environment' : '艙內環境'}</span>
                  <b>CO₂ {env.co2.toFixed(1)} mmHg · {env.cumulative.toFixed(0)} mSv</b>
                </div>
                <div className="sbm-meta-item">
                  <span className="sbm-label">{lang === 'en' ? 'System Focus Status' : '系統重點標記'}</span>
                  <b style={{ color: isPriorityLocked ? '#ffd043' : '#94a3b8' }}>
                    {isPriorityLocked
                      ? lang === 'en' ? '🔒 Locked Focus' : '🔒 已鎖定重點'
                      : lang === 'en' ? 'Unlocked' : '未鎖定'}
                  </b>
                </div>
              </div>

              <div className="sbm-section">
                <h4>{lang === 'en' ? '1. Telemetry Anomalies' : '一、晨檢遙測異常指標'}</h4>
                {abnormalSystems.length === 0 ? (
                  <p className="sbm-empty-text">{lang === 'en' ? 'No core biomarker anomalies. (Multi-system cross-vulnerability advisory)' : '無單項核心指標異常。（多系統交叉脆弱度代償注意）'}</p>
                ) : (
                  <ul className="sbm-list">
                    {abnormalSystems.map((ab) => (
                      <li key={ab.key} className={`sbm-item lv-${ab.level}`}>
                        <span className="sbm-item-badge">{ab.level.toUpperCase()}</span>
                        <div>
                          <strong>{lang === 'en' ? ab.nameEn : ab.nameZh}</strong>
                          <p>{lang === 'en' ? ab.detailEn : ab.detailZh}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="sbm-section">
                <h4>{lang === 'en' ? '2. Subjective Discomfort Reported' : '二、太空人自覺不適症狀紀錄'}</h4>
                {symptoms.length === 0 ? (
                  <p className="sbm-empty-text">{lang === 'en' ? 'No subjective symptoms checked.' : '未勾選主觀不適症狀。'}</p>
                ) : (
                  <div className="sbm-symptoms-tags">
                    {symptoms.map((symId) => {
                      const item = SYMPTOM_OPTIONS.find((o) => o.id === symId)
                      return (
                        <span key={symId} className="sbm-sym-tag">
                          {item ? (lang === 'en' ? `${item.icon} ${item.en}` : `${item.icon} ${item.zh}`) : symId}
                        </span>
                      )
                    })}
                  </div>
                )}
                {notes.trim() && (
                  <div className="sbm-notes-block">
                    <b>{lang === 'en' ? 'Astronaut Self-Report Notes:' : '自述主觀不適備註：'}</b>
                    <p>{notes.trim()}</p>
                  </div>
                )}
              </div>

              <div className="sbm-section">
                <h4>{lang === 'en' ? '3. Clinical Telecommunications Packet' : '三、深空延遲通訊純文字封包'}</h4>
                <pre className="sbm-raw-pre">{generateBriefText()}</pre>
              </div>
            </div>

            <footer className="sbm-footer">
              <button
                type="button"
                className={`btn-sbm-copy ${copied ? 'is-copied' : ''}`}
                onClick={handleCopyBrief}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? (lang === 'en' ? 'Copied to Clipboard!' : '已複製會診摘要至剪貼簿！') : (lang === 'en' ? 'Copy Telemedicine Brief' : '複製會診摘要文本')}</span>
              </button>
              <button
                type="button"
                className="btn-sbm-close"
                onClick={() => setShowBriefModal(false)}
              >
                {lang === 'en' ? 'Close' : '關閉視窗'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}
