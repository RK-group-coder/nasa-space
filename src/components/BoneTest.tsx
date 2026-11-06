import { useState } from 'react'
import { Bone, Calculator, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Stat, TestCard } from './TestCard'
import { evaluate } from '../lib/engine'
import { computeBoneLoss } from '../lib/boneModel'
import type { Env, Results } from '../types/health'

export default function BoneTest({
  results,
  env,
  onResult,
}: {
  results: Results
  env: Env
  onResult: (v: Results['bone']) => void
}) {
  const [targetSol, setTargetSol] = useState(65)
  const [adherence, setAdherence] = useState(92)
  const [isSimulating, setIsSimulating] = useState(false)
  const r = results.bone

  const handleSimulate = (solToUse = targetSol, adhToUse = adherence) => {
    setIsSimulating(true)
    setTimeout(() => {
      const calculated = computeBoneLoss(solToUse, adhToUse)
      onResult(calculated)
      setIsSimulating(false)
    }, 400)
  }

  const level = evaluate(env, results).bone

  return (
    <TestCard
      id="test-bone"
      step="05"
      title="微重力骨骼重塑與骨質疏鬆推演"
      sub="NASA 骨流失動力學 · 任務累計 Sol · BMD 衰減模擬"
      duration="推演"
      level={level}
      done={!!r}
    >
      {!r ? (
        <div className="bone-setup-card">
          <div className="bone-setup-head">
            <Bone size={20} className="bone-icon-pulse" />
            <div>
              <strong>太空駐留骨骼流失動力學模型</strong>
              <p>無重力下平均第 14~21 天破骨細胞失衡啟動，每月自然流失 1.0%~1.5% 骨密度</p>
            </div>
          </div>

          <div className="bone-sol-selector">
            <div className="sol-label-row">
              <span>當前太空任務駐留累計：</span>
              <b>Sol {targetSol} 天</b>
            </div>
            <div className="sol-preset-chips">
              {[30, 65, 120, 180, 360].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip-btn ${targetSol === s ? 'active' : ''}`}
                  onClick={() => {
                    setTargetSol(s)
                  }}
                >
                  {s === 65 ? `Sol 65 (今日)` : s === 360 ? `Sol 360 (火星)` : `Sol ${s}`}
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-bone-sim"
            className="btn-primary"
            disabled={isSimulating}
            onClick={() => handleSimulate()}
          >
            <Calculator size={15} />
            {isSimulating ? '推演計算中…' : '計算並推演骨骼健康'}
          </button>
        </div>
      ) : (
        <div className="bone-result-summary">
          <div className="stats">
            <Stat label="累積 BMD 流失" value={`-${r.bmdLossPct}`} unit=" %" />
            <Stat label="骨密度 T 值" value={r.tScore} />
            <Stat label="破骨啟動日" value={`Sol ${r.onsetDay}`} />
          </div>

          <div className="bone-sim-bar-box">
            <div className="sim-bar-labels">
              <span>當前防護後流失: <b>-{r.bmdLossPct}%</b></span>
              <span className="unprotected-loss-label">無防護預估流失: -{r.unprotectedLossPct}%</span>
            </div>
            <div className="sim-progress-track">
              <div
                className="sim-progress-fill"
                style={{ width: `${Math.min(100, (r.bmdLossPct / 15) * 100)}%` }}
              />
              <div
                className="sim-unprotected-mark"
                style={{ left: `${Math.min(100, (r.unprotectedLossPct / 15) * 100)}%` }}
                title={`無防護預估流失: -${r.unprotectedLossPct}%`}
              />
            </div>
            <div className="sim-threshold-note">
              {r.tScore >= -1.0 ? (
                <span className="text-green flex-center">
                  <ShieldCheck size={13} /> 骨質健全 (NOMINAL) · 預估抵達骨質減少尚有 &gt;{r.daysToOsteopenia} 天
                </span>
              ) : (
                <span className="text-amber flex-center">
                  <AlertTriangle size={13} /> 注意：已進入骨質減少區間 (Osteopenia)
                </span>
              )}
            </div>
          </div>

          <button
            id="btn-bone-re"
            className="btn-secondary"
            onClick={() => handleSimulate()}
          >
            <RefreshCw size={14} /> 重新推演評估 (Sol {r.sol})
          </button>
        </div>
      )}
    </TestCard>
  )
}
