export type Level = 'nominal' | 'advisory' | 'warning'
export type StatusLevel = 'untested' | 'insufficient' | 'nominal' | 'advisory' | 'warning'

export interface RppgResult {
  bpm: number
  hrv: number
  insufficient?: boolean
  reason?: string
}

export interface PvtResult {
  median: number
  lapses: number
  falseStarts: number
  rts: number[]
  insufficient?: boolean
  reason?: string
}

export interface AmslerResult {
  marks: number
  rightMarks?: number
  leftMarks?: number
  centralMarks?: number
  paracentralMarks?: number
  peripheralMarks?: number
  temporalOuterMarks?: number
  minEccentricity?: number | null
  zoneSummary?: string
  eyes: string
  insufficient?: boolean
  reason?: string
}

export interface VoiceResult {
  jitter: number
  pause: number
  stress: number
  textMatch?: number
  pitchInstability?: number
  anomalyTag?: string
  insufficient?: boolean
  reason?: string
}
export interface SquatResult { reps: number; depth: number; symmetry: number; dls: number }
export interface BoneResult {
  sol: number
  onsetDay: number
  bmdLossPct: number
  unprotectedLossPct: number
  tScore: number
  daysToOsteopenia: number
  daysToOsteoporosis: number
  aredAdherence: number
}
export interface SkinResult { rednessPct: number }

export interface Results {
  rppg?: RppgResult
  pvt?: PvtResult
  amsler?: AmslerResult
  voice?: VoiceResult
  squat?: SquatResult
  bone?: BoneResult
  skin?: SkinResult
}

export interface Env {
  co2: number // mmHg
  pressure: number // psi
  doseRate: number // uSv/h
  cumulative: number // mSv
  storm: boolean
}

export interface ActionItem {
  id?: string
  category: 'exercise' | 'nutrition' | 'environment' | 'rest' | 'comms'
  title: string
  detail: string
  level: Level
}
