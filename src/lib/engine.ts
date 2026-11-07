import type { ActionItem, Env, Level, StatusLevel, Results } from '../types/health'

export const RADIATION_LIMIT_MSV = 600

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))

export const worst = (...l: Level[]): Level =>
  l.includes('warning') ? 'warning' : l.includes('advisory') ? 'advisory' : 'nominal'

export interface SystemStatus {
  cardio: StatusLevel
  cognition: StatusLevel
  eye: StatusLevel
  mind: StatusLevel
  bone: StatusLevel
  skin: StatusLevel
  immune: Level
  environment: Level
  radiation: Level
}

export interface ImmuneBreakdown {
  rad: number
  pvt: number
  rppg: number
  voice: number
  total: number
  insufficientCount: number
  untestedCount: number
  hasInsufficient: boolean
}

/**
 * 4-Factor Immune Vulnerability Breakdown (Total weight = 100):
 * - Deep-space cumulative radiation: max 40 pts
 * - Cognitive fatigue & sleep loss (PVT): max 20 pts (reaction time + lapses)
 * - Autonomic & vagal anti-inflammatory tone (rPPG BPM + HRV): max 20 pts
 * - Sympathetic psychological stress (Voice): max 20 pts
 */
export function computeImmuneBreakdown(env: Env, r: Results): ImmuneBreakdown {
  const rad = Math.round(clamp(env.cumulative / RADIATION_LIMIT_MSV, 0, 1) * 40)

  const pvtInsufficient = Boolean(r.pvt?.insufficient)
  const rppgInsufficient = Boolean(r.rppg?.insufficient)
  const voiceInsufficient = Boolean(r.voice?.insufficient)
  const amslerInsufficient = Boolean(r.amsler?.insufficient)

  const insufficientCount = [pvtInsufficient, rppgInsufficient, voiceInsufficient, amslerInsufficient].filter(Boolean).length
  const untestedCount = [!r.pvt, !r.rppg, !r.voice, !r.amsler].filter(Boolean).length

  const pvt = r.pvt && !r.pvt.insufficient
    ? Math.round(
        clamp(
          clamp((r.pvt.median - 250) / 200, 0, 1) * 14 +
            clamp(r.pvt.lapses / 2, 0, 1) * 6,
          0,
          20,
        ),
      )
    : 0

  const rppg = r.rppg && !r.rppg.insufficient
    ? Math.round(
        clamp(
          clamp((52 - r.rppg.hrv) / 30, 0, 1) * 13 + clamp((r.rppg.bpm - 72) / 36, 0, 1) * 7,
          0,
          20,
        ),
      )
    : 0

  const voice = r.voice && !r.voice.insufficient ? Math.round(clamp(r.voice.stress / 100, 0, 1) * 20) : 0
  const total = Math.round(clamp(rad + pvt + rppg + voice, 0, 100))
  return { rad, pvt, rppg, voice, total, insufficientCount, untestedCount, hasInsufficient: insufficientCount > 0 }
}

/** Immune Vulnerability Index 0-100 (higher = worse). */
export function immuneIndex(env: Env, r: Results): number {
  return computeImmuneBreakdown(env, r).total
}

/**
 * NASA Multi-System Immune Vulnerability Evaluation:
 * Implements Liebig's Law of the Minimum & Critical Escalation:
 * In deep space, immune function is an interconnected neuro-endocrine-immune (NEI) network.
 * A severe failure in any single sensor domain (e.g. PVT severe fatigue, rPPG autonomic collapse)
 * floods the body with cortisol and catecholamines that suppress cell-mediated immunity (CMI).
 *
 * Escalation rules:
 * 1. WARNING (高度易感 / 警戒):
 *    - Total IVI >= 45, OR
 *    - Any single factor enters WARNING while combined with deep-space radiation (> 120 mSv)
 *      or any other elevated factor, OR
 *    - Multiple factors (>= 2) in ADVISORY / WARNING.
 * 2. ADVISORY (注意 / 抑制代償):
 *    - Total IVI >= 25, OR
 *    - Any single factor in WARNING or ADVISORY.
 * 3. NOMINAL (防禦健全):
 *    - Total IVI < 25 AND strictly zero warning/advisory factors.
 */
