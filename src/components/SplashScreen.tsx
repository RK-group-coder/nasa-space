import { useEffect, useState } from 'react'
import BrandEmblem from './BrandEmblem'
import { useI18n } from '../lib/i18nContext'
import '../splash.css'

const TITLE = 'AURA-Space'
const STAGES_ZH = ['初始化生理感測模組', '載入數位分身模型', '同步任務遙測資料', '系統就緒']
const STAGES_EN = ['Initializing Sensor Modules', 'Loading Digital Twin Hologram', 'Syncing Telemetry Stream', 'System Ready']

/** 進站登入動畫：光束 → 衝擊波 → 標誌描繪 → 標題逐字+掃光 → 點擊任意處進入 */
export default function SplashScreen({ onDone, onEnter }: { onDone: () => void; onEnter?: () => void }) {
  const { lang } = useI18n()
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 1000),
      window.setTimeout(() => setStage(2), 2000),
      window.setTimeout(() => setStage(3), 3000),
      window.setTimeout(() => setReady(true), 3300),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [])

  const enter = () => {
    if (entering) return
    setEntering(true)
    onEnter?.()
    window.setTimeout(onDone, 320)
  }

  return (
    <div
      className={`splash ${ready ? 'is-ready' : ''} ${entering ? 'is-entering' : ''}`}
      onClick={enter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') enter()
      }}
    >
      <div className="splash-stars" />
      <div className="splash-grid" />
      <div className="splash-scan" />
      <div className="splash-beam" />
      <div className="splash-door splash-door-l" />
      <div className="splash-door splash-door-r" />

      <i className="splash-corner c-tl" />
      <i className="splash-corner c-tr" />
      <i className="splash-corner c-bl" />
      <i className="splash-corner c-br" />
      <span className="splash-hud hud-l">SYS // AURA-SPACE · v2.0</span>
      <span className="splash-hud hud-r">DEEP-SPACE AUTONOMOUS HEALTH</span>

      <div className="splash-stage-wrap">
        <div className="splash-core">
          <span className="splash-shock s1" />
          <span className="splash-shock s2" />
          <span className="splash-shock s3" />
          <div className="splash-halo" />
          <span className="splash-ring splash-ring-a" />
          <span className="splash-ring splash-ring-b" />
          <span className="splash-orbit">
            <b />
            <b />
            <b />
          </span>
          <div className="splash-medal">
            <BrandEmblem size={170} animate />
            <span className="splash-glint" />
          </div>
        </div>

        <h1 className="splash-title" aria-label={TITLE}>
          {TITLE.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${2.0 + i * 0.08}s` }}>
              {ch}
            </span>
          ))}
          <em className="splash-title-shine" />
        </h1>
        <p className="splash-sub">{lang === 'en' ? 'Deep-Space Autonomous Health Monitoring System' : '深空自主健康監控系統'}</p>

        <div className="splash-progress">
          <i />
        </div>
        <span className="splash-stage" key={stage}>
          {(lang === 'en' ? STAGES_EN : STAGES_ZH)[stage]}
        </span>
      </div>

      <div className="splash-enter">
        <span className="splash-enter-line" />
        <span className="splash-enter-text">{lang === 'en' ? 'CLICK ANYWHERE TO ENTER' : '點擊任意處進入'}</span>
        <span className="splash-enter-line" />
      </div>
    </div>
  )
}
