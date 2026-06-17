import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getAnalytics, getHistory } from '../api/client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Database, CheckCircle2, AlertCircle, Upload, TrendingUp,
  Globe, CreditCard, Activity, ArrowRight, FileCheck,
  Zap, ShieldCheck, BarChart2, Sparkles, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

const COLORS = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0891b2','#65a30d','#ec4899']

/* ─── Smart insight generator ─── */
function generateInsights(analytics: any, history: any[]) {
  const insights: { type: 'success'|'warning'|'danger'|'info'; title: string; body: string }[] = []
  const rate = analytics.validation_success_rate || 0
  const total = analytics.total_transactions || 0
  const errors = (analytics.error_distribution || [])
  const topErr = errors[0]

  if (rate >= 90) insights.push({ type:'success', title:'Excellent Data Quality', body:`${rate.toFixed(1)}% of records pass validation — your data pipeline is operating at peak health.` })
  else if (rate >= 70) insights.push({ type:'warning', title:'Moderate Quality — Action Needed', body:`${(100-rate).toFixed(1)}% of records have issues. Review error patterns to improve upstream data collection.` })
  else if (rate > 0)   insights.push({ type:'danger',  title:'Critical Quality Issues', body:`Only ${rate.toFixed(1)}% of records are valid. Immediate remediation of data sources is recommended.` })

  if (topErr) insights.push({ type:'info', title:`Top Error: ${topErr.error_type}`, body:`This accounts for the highest share of validation failures. Focus correction efforts here first.` })

  const countries = analytics.top_countries || []
  if (countries.length > 0) {
    const top = countries[0]
    insights.push({ type:'info', title:`${top.country} Leads Revenue`, body:`$${(top.revenue||0).toLocaleString()} processed — ${((top.revenue / (countries.reduce((a:number,c:any)=>a+(c.revenue||0),0)||1))*100).toFixed(0)}% of total revenue.` })
  }

  if (history.length > 1) {
    const last = history[0]; const prev = history[1]
    if (last && prev && last.quality_score && prev.quality_score) {
      const diff = last.quality_score - prev.quality_score
      if (diff > 0) insights.push({ type:'success', title:'Quality Improving', body:`Quality score rose by ${diff.toFixed(1)} points vs the previous job. Keep it up!` })
      else if (diff < 0) insights.push({ type:'warning', title:'Quality Declining', body:`Quality score dropped by ${Math.abs(diff).toFixed(1)} points vs the previous job. Check for new data issues.` })
    }
  }

  return insights
}

