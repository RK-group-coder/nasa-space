import { useState, useEffect } from 'react'
import { Rocket, Satellite, Database, GitBranch, Sparkles, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { getLocalNasaData } from './services/nasaApi'
import './App.css'

function App() {
  const [dataStatus, setDataStatus] = useState<string>('點擊下方按鈕測試載入 NASA 數據')
  const [localData, setLocalData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTestLoad = async () => {
    setLoading(true)
    try {
      const data = await getLocalNasaData()
      setLocalData(data)
      setDataStatus('✅ 成功從 /public/data/ 載入 NASA 數據！')
    } catch (err: any) {
      setDataStatus(`❌ 讀取失敗: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="nasa-app">
      {/* Top Navigation */}
      <header className="nasa-header">
        <div className="logo-section">
          <div className="nasa-badge">
            <Rocket className="icon-pulse" size={22} />
            <span>NASA SPACE APPS 2026</span>
          </div>
          <span className="team-tag">Team: RK-group-coder</span>
        </div>
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span>System Online</span>
        </div>
      </header>

      {/* Hero Banner */}
      <main className="nasa-main">
        <section className="hero-card">
          <div className="hero-content">
            <span className="hero-sub"><Sparkles size={16} /> 隊長協作專案已成功就緒</span>
            <h1 className="hero-title">Mission Control Center</h1>
            <p className="hero-desc">
              React + Vite + TypeScript 核心架構已完成配置。已預先整合 NASA API 模組、靜態數據流與寬鬆型別開發規則，全隊隨時可無縫投入開發！
            </p>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="cards-grid">
          {/* Card 1: NASA Data */}
          <div className="dashboard-card">
            <div className="card-header">
              <Database className="card-icon cyan" size={24} />
              <h3>NASA Data Pipeline</h3>
            </div>
            <p className="card-desc">
              數據隊員請將清洗後的 NASA GeoJSON / CSV / JSON 放於 <code>public/data/</code> 目錄，前端免後端即可直接引用。
            </p>
            <div className="data-preview">
              <button 
                className="action-btn"
                onClick={handleTestLoad}
                disabled={loading}
              >
                {loading ? '載入中...' : '測試讀取 NASA 本地數據'}
              </button>
              <div className="status-box">{dataStatus}</div>
              {localData && (
                <pre className="code-box">{JSON.stringify(localData, null, 2)}</pre>
              )}
            </div>
          </div>

          {/* Card 2: Git Collaboration */}
          <div className="dashboard-card">
            <div className="card-header">
              <GitBranch className="card-icon purple" size={24} />
              <h3>Git 協作規範</h3>
            </div>
            <p className="card-desc">全隊共同維護 <code>main</code> 分支乾淨可執行，每人開獨立功能分支開發：</p>
            <ul className="guide-list">
              <li><code>git checkout -b feature/ui-layout</code></li>
              <li><code>git checkout -b feature/nasa-data</code></li>
              <li><code>git checkout -b feature/3d-earth</code></li>
            </ul>
            <div className="hint-pill">
              <ShieldCheck size={14} /> 已放寬 TypeScript 嚴格報錯，防止打包卡關
            </div>
          </div>

          {/* Card 3: NASA Resources */}
          <div className="dashboard-card">
            <div className="card-header">
              <Satellite className="card-icon amber" size={24} />
              <h3>NASA 開放圖資資源</h3>
            </div>
            <p className="card-desc">評審非常重視 NASA 官方資料來源，建議隊員研究並引用：</p>
            <div className="resource-links">
              <a href="https://api.nasa.gov/" target="_blank" rel="noreferrer" className="res-link">
                <span>NASA Open APIs (APOD, NeoWs, Mars)</span>
                <ExternalLink size={14} />
              </a>
              <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="res-link">
                <span>NASA Worldview (GIBS 衛星雲圖)</span>
                <ExternalLink size={14} />
              </a>
              <a href="https://earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="res-link">
                <span>NASA Earthdata Search</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>

        {/* Footer Checklist */}
        <footer className="team-checklist">
          <div className="check-item"><CheckCircle2 size={16} className="checked" /> 核心框架 Vite + React + TS 啟動</div>
          <div className="check-item"><CheckCircle2 size={16} className="checked" /> NASA API & Local Data 管道就緒</div>
          <div className="check-item"><CheckCircle2 size={16} className="checked" /> GitHub 公開開源 (Public & MIT)</div>
          <div className="check-item ready"><Sparkles size={16} /> 隊長準備發送邀請，全員出擊！</div>
        </footer>
      </main>
    </div>
  )
}

export default App
