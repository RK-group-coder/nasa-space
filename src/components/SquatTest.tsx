import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { Stat, TestCard, movingAvg, openStream, stopStream } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'

const DURATION = 10000
const W = 64, H = 48

/** Optical motion-based squat estimator (frame differencing). */
export default function SquatTest({ results, env, onResult }: { results: Results; env: Env; onResult: (v: Results['squat']) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const sampler = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const raf = useRef(0)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [live, setLive] = useState(0)
  const [msg, setMsg] = useState('')
  const r = results.squat

  useEffect(() => () => { cancelAnimationFrame(raf.current); stopStream(stream.current) }, [])

  const start = async () => {
    setMsg('')
    try { stream.current = await openStream({ video: { width: 640, height: 480 }, audio: false }) } catch (e: any) { setMsg(`無法開啟相機：${e.message}`); return }
    const v = video.current!
    v.srcObject = stream.current; await v.play()
    const ctx = sampler.current!.getContext('2d', { willReadFrequently: true })!
    let prev: Uint8ClampedArray | null = null
    const energy: number[] = [], cy: number[] = [], cx: number[] = []
    const t0 = performance.now()
    setRunning(true)
    const loop = () => {
      const now = performance.now()
      ctx.drawImage(v, 0, 0, W, H)
      const d = ctx.getImageData(0, 0, W, H).data
      if (prev) {
        let n = 0, sy = 0, sx = 0
        for (let i = 0; i < W * H; i++) {
          const k = i * 4
          const diff = Math.abs(d[k] - prev[k]) + Math.abs(d[k + 1] - prev[k + 1]) + Math.abs(d[k + 2] - prev[k + 2])
          if (diff > 60) { n++; sy += Math.floor(i / W); sx += i % W }
        }
        energy.push(n / (W * H)); cy.push(n > 8 ? sy / n / H : NaN); cx.push(n > 8 ? sx / n / W : NaN)
        setLive(Math.min(1, n / (W * H) * 8))
      }
      prev = new Uint8ClampedArray(d)
      const p = Math.min(1, (now - t0) / DURATION)
      setProgress(p)
      if (p < 1) { raf.current = requestAnimationFrame(loop); return }
      stopStream(stream.current); setRunning(false); setLive(0)
      analyze(energy, cy, cx)
    }
    raf.current = requestAnimationFrame(loop)
  }

  const analyze = (energy: number[], cy: number[], cx: number[]) => {
    const e = movingAvg(energy, 6)
    const mx = Math.max(...e)
    if (mx < 0.01) { setMsg('未偵測到明顯動作：請後退讓全身入鏡，並連續做 3 次深蹲。'); return }
    const thr = mx * 0.45
    let bursts = 0, minGap = 0
    for (let i = 1; i < e.length - 1; i++) {
      if (e[i] > thr && e[i] >= e[i - 1] && e[i] > e[i + 1] && i - minGap > 12) { bursts++; minGap = i }
    }
    const reps = Math.max(1, Math.min(5, Math.round(bursts / 2)))
    const ys = cy.filter((v, i) => !Number.isNaN(v) && e[i] > thr * 0.6)
    const xs = cx.filter((v, i) => !Number.isNaN(v) && e[i] > thr * 0.6)
    const depth = ys.length ? Math.min(1, (Math.max(...ys) - Math.min(...ys)) * 2.2) : 0.3
    const meanX = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5
    const symmetry = Math.round(Math.max(50, 100 - Math.abs(meanX - 0.5) * 160))
    const dls = +Math.min(1, (reps / 3) * (0.35 + 0.65 * depth)).toFixed(2)
    onResult({ reps, depth: +depth.toFixed(2), symmetry, dls })
  }

  const level = evaluate(env, results).bone
  return (
    <TestCard id="test-squat" step="05" title="關節運動學與骨骼刺激" sub="鏡頭動作追蹤 · 深蹲幅度 · Carter DLS 力學刺激" duration="≈ 10 s" level={level} done={!!r}>
      <div className={`viewport ${running ? 'live' : ''}`}>
        <video ref={video} muted playsInline />
        <canvas ref={sampler} width={W} height={H} hidden />
        {!running && <div className="viewport-idle"><Activity size={28} /><span>後退至全身入鏡，連續深蹲 3 次</span></div>}
        <div className="motion-meter"><i style={{ height: `${live * 100}%` }} /></div>
        <div className="progress"><i style={{ width: `${progress * 100}%` }} /></div>
      </div>
      {r && <div className="stats"><Stat label="偵測次數" value={r.reps} /><Stat label="下蹲幅度" value={Math.round(r.depth * 100)} unit=" %" /><Stat label="對稱性" value={r.symmetry} unit=" %" /><Stat label="DLS" value={r.dls.toFixed(2)} unit=" /1.00" /></div>}
      {msg && <p className="msg-warn">{msg}</p>}
      <button id="btn-squat" className="btn-primary" disabled={running} onClick={start}>{running ? '請連續做 3 次深蹲…' : r ? '重新測量' : '開始姿態測量'}</button>
    </TestCard>
  )
}
