import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

export function useOptimizationRuns() {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR(
    'optimization-runs',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: runs, error } = await supabase
        .from('optimization_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return runs
    },
    {
      revalidateOnFocus: false,
    }
  )

  const stats = data ? {
    totalRuns: data.length,
    totalSavings: data.reduce((acc: number, run: any) => acc + (run.estimated_savings || 0), 0),
    avgUtilization: data.length > 0
      ? data.reduce((acc: number, run: any) => acc + (run.optimization_rate || 0), 0) / data.length
      : 0,
    totalCo2: data.reduce((acc: number, run: any) => acc + ((run.estimated_savings || 0) * 0.1), 0), // Mock CO2 based on savings

  } : null

  return {
    runs: data,
    stats,
    isLoading,
    error,
    mutate
  }
}
