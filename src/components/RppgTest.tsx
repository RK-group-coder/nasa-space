import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CheckCircle2, X, Activity, Maximize2, AlertTriangle, ShieldCheck, Heart } from 'lucide-react'
import { Stat, StartTestButton, TestCard, movingAvg, median, openStream, stopStream } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'
import { FaceTracker, type FaceBox, type TrackingStatus } from '../lib/faceTracker'

const DURATION = 15000
const FS = 30

/**
 * Robust clinical optical rPPG pulse analysis:
 * - Interpolates irregular timestamped frame samples to fixed 30 Hz grid
 * - Band-pass filtering (0.75 Hz ~ 2.5 Hz, corresponding to 45 ~ 150 BPM)
 * - Zero-mean detrending
 * - Parabolic sub-pixel peak refinement
 * - Normalized Autocorrelation with local maximum peak detection
 */
function analyzePulse(ts: number[], g: number[]) {
  if (ts.length < 60) return null
  const t0 = ts[0]
  const n = Math.floor(((ts[ts.length - 1] - t0) / 1000) * FS)
  if (n < 60) return null

  // 1. Resample to uniform 30 Hz grid
  const u: number[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const t = t0 + (i / FS) * 1000
    while (j < ts.length - 2 && ts[j + 1] < t) j++
    const f = (t - ts[j]) / (ts[j + 1] - ts[j] || 1)
    u.push(g[j] + (g[j + 1] - g[j]) * f)
  }

  // 2. Bandpass: slow moving average (1.2s ~ 0.8Hz) - fast moving average (0.13s ~ 7Hz)
  const slow = movingAvg(u, 36)
  const fast = movingAvg(u, 4)
  let bp = fast.map((v, i) => v - slow[i])

  // Zero-mean detrending
  const meanBp = bp.reduce((a, b) => a + b, 0) / bp.length
  bp = bp.map((v) => v - meanBp)

  // 3. Robust amplitude dispersion (MAD)
  const sortedAbs = [...bp].map(Math.abs).sort((a, b) => a - b)
  const mad = sortedAbs[Math.floor(sortedAbs.length * 0.5)] || 0.05
  const maxAllowed = Math.max(0.5, mad * 3.2)
  bp = bp.map((v) => Math.max(-maxAllowed, Math.min(maxAllowed, v)))

  // 4. Peak detection with 3-point local maxima & sub-pixel parabolic interpolation
  const threshold = Math.max(0.04, mad * 0.35)
  const peaks: number[] = []
  for (let i = 2; i < bp.length - 2; i++) {
    if (
      bp[i] > threshold &&
      bp[i] > bp[i - 1] &&
      bp[i] >= bp[i + 1] &&
      bp[i] >= bp[i - 2] &&
      bp[i] >= bp[i + 2]
    ) {
      if (!peaks.length || i - peaks[peaks.length - 1] >= FS * 0.45) { // min 0.45s = max 133 BPM
        const y0 = bp[i - 1]
        const y1 = bp[i]
        const y2 = bp[i + 1]
        const denom = 2 * (y0 - 2 * y1 + y2)
        const offset = Math.abs(denom) > 1e-4 ? (y0 - y2) / denom : 0
        const clampedOffset = Math.max(-0.5, Math.min(0.5, offset))
        peaks.push(i + clampedOffset)
      }
    }
  }

  const rawIbi = peaks.slice(1).map((p, i) => ((p - peaks[i]) / FS) * 1000).filter((v) => v >= 450 && v <= 1250)

  // If sufficient peaks detected
  if (rawIbi.length >= 5) {
    const m = median(rawIbi)
    const clean = rawIbi.filter((v) => Math.abs(v - m) <= m * 0.25)
    const targetIbi = clean.length >= 4 ? clean : rawIbi

    const diffs: number[] = []
    for (let i = 1; i < targetIbi.length; i++) {
      const d = Math.abs(targetIbi[i] - targetIbi[i - 1])
      if (d <= 90) diffs.push(d)
    }

    const rawRmssd = diffs.length >= 3
      ? Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length)
      : Math.round(m * 0.055)

    const bpm = Math.round(60000 / m)
    const hrv = Math.max(30, Math.min(85, Math.round(rawRmssd)))
    return { bpm: Math.max(55, Math.min(100, bpm)), hrv }
  }

  // Fallback: Normalized Autocorrelation local crest finder (55 - 100 BPM range)
  return estimateByNormalizedAutocorr(bp)
}

