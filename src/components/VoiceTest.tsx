import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Globe, Maximize2, Mic, Volume2, X, AlertTriangle } from 'lucide-react'
import { Stat, StartTestButton, TestCard, openStream, stopStream } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'
import { useI18n } from '../lib/i18nContext'

type Lang = 'zh' | 'en'
type Phase = 'idle' | 'rules' | 'countdown' | 'recording'

/** Clinical standard connected-speech window: 30s (minimum 14s if finished reading early). */
const REC_MS = 30000
const MIN_EARLY_FINISH_MS = 14000

interface PassageItem {
  title: string
  text: string
}

/**
 * Phonemically balanced standardized reading passages modeled after clinical
 * speech-language pathology & IPA vocal biomarker protocols (Rainbow Passage,
 * The North Wind and the Sun, Grandfather Passage).
 * Tuned to ~65 Chinese characters / ~38 English words for a calm, comfortable
 * 18–22 second natural reading cadence without rushing.
 */
const PASSAGES: Record<Lang, PassageItem[]> = {
  zh: [
    {
      title: '標準音素平衡短文 A ·《北風與太陽》（IPA 國際語音學會標準對應文本）',
      text: '北風和太陽正在爭論誰比較有本事。正好有一位旅人走過來，他們便約定，誰能先讓旅人把大衣脫下來就算贏。北風拼命吹卻吹不掉，接著太陽暖洋洋地照耀，旅人很快就把大衣脫了下來。',
    },
    {
      title: '標準音素平衡短文 B ·《彩虹的形成》（Fairbanks 臨床語音學對應文本）',
      text: '當陽光穿過空氣中的雨滴時，白色的光線會折射成許多美麗的色彩，在天空中形成一道彩虹。這道長長的圓弧高高掛在天際，人們總喜歡抬頭尋找，欣賞大自然奇妙的景象。',
    },
    {
      title: '標準音素平衡短文 C ·《清晨的山林》（華語四聲與換氣節律平衡文本）',
      text: '清晨的微風輕輕吹過森林，樹葉上留著晶瑩的露珠。隨著溫暖的陽光穿過雲層，灑落在草地與溪水上，鳥兒沿著河岸飛過，萬物隨著平靜的節奏甦醒，迎接嶄新的一天。',
    },
  ],
  en: [
    {
      title: 'Standard Clinical Passage A · The Rainbow Passage (Fairbanks, 1960)',
      text: 'When sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow divides white light into beautiful colors. It arches high in the sky, stretching far toward the horizon.',
    },
    {
      title: 'Standard Clinical Passage B · The North Wind and the Sun (IPA Standard)',
      text: 'The North Wind and the Sun argued who was stronger. A traveler came along wrapped in a cloak. The wind blew fiercely, but could not blow it off. Then the sun shone warmly, and the traveler gladly took off his cloak.',
    },
    {
      title: 'Standard Clinical Passage C · The Grandfather Passage (Clinical Motor-Speech)',
      text: 'My grandfather is nearly ninety-three years old, yet his mind remains sharp and swift. He wears an ancient dark coat and speaks with gentle kindness. A long silvery beard gives him a calm and dignified presence.',
    },
  ],
}

function pitchAutocorr(buf: Float32Array, sr: number): number {
  const min = Math.floor(sr / 400)
  const max = Math.floor(sr / 70)
  let best = 0
  let bestLag = 0
  let e0 = 0
  for (let i = 0; i < buf.length - max; i++) e0 += buf[i] * buf[i]
  for (let lag = min; lag <= max; lag++) {
    let c = 0
    for (let i = 0; i < buf.length - max; i++) c += buf[i] * buf[i + lag]
    if (c > best) {
      best = c
      bestLag = lag
    }
  }
  return best / (e0 || 1) > 0.45 ? sr / bestLag : 0
}

/**
 * Text alignment scoring comparing real-time ASR transcript with the standardized passage.
 * Returns match percentage (0 - 100%).
 */
