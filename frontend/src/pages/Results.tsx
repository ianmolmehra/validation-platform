import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getResults, getTransactions, downloadUrl } from '../api/client'
import {
  CheckCircle2, XCircle, Download, FileText,
  ChevronLeft, ChevronRight, FileDown, Sparkles, ShieldCheck,
  Phone, Calendar, Copy, Layers, Zap,
  ArrowRight, BarChart2, CheckCheck
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const POLL_INTERVAL = 3000

const PIPELINE_STAGES = [
  { key: 'profiling',   label: 'Profiling',          icon: BarChart2,   desc: 'Scanning dataset structure & types' },
  { key: 'mapping',     label: 'Column Mapping',      icon: Copy,        desc: 'Auto-detecting 100+ column aliases' },
  { key: 'validating',  label: 'Schema Check',        icon: ShieldCheck, desc: 'Required fields & data types' },
  { key: 'phones',      label: 'Phone Validation',    icon: Phone,       desc: 'Country-specific phone number rules' },
  { key: 'dates',       label: 'Date Validation',     icon: Calendar,    desc: 'Format & range validation' },
  { key: 'duplicates',  label: 'Duplicate Detection', icon: Copy,        desc: 'Duplicate order IDs & refs' },
  { key: 'scoring',     label: 'Quality Scoring',     icon: Sparkles,    desc: 'Computing DQS across 5 dimensions' },
]

function PipelineViz({ status, completing, onDone }: { status: string; completing?: boolean; onDone?: () => void }) {
  const statusOrder = ['profiling', 'mapping', 'validating', 'phones', 'dates', 'duplicates', 'scoring', 'completed']
  const realIdx = statusOrder.indexOf(status)
  const startIdx = realIdx === -1 ? 0 : Math.min(realIdx, PIPELINE_STAGES.length - 1)

  const [animIdx, setAnimIdx] = useState(completing ? 0 : startIdx)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!completing) {
      setAnimIdx(startIdx)
      return
    }
    // Always restart from stage 0 so user sees every step light up
    doneRef.current = false
    setAnimIdx(0)
    let current = 0
    const interval = setInterval(() => {
      current += 1
      setAnimIdx(current)
      if (current >= PIPELINE_STAGES.length - 1) {
        clearInterval(interval)
        if (!doneRef.current) {
          doneRef.current = true
          setTimeout(() => onDone?.(), 900)
        }
      }
    }, 700)
    return () => clearInterval(interval)
  }, [completing])

  const displayIdx = completing ? animIdx : startIdx
  const allDone = completing && animIdx >= PIPELINE_STAGES.length - 1

  const activeStage = allDone ? PIPELINE_STAGES[PIPELINE_STAGES.length - 1] : PIPELINE_STAGES[displayIdx] || PIPELINE_STAGES[0]

  return (
    <div className="glass-card p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        {allDone
          ? <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          : <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full spinner mx-auto mb-4" />
        }
        <h3 className="font-bold text-gray-800 text-lg">
          {allDone ? 'Validation Complete!' : 'Processing Your Dataset'}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {allDone ? 'Loading your results…' : 'Running 7-stage validation pipeline…'}
        </p>
      </div>

      {/* Horizontal stepper */}
      <div className="flex items-start justify-between mb-6">
        {PIPELINE_STAGES.map((stage, i) => {
          let state: 'done' | 'active' | 'pending' = 'pending'
          if (completing) {
            if (i < displayIdx) state = 'done'
            else if (i === displayIdx) state = allDone ? 'done' : 'active'
          } else {
            if (displayIdx > i) state = 'done'
            else if (displayIdx === i || (displayIdx === -1 && i === 0)) state = 'active'
          }
          return (
            <div key={stage.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line left */}
              {i > 0 && (
                <div className="absolute top-[14px] right-1/2 left-0 h-[2px] -translate-y-1/2 transition-all duration-500"
                  style={{ background: i <= displayIdx ? '#10b981' : '#e5e7eb' }} />
              )}
              {/* Dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 text-xs font-bold transition-all duration-500 ${
                state === 'done'   ? 'bg-emerald-500 text-white scale-100' :
                state === 'active' ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-110 animate-pulse' :
                                     'bg-gray-200 text-gray-400 scale-90'
              }`}>
                {state === 'done' ? <CheckCheck className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {/* Label */}
              <p className={`text-[10px] font-semibold mt-1.5 text-center leading-tight transition-colors duration-300 ${
                state === 'done'   ? 'text-emerald-600' :
                state === 'active' ? 'text-blue-600' :
                                     'text-gray-400'
              }`}>{stage.label}</p>
            </div>
          )
        })}
      </div>

      {/* Active stage description */}
      {!allDone && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-semibold text-blue-700">
            Stage {displayIdx + 1} of {PIPELINE_STAGES.length} — {activeStage.desc}...
          </p>
        </div>
      )}
      {!completing && <p className="text-xs text-gray-300 mt-4 text-center">This page refreshes automatically</p>}
    </div>
  )
}

