import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { spService } from '@/api/services/sp.service'
import { useAuthStore } from '@/store/auth.store'

/** SP portal data — backed by TanStack Query + API/mock service layer. */
export function useSPDemoData() {
  const spMode = useAuthStore(s => s.spMode)
  const query = useQuery({
    queryKey: queryKeys.sp.dashboard(spMode),
    queryFn: () => spService.getDashboard(spMode),
    initialData: () => spService.getDashboardMock(spMode),
  })

  const data = query.data
  const isNew = spMode === 'new'

  return {
    isNew,
    isLoading: query.isLoading,
    sp: data?.sp,
    appointments: data?.appointments ?? [],
    patients: data?.patients ?? [],
    payments: data?.payments ?? [],
    invoices: data?.invoices ?? [],
    notifications: data?.notifications ?? [],
  }
}
