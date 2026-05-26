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
  const [ordersData, setOrdersData] = useState<any[]>([])

  useEffect(() => {
    async function fetchOrders() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('orders').select('fragility, baseline_cost, total_cost, savings, optimized_box, created_at').eq('user_id', user.id).limit(500)
        if (data) setOrdersData(data)
      }
    }
    fetchOrders()
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
              value={latestRun?.total_items || 0}
              icon={Package}
              trend={calculateTrend('total_items')}
              delay={0}
            />
            <KPICard
              title="Latest Run Savings"
              value={latestRun?.estimated_savings || 0}
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
              title="CO2 Reduction"
              value={Math.round((latestRun?.estimated_savings || 0) * 0.1)}
              unit="kg"
              icon={Leaf}
              trend={calculateTrend('estimated_savings')}
              delay={0.3}
            />
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
                <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tight">Carrier Distribution</h3>
                <Badge variant="blue">Latest Orders</Badge>
              </div>
              <div className="h-[350px]">
                <CarrierDistributionDonut data={ordersData} />
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