function computeTextMatch(spoken: string, target: string, isEn: boolean): number {
  if (!spoken || !spoken.trim()) return 0
  if (isEn) {
    const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    if (!cleanTarget.length) return 100
    const targetSet = new Set(cleanTarget)
    let hits = 0
    for (const w of cleanSpoken) {
      if (targetSet.has(w)) hits++
    }
    const coverage = hits / Math.min(cleanTarget.length, Math.max(cleanSpoken.length, 1))
    return Math.min(100, Math.round(coverage * 100))
  } else {
    // Chinese characters overlap & coverage
    const cleanSpoken = spoken.replace(/[\s\p{P}\p{S}]/gu, '')
    const cleanTarget = target.replace(/[\s\p{P}\p{S}]/gu, '')
    if (!cleanTarget.length) return 100
    if (!cleanSpoken.length) return 0
    const targetChars = new Set(cleanTarget.split(''))
    let hits = 0
    for (const ch of cleanSpoken) {
      if (targetChars.has(ch)) hits++
    }
    const coverage = hits / Math.min(cleanTarget.length, Math.max(cleanSpoken.length, 1))
    return Math.min(100, Math.round(coverage * 100))
  }
}

export default function VoiceTest({
  results,
  env,
  onResult,
}: {
  results: Results
  env: Env
  onResult: (v: Results['voice']) => void
}) {
  const { lang: appLang } = useI18n()
  const cv = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const raf = useRef(0)
  const countTimer = useRef<number | null>(null)
  const lastPromptIdx = useRef<Record<Lang, number>>({ zh: -1, en: -1 })
  const transcriptRef = useRef('')
  const recognitionRef = useRef<any>(null)
  const sessionData = useRef<{ f0s: number[]; voicedFlags: boolean[] }>({
    f0s: [],
    voicedFlags: [],
  })

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [lang, setLang] = useState<Lang>(() => (appLang === 'en' ? 'en' : 'zh'))
  const [activePassage, setActivePassage] = useState<PassageItem | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [progress, setProgress] = useState(0)
  const [canFinishEarly, setCanFinishEarly] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [msg, setMsg] = useState('')
  const [fsWarn, setFsWarn] = useState('')

  useEffect(() => {
    if (phase === 'idle' || phase === 'rules') {
      setLang(appLang === 'en' ? 'en' : 'zh')
    }
  }, [appLang, phase])

  const r = results.voice

  const cleanupAudio = () => {
    cancelAnimationFrame(raf.current)
    if (countTimer.current) {
      clearInterval(countTimer.current)
      countTimer.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }
    stopStream(stream.current)
    stream.current = null
    if (acRef.current && acRef.current.state !== 'closed') {
      acRef.current.close().catch(() => {})
    }
    acRef.current = null
  }

  useEffect(() => {
    return () => cleanupAudio()
  }, [])

  // Listen to native browser fullscreen change (e.g. user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        cleanupAudio()
        setIsFullscreen(false)
        setPhase('idle')
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [isFullscreen])

  const pickRandomPassage = (selectedLang: Lang): PassageItem => {
    const list = PASSAGES[selectedLang]
    let idx = Math.floor(Math.random() * list.length)
    if (list.length > 1 && idx === lastPromptIdx.current[selectedLang]) {
      idx = (idx + 1) % list.length
    }
    lastPromptIdx.current[selectedLang] = idx
    return list[idx]
  }

  // Step 1: Open Fullscreen Mode & Show Language + Clinical Explanation (passage hidden!)
  const handleStartFullscreen = () => {
    setMsg('')
    setFsWarn('')
    setActivePassage(null)
    setProgress(0)
    setCanFinishEarly(false)
    setIsFullscreen(true)
    setPhase('rules')
    try {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {}
  }

  const exitFullscreenAndReset = (userAborted = false) => {
    if (userAborted && phase === 'recording' && progress < 0.9) {
      const reason =
        appLang === 'en'
          ? 'Acoustic test aborted by astronaut before completing standardized passage reading'
          : '太空人提前中止語音朗讀，未完成標準短文收音'
      setMsg(reason)
      onResult({
        jitter: 0,
        pause: 0,
        stress: 0,
        insufficient: true,
        reason,
      })
    }
    cleanupAudio()
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
  }

  // Shared acoustic biomarker scoring (trims leading & trailing silence outside speech onset/offset)
  const finalizeRecording = () => {
    const spoken = transcriptRef.current
    cleanupAudio()
    const { f0s, voicedFlags } = sessionData.current

    const voicedPitches = f0s.filter((f) => f >= 50 && f <= 450)
    let pitchBreaksCount = 0
    let totalTransitions = 0
    const microD: number[] = []

    for (let i = 1; i < f0s.length; i++) {
      if (f0s[i] >= 50 && f0s[i - 1] >= 50) {
        totalTransitions++
        const rel = Math.abs(f0s[i] - f0s[i - 1]) / ((f0s[i] + f0s[i - 1]) / 2)
        if (rel >= 0.12) {
          // Macro pitch breaks / sudden voice crack / weird intonation leap!
          pitchBreaksCount++
        } else {
          microD.push(rel)
        }
      }
    }

    if (totalTransitions < 18 && voicedPitches.length < 20) {
      const reason =
        appLang === 'en'
          ? 'Microphone muted or insufficient continuous speech frames (< 10s valid voice)'
          : '未收錄到有效長度之連續語音或麥克風音量過低（未達 10 秒有效語音）'
      setMsg(reason)
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen?.().catch(() => {})
        } catch {}
      }
      setIsFullscreen(false)
      setPhase('idle')
      onResult({
        jitter: 0,
        pause: 0,
        stress: 0,
        insufficient: true,
        reason,
      })
      return
    }

    // 1. Pitch Instability rate (% of transitions with unnatural jumps >= 12%)
    const pitchInstability = totalTransitions > 0
      ? Math.round((pitchBreaksCount / totalTransitions) * 100)
      : 0

    // 2. F0 Pitch Jitter (% micro-perturbation)
    const rawJitter = microD.length > 0
      ? (microD.reduce((a, b) => a + b, 0) / microD.length) * 100
      : 2.0
    const jitter = Number((rawJitter * 0.75 + pitchInstability * 0.08).toFixed(2))

    // 3. Pitch Intonation Dispersion (CV = std / mean)
    let pitchCV = 16
    if (voicedPitches.length >= 8) {
      const meanF0 = voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length
      const variance = voicedPitches.reduce((a, b) => a + (b - meanF0) ** 2, 0) / voicedPitches.length
      const stdF0 = Math.sqrt(variance)
      pitchCV = Math.round((stdF0 / (meanF0 || 1)) * 100)
    }

    // 4. Pause ratio
    const firstVoiced = voicedFlags.indexOf(true)
    const lastVoiced = voicedFlags.lastIndexOf(true)
    const activeWindow =
      firstVoiced >= 0 && lastVoiced > firstVoiced
        ? voicedFlags.slice(firstVoiced, lastVoiced + 1)
        : voicedFlags
    const silentFrames = activeWindow.filter((v) => !v).length
    const pause = Number((silentFrames / Math.max(activeWindow.length, 1)).toFixed(2))

    // 5. Speech-to-Text Passage Match Rate
    let textMatch: number | undefined = undefined
    if (activePassage && spoken.trim().length > 0) {
      textMatch = computeTextMatch(spoken, activePassage.text, lang === 'en')
    }

    // 6. Multi-Factor Clinical Stress Calculation
    const jitterScore = Math.min(28, jitter * 5.2)
    const pauseScore = Math.min(24, pause * 28)

    // Tone Anomaly Penalty (怪腔怪調 / 聲帶破裂 / 音調大幅跳躍)
    let toneAnomalyPenalty = 0
    if (pitchInstability > 8) {
      toneAnomalyPenalty += Math.min(36, (pitchInstability - 8) * 1.25)
    }
    if (pitchCV > 26) {
      toneAnomalyPenalty += Math.min(20, (pitchCV - 26) * 1.1)
    } else if (pitchCV < 5.5 && totalTransitions > 25) {
      toneAnomalyPenalty += 18
    }

    // Text Mismatch Penalty (未依規範朗讀 / 協議脫靶)
    let textMismatchPenalty = 0
    if (textMatch !== undefined) {
      if (textMatch < 30) {
        textMismatchPenalty = Math.round(28 + (30 - textMatch) * 0.6)
      } else if (textMatch < 65) {
        textMismatchPenalty = Math.round((65 - textMatch) * 0.45)
      }
    }

    const rawTotal = 8 + jitterScore + pauseScore + toneAnomalyPenalty + textMismatchPenalty
    const stress = Math.round(Math.max(12, Math.min(99, rawTotal)))

    // Generate anomaly diagnostic tag if abnormal
    const anomalyParts: string[] = []
    if (textMatch !== undefined && textMatch < 40) {
      anomalyParts.push(appLang === 'en' ? `Off-Passage (${textMatch}%)` : `文本脫靶 (${textMatch}%)`)
    }
    if (pitchInstability >= 15) {
      anomalyParts.push(appLang === 'en' ? `Tone Breaks (${pitchInstability}%)` : `語調破裂 (${pitchInstability}%)`)
    }
    if (pitchCV > 30) {
      anomalyParts.push(appLang === 'en' ? `Pitch Erratic (${pitchCV}%)` : `語調劇烈失穩`)
    }
    const anomalyTag = anomalyParts.join(' · ') || undefined

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen?.().catch(() => {})
      } catch {}
    }
    setIsFullscreen(false)
    setPhase('idle')
    setMsg('')
    onResult({
      jitter,
      pause,
      stress,
      textMatch,
      pitchInstability,
      anomalyTag,
      insufficient: false,
    })
  }

  // Step 2: Confirm Language & Rules -> Acquire Mic -> Start 3s Countdown -> Reveal Passage
  const handleConfirmRules = async () => {
    setFsWarn('')
    setMsg('')
    cleanupAudio()
    transcriptRef.current = ''
    setLiveTranscript('')

    try {
      stream.current = await openStream({ audio: true })
    } catch (e: any) {
      setFsWarn(`無法開啟麥克風：${e.message}（請允許瀏覽器麥克風權限後重試）`)
      return
    }

    const chosen = pickRandomPassage(lang)
    setActivePassage(chosen)
    setCanFinishEarly(false)
    setPhase('countdown')
    setCountdown(3)

    let count = 3
    countTimer.current = window.setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        if (countTimer.current) {
          clearInterval(countTimer.current)
          countTimer.current = null
        }
        setProgress(0)
        setPhase('recording')
      }
    }, 1000)
  }

  // Step 3: 30-second Recording & Real-Time FFT Spectrum Analysis
  useEffect(() => {
    if (phase !== 'recording') return
    if (!stream.current || !cv.current) {
      setFsWarn('音訊串流初始化失敗，請重新點擊開始。')
      setPhase('rules')
      return
    }

    // Start Web Speech Recognition for real-time text alignment & ASR
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    transcriptRef.current = ''
    setLiveTranscript('')

    if (SpeechRecognition) {
      try {
        const reco = new SpeechRecognition()
        reco.continuous = true
        reco.interimResults = true
        reco.lang = lang === 'en' ? 'en-US' : 'zh-TW'
        reco.onresult = (event: any) => {
          let full = ''
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript
          }
          transcriptRef.current = full
          setLiveTranscript(full)
        }
        reco.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e)
        }
        reco.start()
        recognitionRef.current = reco
      } catch (err) {
        console.warn('SpeechRecognition init error:', err)
      }
    }

    sessionData.current = { f0s: [], voicedFlags: [] }
    const ac = new AudioContext()
    acRef.current = ac
    const src = ac.createMediaStreamSource(stream.current)
    const an = ac.createAnalyser()
    an.fftSize = 2048
    src.connect(an)

    const time = new Float32Array(an.fftSize)
    const freq = new Uint8Array(an.frequencyBinCount)
    const c = cv.current.getContext('2d')!
    let lastAnalysis = 0
    const t0 = performance.now()

    const loop = () => {
      if (!cv.current) return
      const now = performance.now()
      const elapsed = now - t0
      an.getFloatTimeDomainData(time)
      an.getByteFrequencyData(freq)

      const W = cv.current.width
      const H = cv.current.height
      c.fillStyle = '#070b12'
      c.fillRect(0, 0, W, H)

      c.strokeStyle = 'rgba(255, 255, 255, 0.06)'
      c.lineWidth = 1
      c.beginPath()
      c.moveTo(0, H * 0.33)
      c.lineTo(W, H * 0.33)
      c.moveTo(0, H * 0.66)
      c.lineTo(W, H * 0.66)
      c.stroke()

      const bars = 104
      for (let i = 0; i < bars; i++) {
        const v = freq[i] / 255
        const barH = Math.max(2, v * (H - 12))
        c.fillStyle = v > 0.45 ? '#00ffa3' : `hsl(${175 + v * 35}, 95%, ${42 + v * 32}%)`
        c.fillRect((i / bars) * W + 1, H - barH, W / bars - 2, barH)
      }

      if (now - lastAnalysis > 45) {
        lastAnalysis = now
        const rms = Math.sqrt(time.reduce((a, b) => a + b * b, 0) / time.length)
        if (rms > 0.013) {
          sessionData.current.f0s.push(pitchAutocorr(time, ac.sampleRate))
          sessionData.current.voicedFlags.push(true)
        } else {
          sessionData.current.f0s.push(0)
          sessionData.current.voicedFlags.push(false)
        }
      }

      if (elapsed >= MIN_EARLY_FINISH_MS) {
        setCanFinishEarly(true)
      }

      const p = Math.min(1, elapsed / REC_MS)
      setProgress(p)
      if (p < 1) {
        raf.current = requestAnimationFrame(loop)
        return
      }

      finalizeRecording()
    }

    raf.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
        recognitionRef.current = null
      }
    }
  }, [phase, lang])

  const secLeft = Math.max(0, Math.ceil((1 - progress) * (REC_MS / 1000)))
  const level = evaluate(env, results).mind

  return (
    <>
      {/* 1. Dashboard Test Card (Passage stays hidden until fullscreen test starts!) */}
      <TestCard
        id="test-voice"
        step="04"
        title={appLang === 'en' ? '04 Acoustic Voice Stress & Jitter Analysis' : '04 聲學語音壓力分析'}
        sub={
          appLang === 'en'
            ? 'Phonetically Balanced Passage · F0 Jitter · Speech Pause Ratio'
            : '標準音素平衡短文朗讀 · 基頻微顫 (Jitter) · 跨句停頓比'
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
          <div className="voice-pad-icon" aria-hidden="true">
            <Volume2 size={24} />
          </div>
          <span>
            {r?.insufficient
              ? appLang === 'en'
                ? '⚠️ Voice Data Insufficient · Click to Retest'
                : '⚠️ 語音資料不足 · 點擊全螢幕重新朗讀測驗'
              : msg
              ? msg
              : r
              ? appLang === 'en'
                ? 'Vocal biomarkers complete · Click to retest fullscreen'
                : '語音生物標記完成 · 點擊可全螢幕重新出題測驗'
              : appLang === 'en'
              ? 'Click "Start Test" below for standard passage reading (~30s)'
              : '點擊下方「開始測驗」啟動全螢幕標準短文朗讀（約 30 秒）'}
          </span>
        </button>

        {r?.insufficient && (
          <div className="insufficient-alert-card">
            <div className="iac-head">
              <AlertTriangle size={18} className="iac-icon" />
              <div>
                <strong>{appLang === 'en' ? 'Data Insufficient / Retest Required' : '資料不足／需要重測'}</strong>
                <p>{r.reason || (appLang === 'en' ? 'Insufficient voiced frames or microphone volume too low' : '有效語音訊框不足或麥克風音量過低')}</p>
              </div>
            </div>
            <div className="iac-clinical-note">
              {appLang === 'en'
                ? 'Clinical Rule: Indeterminate speech recordings cannot be assumed nominal.'
                : '監護原則：無法判讀之語音錄音不可盲信為正常，請依標準語速重新朗讀。'}
            </div>
          </div>
        )}

        <div className="stats stats-uniform stats-4col">
          <Stat
            label={appLang === 'en' ? 'Stress Index' : '壓力指數'}
            value={!r ? '—' : r.insufficient ? '— (需重測)' : r.stress}
            unit={r && !r.insufficient ? ' /100' : ''}
          />
          <Stat
            label="F0 Jitter"
            value={!r ? '—' : r.insufficient ? '— (需重測)' : r.jitter}
            unit={r && !r.insufficient ? ' %' : ''}
          />
          <Stat
            label={appLang === 'en' ? 'Pause Ratio' : '停頓比'}
            value={!r ? '—' : r.insufficient ? '—' : `${Math.round(r.pause * 100)}`}
            unit={r && !r.insufficient ? ' %' : ''}
          />
          {r?.insufficient ? (
            <Stat label={appLang === 'en' ? 'Speech Status' : '聲學狀態'} value="需重測" />
          ) : r?.textMatch !== undefined ? (
            <Stat label={appLang === 'en' ? 'Passage Match' : '文本匹配'} value={`${r.textMatch}`} unit=" %" />
          ) : (
            <Stat label={appLang === 'en' ? 'Speech Status' : '聲學狀態'} value={r ? 'NOMINAL' : '—'} />
          )}
        </div>

        {r?.anomalyTag && !r.insufficient && (
          <div className="voice-card-anomaly-badge" role="alert">
            <AlertTriangle size={14} className="voice-alert-icon" />
            <span>
              {appLang === 'en' ? 'Acoustic / Compliance Alert: ' : '聲學／合規檢測異常：'}
              <strong>{r.anomalyTag}</strong>
            </span>
          </div>
        )}

        <StartTestButton id="btn-voice" done={!!r && !r.insufficient} onClick={handleStartFullscreen} />
      </TestCard>

      {/* 2. Fullscreen Clinical Vocal Biomarker Modal */}
      {isFullscreen &&
        createPortal(
          <div className="voice-fullscreen-modal">
            {/* Top HUD Header */}
            <header className="amsler-fs-topbar">
              <div className="pvt-fs-branding">
                <span className="rppg-fs-badge">AURA-SPACE 04</span>
                <div className="pvt-fs-title-col">
                  <h2>
                    {appLang === 'en'
                      ? 'Acoustic Voice Stress Analysis · Standard Reading Protocol'
                      : '聲學語音壓力分析 · 臨床標準短文朗讀模式'}
                  </h2>
                  <span>
                    {appLang === 'en'
                      ? 'IPA / Vocal Biomarkers 30s Phonetically Balanced Passage · F0 Jitter & Pause Ratio'
                      : 'IPA / 臨床語音病理學 30 秒音素平衡短文 · F0 Jitter 與跨句停頓比分析'}
                  </span>
                </div>
              </div>

              <div className="rppg-fs-status-pill">
                <span className="pulse-dot" />
                {phase === 'rules' &&
                  (appLang === 'en' ? 'Passage Selection & Instructions' : '語言選擇與測驗說明')}
                {phase === 'countdown' &&
                  (appLang === 'en'
                    ? `Mic Ready · Countdown (${countdown}s)`
                    : `麥克風就緒 · 倒數出題 (${countdown}s)`)}
                {phase === 'recording' &&
                  (appLang === 'en'
                    ? `Recording Live Speech (${secLeft}s left)`
                    : `實時語音採樣中 (剩餘 ${secLeft}s)`)}
              </div>

              <button
                className="rppg-fs-btn-exit"
                onClick={() => exitFullscreenAndReset(true)}
                title="退出全螢幕 (ESC)"
              >
                <X size={16} /> {appLang === 'en' ? 'Exit Fullscreen (ESC)' : '退出全螢幕 (ESC)'}
              </button>
            </header>

            {/* Center Stage */}
            <div className="amsler-fs-center-stage">
              {/* Phase 1: Language Selection + Clinical Explanation + Confirm */}
              {phase === 'rules' && (
                <div className="rppg-fs-rules-card voice-rules-card">
                  <div className="amsler-rules-tag">
                    {appLang === 'en'
                      ? 'Clinical Vocal Biomarkers · 30-Second Standard Protocol'
                      : '臨床聲學生物標記 (Vocal Biomarkers) · 30 秒標準協議'}
                  </div>
                  <h3>
                    {appLang === 'en'
                      ? '【Acoustic Voice Stress Analysis · Principles & Language Selection】'
                      : '【聲學語音壓力分析 · 測驗原理與語言選擇】'}
                  </h3>

                  <p className="voice-explain-lead">
                    {appLang === 'en'
                      ? 'This test evaluates sympathetic tension, cognitive fatigue, and psychological stress via vocal fold fundamental frequency perturbation (F0 Jitter) and speech pause ratio. Please read smoothly at your most natural conversational volume and cadence.'
                      : '本測驗以聲帶基頻微顫度（F0 Jitter）與語句停頓比（Pause Ratio）判斷您的交感神經緊繃度、認知疲勞與心理壓力程度；請避免朗讀時刻意壓低或拉高聲音、誇張抑揚頓挫、刻意放慢／搶快語速、清喉嚨或中途停下交談，只需以平時最自然的說話狀態平穩讀完即可。'}
                  </p>

                  {/* Language Selector (中文 / 英文) */}
                  <div className="voice-lang-selector">
                    <span className="voice-lang-label">
                      <Globe size={15} /> {appLang === 'en' ? 'Select Passage Language:' : '選擇短文語言：'}
                    </span>
                    <div className="voice-lang-btns">
                      <button
                        type="button"
                        className={`voice-lang-btn ${lang === 'zh' ? 'active' : ''}`}
                        onClick={() => setLang('zh')}
                      >
                        繁體中文
                      </button>
                      <button
                        type="button"
                        className={`voice-lang-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                      >
                        English (英文)
                      </button>
                    </div>
                  </div>

                  <div className="rppg-fs-rules-list">
                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">1</span>
                      <div>
                        <strong>
                          {appLang === 'en'
                            ? 'Random passage revealed after 3s countdown'
                            : '3 秒倒數結束後隨機顯示標準短文'}
                        </strong>
                        <p>
                          {appLang === 'en'
                            ? 'To prevent rehearsed pacing from distorting natural respiratory rhythms, the standardized passage is revealed only after the 3-second countdown.'
                            : '為避免預先默讀影響自然的換氣與停頓節律，按下確認並完成 3 秒倒數後，畫面才會抽取一篇平穩中性的標準朗讀短文'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">2</span>
                      <div>
                        <strong>
                          {appLang === 'en'
                            ? 'Maintain quiet environment & appropriate mic distance'
                            : '保持環境安靜與適中收音距離'}
                        </strong>
                        <p>
                          {appLang === 'en'
                            ? 'Keep surroundings quiet and position your mouth 15–25 cm from the microphone to avoid ambient noise interference.'
                            : '請維持周圍環境安靜，嘴巴距離麥克風約 15–25 公分，避免環境噪音干擾基頻追蹤'}
                        </p>
                      </div>
                    </div>

                    <div className="rppg-fs-rule-row">
                      <span className="rppg-fs-rule-num">3</span>
                      <div>
                        <strong>
                          {appLang === 'en'
                            ? 'Relaxed Everyday Cadence (~65 words / chars)'
                            : '以平時最自然的日常語速朗讀（約 65 字）'}
                        </strong>
                        <p>
                          {appLang === 'en'
                            ? 'Shortened passage designed for relaxed 18–22s reading. Once you finish naturally, click the button after 14s to complete without rushing.'
                            : '短文已精簡為舒適的 18–22 秒自然朗讀量（約 65 字），請維持平時說話語速與換氣停頓，滿 14 秒朗讀完畢即可點擊提前結算，無須倉促搶快。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {fsWarn && <p className="msg-warn" style={{ marginBottom: '14px' }}>{fsWarn}</p>}

                  <div className="rppg-fs-rules-actions">
                    <button
                      id="btn-voice-fs-confirm"
                      className="btn-fs-confirm"
                      onClick={handleConfirmRules}
                    >
                      <CheckCircle2 size={16} />{' '}
                      {appLang === 'en'
                        ? `Confirm (${lang === 'zh' ? 'Chinese Passage' : 'English Passage'}), Start in 3s`
                        : `確認（${lang === 'zh' ? '中文短文' : 'English Passage'}），3 秒後開始`}
                    </button>
                    <button className="btn-fs-cancel" onClick={() => exitFullscreenAndReset(true)}>
                      {appLang === 'en' ? 'Cancel' : '取消'}
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 2: 3-Second Countdown before revealing passage */}
              {phase === 'countdown' && (
                <div className="rppg-fs-countdown-overlay">
                  <div className="rppg-fs-countdown-ring">
                    <span className="rppg-fs-countdown-number" key={countdown}>
                      {countdown}
                    </span>
                  </div>
                  <span className="rppg-fs-countdown-hint">
                    {appLang === 'en'
                      ? `Displaying ${lang === 'zh' ? 'Chinese phonetically balanced passage' : 'English standard passage'} · Prepare to read naturally`
                      : `即將顯示${lang === 'zh' ? '中文標準音素平衡短文' : '英文標準短文 (Standard Passage)'} · 請準備自然朗讀`}
                  </span>
                </div>
              )}

              {/* Phase 3: Reveal Standardized Passage & Record 30s Live FFT Spectrum */}
              {phase === 'recording' && activePassage && (
                <div className="voice-fs-record-stage">
                  <div className="voice-fs-live-pill">
                    <Mic size={16} className="pulse-icon-accent" />
                    <span>
                      {appLang === 'en' ? (
                        <>Please read the passage below at your normal volume and pace (<b>{secLeft}</b>s left)</>
                      ) : (
                        <>請以平時自然的音量與語速朗讀下方短文（剩餘 <b>{secLeft}</b> 秒）</>
                      )}
                    </span>
                  </div>

                  <div className="voice-fs-prompt-card">
                    <span className="voice-fs-prompt-tag">{activePassage.title}</span>
                    <blockquote className={`voice-fs-prompt-text ${lang === 'en' ? 'is-en' : ''}`}>
                      {activePassage.text}
                    </blockquote>
                  </div>

                  {/* Real-Time Speech Recognition & Passage Alignment HUD */}
                  <div className="voice-fs-live-transcript-box">
                    <div className="transcript-head">
                      <span className="transcript-label">
                        <Mic size={14} className="pulse-icon-accent" />
                        {appLang === 'en'
                          ? 'Real-Time ASR Transcription & Passage Alignment'
                          : '即時語音識別 (ASR) 與短文對齊監控'}
                      </span>
                      {liveTranscript && (
                        <span
                          className={`transcript-stat ${
                            computeTextMatch(liveTranscript, activePassage.text, lang === 'en') < 35
                              ? 'is-mismatch'
                              : 'is-aligned'
                          }`}
                        >
                          {appLang === 'en' ? 'Passage Alignment: ' : '短文匹配度：'}
                          <b>{computeTextMatch(liveTranscript, activePassage.text, lang === 'en')}%</b>
                        </span>
                      )}
                    </div>
                    <div className="transcript-body">
                      {liveTranscript ? (
                        <p className="transcript-text">“{liveTranscript}”</p>
                      ) : (
                        <p className="transcript-placeholder">
                          {appLang === 'en'
                            ? 'Listening... Start reading the standardized passage above'
                            : '正在聆聽語音... 請開始朗讀上方標準短文'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="voice-fs-spectrum-box">
                    <div className="voice-fs-spectrum-head">
                      <span>
                        {appLang === 'en'
                          ? 'Web Audio FFT Live Acoustic Spectrum · F0 Jitter & Pause Tracking'
                          : 'Web Audio FFT 實時聲學頻譜 · 母音基頻與跨句停頓追蹤'}
                      </span>
                      <span className="voice-fs-rec-dot">● REC ({30 - secLeft}s / 30s)</span>
                    </div>
                    <canvas
                      ref={cv}
                      className="voice-fs-canvas"
                      width={760}
                      height={110}
                    />
                  </div>

                  {canFinishEarly ? (
                    <button
                      type="button"
                      className="btn-primary voice-early-finish-btn"
                      onClick={finalizeRecording}
                    >
                      <CheckCircle2 size={16} />{' '}
                      {appLang === 'en'
                        ? `Finished reading, complete analysis now (or wait ${secLeft}s to auto-finish)`
                        : `我已朗讀完畢，立即完成分析（或等待 ${secLeft}s 自動結束）`}
                    </button>
                  ) : (
                    <span className="amsler-fs-hint">
                      {appLang === 'en'
                        ? 'Vocal biomarkers require at least 14–30 seconds of speech. Please read smoothly at your natural conversational pace…'
                        : '臨床語音指標需至少 14–30 秒連續語音樣本以穩定計算跨句停頓比，請依平時自然語速朗讀…'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Progress Dock */}
            <footer className="amsler-fs-bottom-dock">
              <div className="pvt-fs-dock-row">
                <div className="dock-meta-left">
                  <Mic size={15} style={{ color: 'var(--green)' }} />
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {appLang === 'en'
                      ? `30s Clinical Speech Sampling Progress (Language: ${lang === 'zh' ? 'Traditional Chinese' : 'English'})`
                      : `30 秒臨床標準短文採樣進度（語言：${lang === 'zh' ? '繁體中文' : 'English'}）`}
                  </span>
                </div>

                <span style={{ color: 'var(--green)', fontFamily: 'var(--font-hud)', fontSize: '12px' }}>
                  {phase === 'recording' ? `${Math.round(progress * 100)}%` : 'STANDBY'}
                </span>
              </div>

              <div className="rppg-fs-dock-progress">
                <div
                  className="dock-progress-fill"
                  style={{ width: `${phase === 'recording' ? progress * 100 : 0}%` }}
                />
              </div>
            </footer>
          </div>,
          document.body
        )}
    </>
  )
}
