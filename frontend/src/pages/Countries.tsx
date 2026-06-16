import { useQuery } from '@tanstack/react-query'
import { getCountries } from '../api/client'
import { Globe, Phone, DollarSign, Calendar, Shield, Search, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'

const REGION_COLORS: Record<string, string> = {
  Asia:          'bg-blue-50 text-blue-700 border-blue-200',
  Europe:        'bg-purple-50 text-purple-700 border-purple-200',
  'North America': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'South America': 'bg-lime-50 text-lime-700 border-lime-200',
  Africa:        'bg-amber-50 text-amber-700 border-amber-200',
  'Middle East': 'bg-orange-50 text-orange-700 border-orange-200',
  Oceania:       'bg-cyan-50 text-cyan-700 border-cyan-200',
  Other:         'bg-gray-100 text-gray-600 border-gray-200',
}

const REGION_ICONS: Record<string, string> = {
  Asia: '🌏', Europe: '🌍', 'North America': '🌎', 'South America': '🌎',
  Africa: '🌍', 'Middle East': '🌏', Oceania: '🌏', Other: '🌐',
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-fade-in bg-mesh min-h-screen -m-6 p-6">
      <div className="skeleton h-10 w-64 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(12)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
      </div>
    </div>
  )
}

export default function Countries() {
  const { data, isLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
    staleTime: 5 * 60 * 1000,
  })

  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('All')

  const rules: any[] = data?.data?.rules || []

  const regions = useMemo(() => {
    const r = new Set(rules.map((c: any) => c.region))
    return ['All', ...Array.from(r).sort()]
  }, [rules])

  const filtered = useMemo(() => {
    return rules.filter((c: any) => {
      const matchSearch = c.country.toLowerCase().includes(search.toLowerCase())
      const matchRegion = regionFilter === 'All' || c.region === regionFilter
      return matchSearch && matchRegion
    })
  }, [rules, search, regionFilter])

  // Group by region
  const byRegion = useMemo(() => {
    const map: Record<string, any[]> = {}
    filtered.forEach((c: any) => {
      if (!map[c.region]) map[c.region] = []
      map[c.region].push(c)
    })
    return map
  }, [filtered])

  if (isLoading) return <Skeleton />

  const digitDist = [6,7,8,9,10,11,12].map(d => ({
    d, count: rules.filter((r: any) => r.phone_digits === d).length
  })).filter(x => x.count > 0)

  return (
    <div className="space-y-6 animate-fade-in bg-mesh min-h-screen -m-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold gradient-text">Country Phone Rules</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Configurable validation rules — {rules.length} countries supported across all regions
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-gradient-blue card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">Total Countries</p>
          <p className="text-3xl font-extrabold">{rules.length}</p>
          <p className="text-xs opacity-70 mt-1">Globally configured</p>
        </div>
        <div className="card-gradient-green card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">Regions Covered</p>
          <p className="text-3xl font-extrabold">{regions.length - 1}</p>
          <p className="text-xs opacity-70 mt-1">All major regions</p>
        </div>
        <div className="card-gradient-purple card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">Digit Range</p>
          <p className="text-3xl font-extrabold">
            {Math.min(...rules.map((r: any) => r.phone_digits))}–{Math.max(...rules.map((r: any) => r.phone_digits))}
          </p>
          <p className="text-xs opacity-70 mt-1">Phone digit lengths</p>
        </div>
        <div className="card-gradient-amber card-3d p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">Most Common</p>
          <p className="text-3xl font-extrabold">
            {digitDist.sort((a, b) => b.count - a.count)[0]?.d || 10} digits
          </p>
          <p className="text-xs opacity-70 mt-1">
            {digitDist.sort((a, b) => b.count - a.count)[0]?.count || 0} countries
          </p>
        </div>
      </div>

      {/* Phone digit distribution bar */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-500" />
          Phone Digit Length Distribution
        </h3>
        <div className="flex items-end gap-3 h-20">
          {digitDist.map(({ d, count }) => {
            const maxCount = Math.max(...digitDist.map(x => x.count))
            const pct = (count / maxCount) * 100
            return (
              <div key={d} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-bold text-gray-700">{count}</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-700"
                  style={{
                    height: `${Math.max(pct * 0.6, 8)}px`,
                    background: `linear-gradient(to top, #2563eb, #7c3aed)`
                  }}
                />
                <span className="text-xs text-gray-400">{d}d</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">d = digits required</p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {regions.map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                regionFilter === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {r !== 'All' && REGION_ICONS[r]} {r}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {rules.length} countries
        {regionFilter !== 'All' && ` in ${regionFilter}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Cards grouped by region */}
      {Object.keys(byRegion).sort().map(region => (
        <div key={region}>
          <h2 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
            <span>{REGION_ICONS[region]}</span>
            <span>{region}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400 font-normal">{byRegion[region].length} countries</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {byRegion[region].map((c: any) => (
              <CountryCard key={c.country} rule={c} />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No countries found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or filter</p>
        </div>
      )}

      {/* How it works */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          How Country-Specific Phone Validation Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-1">1. Country Detection</p>
            <p className="text-xs">The country field is read from each row and normalized (e.g. "USA" → "USA", "india" → "India") using 30+ country aliases.</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="font-semibold text-purple-700 mb-1">2. Rule Lookup</p>
            <p className="text-xs">The platform looks up the country's rule from this configurable table — phone digit count and country prefix (e.g. +91 for India).</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="font-semibold text-emerald-700 mb-1">3. Auto-Correction</p>
            <p className="text-xs">If a country code prefix is detected at the start of the number, it's stripped to produce the local format. Final length is checked against the rule.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CountryCard({ rule }: { rule: any }) {
  const regionCls = REGION_COLORS[rule.region] || REGION_COLORS.Other
  return (
    <div className="glass-card card-3d p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800 text-sm">{rule.country}</p>
          <span className={`badge mt-1 border text-xs ${regionCls}`}>{rule.region}</span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
          {REGION_ICONS[rule.region] || '🌐'}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-gray-500"><Phone className="w-3 h-3" /> Phone digits</span>
          <span className="font-bold text-gray-800 bg-blue-50 px-2 py-0.5 rounded-lg">{rule.phone_digits}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-gray-500"><Globe className="w-3 h-3" /> Country prefix</span>
          <span className="font-mono font-semibold text-purple-700">{rule.phone_prefix}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-gray-500"><DollarSign className="w-3 h-3" /> Currency</span>
          <span className="font-semibold text-gray-700">{rule.currency}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-gray-500"><Calendar className="w-3 h-3" /> Date format</span>
          <span className="font-mono text-gray-500 text-[10px]">{rule.date_format}</span>
        </div>
      </div>

      {rule.example_phone && rule.example_phone !== 'N/A' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">Example valid phone</p>
          <p className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{rule.example_phone}</p>
        </div>
      )}
    </div>
  )
}