export function evaluateImmuneLevel(env: Env, r: Results): Level {
  const b = computeImmuneBreakdown(env, r)
  const idx = b.total

  const pvtWarn = Boolean(r.pvt && !r.pvt.insufficient && (r.pvt.median > 400 || r.pvt.lapses >= 2 || b.pvt >= 13))
  const pvtAdv = Boolean(r.pvt && !r.pvt.insufficient && (r.pvt.median > 300 || r.pvt.lapses >= 1 || b.pvt >= 8))

  const rppgWarn = Boolean(r.rppg && !r.rppg.insufficient && (r.rppg.bpm > 100 || r.rppg.hrv < 30 || b.rppg >= 13))
  const rppgAdv = Boolean(r.rppg && !r.rppg.insufficient && (r.rppg.bpm > 90 || r.rppg.hrv < 40 || b.rppg >= 8))

  const voiceWarn = Boolean(r.voice && !r.voice.insufficient && (r.voice.stress >= 65 || b.voice >= 13))
  const voiceAdv = Boolean(r.voice && !r.voice.insufficient && (r.voice.stress >= 40 || b.voice >= 8))

  const radWarn = env.storm || env.cumulative > RADIATION_LIMIT_MSV * 0.8 || b.rad >= 28
  const radAdv = env.cumulative > 120 || b.rad >= 8

  const hasCriticalWarning = pvtWarn || rppgWarn || voiceWarn || radWarn
  const abnormalFactorCount = [pvtAdv, rppgAdv, voiceAdv, radAdv].filter(Boolean).length

  if (
    idx >= 45 ||
    (hasCriticalWarning && radAdv) ||
    (hasCriticalWarning && abnormalFactorCount >= 2) ||
    abnormalFactorCount >= 3
  ) {
    return 'warning'
  }

  if (idx >= 25 || hasCriticalWarning || abnormalFactorCount >= 1) {
    return 'advisory'
  }

  return 'nominal'
}

export function evaluateAmsler(a?: Results['amsler']): StatusLevel {
  if (!a) return 'untested'
  if (a.insufficient) return 'insufficient'
  if (a.marks === 0) return 'nominal'
  if (a.centralMarks !== undefined) {
    if (a.centralMarks >= 1) return 'warning'
    const par = a.paracentralMarks ?? 0
    const per = a.peripheralMarks ?? 0
    if (par >= 3 || a.marks >= 5 || par * 2 + per >= 5) return 'warning'
    return 'advisory'
  }
  return a.marks >= 4 ? 'warning' : 'advisory'
}

export function evaluate(env: Env, r: Results): SystemStatus {
  const cardio: StatusLevel = !r.rppg ? 'untested'
    : r.rppg.insufficient ? 'insufficient'
    : r.rppg.bpm > 100 || r.rppg.hrv < 30 ? 'warning'
    : r.rppg.bpm > 90 || r.rppg.hrv < 40 ? 'advisory' : 'nominal'

  const cognition: StatusLevel = !r.pvt ? 'untested'
    : r.pvt.insufficient ? 'insufficient'
    : r.pvt.median > 400 || r.pvt.lapses >= 2 ? 'warning'
    : r.pvt.median > 300 || r.pvt.lapses >= 1 ? 'advisory' : 'nominal'

  const eye: StatusLevel = evaluateAmsler(r.amsler)

  const mind: StatusLevel = !r.voice ? 'untested'
    : r.voice.insufficient ? 'insufficient'
    : r.voice.stress >= 65 ? 'warning'
    : r.voice.stress >= 40 ? 'advisory' : 'nominal'

  const bone: StatusLevel = r.bone
    ? (r.bone.tScore < -1.0 || r.bone.bmdLossPct > 3.0 ? 'warning' : r.bone.bmdLossPct > 1.5 ? 'advisory' : 'nominal')
    : r.squat ? (r.squat.dls < 0.3 ? 'warning' : r.squat.dls < 0.5 ? 'advisory' : 'nominal') : 'nominal'

  const skin: StatusLevel = !r.skin ? 'nominal' : r.skin.rednessPct > 8 ? 'warning' : r.skin.rednessPct > 3 ? 'advisory' : 'nominal'
  const environment: Level = env.co2 > 5 ? 'warning' : env.co2 > 3.5 ? 'advisory' : 'nominal'
  const radiation: Level = env.storm || env.cumulative > RADIATION_LIMIT_MSV * 0.8 ? 'warning'
    : env.cumulative > RADIATION_LIMIT_MSV * 0.25 || env.doseRate > 30 ? 'advisory' : 'nominal'
  const immune: Level = evaluateImmuneLevel(env, r)
  return { cardio, cognition, eye, mind, bone, skin, immune, environment, radiation }
}