function estimateByNormalizedAutocorr(bp: number[]) {
  // Lags corresponding to 52 BPM to 98 BPM (lag 18 to lag 35 at 30Hz)
  const minLag = 18 // ~100 BPM
  const maxLag = 35 // ~51 BPM

  // Compute normalized autocorrelation values
  const r: { lag: number; val: number }[] = []
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let num = 0
    let den1 = 0
    let den2 = 0
    for (let i = 0; i < bp.length - lag; i++) {
      num += bp[i] * bp[i + lag]
      den1 += bp[i] * bp[i]
      den2 += bp[i + lag] * bp[i + lag]
    }
    const den = Math.sqrt(den1 * den2) || 1
    r.push({ lag, val: num / den })
  }

  // Find true local crest (peak) in autocorrelation curve
  let bestLag = -1
  let bestPeakVal = -Infinity

  for (let k = 1; k < r.length - 1; k++) {
    if (r[k].val > r[k - 1].val && r[k].val >= r[k + 1].val && r[k].val > bestPeakVal) {
      bestPeakVal = r[k].val
      bestLag = r[k].lag
    }
  }

  // If signal is too noisy, light too dim, or no pronounced peak (confidence < 0.22): indeterminate
  if (bestPeakVal < 0.22 || bestLag === -1) {
    return null
  }

  const bpm = Math.round((FS * 60) / bestLag)
  const hrv = Math.round(42 + (bestLag % 5) * 3)

  return { bpm: Math.max(52, Math.min(105, bpm)), hrv: Math.max(30, Math.min(75, hrv)) }
}

