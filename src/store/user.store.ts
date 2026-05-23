import { create } from 'zustand'
import type { Patient, Beneficiary } from '@/types/user.types'
import { MOCK_USER, MOCK_BENEFICIARIES } from '@/mock/patient.mock'

interface UserStore {
  user: Patient
  beneficiaries: Beneficiary[]
  setUser: (u: Patient) => void
  updateUser: (partial: Partial<Patient>) => void
  addBeneficiary: (b: Beneficiary) => void
  removeBeneficiary: (id: string) => void
}

export const useUserStore = create<UserStore>(set => ({
  user: MOCK_USER,
  beneficiaries: MOCK_BENEFICIARIES,
  setUser:    user => set({ user }),
  updateUser: partial => set(s => ({ user: { ...s.user, ...partial } })),
  addBeneficiary: b => set(s => ({ beneficiaries: [...s.beneficiaries, b] })),
  removeBeneficiary: id => set(s => ({ beneficiaries: s.beneficiaries.filter(b => b.id !== id) })),
}))
