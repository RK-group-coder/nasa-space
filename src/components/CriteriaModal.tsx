import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Lock,
  AlertTriangle,
  Stethoscope,
  BookOpen,
} from 'lucide-react'
import { CRITERIA, CRITERIA_ORDER, getCriteria, type Criterion } from '../data/criteriaData'
import { evaluate, immuneIndex } from '../lib/engine'
import { CriteriaContext, useCriteria } from '../lib/criteriaContext'
import { CriteriaChart } from './CriteriaCharts'
import BrandEmblem from './BrandEmblem'
import { computeBoneLoss } from '../lib/boneModel'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

const ORGAN_TO_CRITERIA_ID: Record<string, string> = {
  heart: 'rppg',
  brain: 'pvt',
  eye: 'amsler',
  voice: 'voice',
  spine: 'bone',
  bone: 'bone',
  squat: 'bone',
  skin: 'skin',
  immune: 'immune',
}

export function CriteriaProvider({
  children,
  canViewAnalytics = false,
}: {
  children: ReactNode
  canViewAnalytics?: boolean
}) {
  const [activeCriteriaId, setActiveCriteriaId] = useState<string | null>(null)

  const openCriteria = useCallback((id: string) => {
    setActiveCriteriaId(ORGAN_TO_CRITERIA_ID[id] || id)
  }, [])

  const closeCriteria = useCallback(() => {
    setActiveCriteriaId(null)
  }, [])

  return (
    <CriteriaContext.Provider
      value={{ openCriteria, closeCriteria, activeCriteriaId, canViewAnalytics }}
    >
      {children}
    </CriteriaContext.Provider>
  )
}

