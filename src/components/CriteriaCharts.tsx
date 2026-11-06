import type { Criterion } from '../data/criteriaData'
import type { Env, Results } from '../types/health'
import { computeImmuneBreakdown, evaluateImmuneLevel } from '../lib/engine'
import { computeBoneLoss } from '../lib/boneModel'
import { useI18n } from '../lib/i18nContext'

export function CriteriaChart({
  item,
  results,
  env,
}: {
  item: Criterion
  results: Results
  env: Env
}) {
  switch (item.id) {
    case 'rppg':
      return <RppgChart results={results} />
    case 'pvt':
      return <PvtChart results={results} />
    case 'amsler':
      return <AmslerChart results={results} />
    case 'voice':
      return <VoiceChart results={results} />
    case 'bone':
    case 'squat':
      return <BoneChart results={results} />
    case 'skin':
      return <SkinChart results={results} />
    case 'immune':
      return <ImmuneChart results={results} env={env} />
    default:
      return null
  }
}

// 01. rPPG 心血管圖表
function RppgChart({ results }: { results: Results }) {
  const bpm = results.rppg?.bpm ?? 94
  const hrv = results.rppg?.hrv ?? 34

  // 7-day trend mock data
  const solTrend = [
    { sol: 'Sol 136', bpm: 72, hrv: 48 },
    { sol: 'Sol 137', bpm: 75, hrv: 45 },
    { sol: 'Sol 138', bpm: 78, hrv: 42 },
    { sol: 'Sol 139', bpm: 84, hrv: 39 },
    { sol: 'Sol 140', bpm: 88, hrv: 36 },
    { sol: 'Sol 141', bpm: 91, hrv: 35 },
    { sol: 'Sol 142 (今日)', bpm, hrv },
  ]

  // Map BPM (50 to 130) to percentage
  const bpmPct = Math.max(5, Math.min(95, ((bpm - 50) / 80) * 100))
  // Map HRV (10 to 70) to percentage
  const hrvPct = Math.max(5, Math.min(95, ((hrv - 10) / 60) * 100))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>心血管生理閾值分佈與 7 日趨勢監測</h4>
        <span className="chart-tag">即時連續遙測</span>
      </div>

      <div className="gauge-bars-wrap">
        {/* BPM Range Bar */}
        <div className="range-bar-item">
          <div className="range-bar-title">
            <span>靜息心率 (BPM) 閾值量表</span>
            <strong className="chart-val">{bpm} BPM</strong>
          </div>
          <div className="range-bar-track">
            <div className="range-segment nominal" style={{ width: '50%' }}>
              <span>正常 &lt; 90</span>
            </div>
            <div className="range-segment advisory" style={{ width: '12.5%' }}>
              <span>注意 90-100</span>
            </div>
            <div className="range-segment warning" style={{ width: '37.5%' }}>
              <span>警戒 &gt; 100</span>
            </div>
            <div className="range-pointer" style={{ left: `${bpmPct}%` }}>
              <div className="pointer-pin" />
              <div className="pointer-label">{bpm}</div>
            </div>
          </div>
        </div>

        {/* HRV Range Bar */}
        <div className="range-bar-item">
          <div className="range-bar-title">
            <span>心率變異度 HRV (RMSSD) 壓力耐受量表</span>
            <strong className="chart-val">{hrv} ms</strong>
          </div>
          <div className="range-bar-track">
            <div className="range-segment warning" style={{ width: '33.3%' }}>
              <span>警戒 &lt; 30 ms</span>
            </div>
            <div className="range-segment advisory" style={{ width: '16.7%' }}>
              <span>注意 30-40</span>
            </div>
            <div className="range-segment nominal" style={{ width: '50%' }}>
              <span>正常 ≥ 40 ms</span>
            </div>
            <div className="range-pointer" style={{ left: `${hrvPct}%` }}>
              <div className="pointer-pin" />
              <div className="pointer-label">{hrv} ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="trend-area">
        <div className="trend-title">
          <span>7 日心率與自律神經調節走勢 (Sol 136 - 142)</span>
          <div className="trend-legend">
            <span className="dot-bpm">心率 (BPM)</span>
            <span className="dot-hrv">HRV (ms)</span>
          </div>
        </div>
        <svg className="trend-svg" viewBox="0 0 500 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-bpm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10e6a0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10e6a0" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-hrv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00b4ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00b4ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

          {/* BPM Line: 72 -> 94 (y range: 110 to 20) */}
          <path
            d="M 30,85 Q 100,80 180,72 T 330,45 T 470,30"
            fill="none"
            stroke="#10e6a0"
            strokeWidth="2.5"
          />
          {/* HRV Line: 48 -> 34 (y range: 20 to 110) */}
          <path
            d="M 30,40 Q 100,45 180,55 T 330,70 T 470,82"
            fill="none"
            stroke="#00b4ff"
            strokeWidth="2.5"
          />

          {/* Trend Nodes */}
          {solTrend.map((t, idx) => {
            const x = 30 + idx * 73
            const yBpm = 85 - (t.bpm - 70) * 2.3
            const yHrv = 40 + (50 - t.hrv) * 2.5
            return (
              <g key={idx}>
                <circle cx={x} cy={yBpm} r="3.5" fill="#10e6a0" stroke="#05080f" strokeWidth="1.5" />
                <circle cx={x} cy={yHrv} r="3.5" fill="#00b4ff" stroke="#05080f" strokeWidth="1.5" />
                <text x={x} y="112" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="var(--font-hud)">
                  {t.sol.split(' ')[1] || t.sol}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// 02. NASA-PVT 認知警覺圖表
function PvtChart({ results }: { results: Results }) {
  const rts = results.pvt?.rts || [310, 342, 288, 540, 355]
  const medianRt = results.pvt?.median || 342
  const lapses = results.pvt?.lapses ?? 1

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>精神運動警覺試驗 (PVT) 5 次毫秒反應時間分佈柱狀圖</h4>
        <span className="chart-tag">注意力遲鈍監控</span>
      </div>

      <div className="pvt-trials-chart">
        <div className="trials-bars-container">
          {rts.map((rt, idx) => {
            const isLapse = rt > 500
            const isAdvisory = rt > 300 && rt <= 500
            const heightPct = Math.min(100, (rt / 600) * 100)
            const colorClass = isLapse ? 'bar-lapse' : isAdvisory ? 'bar-advisory' : 'bar-nominal'

            return (
              <div key={idx} className="trial-bar-col">
                <span className={`trial-rt-val ${colorClass}`}>{rt} ms</span>
                <div className="trial-bar-track">
                  {/* Lapse reference threshold line */}
                  <div className="lapse-threshold-line" style={{ bottom: `${(500 / 600) * 100}%` }} />
                  <div className={`trial-bar-fill ${colorClass}`} style={{ height: `${heightPct}%` }} />
                </div>
                <span className="trial-num">試驗 0{idx + 1}</span>
              </div>
            )
          })}
        </div>

        <div className="pvt-summary-box">
          <div className="pvt-summary-item">
            <span>中位反應時間</span>
            <strong className={medianRt > 400 ? 'text-red' : medianRt > 300 ? 'text-amber' : 'text-green'}>
              {medianRt} ms
            </strong>
          </div>
          <div className="pvt-summary-item">
            <span>注意喪失 (&gt;500ms)</span>
            <strong className={lapses >= 2 ? 'text-red' : lapses >= 1 ? 'text-amber' : 'text-green'}>
              {lapses} 次 (Lapses)
            </strong>
          </div>
          <div className="pvt-summary-item">
            <span>認知警覺評級</span>
            <strong
              className={
                medianRt > 400 || lapses >= 2
                  ? 'text-red'
                  : medianRt > 300 || lapses >= 1
                  ? 'text-amber'
                  : 'text-green'
              }
            >
              {medianRt > 400 || lapses >= 2
                ? '警戒 · 顯著遲鈍'
                : medianRt > 300 || lapses >= 1
                ? '注意 · 輕度疲勞'
                : '正常 · 警覺敏銳'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// 03. Amsler 方格視覺失真圖表
function AmslerChart({ results }: { results: Results }) {
  const a = results.amsler
  const rightMarks = a?.rightMarks ?? 2
  const leftMarks = a?.leftMarks ?? 1
  const central = a?.centralMarks ?? 0
  const paracentral = a?.paracentralMarks ?? 2
  const peripheral = a?.peripheralMarks ?? 1
  const minEcc = a?.minEccentricity !== undefined ? a.minEccentricity : 4.2

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>SANS 黃斑中心離心度分區與左右眼不對稱分析</h4>
        <span className="chart-tag">中心視軸加權篩檢</span>
      </div>

      <div className="amsler-analysis-grid">
        {/* Retinal Eccentricity Diagram */}
        <div className="amsler-retina-view">
          <div className="retina-quad-title">20×20 網格離心視角分區（每格 ≈ 1° 視角）</div>
          <div className="retina-circle">
            <div className="quadrant q-sup"><span>外圍區 &gt;6° ({peripheral} 格)</span></div>
            <div className="quadrant q-temp"><span>右眼 OD ({rightMarks} 格)</span></div>
            <div className="quadrant q-inf"><span>左眼 OS ({leftMarks} 格)</span></div>
            <div className={`quadrant q-macular ${central > 0 ? 'hot' : ''}`}>
              {central > 0 && <span className="hot-pulse" />}
              <span>中心黃斑 ≤3° ({central} 格) · 旁中心 ({paracentral} 格)</span>
            </div>
          </div>
          <span className="retina-eye-label">
            右眼 {rightMarks} 格 · 左眼 {leftMarks} 格
            {minEcc != null ? `（最近距紅點 ${minEcc}°）` : '（雙眼無異常）'}
          </span>
        </div>

        {/* SANS Spatial Staging Scale */}
        <div className="sans-stages-box">
          <span className="stage-title">SANS 視網膜離心位置臨床分期標準</span>
          <div className={`stage-item ${(a?.marks ?? 3) === 0 ? 'active-advisory' : 'completed'}`}>
            <span className="stage-num">0</span>
            <div>
              <b>NOMINAL：雙眼 0 格異常</b>
              <p>右眼與左眼格線皆筆直對稱，中心凹與周邊無扭曲或暗點。</p>
            </div>
          </div>
          <div className={`stage-item ${central === 0 && (a?.marks ?? 3) > 0 && paracentral < 3 && (a?.marks ?? 3) < 5 ? 'active-advisory' : 'future'}`}>
            <span className="stage-num">1</span>
            <div>
              <b>ADVISORY：周邊／旁中心早期變形（距紅點 &gt;3°）</b>
              <p>外圍顳側（&gt;6°）暗影提示早期視乳頭水腫盲點擴大；旁中心（3°–6°）1–2 格為輕度微摺痕，建議啟動 LBNP 負壓。</p>
            </div>
          </div>
          <div className={`stage-item ${central >= 1 || paracentral >= 3 || (a?.marks ?? 3) >= 5 ? 'active-advisory' : 'future'}`}>
            <span className="stage-num">2+</span>
            <div>
              <b>WARNING：波及中心黃斑凹區（≤3° 任 1 格）或廣泛水腫</b>
              <p>紅點周圍 3 格內（Fovea 黃斑中心）只要出現 1 格扭曲或暗點即直接損害中心視力軸，需立即通報地面醫官。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 04. 聲學語音壓力圖表
function VoiceChart({ results }: { results: Results }) {
  const stress = results.voice?.stress ?? 58
  const jitter = results.voice?.jitter ?? 2.4
  const pause = results.voice ? Math.round(results.voice.pause * 100) : 38

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>聲學特徵頻譜雷達與交感神經高張分析</h4>
        <span className="chart-tag">語音生物標記</span>
      </div>

      <div className="voice-analysis-wrap">
        <div className="voice-indicators-list">
          {/* Stress Bar */}
          <div className="voice-indicator-row">
            <div className="vi-label">
              <span>綜合壓力指數 (0-100)</span>
              <strong>{stress} / 100</strong>
            </div>
            <div className="vi-bar">
              <div
                className="vi-fill"
                style={{
                  width: `${stress}%`,
                  background: stress >= 65 ? '#ff4d5e' : stress >= 40 ? '#ffd043' : '#10e6a0',
                }}
              />
              <div className="vi-marker" style={{ left: '40%' }} title="正常上限 (40)" />
              <div className="vi-marker warning-mark" style={{ left: '65%' }} title="警戒門檻 (65)" />
            </div>
            <div className="vi-scale-note">
              <span>正常 &lt; 40</span>
              <span>注意 40-64</span>
              <span>警戒 ≥ 65</span>
            </div>
          </div>

          {/* Jitter Bar */}
          <div className="voice-indicator-row">
            <div className="vi-label">
              <span>聲帶基頻抖動 (F0 Jitter %)</span>
              <strong>{jitter} %</strong>
            </div>
            <div className="vi-bar">
              <div
                className="vi-fill"
                style={{
                  width: `${Math.min(100, (jitter / 4) * 100)}%`,
                  background: jitter >= 3.5 ? '#ff4d5e' : jitter >= 2.0 ? '#ffd043' : '#10e6a0',
                }}
              />
              <div className="vi-marker" style={{ left: '50%' }} title="正常上限 2.0%" />
            </div>
            <div className="vi-scale-note">
              <span>正常 &lt; 2.0%</span>
              <span>注意 2.0-3.5%</span>
              <span>警戒 &gt; 3.5%</span>
            </div>
          </div>

          {/* Pause Ratio Bar */}
          <div className="voice-indicator-row">
            <div className="vi-label">
              <span>語音思考停頓比 (Pause Ratio %)</span>
              <strong>{pause} %</strong>
            </div>
            <div className="vi-bar">
              <div className="vi-fill" style={{ width: `${pause}%`, background: '#00b4ff' }} />
              <div className="vi-marker" style={{ left: '25%' }} title="標準停頓比 25%" />
            </div>
            <div className="vi-scale-note">
              <span>正常流暢 &lt; 25%</span>
              <span>思考遲疑 25-45%</span>
              <span>認知阻滯 &gt; 45%</span>
            </div>
          </div>

          {/* Passage Alignment Bar */}
          {results.voice?.textMatch !== undefined && (
            <div className="voice-indicator-row">
              <div className="vi-label">
                <span>標準短文對齊率 (Passage Match %)</span>
                <strong style={{ color: results.voice.textMatch < 40 ? '#ff4d5e' : results.voice.textMatch < 65 ? '#ffd043' : '#10e6a0' }}>
                  {results.voice.textMatch} %
                </strong>
              </div>
              <div className="vi-bar">
                <div
                  className="vi-fill"
                  style={{
                    width: `${results.voice.textMatch}%`,
                    background: results.voice.textMatch < 40 ? '#ff4d5e' : results.voice.textMatch < 65 ? '#ffd043' : '#10e6a0',
                  }}
                />
                <div className="vi-marker" style={{ left: '65%' }} title="合規門檻 65%" />
              </div>
              <div className="vi-scale-note">
                <span>文本脫靶 &lt; 40%</span>
                <span>部分偏離 40-64%</span>
                <span>依規朗讀 ≥ 65%</span>
              </div>
            </div>
          )}
        </div>

        {/* FFT Frequency breakdown */}
        <div className="voice-fft-box">
          <span className="fft-title">語音頻段能量分佈比 (FFT Spectral Shift)</span>
          <div className="fft-bars">
            <div className="fft-col"><div className="fft-fill" style={{ height: '45%' }} /><small>低頻 80Hz</small></div>
            <div className="fft-col"><div className="fft-fill" style={{ height: '78%' }} /><small>基頻 220Hz</small></div>
            <div className="fft-col"><div className="fft-fill" style={{ height: '88%' }} /><small>共振 800Hz</small></div>
            <div className="fft-col"><div className="fft-fill warning" style={{ height: '62%' }} /><small>高頻 2.4kHz</small></div>
            <div className="fft-col"><div className="fft-fill warning" style={{ height: '48%' }} /><small>張力 4.0kHz</small></div>
          </div>
          <p className="fft-note">高頻共振峰抬升 14%，反映交感神經支配引致喉部肌肉緊繃。</p>
        </div>
      </div>
    </div>
  )
}

// 05. 微重力骨骼重塑與骨質疏鬆推演圖表
function BoneChart({ results }: { results: Results }) {
  const b = results.bone || computeBoneLoss(65, 92)
  const sol = b.sol
  const onset = b.onsetDay
  const bmdLoss = b.bmdLossPct
  const rawLoss = b.unprotectedLossPct
  const tScore = b.tScore
  const daysToOsteo = b.daysToOsteoporosis
  const adherence = b.aredAdherence

  // Map T-score (-3.0 to +1.0) to percentage 0% - 100%
  const tPct = Math.max(5, Math.min(95, ((tScore - (-3.0)) / 4.0) * 100))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>微重力骨骼流失與骨質疏鬆退化推演 (BMD Degradation Model)</h4>
        <span className="chart-tag">NASA 骨動力學推演</span>
      </div>

      <div className="bone-modal-chart-wrap">
        {/* SVG Degradation curve comparing Natural Loss vs Protected Loss */}
        <div className="bone-curve-wrap" style={{ height: '140px' }}>
          <svg viewBox="0 0 500 130" className="bone-curve-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="modal-protected-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--green)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid reference lines */}
            <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="0" y1="65" x2="500" y2="65" stroke="rgba(245,158,11,0.3)" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,77,94,0.35)" strokeDasharray="3 3" />

            {/* Labels on SVG */}
            <text x="8" y="16" fill="rgba(255,255,255,0.5)" fontSize="9">骨質健全 Baseline (T &gt; 0 / 0% 流失)</text>
            <text x="8" y="61" fill="rgba(245,158,11,0.8)" fontSize="9">骨質減少 Osteopenia (T &lt; -1.0 / -10% BMD)</text>
            <text x="8" y="106" fill="rgba(255,77,94,0.8)" fontSize="9">骨質疏鬆 Osteoporosis (T &lt; -2.5 / -20% BMD)</text>

            {/* Natural Unprotected Degradation Line (Red Dashed) */}
            <path
              d="M0,20 L25,20 Q120,40 200,68 T380,118 L500,120"
              fill="none"
              stroke="#ff4d5e"
              strokeWidth="2"
              strokeDasharray="4 3"
            />

            {/* Protected with ARED Countermeasure Line (Green Solid) */}
            <path
              d="M0,20 L25,20 Q150,26 300,36 T500,50"
              fill="none"
              stroke="var(--green)"
              strokeWidth="2.5"
            />

            {/* Current Sol Indicator Vertical Line */}
            <line x1="90" y1="10" x2="90" y2="125" stroke="#00b4ff" strokeWidth="1.5" />
            <circle cx="90" cy="23" r="4.5" fill="var(--green)" stroke="#00b4ff" strokeWidth="2" />
            <text x="98" y="25" fill="#00b4ff" fontSize="10" fontWeight="700">當前 Sol {sol}</text>
          </svg>
        </div>

        {/* T-Score Clinical Gauge Bar */}
        <div className="range-bar-item" style={{ marginTop: '12px' }}>
          <div className="range-bar-title">
            <span>臨床推算骨密度 T 值 (T-Score) 狀態分佈</span>
            <strong className="chart-val" style={{ color: tScore < -1.0 ? '#ff4d5e' : 'var(--green)' }}>
              T = {tScore}
            </strong>
          </div>
          <div className="range-bar-track">
            <div className="range-segment warning" style={{ width: '25%' }}>
              <span>骨質疏鬆 &lt; -2.5</span>
            </div>
            <div className="range-segment advisory" style={{ width: '37.5%' }}>
              <span>骨質減少 -2.5 ~ -1.0</span>
            </div>
            <div className="range-segment nominal" style={{ width: '37.5%' }}>
              <span>骨質健全 ≥ -1.0</span>
            </div>
            <div className="range-pointer" style={{ left: `${tPct}%` }}>
              <div className="pointer-pin" />
              <div className="pointer-label">{tScore}</div>
            </div>
          </div>
        </div>

        {/* 4 Multi-Parameter Cards */}
        <div className="bone-modal-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '14px' }}>
          <div className="bt-info-item">
            <span className="bt-k">破骨重塑失衡</span>
            <span className="bt-v text-cyan">Sol {onset}</span>
            <small>破骨細胞凋亡受阻</small>
          </div>
          <div className="bt-info-item">
            <span className="bt-k">累積 BMD 流失</span>
            <span className="bt-v text-green">-{bmdLoss}%</span>
            <small className="text-muted">(無防護 -{rawLoss}%)</small>
          </div>
          <div className="bt-info-item">
            <span className="bt-k">距骨質疏鬆</span>
            <span className="bt-v text-cyan">&gt; {daysToOsteo} 天</span>
            <small>ARED 抑制 75% 流失</small>
          </div>
          <div className="bt-info-item">
            <span className="bt-k">ARED 執行率</span>
            <span className="bt-v text-green">{adherence}%</span>
            <small>處方耐受度達標</small>
          </div>
        </div>

        {/* Clinical Interpretation Note */}
        <p className="dls-desc" style={{ marginTop: '10px' }}>
          NASA 骨代謝推演：在微重力無負載環境下，破骨細胞自 Sol {onset} 起活性高於成骨細胞。當前 ARED 處方有效將每月流失率由 -1.2% 壓制至 -0.3%，預估任務期間骨結構可維持在安全臨床閾值內。
        </p>
      </div>
    </div>
  )
}

// 06. 皮膚紅疹快篩圖表
function SkinChart({ results }: { results: Results }) {
  const redness = results.skin?.rednessPct ?? 5.6
  const redPct = Math.min(100, (redness / 12) * 100)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>皮膚紅斑病灶面積比與光譜色相偏移直方圖</h4>
        <span className="chart-tag">組織過敏與潛伏病毒</span>
      </div>

      <div className="skin-analysis-wrap">
        {/* Redness Area Bar */}
        <div className="skin-area-gauge">
          <div className="skin-gauge-head">
            <span>紅斑病灶佔比 (Erythema Area %)</span>
            <strong className="skin-val">{redness} %</strong>
          </div>
          <div className="skin-track">
            <div className="skin-seg nominal" style={{ width: '25%' }}><span>正常 ≤ 3.0%</span></div>
            <div className="skin-seg advisory" style={{ width: '41.6%' }}><span>注意 3.0-8.0%</span></div>
            <div className="skin-seg warning" style={{ width: '33.4%' }}><span>警戒 &gt; 8.0%</span></div>
            <div className="skin-pin" style={{ left: `${redPct}%` }}>
              <div className="pin-triangle" />
              <span className="pin-text">{redness}%</span>
            </div>
          </div>
        </div>

        {/* Color Spectrum Shift */}
        <div className="skin-spectrum-box">
          <span className="spec-title">RGB 色相差偏移分析 (ΔHue Spectrum)</span>
          <div className="spec-bars">
            <div className="spec-bar-group">
              <div className="spec-fill baseline" style={{ height: '30%' }} />
              <small>正常皮膚基線</small>
            </div>
            <div className="spec-bar-group">
              <div className="spec-fill lesion" style={{ height: '76%' }} />
              <small>患部微血管擴張</small>
            </div>
          </div>
          <p className="spec-desc">微血管充血紅光波長吸收顯著提升，提示接觸性皮炎或帶狀疱疹初期，建議外用軟膏並隔離追蹤。</p>
        </div>
      </div>
    </div>
  )
}

// 07. 綜合免疫脆弱度圖表
function ImmuneChart({ results, env }: { results: Results; env: Env }) {
  const { t, lang } = useI18n()
  const b = computeImmuneBreakdown(env, results)
  const idx = b.total
  const level = evaluateImmuneLevel(env, results)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>{lang === 'en' ? 'Multi-System Vulnerability: 4-Factor Risk Weight Breakdown' : '多系統交叉運算：免疫脆弱度 4 大成因加權分解圖'}</h4>
        <span className="chart-tag">{lang === 'en' ? 'Systemic Immunity' : '全身生理防禦'}</span>
      </div>

      <div className="immune-analysis-wrap">
        {/* Total Score Meter */}
        <div className="immune-score-col">
          <div className="immune-gauge-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={level === 'warning' ? '#ff4d5e' : level === 'advisory' ? '#ffd043' : '#10e6a0'}
                strokeWidth="8"
                strokeDasharray={`${idx * 2.64} 264`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="ring-center">
              <b>{idx}</b>
              <small>/ 100</small>
            </div>
          </div>
          <span className={`ring-status ${level === 'warning' ? 'status-warn' : level === 'advisory' ? 'status-adv' : 'status-nom'}`}>
            {level === 'warning'
              ? (lang === 'en' ? 'High Vulnerability (Alert)' : '高度脆弱 (警戒)')
              : level === 'advisory'
              ? (lang === 'en' ? 'Suppressed (Advisory)' : '功能受抑制 (注意)')
              : (lang === 'en' ? 'Robust Defense' : '防禦健全')}
          </span>
          {level === 'warning' && idx < 45 && (
            <small style={{ color: '#ff4d5e', fontSize: '9px', marginTop: '4px', textAlign: 'center', lineHeight: 1.2 }}>
              {lang === 'en' ? '⚠️ Single Deficit Triggered Alert' : '⚠️ 觸發單項重大紅燈聯鎖警戒'}
            </small>
          )}
        </div>

        {/* Subsystem Contribution Stack */}
        <div className="immune-contrib-col">
          <span className="contrib-title">{lang === 'en' ? '4 Risk Factor Contributions (Total Weight 100%)' : '4 大危險因子加權貢獻分解 (總權重 100%)'}</span>
          <div className="contrib-list">
            <div className="contrib-row">
              <span className="cr-name">{lang === 'en' ? `Cumulative Radiation (${env.cumulative.toFixed(0)} mSv)` : `累積深空輻射負荷 (${env.cumulative.toFixed(0)} mSv)`}</span>
              <div className="cr-bar"><div className="cr-fill" style={{ width: `${(b.rad / 40) * 100}%` }} /></div>
              <strong className="cr-val">+{b.rad} {lang === 'en' ? 'pts' : '分'}</strong>
            </div>
            <div className="contrib-row">
              <span className="cr-name">{lang === 'en' ? 'Cognitive Fatigue & Sleep Loss (PVT)' : '認知疲勞與睡眠缺失 (PVT)'}</span>
              <div className="cr-bar"><div className="cr-fill" style={{ width: `${(b.pvt / 20) * 100}%` }} /></div>
              <strong className="cr-val">{results.pvt ? `+${b.pvt} ${lang === 'en' ? 'pts' : '分'}` : (lang === 'en' ? 'Pending' : '待測驗')}</strong>
            </div>
            <div className="contrib-row">
              <span className="cr-name">{lang === 'en' ? 'Autonomic & Vagal Imbalance (rPPG)' : '自律神經與迷走抗炎失衡 (rPPG)'}</span>
              <div className="cr-bar"><div className="cr-fill" style={{ width: `${(b.rppg / 20) * 100}%` }} /></div>
              <strong className="cr-val">{results.rppg ? `+${b.rppg} ${lang === 'en' ? 'pts' : '分'}` : (lang === 'en' ? 'Pending' : '待測驗')}</strong>
            </div>
            <div className="contrib-row">
              <span className="cr-name">{lang === 'en' ? 'Sympathetic Psychological Stress (Voice)' : '神經交感心理負荷 (Voice)'}</span>
              <div className="cr-bar"><div className="cr-fill" style={{ width: `${(b.voice / 20) * 100}%` }} /></div>
              <strong className="cr-val">{results.voice ? `+${b.voice} ${lang === 'en' ? 'pts' : '分'}` : (lang === 'en' ? 'Pending' : '待測驗')}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
