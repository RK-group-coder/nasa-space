import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, X, Maximize2, Zap, Activity } from 'lucide-react'
import { Stat, StartTestButton, TestCard, median } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

const TRIALS = 5

export default function PvtTest({
  results,
  env,
  onResult,
}: {
  results: Results
  env: Env
  onResult: (v: Results['pvt']) => void
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'rules' | 'countdown' | 'wait' | 'go' | 'feedback'>('idle')
  const [countdown, setCountdown] = useState(3)
  const [display, setDisplay] = useState('')
  const [trial, setTrial] = useState(0)
  const [completedRts, setCompletedRts] = useState<number[]>([])

  const st = useRef({
    rts: [] as number[],
    falseStarts: 0,
    t0: 0,
    timer: 0,
    tick: 0,
    running: false,
  })
  const countTimer = useRef<number | null>(null)
  const r = results.pvt

  const clearTimers = () => {
    clearTimeout(st.current.timer)
    cancelAnimationFrame(st.current.tick)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
      if (countTimer.current) clearInterval(countTimer.current)
    }
  }, [])

  // Listen to native browser fullscreen change (e.g. user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        exitFullscreenAndReset()
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [isFullscreen])

  // Step 1: Open Fullscreen Mode & Show Rules
  const handleStartFullscreen = () => {
    setIsFullscreen(true)
    setPhase('rules')
    try {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {}
  }

  // Step 2: Confirm Rules -> Start 3s Countdown
  const handleConfirmRules = () => {
    setPhase('countdown')
    setCountdown(3)

    let count = 3
    if (countTimer.current) clearInterval(countTimer.current)
    countTimer.current = window.setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        if (countTimer.current) clearInterval(countTimer.current)
        startPvtSession()
      }
    }, 1000)
  }

  // Step 3: Start 5-trial PVT
  const startPvtSession = () => {
    st.current = { rts: [], falseStarts: 0, t0: 0, timer: 0, tick: 0, running: true }
    setTrial(0)
    setCompletedRts([])
    scheduleNextTrial()
  }

  const scheduleNextTrial = () => {
    setPhase('wait')
    setDisplay('')
    clearTimers()
    const waitMs = 2000 + Math.random() * 4000 // 2 to 6 seconds random ISI
    st.current.timer = window.setTimeout(() => {
      st.current.t0 = performance.now()
      setPhase('go')
      const tick = () => {
        setDisplay(String(Math.round(performance.now() - st.current.t0)).padStart(3, '0'))
        st.current.tick = requestAnimationFrame(tick)
      }
      tick()
    }, waitMs)
  }

  // Reaction Press (Click/Tap or Space key)
  const handlePress = () => {
    const s = st.current
    if (!s.running) return

    if (phase === 'wait') {
      clearTimers()
      s.falseStarts++
      setPhase('feedback')
      setDisplay('搶跑！')
      s.timer = window.setTimeout(scheduleNextTrial, 1400)
      return
    }

    if (phase === 'go') {
      cancelAnimationFrame(s.tick)
      const rt = Math.round(performance.now() - s.t0)
      s.rts.push(rt)
      setCompletedRts([...s.rts])
      setDisplay(`${rt}`)
      setPhase('feedback')
      setTrial(s.rts.length)

      if (s.rts.length >= TRIALS) {
        s.running = false
        s.timer = window.setTimeout(() => {
          exitFullscreenAndFinish({
            median: Math.round(median(s.rts)),
            lapses: s.rts.filter((x) => x > 500).length,
            falseStarts: s.falseStarts,
            rts: s.rts,
          })
        }, 1500)
      } else {
        s.timer = window.setTimeout(scheduleNextTrial, 1200)
      }
    }
  }

  // Keyboard Space listener during test
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && st.current.running) {
        e.preventDefault()
        handlePress()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // Exit fullscreen on test completion
  const exitFullscreenAndFinish = (finalRes?: Results['pvt']) => {
    clearTimers()
    st.current.running = false
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
    if (finalRes) {
      onResult(finalRes)
    }
  }

  // Cancel/Exit button handler
  const exitFullscreenAndReset = () => {
    clearTimers()
    if (countTimer.current) clearInterval(countTimer.current)
    st.current.running = false
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
  }

  const { lang } = useI18n()
  const level = evaluate(env, results).cognition

  return (
    <>
      {/* 1. Normal Dashboard Test Card */}
      <TestCard
        id="test-pvt"
        step="01"
        title={lang === 'en' ? 'NASA-PVT Psychomotor Vigilance Test' : 'NASA-PVT 精神運動警覺測試'}
        sub={
          lang === 'en'
            ? 'Millisecond Reaction Time · Lapses (> 500 ms)'
            : '毫秒反應時間 · 注意力喪失 (Lapse > 500 ms)'
        }
        duration="≈ 45 s"
        level={level}
        done={!!r}
      >
        <button
          id="pvt-pad"
          type="button"
          className="test-stage-pad"
          onClick={handleStartFullscreen}
        >
          <div className="voice-pad-icon pvt-pad-icon" aria-hidden="true">
            <Zap size={23} />
          </div>
          <span>
            {r
              ? lang === 'en'
                ? 'PVT Completed · Click to Retest Fullscreen'
                : '警覺測試完成 · 點擊可全螢幕重新測試'
              : lang === 'en'
              ? 'Click "Start Test" below for fullscreen reaction test'
              : '點擊下方「開始測驗」啟動全螢幕反應測試'}
          </span>
        </button>

        <div className="stats stats-uniform stats-3col">
          <Stat label={lang === 'en' ? 'Median RT' : '中位反應'} value={r ? r.median : '—'} unit={r ? ' ms' : ''} />
          <Stat label="Lapses" value={r ? r.lapses : '—'} />
          <Stat label={lang === 'en' ? 'False Starts' : '搶跑'} value={r ? r.falseStarts : '—'} />
        </div>

        <StartTestButton id="btn-pvt" done={!!r} onClick={handleStartFullscreen} />
      </TestCard>

      {/* 2. Fullscreen Cockpit Modal (測試時全螢幕，測完自動解除) */}
      {isFullscreen &&
        createPortal(
          <div className="pvt-fullscreen-modal">
            {/* Top Bar */}
            <header className="pvt-fs-topbar">
              <div className="pvt-fs-branding">
                <span className="pvt-fs-badge">NASA-PVT 01</span>
                <div className="pvt-fs-title-col">
                  <h2>
                    {lang === 'en'
                      ? 'NASA-PVT Psychomotor Vigilance Test · Fullscreen Mode'
                      : 'NASA-PVT 精神運動警覺測試 · 全螢幕專注模式'}
                  </h2>
                  <span>
                    {lang === 'en'
                      ? 'Psychomotor Vigilance Task · Gold Standard for Sleep Loss & Vigilance'
                      : 'Psychomotor Vigilance Task · 睡眠剝奪與作業警覺金標準'}
                  </span>
                </div>
              </div>

              <div className="pvt-fs-status-pill">
                <span className="pulse-dot" />
                {phase === 'rules' && (lang === 'en' ? 'Measurement Rules' : '測量規範指示')}
                {phase === 'countdown' &&
                  (lang === 'en' ? `Preparing (${countdown}s)` : `倒數準備中 (${countdown}s)`)}
                {phase === 'wait' && (lang === 'en' ? 'Stay Alert · Focused' : '保持警覺中 · 專注')}
                {phase === 'go' && (lang === 'en' ? 'PRESS SPACEBAR NOW!' : '立即反應按鍵！')}
                {phase === 'feedback' && (lang === 'en' ? 'Reaction Feedback' : '反應反饋')}
              </div>

              <button className="rppg-fs-btn-exit" onClick={exitFullscreenAndReset} title="退出全螢幕 (ESC)">
                <X size={16} /> {lang === 'en' ? 'Exit Fullscreen (ESC)' : '退出全螢幕 (ESC)'}
              </button>
            </header>

            {/* Center Stage: Rules OR Fullscreen Stimulus Pad */}
            <div className="pvt-fs-center-stage">
              {/* Rules Screen */}
              {phase === 'rules' && (
                <div className="rppg-fs-rules-card">
                  <div className="v-rules-tag">
                    {lang === 'en' ? 'NASA Gold Standard' : 'NASA 警覺金標準'}
                  </div>
                  <h3>
                    {lang === 'en'
                      ? '【NASA-PVT Instructions & Rules】'
                      : '【NASA-PVT 測試指引與規則】'}
                  </h3>

                  <div className="rppg-fs-rules-list">
                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">1</span>
                      <div>
                        <strong>{lang === 'en' ? 'Finger Ready' : '手指就緒'}</strong>
                        <p>
                          {lang === 'en'
                            ? 'Rest your finger lightly on the Spacebar or get ready to tap the screen center'
                            : '請將手指輕放在鍵盤 空白鍵 (Space) 上，或準備點擊螢幕中央'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">2</span>
                      <div>
                        <strong>
                          {lang === 'en' ? 'Fastest Reaction' : '見字即按（最快反射）'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? 'When red millisecond counter appears and starts running, press Spacebar as quickly as possible'
                            : '看到中央出現紅色毫秒數字跳動時，請以最快神經反射立即按下空白鍵'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">3</span>
                      <div>
                        <strong>
                          {lang === 'en' ? 'No False Starts' : '切勿搶跑（False Start）'}
                        </strong>
                        <p>
                          {lang === 'en'
                            ? 'Stay calm before numbers roll. Pressing early will count as a False Start'
                            : '數字尚未跳動前請保持冷靜注視，若提早按下將被記為一次「搶跑」'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rppg-fs-rules-actions">
                    <button id="btn-pvt-fs-confirm" className="btn-fs-confirm" onClick={handleConfirmRules}>
                      <CheckCircle2 size={16} />{' '}
                      {lang === 'en' ? 'Confirm, Start 3s Countdown' : '確認，開始 3 秒倒數'}
                    </button>
                    <button className="btn-fs-cancel" onClick={exitFullscreenAndReset}>
                      {lang === 'en' ? 'Cancel' : '取消'}
                    </button>
                  </div>
                </div>
              )}

              {/* 3s Countdown Overlay */}
              {phase === 'countdown' && (
                <div className="rppg-fs-countdown-overlay">
                  <div className="rppg-fs-countdown-ring">
                    <span className="rppg-fs-countdown-number" key={countdown}>
                      {countdown}
                    </span>
                  </div>
                  <span className="rppg-fs-countdown-hint">
                    {lang === 'en'
                      ? 'Round 1 starting · Place finger on spacebar'
                      : '第 1 回合即將開始 · 請將手指放在空白鍵上'}
                  </span>
                </div>
              )}

              {/* Live PVT Stimulus Interaction Pad */}
              {(phase === 'wait' || phase === 'go' || phase === 'feedback') && (
                <div
                  className={`pvt-fs-pad pad-${phase}`}
                  onPointerDown={handlePress}
                  role="button"
                  tabIndex={0}
                >
                  {phase === 'wait' && (
                    <div className="pvt-fs-wait-content">
                      <div className="pvt-fs-focus-ring">
                        <span className="focus-dot" />
                      </div>
                      <span className="pvt-fs-wait-hint">
                        {lang === 'en' ? 'Stay alert…' : '保持最高警覺…'}
                      </span>
                      <span className="pvt-fs-wait-sub">
                        {lang === 'en'
                          ? '(Press spacebar or tap here immediately when numbers roll)'
                          : '（看到數字跳動立即按空白鍵或點擊此處）'}
                      </span>
                    </div>
                  )}

                  {phase === 'go' && (
                    <div className="pvt-fs-go-content">
                      <span className="pvt-fs-big-number">{display}</span>
                      <span className="pvt-fs-go-action">
                        {lang === 'en' ? 'PRESS SPACEBAR NOW!' : '立即按空白鍵！'}
                      </span>
                    </div>
                  )}

                  {phase === 'feedback' && (
                    <div className="pvt-fs-feedback-content">
                      {display === '搶跑！' ? (
                        <>
                          <span className="pvt-fs-feedback-number lapse">
                            {lang === 'en' ? 'False Start!' : '搶跑！'}
                          </span>
                          <span className="pvt-fs-feedback-tag">
                            {lang === 'en'
                              ? 'Wait for red numbers before pressing'
                              : '請等待紅色數字出現後再按'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={`pvt-fs-feedback-number ${
                              +display <= 300 ? 'good' : +display <= 400 ? 'mid' : 'lapse'
                            }`}
                          >
                            {display} ms
                          </span>
                          <span className="pvt-fs-feedback-tag">
                            {+display <= 300
                              ? lang === 'en'
                                ? 'Fast Neural Reflex (NOMINAL)'
                                : '極速神經反射 (NOMINAL)'
                              : +display <= 400
                              ? lang === 'en'
                                ? 'Normal Reaction Range'
                                : '正常反應區間'
                              : lang === 'en'
                              ? 'Slow Reaction (Lapse > 500ms)'
                              : '反應遲緩 (Lapse > 500ms)'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Telemetry Dock */}
            <footer className="pvt-fs-bottom-dock">
              <div className="pvt-fs-dock-row">
                <div className="dock-meta-left">
                  <Zap size={15} style={{ color: '#00b4ff' }} />
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {lang === 'en'
                      ? `5-Trial PVT Progress: ${trial} / ${TRIALS}`
                      : `5 回合精神運動警覺測試進度：${trial} / ${TRIALS}`}
                  </span>
                </div>

                <div className="pvt-fs-trial-badges">
                  {completedRts.map((t, idx) => (
                    <span
                      key={idx}
                      className={`pvt-fs-trial-chip ${t <= 300 ? 'chip-good' : t > 500 ? 'chip-lapse' : ''}`}
                    >
                      #{idx + 1}: {t}ms
                    </span>
                  ))}
                </div>
              </div>

              <div className="rppg-fs-dock-progress">
                <div className="dock-progress-fill" style={{ width: `${(trial / TRIALS) * 100}%` }} />
              </div>
            </footer>
          </div>,
          document.body
        )}
    </>
  )
}
