import { createContext, useContext, type Context } from 'react'

export interface CriteriaContextType {
  openCriteria: (id: string) => void
  closeCriteria: () => void
  activeCriteriaId: string | null
  canViewAnalytics?: boolean
}

const DEFAULT_CRITERIA_CONTEXT: CriteriaContextType = {
  openCriteria: () => {},
  closeCriteria: () => {},
  activeCriteriaId: null,
  canViewAnalytics: false,
}

const globalForCriteria = globalThis as typeof globalThis & {
  __AURA_CRITERIA_CONTEXT__?: Context<CriteriaContextType>
}

export const CriteriaContext: Context<CriteriaContextType> =
  globalForCriteria.__AURA_CRITERIA_CONTEXT__ ??
  (globalForCriteria.__AURA_CRITERIA_CONTEXT__ =
    createContext<CriteriaContextType>(DEFAULT_CRITERIA_CONTEXT))

export function useCriteria(): CriteriaContextType {
  return useContext(CriteriaContext)
}