export default function Results() {
  const { jobId } = useParams<{ jobId: string }>()
  const [page, setPage] = useState(1)
  const [validOnly, setValidOnly] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const wasProcessingRef = useRef(false)

  const { data: resultsData, isLoading } = useQuery({
    queryKey: ['results', jobId],
    queryFn: () => getResults(jobId!),
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status
      return status === 'completed' || status === 'failed' ? false : POLL_INTERVAL
    },
    enabled: !!jobId,
  })

  const results = resultsData?.data
  const isProcessing = !!results?.status && !['completed', 'failed'].includes(results.status)

  useEffect(() => {
    if (isProcessing) wasProcessingRef.current = true
  }, [isProcessing])

  useEffect(() => {
    if (results?.status === 'completed' && !showResults && !completing) {
      if (wasProcessingRef.current) {
        setCompleting(true)
      } else {
        setShowResults(true)
      }
    }
    if (results?.status === 'failed') setShowResults(true)
  }, [results?.status])

  const { data: txnData } = useQuery({
    queryKey: ['transactions', jobId, page, validOnly],
    queryFn: () => getTransactions(jobId!, page, validOnly),
    enabled: !!jobId && showResults,
  })

  const txns = txnData?.data

  if (isLoading || !results) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full spinner mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading results…</p>
        </div>
      </div>
    )
  }

  if (isProcessing || completing) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-mesh -m-6 p-6">
        <PipelineViz
          status={results.status}
          completing={completing}
          onDone={() => { setCompleting(false); setShowResults(true) }}
        />
      </div>
    )
  }

  if (!showResults) return null

  const h = results.history || {}
  const totalRows = h.rows_processed || 0
  const validRows = h.valid_rows || 0
  const invalidRows = h.invalid_rows || 0
  const correctedRows = h.corrected_rows || 0
  const validPct     = totalRows ? (validRows / totalRows * 100).toFixed(1) : '0'
  const invalidPct   = totalRows ? (invalidRows / totalRows * 100).toFixed(1) : '0'
  const correctedPct = totalRows ? (correctedRows / totalRows * 100).toFixed(1) : '0'

  const pieData = [
    { name: 'Valid',      value: validRows },
    { name: 'Invalid',    value: invalidRows },
    { name: 'Corrected',  value: correctedRows },
  ].filter(d => d.value > 0)

  const errorBarData = Object.entries(results.error_type_summary || {})
    .map(([k, v]) => ({ type: k.replace(/_/g, ' '), count: v as number }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  const qualityScore  = h.quality_score || 0
  const readinessScore = h.readiness_score || 0
  const readinessLabel = h.readiness_label || '—'
  const scoreColor = (s: number) => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'

  const chunkCount = results.chunk_count || 0
  const countryFileCount = results.country_file_count || 0
  const countryFileNames: string[] = results.country_file_names || []
  const chunkSize  = results.chunk_size || 1000
  const corrections = results.corrections || []

  return (
    <div className="space-y-6 animate-fade-in bg-mesh min-h-screen -m-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/history" className="hover:text-blue-600">History</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium truncate max-w-[200px]">{results.filename}</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Validation Results</h1>
          {h.processing_time_seconds > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Processed in {h.processing_time_seconds}s · {totalRows.toLocaleString()} rows
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={downloadUrl(`/api/download/zip/${jobId}`)} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> Download ZIP
          </a>
          <a href={downloadUrl(`/api/download/report/${jobId}`)} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" /> PDF Report
          </a>
        </div>
      </div>

      {/* Quick download row — all 4 files visible immediately */}
      <div className="glass-card p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileDown className="w-3.5 h-3.5" /> Download Individual Files
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'validated_data.csv', url: `/api/download/validated/${jobId}`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅', desc: 'Valid rows only' },
            { label: 'error_report.csv',   url: `/api/download/errors/${jobId}`,    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: '❌', desc: 'All errors found' },
            { label: 'master_report.csv',  url: `/api/download/master/${jobId}`,    color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: '📋', desc: 'All rows + status' },
            { label: 'summary_report.pdf', url: `/api/download/report/${jobId}`,    color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  icon: '📄', desc: 'Quality summary' },
          ].map(({ label, url, color, bg, border, icon, desc }) => (
            <a key={label} href={downloadUrl(url)}
              className={`flex flex-col items-center gap-1.5 p-3 ${bg} border ${border} rounded-xl hover:opacity-80 transition-all group text-center`}>
              <span className="text-xl">{icon}</span>
              <p className={`text-[10px] font-bold font-mono ${color} leading-tight`}>{label}</p>
              <p className="text-[10px] text-gray-400">{desc}</p>
              <FileDown className={`w-3 h-3 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </a>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rows',      value: totalRows.toLocaleString(),     sub: 'Rows processed',              grad: 'card-gradient-blue'   },
          { label: 'Valid',           value: validRows.toLocaleString(),     sub: `${validPct}% pass rate`,      grad: 'card-gradient-green'  },
          { label: 'Auto-Corrected',  value: correctedRows.toLocaleString(), sub: `${correctedPct}% auto-fixed`, grad: 'card-gradient-amber'  },
          { label: 'Errors',          value: invalidRows.toLocaleString(),   sub: `${invalidPct}% need fix`,     grad: 'card-gradient-red'    },
        ].map((k, i) => (
          <div key={i} className={`${k.grad} card-3d p-5 text-white`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">{k.label}</p>
            <p className="text-3xl font-extrabold">{k.value}</p>
            <p className="text-xs opacity-70 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chunk banner */}
      {chunkCount > 0 && (
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-blue-500">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">Large File — Auto-Chunked</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {validRows.toLocaleString()} valid rows split into{' '}
              <span className="font-bold text-blue-700">{chunkCount} chunk{chunkCount > 1 ? 's' : ''}</span>
              {' '}of up to {chunkSize.toLocaleString()} rows each — all included in the ZIP.
            </p>
          </div>
          <a href={downloadUrl(`/api/download/zip/${jobId}`)}
             className="btn-primary text-xs flex items-center gap-1 flex-shrink-0">
            <Download className="w-3.5 h-3.5" /> ZIP
          </a>
        </div>
      )}

      {/* Quality + Readiness + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col items-center justify-center gap-3">
          <ScoreCircle score={qualityScore} label="Quality Score" color={scoreColor(qualityScore)} />
          <div className="w-full space-y-2 mt-1">
            {([
              ['Completeness', h.completeness],
              ['Accuracy',     h.accuracy],
              ['Validity',     h.validity],
              ['Uniqueness',   h.uniqueness],
            ] as [string, number][]).map(([k, v]) => v != null && (
              <div key={k}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>{k}</span><span>{Number(v).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${v}%`, background: 'linear-gradient(to right, #2563eb, #7c3aed)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col items-center justify-center gap-3">
          <ScoreCircle score={readinessScore} label="Readiness Score" color={scoreColor(readinessScore)} />
          <div className="text-center">
            <ReadinessBadge label={readinessLabel} />
            <p className="text-xs text-gray-400 mt-2 max-w-[180px]">
              {readinessScore >= 85 ? 'Safe to load into production systems.' :
               readinessScore >= 65 ? 'Minor fixes before production.' :
               readinessScore >= 40 ? 'Manual review recommended.' :
               'Critical issues — do not load.'}
            </p>
          </div>
          <div className="w-full mt-2 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-semibold">7 STAGES COMPLETED</p>
            <div className="flex flex-wrap gap-1">
              {PIPELINE_STAGES.map(s => (
                <span key={s.key} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Record Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={['#16a34a', '#dc2626', '#d97706'][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {[['Valid', '#16a34a'], ['Invalid', '#dc2626'], ['Corrected', '#d97706']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-Corrections */}
      {corrections.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Auto-Corrections Applied
            <span className="badge-yellow ml-1">{corrections.length} records fixed</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            These values were automatically corrected — phone numbers normalized, country names standardized, payment modes mapped to canonical format.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Row', 'Field', 'Original Value', '', 'Corrected Value'].map((hd, i) => (
                    <th key={i} className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrections.slice(0, 50).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/30">
                    <td className="py-2 px-3 text-gray-400">{c.row_number}</td>
                    <td className="py-2 px-3">
                      <span className="badge-blue capitalize">{c.error_field?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-red-400 line-through">{c.original_value || '—'}</td>
                    <td className="py-2 px-3 text-gray-300"><ArrowRight className="w-3 h-3" /></td>
                    <td className="py-2 px-3 font-mono text-emerald-600 font-semibold">{c.corrected_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {corrections.length > 50 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Showing 50 of {corrections.length} · Download Master CSV for full list
            </p>
          )}
        </div>
      )}

      {/* Error distribution */}
      {errorBarData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Error Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={errorBarData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="type" width={180} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {errorBarData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${i * 25 + 5}, 80%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Downloads — full ZIP structure */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-blue-500" /> What's in the ZIP
          </h3>
          <a href={downloadUrl(`/api/download/zip/${jobId}`)}
             className="btn-primary flex items-center gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Download Full ZIP
          </a>
        </div>

        {/* Core files — always present */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Core Files (always included)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {[
            { label: 'validated_data.csv', sub: 'Only rows that passed ALL validation — ready to load into any system', url: `/api/download/validated/${jobId}`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' },
            { label: 'error_report.csv',   sub: 'Every error found — row number, field, original value, error type', url: `/api/download/errors/${jobId}`,    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: '❌' },
            { label: 'master_report.csv',  sub: 'ALL rows combined with _is_valid, _was_corrected, _status tags', url: `/api/download/master/${jobId}`,    color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: '📋' },
            { label: 'summary_report.pdf', sub: 'Quality score, insights & error breakdown — share with stakeholders', url: `/api/download/report/${jobId}`,   color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  icon: '📄' },
          ].map(({ label, sub, url, color, bg, border, icon }) => (
            <a key={label} href={downloadUrl(url)}
              className={`flex items-start gap-3 p-3 ${bg} hover:opacity-80 rounded-xl border ${border} transition-all group`}>
              <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold font-mono ${color}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
              <FileDown className={`w-3.5 h-3.5 ${color} opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity`} />
            </a>
          ))}
        </div>

        {/* Chunk files */}
        {chunkCount > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              chunks/ folder — {chunkCount} file{chunkCount > 1 ? 's' : ''}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <span className="text-base">🔪</span>
                <div>
                  <p className="text-xs font-bold text-blue-700 font-mono">
                    chunks/chunk_1.csv … chunk_{chunkCount}.csv
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Validated rows split into {chunkCount} files of up to {chunkSize.toLocaleString()} rows each.
                    Use these when your downstream system can't handle the full file in one go.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...Array(chunkCount)].map((_, i) => (
                      <span key={i} className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-mono">
                        chunk_{i + 1}.csv
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Country files */}
        {countryFileCount > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              countries/ folder — {countryFileCount} file{countryFileCount > 1 ? 's' : ''}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <span className="text-base">🌍</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-700 font-mono">countries/[CountryName].csv</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Validated rows split by country — one file per country. Useful for region-specific downstream processing.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {countryFileNames.slice(0, 12).map((name: string) => (
                      <span key={name} className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5 font-mono">
                        {name}.csv
                      </span>
                    ))}
                    {countryFileNames.length > 12 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-0.5">
                        +{countryFileNames.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ZIP structure summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            📦 ZIP contains: 4 core files
            {chunkCount > 0 && ` + ${chunkCount} chunk file${chunkCount > 1 ? 's' : ''} in chunks/`}
            {countryFileCount > 0 && ` + ${countryFileCount} country file${countryFileCount > 1 ? 's' : ''} in countries/`}
            {' '}· Total: {4 + chunkCount + countryFileCount} files
          </p>
        </div>
      </div>

      {/* Errors table */}
      {results.errors?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            Validation Errors
            <span className="badge-red ml-1">{results.errors.length} shown</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Row', 'Order ID', 'Error Type', 'Field', 'Message', 'Original Value'].map(hd => (
                    <th key={hd} className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.errors.slice(0, 100).map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-red-50/30">
                    <td className="py-2 px-3 text-gray-500">{e.row_number}</td>
                    <td className="py-2 px-3 font-mono text-gray-700">{e.order_id || '—'}</td>
                    <td className="py-2 px-3"><span className="badge-red">{e.error_type}</span></td>
                    <td className="py-2 px-3 text-gray-600">{e.error_field}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-[250px] truncate">{e.error_message}</td>
                    <td className="py-2 px-3 font-mono text-gray-400 max-w-[120px] truncate">{e.original_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      {txns && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              All Transactions <span className="text-gray-400 font-normal">({txns.total.toLocaleString()} total)</span>
            </h3>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={validOnly} onChange={e => { setValidOnly(e.target.checked); setPage(1) }}
                className="rounded border-gray-300" />
              Valid only
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Order ID', 'Date', 'Customer', 'Country', 'Amount', 'Payment', 'Status'].map(hd => (
                    <th key={hd} className="text-left py-2 px-3 font-semibold text-gray-400 uppercase tracking-wide">{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.data.map((t: any) => (
                  <tr key={t.row_number} className="border-b border-gray-50 hover:bg-blue-50/20">
                    <td className="py-2 px-3 text-gray-400">{t.row_number}</td>
                    <td className="py-2 px-3 font-mono text-gray-700">{t.order_id || '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{t.order_date || '—'}</td>
                    <td className="py-2 px-3 text-gray-700 max-w-[120px] truncate">{t.customer_name || '—'}</td>
                    <td className="py-2 px-3 text-gray-600">{t.country || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-gray-700">{t.order_amount ? `$${Number(t.order_amount).toLocaleString()}` : '—'}</td>
                    <td className="py-2 px-3">{t.payment_mode || '—'}</td>
                    <td className="py-2 px-3">
                      {t.validation_status === 'valid'     && <span className="badge-green">Valid</span>}
                      {t.validation_status === 'invalid'   && <span className="badge-red">Invalid</span>}
                      {t.validation_status === 'corrected' && <span className="badge-yellow">Corrected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">Page {page} of {txns.total_pages}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= txns.total_pages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={110} height={110} className="-rotate-90">
          <circle cx={55} cy={55} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
          <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="score-ring" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-600 mt-1">{label}</p>
    </div>
  )
}

function ReadinessBadge({ label }: { label: string }) {
  if (label.includes('Production')) return <span className="badge-green text-sm px-3 py-1">{label}</span>
  if (label.includes('Minor'))      return <span className="badge-yellow text-sm px-3 py-1">{label}</span>
  if (label.includes('Major'))      return <span className="badge text-sm px-3 py-1" style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa'}}>{label}</span>
  return <span className="badge-red text-sm px-3 py-1">{label}</span>
}
