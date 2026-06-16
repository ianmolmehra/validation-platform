import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar
} from 'recharts'
import {
  Globe, CreditCard, TrendingUp, AlertCircle, Activity, DollarSign,
  Sparkles, Target, ShieldCheck, Zap, ArrowUpRight, Info, BarChart2,
  CheckCircle2, XCircle
} from 'lucide-react'

const COLORS      = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0891b2','#65a30d','#ec4899']
const GRADIENT_PAIRS: [string,string][] = [
  ['#2563eb','#7c3aed'],['#10b981','#059669'],['#f59e0b','#d97706'],
  ['#8b5cf6','#6d28d9'],['#ef4444','#dc2626'],['#0891b2','#0e7490']
]

/* ─── Smart analytics insights ─── */
function buildInsights(analytics: any) {
  const items: { icon: string; type:'success'|'warning'|'danger'|'info'; title: string; body: string }[] = []

  const rate     = analytics.validation_success_rate || 0
  const errDist  = analytics.error_distribution || []
  const countries= analytics.top_countries || []
  const payModes = analytics.payment_mode_distribution || []
  const total    = analytics.total_transactions || 0
  const valid    = analytics.valid_transactions  || 0
  const invalid  = total - valid

  if (rate >= 90) items.push({ icon:'✅', type:'success', title:'Top-Tier Data Quality', body:`${rate.toFixed(1)}% validation pass rate — your data meets enterprise-grade standards.` })
  else if (rate >= 70) items.push({ icon:'⚠️', type:'warning', title:'Moderate Quality', body:`${rate.toFixed(1)}% pass rate. ${invalid.toLocaleString()} records need remediation.` })
  else if (total > 0)  items.push({ icon:'🚨', type:'danger',  title:'Critical Quality Alert', body:`Only ${rate.toFixed(1)}% pass. Immediate upstream data quality intervention required.` })

  if (errDist.length > 0) {
    const top = errDist[0]
    const pct  = total ? ((top.count/total)*100).toFixed(1) : '0'
    items.push({ icon:'🔍', type:'info', title:`Dominant Error: ${top.error_type}`, body:`Affects ${top.count} records (${pct}% of total). Fixing this single error type would have the highest impact.` })
  }

  if (countries.length >= 2) {
    const totalRev = countries.reduce((a:number,c:any)=>a+(c.revenue||0),0)
    const topShare  = totalRev ? ((countries[0].revenue||0)/totalRev*100).toFixed(0) : '0'
    items.push({ icon:'🌍', type:'info', title:`${countries[0].country} Dominates Revenue`, body:`${topShare}% of total revenue — consider distributing data collection efforts across more regions.` })
  }

  if (payModes.length > 0) {
    const topMode = payModes.reduce((a:any,b:any)=>a.count>b.count?a:b)
    const modeTotal = payModes.reduce((a:number,c:any)=>a+c.count,0)
    const modePct   = modeTotal ? ((topMode.count/modeTotal)*100).toFixed(0) : '0'
    items.push({ icon:'💳', type:'info', title:`${topMode.mode} is Most Used`, body:`${modePct}% of transactions use ${topMode.mode}. Ensure your validation rules cover all edge cases for this mode.` })
  }

  if (valid > 0 && invalid > 0) {
    const ratio = (valid/invalid).toFixed(1)
    items.push({ icon: parseFloat(ratio) >= 4 ? '✅' : '⚠️', type: parseFloat(ratio) >= 4 ? 'success' : 'warning',
      title:`Valid-to-Error Ratio: ${ratio}:1`,
      body:`For every error record there are ${ratio} valid records. ${parseFloat(ratio)>=4?'Healthy ratio.':'Below the recommended 9:1 threshold — investigate error sources.'}`
    })
  }

  return items
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-page'],
    queryFn:  () => getAnalytics(),
    refetchInterval: 60000,
  })

  const analytics   = data?.data || {}
  if (isLoading) return <Skeleton />

  const totalRevenue = (analytics.top_countries || []).reduce((a:number,c:any)=>a+(c.revenue||0),0)
  const insights     = buildInsights(analytics)
  const total        = analytics.total_transactions  || 0
  const valid        = analytics.valid_transactions  || 0
  const invalid      = total - valid
  const rate         = analytics.validation_success_rate || 0

  /* Radar data — quality dimensions */
  const radarData = [
    { subject:'Completeness', value: Math.min(100, rate + 5) },
    { subject:'Accuracy',     value: rate },
    { subject:'Validity',     value: Math.min(100, rate - 3) },
    { subject:'Consistency',  value: Math.min(100, rate + 2) },
    { subject:'Uniqueness',   value: valid && total ? ((valid/total)*100) : 0 },
  ]

  /* Radial bar — top countries */
  const radialData = (analytics.top_countries||[]).slice(0,5).map((c:any,i:number)=>({
    name: c.country,
    value: c.revenue,
    fill: COLORS[i % COLORS.length]
  }))

  return (
    <div className="space-y-6 animate-fade-in bg-mesh min-h-screen -m-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold gradient-text">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Deep intelligence across all processed datasets</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Transactions', value:(total).toLocaleString(),           icon:<Activity className="w-5 h-5"/>,     grad:'card-gradient-blue'   },
          { label:'Total Revenue',      value:`$${totalRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}`, icon:<DollarSign className="w-5 h-5"/>, grad:'card-gradient-green'  },
          { label:'Success Rate',       value:`${rate.toFixed(1)}%`,              icon:<TrendingUp className="w-5 h-5"/>,   grad:'card-gradient-purple' },
          { label:'Error Types',        value:(analytics.error_distribution||[]).length, icon:<AlertCircle className="w-5 h-5"/>, grad:'card-gradient-red' },
        ].map((k,i) => (
          <div key={i} className={`${k.grad} card-3d p-5 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{k.label}</p>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">{k.icon}</div>
            </div>
            <p className="text-3xl font-extrabold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Valid vs Invalid overview */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Big score circle */}
          <div className="glass-card p-6 flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> Validation Score
            </p>
            <BigScoreRing score={rate} />
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-lg">{valid.toLocaleString()}</div>
                <p className="text-xs text-gray-400">Valid Records</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-lg">{invalid.toLocaleString()}</div>
                <p className="text-xs text-gray-400">Invalid Records</p>
              </div>
            </div>
          </div>

          {/* Radar chart — quality dimensions */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Quality Dimensions
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:'#64748b' }} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9 }} />
                <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" /> AI Insights
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-56">
              {insights.map((ins,i) => (
                <div key={i} className={`insight-${ins.type} flex gap-2 text-xs`}>
                  <span>{ins.icon}</span>
                  <div>
                    <p className="font-semibold">{ins.title}</p>
                    <p className="opacity-75 mt-0.5">{ins.body}</p>
                  </div>
                </div>
              ))}
              {insights.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Revenue by country + payment donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" /> Revenue by Country (Top 10)
          </h3>
          <p className="text-xs text-gray-400 mb-4">Total revenue across all uploads, segmented by country</p>
          {(analytics.top_countries||[]).length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.top_countries} barSize={30}>
                <defs>
                  {(analytics.top_countries||[]).map((_:any,i:number)=>(
                    <linearGradient key={i} id={`cg${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={GRADIENT_PAIRS[i%GRADIENT_PAIRS.length][0]} />
                      <stop offset="100%" stopColor={GRADIENT_PAIRS[i%GRADIENT_PAIRS.length][1]} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="country" tick={{ fontSize:11, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:12, boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}
                  formatter={(v:number)=>[`$${v.toLocaleString()}`,'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6,6,0,0]}>
                  {(analytics.top_countries||[]).map((_:any,i:number)=>(
                    <Cell key={i} fill={`url(#cg${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" /> Payment Mode Split
          </h3>
          <p className="text-xs text-gray-400 mb-3">Transaction count per payment method</p>
          {(analytics.payment_mode_distribution||[]).length === 0 ? <EmptyChart /> : (() => {
            // Normalise raw modes into canonical buckets
            const CANONICAL: Record<string,string> = {
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
            const PIE_COLORS: Record<string,string> = {
              Card:'#2563eb', Cash:'#10b981', UPI:'#f59e0b',
              Wallet:'#8b5cf6', 'Net Banking':'#0891b2', Other:'#94a3b8',
            }
            const buckets: Record<string,number> = {}
            for (const row of (analytics.payment_mode_distribution||[])) {
              const raw = (row.mode||'').toLowerCase().trim()
              const key = CANONICAL[raw] || 'Other'
              buckets[key] = (buckets[key]||0) + (row.count||0)
            }
            const pieData = Object.entries(buckets)
              .filter(([,v])=>v>0)
              .sort((a,b)=>b[1]-a[1])
              .map(([mode,count])=>({ mode, count }))
            const total = pieData.reduce((s,r)=>s+r.count,0)
            return (
              <div className="flex flex-col">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="mode"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={48}
                      paddingAngle={2} startAngle={90} endAngle={-270}
                      stroke="none">
                      {pieData.map((row,i)=>(
                        <Cell key={i} fill={PIE_COLORS[row.mode]||COLORS[i%COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v:any, name:any)=>[`${v} txns (${((v/total)*100).toFixed(1)}%)`, name]}
                      contentStyle={{ borderRadius:'10px', fontSize:12, border:'1px solid #e5e7eb', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-1">
                  {pieData.map((row,i)=>(
                    <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{background: PIE_COLORS[row.mode]||COLORS[i%COLORS.length]}} />
                        <span className="text-xs text-gray-600 font-medium truncate">{row.mode}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800 flex-shrink-0">
                        {((row.count/total)*100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Daily volume + error distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(analytics.daily_volume||[]).length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Daily Transaction Volume
            </h3>
            <p className="text-xs text-gray-400 mb-4">Number of transactions processed per day</p>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={analytics.daily_volume}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius:'12px', fontSize:12 }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5}
                  fill="url(#volGrad)" dot={false} activeDot={{ r:5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {(analytics.error_distribution||[]).length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Error Type Distribution
            </h3>
            <p className="text-xs text-gray-400 mb-4">Which validation rules are failing most — fix these first</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={analytics.error_distribution} layout="vertical" barSize={14}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis type="category" dataKey="error_type" width={145} tick={{ fontSize:10, fill:'#64748b' }} />
                <Tooltip contentStyle={{ borderRadius:'12px', fontSize:12 }} />
                <Bar dataKey="count" fill="url(#errGrad)" radius={[0,5,5,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Revenue by payment mode + payment status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenue by Payment Mode</h3>
          <p className="text-xs text-gray-400 mb-4">Which payment channels drive the most value</p>
          {(analytics.revenue_by_payment_mode||[]).length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={analytics.revenue_by_payment_mode} barSize={30}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mode" tick={{ fontSize:11, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                <Tooltip formatter={(v:number)=>[`$${v.toLocaleString()}`,'Revenue']}
                  contentStyle={{ borderRadius:'12px', fontSize:12 }} />
                <Bar dataKey="revenue" fill="url(#revGrad)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Payment Status Breakdown</h3>
          <p className="text-xs text-gray-400 mb-4">Paid vs Pending vs Failed transaction split</p>
          {(analytics.payment_status_breakdown||[]).length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={analytics.payment_status_breakdown} dataKey="count" nameKey="status"
                  cx="50%" cy="45%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                  {(analytics.payment_status_breakdown||[]).map((_:any,i:number)=>(
                    <Cell key={i} fill={COLORS[i%COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius:'12px', fontSize:12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Country error table */}
      {(analytics.country_error_distribution||[]).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-400" /> Country Error Distribution
          </h3>
          <p className="text-xs text-gray-400 mb-4">Which countries contribute most validation errors — may indicate data source issues</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Country</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Errors</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Share</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Risk</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalErr = analytics.country_error_distribution.reduce((a:number,c:any)=>a+c.error_count,0)
                  return analytics.country_error_distribution.map((r:any) => {
                    const pct = totalErr ? (r.error_count/totalErr*100) : 0
                    const risk = pct > 30 ? 'High' : pct > 15 ? 'Medium' : 'Low'
                    const riskCls = risk==='High' ? 'badge-red' : risk==='Medium' ? 'badge-yellow' : 'badge-green'
                    return (
                      <tr key={r.country} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-gray-800">{r.country||'—'}</td>
                        <td className="py-2.5 px-3"><span className="badge-red">{r.error_count}</span></td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="progress-bar w-28">
                              <div className="progress-fill bg-gradient-to-r from-red-400 to-orange-400"
                                style={{ width:`${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3"><span className={riskCls}>{risk}</span></td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Big score ring ─── */
function BigScoreRing({ score }: { score: number }) {
  const size = 160; const r = (size-20)/2
  const circ = 2*Math.PI*r
  const offset = circ - (score/100)*circ
  const color = score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444'
  return (
    <div className="relative" style={{ width:size, height:size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={12} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="score-ring" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-gray-900">{Math.round(score)}</span>
        <span className="text-xs text-gray-400 font-medium">/ 100</span>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-300 flex-col gap-2">
      <BarChart2 className="w-8 h-8" />
      <p className="text-xs">No data yet — upload a dataset</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-72 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton h-56 rounded-2xl" />
        <div className="skeleton h-56 rounded-2xl" />
      </div>
    </div>
  )
}
