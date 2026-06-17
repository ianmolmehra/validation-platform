import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { uploadFile, apiBase } from '../api/client'
import {
  Upload as UploadIcon, FileSpreadsheet, File as FileIcon, X, AlertCircle,
  CloudUpload, Zap, Shield, BarChart3, FlaskConical,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react'
import clsx from 'clsx'

interface Sample {
  key: string
  label: string
  description: string
  score: number
  badge: string
}

export default function Upload() {
  const [file, setFile]           = useState<File | null>(null)
  const [progress, setProgress]   = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [samples, setSamples]     = useState<Sample[]>([])
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setSamples([
      { key: 'clean',  label: 'Clean Dataset',  description: '20 rows — well-formatted data, minor phone corrections', score: 98, badge: 'HIGH QUALITY' },
      { key: 'mixed',  label: 'Mixed Dataset',  description: '20 rows — country codes in phones, date format variations, duplicate', score: 65, badge: 'NEEDS CLEANUP' },
      { key: 'messy',  label: 'Messy Dataset',  description: '20 rows — missing fields, invalid phones, bad dates, negative amounts', score: 25, badge: 'POOR QUALITY' },
    ])
  }, [])

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDropRejected: () => setError('Only CSV and XLSX files are supported.'),
  })

  const handleUpload = async (fileToUpload: File = file!) => {
    if (!fileToUpload) return
    setUploading(true); setProgress(0); setError(null)
    try {
      const res = await uploadFile(fileToUpload, setProgress)
      toast.success('File uploaded! Processing started.')
      navigate(`/results/${res.data.job_id}`)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false); setLoadingSample(null)
    }
  }

  const SAMPLE_URLS: Record<string, string> = {
    clean: 'https://raw.githubusercontent.com/ianmolmehra/validation-platform/main/sample_data/sample_clean.csv',
    mixed: 'https://raw.githubusercontent.com/ianmolmehra/validation-platform/main/sample_data/sample_mixed.csv',
    messy: 'https://raw.githubusercontent.com/ianmolmehra/validation-platform/main/sample_data/sample_messy.csv',
  }

  const handleSample = async (sample: Sample) => {
    setLoadingSample(sample.key)
    setError(null)
    try {
      const res = await fetch(SAMPLE_URLS[sample.key])
      if (!res.ok) throw new Error('Failed to fetch sample')
      const blob = await res.blob()
      const sampleFile = new File([blob], `${sample.label.replace(/\s+/g,'_')}.csv`, { type: 'text/csv' })
      setFile(sampleFile)
      await handleUpload(sampleFile)
    } catch (e: any) {
      setError(e.message || 'Failed to load sample')
      toast.error('Failed to load sample file')
      setLoadingSample(null)
    }
  }

  const scoreMeta = (score: number) => {
    if (score >= 80) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', Icon: CheckCircle2 }
    if (score >= 50) return { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500',   Icon: AlertTriangle }
    return               { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-500',     Icon: XCircle }
  }

  const fileSize  = file ? (file.size / 1024 / 1024).toFixed(2) : null
  const isCSV     = file?.name.endsWith('.csv')

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Dataset</h1>
        <p className="text-gray-500 text-sm mt-0.5">Upload your transaction CSV or XLSX file for validation and processing</p>
      </div>

      {/* Feature strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap,      label: 'Auto-Detection',     desc: '100+ column aliases' },
          { icon: Shield,   label: '7-Stage Validation', desc: 'Comprehensive checks' },
          { icon: BarChart3, label: 'Analytics & Reports', desc: 'PDF, CSV, ZIP export' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 text-center">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Icon className="w-4.5 h-4.5 text-blue-600" style={{width:18,height:18}} />
            </div>
            <p className="text-xs font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Sample files ─────────────────────────────────────────────── */}
      {samples.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-800">Try a Sample Dataset</h3>
            <span className="ml-auto text-xs text-gray-400">Pick one to auto-upload and see results instantly</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {samples.map(s => {
              const m = scoreMeta(s.score)
              const isLoading = loadingSample === s.key
              return (
                <button
                  key={s.key}
                  disabled={uploading || !!loadingSample}
                  onClick={() => handleSample(s)}
                  onMouseMove={e => {
                    if (uploading || loadingSample) return
                    const el = e.currentTarget
                    const rect = el.getBoundingClientRect()
                    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14
                    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14
                    el.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) translateY(-2px)`
                  }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                  className={clsx(
                    'relative text-left rounded-xl border p-3.5 transition-all duration-150 group',
                    m.bg, m.border,
                    uploading || loadingSample ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'
                  )}
                  style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                >
                  {/* Badge */}
                  <span className={clsx('text-[10px] font-bold uppercase tracking-wide', m.color)}>{s.badge}</span>

                  <p className="text-xs font-semibold text-gray-800 mt-1 leading-tight">{s.label}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{s.description}</p>

                  {/* Score bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-400">Expected score</span>
                      <span className={clsx('text-[11px] font-bold', m.color)}>~{s.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all', m.bar)} style={{width:`${s.score}%`}} />
                    </div>
                  </div>

                  {/* Loading spinner */}
                  {isLoading && (
                    <div className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50 scale-[1.01]' : '',
          isDragReject  ? 'border-red-400 bg-red-50' : '',
          !isDragActive && !isDragReject ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30' : '',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center transition-colors', isDragActive ? 'bg-blue-100' : 'bg-gray-100')}>
            <CloudUpload className={clsx('w-8 h-8', isDragActive ? 'text-blue-600' : 'text-gray-400')} />
          </div>
          {isDragActive ? (
            <p className="text-blue-600 font-semibold text-lg">Drop your file here</p>
          ) : (
            <>
              <div>
                <p className="text-gray-700 font-semibold text-base">Drag & drop your file here</p>
                <p className="text-gray-400 text-sm mt-1">or <span className="text-blue-600 font-medium">browse files</span></p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {['CSV', 'XLSX', 'XLS'].map(t => (
                  <span key={t} className="badge-blue text-xs">{t}</span>
                ))}
              </div>
              <p className="text-xs text-gray-300">Maximum file size: 500MB</p>
            </>
          )}
        </div>
      </div>

      {/* Selected file */}
      {file && !uploading && (
        <div className="card p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            {isCSV ? <FileIcon className="w-5 h-5 text-blue-600" /> : <FileSpreadsheet className="w-5 h-5 text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{fileSize} MB • {isCSV ? 'CSV' : 'Excel'} file</p>
          </div>
          <button onClick={() => setFile(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading{loadingSample ? ` sample — ${samples.find(s=>s.key===loadingSample)?.label}` : ''}…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 text-center">Processing will begin automatically after upload</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Upload button */}
      {file && !uploading && (
        <button onClick={() => handleUpload()} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base animate-fade-in">
          <UploadIcon className="w-5 h-5" />
          Upload & Process Dataset
        </button>
      )}

      {/* Column aliases */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Supported Column Name Formats</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { canonical: 'Order ID',        examples: 'order_id, OrderID, order no, sale_id, invoice_id' },
            { canonical: 'Customer Phone',  examples: 'phone, mobile, mobile_number, contact, telephone' },
            { canonical: 'Order Amount',    examples: 'amount, total, revenue, grand_total, sale_amount' },
            { canonical: 'Payment Mode',    examples: 'payment_method, pay_mode, payment_type, mode' },
            { canonical: 'Order Date',      examples: 'date, sale_date, transaction_date, invoice_date' },
            { canonical: 'Transaction Ref', examples: 'reference, txn_id, ref_no, transaction reference number' },
          ].map(({ canonical, examples }) => (
            <div key={canonical} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700">{canonical}</p>
              <p className="text-xs text-gray-400 mt-0.5">{examples}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">* 100+ column aliases supported. No header renaming needed.</p>
      </div>
    </div>
  )
}
