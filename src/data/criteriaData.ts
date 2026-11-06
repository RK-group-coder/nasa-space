export interface Criterion {
  id: string
  num: string
  title: string
  shortName: string
  organ: string
  metrics: string[]
  standards: {
    nominal: string
    advisory: string
    warning: string
  }
  significance: string
}

export const CRITERIA: Record<string, Criterion> = {
  pvt: {
    id: 'pvt',
    num: '01',
    title: 'NASA-PVT 精神運動警覺測試',
    shortName: 'PVT 警覺',
    organ: '大腦 / 認知系統',
    metrics: ['中位反應時間 Median RT', '注意力喪失 Lapses (>500ms)', '搶跑次數 False Starts'],
    standards: {
      nominal: 'RT ≤ 300 ms 且 Lapses = 0',
      advisory: 'RT 300–400 ms 或 Lapses = 1',
      warning: 'RT > 400 ms 或 Lapses ≥ 2',
    },
    significance: 'NASA 官方疲勞監測金標準，評估睡眠剝奪與作業認知警覺度。',
  },
  amsler: {
    id: 'amsler',
    num: '02',
    title: '數位 Amsler 方格視覺失真篩檢',
    shortName: 'Amsler 視覺',
    organ: '眼球 / 視覺系統',
    metrics: [
      '右眼 (OD) / 左眼 (OS) 個別異常格數',
      '距中央紅點離心視角 Eccentricity (°)',
      '中心黃斑凹區 (≤3°) / 旁中心 (3°–6°) / 外圍顳側 (>6°)',
    ],
    standards: {
      nominal: '右眼 0 格 且 左眼 0 格',
      advisory: '中心區 (≤3°) 0 格，且旁中心 1–2 格或外圍 1–4 格',
      warning: '中心黃斑區 (≤3°) ≥ 1 格，或旁中心 ≥ 3 格 / 總數 ≥ 5 格',
    },
    significance:
      'SANS（太空飛行相關神經眼症候群）具顯著右眼好發不對稱性；且異常格距中央紅點愈近風險愈高——中心凹區（≤3°）只要出現 1 格變形即代表脈絡膜皺褶或積液侵犯中心視軸，而外圍顳側（>6°）暗影則提示視乳頭水腫造成生理盲點擴大。',
  },
  rppg: {
    id: 'rppg',
    num: '03',
    title: 'rPPG 視訊心跳脈搏掃描',
    shortName: 'rPPG 脈搏',
    organ: '心血管系統',
    metrics: ['心率 BPM', '心率變異度 HRV (RMSSD)'],
    standards: {
      nominal: 'BPM < 90 且 HRV ≥ 40 ms',
      advisory: 'BPM 90–100 或 HRV 30–40 ms',
      warning: 'BPM > 100 或 HRV < 30 ms',
    },
    significance: '評估心血管調節與自律神經負荷，預警微重力體液轉移造成的心臟代償失調。',
  },
  voice: {
    id: 'voice',
    num: '04',
    title: '聲學語音壓力分析',
    shortName: '語音壓力',
    organ: '心理 / 神經精神系統',
    metrics: ['綜合壓力指數 Stress (0–100)', '基頻抖動 Jitter %', '停頓比 Pause %'],
    standards: {
      nominal: 'Stress < 40',
      advisory: 'Stress 40–64',
      warning: 'Stress ≥ 65',
    },
    significance: '監測長時間孤立密閉（ICE）環境下的心理壓力、情緒倦怠與交感神經高張。',
  },
  skin: {
    id: 'skin',
    num: '06',
    title: '皮膚紅疹與過敏快篩',
    shortName: '皮膚紅疹',
    organ: '皮膚 / 免疫系統',
    metrics: ['紅斑病灶面積比 Redness %'],
    standards: {
      nominal: '≤ 3.0%',
      advisory: '3.0% – 8.0%（局部過敏/接觸性皮炎）',
      warning: '> 8.0%（廣泛紅斑/潛伏病毒重啟）',
    },
    significance: '監測深空高輻射與免疫抑制環境下，潛伏病毒（如 EBV / 水痘帶狀疱疹）重啟風險。',
  },
  bone: {
    id: 'bone',
    num: '05',
    title: '微重力骨骼重塑與骨質疏鬆推演',
    shortName: '骨骼推演',
    organ: '骨骼 / 肌肉與運動系統',
    metrics: [
      '推算 T 值 (T-Score)',
      '累積 BMD 骨密度流失率 (%)',
      '距骨質疏鬆臨界時間 (Days)',
      'ARED 每日重塑力學刺激 (kN·s)',
    ],
    standards: {
      nominal: 'T-Score ≥ 0 且 BMD 流失 ≤ 1.5%（成骨機能良好）',
      advisory: 'T-Score -1.0 ~ 0 或 BMD 流失 1.5%–3.0%（骨質減少 Osteopenia）',
      warning: 'T-Score < -1.0 或 BMD 流失 > 3.0%（骨質疏鬆臨界 Osteoporosis）',
    },
    significance: '依據 NASA 微重力骨骼代謝動力學模型，評估任務累計 Sol 期間破骨細胞凋亡受阻速率，對比無防護自然流失與 ARED 阻力對策成骨防護效果，預測骨質疏鬆臨界時間。',
  },
  squat: {
    id: 'bone',
    num: '05',
    title: '微重力骨骼重塑與骨質疏鬆推演',
    shortName: '骨骼推演',
    organ: '骨骼 / 肌肉與運動系統',
    metrics: [
      '推算 T 值 (T-Score)',
      '累積 BMD 骨密度流失率 (%)',
      '距骨質疏鬆臨界時間 (Days)',
      'ARED 每日重塑力學刺激 (kN·s)',
    ],
    standards: {
      nominal: 'T-Score ≥ 0 且 BMD 流失 ≤ 1.5%（成骨機能良好）',
      advisory: 'T-Score -1.0 ~ 0 或 BMD 流失 1.5%–3.0%（骨質減少 Osteopenia）',
      warning: 'T-Score < -1.0 或 BMD 流失 > 3.0%（骨質疏鬆臨界 Osteoporosis）',
    },
    significance: '依據 NASA 微重力骨骼代謝動力學模型，評估任務累計 Sol 期間破骨細胞凋亡受阻速率，對比無防護自然流失與 ARED 阻力對策成骨防護效果，預測骨質疏鬆臨界時間。',
  },
  immune: {
    id: 'immune',
    num: '06',
    title: '綜合免疫脆弱度指數',
    shortName: '免疫指數',
    organ: '全身免疫系統',
    metrics: [
      '累積深空輻射暴露 (權重 40%)',
      'PVT 認知疲勞與睡眠缺失 (權重 20%)',
      'rPPG 心率與 HRV 迷走抗炎失衡 (權重 20%)',
      '語音交感心理負荷 (權重 20%)',
    ],
    standards: {
      nominal: '指數 < 25 且所有單項無異常（防禦機能健全）',
      advisory: '指數 25–44，或任 1 項致病因子異常（免疫功能受抑制）',
      warning: '指數 ≥ 45，或任 1 項嚴重紅燈伴隨深空輻射負荷/多項異常（聯鎖升級·高度易感）',
    },
    significance:
      '採用 NASA 深空多系統交叉脆弱性評估演算法（Psychoneuroimmunology & Single-Point Escalation）：免疫系統為連鎖反應網絡，具備「單項重大異常聯鎖升級」機制。當任一生理或認知指標（如 PVT 嚴重視神經疲勞、HRV 迷走抗炎失衡）出現重大紅燈，結合深空累積輻射負荷，將直接引發神經-內分泌-免疫軸失衡，不可被未測項目稀釋，系統會立即升級為警戒狀態。',
  },
}

