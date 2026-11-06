import { computeBoneLoss } from './boneModel'
import type { Env, Results } from '../types/health'

export const MISSION_START = new Date(2026, 8, 1) // 2026/09/01 local midnight

export function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function formatShortDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function formatFullDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function missionDay(d: Date): number {
  const clean = startOfDay(d)
  return Math.max(1, Math.floor((clean.getTime() - MISSION_START.getTime()) / 86400000) + 1)
}

export function hasCoreResults(r: Results | null | undefined): boolean {
  if (!r) return false
  return Boolean(r.pvt || r.amsler || r.rppg || r.voice)
}

export interface HistoricalDayRecord {
  results: Results | null
  env: Env
  defaultExecuted: Record<string, boolean>
}

/**
 * Deterministic historical mission telemetry + cabin environment + countermeasure record
 * for any past mission date (MISSION_START <= d < today).
 */
export function getHistoricalDayData(d: Date): HistoricalDayRecord {
  const clean = startOfDay(d)
  const sol = missionDay(clean)
  const date = clean.getDate()
  const month = clean.getMonth()
  const seed = date * 13 + month * 37 + sol * 5

  // Smooth cumulative deep-space radiation progression (~2.72 mSv/day -> ~182 mSv around Sol 67)
  const baseEnv: Env = {
    co2: +(2.65 + ((seed % 8) * 0.11)).toFixed(1),
    pressure: +(14.67 + ((seed % 6) * 0.012)).toFixed(2),
    doseRate: +(16.2 + ((seed % 9) * 0.45)).toFixed(1),
    cumulative: +(Math.max(2.5, sol * 2.72)).toFixed(1),
    storm: false,
  }

  if (clean < MISSION_START) {
    return { results: null, env: baseEnv, defaultExecuted: {} }
  }

  const bone = computeBoneLoss(sol, 90 + (seed % 5))
  const bucket = (date * 7 + month * 3) % 10

  // 1. All-Nominal days: buckets 0, 1, 2, 3, 7 (50% of mission days)
  if (bucket === 0 || bucket === 1 || bucket === 2 || bucket === 3 || bucket === 7) {
    const med = 248 + (seed % 38) // 248..285 ms
    const rts = [med - 14, med + 9, med - 19, med + 15, med]
    return {
      results: {
        pvt: { median: med, lapses: 0, falseStarts: 0, rts },
        amsler: {
          marks: 0,
          rightMarks: 0,
          leftMarks: 0,
          centralMarks: 0,
          paracentralMarks: 0,
          peripheralMarks: 0,
          minEccentricity: null,
          zoneSummary: '無異常',
          eyes: '雙眼正常',
        },
        rppg: { bpm: 61 + (seed % 17), hrv: 46 + (seed % 18) },
        voice: {
          stress: 17 + (seed % 18),
          jitter: +(0.88 + (seed % 7) * 0.11).toFixed(2),
          pause: +(0.14 + (seed % 7) * 0.012).toFixed(2),
        },
        bone,
      },
      env: baseEnv,
      defaultExecuted: {},
    }
  }

  // 2. Advisory day (Eye SANS mild distortion, action completed): bucket 4 (e.g. Nov 2)
  if (bucket === 4) {
    const med = 262 + (seed % 26)
    const rts = [med - 11, med + 12, med - 16, med + 8, med]
    const rM = 1
    const lM = seed % 2 // 0 or 1
    return {
      results: {
        pvt: { median: med, lapses: 0, falseStarts: 0, rts },
        amsler: {
          marks: rM + lM,
          rightMarks: rM,
          leftMarks: lM,
          centralMarks: 0,
          paracentralMarks: 1,
          peripheralMarks: lM,
          minEccentricity: +(3.9 + (seed % 7) * 0.15).toFixed(1),
          zoneSummary: '旁中心區 (3°–6°)',
          eyes: lM > 0 ? '雙眼輕微' : '右眼輕微',
        },
        rppg: { bpm: 67 + (seed % 14), hrv: 44 + (seed % 14) },
        voice: {
          stress: 22 + (seed % 14),
          jitter: +(1.08 + (seed % 5) * 0.1).toFixed(2),
          pause: +(0.17 + (seed % 5) * 0.01).toFixed(2),
        },
        bone,
      },
      env: baseEnv,
      defaultExecuted: { amsler: true },
    }
  }

  // 3. Advisory day (Voice mild stress, action pending/unfinished): bucket 5 (e.g. Nov 5)
  if (bucket === 5) {
    const med = 270 + (seed % 22)
    const rts = [med - 13, med + 14, med - 8, med + 19, med]
    return {
      results: {
        pvt: { median: med, lapses: 0, falseStarts: 0, rts },
        amsler: {
          marks: 0,
          rightMarks: 0,
          leftMarks: 0,
          centralMarks: 0,
          paracentralMarks: 0,
          peripheralMarks: 0,
          minEccentricity: null,
          zoneSummary: '無異常',
          eyes: '雙眼正常',
        },
        rppg: { bpm: 73 + (seed % 12), hrv: 42 + (seed % 11) },
        voice: {
          stress: 46 + (seed % 13),
          jitter: +(2.18 + (seed % 6) * 0.14).toFixed(2),
          pause: +(0.27 + (seed % 6) * 0.015).toFixed(2),
        },
        bone,
      },
      env: baseEnv,
      defaultExecuted: { voice: false },
    }
  }

  // 4. Advisory day (PVT mild fatigue, action completed): bucket 6
  if (bucket === 6) {
    const med = 328 + (seed % 36)
    const lapseRt = 516 + (seed % 28)
    const rts = [med - 24, lapseRt, med - 12, med + 18, med]
    return {
      results: {
        pvt: { median: med, lapses: 1, falseStarts: 0, rts },
        amsler: {
          marks: 0,
          rightMarks: 0,
          leftMarks: 0,
          centralMarks: 0,
          paracentralMarks: 0,
          peripheralMarks: 0,
          minEccentricity: null,
          zoneSummary: '無異常',
          eyes: '雙眼正常',
        },
        rppg: { bpm: 70 + (seed % 13), hrv: 43 + (seed % 12) },
        voice: {
          stress: 26 + (seed % 11),
          jitter: +(1.22 + (seed % 5) * 0.1).toFixed(2),
          pause: +(0.19 + (seed % 5) * 0.01).toFixed(2),
        },
        bone,
      },
      env: { ...baseEnv, co2: 3.4 },
      defaultExecuted: { pvt: true },
    }
  }

  // 5. Warning days: buckets 8, 9 (bucket 8 = all 2 completed, e.g. Nov 4; bucket 9 = 1/2 partial)
  const med = 416 + (seed % 28)
  const rts = [384 + (seed % 16), 538 + (seed % 34), med, 566 + (seed % 38), med - 18]
  return {
    results: {
      pvt: { median: med, lapses: 2, falseStarts: 1, rts },
      amsler: {
        marks: 0,
        rightMarks: 0,
        leftMarks: 0,
        centralMarks: 0,
        paracentralMarks: 0,
        peripheralMarks: 0,
        minEccentricity: null,
        zoneSummary: '無異常',
        eyes: '雙眼正常',
      },
      rppg: { bpm: 93 + (seed % 5), hrv: 34 + (seed % 4) },
      voice: {
        stress: 33 + (seed % 6),
        jitter: +(1.48 + (seed % 4) * 0.1).toFixed(2),
        pause: 0.22,
      },
      bone,
    },
    env: { ...baseEnv, co2: 3.8 },
    defaultExecuted: bucket === 8 ? { pvt: true, rppg: true } : { pvt: true, rppg: false },
  }
}

