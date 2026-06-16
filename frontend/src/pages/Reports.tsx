import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getReports, getResults, downloadUrl } from '../api/client'
import { FileText, FileSpreadsheet, Archive, Globe, Layers, Download } from 'lucide-react'

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  validated_csv:  { label: 'Validated CSV',    icon: FileSpreadsheet, color: 'text-emerald-600' },
  error_csv:      { label: 'Error Report CSV',  icon: FileSpreadsheet, color: 'text-red-600' },
  master_csv:     { label: 'Master Report CSV', icon: FileSpreadsheet, color: 'text-blue-600' },
  summary_pdf:    { label: 'Summary PDF',       icon: FileText,        color: 'text-purple-600' },
  zip:            { label: 'Full ZIP Export',   icon: Archive,         color: 'text-gray-700' },
  country_csv:    { label: 'Country File',      icon: Globe,           color: 'text-amber-600' },
  chunk_csv:      { label: 'Chunk File',        icon: Layers,          color: 'text-cyan-600' },
}

const DOWNLOAD_URLS: Record<string, (id: string) => string> = {
  zip: id => `/api/download/zip/${id}`,
  summary_pdf: id => `/api/download/report/${id}`,
  validated_csv: id => `/api/download/validated/${id}`,
  error_csv: id => `/api/download/errors/${id}`,
  master_csv: id => `/api/download/master/${id}`,
}

export default function Reports() {
  const { jobId } = useParams<{ jobId: string }>()

  const { data: reportsData } = useQuery({
    queryKey: ['reports', jobId],
    queryFn: () => getReports(jobId!),
    enabled: !!jobId,
  })

  const { data: resultsData } = useQuery({
    queryKey: ['results-summary', jobId],
    queryFn: () => getResults(jobId!),
    enabled: !!jobId,
  })

  const reports = reportsData?.data || []
  const results = resultsData?.data

  const grouped = reports.reduce((acc: Record<string, any[]>, r: any) => {
    ;(acc[r.report_type] = acc[r.report_type] || []).push(r)
    return acc
  }, {})

  const fmt = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB`
    : `${bytes} B`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generated Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {results?.filename} · {reports.length} files generated
        </p>
      </div>

      {/* Quick downloads */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {['zip', 'summary_pdf', 'validated_csv', 'error_csv', 'master_csv'].map(type => {
          const meta = TYPE_META[type]
          const Icon = meta.icon
          const url = DOWNLOAD_URLS[type]?.(jobId!)
          const rep = (grouped[type] || [])[0]
          return (
            <a key={type} href={url ? downloadUrl(url) : '#'}
              className="card p-4 flex items-center gap-3 hover:shadow-md transition-all hover:border-blue-200 group">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 truncate">{meta.label}</p>
                {rep && <p className="text-xs text-gray-400">{fmt(rep.file_size || 0)}</p>}
              </div>
              <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
            </a>
          )
        })}
      </div>

      {/* All files */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">All Generated Files</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {reports.map((r: any) => {
            const meta = TYPE_META[r.report_type] || { label: r.report_type, icon: FileText, color: 'text-gray-500' }
            const Icon = meta.icon
            const dlUrl = DOWNLOAD_URLS[r.report_type]?.(jobId!)
            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.file_name}</p>
                  <p className="text-xs text-gray-400">{meta.label} · {fmt(r.file_size || 0)}</p>
                </div>
                <span className="text-xs text-gray-300">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
                {dlUrl && (
                  <a href={downloadUrl(dlUrl)}
                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
