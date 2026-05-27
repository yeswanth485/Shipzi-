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

    // Create product lookup map from products input
    const productMap: Record<string, any> = {}
    for (const product of (products || [])) {
      if (product.sku) {
        productMap[product.sku] = product
      }
    }

    const totalItems = mlResult.total_processed || mlResult.results.length
    const optimizedItems = mlResult.total_optimized || mlResult.results.filter((r:any) => r.recommended_box_name && r.recommended_box_name !== 'No Fits').length
    const unoptimizedItems = totalItems - optimizedItems
    const estimatedSavings = mlResult.total_savings || mlResult.results.reduce((acc: number, r:any) => acc + (r.savings || 0), 0)
    const optimizationRate = totalItems > 0 ? (optimizedItems / totalItems) * 100 : 0

    // 1. Insert session
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

    const sessionId = session?.id ?? null
    if (sessionErr) {
      console.error('[optimize-save] session insert error:', sessionErr.message)
      return NextResponse.json({ error: 'Session insert failed' }, { status: 500 })
    }

    // 2. Insert optimization_results in chunks
    const allResultsToInsert = mlResult.results.map((r: any) => {
      const fragilityData = fragilityMap[r.sku] || { fragility: 'LOW', fragility_score: 1 }
      const origProduct = productMap[r.sku] || {}
      
      let newBoxL = 0, newBoxW = 0, newBoxH = 0
      if (r.recommended_box_dims && r.recommended_box_dims !== '—') {
        const dimsParts = r.recommended_box_dims.split('x').map(Number)
        if (dimsParts.length === 3) {
          [newBoxL, newBoxW, newBoxH] = dimsParts
        }
      }

      const isOptimized = r.recommended_box_name && r.recommended_box_name !== 'No Fits'

      return {
        session_id: sessionId,
        user_id: userId,
        sku: r.sku || origProduct.sku || 'UNKNOWN',
        product_name: r.product_name || origProduct.product_name || '',
        is_optimized: isOptimized,
        failure_reason: isOptimized ? null : (r.reasoning || 'No suitable box found'),
        recommendation_reason: isOptimized ? (r.reasoning || 'Optimal fit and price') : 'Consider custom packaging',
        fragility_level: fragilityData.fragility,
        fragility_score: fragilityData.fragility_score,
        old_box_name: r.old_box_name || origProduct.old_box_name || null,
        new_box_name: isOptimized ? (r.recommended_box_name || r.new_box_name) : null,
        old_box_cost: r.old_box_cost || r.baseline_cost || 0,
        new_box_cost: isOptimized ? (r.new_box_cost || r.packaging_cost) : 0,
        savings_amount: r.savings_amount || r.savings || 0,
        savings_pct: r.savings_pct || r.savings_percent || 0,
        volume_utilization: r.volume_utilization || r.space_utilization || 0,
        void_percentage: 100 - (r.volume_utilization || r.space_utilization || 0),
        weight_kg: r.weight_kg || origProduct.weight_kg || 0.5,
        length_cm: r.length_cm || origProduct.length_cm || 0,
        width_cm: r.width_cm || origProduct.width_cm || 0,
        height_cm: r.height_cm || origProduct.height_cm || 0,
        old_box_dims: r.old_box_dims || (origProduct.old_box_length_cm ? `${origProduct.old_box_length_cm}x${origProduct.old_box_width_cm}x${origProduct.old_box_height_cm}` : null),
        new_box_length_cm: r.new_box_length_cm || newBoxL,
        new_box_width_cm: r.new_box_width_cm || newBoxW,
        new_box_height_cm: r.new_box_height_cm || newBoxH,
        new_box_dims: r.recommended_box_dims || null,
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