export const CRITERIA_EN: Record<string, Criterion> = {
  pvt: {
    id: 'pvt',
    num: '01',
    title: 'NASA-PVT Psychomotor Vigilance Test',
    shortName: 'PVT Vigilance',
    organ: 'Brain / Cognitive System',
    metrics: ['Median Reaction Time (RT)', 'Lapses (>500ms)', 'False Starts'],
    standards: {
      nominal: 'RT ≤ 300 ms & Lapses = 0',
      advisory: 'RT 300–400 ms or Lapses = 1',
      warning: 'RT > 400 ms or Lapses ≥ 2',
    },
    significance: 'NASA official fatigue monitoring standard to evaluate sleep loss, circadian disruption, and psychomotor alertness.',
  },
  amsler: {
    id: 'amsler',
    num: '02',
    title: 'Digital Amsler Grid Macular Distortion Scan',
    shortName: 'Amsler Vision',
    organ: 'Eye / Visual System (SANS)',
    metrics: [
      'Right (OD) / Left (OS) Visual Deficit Count',
      'Eccentricity from Foveal Fixation (°)',
      'Foveal (≤3°) / Paracentral (3°–6°) / Temporal (>6°)',
    ],
    standards: {
      nominal: 'OD 0 & OS 0 defects',
      advisory: 'Foveal 0, paracentral 1–2 or peripheral 1–4',
      warning: 'Foveal ≥ 1, or paracentral ≥ 3 / total ≥ 5',
    },
    significance:
      'Spaceflight-Associated Neuro-ocular Syndrome (SANS) exhibits right-eye vulnerability; central foveal defects indicate chorioretinal folds or subretinal fluid compromising the visual axis, while temporal margins indicate optic disc edema.',
  },
  rppg: {
    id: 'rppg',
    num: '03',
    title: 'rPPG Contactless Pulse & Autonomic Scan',
    shortName: 'rPPG Pulse',
    organ: 'Cardiovascular & Autonomic Network',
    metrics: ['Heart Rate (BPM)', 'Heart Rate Variability (HRV / RMSSD)'],
    standards: {
      nominal: 'BPM < 90 & HRV ≥ 40 ms',
      advisory: 'BPM 90–100 or HRV 30–40 ms',
      warning: 'BPM > 100 or HRV < 30 ms',
    },
    significance: 'Monitors autonomic cardiovascular regulation and cholinergic anti-inflammatory reflex, guarding against microgravity fluid shift deconditioning.',
  },
  voice: {
    id: 'voice',
    num: '04',
    title: 'Acoustic Voice Stress & Jitter Analysis',
    shortName: 'Voice Stress',
    organ: 'Vocal / Neuropsychological System',
    metrics: ['Composite Stress Index (0–100)', 'Fundamental Frequency Jitter %', 'Speech Pause Ratio %'],
    standards: {
      nominal: 'Stress < 40 & Jitter < 2.0%',
      advisory: 'Stress 40–64 or Jitter 2.0%–3.5%',
      warning: 'Stress ≥ 65 or Jitter > 3.5%',
    },
    significance: 'Acoustic vocal biomarker monitoring psychological strain, operational burnout, and sympathetic overactivation in isolated confined environments (ICE).',
  },
  skin: {
    id: 'skin',
    num: '06',
    title: 'Skin Erythema & Dermatological Triage',
    shortName: 'Skin Erythema',
    organ: 'Cutaneous & Barrier Immune System',
    metrics: ['Erythema Lesion Area Ratio (%)'],
    standards: {
      nominal: '≤ 3.0%',
      advisory: '3.0% – 8.0% (Contact Dermatitis)',
      warning: '> 8.0% (Widespread Erythema / Viral Reactivation)',
    },
    significance: 'Screening for contact dermatitis and latent herpesvirus (EBV / VZV) reactivation under deep-space radiation and immune suppression.',
  },
  bone: {
    id: 'bone',
    num: '05',
    title: 'Microgravity Bone Remodeling Dynamics',
    shortName: 'Bone Remodeling',
    organ: 'Skeletal & Musculoskeletal System',
    metrics: [
      'Projected T-Score',
      'Cumulative BMD Loss (%)',
      'Days to Osteopenia/Osteoporosis',
      'ARED Mechanical Stimulus (kN·s)',
    ],
    standards: {
      nominal: 'T-Score ≥ 0 & BMD loss ≤ 1.5%',
      advisory: 'T-Score -1.0 ~ 0 or BMD loss 1.5%–3.0%',
      warning: 'T-Score < -1.0 or BMD loss > 3.0%',
    },
    significance: 'NASA bone kinetic model tracking osteoclast/osteoblast decoupling and countermeasure adherence to project clinical osteoporosis margins.',
  },
  squat: {
    id: 'bone',
    num: '05',
    title: 'Microgravity Bone Remodeling Dynamics',
    shortName: 'Bone Remodeling',
    organ: 'Skeletal & Musculoskeletal System',
    metrics: [
      'Projected T-Score',
      'Cumulative BMD Loss (%)',
      'Days to Osteopenia/Osteoporosis',
      'ARED Mechanical Stimulus (kN·s)',
    ],
    standards: {
      nominal: 'T-Score ≥ 0 & BMD loss ≤ 1.5%',
      advisory: 'T-Score -1.0 ~ 0 or BMD loss 1.5%–3.0%',
      warning: 'T-Score < -1.0 or BMD loss > 3.0%',
    },
    significance: 'NASA bone kinetic model tracking osteoclast/osteoblast decoupling and countermeasure adherence to project clinical osteoporosis margins.',
  },
  immune: {
    id: 'immune',
    num: '06',
    title: 'Immune Vulnerability Index (IVI)',
    shortName: 'Immune Index',
    organ: 'Systemic Immune Network',
    metrics: [
      'Cumulative Radiation (40%)',
      'PVT Cognitive Fatigue (20%)',
      'rPPG Autonomic Imbalance (20%)',
      'Voice Sympathetic Stress (20%)',
    ],
    standards: {
      nominal: 'Index < 25 & zero single defects (Robust defense)',
      advisory: 'Index 25–44 or single factor abnormal (Suppressed)',
      warning: 'Index ≥ 45 or single severe warning + radiation (High vulnerability)',
    },
    significance: 'NASA multi-system vulnerability algorithm incorporating Liebig’s Law of the Minimum and Single-Point Interlocked Escalation to protect neuro-endocrine-immune homeostasis.',
  },
}

export function getCriteria(lang?: string): Record<string, Criterion> {
  return lang === 'en' ? CRITERIA_EN : CRITERIA
}

export const CRITERIA_ORDER = ['pvt', 'amsler', 'rppg', 'voice', 'bone', 'immune']
