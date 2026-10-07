import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { adminService, type AdminNewsArticlePayload } from '@/api/services/admin.service'

/** Every article (published, drafts and archived) for the admin News page. */
const ALL_NEWS_KEY = ['admin', 'news', 'all'] as const

function useRefreshNews() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ALL_NEWS_KEY })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.news })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.newsCategories })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.news })
    void queryClient.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
  }
}

export function useAdminNewsArticles() {
  return useQuery({ queryKey: ALL_NEWS_KEY, queryFn: () => adminService.getNews() })
}

export function useNewsCategories() {
  return useQuery({ queryKey: queryKeys.admin.newsCategories, queryFn: () => adminService.getNewsCategories() })
}

export function useSaveNewsArticle() {
  const refresh = useRefreshNews()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: AdminNewsArticlePayload }) => {
      if (id == null) return adminService.createNews(payload)
      // Edits never change the status; that has its own endpoint.
      const { status: _status, ...fields } = payload
      return adminService.updateNews(id, fields)
    },
    onSuccess: refresh,
  })
}

export function useNewsStatus() {
  const refresh = useRefreshNews()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'draft' | 'published' | 'archived' }) => adminService.setNewsStatus(id, status),
    onSuccess: refresh,
  })
}

export function useDeleteNews() {
  const refresh = useRefreshNews()
  return useMutation({ mutationFn: (id: number) => adminService.deleteNews(id), onSuccess: refresh })
}

export function useNewsCategoryMutations() {
  const refresh = useRefreshNews()
  const create = useMutation({ mutationFn: (name: string) => adminService.createNewsCategory(name), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: number) => adminService.deleteNewsCategory(id), onSuccess: refresh })
  return { create, remove }
}
