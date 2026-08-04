import { create } from 'zustand'
import type {
  ApplyCreditPayload,
  CreditApplication,
  CreditStatusResponse,
  IncreaseCreditPayload,
} from '@/types/credit.types'
import { useUserStore } from '@/store/user.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { generateRef } from '@/utils/refgen'

function pushCreditApprovalNotification(app: CreditApplication, amount: number) {
  const isIncrease = app.type === 'increase'
  useNotificationsStore.setState(state => ({
    patientNotifs: [{
      id: crypto.randomUUID(),
      type: 'credit',
      title: isIncrease ? 'Limit Increase Approved' : 'Credit Application Approved',
      body: isIncrease
        ? `Your limit increase of ${amount} was approved. Your updated balance is ready to use.`
        : `Your credit application ${app.reference} was approved. ${amount} has been loaded to your wallet.`,
      time: new Date().toISOString(),
      read: false,
      screen: '/app/credit',
    }, ...state.patientNotifs],
  }))
}

interface CreditStore {
  applications: CreditApplication[]
  submitApplication: (payload: ApplyCreditPayload) => CreditApplication
  submitIncrease: (payload: IncreaseCreditPayload) => CreditApplication
  approveApplication: (id: string, approvedAmount?: number) => void
  rejectApplication: (id: string, note?: string) => void
  getStatus: () => CreditStatusResponse
  getAdminApplications: () => Array<CreditApplication & {
    patientName: string
    patientEmail: string
    patientPhone: string
    country: string
    patientUserId: string
    currentCreditLimit: number
    currentCreditAvailable: number
    currentCreditUsed: number
    creditStatus: string
  }>
}

export const useCreditStore = create<CreditStore>((set, get) => ({
  applications: [],

  submitApplication(payload) {
    const application: CreditApplication = {
      id: crypto.randomUUID(),
      reference: generateRef('GGA'),
      type: 'initial',
      status: 'submitted',
      financePartnerId: payload.financePartnerId,
      employment: payload.employment,
      monthlyIncome: payload.monthlyIncome,
      requestedAmount: payload.requestedAmount,
      submittedAt: new Date().toISOString(),
    }

    set(state => ({ applications: [application, ...state.applications] }))
    useUserStore.getState().updateUser({
      creditStatus: 'pending',
      financePartnerId: payload.financePartnerId as 'moneymart' | 'equity',
      ...(payload.coverageType === 'self_and_beneficiaries'
        ? { beneficiariesEnabled: true }
        : {}),
      residesAbroad: !['KE', 'ZW', 'ZM'].includes(payload.residenceCountryCode.toUpperCase()),
      residenceCountry:
        payload.residenceCountryName?.trim()
        || ({ KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' } as Record<string, string>)[payload.residenceCountryCode.toUpperCase()]
        || payload.residenceCountryCode,
      ...(['KE', 'ZW', 'ZM'].includes(payload.residenceCountryCode.toUpperCase())
        ? {
            countryCode: payload.residenceCountryCode.toUpperCase() as 'KE' | 'ZW' | 'ZM',
            country: ({ KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' } as const)[
              payload.residenceCountryCode.toUpperCase() as 'KE' | 'ZW' | 'ZM'
            ],
          }
        : {
            country: payload.residenceCountryName?.trim() || payload.residenceCountryCode,
          }),
    })

    if (payload.coverageType === 'self_and_beneficiaries' && payload.beneficiaries?.length) {
      const existing = useUserStore.getState().beneficiaries
      const added = payload.beneficiaries.map((beneficiary, index) => ({
        id: `BEN-APPLY-${Date.now()}-${index}`,
        name: beneficiary.name,
        relation: beneficiary.relation,
        dob: beneficiary.dob,
        countryCode: beneficiary.countryCode,
        nationalId: beneficiary.nationalId ? `****${beneficiary.nationalId.slice(-4)}` : '',
        age: beneficiary.dob
          ? Math.floor((Date.now() - new Date(beneficiary.dob).getTime()) / 31557600000)
          : 0,
      }))
      useUserStore.setState({ beneficiaries: [...existing, ...added] })
    }

    return application
  },

  submitIncrease(payload) {
    const user = useUserStore.getState().user
    const application: CreditApplication = {
      id: crypto.randomUUID(),
      reference: generateRef('GGA'),
      type: 'increase',
      status: 'submitted',
      financePartnerId: user.financePartnerId ?? 'moneymart',
      employment: 'existing-customer',
      monthlyIncome: payload.monthlyIncome,
      requestedAmount: payload.increaseAmount,
      reason: payload.reason,
      notes: payload.notes,
      submittedAt: new Date().toISOString(),
    }

    set(state => ({ applications: [application, ...state.applications] }))
    useUserStore.getState().updateUser({ creditStatus: 'pending' })
    return application
  },

  approveApplication(id, approvedAmount) {
    const user = useUserStore.getState().user
    set(state => ({
      applications: state.applications.map(app => {
        if (app.id !== id) return app
        const amount = approvedAmount ?? app.requestedAmount
        return {
          ...app,
          status: 'approved' as const,
          approvedAmount: amount,
          reviewedAt: new Date().toISOString(),
        }
      }),
    }))

    const app = get().applications.find(item => item.id === id)
    if (!app) return

    const amount = approvedAmount ?? app.requestedAmount
    if (app.type === 'initial') {
      useUserStore.getState().updateUser({
        creditStatus: 'approved',
        creditLimit: amount,
        creditAvailable: amount,
        creditUsed: 0,
        creditAccountRef: app.reference,
        financePartnerId: app.financePartnerId as 'moneymart' | 'equity',
      })
      pushCreditApprovalNotification(app, amount)
      return
    }

    useUserStore.getState().updateUser({
      creditStatus: 'approved',
      creditLimit: user.creditLimit + amount,
      creditAvailable: user.creditAvailable + amount,
    })
    pushCreditApprovalNotification(app, amount)
  },

  rejectApplication(id, note) {
    const user = useUserStore.getState().user
    set(state => ({
      applications: state.applications.map(app => app.id === id
        ? {
          ...app,
          status: 'rejected' as const,
          declineReason: note ?? 'Application declined',
          reviewedAt: new Date().toISOString(),
        }
        : app),
    }))

    const app = get().applications.find(item => item.id === id)
    if (!app) return

    useUserStore.getState().updateUser({
      creditStatus: app.type === 'increase' && user.creditLimit > 0 ? 'approved' : 'rejected',
    })
  },

  getStatus() {
    const user = useUserStore.getState().user
    const application = get().applications[0] ?? null
    return {
      creditStatus: user.creditStatus,
      creditLimit: user.creditLimit,
      creditUsed: user.creditUsed,
      creditAvailable: user.creditAvailable,
      financePartnerId: user.financePartnerId,
      creditAccountRef: user.creditAccountRef,
      application,
    }
  },

  getAdminApplications() {
    const user = useUserStore.getState().user
    return get().applications.map(app => ({
      ...app,
      patientUserId: 'mock-patient',
      patientName: user.name,
      patientEmail: user.email,
      patientPhone: user.phone,
      country: user.country,
      currentCreditLimit: user.creditLimit,
      currentCreditAvailable: user.creditAvailable,
      currentCreditUsed: user.creditUsed,
      creditStatus: user.creditStatus,
    }))
  },
}))