/** Cross-diagnostic engine: correlate sensor results with cabin environment. */
export function crossDiagnostics(env: Env, r: Results): { level: Level; text: string }[] {
  const s = evaluate(env, r)
  const out: { level: Level; text: string }[] = []

  const hasInsufficient =
    s.cognition === 'insufficient' ||
    s.cardio === 'insufficient' ||
    s.eye === 'insufficient' ||
    s.mind === 'insufficient'

  if (hasInsufficient) {
    out.push({
      level: 'advisory',
      text: '注意：今日晨檢包含「資料不足／需重測」項目。太空健康管理首要原則在於「不可將無效或受干擾數據誤判為健全」，請及時完成補測以消除多系統監護盲區。',
    })
  }

  const pvtElevated = s.cognition === 'warning' || s.cognition === 'advisory'
  const envElevated = s.environment === 'warning' || s.environment === 'advisory'

  if (pvtElevated && envElevated)
    out.push({ level: 'warning', text: `警告：PVT 反應遲鈍且居住艙 CO₂ 偏高（${env.co2.toFixed(1)} mmHg），可能是通風不良造成嗜睡與頭痛，請先檢查循環風扇，而非單純歸因於睡眠不足。` })
  else if (pvtElevated)
    out.push({ level: s.cognition as Level, text: '警覺度下降且艙內環境正常，疑似睡眠剝奪或晝夜節律失調，建議安排補眠。' })
  if (env.storm)
    out.push({ level: 'warning', text: '太陽粒子事件進行中：劑量率飆升，建議移至輻射屏蔽區（風暴避難所）並暫停艙外活動。' })
  if (
    (s.cardio === 'warning' || s.cardio === 'advisory') &&
    (s.mind === 'warning' || s.mind === 'advisory')
  )
    out.push({ level: 'advisory', text: '心率變異度下降同時語音壓力偏高，顯示交感神經持續過度活化，建議安排放鬆與社交通話。' })
  if (
    (s.eye === 'warning' || s.eye === 'advisory') &&
    (s.cardio === 'warning' || s.cardio === 'advisory')
  )
    out.push({ level: 'warning', text: '視野失真合併心血管負荷異常，疑似頭向體液轉移加劇（SANS 風險）。' })
  if (s.immune === 'warning') {
    const b = computeImmuneBreakdown(env, r)
    const isSingleTrigger = b.total < 45
    out.push({
      level: 'warning',
      text: isSingleTrigger
        ? `免疫脆弱度警報（聯鎖升級啟動）：檢測到單項重大致病因子異常（${s.cognition === 'warning' ? 'PVT 精神運動耗竭' : s.cardio === 'warning' ? '心血管自律失衡' : '高心理壓力'}）疊加深空累積輻射，神經-內分泌-免疫軸受抑，不可因其他項目未測而忽視，已啟動預防性感染警覺。`
        : `免疫脆弱度重度超標（總指數 ${b.total}/100）：多項生理防線同時受抑，細胞免疫顯著下降，嚴防潛伏病毒（EBV / VZV）重啟感染。`,
    })
  } else if (s.skin !== 'nominal' && s.skin !== 'untested' && s.skin !== 'insufficient' && s.immune !== 'nominal')
    out.push({ level: 'advisory', text: '皮膚紅斑合併免疫脆弱度偏高，需留意潛伏病毒（EBV / VZV）重啟，建議隔離觀察。' })
  if (!out.length) out.push({ level: 'nominal', text: '各系統交叉比對無顯著異常，維持目前任務節奏。' })
  return out
}

