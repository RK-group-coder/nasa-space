import { startTransition, useEffect, useRef, useState } from 'react'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import EnvPanel from './components/EnvPanel'
import DateLog from './components/DateLog'
import RppgTest from './components/RppgTest'
import PvtTest from './components/PvtTest'
import AmslerTest from './components/AmslerTest'
import VoiceTest from './components/VoiceTest'
import DigitalTwin from './components/DigitalTwin'
import ActionHub from './components/ActionHub'
import { CriteriaModal, CriteriaProvider } from './components/CriteriaModal'
import SplashScreen from './components/SplashScreen'
import TriageLoader from './components/TriageLoader'
import MobileDeviceGuard from './components/MobileDeviceGuard'
import {
  formatShortDate,
  getHistoricalDayData,
  isSameDay,
  missionDay,
  startOfDay,
} from './lib/missionHistory'
import type { Env, Results } from './types/health'
import { useI18n } from './lib/i18nContext'
import './App.css'

const BASE_ENV: Env = { co2: 2.9, pressure: 14.7, doseRate: 18, cumulative: 182, storm: false }

export default function App() {
  const { t, lang } = useI18n()
  const [showSplash, setShowSplash] = useState(true)
  const [pageReveal, setPageReveal] = useState(false)
  const [loaderLabel, setLoaderLabel] = useState('準備今日晨檢測驗')
  const [loaderState, setLoaderState] = useState<'off' | 'on' | 'leaving'>('off')
  const [triage, setTriage] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [results, setResults] = useState<Results>({})
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({})
  const [env, setEnv] = useState<Env>(BASE_ENV)

  const busyRef = useRef(true)
  busyRef.current = showSplash || loaderState !== 'off'

  useEffect(() => {
    // 登入動畫播放中提早在背景就緒主頁排版，點擊進入時即刻絲滑過渡
    const timer = setTimeout(() => setPageReveal(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (busyRef.current) return // 動畫播放期間暫停全頁重繪，避免掉幀
      setEnv((e) => ({
        ...e,
        co2: Math.max(2, Math.min(7, e.co2 + (Math.random() - 0.5) * 0.15)),
        pressure: 14.7 + (Math.random() - 0.5) * 0.06,
        doseRate: e.storm ? 140 + Math.random() * 30 : 18 + (Math.random() - 0.5) * 3,
        cumulative: e.cumulative + (e.storm ? 0.04 : 0.005),
      }))
    }, 2000)
    return () => clearInterval(t)
  }, [])

  const today = startOfDay(new Date())
  const isToday = isSameDay(selectedDate, today)
  const shortDate = formatShortDate(selectedDate)
  const histData = !isToday ? getHistoricalDayData(selectedDate) : null

  const activeResults: Results = isToday ? results : (histData?.results ?? {})
  const activeEnv: Env = isToday ? env : (histData?.env ?? env)
  const activeExecuted: Record<string, boolean> = isToday
    ? executedActions
    : (histData?.defaultExecuted ?? {})

  const set = <K extends keyof Results>(k: K) => (v: Results[K]) => {
    setResults((r) => ({ ...r, [k]: v }))
    setExecutedActions((prev) => ({ ...prev, [k as string]: false }))
    setSelectedDate(startOfDay(new Date()))
  }

  const toggleActionForDate = (d: Date, key: string, val: boolean) => {
    if (!isSameDay(d, today)) return
    setExecutedActions((prev) => ({ ...prev, [key]: val }))
  }

  const toggleActiveExecuted = (key: string, val: boolean) =>
    toggleActionForDate(selectedDate, key, val)

  const coreKeys = ['pvt', 'amsler', 'rppg', 'voice'] as const
  const done = coreKeys.filter((k) => Boolean(activeResults[k])).length
  const allDone = done === coreKeys.length

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d)
    if (!isSameDay(d, startOfDay(new Date()))) {
      setTriage(false)
    }
  }

  const startTriageWithLoader = () => {
    if (loaderState !== 'off') return
    setSelectedDate(startOfDay(new Date()))
    setLoaderLabel(t('app.prepTriage'))
    setLoaderState('on')
    window.setTimeout(() => startTransition(() => setTriage(true)), 1600)
    window.setTimeout(() => setLoaderState('leaving'), 1600)
    window.setTimeout(() => setLoaderState('off'), 2050)
  }

  const backWithLoader = () => {
    if (loaderState !== 'off') return
    setLoaderLabel(t('app.returning'))
    setLoaderState('on')
    window.setTimeout(() => startTransition(() => setTriage(false)), 1600)
    window.setTimeout(() => setLoaderState('leaving'), 1600)
    window.setTimeout(() => setLoaderState('off'), 2050)
  }

  return (
    <CriteriaProvider canViewAnalytics={allDone}>
      <MobileDeviceGuard />
      {showSplash && <SplashScreen onEnter={() => setPageReveal(true)} onDone={() => setShowSplash(false)} />}
      {loaderState !== 'off' && <TriageLoader leaving={loaderState === 'leaving'} label={loaderLabel} />}
      <div className="aura" style={showSplash && !pageReveal ? { visibility: 'hidden' } : undefined}>
        <h1 className="sr-only">{t('app.title')}</h1>
        <EnvPanel env={activeEnv} results={activeResults} />
        <DateLog
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          todayResults={results}
          env={env}
          todayExecuted={executedActions}
          onToggleAction={toggleActionForDate}
        />

        <main className="content">
          {!triage ? (
            <DigitalTwin
              env={activeEnv}
              results={activeResults}
              executed={activeExecuted}
              onToggleExecuted={toggleActiveExecuted}
              selectedDate={selectedDate}
              isToday={isToday}
              onStartTriage={startTriageWithLoader}
            />
          ) : (
            <div className="triage-page">
              <div className="triage-topbar">
                <button id="btn-back" className="btn-ghost" onClick={backWithLoader}>
                  <ArrowLeft size={15} /> {t('app.returnTwin')}
                </button>

                <div className="triage-check-strip">
                  {[
                    { k: 'pvt', label: lang === 'en' ? '01 PVT Reaction' : '01 PVT 反應' },
                    { k: 'amsler', label: lang === 'en' ? '02 Amsler Vision' : '02 Amsler 視覺' },
                    { k: 'rppg', label: lang === 'en' ? '03 Pulse / HRV' : '03 心血管脈搏' },
                    { k: 'voice', label: lang === 'en' ? '04 Voice Stress' : '04 語音壓力' },
                  ].map((item) => {
                    const isDone = Boolean(activeResults[item.k as keyof Results])
                    return (
                      <span key={item.k} className={`triage-check-pill ${isDone ? 'done' : ''}`}>
                        <i>{isDone ? '✓' : '○'}</i> {item.label}
                      </span>
                    )
                  })}
                </div>

                <span className={`triage-prog ${allDone ? 'all-done' : ''}`}>
                  <ClipboardList size={14} />
                  {isToday
                    ? allDone
                      ? t('app.allDone')
                      : t('app.triageProgress')
                    : `${shortDate} ${lang === 'en' ? 'Records' : '測驗紀錄'}`}
                  <em>{done}/4</em>
                </span>
              </div>
              <div className="triage-layout">
                <div className="test-grid">
                  <PvtTest results={activeResults} env={activeEnv} onResult={set('pvt')} />
                  <AmslerTest results={activeResults} env={activeEnv} onResult={set('amsler')} />
                  <RppgTest results={activeResults} env={activeEnv} onResult={set('rppg')} />
                  <VoiceTest results={activeResults} env={activeEnv} onResult={set('voice')} />
                </div>
                <div className="triage-actions">
                  <ActionHub
                    env={activeEnv}
                    results={activeResults}
                    executed={activeExecuted}
                    onToggleExecuted={toggleActiveExecuted}
                    dateLabel={isToday ? t('app.today') : shortDate}
                    readOnly={!isToday}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
        <CriteriaModal
          results={activeResults}
          env={activeEnv}
          doneCount={done}
          isToday={isToday}
          shortDate={shortDate}
          sol={missionDay(selectedDate)}
          inTriage={triage}
          onStartTriage={startTriageWithLoader}
        />
      </div>
    </CriteriaProvider>
  )
}
