import BrandEmblem from './BrandEmblem'
import '../splash.css'
import '../triageLoader.css'

/** 進入測驗頁前的 2 秒等待動畫（使用品牌標誌） */
export default function TriageLoader({ leaving, label = '準備今日晨檢測驗' }: { leaving: boolean; label?: string }) {
  return (
    <div className={`triage-loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="splash-grid" />
      <div className="tl-core">
        <span className="tl-sweep" />
        <span className="splash-shock s1" />
        <span className="splash-shock s2" />
        <span className="tl-ring tl-ring-a" />
        <span className="tl-ring tl-ring-b" />
        <div className="tl-medal">
          <BrandEmblem size={118} animate />
          <span className="splash-glint" />
        </div>
      </div>
      <span className="tl-title">{label}</span>
      <div className="tl-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="tl-bar">
        <i />
      </div>
    </div>
  )
}
