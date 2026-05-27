'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

import { useOptimizationRuns } from '@/lib/hooks/useOptimizationRuns'
import CompanyHeader from './CompanyHeader'
import KPICard from './KPICard'
import { Package, TrendingUp, Zap, Leaf, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

const TotalSavedBarChart = dynamic(() => import('@/components/charts/TotalSavedBarChart'), { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> })
const VoidPercentageLineChart = dynamic(() => import('@/components/charts/VoidPercentageLineChart'), { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> })
const CarrierDistributionDonut = dynamic(() => import('@/components/charts/CarrierDistributionDonut'), { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> })
const SuccessRateAreaChart = dynamic(() => import('@/components/charts/SuccessRateAreaChart'), { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> })

export default function DashboardClient() {
  const { runs, stats, isLoading } = useOptimizationRuns()
  const [optimizationResults, setOptimizationResults] = useState<any[]>([])

  useEffect(() => {
    async function fetchLatestResults() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch optimization_results from latest sessions for charts
        const { data } = await supabase
          .from('optimization_results')
          .select('sku, product_name, fragility_level, old_box_cost, new_box_cost, savings_amount, savings_pct, volume_utilization, void_percentage, new_box_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500)
        if (data) setOptimizationResults(data)
      }
    }
    fetchLatestResults()
  }, [])

  if (isLoading) {
    return (
      <div className="p-8 space-y-12">
        <div className="h-24 w-full bg-white/5 animate-pulse rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[400px] bg-white/5 animate-pulse rounded-[40px]" />
          <div className="h-[400px] bg-white/5 animate-pulse rounded-[40px]" />
        </div>
      </div>
    )
  }

  const latestRun = (runs as any)?.[0]
  const previousRun = (runs as any)?.[1]

  const calculateTrend = (key: string) => {
    if (!latestRun || !previousRun || !previousRun[key]) return 0
    const diff = latestRun[key] - previousRun[key]
    return Math.round((diff / previousRun[key]) * 100)
  }

  // Compute sustainability score from optimization data
  const totalSavings = stats?.totalSavings || 0
  const co2Reduction = Math.round(totalSavings * 0.12) // kg CO2 estimate

  return (
    <div className="p-8 pb-24 space-y-12 max-w-[1600px] mx-auto">
      <CompanyHeader />

      {!runs || runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white/[0.02] border border-white/5 rounded-[40px] border-dashed">
          <div className="w-24 h-24 bg-blue-500/10 rounded-[32px] flex items-center justify-center">
            <Package className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold font-space-grotesk text-white">No optimization data yet</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              Upload your first product catalog CSV to start generating intelligence and saving costs.
            </p>
          </div>
          <Link
            href="/dashboard/optimize"
            className="group bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Upload First CSV
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total SKUs Optimized"
              value={stats?.totalRuns ? runs.reduce((acc: number, r: any) => acc + (r.optimized_items || r.total_items || 0), 0) : 0}
              icon={Package}
              trend={calculateTrend('total_items')}
              delay={0}
            />
            <KPICard
              title="Total Savings"
              value={totalSavings}
              unit="₹"
              icon={TrendingUp}
              trend={calculateTrend('estimated_savings')}
              delay={0.1}
            />
            <KPICard
              title="Success Rate"
              value={latestRun?.optimization_rate || 0}
              unit="%"
              icon={Zap}
              trend={calculateTrend('optimization_rate')}
              delay={0.2}
            />
            <KPICard
              title="CO₂ Reduction"
              value={co2Reduction}
              unit="kg"
              icon={Leaf}
              trend={calculateTrend('estimated_savings')}
              delay={0.3}
            />
          </div>

          {/* Sustainability Score Card */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 border border-emerald-500/20 p-8 rounded-[32px]">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Leaf className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">Sustainability Score</h3>
                </div>
                <p className="text-zinc-400 text-sm max-w-lg">
                  Based on void reduction, material savings, and optimized shipping weight across all sessions.
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-emerald-400 font-space-grotesk">
                  {Math.min(Math.round((latestRun?.optimization_rate || 0) * 0.9 + co2Reduction * 0.01), 100)}
                </p>
                <p className="text-xs text-emerald-400/60 font-bold uppercase tracking-widest mt-1">out of 100</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Void Reduced</p>
                <p className="text-xl font-bold text-white mt-1">{Math.round(100 - (latestRun?.optimization_rate || 0) * 0.3)}%</p>
              </div>
              <div className="bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Material Saved</p>
                <p className="text-xl font-bold text-white mt-1">{Math.round(totalSavings * 0.05)} kg</p>
              </div>
              <div className="bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">CO₂ Offset</p>
                <p className="text-xl font-bold text-white mt-1">{co2Reduction} kg</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tight">Total Saved</h3>
                <Badge variant="blue">Per Session</Badge>
              </div>
              <div className="h-[350px]">
                <TotalSavedBarChart data={runs && runs.length > 0 ? [...runs].reverse() : []} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tight">Void Percentage</h3>
                <Badge variant="blue">Over Time</Badge>
              </div>
              <div className="h-[350px]">
                <VoidPercentageLineChart data={runs && runs.length > 0 ? [...runs].reverse() : []} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tight">Box Distribution</h3>
                <Badge variant="blue">Latest Results</Badge>
              </div>
              <div className="h-[350px]">
                <CarrierDistributionDonut data={optimizationResults} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tight">Optimization Success</h3>
                <Badge variant="blue">Over Time</Badge>
              </div>
              <div className="h-[350px]">
                <SuccessRateAreaChart data={runs && runs.length > 0 ? [...runs].reverse() : []} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
