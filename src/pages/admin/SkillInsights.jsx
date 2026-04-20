import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Sparkles, Loader2, RefreshCw, BarChart2, Zap, BookOpen, Target } from 'lucide-react'
import { supabase } from '../../config/supabase'

const SOURCE_META = {
  deterministic: { label: 'Course-based', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ai_enrichment: { label: 'Work Experience', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  demand_side:   { label: 'Market Demand',  icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
}

const GAP_THRESHOLD = 50 // gap_ratio below this = "high demand, low supply"

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-400', bg = 'bg-indigo-500/10' }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-slate-300">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function GapBar({ demand, supply }) {
  const max = Math.max(demand, 1)
  const supplyPct = Math.min(100, Math.round((supply / max) * 100))
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `100%` }} />
      </div>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${supplyPct < 30 ? 'bg-red-500' : supplyPct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${supplyPct}%` }}
        />
      </div>
    </div>
  )
}

export default function SkillInsights() {
  const [insights, setInsights] = useState([])
  const [sourceStats, setSourceStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [insightRes, sourceRes] = await Promise.all([
        supabase.rpc('get_skill_gap_insights', { p_limit: 30 }),
        supabase.rpc('get_telemetry_source_stats'),
      ])
      if (insightRes.error) throw insightRes.error
      if (sourceRes.error) throw sourceRes.error
      setInsights(insightRes.data || [])
      setSourceStats(sourceRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load skill insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <p className="text-slate-300 font-semibold mb-1">Could not load insights</p>
        <p className="text-slate-500 text-sm mb-4 max-w-sm">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  const top10 = insights.slice(0, 10)
  const gapSkills = insights.filter(s => s.demand_count >= 2 && Number(s.gap_ratio) < GAP_THRESHOLD)
  const totalAccepted = sourceStats.reduce((sum, s) => sum + Number(s.total_accepted), 0)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Skill Insights
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Labor market intelligence for San Carlos City — demand vs. jobseeker supply.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={BarChart2}
          label="Skills tracked (demand)"
          value={insights.length}
          sub="from open job postings"
          color="text-indigo-400"
          bg="bg-indigo-500/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="Skill gaps detected"
          value={gapSkills.length}
          sub={`supply < ${GAP_THRESHOLD}% of demand`}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <StatCard
          icon={Target}
          label="Total skill acceptances"
          value={totalAccepted}
          sub="logged via telemetry"
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Hottest Skills ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Hottest Skills</h3>
            <span className="ml-auto text-xs text-slate-500">Top 10 by employer demand</span>
          </div>
          {top10.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No demand data yet. Ensure job postings have requirements and the materialized view is refreshed.</p>
          ) : (
            <ol className="space-y-2">
              {top10.map((s, i) => (
                <li key={s.skill_name} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-bold text-slate-600">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{s.skill_name}</span>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
                        <span className="text-indigo-400 font-semibold">{s.demand_count} jobs</span>
                        <span>{s.supply_count} accepted</span>
                      </div>
                    </div>
                    <GapBar demand={s.demand_count} supply={Number(s.supply_count)} />
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-indigo-500 inline-block" /> Demand</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" /> Supply</span>
          </div>
        </div>

        {/* ── Skill Gap Warnings ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Skill Gap Warnings</h3>
            <span className="ml-auto text-xs text-slate-500">High demand, low supply</span>
          </div>
          {gapSkills.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              {insights.length === 0
                ? 'No data yet — run the SQL migration and ensure job postings exist.'
                : 'No significant gaps detected. Supply is keeping up with demand.'}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {gapSkills.slice(0, 10).map(s => {
                const ratio = Number(s.gap_ratio)
                const severity = ratio < 20 ? 'text-red-400' : ratio < 40 ? 'text-amber-400' : 'text-yellow-400'
                const badge = ratio < 20 ? 'bg-red-500/15 text-red-400 border-red-500/25' : ratio < 40 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
                return (
                  <li key={s.skill_name} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${severity}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{s.skill_name}</p>
                      <p className="text-xs text-slate-500">{s.demand_count} jobs want it · {s.supply_count} jobseekers have it</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                      {ratio}%
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Telemetry Performance ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-violet-400" />
          <h3 className="text-base font-semibold text-white">Suggestion Effectiveness</h3>
          <span className="ml-auto text-xs text-slate-500">Which layer drives the most skill acceptances</span>
        </div>
        {sourceStats.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No telemetry recorded yet. Data will appear after jobseekers click skill suggestions during registration.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['deterministic', 'ai_enrichment', 'demand_side'].map(src => {
              const meta = SOURCE_META[src]
              const row = sourceStats.find(r => r.source === src)
              const count = row ? Number(row.total_accepted) : 0
              const pct = totalAccepted > 0 ? Math.round((count / totalAccepted) * 100) : 0
              return (
                <div key={src} className={`rounded-xl border ${meta.border} ${meta.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <meta.icon className={`w-4 h-4 ${meta.color}`} />
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{count.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">acceptances</p>
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${src === 'deterministic' ? 'bg-blue-500' : src === 'ai_enrichment' ? 'bg-violet-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{pct}% of total</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
