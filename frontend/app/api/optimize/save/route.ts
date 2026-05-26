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

    // Create fragility map
    const fragilityMap: Record<string, { fragility: string; fragility_score: number }> = {}
    for (const product of (products || [])) {
      if (product.sku) {
        const fragility = (product.fragility || 'LOW').toUpperCase()
        let score = 1
        if (fragility === 'CRITICAL') score = 9
        else if (fragility === 'HIGH') score = 7
        else if (fragility === 'MEDIUM') score = 5
        fragilityMap[product.sku] = { fragility, fragility_score: score }
      }
    }

    // 1. Insert session
    const { data: session, error: sessionErr } = await supabase
      .from('optimization_sessions')
      .insert({
        user_id: userId,
        file_name: fileName || 'upload.csv',
        total_processed: mlResult.total_processed || mlResult.results.length,
        total_optimized: mlResult.total_optimized || mlResult.results.filter((r:any) => r.recommended_box_name !== 'No box found').length,
        total_not_optimized: (mlResult.total_processed || mlResult.results.length) - (mlResult.total_optimized || mlResult.results.filter((r:any) => r.recommended_box_name !== 'No box found').length),
        total_savings: mlResult.total_savings || mlResult.results.reduce((acc: number, r:any) => acc + (r.savings_per_unit || 0), 0),
        success_rate: mlResult.total_processed > 0 ? (mlResult.total_optimized / mlResult.total_processed) * 100 : 0,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    const sessionId = session?.id ?? null
    if (sessionErr) {
      console.error('[optimize-save] session insert error:', sessionErr.message)
      return NextResponse.json({ error: 'Session insert failed' }, { status: 500 })
    }

    // 2. Insert optimization_results in chunks
    const allResultsToInsert = mlResult.results.map((r: any) => {
      const fragilityData = fragilityMap[r.sku] || { fragility: 'LOW', fragility_score: 1 }
      return {
        session_id: sessionId,
        user_id: userId,
        sku: r.sku,
        product_name: r.product_name,
        is_optimized: r.recommended_box_name !== 'No box found',
        failure_reason: r.recommended_box_name !== 'No box found' ? null : 'No suitable box found',
        recommendation_reason: r.recommended_box_name !== 'No box found' ? 'Optimal fit and price' : 'Consider custom packaging',
        fragility_level: fragilityData.fragility,
        fragility_score: fragilityData.fragility_score,
        old_box_name: r.old_box_name,
        new_box_name: r.recommended_box_name !== 'No box found' ? r.recommended_box_name : null,
        old_box_cost: r.old_box_price,
        new_box_cost: r.new_box_price,
        savings_amount: r.savings_per_unit,
        savings_pct: r.old_box_price > 0 ? (r.savings_per_unit / r.old_box_price) * 100 : 0,
        volume_utilization: r.fit_score,
        void_percentage: 100 - (r.fit_score || 0),
        weight_kg: r.weight_kg,
        length_cm: r.original_dims?.l,
        width_cm: r.original_dims?.w,
        height_cm: r.original_dims?.h,
        new_box_length_cm: r.new_box_dims?.l,
        new_box_width_cm: r.new_box_dims?.w,
        new_box_height_cm: r.new_box_dims?.h,
        created_at: new Date().toISOString()
      }
    })

    for (let i = 0; i < allResultsToInsert.length; i += 50) {
      const chunk = allResultsToInsert.slice(i, i + 50)
      const { error: resultError, data: resultInsert } = await supabase.from('optimization_results').insert(chunk).select('id, sku')
      if (resultError) console.error(`[optimize-save] results chunk ${i} error:`, resultError.message)

      // Map to orders schema, reusing chunk as source
      if (resultInsert) {
        const ordersChunk = chunk.map((result: any, idx: number): any => {
          return {
            user_id: userId,
            optimization_session_id: sessionId,
            optimization_result_id: resultInsert[idx]?.id,
            product_snapshot: { sku: result.sku, product_name: result.product_name, weight_kg: result.weight_kg, dims: { l: result.length_cm, w: result.width_cm, h: result.height_cm } },
            box_snapshot: { name: result.new_box_name, dims: { l: result.new_box_length_cm, w: result.new_box_width_cm, h: result.new_box_height_cm }, price: result.new_box_cost, fit: result.volume_utilization },
            quantity: 1,
            total_cost: result.new_box_cost ?? 0,
            currency: 'INR',
            status: 'pending',
            created_at: result.created_at || new Date().toISOString(),
          }
        })
        const { error: orderError } = await supabase.from('orders').insert(ordersChunk)
        if (orderError) console.error(`[optimize-save] orders chunk ${i} error:`, orderError.message)
      }
    }

    return NextResponse.json({ success: true, session_id: sessionId })
  } catch (error: any) {
    console.error('[/api/optimize/save] error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
