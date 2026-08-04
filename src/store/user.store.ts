import { create } from 'zustand'
import type { Patient, Beneficiary } from '@/types/user.types'
import { EMPTY_BENEFICIARIES, EMPTY_PATIENT } from '@/features/patient/patientAccount'

interface UserStore {
  user: Patient
  beneficiaries: Beneficiary[]
  setUser: (u: Patient) => void
  updateUser: (partial: Partial<Patient>) => void
  addBeneficiary: (b: Beneficiary) => void
  removeBeneficiary: (id: string) => void
  reset: () => void
}

export const useUserStore = create<UserStore>(set => ({
  user: EMPTY_PATIENT,
  beneficiaries: EMPTY_BENEFICIARIES,
  setUser:    user => set({ user }),
  updateUser: partial => set(s => ({ user: { ...s.user, ...partial } })),
  addBeneficiary: b => set(s => ({ beneficiaries: [...s.beneficiaries, b] })),
  removeBeneficiary: id => set(s => ({ beneficiaries: s.beneficiaries.filter(b => b.id !== id) })),
  reset: () => set({ user: EMPTY_PATIENT, beneficiaries: EMPTY_BENEFICIARIES }),
}))
