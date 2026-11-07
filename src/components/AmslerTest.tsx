import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Clock, Eye, Maximize2, RotateCcw, X } from 'lucide-react'
import { Stat, StartTestButton, TestCard } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

const N = 20
const SIZE = 520
const FIXATION_SECONDS = 10

type EyeSide = '右眼' | '左眼'
type Phase = 'idle' | 'intro-right' | 'test-right' | 'intro-left' | 'test-left'

/** Distance in grid cells (≈ degrees of visual angle at 30–33 cm) from the central red dot (10, 10). */
function cellEccentricity(x: number, y: number): number {
  return Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2)
}

function analyzeEyeMarks(rightSet: Set<string>, leftSet: Set<string>): NonNullable<Results['amsler']> {
  let centralMarks = 0
  let paracentralMarks = 0
  let peripheralMarks = 0
  let temporalOuterMarks = 0
  let minEcc: number | null = null

  const scan = (set: Set<string>, side: EyeSide) => {
    set.forEach((k) => {
      const [x, y] = k.split(',').map(Number)
      const d = cellEccentricity(x, y)
      if (minEcc === null || d < minEcc) minEcc = d
      if (d <= 3.0) {
        centralMarks++
      } else if (d <= 6.0) {
        paracentralMarks++
      } else {
        peripheralMarks++
        const isTemporal = side === '右眼' ? x >= 14 : x <= 5
        if (isTemporal) temporalOuterMarks++
      }
    })
  }

  scan(rightSet, '右眼')
  scan(leftSet, '左眼')

  const rightMarks = rightSet.size
  const leftMarks = leftSet.size
  const marks = rightMarks + leftMarks

  const eyes =
    marks === 0
      ? '雙眼正常'
      : rightMarks > leftMarks
      ? '右眼較重'
      : leftMarks > rightMarks
      ? '左眼較重'
      : '雙眼均等'

  const zoneSummary =
    marks === 0
      ? '無異常'
      : centralMarks > 0
      ? '中心黃斑 (≤3°)'
      : paracentralMarks > 0
      ? '旁中心區 (3°–6°)'
      : temporalOuterMarks > 0
      ? '外圍顳側 (>6°)'
      : '外圍網格 (>6°)'

  return {
    marks,
    rightMarks,
    leftMarks,
    centralMarks,
    paracentralMarks,
    peripheralMarks,
    temporalOuterMarks,
    minEccentricity: minEcc !== null ? +minEcc.toFixed(1) : null,
    zoneSummary,
    eyes,
  }
}

