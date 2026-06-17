import { useQuery } from '@tanstack/react-query'
import { getCountries } from '../api/client'
import {
  Globe, Phone, DollarSign, Search, Filter,
  Shield, ChevronUp, ChevronDown, ChevronsUpDown,
  LayoutGrid, List,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'

const REGION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Asia:            { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400' },
  Europe:          { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-400' },
  'North America': { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400' },
  'South America': { bg: 'bg-lime-50',    text: 'text-lime-700',   dot: 'bg-lime-500' },
  Africa:          { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400' },
  'Middle East':   { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
  Oceania:         { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-400' },
  Other:           { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}

const REGION_ICONS: Record<string, string> = {
  Asia: '🌏', Europe: '🌍', 'North America': '🌎', 'South America': '🌎',
  Africa: '🌍', 'Middle East': '🌏', Oceania: '🌏', Other: '🌐',
}

const REGION_GRADIENT: Record<string, string> = {
  Asia:            'from-blue-500 to-blue-700',
  Europe:          'from-purple-500 to-purple-700',
  'North America': 'from-emerald-500 to-emerald-700',
  'South America': 'from-lime-500 to-lime-700',
  Africa:          'from-amber-500 to-amber-700',
  'Middle East':   'from-orange-500 to-orange-700',
  Oceania:         'from-cyan-500 to-cyan-700',
  Other:           'from-gray-400 to-gray-600',
}

type SortKey = 'country' | 'region' | 'phone_digits' | 'currency'
type SortDir = 'asc' | 'desc'

function AnimatedBarChart({ digitDist }: { digitDist: { d: number; count: number }[] }) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMounted(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const maxCount = Math.max(...digitDist.map(x => x.count))
  return (
    <div ref={ref} className="flex items-end gap-2 h-20">
      {digitDist.map(({ d, count }) => {
        const pct = (count / maxCount) * 100
        return (
          <div key={d} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs font-bold text-gray-700">{count}</span>
            <div className="w-full rounded-t-md overflow-hidden bg-gray-100" style={{ height: `${Math.max(pct * 0.55, 6)}px` }}>
              <div
                className="w-full h-full rounded-t-md"
                style={{
                  background: 'linear-gradient(to top, #2563eb, #7c3aed)',
                  transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
                  transformOrigin: 'bottom',
                  transition: `transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${d * 40}ms`,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{d}d</span>
          </div>
        )
      })}
    </div>
  )
}

function RegionBadge({ region }: { region: string }) {
  const cls = REGION_COLORS[region] || REGION_COLORS.Other
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls.bg} ${cls.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} />
      {region}
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-500" />
    : <ChevronDown className="w-3 h-3 text-blue-500" />
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-fade-in bg-mesh min-h-screen -m-6 p-6">
      <div className="skeleton h-10 w-64 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )
}

export default function Countries() {
  const { data, isLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
    staleTime: 5 * 60 * 1000,
  })

  const [search, setSearch]       = useState('')
  const [regionFilter, setRegionFilter] = useState('All')
  const [view, setView]           = useState<'table' | 'grid'>('table')
  const [sortKey, setSortKey]     = useState<SortKey>('country')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  const rules: any[] = data?.data?.rules || []

  const regions = useMemo(() => {
    const r = new Set(rules.map((c: any) => c.region))
    return ['All', ...Array.from(r).sort()]
  }, [rules])

  const filtered = useMemo(() => {
    let list = rules.filter((c: any) => {
      const matchSearch = c.country.toLowerCase().includes(search.toLowerCase()) ||
        c.currency.toLowerCase().includes(search.toLowerCase()) ||
        c.phone_prefix?.includes(search)
      const matchRegion = regionFilter === 'All' || c.region === regionFilter
      return matchSearch && matchRegion
    })
    list = [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rules, search, regionFilter, sortKey, sortDir])

  const digitDist = useMemo(() => (
    [6,7,8,9,10,11,12].map(d => ({
      d, count: rules.filter((r: any) => r.phone_digits === d).length
    })).filter(x => x.count > 0)
  ), [rules])

  if (isLoading) return <Skeleton />

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const topDigit = [...digitDist].sort((a, b) => b.count - a.count)[0]

  return (
    <div className="space-y-5 animate-fade-in bg-mesh min-h-screen -m-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text">Country Phone Rules</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {rules.length} countries · {regions.length - 1} regions · phone validation rules
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Table
          </button>
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-gradient-blue card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Total Countries</p>
          <p className="text-3xl font-extrabold">{rules.length}</p>
          <p className="text-xs opacity-70 mt-1">Globally configured</p>
        </div>
        <div className="card-gradient-green card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Regions Covered</p>
          <p className="text-3xl font-extrabold">{regions.length - 1}</p>
          <p className="text-xs opacity-70 mt-1">All major regions</p>
        </div>
        <div className="card-gradient-purple card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Digit Range</p>
          <p className="text-3xl font-extrabold">
            {Math.min(...rules.map((r: any) => r.phone_digits))}–{Math.max(...rules.map((r: any) => r.phone_digits))}
          </p>
          <p className="text-xs opacity-70 mt-1">Phone digit lengths</p>
        </div>
        <div className="card-gradient-amber card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Most Common</p>
          <p className="text-3xl font-extrabold">{topDigit?.d || 10} digits</p>
          <p className="text-xs opacity-70 mt-1">{topDigit?.count || 0} countries</p>
        </div>
      </div>

      {/* Chart + How it works side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-blue-500" /> Phone Digit Distribution
          </h3>
          <AnimatedBarChart digitDist={digitDist} />
          <p className="text-[10px] text-gray-400 mt-2">d = digits required</p>
        </div>
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-500" /> How Validation Works
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Country Detection', body: 'Country field is read and normalized — "india" → "India" using 30+ aliases.', color: 'blue' },
              { step: '2', title: 'Rule Lookup',       body: 'Platform looks up expected digit count and prefix (e.g. +91 for India) from this table.', color: 'purple' },
              { step: '3', title: 'Auto-Correction',   body: 'Country code prefixes are stripped. Final length is validated against the rule.', color: 'emerald' },
            ].map(({ step, title, body, color }) => (
              <div key={step} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
                <div className={`w-6 h-6 rounded-full bg-${color}-100 text-${color}-700 text-xs font-bold flex items-center justify-center mb-2`}>{step}</div>
                <p className={`text-xs font-semibold text-${color}-700 mb-1`}>{title}</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search country, currency or prefix…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {regions.map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                regionFilter === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
              }`}
            >
              {r !== 'All' && <span className="mr-0.5">{REGION_ICONS[r]}</span>}{r}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-1">
        {filtered.length} of {rules.length} countries
        {regionFilter !== 'All' && ` in ${regionFilter}`}
        {search && ` · "${search}"`}
      </p>

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {([
                    { key: 'country',      label: 'Country',      icon: <Globe className="w-3 h-3" /> },
                    { key: 'region',       label: 'Region',       icon: null },
                    { key: 'phone_digits', label: 'Phone Digits', icon: <Phone className="w-3 h-3" /> },
                    { key: null,           label: 'Prefix',       icon: null },
                    { key: 'currency',     label: 'Currency',     icon: <DollarSign className="w-3 h-3" /> },
                    { key: null,           label: 'Example Phone',icon: null },
                  ] as { key: SortKey | null; label: string; icon: any }[]).map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap select-none ${col.key ? 'cursor-pointer hover:text-gray-700' : ''}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {col.icon}
                        {col.label}
                        {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c: any, i: number) => (
                  <tr key={c.country} className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-gradient-to-br ${REGION_GRADIENT[c.region] || 'from-gray-400 to-gray-600'} text-white font-bold flex-shrink-0`}>
                          {c.country[0]}
                        </div>
                        <span className="font-semibold text-gray-800 text-sm">{c.country}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RegionBadge region={c.region} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-gray-100 flex-1 max-w-[60px]">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                            style={{ width: `${((c.phone_digits - 7) / 5) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-800 tabular-nums w-6">{c.phone_digits}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-purple-700 font-semibold text-xs bg-purple-50 px-2 py-1 rounded-lg">{c.phone_prefix}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-700 text-xs bg-gray-100 px-2 py-1 rounded-lg">{c.currency}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.example_phone && c.example_phone !== 'N/A'
                        ? <span className="font-mono text-emerald-700 text-xs bg-emerald-50 px-2 py-1 rounded-lg">{c.example_phone}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Globe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No countries match your filters</p>
            </div>
          )}

          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filtered.length} countries shown</p>
            <p className="text-xs text-gray-400">Click column headers to sort</p>
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === 'grid' && (
        <>
          {Object.keys(
            filtered.reduce((acc: any, c: any) => { acc[c.region] = true; return acc }, {})
          ).sort().map(region => (
            <div key={region}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>{REGION_ICONS[region]}</span>
                <span>{region}</span>
                <span className="text-gray-300">·</span>
                <span className="font-normal text-gray-400">{filtered.filter((c: any) => c.region === region).length} countries</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
                {filtered.filter((c: any) => c.region === region).map((c: any) => (
                  <CountryCard key={c.country} rule={c} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No countries found</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CountryCard({ rule }: { rule: any }) {
  const cls = REGION_COLORS[rule.region] || REGION_COLORS.Other
  const grad = REGION_GRADIENT[rule.region] || 'from-gray-400 to-gray-600'
  return (
    <div className="glass-card card-3d p-4 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">{rule.country}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls.bg} ${cls.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} />
            {rule.region}
          </span>
        </div>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ml-2`}>
          {rule.country[0]}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Digits</span>
          <span className="font-bold text-gray-800 text-xs bg-blue-50 px-1.5 py-0.5 rounded-md">{rule.phone_digits}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Prefix</span>
          <span className="font-mono font-semibold text-purple-700 text-xs">{rule.phone_prefix}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" /> Currency</span>
          <span className="font-semibold text-gray-700 text-xs">{rule.currency}</span>
        </div>
      </div>

      {rule.example_phone && rule.example_phone !== 'N/A' && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <p className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg text-center">{rule.example_phone}</p>
        </div>
      )}
    </div>
  )
}
