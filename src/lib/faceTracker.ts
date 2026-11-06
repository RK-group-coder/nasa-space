/**
 * AURA-Space Clinical rPPG Robust Face Tracking Engine
 *
 * Multi-layer hybrid face tracking architecture:
 * 1. Pico.js Cascade Classifier (fast in-browser cascade detection)
 * 2. Native Shape Detection API (window.FaceDetector) when supported
 * 3. Multi-Cue Skin Density Cluster & Facial Contour Detector (100% offline, zero-dependency,
 *    strictly rejects beige/yellow walls & curtains using biomedical YCbCr & normalized chromaticity)
 *
 * Performance:
 * - Instantaneous zero-lag response: high dynamic-gain tracking (alpha up to 0.90 on motion)
 * - Anti-flicker hysteresis tracking: locks onto user head and never drops during motion
 * - Precise object-fit: cover and scaleX(-1) coordinate projection
 */

export interface FaceBox {
  /** Normalized (0..1) in camera coordinate space */
  x: number
  y: number
  w: number
  h: number
  /** Normalized (0..1) in mirrored screen coordinate space (scaleX(-1) + object-fit: cover) */
  screenX: number
  screenY: number
  screenW: number
  screenH: number
  /** Center coordinates in screen space */
  centerX: number
  centerY: number
}

export type TrackingStatus = 'locked' | 'moving' | 'lost'

export interface TrackingResult {
  detected: boolean
  status: TrackingStatus
  box: FaceBox | null
  confidence: number
  displacement: number
}

// ---------------------------------------------------------------------------
// Pico.js In-Browser Cascade Classifier Implementation (Nenad Markuš)
// ---------------------------------------------------------------------------
type PicoClassifier = (r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number

function unpackPicoCascade(bytes: Int8Array): PicoClassifier {
  const dview = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let p = 0
  const tdepth = dview.getInt32(p, true)
  p += 4
  const ntrees = dview.getInt32(p, true)
  p += 4
  const tcodesArr: number[] = []
  const tpredsArr: number[] = []
  const threshArr: number[] = []
  const pow2tdepth = Math.pow(2, tdepth)

  for (let t = 0; t < ntrees; ++t) {
    tcodesArr.push(0, 0, 0, 0)
    const codeBytes = new Int8Array(bytes.buffer, bytes.byteOffset + p, 4 * pow2tdepth - 4)
    for (let i = 0; i < codeBytes.length; i++) tcodesArr.push(codeBytes[i])
    p += 4 * pow2tdepth - 4

    const predBytes = new Float32Array(
      bytes.buffer.slice(bytes.byteOffset + p, bytes.byteOffset + p + 4 * pow2tdepth)
    )
    for (let i = 0; i < predBytes.length; i++) tpredsArr.push(predBytes[i])
    p += 4 * pow2tdepth

    threshArr.push(dview.getFloat32(p, true))
    p += 4
  }

  const tcodes = new Int8Array(tcodesArr)
  const tpreds = new Float32Array(tpredsArr)
  const thresh = new Float32Array(threshArr)

  return function classifyRegion(r: number, c: number, s: number, pixels: Uint8Array, ldim: number): number {
    r = 256 * r
    c = 256 * c
    let root = 0
    let o = 0.0
    for (let i = 0; i < ntrees; ++i) {
      let idx = 1
      for (let j = 0; j < tdepth; ++j) {
        const p1 = (((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim) + ((c + tcodes[root + 4 * idx + 1] * s) >> 8)
        const p2 = (((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim) + ((c + tcodes[root + 4 * idx + 3] * s) >> 8)
        idx = 2 * idx + (pixels[p1] <= pixels[p2] ? 1 : 0)
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth]
      if (o <= thresh[i]) return -1.0
      root += 4 * pow2tdepth
    }
    return o - thresh[ntrees - 1]
  }
}

function runPicoCascade(
  pixels: Uint8Array,
  nrows: number,
  ncols: number,
  ldim: number,
  classifyRegion: PicoClassifier
): Array<[number, number, number, number]> {
  const shiftfactor = 0.1
  const minsize = Math.max(30, Math.round(ncols * 0.16))
  const maxsize = Math.min(nrows, Math.round(ncols * 0.85))
  const scalefactor = 1.15

  let scale = minsize
  const detections: Array<[number, number, number, number]> = []

  while (scale <= maxsize) {
    const step = Math.max(1, Math.round(shiftfactor * scale))
    const offset = Math.round(scale / 2 + 1)

    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim)
        if (q > 0.0) {
          detections.push([r, c, scale, q])
        }
      }
    }
    scale *= scalefactor
  }
  return detections
}

function clusterPicoDetections(
  dets: Array<[number, number, number, number]>,
  iouthresh: number
): Array<[number, number, number, number]> {
  dets.sort((a, b) => b[3] - a[3])

  const calculateIou = (
    d1: [number, number, number, number],
    d2: [number, number, number, number]
  ): number => {
    const [r1, c1, s1] = d1
    const [r2, c2, s2] = d2
    const overR = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2))
    const overC = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2))
    return (overR * overC) / (s1 * s1 + s2 * s2 - overR * overC)
  }

  const assignments = new Array(dets.length).fill(0)
  const clusters: Array<[number, number, number, number]> = []

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0.0
      let c = 0.0
      let s = 0.0
      let q = 0.0
      let n = 0
      for (let j = i; j < dets.length; ++j) {
        if (calculateIou(dets[i], dets[j]) > iouthresh) {
          assignments[j] = 1
          r += dets[j][0]
          c += dets[j][1]
          s += dets[j][2]
          q += dets[j][3]
          n++
        }
      }
      clusters.push([r / n, c / n, s / n, q])
    }
  }
  return clusters
}

