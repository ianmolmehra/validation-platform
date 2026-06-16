import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getHistory } from '../api/client'
import { History as HistoryIcon, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react'
import { downloadUrl } from '../api/client'

export default function History() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => getHistory(page),
    refetchInterval: 30000,
  })

  const history = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Processing History</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} jobs processed</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['File Name', 'Upload Date', 'Rows', 'Valid', 'Invalid', 'Corrected', 'Quality', 'Readiness', 'Time', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400">
                    <HistoryIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No processing history yet</p>
                  </td>
                </tr>
              ) : history.map((job: any) => (
                <tr key={job.job_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-800 max-w-[180px] truncate" title={job.file_name}>
                    {job.file_name}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                    {job.upload_date ? new Date(job.upload_date).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{(job.rows_processed || 0).toLocaleString()}</td>
                  <td className="py-3 px-4"><span className="badge-green">{(job.valid_rows || 0).toLocaleString()}</span></td>
                  <td className="py-3 px-4"><span className="badge-red">{(job.invalid_rows || 0).toLocaleString()}</span></td>
                  <td className="py-3 px-4"><span className="badge-yellow">{(job.corrected_rows || 0).toLocaleString()}</span></td>
                  <td className="py-3 px-4">
                    <QualityBadge score={job.quality_score} />
                  </td>
                  <td className="py-3 px-4">
                    <ReadinessBadge label={job.readiness_label} />
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                    {job.processing_time_seconds?.toFixed(1)}s
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Link to={`/results/${job.job_id}`}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="View Results">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <a href={downloadUrl(`/api/download/zip/${job.job_id}`)}
                        className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Download ZIP">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages} ({total} jobs)</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'badge-green' : score >= 60 ? 'badge-yellow' : 'badge-red'
  return <span className={color}>{Math.round(score)}/100</span>
}

function ReadinessBadge({ label }: { label: string }) {
  if (!label) return <span className="badge-gray">—</span>
  if (label.includes('Production')) return <span className="badge-green text-xs">{label}</span>
  if (label.includes('Minor')) return <span className="badge-yellow text-xs">{label}</span>
  if (label.includes('Major')) return <span className="badge text-xs" style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa'}}>{label}</span>
  return <span className="badge-red text-xs">{label}</span>
}
