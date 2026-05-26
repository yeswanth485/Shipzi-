'use client'

import { useState } from 'react'
import { useOptimizationRuns } from '@/lib/hooks/useOptimizationRuns'
import OrdersTable from '@/components/orders/OrdersTable'
import Link from 'next/link'
import { Plus, Package, ChevronDown, ChevronUp, Calendar, Box, TrendingUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'

export default function OrdersPage() {
  const { runs, isLoading } = useOptimizationRuns()
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<any[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const supabase = createClient()

  const toggleRun = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null)
      return
    }

    setExpandedRun(runId)
    setLoadingResults(true)
    try {
      const { data, error } = await supabase
        .from('optimization_results')
        .select('*')
        .eq('session_id', runId)
      
      if (error) throw error
      setRunResults(data || [])
    } catch (err) {
      console.error('Error fetching results:', err)
      setRunResults([])
    } finally {
      setLoadingResults(false)
    }
  }

  return (
    <div className="p-8 pb-24 space-y-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-space-grotesk text-white">Results & History</h1>
          <p className="text-zinc-500 font-medium">Review your past optimization sessions and per-SKU results.</p>
        </div>

        <Link
          href="/dashboard/optimize"
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Optimize New Batch
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : !runs || runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white/[0.02] border border-white/5 rounded-[40px] border-dashed">
          <div className="w-24 h-24 bg-blue-500/10 rounded-[32px] flex items-center justify-center">
            <Package className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold font-space-grotesk text-white">No optimization runs</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              Your historical sessions will appear here once you run the optimization engine.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run: any) => (
            <div key={run.id} className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden transition-all hover:border-white/20">
              <div 
                className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => toggleRun(run.id)}
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{run.file_name}</h3>
                    <p className="text-sm text-zinc-500">{new Date(run.created_at || run.completed_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                   <div className="flex items-center gap-2">
                     <Box className="w-4 h-4 text-zinc-500" />
                     <span className="text-white font-bold">{run.total_processed || 0} SKUs</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <TrendingUp className="w-4 h-4 text-emerald-500" />
                     <span className="text-emerald-400 font-bold">₹{(run.estimated_savings || 0).toLocaleString()} Saved</span>
                   </div>
                   <Badge variant="blue">{run.optimization_rate ? run.optimization_rate.toFixed(0) : 0}% optimized</Badge>
                  
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ml-4">
                    {expandedRun === run.id ? (
                      <ChevronUp className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedRun === run.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10 bg-[#0A0A0F]"
                  >
                    <div className="p-6">
                      {loadingResults ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                      ) : (
                        <OrdersTable data={runResults} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
