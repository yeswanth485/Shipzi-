import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { checkRateLimit, getRateLimitStatus } from '@/lib/utils/rateLimit'

export const maxDuration = 60

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DEFAULT BOX CATALOGUE 
const DEFAULT_BOXES = [
  { name: 'FedEx Small Box',       carrier: 'FedEx',   L: 31.0, W: 27.7, H:  3.8, maxWeightKg:  5, priceEstimateINR: 120 },
  { name: 'FedEx Medium Box',      carrier: 'FedEx',   L: 33.6, W: 29.2, H:  6.0, maxWeightKg: 10, priceEstimateINR: 200 },
  { name: 'FedEx Large Box',       carrier: 'FedEx',   L: 44.4, W: 31.1, H:  7.6, maxWeightKg: 15, priceEstimateINR: 280 },
  { name: 'UPS Express Box Small', carrier: 'UPS',     L: 33.0, W: 28.0, H:  5.0, maxWeightKg:  5, priceEstimateINR: 130 },
  { name: 'Generic A1',            carrier: 'Generic', L: 15.0, W: 10.0, H:  5.0, maxWeightKg:  2, priceEstimateINR:  40 },
  { name: 'Generic C2',            carrier: 'Generic', L: 50.0, W: 40.0, H: 30.0, maxWeightKg: 35, priceEstimateINR: 360 },
  { name: 'Generic D1',            carrier: 'Generic', L: 60.0, W: 50.0, H: 40.0, maxWeightKg: 50, priceEstimateINR: 545 },
]

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}

export async function POST(request: NextRequest) {
  const missingEnv = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missingEnv.length) {
    return NextResponse.json({ error: 'Missing env vars: ' + missingEnv.join(', ') }, { status: 500 })
  }

  const supabase = getSupabase()

  try {
    let userId: string | undefined
    let products: any[]
    let fileName = 'upload.csv'

    const body = await request.json()
    userId = body.userId
    products = body.products ?? []
    fileName = body.fileName || 'api_upload.json'

    if (!userId) {
      const authHeader = request.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) userId = user.id
      }
    }

    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (!products.length) return NextResponse.json({ error: 'No products to optimize' }, { status: 400 })

    // Build Box Catalog
    const { data: dbBoxes } = await supabase.from('box_catalog').select('*')
    let customBoxes: any[] = []
    if (dbBoxes && dbBoxes.length > 0) {
      customBoxes = dbBoxes.map(b => ({
        name: b.name || 'Custom Box',
        carrier: 'Custom',
        L: Number(b.length_cm),
        W: Number(b.width_cm),
        H: Number(b.height_cm),
        maxWeightKg: Number(b.weight_limit_kg || 30),
        priceEstimateINR: Number(b.cost || 50),
      }))
    }
    
    const boxCatalog = [...DEFAULT_BOXES, ...customBoxes].map((b, idx) => ({
      id: `box-${idx}`,
      name: b.name || 'Custom Box',
      length_cm: Number(b.L || 0),
      width_cm: Number(b.W || 0),
      height_cm: Number(b.H || 0),
      max_weight_kg: Number(b.maxWeightKg || 30),
      cost_usd: Number(b.priceEstimateINR || 0)
    }))

    // Run SYNC Optimization on FastAPI Backend
    let backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://shipzi-backend-2k1i.onrender.com';
    backendUrl = backendUrl.replace(/\/$/, '');
    if (!backendUrl.endsWith('/optimize')) {
      backendUrl = `${backendUrl}/optimize/`;
    } else {
      backendUrl = `${backendUrl}/`;
    }

    console.log(`[optimize] Hitting backend synchronously at: ${backendUrl}`)
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        file_name: fileName,
        products,
        box_catalog: boxCatalog
      })
    })

    if (!backendResponse.ok) {
      const errMsg = await backendResponse.text();
      return NextResponse.json({ error: 'Backend ML Optimization failed', details: errMsg }, { status: backendResponse.status })
    }

    const mlResult = await backendResponse.json();
    
    // mlResult contains the direct output since we hit the sync endpoint "/"!
    const results = mlResult.results || []
    
    return NextResponse.json({
      success: true,
      ok: true,
      total_processed: mlResult.total_processed || results.length,
      total_optimized: mlResult.total_optimized || 0,
      total_savings: mlResult.total_savings || 0,
      results: results
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/optimize] Unhandled error:', msg, error)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}
