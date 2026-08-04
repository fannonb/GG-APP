import { apiClient } from '@/api/client'
import type {
  AdminApplicationActionPayload,
  DeleteAdminProviderResponse,
  DeleteAdminUserResponse,
} from '@/api/types'
import type {
  AdminActivityItem,
  AdminAnalyticsData,
  AdminPaymentsResponse,
  AdminProvider,
  AdminStats,
  AdminUser,
  SPApplication,
} from '@/types/admin.types'
import type { NewsItem, Notification } from '@/types/user.types'
import type { AdminCreditApplication, CreditApplicationActionPayload } from '@/types/credit.types'

export interface AdminNewsArticlePayload {
  title: string
  source: string
  tag: string
  body: string
  date: string
  url?: string
}

export interface AdminDashboardData {
  stats: AdminStats
  applications: SPApplication[]
  creditApplications: AdminCreditApplication[]
}

export interface AdminPaymentsQuery {
  page?: number
  limit?: number
  search?: string
  country?: string
}

export const adminService = {
  async getNews(): Promise<NewsItem[]> {
    const { data } = await apiClient.get<NewsItem[]>('/admin/news')
    return data
  },

  async createNews(payload: AdminNewsArticlePayload): Promise<NewsItem> {
    const { data } = await apiClient.post<NewsItem>('/admin/news', payload)
    return data
  },

  async updateNews(id: number, payload: AdminNewsArticlePayload): Promise<NewsItem> {
    const { data } = await apiClient.patch<NewsItem>(`/admin/news/${id}`, payload)
    return data
  },

  async archiveNews(id: number): Promise<NewsItem> {
    const { data } = await apiClient.delete<NewsItem>(`/admin/news/${id}`)
    return data
  },

  async getDashboard(): Promise<AdminDashboardData> {
    const { data } = await apiClient.get<AdminDashboardData>('/admin/dashboard')
    return data
  },

  async getAnalytics(): Promise<AdminAnalyticsData> {
    const { data } = await apiClient.get<AdminAnalyticsData>('/admin/analytics')
    return data
  },

  async getApplications(): Promise<SPApplication[]> {
    const { data } = await apiClient.get<SPApplication[]>('/admin/applications')
    return data
  },

  async getApplication(id: string): Promise<SPApplication> {
    const { data } = await apiClient.get<SPApplication>(`/admin/applications/${id}`)
    return data
  },

  async approveApplication(
    id: string,
    payload: AdminApplicationActionPayload,
  ): Promise<AdminProvider> {
    const { data } = await apiClient.post<AdminProvider>(`/admin/applications/${id}/approve`, payload)
    return data
  },

  async requestApplicationInfo(
    id: string,
    payload: AdminApplicationActionPayload,
  ): Promise<SPApplication> {
    const { data } = await apiClient.post<SPApplication>(
      `/admin/applications/${id}/request-info`,
      payload,
    )
    return data
  },

  async rejectApplication(id: string, payload: AdminApplicationActionPayload): Promise<SPApplication> {
    const { data } = await apiClient.post<SPApplication>(`/admin/applications/${id}/reject`, payload)
    return data
  },

  async getUsers(): Promise<AdminUser[]> {
    const { data } = await apiClient.get<AdminUser[]>('/admin/users')
    return data
  },

  async getUser(id: string): Promise<AdminUser> {
    const { data } = await apiClient.get<AdminUser>(`/admin/users/${id}`)
    return data
  },

  async suspendUser(id: string): Promise<AdminUser> {
    const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/suspend`)
    return data
  },

  async reactivateUser(id: string): Promise<AdminUser> {
    const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/reactivate`)
    return data
  },

  async deleteUser(id: string): Promise<DeleteAdminUserResponse> {
    const { data } = await apiClient.delete<DeleteAdminUserResponse>(`/admin/users/${id}`)
    return data
  },

  async getProviders(): Promise<AdminProvider[]> {
    const { data } = await apiClient.get<AdminProvider[]>('/admin/providers')
    return data
  },

  async getPayments(params: AdminPaymentsQuery = {}): Promise<AdminPaymentsResponse> {
    const { data } = await apiClient.get<AdminPaymentsResponse>('/admin/payments', { params })
    return data
  },

  async getProvider(id: string): Promise<AdminProvider> {
    const { data } = await apiClient.get<AdminProvider>(`/admin/providers/${id}`)
    return data
  },

  async suspendProvider(id: string): Promise<AdminProvider> {
    const { data } = await apiClient.post<AdminProvider>(`/admin/providers/${id}/suspend`)
    return data
  },

  async reactivateProvider(id: string): Promise<AdminProvider> {
    const { data } = await apiClient.post<AdminProvider>(`/admin/providers/${id}/reactivate`)
    return data
  },

  async deleteProvider(id: string): Promise<DeleteAdminProviderResponse> {
    const { data } = await apiClient.delete<DeleteAdminProviderResponse>(`/admin/providers/${id}`)
    return data
  },

  async getNotifications(): Promise<Notification[]> {
    const { data } = await apiClient.get<Notification[]>('/admin/notifications')
    return data
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post<{ success: boolean }>(`/admin/notifications/${id}/read`)
    return data
  },

  async revealNationalId(userId: string): Promise<{ nationalId: string }> {
    const { data } = await apiClient.get<{ nationalId: string }>(`/admin/users/${userId}/national-id`)
    return data
  },

  async getRecentActivity(country?: string, limit = 10): Promise<AdminActivityItem[]> {
    const params: Record<string, string | number> = { limit }
    if (country && country !== 'all') {
      params.country = country
    }
    const { data } = await apiClient.get<AdminActivityItem[]>('/admin/activity', { params })
    return data
  },

  async getCreditApplications(): Promise<AdminCreditApplication[]> {
    const { data } = await apiClient.get<AdminCreditApplication[]>('/admin/credit-applications')
    return data
  },

  async getCreditApplication(id: string): Promise<AdminCreditApplication> {
    const { data } = await apiClient.get<AdminCreditApplication>(`/admin/credit-applications/${id}`)
    return data
  },

  async approveCreditApplication(
    id: string,
    payload: CreditApplicationActionPayload,
  ): Promise<AdminCreditApplication> {
    const { data } = await apiClient.post<AdminCreditApplication>(`/admin/credit-applications/${id}/approve`, payload)
    return data
  },

  async rejectCreditApplication(
    id: string,
    payload: CreditApplicationActionPayload,
  ): Promise<AdminCreditApplication> {
    const { data } = await apiClient.post<AdminCreditApplication>(`/admin/credit-applications/${id}/reject`, payload)
    return data
  },
}
