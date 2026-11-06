import { useEffect, useRef, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { Stat, TestCard, median, openStream, stopStream } from './TestCard'
import { evaluate } from '../lib/engine'
import type { Env, Results } from '../types/health'

export default function SkinTest({ results, env, onResult }: { results: Results; env: Env; onResult: (v: Results['skin']) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const shot = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState('')
  const r = results.skin

  useEffect(() => () => stopStream(stream.current), [])

  const open = async () => {
    setMsg('')
    try {
      stream.current = await openStream({ video: { facingMode: 'environment', width: 640, height: 480 }, audio: false })
      video.current!.srcObject = stream.current; await video.current!.play(); setOn(true)
    } catch (e: any) { setMsg(`無法開啟相機：${e.message}`) }
  }

  const capture = () => {
    const v = video.current!, c = shot.current!, ctx = c.getContext('2d', { willReadFrequently: true })!
    c.width = 320; c.height = 240
    ctx.drawImage(v, 0, 0, 320, 240)
    stopStream(stream.current); setOn(false)
    const x0 = 64, y0 = 48, w = 192, h = 144
    const img = ctx.getImageData(x0, y0, w, h)
    const dif: number[] = []
    for (let i = 0; i < img.data.length; i += 4) dif.push(img.data[i] - img.data[i + 1])
    const base = median(dif.filter((_, i) => i % 7 === 0))
    let red = 0
    for (let i = 0; i < dif.length; i++) {
      if (dif[i] > base + 28 && img.data[i * 4] > 90) { red++; img.data[i * 4] = 255; img.data[i * 4 + 1] = 40; img.data[i * 4 + 2] = 70 }
    }
    ctx.putImageData(img, x0, y0)
    ctx.strokeStyle = '#f4f9ff'; ctx.strokeRect(x0, y0, w, h)
    onResult({ rednessPct: +((red / dif.length) * 100).toFixed(1) })
  }

  const level = evaluate(env, results).skin
  return (
    <TestCard id="test-skin" step="06" title="皮膚紅疹與過敏快篩" sub="輻射／壓力誘發免疫抑制 · 紅斑面積色相分析" duration="隨選" level={level} done={!!r}>
      <div className={`viewport ${on ? 'live' : ''}`}>
        <video ref={video} muted playsInline style={{ display: on ? 'block' : 'none' }} />
        <canvas ref={shot} className="shot" style={{ display: on ? 'none' : r ? 'block' : 'none' }} />
        {!on && !r && <div className="viewport-idle"><ScanLine size={28} /><span>將患部對準方框拍照</span></div>}
        {on && <div className="roi-guide wide"><span>患部</span></div>}
      </div>
      {r && <div className="stats"><Stat label="紅斑面積" value={r.rednessPct} unit=" %" /></div>}
      {msg && <p className="msg-warn">{msg}</p>}
      {on
        ? <button id="btn-skin-capture" className="btn-primary" onClick={capture}>拍攝並分析</button>
        : <button id="btn-skin" className="btn-primary" onClick={open}>{r ? '重新拍攝' : '開啟相機'}</button>}
    </TestCard>
  )
}