export default function AmslerTest({
  results,
  env,
  onResult,
}: {
  results: Results
  env: Env
  onResult: (v: Results['amsler']) => void
}) {
  const cv = useRef<HTMLCanvasElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [obsSec, setObsSec] = useState(FIXATION_SECONDS)
  const [marks, setMarks] = useState<Record<EyeSide, Set<string>>>({
    右眼: new Set(),
    左眼: new Set(),
  })

  const r = results.amsler
  const activeEye: EyeSide = phase === 'intro-left' || phase === 'test-left' ? '左眼' : '右眼'
  const isTestingGrid = phase === 'test-right' || phase === 'test-left'

  // Listen to native browser fullscreen change (e.g. user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false)
        setPhase('idle')
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [isFullscreen])

  // 10-second fixation countdown timer for each eye test phase
  useEffect(() => {
    if (phase !== 'test-right' && phase !== 'test-left') return
    setObsSec(FIXATION_SECONDS)
    const timer = window.setInterval(() => {
      setObsSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  // Draw 20x20 Amsler Grid whenever grid is visible or marks change
  useEffect(() => {
    if (!isFullscreen || !isTestingGrid || !cv.current) return
    const c = cv.current.getContext('2d')
    if (!c) return

    const cell = SIZE / N
    c.fillStyle = '#020408'
    c.fillRect(0, 0, SIZE, SIZE)

    // Marked distortion cells color-coded by distance to central red dot (foveal severity)
    marks[activeEye].forEach((k) => {
      const [x, y] = k.split(',').map(Number)
      const d = cellEccentricity(x, y)
      c.fillStyle =
        d <= 3.0
          ? 'rgba(255, 59, 82, 0.64)'   // Central foveal zone (≤3°): high-severity red
          : d <= 6.0
          ? 'rgba(255, 158, 44, 0.54)'  // Paracentral zone (3°–6°): orange
          : 'rgba(255, 214, 70, 0.42)'  // Peripheral zone (>6°): amber-gold
      c.fillRect(x * cell, y * cell, cell, cell)
    })

    // Crisp 20x20 grid lines
    c.strokeStyle = 'rgba(235, 243, 255, 0.86)'
    c.lineWidth = 1.2
    c.beginPath()
    for (let i = 0; i <= N; i++) {
      const pos = Math.round(i * cell)
      c.moveTo(pos, 0)
      c.lineTo(pos, SIZE)
      c.moveTo(0, pos)
      c.lineTo(SIZE, pos)
    }
    c.stroke()

    // Center fixation red dot
    c.fillStyle = '#ff4d5e'
    c.shadowColor = '#ff4d5e'
    c.shadowBlur = 14
    c.beginPath()
    c.arc(SIZE / 2, SIZE / 2, 6, 0, Math.PI * 2)
    c.fill()
    c.shadowBlur = 0
  }, [marks, activeEye, isFullscreen, isTestingGrid])

  const handleStartFullscreen = () => {
    setMarks({ 右眼: new Set(), 左眼: new Set() })
    setIsFullscreen(true)
    setPhase('intro-right')
    try {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {}
  }

  const exitFullscreenAndReset = (userAborted = false) => {
    if (userAborted && phase !== 'idle') {
      const reason =
        lang === 'en'
          ? 'Binocular visual test aborted early (both eyes not completed). SANS blind-spot assessment insufficient.'
          : '雙眼視野檢測未完整完成（僅測試單眼或提前中斷），SANS 視網膜盲區數據不足'
      onResult({
        marks: 0,
        eyes: '未完成',
        insufficient: true,
        reason,
      })
    }
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
  }

  const toggleCell = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cv.current) return
    const rect = cv.current.getBoundingClientRect()
    const x = Math.min(N - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * N)))
    const y = Math.min(N - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * N)))
    const k = `${x},${y}`
    setMarks((m) => {
      const s = new Set(m[activeEye])
      if (s.has(k)) s.delete(k)
      else s.add(k)
      return { ...m, [activeEye]: s }
    })
  }

  const clearEyeMarks = (side: EyeSide) => {
    setMarks((m) => ({ ...m, [side]: new Set() }))
  }

  const handleFinishAll = () => {
    const analyzed = analyzeEyeMarks(marks.右眼, marks.左眼)
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
    onResult({ ...analyzed, insufficient: false })
  }

  const progressPct =
    phase === 'intro-right'
      ? 15
      : phase === 'test-right'
      ? 45
      : phase === 'intro-left'
      ? 65
      : phase === 'test-left'
      ? 90
      : 0

  const { lang } = useI18n()
  const level = evaluate(env, results).eye

  return (
    <>
      {/* 1. Dashboard Test Card */}
      <TestCard
        id="test-amsler"
        step="02"
        title={lang === 'en' ? '02 Digital Amsler Visual Distortion Scan' : '02 數位 Amsler 視覺失真篩檢'}
        sub={
          lang === 'en'
            ? 'Cephalad Fluid Shift / SANS: Foveal Eccentricity Weighting & Binocular Deficits'
            : '頭向體液轉移 / SANS：中心視軸離心度加權與雙眼標記'
        }
        duration="≈ 30 s"
        level={level}
        done={!!r && !r.insufficient}
        insufficient={!!r?.insufficient}
      >
        <button
          type="button"
          className="test-stage-pad"
          onClick={handleStartFullscreen}
        >
          <div className="amsler-pad-grid-icon" aria-hidden="true">
            <span className="amsler-pad-dot" />
          </div>
          <span>
            {r?.insufficient
              ? lang === 'en'
                ? '⚠️ Vision Data Insufficient · Click to Retest'
                : '⚠️ 視野數據不足 · 點擊全螢幕重新檢測'
              : r
              ? lang === 'en'
                ? 'Binocular scan complete · Click to retest fullscreen'
                : '雙眼篩檢完成 · 點擊可全螢幕重新測驗'
              : lang === 'en'
              ? 'Click "Start Test" below for darkroom grid test (Right → Left Eye)'
              : '點擊下方「開始測驗」啟動全螢幕黑屏暗房檢測（右眼 → 左眼）'}
          </span>
        </button>

        {r?.insufficient && (
          <div className="insufficient-alert-card">
            <div className="iac-head">
              <AlertTriangle size={18} className="iac-icon" />
              <div>
                <strong>{lang === 'en' ? 'Data Insufficient / Retest Required' : '資料不足／需要重測'}</strong>
                <p>{r.reason || (lang === 'en' ? 'Binocular visual grid scan incomplete' : '雙眼視野掃描未完成')}</p>
              </div>
            </div>
            <div className="iac-clinical-note">
              {lang === 'en'
                ? 'Clinical Rule: SANS choroidal folds cannot be ruled out without binocular fixation.'
                : '監護原則：未完成雙眼中心凝視，無法排除微重力頭向體液轉移所致視網膜微褶。'}
            </div>
          </div>
        )}

        <div className="stats stats-uniform stats-4col">
          <Stat
            label={lang === 'en' ? 'OD (Right)' : '右眼 (OD)'}
            value={!r ? '—' : r.insufficient ? '— (需重測)' : (r.rightMarks ?? 0)}
            unit={r && !r.insufficient ? (lang === 'en' ? ' cells' : ' 格') : ''}
          />
          <Stat
            label={lang === 'en' ? 'OS (Left)' : '左眼 (OS)'}
            value={!r ? '—' : r.insufficient ? '— (需重測)' : (r.leftMarks ?? 0)}
            unit={r && !r.insufficient ? (lang === 'en' ? ' cells' : ' 格') : ''}
          />
          <Stat
            label={lang === 'en' ? 'Fixation Dist' : '距紅點'}
            value={
              !r
                ? '—'
                : r.insufficient
                ? '—'
                : r.minEccentricity != null
                ? r.minEccentricity
                : lang === 'en'
                ? 'Normal'
                : '正常'
            }
            unit={r && !r.insufficient && r.minEccentricity != null ? '°' : ''}
          />
          <Stat
            label={lang === 'en' ? 'Affected Zone' : '受影響區'}
            value={
              !r
                ? '—'
                : r.insufficient
                ? '需重測'
                : r.marks === 0
                ? lang === 'en'
                  ? 'None'
                  : '無異常'
                : (r.centralMarks ?? 0) > 0
                ? lang === 'en'
                  ? 'Center ≤3°'
                  : '中心≤3°'
                : (r.paracentralMarks ?? 0) > 0
                ? lang === 'en'
                  ? 'Paracentral'
                  : '旁中心'
                : lang === 'en'
                ? 'Outer >6°'
                : '外圍>6°'
            }
          />
        </div>

        {r && !r.insufficient && (level === 'warning' || level === 'advisory') && (
          <div className={`test-card-anomaly-callout ${level === 'warning' ? 'is-warning' : ''}`}>
            <AlertTriangle size={15} className="tcac-icon" />
            <div className="tcac-text">
              <strong>
                {lang === 'en'
                  ? '【Operational Reminder】Grid Metamorphopsia · Not Clinical SANS Diagnosis'
                  : '【航醫監護提醒】視野方格變形 · 非臨床 SANS 定性診斷'}
              </strong>
              <span>
                {lang === 'en'
                  ? 'Single-test grid distortion can stem from tear film dryness or fixation shift. Blink, maintain 30–33 cm distance to retest, and log vision symptoms in Action Hub.'
                  : '單次方格變形可能源於淚膜乾燥、眨眼疲勞或凝視偏角。請眨眼休息、維持 30–33 公分重測；若持續異常，請記錄自覺不適並通報醫官。'}
              </span>
            </div>
          </div>
        )}

        <StartTestButton id="btn-amsler" done={!!r && !r.insufficient} onClick={handleStartFullscreen} />
      </TestCard>

      {/* 2. Fullscreen Black-Screen Clinical Darkroom Modal */}
      {isFullscreen &&
        createPortal(
          <div className="amsler-fullscreen-modal">
            {/* Top HUD Header */}
            <header className="amsler-fs-topbar">
              <div className="pvt-fs-branding">
                <span className="rppg-fs-badge">AURA-SPACE 02</span>
                <div className="pvt-fs-title-col">
                  <h2>
                    {lang === 'en'
                      ? 'Digital Amsler Visual Distortion Scan · Fullscreen Darkroom'
                      : '數位 Amsler 視覺失真篩檢 · 全螢幕暗房模式'}
                  </h2>
                  <span>
                    {lang === 'en'
                      ? 'SANS · Macular Foveal Eccentricity Mapping & Binocular Testing'
                      : 'SANS 太空神經眼神經症候群 · 黃斑中心凹離心度定位與雙眼篩檢'}
                  </span>
                </div>
              </div>

              <div className="rppg-fs-status-pill">
                <span className="pulse-dot" />
                {phase === 'intro-right' &&
                  (lang === 'en' ? 'Step 1: Right Eye Instructions' : '第 1 階段：右眼測驗前指引')}
                {phase === 'test-right' &&
                  (obsSec > 0
                    ? lang === 'en'
                      ? `Step 1: Right Eye Fixation (${obsSec}s left)`
                      : `第 1 階段：右眼凝視觀察中 (剩餘 ${obsSec}s)`
                    : lang === 'en'
                    ? 'Step 1: Right Eye 10s Complete · Mark or Submit'
                    : '第 1 階段：右眼已滿 10s · 請標記或完成')}
                {phase === 'intro-left' &&
                  (lang === 'en' ? 'Step 2: Switch to Left Eye Instructions' : '第 2 階段：切換左眼測驗前指引')}
                {phase === 'test-left' &&
                  (obsSec > 0
                    ? lang === 'en'
                      ? `Step 2: Left Eye Fixation (${obsSec}s left)`
                      : `第 2 階段：左眼凝視觀察中 (剩餘 ${obsSec}s)`
                    : lang === 'en'
                    ? 'Step 2: Left Eye 10s Complete · Mark or Submit'
                    : '第 2 階段：左眼已滿 10s · 請標記或完成')}
              </div>

              <button
                className="rppg-fs-btn-exit"
                onClick={() => exitFullscreenAndReset(true)}
                title="退出全螢幕 (ESC)"
              >
                <X size={16} /> {lang === 'en' ? 'Exit Fullscreen (ESC)' : '退出全螢幕 (ESC)'}
              </button>
            </header>

            {/* Center Stage */}
            <div className="amsler-fs-center-stage">
              {/* Phase 1: Black Screen Pre-Test Intro for RIGHT EYE */}
              {phase === 'intro-right' && (
                <div className="rppg-fs-rules-card amsler-black-rules">
                  <div className="amsler-rules-tag">
                    {lang === 'en'
                      ? `STEP 1 / 2 · Test Right Eye First (${FIXATION_SECONDS}s Fixation)`
                      : `STEP 1 / 2 · 先測右眼（單眼凝視 ${FIXATION_SECONDS} 秒）`}
                  </div>
                  <h3>
                    {lang === 'en'
                      ? '【Right Eye Amsler Grid Visual Distortion Guide】'
                      : '【右眼 Amsler 方格視覺檢測指引】'}
                  </h3>

                  <div className="rppg-fs-rules-list">
                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">1</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? 'Cover Left Eye (Test Right Eye Only)'
                            : '遮住左眼（單用右眼施測）'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? 'Cover your left eye gently with your palm (do not press on eyeball to avoid afterimages). View the screen with your right eye only.'
                            : '請用手掌輕輕遮住左眼（切勿按壓眼球以免產生殘影），僅以右眼觀看螢幕'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">2</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? `Maintain 30–35 cm Distance, Gaze at Red Dot for ${FIXATION_SECONDS}s`
                            : `保持 30–35 cm 距離，持續凝視中央紅點 ${FIXATION_SECONDS} 秒`}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? `Maintain approx. 30–35 cm distance (~1° visual angle per cell). Stare steadily at the central red dot for ${FIXATION_SECONDS} seconds (blink naturally, do not move gaze away from the dot).`
                            : `眼睛與螢幕維持約 30–35 公分距離（每格約對應 1° 視角），開始後請專注盯住正中央紅色基準點持續 ${FIXATION_SECONDS} 秒（期間可自然眨眼，視線切勿移開紅點）`}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">3</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? 'Mark Distorted Grid Cells (Risk Weighted by Distance to Red Dot)'
                            : '依異常位置點擊方格（系統依紅點距離分級風險）'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? `If peripheral vision reveals wavy, bent, or dimmed grid lines, tap that cell. Proximity to the central red dot (≤3° foveal zone) represents higher SANS risk.`
                            : `餘光若見線條呈波浪彎曲、歪斜或局部發暗請點擊該格：愈靠近中央紅點（≤3° 黃斑中心凹區）代表中心視軸受損風險愈高；滿 ${FIXATION_SECONDS} 秒確認後點擊下方完成`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rppg-fs-rules-actions">
                    <button
                      id="btn-amsler-confirm-right"
                      className="btn-fs-confirm"
                      onClick={() => setPhase('test-right')}
                    >
                      <CheckCircle2 size={16} />{' '}
                      {lang === 'en'
                        ? `I have covered left eye, start right eye ${FIXATION_SECONDS}s test`
                        : `我已遮住左眼，開始右眼 ${FIXATION_SECONDS} 秒測驗`}
                    </button>
                    <button className="btn-fs-cancel" onClick={() => exitFullscreenAndReset(true)}>
                      {lang === 'en' ? 'Cancel' : '取消'}
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 3: Black Screen Pre-Test Intro when switching to LEFT EYE */}
              {phase === 'intro-left' && (
                <div className="rppg-fs-rules-card amsler-black-rules">
                  <div className="amsler-step-done-banner">
                    <CheckCircle2 size={15} />
                    <span>
                      {lang === 'en'
                        ? `Right eye completed (${marks.右眼.size} cells marked) · Prepare left eye test`
                        : `右眼測驗已完成（標記 ${marks.右眼.size} 格）· 請準備換測左眼`}
                    </span>
                  </div>
                  <div className="amsler-rules-tag">
                    {lang === 'en'
                      ? `STEP 2 / 2 · Test Left Eye (${FIXATION_SECONDS}s Fixation)`
                      : `STEP 2 / 2 · 換測左眼（單眼凝視 ${FIXATION_SECONDS} 秒）`}
                  </div>
                  <h3>
                    {lang === 'en'
                      ? '【Switch to Left Eye · Amsler Grid Test Guide】'
                      : '【切換左眼 · Amsler 方格視覺檢測指引】'}
                  </h3>

                  <div className="rppg-fs-rules-list">
                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">1</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? 'Switch Hands to Cover Right Eye (Test Left Eye Only)'
                            : '換手遮住右眼（改用左眼施測）'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? 'Lower the hand covering your left eye, and gently cover your right eye with your palm (do not press). View the screen with left eye only.'
                            : '請放下遮住左眼的手，改用手掌輕輕遮住右眼（切勿按壓眼球），現在僅使用左眼觀看螢幕'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">2</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? `Blink to Adapt to Darkroom, Gaze at Red Dot for ${FIXATION_SECONDS}s`
                            : `眨眼適應黑屏，持續凝視中央紅點 ${FIXATION_SECONDS} 秒`}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? `Blink naturally 1–2 times to adapt to the dark screen. Keep 30–35 cm distance and stare steadily at central red dot for ${FIXATION_SECONDS} seconds.`
                            : `請先自然眨眼 1–2 次適應暗房黑屏，保持 30–35 公分距離，專注盯住正中央紅色基準點持續 ${FIXATION_SECONDS} 秒（畫面同樣提供 ${FIXATION_SECONDS} 秒倒數計時，視線勿移開紅點）`}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">3</span>
                      <div>
                        <strong>
                          {lang === 'en'
                            ? 'Mark Left Eye Distortion Areas'
                            : '標記左眼視覺失真位置'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? `Check with peripheral vision for wavy, distorted, or missing lines. Click abnormal cells to complete binocular testing.`
                            : `凝視 ${FIXATION_SECONDS} 秒期間以餘光檢查格線是否有波浪扭曲、歪斜、斷裂或暗影，點擊異常格定位後即可完成全部雙眼檢測`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rppg-fs-rules-actions">
                    <button
                      id="btn-amsler-confirm-left"
                      className="btn-fs-confirm"
                      onClick={() => setPhase('test-left')}
                    >
                      <CheckCircle2 size={16} />{' '}
                      {lang === 'en'
                        ? `I have covered right eye, start left eye ${FIXATION_SECONDS}s test`
                        : `我已遮住右眼，開始左眼 ${FIXATION_SECONDS} 秒測驗`}
                    </button>
                    <button className="btn-fs-cancel" onClick={() => exitFullscreenAndReset(true)}>
                      {lang === 'en' ? 'Cancel' : '取消'}
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 2 & Phase 4: Active Fullscreen Amsler Grid Test */}
              {isTestingGrid && (
                <div className="amsler-fs-test-wrap">
                  <div className="amsler-fs-eye-bar">
                    <div className="amsler-fs-eye-pill">
                      <Eye size={16} />
                      <span>
                        {lang === 'en' ? (
                          <>
                            Testing: <strong>{activeEye === '右眼' ? 'Right Eye (OD)' : 'Left Eye (OS)'}</strong>
                            {' '}(Cover {activeEye === '右眼' ? 'Left Eye' : 'Right Eye'})
                          </>
                        ) : (
                          <>
                            目前施測：<strong>{activeEye}</strong>
                            （遮住{activeEye === '右眼' ? '左眼' : '右眼'}）
                          </>
                        )}
                      </span>
                    </div>

                    <div className={`amsler-timer-pill ${obsSec === 0 ? 'done' : ''}`}>
                      {obsSec > 0 ? (
                        <>
                          <Clock size={14} />
                          <span>
                            {lang === 'en' ? (
                              <>Please gaze at red dot: <b>{obsSec}</b>s left</>
                            ) : (
                              <>請持續凝視紅點：還剩 <b>{obsSec}</b> 秒</>
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>
                            {lang === 'en'
                              ? `Completed ${FIXATION_SECONDS}s fixation`
                              : `已滿 ${FIXATION_SECONDS} 秒凝視時間`}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="amsler-fs-mark-tools">
                      <span className="amsler-fs-mark-count">
                        {lang === 'en' ? (
                          <>Distortions: <b>{marks[activeEye].size}</b> cells</>
                        ) : (
                          <>異常：<b>{marks[activeEye].size}</b> 格</>
                        )}
                      </span>
                      {marks[activeEye].size > 0 && (
                        <button
                          type="button"
                          className="amsler-clear-btn"
                          onClick={() => clearEyeMarks(activeEye)}
                        >
                          <RotateCcw size={12} /> {lang === 'en' ? 'Clear' : '清除'}
                        </button>
                      )}
                    </div>
                  </div>

                  <canvas
                    id="amsler-canvas"
                    ref={cv}
                    className="amsler-fs-canvas"
                    width={SIZE}
                    height={SIZE}
                    onPointerDown={toggleCell}
                  />

                  <p className="amsler-fs-hint">
                    {lang === 'en'
                      ? 'Red = Central Macula (≤3° High Risk) · Orange = Paracentral (3°–6°) · Yellow = Peripheral (>6°)'
                      : '紅格＝中心黃斑區 (≤3° 高危) · 橘格＝旁中心區 (3°–6°) · 黃格＝外圍網格 (>6°)'}
                  </p>

                  {phase === 'test-right' ? (
                    <button
                      id="btn-amsler-finish-right"
                      className="btn-primary amsler-fs-submit-btn"
                      onClick={() => setPhase('intro-left')}
                    >
                      {marks.右眼.size > 0
                        ? lang === 'en'
                          ? `Finish Right Eye (${marks.右眼.size} cells marked) → Next: Left Eye`
                          : `完成右眼測驗（已標記 ${marks.右眼.size} 格） → 換測左眼`
                        : obsSec > 0
                        ? lang === 'en'
                          ? `Observing (${obsSec}s) · No Right Eye Distortion → Next: Left Eye`
                          : `凝視觀察中 (${obsSec}s) · 右眼無失真 → 換測左眼`
                        : lang === 'en'
                        ? '✓ 10s Finished & No Distortion → Next: Left Eye'
                        : '✓ 已滿 10 秒且右眼無失真 → 完成並換測左眼'}
                    </button>
                  ) : (
                    <button
                      id="btn-amsler-finish-left"
                      className="btn-primary amsler-fs-submit-btn"
                      onClick={handleFinishAll}
                    >
                      {marks.左眼.size > 0
                        ? lang === 'en'
                          ? `Finish Left Eye (${marks.左眼.size} cells marked) · Complete Scan`
                          : `完成左眼測驗（已標記 ${marks.左眼.size} 格） · 結束篩檢`
                        : obsSec > 0
                        ? lang === 'en'
                          ? `Observing (${obsSec}s) · No Left Eye Distortion · Finish`
                          : `凝視觀察中 (${obsSec}s) · 左眼無失真 · 完成測驗`
                        : lang === 'en'
                        ? '✓ 10s Finished & No Distortion · Complete All Tests'
                        : '✓ 已滿 10 秒且左眼無失真 · 完成全部測驗'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Progress Dock */}
            <footer className="amsler-fs-bottom-dock">
              <div className="pvt-fs-dock-row">
                <div className="dock-meta-left">
                  <Eye size={15} style={{ color: 'var(--green)' }} />
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {lang === 'en'
                      ? `Binocular SANS Visual Distortion Protocol: Right Eye (${FIXATION_SECONDS}s) → Left Eye (${FIXATION_SECONDS}s)`
                      : `雙眼 SANS 視覺失真篩檢流程：右眼 (${FIXATION_SECONDS}s) → 左眼 (${FIXATION_SECONDS}s)`}
                  </span>
                </div>

                <div className="pvt-fs-trial-badges">
                  <span
                    className={`pvt-fs-trial-chip ${
                      phase === 'intro-left' || phase === 'test-left' ? 'chip-good' : ''
                    }`}
                  >
                    {lang === 'en' ? '1. Right Eye: ' : '1. 右眼：'}
                    {phase === 'intro-right'
                      ? lang === 'en'
                        ? 'Guide'
                        : '指引確認中'
                      : phase === 'test-right'
                      ? lang === 'en'
                        ? `Testing (${marks.右眼.size})`
                        : `檢測中 (${marks.右眼.size}格)`
                      : lang === 'en'
                      ? `✓ Done (${marks.右眼.size})`
                      : `✓ 已完成 (${marks.右眼.size}格)`}
                  </span>
                  <span className={`pvt-fs-trial-chip ${phase === 'test-left' ? 'chip-good' : ''}`}>
                    {lang === 'en' ? '2. Left Eye: ' : '2. 左眼：'}
                    {phase === 'intro-right' || phase === 'test-right'
                      ? lang === 'en'
                        ? 'Pending'
                        : '待檢測'
                      : phase === 'intro-left'
                      ? lang === 'en'
                        ? 'Guide'
                        : '指引確認中'
                      : lang === 'en'
                      ? `Testing (${marks.左眼.size})`
                      : `檢測中 (${marks.左眼.size}格)`}
                  </span>
                </div>
              </div>

              <div className="rppg-fs-dock-progress">
                <div className="dock-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </footer>
          </div>,
          document.body
        )}
    </>
  )
}
