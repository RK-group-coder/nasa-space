export interface PrincipleInfo {
  headline: string
  method: string
  mechanism: string
  judgmentLogic: string
}

export interface Criterion {
  id: string
  num: string
  title: string
  shortName: string
  organ: string
  metrics: string[]
  principle: PrincipleInfo
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
    principle: {
      headline: '客觀微秒級反應時延測量 · 評估中樞神經突觸傳導速度與微睡眠 (Microsleep) 發生率',
      method:
        '在 2–10 秒的隨機時間間隔內突發視覺刺激，要求太空人以最快神經運動反應擊鍵。以隨機間隔杜絕預先節奏猜測，連續記錄 5 次有效毫秒反應時間（RT），並即時監控搶跑次數（False Starts）。',
      mechanism:
        '睡眠剝奪、長期密閉孤立（ICE）及高 CO₂ 濃度會抑制大腦前額葉皮質與丘腦網狀核的覺醒維持系統。當突觸間多巴胺與去甲腎上腺素傳導疲勞時，皮質突發進入 0.5–3 秒的微睡眠（Microsleep），造成認知與行為反應中斷。',
      judgmentLogic:
        '系統以中位反應時間（Median RT）與注意力喪失次數（Lapses，即 RT > 500 ms）作為雙核心判斷：① 若 RT ≤ 300 ms 且 Lapses = 0，判定為 NOMINAL（警覺敏銳）；② 若 RT 300–400 ms 或 Lapses = 1，判定為 ADVISORY（輕微認知遲緩，需補眠或藍光干預）；③ 若 RT > 400 ms 或 Lapses ≥ 2，判定為 WARNING（中樞神經疲勞超載，微睡眠風險極高，暫停高風險操作）。',
    },
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
    principle: {
      headline: '20×20 視網膜微視角方格掃描 · 早期篩檢微重力頭向體液轉移所致之 SANS 視神經水腫與脈絡膜皺褶',
      method:
        '太空人保持 30–33 公分視距（對應中心 10°–20° 視野），單眼專注盯住正中央基準紅點並掃描網格。雙眼獨立測試（先右眼後左眼），標記格線是否有波浪扭曲、斷裂或暗影，並計算異常格距中央視軸的離心視角（Eccentricity）。',
      mechanism:
        '微重力環境下缺乏下肢重力梯度，約 1.5–2 公升體液向頭向轉移，造成頸靜脈回流受阻、顱內壓（ICP）增高與視神經鞘膜（ONSD）水腫積液。高壓向前推擠眼球後極部使眼球扁平化、Bruch 膜褶皺形成脈絡膜皺褶（Chorioretinal Folds），在視野中直接投射為方格扭曲（Metamorphopsia）；若視盤水腫則引起外圍生理盲點病理性擴大。',
      judgmentLogic:
        '系統採用「離心視角分區與雙眼不對稱性」嚴密判讀：① 雙眼 0 格異常判定為 NOMINAL（視覺軸線健全）；② 中心黃斑區（≤3°）0 格，且旁中心僅 1–2 格或外圍 1–4 格，判定為 ADVISORY（周邊輕微水腫，需低強度 LBNP 引流）；③ 中心黃斑凹區（≤3°）出現 ≥ 1 格扭曲（代表病變已直接侵犯中心視軸焦點），或旁中心 ≥ 3 格 / 總格數 ≥ 5 格，判定為 WARNING（SANS 臨床警示，立即啟動 40 分鐘 LBNP 負壓引流並通報航醫）。',
    },
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
    principle: {
      headline: '非接觸式面部微血管光容積脈搏波分析 (rPPG) · 捕捉微血管綠光吸收搏動與 HRV 迷走抗炎張力',
      method:
        '普通攝影機在自然環境光下捕捉受測者額頭與雙頰微血管床。利用血紅素在 500–600 nm（綠光）具有極高光吸收特性的物理原理，微血管隨心臟搏動充血時反射綠光強度下降，舒張時回升。經過訊噪比演算法、帶通濾波（0.7–3.5 Hz）與波峰偵測，精確提取連續心搏間期（NN Intervals）。',
      mechanism:
        '微重力環境造成人體中心循環血量急性增加、心房被動擴張，引發利尿與血漿容量下降，導致心血管自律神經調節失衡。交感神經高張會引起靜止心率偏高；而心率變異度（HRV 之 RMSSD）直接反映迷走神經（副交感神經）張力與膽鹼能抗炎通路（Cholinergic Anti-inflammatory Reflex），低 HRV 預警自律神經枯竭與系統性慢性發炎反應。',
      judgmentLogic:
        '系統結合靜態心率（BPM）與動態心率變異度（HRV / RMSSD）雙軸判定：① 若 BPM < 90 且 HRV ≥ 40 ms，判定為 NOMINAL（心血管與副交感抗炎耐受良好）；② 若 BPM 落在 90–100 或 HRV 降至 30–40 ms，判定為 ADVISORY（自律神經輕度緊繃，下調運動負荷）；③ 若 BPM > 100（心動過速）或 HRV < 30 ms（迷走神經衰退），判定為 WARNING（心血管代償失調，啟動慢速共振呼吸與補充電解質）。',
    },
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
    principle: {
      headline: '臨床聲學生物標記 (Vocal Biomarkers) · 測量聲帶基頻微顫度 (F0 Jitter) 與語句停頓比以量化神經心理負荷',
      method:
        '讓受測者朗讀一篇標準音素平衡短文（約 65 字，18–22 秒自然讀完），麥克風即時捕捉聲波，利用自相關函數（Autocorrelation）提取每 45 毫秒之聲帶振動基頻（F0），精確計算相鄰週期微細時間抖動率（Jitter）與語音有效停頓時間比（Pause Ratio）。',
      mechanism:
        '深空長時間密閉孤立（ICE）與高工作負荷會引發下視丘-腦下垂體-腎上腺軸（HPA Axis）活化，交感神經釋放皮質醇與腎上腺素。高交感張力引起喉部小肌肉群（環甲肌、杓狀肌）不自主微顫、口腔黏膜分泌減少、呼吸肌張力緊繃，使發音音調微顫動（F0 Jitter）顯著增大且呼吸停頓次數增多。',
      judgmentLogic:
        '系統將 Jitter、停頓比與基頻不穩定度綜合成 0–100 分之壓力指數（Stress Index）：① 若 Stress < 40（Jitter < 2.0%），判定為 NOMINAL（情緒平穩、交感放鬆）；② 若 Stress 40–64（Jitter 2.0%–3.5%），判定為 ADVISORY（輕中度神經緊繃，切換生活艙暖光與放鬆行程）；③ 若 Stress ≥ 65 或 Jitter > 3.5%，判定為 WARNING（高度交感心理過載與倦怠，啟動心理支持與減壓通訊）。',
    },
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
    principle: {
      headline: '微血管色相偏移 (ΔHue) 與皮損面積比率分析 · 早期識別過敏接觸性皮炎與潛伏病毒重啟',
      method:
        '藉由艙內高清攝像頭或皮膚顯微鏡影像，經色彩校正後分割紅斑病灶區域，計算紅斑像素佔視野面積百分比（Redness Lesion Area %）及周邊邊界擴散梯度。',
      mechanism:
        '深空微重力造成皮膚角質層水合異常、表皮屏障功能受損；同時高劑量宇宙射線與免疫 T 細胞功能受抑，使潛伏於感覺神經節的帶狀疱疹病毒（VZV）或 EB 病毒容易再活化，沿皮節形成群集性水泡或紅斑。',
      judgmentLogic:
        '① 病灶面積 ≤ 3.0% 判定為 NOMINAL（皮膚屏障完整）；② 面積 3.0%–8.0% 判定為 ADVISORY（局部過敏或輕度接觸性皮炎，外用保濕軟膏）；③ 面積 > 8.0% 判定為 WARNING（廣泛性紅斑或疑似病毒重啟，立即通報醫官並啟動抗病毒與類固醇軟膏干預）。',
    },
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
    principle: {
      headline: 'NASA 微重力骨骼代謝動力學方程 · 推演破骨細胞骨吸收與 ARED 阻力對策力學沉積成骨平衡',
      method:
        '以任務執行天數（Sol）為時間軸，整合每日 ARED 進階抗阻運動設備（深蹲、硬舉）的力學負荷衝量（kN·s）與動態負荷刺激值（DLS），代入 NASA 破骨細胞-成骨細胞流體力學模型（Mechanostat Model），動態推算骨礦物質密度流失率（BMD Loss %）與臨床 T 值（T-Score）。',
      mechanism:
        '在地球重力下，骨骼受壓縮產生壓電微電流與骨陷窩流體剪切力，刺激成骨細胞礦化骨基質；微重力下骨骼力學刺激消失，成骨細胞活性驟降，破骨細胞未受抑制持續溶骨，骨鈣大量釋放至尿液，承重骨（股骨頸、腰椎）每月流失 1.0%–1.5% 骨質，顯著縮短達到臨床骨質疏鬆（Osteoporosis）的時間。',
      judgmentLogic:
        '依據臨床雙能量 X 光骨密度儀（DXA）之 T-Score 標準與累積流失百分比判定：① 若 T-Score ≥ 0 且 BMD 流失 ≤ 1.5%，判定為 NOMINAL（ARED 阻力成骨防護良好）；② 若 -1.0 ≤ T-Score < 0 或 BMD 流失 1.5%–3.0%，判定為 ADVISORY（骨質減少期 Osteopenia，微調阻力負重 +5kg）；③ 若 T-Score < -1.0 或 BMD 流失 > 3.0%，判定為 WARNING（進入骨質疏鬆臨界期 Osteoporosis，病理性骨折風險劇增，追加力學負重 +10% 與維生素 D3/鈣片）。',
    },
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
    principle: {
      headline: 'NASA 微重力骨骼代謝動力學方程 · 推演破骨細胞骨吸收與 ARED 阻力對策力學沉積成骨平衡',
      method:
        '以任務執行天數（Sol）為時間軸，整合每日 ARED 進階抗阻運動設備（深蹲、硬舉）的力學負荷衝量（kN·s）與動態負荷刺激值（DLS），代入 NASA 破骨細胞-成骨細胞流體力學模型（Mechanostat Model），動態推算骨礦物質密度流失率（BMD Loss %）與臨床 T 值（T-Score）。',
      mechanism:
        '在地球重力下，骨骼受壓縮產生壓電微電流與骨陷窩流體剪切力，刺激成骨細胞礦化骨基質；微重力下骨骼力學刺激消失，成骨細胞活性驟降，破骨細胞未受抑制持續溶骨，骨鈣大量釋放至尿液，承重骨（股骨頸、腰椎）每月流失 1.0%–1.5% 骨質，顯著縮短達到臨床骨質疏鬆（Osteoporosis）的時間。',
      judgmentLogic:
        '依據臨床雙能量 X 光骨密度儀（DXA）之 T-Score 標準與累積流失百分比判定：① 若 T-Score ≥ 0 且 BMD 流失 ≤ 1.5%，判定為 NOMINAL（ARED 阻力成骨防護良好）；② 若 -1.0 ≤ T-Score < 0 或 BMD 流失 1.5%–3.0%，判定為 ADVISORY（骨質減少期 Osteopenia，微調阻力負重 +5kg）；③ 若 T-Score < -1.0 或 BMD 流失 > 3.0%，判定為 WARNING（進入骨質疏鬆臨界期 Osteoporosis，病理性骨折風險劇增，追加力學負重 +10% 與維生素 D3/鈣片）。',
    },
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
    principle: {
      headline: '深空心理神經免疫學 (PNI) 交叉脆弱性矩陣 · 結合李比希最小定律與單項超標聯鎖警戒機制',
      method:
        '每日晨檢整合 4 大致病維度：深空累積輻射負荷（40% 權重）、PVT 認知疲勞（20% 權重）、rPPG 自律神經與迷走抗炎失衡（20% 權重）、語音交感壓力負荷（20% 權重），進行多因子動態加權綜合計分（0–100 分），並監測任一器官系統之極限閾值。',
      mechanism:
        '人體免疫並非獨立運作，而是神經-內分泌-免疫網絡（Neuro-Endocrine-Immune Axis）。深空高能銀河射線（GCR）破壞造血幹細胞與淋巴細胞 DNA；急性睡眠剝奪導致 NK 細胞毒性急劇下滑；HRV 迷走抗炎通路中斷引發促發炎細胞因子（IL-6、TNF-α）風暴；高皮質醇壓力促使胸腺萎縮。多因子重疊將使潛伏皰疹病毒（如 EBV、帶狀疱疹）重啟機率暴增。',
      judgmentLogic:
        '系統採用「加權脆弱度評分 ＋ 單項重大異常聯鎖升級（Single-Point Escalation）」：① 若總分 < 25 且所有核心項目無異常，判定為 NOMINAL（免疫防禦健全）；② 若總分 25–44 或任 1 項出現注意（ADVISORY），判定為 ADVISORY（免疫代償抑制期）；③ 若總分 ≥ 45，或任一單項出現嚴重紅燈（WARNING）伴隨累積輻射，判定為 WARNING（高度易感警戒，立即觸發抗氧化與抗病毒免疫防禦協議，不可被其他正常數值稀釋）。',
    },
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
    principle: {
      headline: 'Microsecond-Level Objective Reaction Latency · Evaluating Cortical Synaptic Conduction & Microsleep Incidence',
      method:
        'Random visual stimuli appear at intervals between 2–10 seconds. The astronaut must respond as rapidly as possible upon seeing the counter. Five valid reaction trials are recorded, while false starts (<100ms or pre-stimulus presses) are flagged.',
      mechanism:
        'Sleep loss, circadian misalignment, and elevated cabin CO₂ impair prefrontal cortical networks and thalamocortical arousal circuits. Neurotransmitter depletion (dopamine/norepinephrine) induces brief 0.5–3s local cortical deactivations (microsleeps), causing complete lapses in operational performance.',
      judgmentLogic:
        'Dual-parameter evaluation via Median RT and Lapses (>500 ms): ① RT ≤ 300 ms & Lapses = 0 → NOMINAL (Sharp vigilance); ② RT 300–400 ms or Lapses = 1 → ADVISORY (Mild cognitive slowdown; power nap/blue light indicated); ③ RT > 400 ms or Lapses ≥ 2 → WARNING (Severe central fatigue & microsleep danger; EVA duties grounded).',
    },
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
    principle: {
      headline: '20×20 Retinal Micro-Angle Grid · Early Screening for Cephalad Fluid Shift, ONSD Edema & Chorioretinal Folds',
      method:
        'Astronaut maintains a 30–33 cm viewing distance (covering central 10°–20° visual field) in darkroom mode, fixating steadily on the red central target. Monocular testing (right eye first, then left eye) flags wavy distortion (metamorphopsia), broken lines, or scotomas.',
      mechanism:
        'Lack of gravity gradients shifts 1.5–2 L of body fluid headward, increasing jugular venous pressure, ICP, and optic nerve sheath diameter (ONSD). Retrobulbar pressure flattens the posterior globe and creates folds in Bruch’s membrane (chorioretinal folds), directly warping grid geometry, while papilledema expands the temporal physiological blind spot.',
      judgmentLogic:
        'Eccentricity zoning and bilateral asymmetry grading: ① 0 defects in both eyes → NOMINAL (Visual axis intact); ② 0 foveal defects with 1–2 paracentral or 1–4 peripheral defects → ADVISORY (Mild edema; low-intensity LBNP drainage indicated); ③ Foveal (≤3°) defect ≥ 1 (direct threat to macular foveal fixation) or paracentral ≥ 3 / total ≥ 5 → WARNING (Clinical SANS alert; initiate 40-min LBNP and notify flight surgeon).',
    },
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
    principle: {
      headline: 'Contactless Facial Photoplethysmography (rPPG) · Extracting Green-Band Hemoglobin Absorption & Vagal Anti-inflammatory Tone',
      method:
        'A standard webcam captures microvascular beds in the forehead and cheekbones under ambient light. Hemoglobin possesses peak optical absorption in the 500–600 nm (green) wavelength. Facial green reflectance dips during cardiac systole and rebounds in diastole. Bandpass filtering (0.7–3.5 Hz) and peak detection reconstruct beat-to-beat NN intervals.',
      mechanism:
        'Microgravity centralizes blood volume, distending the atria and triggering diuresis and hypovolemia, disrupting autonomic tone. High resting BPM indicates sympathetic overload, while HRV (RMSSD) is the gold standard for vagal nerve activity and the cholinergic anti-inflammatory pathway. Decreased HRV warns of autonomic exhaustion and elevated systemic cytokine vulnerability.',
      judgmentLogic:
        'Dual-axis evaluation of Resting BPM and HRV (RMSSD): ① BPM < 90 & HRV ≥ 40 ms → NOMINAL (Robust cardiovascular & vagal tone); ② BPM 90–100 or HRV 30–40 ms → ADVISORY (Mild autonomic strain; reduce training workload); ③ BPM > 100 or HRV < 30 ms → WARNING (Cardiovascular deconditioning & vagal failure; resonance breathing and electrolyte hydration protocol triggered).',
    },
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
    principle: {
      headline: 'Acoustic Vocal Biomarkers · Quantifying Vocal Fold Micro-Perturbations (F0 Jitter) and Pause Cadence Under Neuropsychological Load',
      method:
        'The astronaut reads a standardized phonetically balanced passage (~65 words, 18–22s natural cadence). Microphones capture acoustic waveforms; autocorrelation algorithms calculate vocal fold fundamental frequency (F0) every 45 ms to measure cycle-to-cycle frequency jitter and pause-to-speech ratio.',
      mechanism:
        'Prolonged isolation and mission stress activate the HPA axis, releasing cortisol and catecholamines. Sympathetic hyperactivity elevates tension in laryngeal intrinsic muscles (cricothyroid, thyroarytenoid), restricts mucosal microcirculation, and causes involuntary micro-tremors in vocal cord oscillation, increasing F0 Jitter and speech pause frequency.',
      judgmentLogic:
        'Composite Stress Index (0–100) combining Jitter, pause ratio, and pitch instability: ① Stress < 40 (Jitter < 2.0%) → NOMINAL (Relaxed sympathetic tone); ② Stress 40–64 (Jitter 2.0%–3.5%) → ADVISORY (Mild psychological strain; warm lighting and VR family call protocol); ③ Stress ≥ 65 or Jitter > 3.5% → WARNING (Severe sympathetic burnout; psychological support and operational descheduling triggered).',
    },
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
    principle: {
      headline: 'Microvascular ΔHue Shift & Lesion Area Analysis · Early Detection of Dermatitis and Latent Viral Reactivation',
      method:
        'High-resolution imagery of cutaneous lesions is processed with color normalization and color-shift (ΔHue) segmentation to calculate the percentage of erythema pixels across the field of view and border diffusion margins.',
      mechanism:
        'Microgravity compromises stratum corneum hydration and skin barrier integrity. Combined with space radiation and suppressed cell-mediated immunity, latent neurotropic viruses (Varicella-Zoster, EBV) reactivate along dermatomes, presenting as clustered vesicular erythema.',
      judgmentLogic:
        '① Lesion Area ≤ 3.0% → NOMINAL (Skin barrier intact); ② 3.0%–8.0% → ADVISORY (Localized contact dermatitis or allergic flare; topical emollients); ③ > 8.0% → WARNING (Widespread erythema or suspected viral reactivation; medical consultation and antiviral/steroid ointment triggered).',
    },
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
    principle: {
      headline: 'NASA Bone Metabolic Kinetic Model · Projecting Osteoclast Resorption vs. ARED Countermeasure Mineral Deposition',
      method:
        'Using mission elapsed Sol as the temporal axis, daily mechanical impulse (kN·s) and Dynamic Load Stimulus (DLS) from ARED squats and deadlifts are input into NASA mechanostat kinetic models to dynamically calculate BMD loss percentage and clinical T-scores.',
      mechanism:
        'On Earth, axial skeleton compression generates piezoelectric microcurrents and osteocytic fluid shear stress that sustain osteoblastic mineralization. In microgravity, the absence of mechanical strain halts osteoblast signaling while osteoclasts continue uninhibited resorption, shedding 1.0%–1.5% BMD monthly from load-bearing bones (femur, lumbar spine).',
      judgmentLogic:
        'DXA T-score grading and cumulative loss thresholding: ① T-Score ≥ 0 & BMD loss ≤ 1.5% → NOMINAL (ARED remodeling adherence optimal); ② -1.0 ≤ T-Score < 0 or BMD loss 1.5%–3.0% → ADVISORY (Osteopenia stage; adjust resistance +5kg); ③ T-Score < -1.0 or BMD loss > 3.0% → WARNING (Osteoporosis threshold; pathological fracture risk elevated; reinforce resistance +10% and vitamin D3/bisphosphonates).',
    },
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
    principle: {
      headline: 'NASA Bone Metabolic Kinetic Model · Projecting Osteoclast Resorption vs. ARED Countermeasure Mineral Deposition',
      method:
        'Using mission elapsed Sol as the temporal axis, daily mechanical impulse (kN·s) and Dynamic Load Stimulus (DLS) from ARED squats and deadlifts are input into NASA mechanostat kinetic models to dynamically calculate BMD loss percentage and clinical T-scores.',
      mechanism:
        'On Earth, axial skeleton compression generates piezoelectric microcurrents and osteocytic fluid shear stress that sustain osteoblastic mineralization. In microgravity, the absence of mechanical strain halts osteoblast signaling while osteoclasts continue uninhibited resorption, shedding 1.0%–1.5% BMD monthly from load-bearing bones (femur, lumbar spine).',
      judgmentLogic:
        'DXA T-score grading and cumulative loss thresholding: ① T-Score ≥ 0 & BMD loss ≤ 1.5% → NOMINAL (ARED remodeling adherence optimal); ② -1.0 ≤ T-Score < 0 or BMD loss 1.5%–3.0% → ADVISORY (Osteopenia stage; adjust resistance +5kg); ③ T-Score < -1.0 or BMD loss > 3.0% → WARNING (Osteoporosis threshold; pathological fracture risk elevated; reinforce resistance +10% and vitamin D3/bisphosphonates).',
    },
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
    principle: {
      headline: 'Psychoneuroimmunology (PNI) Vulnerability Matrix · Incorporating Liebig’s Law of the Minimum & Single-Point Escalation',
      method:
        'Integrates 4 clinical dimensions: Cumulative deep-space radiation (40% weight), PVT cognitive fatigue (20% weight), rPPG autonomic/vagal balance (20% weight), and Voice sympathetic stress (20% weight) into a composite 0–100 index while screening for critical single-organ thresholds.',
      mechanism:
        'Immunity functions as an integrated neuro-endocrine-immune axis. Galactic Cosmic Rays (GCR) inflict DNA double-strand breaks; acute sleep loss suppresses NK cell cytotoxic capacity; loss of vagal anti-inflammatory reflex unleashes systemic cytokine cascades (IL-6, TNF-α); and sustained cortisol shrinks the thymus. Synergistic degradation triggers latent herpesvirus reactivation.',
      judgmentLogic:
        'Weighted vulnerability scoring with Single-Point Critical Escalation: ① Score < 25 & zero single defects → NOMINAL (Robust immune defense); ② Score 25–44 or any single ADVISORY → ADVISORY (Compensatory immune suppression); ③ Score ≥ 45 or ANY SINGLE WARNING alongside cumulative radiation → WARNING (Critical vulnerability alert; antiviral and antioxidant countermeasures initiated immediately; cannot be diluted by normal metrics).',
    },
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
