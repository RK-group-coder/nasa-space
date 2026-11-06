import { useEffect, useState } from 'react'
import { Monitor, Smartphone, AlertTriangle, Languages, Sparkles } from 'lucide-react'
import { useI18n } from '../lib/i18nContext'

export default function MobileDeviceGuard() {
  const { lang, setLang } = useI18n()
  const [isMobile, setIsMobile] = useState(false)
  const [bypassed, setBypassed] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const checkDevice = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setDimensions({ width: w, height: h })

      // Detect mobile user agent
      const ua = navigator.userAgent || ''
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)

      // Screen width threshold: < 1024px is considered mobile / portrait tablet
      const isSmallScreen = w < 1024

      setIsMobile(isMobileUA || isSmallScreen)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  if (!isMobile || bypassed) {
    return null
  }

  return (
    <div className="mobile-guard-overlay">
      <div className="mg-bg-effects">
        <div className="mg-grid-lines" />
        <div className="mg-radial-glow" />
      </div>

      <div className="mg-card">
        {/* Top bar with Brand and Lang toggle */}
        <div className="mg-top-row">
          <div className="mg-brand">
            <span className="mg-brand-mark">AURA</span>
            <span className="mg-brand-sub">SPACE</span>
          </div>

          <button
            type="button"
            className="mg-lang-btn"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Languages size={14} />
            <span>{lang === 'zh' ? 'EN' : '繁中'}</span>
          </button>
        </div>

        {/* Center Icons Hologram */}
        <div className="mg-icon-stage">
          <div className="mg-device-circle phone">
            <Smartphone size={32} className="mg-phone-icon" />
            <span className="mg-x-badge">✕</span>
          </div>

          <div className="mg-arrow-beam">
            <div className="beam-pulse" />
          </div>

          <div className="mg-device-circle desktop active">
            <Monitor size={42} className="mg-monitor-icon" />
            <span className="mg-check-badge">✓</span>
          </div>
        </div>

        {/* Warning Badge */}
        <div className="mg-alert-pill">
          <AlertTriangle size={14} className="text-amber" />
          <span>
            {lang === 'zh'
              ? '深空任務控制台座艙環境限制'
              : 'MISSION CONSOLE DISPLAY REQUIRED'}
          </span>
        </div>

        {/* Main Title */}
        <h2 className="mg-title">
          {lang === 'zh' ? '請用電腦開啟此系統' : 'Please Access via Desktop'}
        </h2>

        {/* Description */}
        <p className="mg-desc">
          {lang === 'zh' ? (
            <>
              <b>AURA-Space 深空自主健康監控系統</b>
              專為太空艙座艙工作站打造，需配合大尺寸螢幕以呈現完整的
              <b> 3D 全像數位孿生、rPPG 綠光微血管光學心率追蹤</b> 與
              <b> Amsler 視網膜 SANS 水腫網格</b>。
              <br />
              <br />
              請改用 <strong>桌上型電腦</strong> 或 <strong>筆記型電腦</strong>
              開啟，獲得最精準的深空醫療遙測與評審判讀體驗。
            </>
          ) : (
            <>
              <b>AURA-Space Deep-Space Health Cockpit</b> is designed exclusively for
              mission console workstations. It requires a desktop display to render the
              <b> 3D Holographic Digital Twin, rPPG facial optical pulse telemetry</b>, and
              <b> Amsler retinal grid diagnostics</b>.
              <br />
              <br />
              Please reopen this system on a <strong>Desktop Computer</strong> or
              <strong> Laptop</strong> (recommended screen width ≥ 1024px).
            </>
          )}
        </p>

        {/* Detected Specs Box */}
        <div className="mg-specs-box">
          <div className="mg-spec-row">
            <span>{lang === 'zh' ? '當前裝置螢幕：' : 'Current Screen:'}</span>
            <strong className="text-amber">
              {dimensions.width} × {dimensions.height} px ({lang === 'zh' ? '行動端/窄螢幕' : 'Mobile / Narrow'})
            </strong>
          </div>
          <div className="mg-spec-row">
            <span>{lang === 'zh' ? '建議解析度：' : 'Required Screen:'}</span>
            <strong className="text-green">
              {lang === 'zh' ? '寬度 ≥ 1024 px (電腦螢幕)' : 'Width ≥ 1024 px (Desktop)'}
            </strong>
          </div>
        </div>

        {/* Subtle bypass button just in case judge must inspect on phone */}
        <div className="mg-footer">
          <button
            type="button"
            className="mg-bypass-btn"
            onClick={() => setBypassed(true)}
          >
            <span>
              {lang === 'zh'
                ? '以手機檢視（版面可能受限）➔'
                : 'Preview on Mobile Anyway ➔'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