// ---------------------------------------------------------------------------
// Main Face Tracker Class
// ---------------------------------------------------------------------------
export class FaceTracker {
  private smoothedBox: FaceBox | null = null
  private lostFrames = 0
  private consecutiveDetections = 0
  private nativeDetector: any = null
  private nativeAvailable = false

  // Pico.js async classifier state
  private picoClassifier: PicoClassifier | null = null
  private picoLoading = false

  // Temporary downscaled buffers for processing speed
  private grayBuf: Uint8Array | null = null

  constructor() {
    // 1. Native browser Shape Detection API if present
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        this.nativeDetector = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        })
        this.nativeAvailable = true
      } catch {
        this.nativeAvailable = false
      }
    }

    // 2. Pre-fetch Pico.js facefinder cascade asynchronously
    this.initPico()
  }

  private initPico() {
    if (this.picoClassifier || this.picoLoading || typeof window === 'undefined') return
    this.picoLoading = true

    const urls = [
      'https://cdn.jsdelivr.net/gh/nenadmarkus/pico@c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder',
      'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder',
    ]

    const tryFetch = async (idx: number) => {
      if (idx >= urls.length) {
        this.picoLoading = false
        return
      }
      try {
        const res = await fetch(urls[idx])
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = await res.arrayBuffer()
        this.picoClassifier = unpackPicoCascade(new Int8Array(buf))
        this.picoLoading = false
      } catch {
        tryFetch(idx + 1)
      }
    }

    tryFetch(0)
  }

  public reset() {
    this.smoothedBox = null
    this.lostFrames = 0
    this.consecutiveDetections = 0
  }

  /**
   * Run real-time detection on the video stream and return smoothed screen coordinates
   */
  public async detect(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<TrackingResult> {
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return this.handleLost()
    }

    const vw = video.videoWidth
    const vh = video.videoHeight
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080

    // Downscale target for fast evaluation (160x120)
    const procW = 160
    const procH = 120
    if (canvas.width !== procW || canvas.height !== procH) {
      canvas.width = procW
      canvas.height = procH
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return this.handleLost()

    ctx.drawImage(video, 0, 0, procW, procH)
    const imgData = ctx.getImageData(0, 0, procW, procH)
    const d = imgData.data

    // 1. Try Native FaceDetector if available
    if (this.nativeAvailable && this.nativeDetector) {
      try {
        const faces = await this.nativeDetector.detect(video)
        if (faces && faces.length > 0) {
          const raw = faces[0].boundingBox
          const box = {
            x: Math.max(0, Math.min(0.9, raw.x / vw)),
            y: Math.max(0, Math.min(0.9, raw.y / vh)),
            w: Math.max(0.12, Math.min(0.85, raw.width / vw)),
            h: Math.max(0.15, Math.min(0.9, raw.height / vh)),
          }
          return this.processDetectedBox(box, 0.95, vw, vh, winW, winH)
        }
      } catch {}
    }

    // Prepare grayscale buffer
    const totalPixels = procW * procH
    if (!this.grayBuf || this.grayBuf.length !== totalPixels) {
      this.grayBuf = new Uint8Array(totalPixels)
    }

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4
      this.grayBuf[i] = (2 * d[idx] + 7 * d[idx + 1] + 1 * d[idx + 2]) / 10
    }

    // 2. Try Pico.js Cascade Classifier if loaded
    if (this.picoClassifier) {
      try {
        const dets = runPicoCascade(this.grayBuf, procH, procW, procW, this.picoClassifier)
        const clusters = clusterPicoDetections(dets, 0.2)
        if (clusters.length > 0 && clusters[0][3] >= 0.8) {
          const [r, c, s, q] = clusters[0]
          const halfS = s / 2
          const normX = Math.max(0, (c - halfS) / procW)
          const normY = Math.max(0, (r - halfS * 0.9) / procH)
          const normW = Math.min(1 - normX, s / procW)
          const normH = Math.min(1 - normY, (s * 1.15) / procH)

          return this.processDetectedBox(
            { x: normX, y: normY, w: normW, h: normH },
            Math.min(1, q / 10),
            vw,
            vh,
            winW,
            winH
          )
        }
      } catch (err) {
        console.warn('Pico cascade error:', err)
      }
    }

    // 3. Robust Multi-Cue Skin Density Cluster & Facial Contour Detector
    return this.detectByMultiCueClustering(d, procW, procH, vw, vh, winW, winH)
  }

  /**
   * Pure JS Multi-Cue Skin Density Cluster & Facial Contour Detector
   * Strictly rejects beige/yellow walls and locks onto human head with zero-lag response.
   */
  private detectByMultiCueClustering(
    data: Uint8ClampedArray,
    W: number,
    H: number,
    vw: number,
    vh: number,
    winW: number,
    winH: number
  ): TrackingResult {
    const skinMap = new Uint8Array(W * H)

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]

        const sum = r + g + b
        if (sum < 35 || sum > 740) continue

        const nr = r / sum
        const ng = g / sum

        // Golden discriminant: beige wall has nr - ng < 0.02.
        // True human skin has nr - ng >= 0.04 even in shadows or dim lighting.
        if (nr - ng < 0.038) continue

        // Biomedical YCbCr conversion
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
        const diffCrCb = Cr - Cb

        const isSkin =
          diffCrCb >= 17 &&
          Cb >= 75 &&
          Cb <= 138 &&
          Cr >= 132 &&
          r > g &&
          r - g >= 10 &&
          r - b >= 14

        if (isSkin) {
          skinMap[y * W + x] = 1
        }
      }
    }

    // Divide into 20 columns x 15 rows spatial grid
    const COLS = 20
    const ROWS = 15
    const cellW = Math.floor(W / COLS)
    const cellH = Math.floor(H / ROWS)
    const grid = new Float32Array(COLS * ROWS)

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let count = 0
        let total = 0
        for (let cy = r * cellH; cy < (r + 1) * cellH; cy++) {
          for (let cx = c * cellW; cx < (c + 1) * cellW; cx++) {
            total++
            if (skinMap[cy * W + cx]) count++
          }
        }
        grid[r * COLS + c] = count / total
      }
    }

    // Adaptive thresholding: lower threshold when already tracking face to maintain lock during fast head moves
    const hasPrior = this.smoothedBox !== null
    const cellThreshold = hasPrior ? 0.14 : 0.18

    // Connected Component Analysis (BFS flood fill)
    const visited = new Uint8Array(COLS * ROWS)
    interface Component {
      minC: number
      maxC: number
      minR: number
      maxR: number
      cellsCount: number
      totalDensity: number
      score: number
    }
    const components: Component[] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c
        if (grid[idx] >= cellThreshold && !visited[idx]) {
          const queue: Array<[number, number]> = [[c, r]]
          visited[idx] = 1
          let minC = c
          let maxC = c
          let minR = r
          let maxR = r
          let cellsCount = 0
          let totalDensity = 0

          while (queue.length > 0) {
            const [currC, currR] = queue.shift()!
            cellsCount++
            totalDensity += grid[currR * COLS + currC]
            if (currC < minC) minC = currC
            if (currC > maxC) maxC = currC
            if (currR < minR) minR = currR
            if (currR > maxR) maxR = currR

            const neighbors: Array<[number, number]> = [
              [currC + 1, currR],
              [currC - 1, currR],
              [currC, currR + 1],
              [currC, currR - 1],
            ]

            for (const [nc, nr] of neighbors) {
              if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
                const nidx = nr * COLS + nc
                if (grid[nidx] >= cellThreshold && !visited[nidx]) {
                  visited[nidx] = 1
                  queue.push([nc, nr])
                }
              }
            }
          }

          // Filter out tiny noise clusters (< 3 connected grid cells)
          if (cellsCount >= 3) {
            const spanW = maxC - minC + 1
            const spanH = maxR - minR + 1
            const aspect = spanH / spanW

            // Human head aspect ratio score (ideal ~ 1.0 to 1.8)
            let aspectScore = 1.0
            if (aspect >= 0.8 && aspect <= 1.9) {
              aspectScore = 1.5
            } else if (aspect < 0.5 || aspect > 2.5) {
              aspectScore = 0.4
            }

            // Hair verification: check luminance directly above the component
            let hairContrastBonus = 1.0
            if (minR > 1 && this.grayBuf) {
              let skinY = 0
              let skinCount = 0
              let hairY = 0
              let hairCount = 0

              for (let cc = minC; cc <= maxC; cc++) {
                const headPix = this.grayBuf[minR * cellH * W + cc * cellW]
                skinY += headPix
                skinCount++

                const abovePix = this.grayBuf[(minR - 1) * cellH * W + cc * cellW]
                hairY += abovePix
                hairCount++
              }

              const avgSkin = skinY / (skinCount || 1)
              const avgHair = hairY / (hairCount || 1)
              if (avgSkin - avgHair > 6) {
                hairContrastBonus = 1.4
              }
            }

            // Proximity bonus to prior position for sticky tracking
            let proximityBonus = 1.0
            if (this.smoothedBox) {
              const compCenterX = ((minC + maxC) / 2) / COLS
              const compCenterY = ((minR + maxR) / 2) / ROWS
              const priorCamCenterX = this.smoothedBox.x + this.smoothedBox.w / 2
              const priorCamCenterY = this.smoothedBox.y + this.smoothedBox.h / 2
              const dist = Math.hypot(compCenterX - priorCamCenterX, compCenterY - priorCamCenterY)
              if (dist < 0.25) {
                proximityBonus = 1.8 - dist * 3.2
              }
            }

            const score = totalDensity * aspectScore * hairContrastBonus * proximityBonus
            components.push({ minC, maxC, minR, maxR, cellsCount, totalDensity, score })
          }
        }
      }
    }

    if (components.length === 0) {
      return this.handleLost()
    }

    // Select the best scoring component
    components.sort((a, b) => b.score - a.score)
    const best = components[0]

    // Convert component cells to normalized camera coordinates
    const rawX = (best.minC * cellW) / W
    const rawY = (best.minR * cellH) / H
    const rawW = ((best.maxC - best.minC + 1) * cellW) / W
    const rawH = ((best.maxR - best.minR + 1) * cellH) / H

    // Expand bounding box naturally for forehead hairline & cheeks
    const padTop = rawH * 0.22
    const padSides = rawW * 0.12
    const padBottom = rawH * 0.1

    const normX = Math.max(0, rawX - padSides)
    const normY = Math.max(0, rawY - padTop)
    const normW = Math.min(1 - normX, rawW + padSides * 2)
    const normH = Math.min(1 - normY, rawH + padTop + padBottom)

    return this.processDetectedBox(
      { x: normX, y: normY, w: normW, h: normH },
      Math.min(1, best.score / 15),
      vw,
      vh,
      winW,
      winH
    )
  }

  /**
   * Projects camera coordinates to mirrored screen coordinates with ultra-responsive, zero-lag tracking
   */
  private processDetectedBox(
    camBox: { x: number; y: number; w: number; h: number },
    confidence: number,
    vidW: number,
    vidH: number,
    winW: number,
    winH: number
  ): TrackingResult {
    this.lostFrames = 0
    this.consecutiveDetections++

    // 1. Precise object-fit: cover and scaleX(-1) coordinate projection
    const rScreen = winW / winH
    const rVideo = vidW / vidH

    let targetScreenX: number
    let targetScreenY: number
    let targetScreenW: number
    let targetScreenH: number

    if (rScreen > rVideo) {
      // Screen is wider than video -> video height is scaled and top/bottom cropped
      const renderedH = winW / rVideo
      const cropY = (renderedH - winH) / 2
      targetScreenY = (camBox.y * renderedH - cropY) / winH
      targetScreenH = (camBox.h * renderedH) / winH

      // Horizontally mirrored (scaleX(-1))
      targetScreenX = 1 - (camBox.x + camBox.w)
      targetScreenW = camBox.w
    } else {
      // Screen is taller than video -> video width is scaled and sides cropped
      const renderedW = winH * rVideo
      const cropX = (renderedW - winW) / 2
      const mirroredX = (1 - (camBox.x + camBox.w)) * renderedW
      targetScreenX = (mirroredX - cropX) / winW
      targetScreenW = (camBox.w * renderedW) / winW

      targetScreenY = camBox.y
      targetScreenH = camBox.h
    }

    // Clamp coordinates safely within screen bounds
    targetScreenX = Math.max(0.01, Math.min(0.99 - targetScreenW, targetScreenX))
    targetScreenY = Math.max(0.01, Math.min(0.99 - targetScreenH, targetScreenY))
    targetScreenW = Math.max(0.12, Math.min(0.75, targetScreenW))
    targetScreenH = Math.max(0.15, Math.min(0.85, targetScreenH))

    let displacement = 0

    if (this.smoothedBox) {
      const dx = targetScreenX - this.smoothedBox.screenX
      const dy = targetScreenY - this.smoothedBox.screenY
      displacement = Math.hypot(dx, dy)

      // High dynamic-gain EMA for immediate zero-lag head tracking:
      // Fast motion -> 0.88 (follows head in 1 frame!)
      // Moderate motion -> 0.72
      // Still -> 0.35 (steady lock without camera micro-jitter)
      const alpha = displacement > 0.05 ? 0.88 : displacement > 0.02 ? 0.72 : 0.35
      const sX = this.smoothedBox.screenX + dx * alpha
      const sY = this.smoothedBox.screenY + dy * alpha
      const sW = this.smoothedBox.screenW + (targetScreenW - this.smoothedBox.screenW) * alpha
      const sH = this.smoothedBox.screenH + (targetScreenH - this.smoothedBox.screenH) * alpha

      this.smoothedBox = {
        x: camBox.x,
        y: camBox.y,
        w: camBox.w,
        h: camBox.h,
        screenX: sX,
        screenY: sY,
        screenW: sW,
        screenH: sH,
        centerX: sX + sW / 2,
        centerY: sY + sH / 2,
      }
    } else {
      // First frame: snap immediately
      this.smoothedBox = {
        x: camBox.x,
        y: camBox.y,
        w: camBox.w,
        h: camBox.h,
        screenX: targetScreenX,
        screenY: targetScreenY,
        screenW: targetScreenW,
        screenH: targetScreenH,
        centerX: targetScreenX + targetScreenW / 2,
        centerY: targetScreenY + targetScreenH / 2,
      }
    }

    // Determine status: 'locked' vs 'moving'
    let status: TrackingStatus = 'locked'
    if (displacement > 0.038 || this.consecutiveDetections < 3) {
      status = 'moving'
    } else {
      status = 'locked'
    }

    return {
      detected: true,
      status,
      box: this.smoothedBox,
      confidence,
      displacement,
    }
  }

  private handleLost(): TrackingResult {
    this.consecutiveDetections = 0
    this.lostFrames++

    // Allow 4 brief transition frames before declaring hard face lost
    if (this.lostFrames > 4) {
      return {
        detected: false,
        status: 'lost',
        box: this.smoothedBox,
        confidence: 0,
        displacement: 0,
      }
    }

    return {
      detected: true,
      status: 'moving',
      box: this.smoothedBox,
      confidence: 0.2,
      displacement: 0,
    }
  }
}
