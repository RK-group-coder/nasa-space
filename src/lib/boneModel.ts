import type { BoneResult } from '../types/health'

export function computeBoneLoss(sol: number, aredAdherence: number = 90): BoneResult {
  const onsetDay = 18 // Average spaceflight bone resorption onset day (14-21 days)
  const lossDays = Math.max(0, sol - onsetDay)
  const lossMonths = lossDays / 30.417

  // Natural unprotected microgravity BMD loss rate: ~1.2% per month
  const unprotectedLossPct = +(lossMonths * 1.2).toFixed(2)

  // With ARED resistive exercise and Vitamin D/Calcium nutrition (reduces loss by ~75% at 100% adherence)
  const mitigationFactor = 0.25 + (1 - aredAdherence / 100) * 0.75
  const bmdLossPct = +(lossMonths * 1.2 * mitigationFactor).toFixed(2)

  // Baseline healthy T-score before flight: +0.50
  // Each ~10% BMD loss decreases T-score by roughly 1.0 SD
  const tScore = +(0.5 - (bmdLossPct / 10) * 1.0).toFixed(2)

  // Days until Osteopenia (T-Score <= -1.0, ~15% BMD loss from baseline)
  const daysToOsteopenia = Math.max(
    0,
    Math.round((15 / (1.2 * mitigationFactor)) * 30.417) - lossDays,
  )

  // Days until Space Osteoporosis (T-Score <= -2.5, ~30% BMD loss from baseline)
  const daysToOsteoporosis = Math.max(
    0,
    Math.round((30 / (1.2 * mitigationFactor)) * 30.417) - lossDays,
  )

  return {
    sol,
    onsetDay,
    bmdLossPct,
    unprotectedLossPct,
    tScore,
    daysToOsteopenia,
    daysToOsteoporosis,
    aredAdherence,
  }
}

