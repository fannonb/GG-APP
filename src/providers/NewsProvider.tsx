import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isMockApi } from '@/api/config'
import { queryKeys } from '@/api/query-keys'
import { adminService } from '@/api/services/admin.service'
import { patientService } from '@/api/services/patient.service'
import { MOCK_NEWS } from '@/mock/patient.mock'
import type { NewsItem } from '@/types/user.types'

export function NewsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function normalizeNewsItem(item: Omit<NewsItem, 'id'>): Omit<NewsItem, 'id'> {
  return {
    ...item,
    title: item.title.trim(),
    source: item.source.trim(),
    tag: item.tag.trim(),
    body: item.body.trim(),
    url: item.url?.trim() || undefined,
  }
}

function syncNewsCaches(queryClient: ReturnType<typeof useQueryClient>, articles: NewsItem[]) {
  const sorted = [...articles].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  const published = sorted.filter(item => item.status !== 'archived')

  queryClient.setQueryData(queryKeys.admin.news, sorted)
  queryClient.setQueryData(queryKeys.patient.news, published)
}

export function useNews() {
  const queryClient = useQueryClient()
  const [mockArticles, setMockArticles] = useState<NewsItem[]>(() => [...MOCK_NEWS])

  useEffect(() => {
    if (isMockApi) {
      setMockArticles([...MOCK_NEWS])
    }
  }, [])

  const newsQuery = useQuery({
    queryKey: queryKeys.admin.news,
    queryFn: () => patientService.getNews(),
    enabled: !isMockApi,
  })

  const articles = useMemo(() => {
    if (isMockApi) {
      return mockArticles
    }

    return newsQuery.data ?? []
  }, [mockArticles, newsQuery.data])

  const getCurrentArticles = () => queryClient.getQueryData<NewsItem[]>(queryKeys.admin.news) ?? articles

  const publish = (item: Omit<NewsItem, 'id'>) => {
    const payload = normalizeNewsItem(item)

    if (isMockApi) {
      const nextArticles: NewsItem[] = [{ ...payload, id: Date.now(), status: 'published' }, ...mockArticles]
      setMockArticles(nextArticles)
      syncNewsCaches(queryClient, nextArticles)
      return
    }

    void adminService.createNews(payload)
      .then(created => {
        const nextArticles = [created, ...getCurrentArticles().filter(article => article.id !== created.id)]
        syncNewsCaches(queryClient, nextArticles)
        void queryClient.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      })
      .catch(error => {
        console.error('Failed to publish news article', error)
      })
  }

  const update = (item: NewsItem) => {
    const payload = normalizeNewsItem(item)

    if (isMockApi) {
      const nextArticles = mockArticles.map(article => (
        article.id === item.id
          ? { ...payload, id: item.id, status: article.status ?? 'published' }
          : article
      ))
      setMockArticles(nextArticles)
      syncNewsCaches(queryClient, nextArticles)
      return
    }

    void adminService.updateNews(item.id, payload)
      .then(updated => {
        const nextArticles: NewsItem[] = getCurrentArticles().map(article => (
          article.id === updated.id ? updated : article
        ))
        syncNewsCaches(queryClient, nextArticles)
        void queryClient.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      })
      .catch(error => {
        console.error('Failed to update news article', error)
      })
  }

  const remove = (id: number) => {
    if (isMockApi) {
      const nextArticles: NewsItem[] = mockArticles.map(article => (
        article.id === id ? { ...article, status: 'archived' as const } : article
      ))
      setMockArticles(nextArticles)
      syncNewsCaches(queryClient, nextArticles)
      return
    }

    void adminService.archiveNews(id)
      .then(archived => {
        const nextArticles: NewsItem[] = getCurrentArticles().map(article => (
          article.id === archived.id ? archived : article
        ))
        syncNewsCaches(queryClient, nextArticles)
        void queryClient.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      })
      .catch(error => {
        console.error('Failed to archive news article', error)
      })
  }

  return { articles, publish, update, remove }
}