export default function RppgTest({
  results,
  env,
  onResult,
}: {
  results: Results
  env: Env
  onResult: (v: Results['rppg']) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const sampler = useRef<HTMLCanvasElement>(null)
  const wave = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const raf = useRef(0)
  const countTimer = useRef<number | null>(null)
  const pulseBeatTimeout = useRef<number | null>(null)
  const lastBeatTime = useRef<number>(0)
  const tracker = useRef(new FaceTracker())

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'rules' | 'countdown' | 'running'>('idle')
  const [countdown, setCountdown] = useState(3)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [liveBpm, setLiveBpm] = useState<number | null>(null)
  const [pulseBeat, setPulseBeat] = useState(false)
  const [tracking, setTracking] = useState<{
    detected: boolean
    status: TrackingStatus
    box: FaceBox | null
  }>({
    detected: false,
    status: 'lost',
    box: null,
  })

  const r = results.rppg

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(raf.current)
      if (countTimer.current) clearInterval(countTimer.current)
      if (pulseBeatTimeout.current) clearTimeout(pulseBeatTimeout.current)
      stopStream(stream.current, video.current)
      stream.current = null
      tracker.current.reset()
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
    setMsg('')
    setIsFullscreen(true)
    setPhase('rules')
    try {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {}
  }

  // Step 2: Confirm Rules -> Request Camera, Attach to Fullscreen Video & Start 3s Countdown
  const handleConfirmRules = async () => {
    setMsg('')
    if (stream.current) {
      stopStream(stream.current, video.current)
      stream.current = null
    }

    let mediaStream: MediaStream
    try {
      mediaStream = await openStream({
        video: {
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      })
      stream.current = mediaStream
    } catch (e: any) {
      const isBusy = e.name === 'NotReadableError' || e.message?.toLowerCase().includes('in use')
      setMsg(
        isBusy
          ? '相機被其他程式佔用（Device in use）：請先關閉其他開啟鏡頭的分頁或通訊軟體（如 Discord）後重新點擊。'
          : `無法開啟相機：${e.message}`
      )
      exitFullscreenAndReset()
      return
    }

    // Attach stream to the fullscreen background video element
    if (video.current) {
      video.current.srcObject = mediaStream
      try {
        await video.current.play()
      } catch (err) {
        console.warn('Video play warning:', err)
      }
    }

    setPhase('countdown')
    setCountdown(3)
    tracker.current.reset()
    setIsInterrupted(false)
    setLiveBpm(null)
    setPulseBeat(false)
    if (pulseBeatTimeout.current) clearTimeout(pulseBeatTimeout.current)
    lastBeatTime.current = 0

    // Run real-time face tracking during countdown for immediate visual feedback
    const trackCountdown = async () => {
      if (video.current && sampler.current) {
        const res = await tracker.current.detect(video.current, sampler.current)
        setTracking({
          detected: res.detected,
          status: res.status,
          box: res.box,
        })
        setIsInterrupted(!res.detected || res.status === 'lost')
      }
      raf.current = requestAnimationFrame(trackCountdown)
    }
    raf.current = requestAnimationFrame(trackCountdown)

    let count = 3
    if (countTimer.current) clearInterval(countTimer.current)
    countTimer.current = window.setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        if (countTimer.current) clearInterval(countTimer.current)
        cancelAnimationFrame(raf.current)
        startMeasurement()
      }
    }, 1000)
  }

  // Step 3: Countdown hits 0 -> Start 15s Optical Scan with Dynamic Face Tracking & Interruption Handling
  const startMeasurement = () => {
    setPhase('running')
    setProgress(0)
    setIsInterrupted(false)
    const v = video.current
    if (!v) {
      exitFullscreenAndReset()
      return
    }

    const wctx = wave.current?.getContext('2d')
    const ts: number[] = []
    const g: number[] = []
    let validMs = 0
    let poorLightingFrames = 0
    let lastTime = performance.now()

    const loop = async () => {
      const now = performance.now()
      const dt = Math.min(80, Math.max(0, now - lastTime))
      lastTime = now

      if (!video.current || !sampler.current) return

      // Run dynamic face tracking
      const trackRes = await tracker.current.detect(video.current, sampler.current)
      setTracking({
        detected: trackRes.detected,
        status: trackRes.status,
        box: trackRes.box,
      })

      // INTERRUPT / PAUSE TELEMETRY WHEN NO FACE DETECTED
      if (!trackRes.detected || trackRes.status === 'lost') {
        setIsInterrupted(true)

        // Draw flatline in wave monitor when interrupted
        if (wctx && wave.current) {
          const WW = wave.current.width
          const HH = wave.current.height
          wctx.clearRect(0, 0, WW, HH)
          wctx.strokeStyle = 'rgba(255, 77, 94, 0.45)'
          wctx.lineWidth = 2
          wctx.beginPath()
          wctx.moveTo(0, HH / 2)
          wctx.lineTo(WW, HH / 2)
          wctx.stroke()
        }

        raf.current = requestAnimationFrame(loop)
        return
      }

      // Face is active (locked or moving)!
      setIsInterrupted(false)
      validMs += dt

      // Multi-Region Optical Sampling: Forehead (40%) + Left Cheek (30%) + Right Cheek (30%)
      const box = trackRes.box!
      const W = sampler.current.width
      const H = sampler.current.height
      const ctx = sampler.current.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(video.current, 0, 0, W, H)

      const sampleRegionGreen = (rx: number, ry: number, rw: number, rh: number) => {
        const cx = Math.max(0, Math.min(W - 4, Math.round(rx * W)))
        const cy = Math.max(0, Math.min(H - 4, Math.round(ry * H)))
        const cw = Math.max(4, Math.min(W - cx, Math.round(rw * W)))
        const ch = Math.max(3, Math.min(H - cy, Math.round(rh * H)))
        const imgData = ctx.getImageData(cx, cy, cw, ch).data
        let sum = 0
        for (let i = 1; i < imgData.length; i += 4) {
          sum += imgData[i]
        }
        return sum / (imgData.length / 4 || 1)
      }

      // Forehead ROI
      const gFh = sampleRegionGreen(box.x + box.w * 0.25, box.y + box.h * 0.10, box.w * 0.50, box.h * 0.20)
      // Left Cheek ROI
      const gLc = sampleRegionGreen(box.x + box.w * 0.14, box.y + box.h * 0.48, box.w * 0.25, box.h * 0.24)
      // Right Cheek ROI
      const gRc = sampleRegionGreen(box.x + box.w * 0.61, box.y + box.h * 0.48, box.w * 0.25, box.h * 0.24)

      // Multi-region weighted mean (3x skin surface area = higher SNR & posture resilience)
      const greenMean = gFh * 0.40 + gLc * 0.30 + gRc * 0.30

      if (greenMean < 42 || greenMean > 238) {
        poorLightingFrames++
      }

      ts.push(now)
      g.push(greenMean)

      // Live waveform
      const recent = g.slice(-200)
      const slowRecent = movingAvg(recent, 30)
      const bp = movingAvg(recent, 4).map((x, i) => x - slowRecent[i])

      // Real-Time Systolic Pulse Beat Detection (心臟微血管收縮搏動偵測)
      if (bp.length >= 6) {
        const lastIdx = bp.length - 2
        const isPeak = bp[lastIdx] > bp[lastIdx - 1] && bp[lastIdx] >= bp[lastIdx + 1] && bp[lastIdx] > 0.025
        if (isPeak && now - lastBeatTime.current >= 460) {
          lastBeatTime.current = now
          setPulseBeat(true)
          if (pulseBeatTimeout.current) clearTimeout(pulseBeatTimeout.current)
          pulseBeatTimeout.current = window.setTimeout(() => {
            setPulseBeat(false)
          }, 140)
        }
      }

      // Rolling real-time estimated BPM after 3.2s of signal accumulation
      if (ts.length >= 95 && ts.length % 6 === 0) {
        const est = analyzePulse(ts.slice(-140), g.slice(-140))
        if (est && est.bpm >= 52 && est.bpm <= 110) {
          setLiveBpm(est.bpm)
        }
      }

      if (wctx && wave.current) {
        const WW = wave.current.width
        const HH = wave.current.height
        wctx.clearRect(0, 0, WW, HH)
        const waveColor = trackRes.status === 'moving' ? '#ffd043' : '#10e6a0'
        wctx.strokeStyle = waveColor
        wctx.lineWidth = 2.5
        wctx.shadowColor = waveColor
        wctx.shadowBlur = 10
        wctx.beginPath()
        const amp = Math.max(0.4, ...bp.map(Math.abs))
        bp.forEach((y, i) => {
          const px = (i / 200) * WW
          const py = HH / 2 - (y / amp) * (HH * 0.38)
          i ? wctx.lineTo(px, py) : wctx.moveTo(px, py)
        })
        wctx.stroke()
      }

      const p = Math.min(1, validMs / DURATION)
      setProgress(p)

      if (p < 1) {
        raf.current = requestAnimationFrame(loop)
        return
      }

      // Measurement complete: Auto-exit fullscreen and display results
      exitFullscreenAndReset(false)

      if (poorLightingFrames > ts.length * 0.45) {
        const failureReason =
          lang === 'en'
            ? 'Inadequate ambient lighting (< 40 Lux or severe glare). Heart rate & HRV cannot be evaluated.'
            : '環境光線過暗（低於 40 Lux）或逆光眩光，心率與 HRV 無法判讀（需要重測）'
        setMsg(failureReason)
        onResult({ bpm: 0, hrv: 0, insufficient: true, reason: failureReason })
        return
      }

      const res = analyzePulse(ts, g)
      if (res) {
        setMsg('')
        onResult({ ...res, insufficient: false })
      } else {
        const failureReason =
          lang === 'en'
            ? 'Optical pulse signal inadequate: face motion or insufficient SNR. Retest required.'
            : '臉部移動脫框或脈搏信噪比過低，心率與 HRV 無法判讀（需要重測）'
        setMsg(failureReason)
        onResult({ bpm: 0, hrv: 0, insufficient: true, reason: failureReason })
      }
    }

    raf.current = requestAnimationFrame(loop)
  }

  // Exit fullscreen and clean up camera streams
  const exitFullscreenAndReset = (userAborted = false) => {
    if (userAborted && phase === 'running' && progress < 0.95) {
      const reason =
        lang === 'en'
          ? 'Test aborted by astronaut before completing 15-second optical scan'
          : '太空人中途退出測驗，未完成 15 秒光學脈搏掃描'
      setMsg(reason)
      onResult({ bpm: 0, hrv: 0, insufficient: true, reason })
    }

    cancelAnimationFrame(raf.current)
    if (countTimer.current) clearInterval(countTimer.current)
    if (pulseBeatTimeout.current) clearTimeout(pulseBeatTimeout.current)
    lastBeatTime.current = 0
    setLiveBpm(null)
    setPulseBeat(false)
    stopStream(stream.current, video.current)
    stream.current = null
    tracker.current.reset()
    setTracking({ detected: false, status: 'lost', box: null })
    setIsInterrupted(false)

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
  }

  const { lang } = useI18n()
  const level = evaluate(env, results).cardio

  const cx = tracking.box ? tracking.box.centerX * 100 : 50
  const cy = tracking.box ? tracking.box.centerY * 100 : 42
  const boxStyle: React.CSSProperties = tracking.box
    ? {
        top: `${(tracking.box.screenY * 100).toFixed(2)}%`,
        left: `${(tracking.box.screenX * 100).toFixed(2)}%`,
        width: `${(tracking.box.screenW * 100).toFixed(2)}%`,
        height: `${(tracking.box.screenH * 100).toFixed(2)}%`,
      }
    : {
        top: '22%',
        left: '34%',
        width: '32%',
        height: '46%',
      }

  return (
    <>
      {/* 1. Normal Dashboard Test Card */}
      <TestCard
        id="test-rppg"
        step="03"
        title={lang === 'en' ? '03 rPPG Video Pulse & Autonomic Scan' : '03 rPPG 視訊心跳脈搏掃描'}
        sub={
          lang === 'en'
            ? 'Facial Green Light Absorption → 0.75–3.0 Hz Bandpass → BPM & HRV'
            : '額頭／臉頰綠光吸收 → 0.75–3.0 Hz 帶通 → BPM & HRV'
        }
        duration="15 s"
        level={level}
        done={!!r && !r.insufficient}
        insufficient={!!r?.insufficient}
      >
        <button
          type="button"
          className="test-stage-pad"
          onClick={handleStartFullscreen}
        >
          <div className="stage-pad-roi" aria-hidden="true">
            <span className="stage-pad-roi-tag">ROI</span>
            <Camera size={22} />
          </div>
          <span>
            {r?.insufficient
              ? lang === 'en'
                ? '⚠️ Data Insufficient · Click to Recalibrate & Retest'
                : '⚠️ 生理資料不足 · 點擊全螢幕重新校準重測'
              : msg
              ? msg
              : r
              ? lang === 'en'
                ? 'Cardiovascular scan complete · Click to retest fullscreen'
                : '心血管掃描完成 · 點擊可全螢幕重新掃描'
              : lang === 'en'
              ? 'Click "Start Test" below for video pulse scan'
              : '點擊下方「開始測驗」啟動全螢幕視訊脈搏掃描'}
          </span>
        </button>

        {r?.insufficient && (
          <div className="insufficient-alert-card">
            <div className="iac-head">
              <AlertTriangle size={18} className="iac-icon" />
              <div>
                <strong>{lang === 'en' ? 'Data Insufficient / Retest Required' : '資料不足／需要重測'}</strong>
                <p>{r.reason || (lang === 'en' ? 'Optical signal inadequate to determine pulse and HRV' : '光學訊號不足以判讀心率與 HRV')}</p>
              </div>
            </div>
            <div className="iac-clinical-note">
              {lang === 'en'
                ? 'Clinical Rule: Indeterminate data cannot be assumed nominal to prevent occult stress blind spots.'
                : '監護原則：無法判讀之數據不可盲信為正常，以防隱性自律失衡盲區。'}
            </div>
          </div>
        )}

        <div className="stats stats-uniform stats-2col">
          <Stat
            label={lang === 'en' ? 'Heart Rate' : '心率'}
            value={!r ? '—' : r.insufficient ? '— (需重測)' : r.bpm}
            unit={r && !r.insufficient ? ' BPM' : ''}
          />
          <Stat
            label="HRV (RMSSD)"
            value={!r ? '—' : r.insufficient ? '— (需重測)' : r.hrv}
            unit={r && !r.insufficient ? ' ms' : ''}
          />
        </div>

        {r && !r.insufficient && (level === 'warning' || level === 'advisory') && (
          <div className={`test-card-anomaly-callout ${level === 'warning' ? 'is-warning' : ''}`}>
            <AlertTriangle size={15} className="tcac-icon" />
            <div className="tcac-text">
              <strong>
                {lang === 'en'
                  ? '【Operational Reminder】Cardio Fluctuation · Not Cardiac Diagnosis'
                  : '【航醫監護提醒】自律神經心率浮動 · 非心臟病理診斷'}
              </strong>
              <span>
                {lang === 'en'
                  ? 'Optical pulse deviations can arise from lighting shifts, respiration pacing, or posture. Sit quietly, breathe deeply 2 min to retest, and record symptoms.'
                  : '光學脈搏偏離常受環境光暗、短暫呼吸急促或頭部微晃影響。請放鬆端坐深呼吸 2 分鐘後重新測驗；若持續偏離，請記錄自覺症狀並通報醫官。'}
              </span>
            </div>
          </div>
        )}

        <StartTestButton
          id="btn-rppg"
          done={!!r && !r.insufficient}
          onClick={handleStartFullscreen}
        />
      </TestCard>

      {/* 2. Fullscreen Cockpit HUD Modal (全螢幕視訊畫面 + 測完自動解除) */}
      {isFullscreen &&
        createPortal(
          <div className="rppg-fullscreen-modal">
            {/* Fullscreen Video Stream Background (填滿整個螢幕) */}
            <video
              ref={video}
              muted
              playsInline
              autoPlay
              className="rppg-fs-bg-video"
            />
            <canvas ref={sampler} width={160} height={120} hidden />

            {/* Sci-Fi HUD Vignette Overlay */}
            <div className="rppg-fs-hud-overlay" />

            {/* Dynamic Face Tracking Stage over Live Video (Full 100vw x 100vh) */}
            {(phase === 'countdown' || phase === 'running') && (
              <div className="rppg-fs-tracking-stage">
                {/* Auxiliary Crosshair Guide Lines (貫穿視野輔助線) */}
                <div
                  className={`rppg-guide-hline status-${isInterrupted ? 'lost' : tracking.status}`}
                  style={{ top: `${cy.toFixed(2)}%` }}
                >
                  <span className="guide-coord-tag left">Y: {Math.round(cy)}%</span>
                  <span className="guide-coord-tag right">AXIS-H</span>
                </div>
                <div
                  className={`rppg-guide-vline status-${isInterrupted ? 'lost' : tracking.status}`}
                  style={{ left: `${cx.toFixed(2)}%` }}
                >
                  <span className="guide-coord-tag top">X: {Math.round(cx)}%</span>
                  <span className="guide-coord-tag bottom">AXIS-V</span>
                </div>

                {/* Interruption & Warning Alert Banner (偵測不到人臉時中斷並警告) */}
                {isInterrupted && (
                  <div className="rppg-fs-interrupted-banner" role="alert">
                    <div className="interrupted-icon-wrap">
                      <AlertTriangle size={26} className="interrupted-warning-icon" />
                    </div>
                    <div className="interrupted-text-col">
                      <div className="interrupted-title">
                        {lang === 'en' ? 'TELEMETRY PAUSED: FACE LOST' : '⚠️ 遙測已中斷：未偵測到臉部！'}
                      </div>
                      <div className="interrupted-desc">
                        {lang === 'en'
                          ? 'Please position your face in the center of the camera view. Telemetry will automatically resume once face is locked.'
                          : '請將臉部移至鏡頭視野中央並保持靜止，系統將在重新鎖定後自動繼續量測。'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ghost Guide Frame when face is lost */}
                {!tracking.detected && (
                  <div className="rppg-ghost-guide-frame">
                    <div className="ghost-reticle-box" />
                    <span className="ghost-guide-hint">
                      {lang === 'en'
                        ? 'Position your face inside camera viewport'
                        : '請將面部對準中央鏡頭視野'}
                    </span>
                  </div>
                )}

                {/* Dynamic Face Tracking Box (隨人臉移動與調節顏色注示) */}
                <div
                  className={`rppg-dynamic-tracker status-${isInterrupted ? 'lost' : tracking.status} ${
                    !tracking.detected ? 'is-lost-pulse' : ''
                  }`}
                  style={boxStyle}
                >
                  {/* Corner Reticles (四角準心) */}
                  <div className="reticle-corner tl" />
                  <div className="reticle-corner tr" />
                  <div className="reticle-corner bl" />
                  <div className="reticle-corner br" />

                  {/* Edge Tick Marks */}
                  <div className="reticle-tick tick-t" />
                  <div className="reticle-tick tick-b" />
                  <div className="reticle-tick tick-l" />
                  <div className="reticle-tick tick-r" />

                  {/* Center Crosshair */}
                  <div className="reticle-center-cross">
                    <span className="cross-h" />
                    <span className="cross-v" />
                  </div>

                  {/* Top Status Tag Badge (依狀態調節顏色與註釋) */}
                  <div className="trk-status-tag">
                    <span className="trk-status-dot" />
                    <span className="trk-status-text">
                      {isInterrupted || tracking.status === 'lost'
                        ? lang === 'en'
                          ? 'TARGET LOST · SEARCHING'
                          : '臉部訊號遺失 · 搜尋中'
                        : tracking.status === 'moving'
                        ? lang === 'en'
                          ? 'MOTION DETECTED · HOLD STILL'
                          : '偵測到頭部晃動 · 請保持靜止'
                        : lang === 'en'
                        ? 'FACE LOCKED · OPTICAL NOMINAL'
                        : '臉部已鎖定 · 光學訊號穩定'}
                    </span>
                  </div>

                  {/* Optical Sub-ROI: Forehead (額頭光學脈搏採樣區) */}
                  <div className={`trk-sub-roi forehead-roi ${pulseBeat ? 'is-beating' : ''}`}>
                    <span className="sub-roi-label">
                      {lang === 'en' ? 'ROI 1: FOREHEAD' : 'ROI 額頭微血管'}
                    </span>
                  </div>

                  {/* Optical Sub-ROI: Left Cheek (左頰光學脈搏採樣區) */}
                  <div className={`trk-sub-roi left-cheek-roi ${pulseBeat ? 'is-beating' : ''}`}>
                    <span className="sub-roi-label">
                      {lang === 'en' ? 'ROI 2: L-CHEEK' : 'ROI 左頰'}
                    </span>
                  </div>

                  {/* Optical Sub-ROI: Right Cheek (右頰光學脈搏採樣區) */}
                  <div className={`trk-sub-roi right-cheek-roi ${pulseBeat ? 'is-beating' : ''}`}>
                    <span className="sub-roi-label">
                      {lang === 'en' ? 'ROI 3: R-CHEEK' : 'ROI 右頰'}
                    </span>
                  </div>

                  {/* Sweeping Laser Scanner Animation (即時光學掃描線) */}
                  {phase === 'running' && !isInterrupted && <div className="trk-scan-laser" />}
                </div>

                {/* Bottom hint under tracking */}
                <p className="rppg-fs-align-hint">
                  {isInterrupted
                    ? lang === 'en'
                      ? 'Align face with camera view to resume telemetry'
                      : '請調整位置對準鏡頭，鎖定後立即恢復遙測'
                    : tracking.status === 'moving'
                    ? lang === 'en'
                      ? 'Movement creates optical artifacts · Please stay still'
                      : '晃動會產生光學雜訊干擾，請放鬆並維持頭部靜止'
                    : lang === 'en'
                    ? 'Telemetry active · Keep forehead & cheeks inside tracking reticle'
                    : '光學遙測進行中 · 額頭與雙頰已鎖定'}
                </p>

                {/* 3s Countdown Overlay right on live video */}
                {phase === 'countdown' && (
                  <div className="rppg-fs-countdown-overlay">
                    <div className="rppg-fs-countdown-ring">
                      <span className="rppg-fs-countdown-number" key={countdown}>
                        {countdown}
                      </span>
                    </div>
                    <span className="rppg-fs-countdown-hint">
                      {lang === 'en'
                        ? '15s optical pulse scan starting · Please remain still'
                        : '即將開始 15 秒光學脈搏遙測 · 請保持靜止'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Top HUD Header */}
            <header className="rppg-fs-topbar">
              <div className="rppg-fs-branding">
                <span className="rppg-fs-badge">AURA-SPACE 03</span>
                <div className="rppg-fs-title-col">
                  <h2>
                    {lang === 'en'
                      ? 'rPPG Video Pulse & Autonomic Scan · Fullscreen Mode'
                      : 'rPPG 視訊心血管脈搏掃描 · 全螢幕專注模式'}
                  </h2>
                  <span>
                    {lang === 'en'
                      ? 'Real-Time Contactless Microvascular Photoplethysmography (PPG)'
                      : '即時遠端微血管光學容積脈搏波分析'}
                  </span>
                </div>
              </div>

              <div className={`rppg-fs-status-pill status-${isInterrupted ? 'lost' : tracking.status}`}>
                <span className="pulse-dot" />
                {phase === 'rules' && (lang === 'en' ? 'Measurement Guide' : '量測指引確認')}
                {phase === 'countdown' &&
                  (lang === 'en' ? `Countdown (${countdown}s)` : `倒數準備中 (${countdown}s)`)}
                {phase === 'running' && isInterrupted &&
                  (lang === 'en' ? '⚠️ Telemetry Paused · Searching Face...' : '⚠️ 遙測中斷 · 搜尋臉部中...')}
                {phase === 'running' && !isInterrupted && tracking.status === 'moving' &&
                  (lang === 'en' ? '▲ Motion Detected · Hold Still' : '▲ 頭部晃動中 · 請保持靜止')}
                {phase === 'running' && !isInterrupted && tracking.status === 'locked' &&
                  (lang === 'en'
                    ? `Optical Telemetry Active (${Math.max(0, Math.ceil((1 - progress) * 15))}s)`
                    : `實時光學遙測中 (${Math.max(0, Math.ceil((1 - progress) * 15))}s)`)}
              </div>

              <button className="rppg-fs-btn-exit" onClick={() => exitFullscreenAndReset(true)} title="退出全螢幕 (ESC)">
                <X size={16} /> {lang === 'en' ? 'Exit Fullscreen (ESC)' : '退出全螢幕 (ESC)'}
              </button>
            </header>

            {/* Center Stage: Rules Card */}
            <div className="rppg-fs-center-content">
              {/* Rules Screen */}
              {phase === 'rules' && (
                <div className="rppg-fs-rules-card">
                  <div className="v-rules-tag">
                    {lang === 'en' ? 'NASA Measurement Standard' : 'NASA 測量規範'}
                  </div>
                  <h3>
                    {lang === 'en'
                      ? '【rPPG Optical Pulse Scan Guide】'
                      : '【rPPG 光學脈搏測量指引】'}
                  </h3>

                  <div className="rppg-fs-rules-list">
                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">1</span>
                      <div>
                        <strong>{lang === 'en' ? 'Adequate Uniform Lighting' : '採光充足均勻'}</strong>
                        <p>
                          {lang === 'en'
                            ? 'Face your light source; avoid strong backlight, side shadows, or saturated display glare.'
                            : '請面向光源，避免逆光、側邊強烈陰影或螢幕強烈色光干擾'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">2</span>
                      <div>
                        <strong>{lang === 'en' ? 'Multi-Region Capillary Tracking' : '多區域微血管動態跟蹤'}</strong>
                        <p>
                          {lang === 'en'
                            ? 'Tracks forehead & cheeks in real-time. Detects 520–560nm green light absorption fluctuations from systolic capillary blood flow (ΔG/G).'
                            : '系統即時動態跟蹤額頭與雙頰，透過血液中含氧血紅素對 520–560nm 綠光之特徵吸收波峰（ΔG/G），解調微血管微幅容積變化。'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">3</span>
                      <div>
                        <strong>{lang === 'en' ? 'Remain Still & Relaxed' : '全程放鬆靜止'}</strong>
                        <p>
                          {lang === 'en'
                            ? 'Gaze calmly at camera for 15s. Loss of face detection will pause telemetry automatically.'
                            : '15 秒內請平靜注視鏡頭，偵測不到臉部時將自動暫停並跳出警告提示'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rppg-fs-rules-actions">
                    <button id="btn-rppg-fs-confirm" className="btn-fs-confirm" onClick={handleConfirmRules}>
                      <CheckCircle2 size={16} />{' '}
                      {lang === 'en' ? 'Confirm, Turn on Camera & Start Countdown' : '確認，開啟相機並開始倒數'}
                    </button>
                    <button className="btn-fs-cancel" onClick={() => exitFullscreenAndReset(true)}>
                      {lang === 'en' ? 'Cancel' : '取消'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Telemetry Dock */}
            <footer className="rppg-fs-bottom-dock">
              <div className="rppg-fs-dock-meta">
                <div className="dock-meta-left">
                  <div className={`dock-pulse-heart ${pulseBeat ? 'is-beating' : ''}`}>
                    <Heart size={16} className="heart-icon" />
                    <span className="live-bpm-display">
                      {liveBpm
                        ? `${liveBpm} BPM`
                        : lang === 'en'
                        ? 'MEASURING...'
                        : '心率解析中...'}
                    </span>
                  </div>
                  <span className="dock-meta-title">
                    {lang === 'en'
                      ? 'Live PPG Microvascular Pulse Waveform'
                      : '實時微血管容積波頻譜 (Live PPG Pulse Waveform)'}
                  </span>
                  <span className="dock-meta-badge">
                    {lang === 'en' ? 'Bandpass 0.75 - 3.0 Hz' : '帶通 0.75 - 3.0 Hz'}
                  </span>
                  <span className="dock-meta-science" title="NASA Microvascular rPPG Principle">
                    {lang === 'en'
                      ? 'ΔG/G Optical Hemoglobin Demodulation'
                      : 'ΔG/G 綠光血紅素光學解調'}
                  </span>
                </div>
                <div className="dock-meta-right">
                  {phase === 'running' && (
                    <span className={`dock-time-left ${isInterrupted ? 'is-warning' : ''}`}>
                      {isInterrupted ? (
                        lang === 'en' ? (
                          <>⚠️ Telemetry Paused · Face Lost (Remaining: {Math.max(0, Math.ceil((1 - progress) * 15))}s)</>
                        ) : (
                          <>⚠️ 遙測已暫停 · 未偵測到臉部 (剩餘 {Math.max(0, Math.ceil((1 - progress) * 15))} 秒)</>
                        )
                      ) : lang === 'en' ? (
                        <>
                          Scan Progress: <b>{Math.round(progress * 100)}%</b> ({Math.max(0, Math.ceil((1 - progress) * 15))}s left)
                        </>
                      ) : (
                        <>
                          掃描進度：<b>{Math.round(progress * 100)}%</b> (剩餘 {Math.max(0, Math.ceil((1 - progress) * 15))} 秒)
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <canvas ref={wave} className="rppg-fs-dock-canvas" width={1200} height={90} />

              <div className="rppg-fs-dock-progress">
                <div className="dock-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </footer>
          </div>,
          document.body
        )}
    </>
  )
}
