import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Context,
} from 'react'

export type Lang = 'zh' | 'en'

export interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, fallback?: string) => string
}

export const DICTIONARY: Record<Lang, Record<string, string>> = {
  zh: {
    // Top & Env Panel
    'env.co2': 'CO₂ 分壓',
    'env.pressure': '艙壓',
    'env.doseRate': '環境劑量率',
    'env.radiation': '任務累積輻射',
    'env.langToggle': '切換語言 / Switch to English',

    // App & Navigation
    'app.title': 'AURA-Space 深空自主健康監控系統',
    'app.prepTriage': '準備今日晨檢測驗',
    'app.returning': '返回中',
    'app.returnTwin': '返回數位分身',
    'app.startTriage': '完成每日 3 分鐘測驗',
    'app.triageProgress': '今日測驗進度',
    'app.allDone': '全部完成',
    'app.sol': 'Sol {sol}',
    'app.today': '今日',

    // Digital Twin Header & Tabs
    'twin.title': '太空人數位分身全像監控',
    'twin.sub': '深空自主健康監控系統 · 即時生理狀態',
    'twin.solBadge': '任務第 {sol} 天',
    'twin.todayBadge': '今日（Sol {sol}）',
    'twin.histViewing': '正在檢視歷史紀錄',
    'twin.returnTodayBtn': '回到今日',
    'twin.instruction': '點擊各器官發光節點或右側卡片可聚焦視角；點擊右上角「？」可查看 NASA 臨床指標標準。',
    'twin.tab.heart': '心臟 (心率/HRV)',
    'twin.tab.brain': '大腦 (PVT反應)',
    'twin.tab.eye': '眼球 (SANS)',
    'twin.tab.voice': '聲帶 (語音壓力)',
    'twin.tab.spine': '骨骼 (骨質疏鬆推演)',
    'twin.tab.untested': '未測',

    // Organ Telemetry Details
    'organ.liveWaveform': '即時遙測波形',
    'organ.keyMetrics': '關鍵指標分析',
    'organ.retinaGrid': '眼底中心視網膜網格 (Amsler)',
    'organ.dlsAnalysis': '動態負荷刺激分析 (DLS)',
    'organ.skinSpectrum': 'ΔHue 色相偏移光譜分析',
    'organ.baseline': '基線正常',
    'organ.abnormal': '異常偏移',

    // Subsystem Cards (Right Panel)
    'sys.cardio.title': '心血管與自律神經',
    'sys.cardio.sub': 'rPPG 攝像頭非接觸心率 / HRV',
    'sys.cognition.title': '精神運動警覺度',
    'sys.cognition.sub': 'NASA-PVT 認知疲勞與神經反應',
    'sys.eye.title': '黃斑部與視野 (SANS)',
    'sys.eye.sub': 'Amsler 網格中心視野失真檢測',
    'sys.mind.title': '聲學神經心理負荷',
    'sys.mind.sub': '語音微顫與交感心理壓力分析',
    'sys.bone.title': '微重力骨骼重塑動力學',
    'sys.bone.sub': 'NASA 破骨細胞流失與 ARED 阻力推演',
    'sys.skin.title': '深空微血管與皮膚屏障',
    'sys.skin.sub': '色相偏移與皮炎/帶狀皰疹辨識',

    // Status Levels
    'level.nominal': 'NOMINAL 健全',
    'level.advisory': 'ADVISORY 注意',
    'level.warning': 'WARNING 警戒',
    'level.untested': '未測驗',
    'level.nominal.short': '健全',
    'level.advisory.short': '注意',
    'level.warning.short': '警戒',

    // Immune Vulnerability Index (IVI)
    'immune.title': '綜合免疫脆弱度指數 (IVI)',
    'immune.subToday': '深空多系統交叉脆弱性評估演算法',
    'immune.subHist': '{shortDate}（任務第 {sol} 天）多系統交叉脆弱性評估',
    'immune.dialCaption': 'IVI INDEX',
    'immune.scaleMax': '/ 100',
    'immune.status.nominal': '防禦健全',
    'immune.status.advisory': '抑制代償',
    'immune.status.warning': '高度易感',
    'immune.status.escalate': '單項超標·聯鎖警戒',
    'immune.status.untested': '待測驗',
    'immune.footnote': 'NASA 多系統交叉脆弱度演算法',
    'immune.untestedBoxTitle': '尚未完成今日測驗',
    'immune.untestedBoxDesc': '完成生理測驗後，將自動整合計算多系統免疫脆弱度。',
    'immune.factorsHead': '4 大致病因子加權貢獻分解',
    'immune.factorsTotal': '總分權重 100%',
    'immune.radFactor': '累積深空輻射負荷 ({val} mSv)',
    'immune.pvtFactor': '認知疲勞與睡眠缺失 (PVT)',
    'immune.rppgFactor': '自律神經與迷走抗炎失衡 (rPPG 心率/HRV)',
    'immune.voiceFactor': '神經交感心理負荷 (Voice)',
    'immune.pts': '+{val} 分',
    'immune.pending': '待測驗',

    // Countermeasures (Action Hub)
    'act.titleToday': '今日自主處置行動方案 (Countermeasures)',
    'act.titleHist': '{shortDate} 自主處置行動方案 (Countermeasures)',
    'act.sub': '基於即時生理指標自主推薦處置方案',
    'act.allDonePill': '✓ 已全數執行 ({done}/{total})',
    'act.partialDonePill': '已執行 {done}/{total} 項',
    'act.warnPill': '檢出 {total} 項異常',
    'act.allDoneText': '今日處置行動方案已全數執行完成，維持現行排程節奏。',
    'act.execute': '執行處置',
    'act.executed': '已執行',
    'act.cat.exercise': '運動抗阻',
    'act.cat.nutrition': '營養介入',
    'act.cat.environment': '環境調節',
    'act.cat.rest': '睡眠調控',
    'act.cat.comms': '心理支持',
    'act.startTriage': '前往開始測驗',
    'act.allTestsDone': '今日晨檢已全部完成',

    // Flight Timeline / Date Log
    'log.title': '任務時間軸與歷史日誌',
    'log.todayJump': '回到今日',
    'log.expandCal': '展開任務全月監控',
    'log.collapseCal': '收合月曆',
    'log.fullCalTitle': '深空任務全月生理監控歷程',
    'log.fullCalSub': '以 Sol 任務天為單位，追蹤微重力長期適應、異常通報與自主處置執行紀錄',
    'log.execDone': '處置完成',
    'log.execPending': '待處置',
    'log.execNominal': '無異常處置',
    'log.execMuted': '無紀錄',
    'log.allNominal': '全項健全',
    'log.legend.nominal': '健全 (Nominal)',
    'log.legend.advisory': '注意 (Advisory)',
    'log.legend.warning': '警戒 (Warning)',

    // Criteria Modal
    'criteria.headerTitle': '太空醫學臨床判讀依據與 NASA 指標標準',
    'criteria.headerSub': '點選下方器官系統，查看深空生理危害生理機轉、診斷閾值與 NASA 對策規範',
    'criteria.lockedTitle': '做完今日全部測驗才可查看數據解析',
    'criteria.lockedDesc': 'AURA-Space 深空自主監控系統需整合當日心血管、警覺度、視覺與心理四大核心生理指標，以推演多系統交叉脆弱性與臨床數據解析。',
    'criteria.lockedProgress': '今日晨檢進度',
    'criteria.lockedBtn': '立即前往完成測驗',
    'criteria.col.organ': '器官系統',
    'criteria.col.metrics': '核心監控指標',
    'criteria.col.standards': '判讀標準',
    'criteria.col.significance': '太空醫學臨床意義',
    'criteria.close': '關閉',
    'criteria.helpTip': '查看數據解析與判斷指標',
    'criteria.helpTipLocked': '做完今日全部測驗才可查看數據解析',

    // Splash Screen
    'splash.title': 'AURA-Space',
    'splash.sub': '深空自主健康監控系統',
    'splash.ready': '系統就緒',
    'splash.loading': '載入數位分身模型',
    'splash.click': '點擊任意處進入',
  },

  en: {
    // Top & Env Panel
    'env.co2': 'CO₂ Partial Pressure',
    'env.pressure': 'Cabin Pressure',
    'env.doseRate': 'Ambient Dose Rate',
    'env.radiation': 'Mission Cumulative Radiation',
    'env.langToggle': '切換為繁體中文 / Switch to Chinese',

    // App & Navigation
    'app.title': 'AURA-Space Deep-Space Autonomous Health System',
    'app.prepTriage': 'Preparing Morning Health Triage',
    'app.returning': 'Returning',
    'app.returnTwin': 'Return to Digital Twin',
    'app.startTriage': 'Complete Daily 3-Min Triage',
    'app.triageProgress': 'Today’s Triage Progress',
    'app.allDone': 'All Completed',
    'app.sol': 'Sol {sol}',
    'app.today': 'Today',

    // Digital Twin Header & Tabs
    'twin.title': 'Astronaut Digital Twin Holographic Monitor',
    'twin.sub': 'Deep-Space Autonomous Health Monitoring · Real-Time Telemetry',
    'twin.solBadge': 'Mission Sol {sol}',
    'twin.todayBadge': 'Today (Sol {sol})',
    'twin.histViewing': 'Viewing Historical Log',
    'twin.returnTodayBtn': 'Jump to Today',
    'twin.instruction': 'Click glowing organ nodes or right cards to focus; click “?” for NASA clinical criteria.',
    'twin.tab.heart': 'Heart (Rate/HRV)',
    'twin.tab.brain': 'Brain (PVT Reaction)',
    'twin.tab.eye': 'Eye (SANS)',
    'twin.tab.voice': 'Voice (Stress Load)',
    'twin.tab.spine': 'Skeleton (Bone Dynamics)',
    'twin.tab.untested': 'Pending',

    // Organ Telemetry Details
    'organ.liveWaveform': 'Live Telemetry Waveform',
    'organ.keyMetrics': 'Key Biomarker Analysis',
    'organ.retinaGrid': 'Retinal Macula Grid (Amsler)',
    'organ.dlsAnalysis': 'Dynamic Load Stimulus (DLS)',
    'organ.skinSpectrum': 'ΔHue Color Spectrum Shift',
    'organ.baseline': 'Normal Baseline',
    'organ.abnormal': 'Abnormal Shift',

    // Subsystem Cards (Right Panel)
    'sys.cardio.title': 'Cardiovascular & Autonomic',
    'sys.cardio.sub': 'rPPG Contactless Pulse & HRV',
    'sys.cognition.title': 'Psychomotor Vigilance',
    'sys.cognition.sub': 'NASA-PVT Cognitive Fatigue & Reaction',
    'sys.eye.title': 'Macula & Vision (SANS)',
    'sys.eye.sub': 'Amsler Grid Central Distortion',
    'sys.mind.title': 'Acoustic Neuropsychological Load',
    'sys.mind.sub': 'Voice Micro-tremor & Stress Analysis',
    'sys.bone.title': 'Microgravity Bone Remodeling',
    'sys.bone.sub': 'NASA Osteoclast Dynamics & ARED Simulation',
    'sys.skin.title': 'Microvascular & Skin Barrier',
    'sys.skin.sub': 'ΔHue Spectrum & Dermatitis / Herpes',

    // Status Levels
    'level.nominal': 'NOMINAL',
    'level.advisory': 'ADVISORY',
    'level.warning': 'WARNING',
    'level.untested': 'UNTESTED',
    'level.nominal.short': 'Nominal',
    'level.advisory.short': 'Advisory',
    'level.warning.short': 'Warning',

    // Immune Vulnerability Index (IVI)
    'immune.title': 'Immune Vulnerability Index (IVI)',
    'immune.subToday': 'Deep-Space Multi-System Vulnerability Algorithm',
    'immune.subHist': '{shortDate} (Mission Sol {sol}) Multi-System Vulnerability Assessment',
    'immune.dialCaption': 'IVI INDEX',
    'immune.scaleMax': '/ 100',
    'immune.status.nominal': 'Robust Defense',
    'immune.status.advisory': 'Compensatory Suppression',
    'immune.status.warning': 'High Vulnerability',
    'immune.status.escalate': 'Single Alert · Interlocked Warning',
    'immune.status.untested': 'Pending',
    'immune.footnote': 'NASA Multi-System Vulnerability Algorithm',
    'immune.untestedBoxTitle': 'Today’s Tests Not Completed',
    'immune.untestedBoxDesc': 'Multi-system immune vulnerability will be computed upon test completion.',
    'immune.factorsHead': '4 Risk Factor Weight Contributions',
    'immune.factorsTotal': 'Total Weight 100%',
    'immune.radFactor': 'Cumulative Deep-Space Radiation ({val} mSv)',
    'immune.pvtFactor': 'Cognitive Fatigue & Sleep Loss (PVT)',
    'immune.rppgFactor': 'Autonomic & Vagal Anti-inflammatory Imbalance (rPPG)',
    'immune.voiceFactor': 'Sympathetic Psychological Stress (Voice)',
    'immune.pts': '+{val} pts',
    'immune.pending': 'Pending',

    // Countermeasures (Action Hub)
    'act.titleToday': 'Autonomous Countermeasures',
    'act.titleHist': '{shortDate} Autonomous Countermeasures',
    'act.sub': 'Evidence-Based Autonomous Prescriptions',
    'act.allDonePill': '✓ All Executed ({done}/{total})',
    'act.partialDonePill': 'Executed {done}/{total}',
    'act.warnPill': '{total} Anomalies Detected',
    'act.allDoneText': 'All countermeasures completed. Maintain current operational schedule.',
    'act.execute': 'Execute',
    'act.executed': 'Completed',
    'act.cat.exercise': 'Exercise',
    'act.cat.nutrition': 'Nutrition',
    'act.cat.environment': 'Environment',
    'act.cat.rest': 'Rest',
    'act.cat.comms': 'Psych Support',
    'act.startTriage': 'Go to Daily Tests',
    'act.allTestsDone': 'Daily Tests Completed',

    // Flight Timeline / Date Log
    'log.title': 'Mission Timeline & Flight Log',
    'log.todayJump': 'Jump to Today',
    'log.expandCal': 'Expand Full Month Calendar',
    'log.collapseCal': 'Collapse Calendar',
    'log.fullCalTitle': 'Deep-Space Full Month Telemetry Calendar',
    'log.fullCalSub': 'Sol-by-sol tracking of microgravity adaptation, telemetry alerts, and countermeasures',
    'log.execDone': 'Executed',
    'log.execPending': 'Pending Act',
    'log.execNominal': 'No Anomaly',
    'log.execMuted': 'No Log',
    'log.allNominal': 'All Nominal',
    'log.legend.nominal': 'Nominal',
    'log.legend.advisory': 'Advisory',
    'log.legend.warning': 'Warning',

    // Criteria Modal
    'criteria.headerTitle': 'Space Medicine Clinical Criteria & NASA Standards',
    'criteria.headerSub': 'Select an organ system below to view deep-space pathophysiology, diagnostic thresholds, and NASA countermeasures',
    'criteria.lockedTitle': 'Complete Daily Tests to Unlock Analytics',
    'criteria.lockedDesc': 'AURA-Space requires cardiovascular, psychomotor, visual, and psychological metrics to compute multi-system cross-vulnerability analytics.',
    'criteria.lockedProgress': 'Today’s Triage Progress',
    'criteria.lockedBtn': 'Go to Daily Tests Now',
    'criteria.col.organ': 'Organ System',
    'criteria.col.metrics': 'Core Biomarkers',
    'criteria.col.standards': 'Diagnostic Criteria',
    'criteria.col.significance': 'Space Medicine Clinical Significance',
    'criteria.close': 'Close',
    'criteria.helpTip': 'View Clinical Analytics & Criteria',
    'criteria.helpTipLocked': 'Complete all daily tests to view analytics',

    // Splash Screen
    'splash.title': 'AURA-Space',
    'splash.sub': 'Deep-Space Autonomous Health Monitoring System',
    'splash.ready': 'System Ready',
    'splash.loading': 'Loading Digital Twin Hologram',
    'splash.click': 'CLICK ANYWHERE TO ENTER',
  },
}

const DEFAULT_I18N_CONTEXT: I18nContextType = {
  lang: 'zh',
  setLang: () => {},
  t: (key: string, fallback?: string) => fallback ?? key,
}

const globalForI18n = globalThis as typeof globalThis & {
  __AURA_I18N_CONTEXT__?: Context<I18nContextType>
}

export const I18nContext: Context<I18nContextType> =
  globalForI18n.__AURA_I18N_CONTEXT__ ??
  (globalForI18n.__AURA_I18N_CONTEXT__ =
    createContext<I18nContextType>(DEFAULT_I18N_CONTEXT))

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('aura_lang')
      return saved === 'en' ? 'en' : 'zh'
    } catch {
      return 'zh'
    }
  })

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem('aura_lang', next)
    } catch {
      // ignore
    }
  }

  const t = (key: string, fallback?: string): string => {
    const table = DICTIONARY[lang]
    if (table && table[key] !== undefined) {
      return table[key]
    }
    const zhFallback = DICTIONARY.zh[key]
    if (zhFallback !== undefined) return zhFallback
    return fallback ?? key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  return useContext(I18nContext)
}

