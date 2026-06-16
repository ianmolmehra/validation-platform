import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? ''
export const apiBase = BASE

export const api = axios.create({
  baseURL: BASE,
  timeout: 60000,
})

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.detail || err.response?.data?.error || err.message
    return Promise.reject(new Error(msg))
  }
)

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadFile = (file: File, onProgress?: (p: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/upload', form, {
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / (e.total || 1)) * 100))
  })
}

export const getStatus = (jobId: string) => api.get(`/api/status/${jobId}`)
export const getResults = (jobId: string) => api.get(`/api/results/${jobId}`)
export const getTransactions = (jobId: string, page = 1, validOnly = false) =>
  api.get(`/api/transactions/${jobId}`, { params: { page, page_size: 50, valid_only: validOnly } })
export const getAnalytics = (jobId?: string) =>
  api.get('/api/analytics', { params: jobId ? { job_id: jobId } : {} })
export const getHistory = (page = 1) =>
  api.get('/api/history', { params: { page, page_size: 20 } })
export const getLogs = (jobId?: string, level?: string, page = 1) =>
  api.get('/api/logs', { params: { job_id: jobId, level, page, page_size: 50 } })
export const getReports = (jobId: string) => api.get(`/api/reports/${jobId}`)
export const getCountries = () => api.get('/api/countries')

export const downloadUrl = (path: string) => `${BASE}${path}`