export function CriteriaModal({
  results,
  env,
  doneCount = 0,
  isToday = true,
  shortDate = '今日',
  sol = 67,
  inTriage = false,
  onStartTriage,
}: {
  results: Results
  env: Env
  doneCount?: number
  isToday?: boolean
  shortDate?: string
  sol?: number
  inTriage?: boolean
  onStartTriage?: () => void
}) {
  const { activeCriteriaId, closeCriteria, openCriteria, canViewAnalytics } = useCriteria()
  const { t, lang } = useI18n()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCriteria()
    }
    if (activeCriteriaId) {
      window.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [activeCriteriaId, closeCriteria])

  if (!activeCriteriaId) return null

  // Gate data analytics until all 4 daily tests of the day are completed
  if (!canViewAnalytics) {
    return createPortal(
      <div
        className="criteria-backdrop"
        onClick={closeCriteria}
        role="dialog"
        aria-modal="true"
        aria-labelledby="criteria-locked-title"
      >
        <div className="criteria-locked-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="criteria-close-btn locked-close"
            onClick={closeCriteria}
            aria-label="關閉視窗"
          >
            <X size={16} />
          </button>

          <div className="clm-emblem-wrap">
            <span className="clm-emblem-glow" />
            <div className="clm-emblem-medal">
              <BrandEmblem size={84} />
            </div>
            <span className="clm-lock-chip">
              <Lock size={12} />
            </span>
          </div>

          <span className="clm-eyebrow">AURA-SPACE · DATA ANALYTICS LOCKED</span>
          <h2 id="criteria-locked-title" className="clm-title">
            {isToday ? t('criteria.lockedTitle') : (lang === 'en' ? 'Tests incomplete for this Sol · Analytics locked' : '當日未完成全部測驗，無法查看數據解析')}
          </h2>
          <span className="clm-divider" />

          {isToday && (
            <span className="clm-progress-pill">
              {t('criteria.lockedProgress')}：{doneCount} / 4
            </span>
          )}

          <div className="clm-actions">
            {isToday && !inTriage && onStartTriage ? (
              <>
                <button
                  type="button"
                  className="btn-primary btn-untested clm-start-btn"
                  onClick={() => {
                    closeCriteria()
                    onStartTriage()
                  }}
                >
                  <AlertTriangle size={15} className="btn-warn-icon" />
                  <span>{t('criteria.lockedBtn')}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary clm-cancel-btn"
                  onClick={closeCriteria}
                >
                  {t('criteria.close')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary clm-ok-btn"
                onClick={closeCriteria}
              >
                {lang === 'en' ? 'Understood' : '我知道了'}
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  const criteriaDict = getCriteria(lang)
  const item: Criterion = criteriaDict[activeCriteriaId] || criteriaDict.rppg
  const s = evaluate(env, results)
  const currentImmune = immuneIndex(env, results)

  // Current level of the item
  let currentLevel = 'nominal'
  let currentValuesText = ''
  if (item.id === 'rppg') {
    currentLevel = s.cardio
    if (results.rppg) currentValuesText = `心率 ${results.rppg.bpm} BPM · HRV ${results.rppg.hrv} ms`
  } else if (item.id === 'pvt') {
    currentLevel = s.cognition
    if (results.pvt) currentValuesText = `中位反應 ${results.pvt.median} ms · 失誤 ${results.pvt.lapses} 次 · 搶跑 ${results.pvt.falseStarts} 次`
  } else if (item.id === 'amsler') {
    currentLevel = s.eye
    if (results.amsler) {
      const a = results.amsler
      const rCnt = a.rightMarks ?? 0
      const lCnt = a.leftMarks ?? 0
      const eccText = a.minEccentricity != null ? `最近距紅點 ${a.minEccentricity}° (${a.zoneSummary})` : (lang === 'en' ? 'Both eyes nominal' : '雙眼視野正常')
      currentValuesText = lang === 'en' ? `OD ${rCnt} · OS ${lCnt} · ${eccText}` : `右眼 ${rCnt} 格 · 左眼 ${lCnt} 格 · ${eccText}`
    }
  } else if (item.id === 'voice') {
    currentLevel = s.mind
    if (results.voice) currentValuesText = `壓力指數 ${results.voice.stress} /100 · Jitter ${results.voice.jitter}% · 停頓比 ${Math.round(results.voice.pause * 100)}%`
  } else if (item.id === 'bone' || item.id === 'squat') {
    currentLevel = s.bone
    const b = results.bone || computeBoneLoss(sol, 92)
    currentValuesText = `當前 Sol ${b.sol} · 推算 T值 ${b.tScore} · 累計流失 -${b.bmdLossPct}% (防護後) · 距骨質疏鬆 >${b.daysToOsteoporosis} 天`
  } else if (item.id === 'skin') {
    currentLevel = s.skin
    if (results.skin) currentValuesText = `紅斑面積 ${results.skin.rednessPct}%`
  } else if (item.id === 'immune') {
    currentLevel = s.immune
    if (results.pvt || results.amsler || results.rppg || results.voice) {
      currentValuesText = `綜合脆弱度 ${currentImmune} /100 · 累積輻射 ${env.cumulative.toFixed(0)} mSv`
    }
  }

  return createPortal(
    <div className="criteria-backdrop" onClick={closeCriteria} role="dialog" aria-modal="true" aria-labelledby="criteria-title">
      <div className="criteria-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="criteria-header">
          <div className="criteria-header-left">
            <span className="criteria-badge-num">{item.num}</span>
            <div>
              <h2 id="criteria-title" className="criteria-title">{item.title}</h2>
              <span className="criteria-sub">{item.organ} · {lang === 'en' ? 'Clinical Criteria & Telemetry' : '判讀標準與臨床指標'}</span>
            </div>
          </div>
          <button
            type="button"
            className="criteria-close-btn"
            onClick={closeCriteria}
            aria-label="關閉視窗"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="criteria-tabs" aria-label="測驗項目選擇">
          {CRITERIA_ORDER.map((id) => {
            const c = criteriaDict[id]
            const active = id === item.id
            return (
              <button
                key={id}
                type="button"
                className={`criteria-tab ${active ? 'active' : ''}`}
                onClick={() => openCriteria(id)}
              >
                <span>{c.num}</span> {c.shortName}
              </button>
            )
          })}
        </nav>

        {/* Body Content */}
        <div className="criteria-body">
          {/* Realtime measurement banner if tested */}
          {currentValuesText && (
            <div className={`criteria-live-banner lv-${currentLevel}`}>
              <div className="live-banner-icon">
                <Sparkles size={16} />
              </div>
              <div className="live-banner-content">
                <span className="live-banner-label">
                  {isToday ? '今日實測數據' : `${shortDate} 實測數據`}
                </span>
                <strong className="live-banner-val">{currentValuesText}</strong>
              </div>
              <span className={`badge badge-${currentLevel}`}>
                {currentLevel.toUpperCase()}
              </span>
            </div>
          )}

          {/* Section 1: Measured Metrics */}
          <section className="criteria-section">
            <h3 className="section-title">
              <Activity size={15} /> {lang === 'en' ? 'Core Biomarkers (Measured Metrics)' : '核心測量指標 (Measured Metrics)'}
            </h3>
            <div className="metrics-tags">
              {item.metrics.map((m, idx) => (
                <span key={idx} className="metric-tag">{m}</span>
              ))}
            </div>
          </section>

          {/* Section 2: Measurement Principle & Clinical Judgment Logic (檢測原理與判讀邏輯機制) */}
          {item.principle && (
            <section className="criteria-section criteria-principle-section">
              <h3 className="section-title">
                <BookOpen size={15} /> {lang === 'en' ? 'Measurement Principle & Clinical Judgment Logic' : '檢測原理與判讀邏輯機制 (Principles & Judgment Logic)'}
              </h3>
              <div className="principle-card">
                <div className="pc-headline">
                  <Sparkles size={14} className="pc-sparkle" />
                  <span>{item.principle.headline}</span>
                </div>

                <div className="pc-grid">
                  <div className="pc-box pc-method">
                    <div className="pc-box-title">
                      <span className="pc-step-badge">01</span>
                      <strong>{lang === 'en' ? 'How Data is Captured & Measured' : '一、數據如何採集與測量'}</strong>
                    </div>
                    <p>{item.principle.method}</p>
                  </div>

                  <div className="pc-box pc-mechanism">
                    <div className="pc-box-title">
                      <span className="pc-step-badge">02</span>
                      <strong>{lang === 'en' ? 'Spaceflight Physiological Mechanism' : '二、深空微重力生理與病理機轉'}</strong>
                    </div>
                    <p>{item.principle.mechanism}</p>
                  </div>

                  <div className="pc-box pc-logic pc-box-wide">
                    <div className="pc-box-title">
                      <span className="pc-step-badge">03</span>
                      <strong>{lang === 'en' ? 'Judgment Logic & Threshold Rationale' : '三、系統判定依據與狀態閾值邏輯 (How it Judges)'}</strong>
                    </div>
                    <p>{item.principle.judgmentLogic}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Standards & Thresholds */}
          <section className="criteria-section">
            <h3 className="section-title">
              <CheckCircle2 size={15} /> {lang === 'en' ? 'Clinical Standards & Diagnostic Thresholds' : '臨床評估標準與狀態閾值 (Clinical Standards)'}
            </h3>
            <div className="thresholds-grid">
              {/* NOMINAL */}
              <div className="threshold-card nominal">
                <div className="th-head">
                  <span className="badge badge-nominal">NOMINAL</span>
                  <span className="th-label">{lang === 'en' ? 'Nominal Baseline' : '正常狀態'}</span>
                </div>
                <div className="th-condition">{item.standards.nominal}</div>
                <p className="th-desc">{lang === 'en' ? 'Telemetry meets deep-space baseline; zero uncompensated fatigue or degradation.' : '各項生理數值完全符合深空基線，無異常代償或疲勞現象。'}</p>
              </div>

              {/* ADVISORY */}
              <div className="threshold-card advisory">
                <div className="th-head">
                  <span className="badge badge-advisory">ADVISORY</span>
                  <span className="th-label">{lang === 'en' ? 'Advisory Monitor' : '注意觀察'}</span>
                </div>
                <div className="th-condition">{item.standards.advisory}</div>
                <p className="th-desc">{lang === 'en' ? 'Slight baseline deviation; initiate autonomous countermeasures and retest.' : '數值輕微偏離標準，建議啟動自主預防對策或排入下午複測。'}</p>
              </div>

              {/* WARNING */}
              <div className="threshold-card warning">
                <div className="th-head">
                  <span className="badge badge-warning">WARNING</span>
                  <span className="th-label">{lang === 'en' ? 'Clinical Warning' : '警戒警示'}</span>
                </div>
                <div className="th-condition">{item.standards.warning}</div>
                <p className="th-desc">{lang === 'en' ? 'Significant pathological risk; notify ground flight surgeon and execute countermeasures.' : '顯著異常或病理風險，需立即通報地面醫官並執行對應處置。'}</p>
              </div>
            </div>
          </section>

          {/* Section 3: Diagnostic & Telemetry Analysis Chart */}
          <section className="criteria-section">
            <h3 className="section-title">
              <BarChart3 size={15} /> {lang === 'en' ? 'Telemetry & Trend Analytics' : '生理數據分析與趨勢圖表 (Telemetry & Trend Analytics)'}
            </h3>
            <CriteriaChart item={item} results={results} env={env} />
          </section>

          {/* Section 4: Clinical & Spaceflight Significance */}
          <section className="criteria-section">
            <h3 className="section-title">
              <ShieldAlert size={15} /> {lang === 'en' ? 'Spaceflight Clinical Significance' : '太空環境醫學意義 (Spaceflight Clinical Significance)'}
            </h3>
            <div className="significance-box">
              <p>{item.significance}</p>
            </div>
            <div className="criteria-sop-boundary-note" style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(0, 224, 200, 0.05)',
              border: '1px solid rgba(0, 224, 200, 0.28)',
              fontSize: '12px',
              lineHeight: '1.6',
              color: '#d1dde8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ffd0', fontWeight: '700', marginBottom: '6px' }}>
                <Stethoscope size={15} />
                <span>{lang === 'en' ? 'NASA HRP Clinical Escalation Protocol & Diagnostic Boundary' : 'NASA HRP 臨床監護界線與異常處置 SOP 標準程序'}</span>
              </div>
              <p style={{ margin: 0 }}>
                {lang === 'en'
                  ? 'Operational Precaution: Automated daily biomarkers (rPPG, PVT, Amsler, Voice) are designed for microgravity risk screening, not formal disease diagnosis. Crew must execute the 4-step SOP: 1) Verify test illumination/acoustics/posture, 2) Retest after 2 min rest to rule out artifacts, 3) Log any subjective discomfort symptoms in the Action Hub, and 4) If abnormality persists across retests, escalate to formal flight surgeon telemedicine consultation.'
                  : '航醫處置原則：自動化晨檢感測（rPPG、PVT、Amsler、語音）屬於微重力自主風險快篩，非最終臨床定性診斷。檢測異常時務必遵循 4 步驟標準 SOP：① 檢核測試環境（光線、距離、噪音、坐姿），② 休息 2 分鐘深呼吸後重測以排除偽陽性，③ 於自主處置區記錄主觀自覺不適症狀，④ 若跨次持續異常或伴隨臨床症狀，再依深空任務通訊程序尋求地面航醫會診評估。'}
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="criteria-footer">
          <span className="footer-note">{lang === 'en' ? 'AURA-Space Autonomous Telemetry · Ref: NASA Human Research Program (HRP)' : 'AURA-Space 自主生理監測系統 · 參考 NASA 人類研究計畫 (HRP) 標準'}</span>
          <button type="button" className="btn-primary btn-close-modal" onClick={closeCriteria}>
            {lang === 'en' ? 'Close Window' : '關閉視窗'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