export default function Dashboard() {
  const { data: analyticsData } = useQuery({ queryKey:['analytics'], queryFn:()=>getAnalytics(), refetchInterval:30000 })
  const { data: historyData }   = useQuery({ queryKey:['history'],   queryFn:()=>getHistory(1), refetchInterval:30000 })

  const analytics = analyticsData?.data || {}
  const history   = historyData?.data?.data || []

  const totalJobs   = historyData?.data?.total || 0
  const totalTxns   = analytics.total_transactions || 0
  const validTxns   = analytics.valid_transactions || 0
  const invalidTxns = totalTxns - validTxns
  const successRate = analytics.validation_success_rate || 0
  const insights    = generateInsights(analytics, history)

  const recentJob = history[0]
  const prevJob   = history[1]
  const qDiff = recentJob && prevJob && recentJob.quality_score && prevJob.quality_score
    ? recentJob.quality_score - prevJob.quality_score : null

  return (
    <div className="space-y-6 animate-fade-in min-h-screen -m-6 p-6 relative overflow-hidden" style={{ background: '#f0f4ff' }}>

      {/* ── Floating background orbs ── */}
      <div className="orb" style={{ width:420, height:420, top:-120, right:-100, background:'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', animation:'orb-drift 18s ease-in-out infinite' }} />
      <div className="orb" style={{ width:320, height:320, bottom:80, left:-80, background:'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animation:'orb-drift 22s ease-in-out infinite reverse' }} />
      <div className="orb" style={{ width:240, height:240, top:'40%', left:'55%', background:'radial-gradient(circle, rgba(8,145,178,0.08) 0%, transparent 70%)', animation:'orb-drift 15s ease-in-out infinite 3s' }} />

      {/* ── Page header ── */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enterprise data validation — live overview</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2 pulse-glow">
          <Upload className="w-4 h-4" /> Upload Dataset
        </Link>
      </div>

      {/* ── Hero KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 perspective-wrap relative z-10">
        <HeroCard label="Total Jobs"          value={totalJobs}                   icon={<Database className="w-5 h-5" />}    gradient="card-gradient-blue"   sub="All time"                         badge="📁" />
        <HeroCard label="Records Processed"   value={totalTxns.toLocaleString()}  icon={<Activity className="w-5 h-5" />}    gradient="card-gradient-purple" sub="Across all jobs"                   badge="📊" />
        <HeroCard label="Valid Records"       value={validTxns.toLocaleString()}  icon={<CheckCircle2 className="w-5 h-5" />} gradient="card-gradient-green"  sub={`${successRate.toFixed(1)}% rate`} badge="✅" />
        <HeroCard label="Issues Found"        value={invalidTxns.toLocaleString()} icon={<AlertCircle className="w-5 h-5" />} gradient="card-gradient-red"    sub="Need remediation"                 badge="⚠️" />
      </div>

      {/* ── Quality score ring + insights ── */}
      {totalTxns > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">

          {/* Score ring */}
          <div className="glass-card p-6 flex flex-col items-center justify-center gap-4">
            <p className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> Overall Validation Rate
            </p>
            <ScoreRing score={successRate} size={160} />
            {qDiff !== null && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${qDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {qDiff >= 0
                  ? <><ArrowUpRight className="w-4 h-4" /> +{qDiff.toFixed(1)} vs prev job</>
                  : <><ArrowDownRight className="w-4 h-4" /> {qDiff.toFixed(1)} vs prev job</>
                }
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="glass-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" /> Smart Insights
            </h3>
            <div className="space-y-2.5">
              {insights.length === 0 && (
                <p className="text-sm text-gray-400">Upload a dataset to generate insights.</p>
              )}
              {insights.map((ins, i) => (
                <div key={i} className={`insight-${ins.type} flex gap-3`}>
                  <span className="text-lg mt-0.5">
                    {ins.type === 'success' ? '✅' : ins.type === 'warning' ? '⚠️' : ins.type === 'danger' ? '🚨' : 'ℹ️'}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{ins.title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{ins.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Revenue by country */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" /> Revenue by Country
          </h3>
          {(analytics.top_countries || []).length === 0
            ? <EmptyChart />
            : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.top_countries} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="country" tick={{ fontSize:11, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:12, boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}
                  formatter={(v:number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment mode donut */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" /> Payment Modes
          </h3>
          {(analytics.payment_mode_distribution || []).length === 0
            ? <EmptyChart />
            : (() => {
              const CANONICAL: Record<string, string> = {
                card:'Card', credit_card:'Card', 'credit card':'Card',
                debit_card:'Card', 'debit card':'Card', visa:'Card', mastercard:'Card', amex:'Card',
                cash:'Cash', cod:'Cash', 'cash on delivery':'Cash',
                upi:'UPI', gpay:'UPI', 'google pay':'UPI', phonepe:'UPI', paytm:'UPI', bhim:'UPI',
                wallet:'Wallet', ewallet:'Wallet', 'e-wallet':'Wallet', paypal:'Wallet',
                'mobile money':'Wallet', 'mobile wallet':'Wallet',
                'net banking':'Net Banking', netbanking:'Net Banking', net_banking:'Net Banking',
                bank_transfer:'Net Banking', 'bank transfer':'Net Banking',
                neft:'Net Banking', rtgs:'Net Banking', imps:'Net Banking', 'wire transfer':'Net Banking',
              }
              const PIE_COLORS: Record<string, string> = {
                Card:'#2563eb', Cash:'#10b981', UPI:'#f59e0b',
                Wallet:'#8b5cf6', 'Net Banking':'#0891b2', Other:'#94a3b8',
              }
              const buckets: Record<string, number> = {}
              for (const row of analytics.payment_mode_distribution) {
                const raw = (row.mode || '').toLowerCase().trim()
                const key = CANONICAL[raw] || 'Other'
                buckets[key] = (buckets[key] || 0) + (row.count || 0)
              }
              const pieData = Object.entries(buckets)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, count]) => ({ mode, count }))
              const total = pieData.reduce((s, r) => s + r.count, 0)
              return (
                <div className="flex flex-col">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="count" nameKey="mode"
                        cx="50%" cy="50%" outerRadius={80} innerRadius={48}
                        paddingAngle={2} startAngle={90} endAngle={-270} stroke="none">
                        {pieData.map((row, i) => (
                          <Cell key={i} fill={PIE_COLORS[row.mode] || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => [`${v} txns (${((v / total) * 100).toFixed(1)}%)`]}
                        contentStyle={{ borderRadius:'10px', fontSize:12, border:'1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-1">
                    {pieData.map((row, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[row.mode] || COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-gray-600 font-medium truncate">{row.mode}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800 flex-shrink-0">
                          {((row.count / total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()
          }
        </div>
      </div>

      {/* ── Daily trend ── */}
      {(analytics.daily_volume || []).length > 0 && (
        <div className="glass-card p-5 relative z-10">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Daily Transaction Volume
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.daily_volume}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius:'12px', fontSize:12 }} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5}
                fill="url(#areaGrad)" dot={false} activeDot={{ r:5, fill:'#2563eb' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent jobs ── */}
      <div className="glass-card p-5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-500" /> Recent Jobs
          </h3>
          <Link to="/history" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl card-gradient-blue flex items-center justify-center animate-float">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <p className="text-gray-500 font-medium">No jobs yet</p>
            <p className="text-gray-400 text-sm mb-4">Upload your first dataset to get started</p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> Upload Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['File','Date','Rows','Valid','Quality','Readiness','Status',''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((job: any) => (
                  <tr key={job.job_id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-800 max-w-[180px] truncate">{job.file_name}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{job.upload_date ? new Date(job.upload_date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-3 text-gray-700">{(job.rows_processed||0).toLocaleString()}</td>
                    <td className="py-3 px-3"><span className="badge-green">{(job.valid_rows||0).toLocaleString()}</span></td>
                    <td className="py-3 px-3"><QualityBadge score={job.quality_score} /></td>
                    <td className="py-3 px-3"><ReadinessBadge label={job.readiness_label} /></td>
                    <td className="py-3 px-3"><StatusBadge status={job.status} /></td>
                    <td className="py-3 px-3">
                      <Link to={`/results/${job.job_id}`} className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-0.5">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Animated counter hook ─── */
function useAnimatedCount(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const prevTarget = useRef<number>(0)
  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target
    const start = Date.now()
    const from = display
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return display
}

/* ─── Hero KPI card ─── */
function HeroCard({ label, value, icon, gradient, sub, badge }: {
  label: string; value: any; icon: React.ReactNode; gradient: string; sub: string; badge?: string
}) {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : (typeof value === 'number' ? value : 0)
  const animated = useAnimatedCount(isNaN(numericValue) ? 0 : numericValue)
  const displayValue = typeof value === 'string' && value.includes(',')
    ? animated.toLocaleString()
    : animated

  return (
    <div className={`${gradient} card-3d p-5 text-white`} style={{ transformStyle: 'preserve-3d' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-extrabold leading-none">{displayValue}</p>
        {badge && <span className="text-lg mb-0.5 opacity-80">{badge}</span>}
      </div>
      <p className="text-xs mt-2 opacity-60">{sub}</p>
      <div className="absolute bottom-0 left-4 right-4 h-px rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
    </div>
  )
}

/* ─── Score ring ─── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="score-ring" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-gray-900">{Math.round(score)}</span>
        <span className="text-xs text-gray-500 font-medium">/ 100</span>
      </div>
    </div>
  )
}

/* ─── Badges ─── */
function QualityBadge({ score }: { score: number }) {
  const c = score >= 80 ? 'badge-green' : score >= 60 ? 'badge-yellow' : 'badge-red'
  return <span className={c}>{Math.round(score)}/100</span>
}
function ReadinessBadge({ label }: { label: string }) {
  if (!label) return <span className="badge-gray">—</span>
  if (label.includes('Production')) return <span className="badge-green">{label}</span>
  if (label.includes('Minor'))      return <span className="badge-yellow">{label}</span>
  if (label.includes('Major'))      return <span className="badge" style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa'}}>{label}</span>
  return <span className="badge-red">{label}</span>
}
function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-green">Completed</span>
  if (status === 'failed')    return <span className="badge-red">Failed</span>
  return <span className="badge-blue animate-pulse">{status}</span>
}

/* ─── Empty chart placeholder ─── */
function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-300 flex-col gap-2">
      <BarChart2 className="w-8 h-8" />
      <p className="text-xs">No data yet — upload a dataset</p>
    </div>
  )
}
