import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { userId, fileName, products, mlResult } = body

    if (!userId || !mlResult || !mlResult.results) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const results = mlResult.results || []
    const totalItems = mlResult.total_processed || results.length
    const optimizedItems = mlResult.total_optimized || results.filter((r: any) => r.is_optimized !== false).length
    const unoptimizedItems = totalItems - optimizedItems
    const estimatedSavings = mlResult.total_savings || results.reduce((acc: number, r: any) => acc + (r.savings_amount || 0), 0)
    const optimizationRate = totalItems > 0 ? (optimizedItems / totalItems) * 100 : 0

    // 1. Insert optimization session
    const { data: session, error: sessionErr } = await supabase
      .from('optimization_sessions')
      .insert({
        user_id: userId,
        file_name: fileName || 'upload.csv',
        total_items: totalItems,
        optimized_items: optimizedItems,
        unoptimized_items: unoptimizedItems,
        estimated_savings: estimatedSavings,
        optimization_rate: optimizationRate,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (sessionErr) {
      console.error('[save] Session insert error:', sessionErr.message)
      return NextResponse.json({ error: 'Session insert failed', details: sessionErr.message }, { status: 500 })
    }

    const sessionId = session?.id
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID returned' }, { status: 500 })
    }

    // 2. Insert optimization_results in chunks of 50
    for (let i = 0; i < results.length; i += 50) {
      const chunk = results.slice(i, i + 50)

      const resultRows = chunk.map((r: any) => ({
        session_id: sessionId,
        user_id: userId,
        sku: r.sku || 'UNKNOWN',
        product_name: r.product_name || '',
        is_optimized: r.is_optimized !== false,
        failure_reason: r.is_optimized === false ? (r.reasoning || 'No suitable box') : null,
        recommendation_reason: r.reasoning || 'Optimal fit',
        fragility_level: r.fragility || 'LOW',
        fragility_score: r.fragility_score || 2,
        // Product dimensions
        length_cm: r.length_cm || 0,
        width_cm: r.width_cm || 0,
        height_cm: r.height_cm || 0,
        weight_kg: r.weight_kg || 0.5,
        // Old box
        old_box_name: r.old_box_name || null,
        old_box_dims: r.old_box_dims || null,
        old_box_cost: r.old_box_cost || 0,
        // New box
        new_box_name: r.new_box_name || r.recommended_box_name || null,
        new_box_dims: r.recommended_box_dims || null,
        new_box_length_cm: r.new_box_length_cm || 0,
        new_box_width_cm: r.new_box_width_cm || 0,
        new_box_height_cm: r.new_box_height_cm || 0,
        new_box_cost: r.new_box_cost || 0,
        // Metrics
        savings_amount: r.savings_amount || 0,
        savings_pct: r.savings_pct || 0,
        volume_utilization: r.volume_utilization || 0,
        void_percentage: r.void_percentage || 0,
        created_at: new Date().toISOString()
      }))

      const { error: resultErr } = await supabase
        .from('optimization_results')
        .insert(resultRows)

      if (resultErr) {
        console.error(`[save] Results chunk ${i} error:`, resultErr.message)
        // Don't fail entirely - continue with other chunks
      }
    }

    return NextResponse.json({ success: true, session_id: sessionId })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/optimize/save] Unhandled error:', msg)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}
