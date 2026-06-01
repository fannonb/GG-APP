import { create } from 'zustand'

export interface PaymentAccount {
  id: string
  method: string
  number: string
  name: string
  country: string
  isDefault: boolean
}

interface SPPaymentsStore {
  accounts: PaymentAccount[]
  addAccount: (account: Omit<PaymentAccount, 'id'>) => void
  removeAccount: (id: string) => void
  updateAccount: (id: string, partial: Partial<PaymentAccount>) => void
  setDefaultAccount: (id: string) => void
}

export const useSPPaymentsStore = create<SPPaymentsStore>(set => ({
  accounts: [
    {
      id: 'acc-1',
      method: 'Mobile Money (EcoCash)',
      number: '123456',
      name: 'City Medical Centre',
      country: 'Zimbabwe',
      isDefault: true
    },
    {
      id: 'acc-2',
      method: 'Bank Transfer',
      number: '9876543210',
      name: 'City Medical Centre GP Account',
      country: 'Zimbabwe',
      isDefault: false
    }
  ],
  addAccount: account => set(s => {
    const id = 'acc-' + Math.random().toString(36).substr(2, 9)
    const newAccount = { ...account, id }
    // If the new account is default, remove default from others
    const accounts = s.accounts.map(a => account.isDefault ? { ...a, isDefault: false } : a)
    return { accounts: [...accounts, newAccount] }
  }),
  removeAccount: id => set(s => {
    const toRemove = s.accounts.find(a => a.id === id)
    let accounts = s.accounts.filter(a => a.id !== id)
    // If we removed the default one and have accounts left, make the first one default
    if (toRemove?.isDefault && accounts.length > 0) {
      accounts[0].isDefault = true
    }
    return { accounts }
  }),
  updateAccount: (id, partial) => set(s => {
    let accounts = s.accounts.map(a => a.id === id ? { ...a, ...partial } : a)
    if (partial.isDefault) {
      accounts = accounts.map(a => a.id === id ? a : { ...a, isDefault: false })
    }
    return { accounts }
  }),
  setDefaultAccount: id => set(s => ({
    accounts: s.accounts.map(a => ({ ...a, isDefault: a.id === id }))
  }))
}))
