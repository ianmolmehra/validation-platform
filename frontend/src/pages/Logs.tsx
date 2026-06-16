import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLogs } from '../api/client'
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const LEVELS = ['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR']
const LEVEL_STYLE: Record<string, string> = {
  INFO: 'badge-blue',
  SUCCESS: 'badge-green',
  WARNING: 'badge-yellow',
  ERROR: 'badge-red',
}

export default function Logs() {
  const [page, setPage] = useState(1)
  const [level, setLevel] = useState('ALL')
  const [jobId, setJobId] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', page, level, jobId],
    queryFn: () => getLogs(jobId || undefined, level === 'ALL' ? undefined : level, page),
    refetchInterval: 10000,
  })

  const logs = data?.data?.data || []
  const total = data?.data?.total || 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processing Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} log entries</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {LEVELS.map(l => (
            <button key={l} onClick={() => { setLevel(l); setPage(1) }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                level === l ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>
              {l}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by Job ID..."
          value={jobId}
          onChange={e => { setJobId(e.target.value); setPage(1) }}
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
        />
      </div>

      {/* Log feed */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
                <div className="h-5 w-16 bg-gray-100 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No logs found</p>
            </div>
          ) : logs.map((log: any) => (
            <div key={log.id}
              className={clsx(
                'px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors',
                log.level === 'ERROR' && 'bg-red-50/30',
                log.level === 'WARNING' && 'bg-amber-50/20',
              )}>
              <div className="flex-shrink-0 mt-0.5">
                <span className={LEVEL_STYLE[log.level] || 'badge-gray'}>{log.level}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{log.event}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs font-mono text-gray-400">{log.job_id?.slice(0, 8)}…</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{log.message}</p>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-300 whitespace-nowrap">
                {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} · {total} entries</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