export function buildActions(env: Env, r: Results): ActionItem[] {
  const s = evaluate(env, r)
  const a: ActionItem[] = []

  // 00. 優先排入「資料不足／需重測」之數據補測處置（深空健康管理原則）
  if (r.pvt?.insufficient) {
    a.push({
      id: 'pvt-retest',
      category: 'rest',
      level: 'advisory',
      title: '【數據補測】排除干擾，重新完成 5 次 NASA-PVT 精神運動警覺測試',
      detail: `認知疲勞遙測資料不足（原因：${r.pvt.reason || '測驗未完成或搶跑干擾'}）。數據缺失無法排除微重力急性認知失能風險，請在無外部通訊干擾下專注完成 5 次刺激反應。`,
    })
  }

  if (r.amsler?.insufficient) {
    a.push({
      id: 'amsler-retest',
      category: 'exercise',
      level: 'advisory',
      title: '【數據補測】重新執行雙眼 Amsler 視野失真檢測',
      detail: `SANS 視網膜視野資料不足（原因：${r.amsler.reason || '雙眼凝視未滿或單眼中斷'}）。無法判斷頭向體液轉移是否侵犯中心視軸，請保持 30–33 cm 距離，依序完成雙眼中心紅點凝視掃描。`,
    })
  }

  if (r.rppg?.insufficient) {
    a.push({
      id: 'rppg-retest',
      category: 'environment',
      level: 'advisory',
      title: '【數據補測】校準照明光源，重新執行 rPPG 心血管脈搏掃描',
      detail: `光學心率與 HRV 資料不足（原因：${r.rppg.reason || '環境光線不足或臉部脫框'}）。健康監護原則：無法判讀之數據不可盲信為健全，請將面部光源調至 300+ Lux、臉部正面對準鏡頭並保持靜止 15 秒重新掃描。`,
    })
  }

  if (r.voice?.insufficient) {
    a.push({
      id: 'voice-retest',
      category: 'comms',
      level: 'advisory',
      title: '【數據補測】確認麥克風收音，重新完成語音壓力朗讀',
      detail: `聲學特徵資料不足（原因：${r.voice.reason || '有效發音幀數過低或音量過小'}）。請靠近麥克風並確認環境靜音，以自然聲量朗讀標準測試短文以完成自主評估。`,
    })
  }

  // 01. NASA-PVT 精神運動警覺異常處置 (僅在數據有效時觸發)
  if (r.pvt && !r.pvt.insufficient && (s.cognition === 'warning' || s.cognition === 'advisory')) {
    const co2Hint = s.environment !== 'nominal' ? `，並同步檢查艙內通風（CO₂ ${env.co2.toFixed(1)} mmHg）` : ''
    if (s.cognition === 'warning') {
      a.push({
        id: 'pvt',
        category: 'rest',
        level: 'warning',
        title: '安排 90 分鐘預防性補眠（Power Nap）',
        detail: `警覺度顯著下滑（中位反應 ${r.pvt.median} ms · 失神 ${r.pvt.lapses} 次）：暫停艙外與高風險精密操作權限，進行完整睡眠週期補眠${co2Hint}，醒後重測 PVT。`,
      })
    } else {
      a.push({
        id: 'pvt',
        category: 'rest',
        level: 'advisory',
        title: '25 分鐘恢復性小睡 + 480nm 藍光提神',
        detail: `反應輕度遲緩（中位反應 ${r.pvt.median} ms · 失神 ${r.pvt.lapses} 次）：排入短暫閉目休息並搭配高照度藍光提振清醒度${co2Hint}，避免連續單調監控作業。`,
      })
    }
  }

  // 02. Amsler 視覺失真 / SANS 異常處置 (僅在數據有效時觸發)
  if (r.amsler && !r.amsler.insufficient && (s.eye === 'warning' || s.eye === 'advisory')) {
    const rCnt = r.amsler.rightMarks ?? 0
    const lCnt = r.amsler.leftMarks ?? 0
    if (s.eye === 'warning') {
      a.push({
        id: 'amsler',
        category: 'exercise',
        level: 'warning',
        title: '下半身負壓（LBNP）40 分鐘 + 視網膜追蹤',
        detail: `檢出中心視區或顯著視覺失真（右眼 ${rCnt} 格 / 左眼 ${lCnt} 格）：立即以 LBNP 負壓將體液拉回下肢以減緩頭向體液轉移與視神經鞘壓力，減少高鈉飲食並通報航醫。`,
      })
    } else {
      a.push({
        id: 'amsler',
        category: 'exercise',
        level: 'advisory',
        title: '下半身負壓（LBNP）25 分鐘引流',
        detail: `檢出輕度視覺方格變形（右眼 ${rCnt} 格 / 左眼 ${lCnt} 格）：進行低強度下肢負壓引流並控制飲食鹽分，明日晨檢持續追蹤雙眼變化。`,
      })
    }
  }

  // 03. rPPG 心血管與自律神經異常處置 (僅在數據有效時觸發)
  if (r.rppg && !r.rppg.insufficient && (s.cardio === 'warning' || s.cardio === 'advisory')) {
    if (s.cardio === 'warning') {
      a.push({
        id: 'rppg',
        category: 'rest',
        level: 'warning',
        title: '暫緩高強度運動 · 共振深呼吸調節',
        detail: `心血管負荷過高（心率 ${r.rppg.bpm} BPM / HRV ${r.rppg.hrv} ms）：暫停高強度阻力訓練，改做 10 分鐘慢速腹式深呼吸（6 次/分）並補充水分，下午重新量測。`,
      })
    } else {
      a.push({
        id: 'rppg',
        category: 'exercise',
        level: 'advisory',
        title: '調降有氧運動強度 · 補充電解質水分',
        detail: `自律神經耐受輕度下降（心率 ${r.rppg.bpm} BPM / HRV ${r.rppg.hrv} ms）：今日跑步機負荷下調 20%，補充等滲透壓電解質飲水以穩定血漿容積。`,
      })
    }
  }

  // 04. 聲學語音壓力異常處置 (僅在數據有效時觸發)
  if (r.voice && !r.voice.insufficient && (s.mind === 'warning' || s.mind === 'advisory')) {
    if (s.mind === 'warning') {
      a.push({
        id: 'voice',
        category: 'environment',
        level: 'warning',
        title: '2700K 暖光減壓環境 + 心理支持通訊',
        detail: `語音壓力指數偏高（${r.voice.stress}/100 · 基頻微顫 ${r.voice.jitter}%）：生活艙切換低色溫暖光，減免今日非關鍵排程，安排 20 分鐘 VR 地球漫遊與家人通話。`,
      })
    } else {
      a.push({
        id: 'voice',
        category: 'environment',
        level: 'advisory',
        title: '2700K 暖光 + 放鬆行程',
        detail: `語音顯示輕度緊繃（壓力指數 ${r.voice.stress}/100）：生活艙切換暖光，下午排入 15 分鐘 VR 地球漫遊與家人通話，睡前提前調暗艙內藍光。`,
      })
    }
  }

  // Optional legacy/preset results if explicitly populated and abnormal
  if (r.bone && (s.bone === 'warning' || s.bone === 'advisory')) {
    a.push({
      id: 'bone',
      category: 'exercise',
      level: s.bone,
      title: '強化 ARED 骨骼力學負重處方',
      detail: `骨密度流失 ${r.bone.bmdLossPct}%：追加下肢抗阻訓練 +10% 負重，並補充維生素 D3／鈣片。`,
    })
  } else if (r.squat && (s.bone === 'warning' || s.bone === 'advisory')) {
    a.push({
      id: 'bone',
      category: 'exercise',
      level: s.bone,
      title: '微調 ARED 阻力處方',
      detail: `骨骼刺激 DLS ${r.squat.dls.toFixed(2)} 未達標：深蹲追加 2 組、負重 +5 kg。`,
    })
  }
  if (r.skin && (s.skin === 'warning' || s.skin === 'advisory')) {
    a.push({
      id: 'skin',
      category: 'nutrition',
      level: s.skin,
      title: '皮膚紅斑處置',
      detail: '外用抗組織胺／低濃度類固醇軟膏，並每日拍照追蹤。',
    })
  }
  if (s.immune === 'warning') {
    a.push({
      id: 'immune',
      category: 'nutrition',
      level: 'warning',
      title: '啟動 NASA 免疫防禦協議（抗氧化與抗病毒干預）',
      detail: '多系統交叉脆弱度警報已觸發：口服補充維生素 C (1000mg) + 鋅 (25mg) + 褪黑激素 (3mg) 抑制皮質醇免疫毒性；生活艙切換至低壓力模式，暫停高強度任務並持續追蹤唾液 EBV 載量。',
    })
  }

  // Prioritize WARNING countermeasures first
  a.sort((x, y) => (x.level === 'warning' ? 0 : 1) - (y.level === 'warning' ? 0 : 1))
  return a
}

/** Preset "Sol 142" demo scenario so the demo never fails. */
export const SOL142_RESULTS: Results = {
  rppg: { bpm: 94, hrv: 34 },
  pvt: { median: 342, lapses: 1, falseStarts: 0, rts: [310, 342, 288, 540, 355] },
  amsler: {
    marks: 3,
    rightMarks: 2,
    leftMarks: 1,
    centralMarks: 0,
    paracentralMarks: 2,
    peripheralMarks: 1,
    temporalOuterMarks: 1,
    minEccentricity: 4.2,
    zoneSummary: '旁中心區 (3°–6°)',
    eyes: '右眼較重',
  },
  voice: { jitter: 2.4, pause: 0.38, stress: 58 },
  squat: { reps: 3, depth: 0.52, symmetry: 91, dls: 0.38 },
  skin: { rednessPct: 5.6 },
}
