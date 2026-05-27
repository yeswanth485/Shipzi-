import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
// runMLOptimization removed. See FastAPI backend POST below.
import { checkRateLimit, getRateLimitStatus } from '@/lib/utils/rateLimit' // 🔴 BUG #7 FIX

// --- ADDED: Proxy GET for polling async optimize jobs ---
export async function GET(request: NextRequest) {
  // Example: /api/optimize?task_id=xxxx-xxxx
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('task_id')
  const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000/optimize';
  if (!taskId) {
    return NextResponse.json({ error: 'Missing task_id' }, { status: 400 })
  }
  const statusUrl = `${backendUrl}/status/${taskId}`
  try {
    const resp = await fetch(statusUrl, { method: 'GET' })
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to get job status' }, { status: resp.status })
    }
    // data: { status, results }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to contact optimization engine.' }, { status: 500 })
  }
}

export const maxDuration = 60

// ━━━ 1. SUPABASE ADMIN CLIENT (Service Role) ━━━
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ━━━ 2. DEFAULT BOX CATALOGUE (matches BoxSpec) ━━━
const DEFAULT_BOXES = [
  // FedEx
  { name: 'FedEx Small Box',       carrier: 'FedEx',   L: 31.0, W: 27.7, H:  3.8, maxWeightKg:  5, priceEstimateINR: 120 },
  { name: 'FedEx Medium Box',      carrier: 'FedEx',   L: 33.6, W: 29.2, H:  6.0, maxWeightKg: 10, priceEstimateINR: 200 },
  { name: 'FedEx Large Box',       carrier: 'FedEx',   L: 44.4, W: 31.1, H:  7.6, maxWeightKg: 15, priceEstimateINR: 280 },
  { name: 'FedEx Extra Large',     carrier: 'FedEx',   L: 30.1, W: 27.9, H: 27.3, maxWeightKg: 20, priceEstimateINR: 360 },
  // UPS
  { name: 'UPS Express Box Small', carrier: 'UPS',     L: 33.0, W: 28.0, H:  5.0, maxWeightKg:  5, priceEstimateINR: 130 },
  { name: 'UPS Express Box Medium',carrier: 'UPS',     L: 40.0, W: 28.0, H:  7.6, maxWeightKg: 10, priceEstimateINR: 225 },
  { name: 'UPS Express Box Large', carrier: 'UPS',     L: 45.7, W: 33.0, H:  7.6, maxWeightKg: 15, priceEstimateINR: 315 },
  { name: 'UPS 10kg Box',          carrier: 'UPS',     L: 41.9, W: 33.6, H: 27.3, maxWeightKg: 10, priceEstimateINR: 400 },
  { name: 'UPS 25kg Box',          carrier: 'UPS',     L: 50.1, W: 45.1, H: 33.6, maxWeightKg: 25, priceEstimateINR: 640 },
  // USPS
  { name: 'USPS Priority Small',   carrier: 'USPS',    L: 21.9, W: 13.6, H:  4.0, maxWeightKg:  3, priceEstimateINR:  95 },
  { name: 'USPS Priority Medium 1',carrier: 'USPS',    L: 27.9, W: 21.6, H: 14.0, maxWeightKg:  9, priceEstimateINR: 170 },
  { name: 'USPS Priority Large',   carrier: 'USPS',    L: 30.4, W: 30.4, H: 14.0, maxWeightKg: 15, priceEstimateINR: 240 },
  // DHL
  { name: 'DHL Express Box 2',     carrier: 'DHL',     L: 33.0, W: 28.0, H:  5.0, maxWeightKg:  4, priceEstimateINR: 145 },
  { name: 'DHL Express Box 4',     carrier: 'DHL',     L: 33.0, W: 29.2, H: 24.1, maxWeightKg: 10, priceEstimateINR: 260 },
  { name: 'DHL Express Box 6',     carrier: 'DHL',     L: 47.0, W: 30.4, H: 24.1, maxWeightKg: 18, priceEstimateINR: 385 },
  { name: 'DHL Express Box 8',     carrier: 'DHL',     L: 57.1, W: 43.1, H: 34.9, maxWeightKg: 30, priceEstimateINR: 655 },
  // Generic
  { name: 'Generic A1',            carrier: 'Generic', L: 15.0, W: 10.0, H:  5.0, maxWeightKg:  2, priceEstimateINR:  40 },
  { name: 'Generic A2',            carrier: 'Generic', L: 20.0, W: 15.0, H: 10.0, maxWeightKg:  4, priceEstimateINR:  65 },
  { name: 'Generic A3',            carrier: 'Generic', L: 25.0, W: 20.0, H: 15.0, maxWeightKg:  8, priceEstimateINR:  95 },
  { name: 'Generic B1',            carrier: 'Generic', L: 30.0, W: 20.0, H: 15.0, maxWeightKg: 12, priceEstimateINR: 120 },
  { name: 'Generic B2',            carrier: 'Generic', L: 35.0, W: 25.0, H: 20.0, maxWeightKg: 16, priceEstimateINR: 160 },
  { name: 'Generic C1',            carrier: 'Generic', L: 40.0, W: 30.0, H: 25.0, maxWeightKg: 22, priceEstimateINR: 225 },
  { name: 'Generic C2',            carrier: 'Generic', L: 50.0, W: 40.0, H: 30.0, maxWeightKg: 35, priceEstimateINR: 360 },
  { name: 'Generic D1',            carrier: 'Generic', L: 60.0, W: 50.0, H: 40.0, maxWeightKg: 50, priceEstimateINR: 545 },
]

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}

export async function POST(request: NextRequest) {
  // ── 0. Env guard ──────────────────────────────────────────────
  const missingEnv = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missingEnv.length) {
    return NextResponse.json({ error: 'Missing env vars: ' + missingEnv.join(', ') }, { status: 500 })
  }

  const supabase = getSupabase()

  try {
    console.log('[optimize] Request received')

    // ── 1. Parse body ─────────────────────────────────────────────
    let userId: string | undefined
    let products: any[]
    let fileName = 'upload.csv'

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      const uid = form.get('userId')

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }
      if (!uid) {
        // Try Auth Header fallback
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')
        if (token) {
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user) userId = user.id
        }
      } else {
        userId = uid.toString()
      }

      fileName = file.name
      const csvText = await file.text()
      products = parseCSV(csvText)
    } else {
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
    }

    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (!products.length) return NextResponse.json({ error: 'No products to optimize' }, { status: 400 })

    // 🔴 BUG #7 FIX: ADD RATE LIMITING TO PREVENT ABUSE
    const rateLimitKey = `optimize:${userId}`
    const isAllowed = checkRateLimit(rateLimitKey, 30, 60000) // 30 requests per minute per user
    const rateStatus = getRateLimitStatus(rateLimitKey, 30, 60000)

    if (!isAllowed) {
      console.warn(`[optimize] Rate limit exceeded for user: ${userId}`)
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before trying again.',
          retryAfter: Math.ceil(rateStatus.resetIn / 1000),
          rateLimit: {
            limit: rateStatus.limit,
            current: rateStatus.current,
            resetIn: rateStatus.resetIn
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateStatus.resetIn / 1000))
          }
        }
      )
    }

    // 🔴 BUG #1 FIX: ADD QUOTA CHECK BEFORE OPTIMIZATION
    console.log(`[optimize] Checking quota for user: ${userId}`)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('monthly_limit, used_this_month')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      console.warn(`[optimize] No subscription found for user ${userId}`, subError?.message)
      // Create default subscription if missing
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: 'starter',
          monthly_limit: 500,
          used_this_month: 0
        })
        .single()
    }

    const sub = subscription || { monthly_limit: 500, used_this_month: 0 }
    const remaining = (sub.monthly_limit || 500) - (sub.used_this_month || 0)
    const productsToOptimize = products.length

    if (remaining <= 0) {
      console.warn(`[optimize] Quota exceeded for user ${userId}. Limit: ${sub.monthly_limit}, Used: ${sub.used_this_month}`)
      return NextResponse.json(
        { 
          error: 'Optimization quota exceeded',
          message: `Your monthly limit of ${sub.monthly_limit} optimizations has been reached. Upgrade your plan to continue.`,
          used: sub.used_this_month,
          limit: sub.monthly_limit
        },
        { status: 429 }
      )
    }

    if (productsToOptimize > remaining) {
      console.warn(`[optimize] Insufficient quota for user ${userId}. Need: ${productsToOptimize}, Available: ${remaining}`)
      return NextResponse.json(
        {
          error: 'Insufficient quota',
          message: `You have ${remaining} optimizations remaining but are trying to optimize ${productsToOptimize} products.`,
          used: sub.used_this_month,
          limit: sub.monthly_limit,
          remaining
        },
        { status: 429 }
      )
    }

    console.log(`[optimize] Starting: ${products.length} products, user: ${userId}, quota: ${remaining}/${sub.monthly_limit} remaining`)

    // 🔴 BUG #2 FIX: Create fragility lookup map from parsed product data
    const fragilityMap: Record<string, { fragility: string; fragility_score: number }> = {}
    for (const product of products) {
      if (product.sku) {
        const fragility = (product.fragility || 'LOW').toUpperCase()
        const score = (() => {
          switch (fragility) {
            case 'CRITICAL': return 9
            case 'HIGH': return 7
            case 'MEDIUM': return 5
            case 'LOW': return 1
            default: return 1
          }
        })()
        fragilityMap[product.sku] = { fragility, fragility_score: score }
      }
    }

    // ── 2. Get Box Catalog ────────────────────────────────────────
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
    
    const boxCatalog = [...DEFAULT_BOXES, ...customBoxes]

    // ── 3. Run optimization on FastAPI backend ──────────────────
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://shipzi-backend-2k1i.onrender.com/optimize';
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

    // If backend gives task_id, return it early for polling:
    if (mlResult.task_id) {
      return NextResponse.json({ task_id: mlResult.task_id, status: mlResult.status || 'pending' })
    }

    // ── 4. Return success to client so it can call /api/optimize/save ──
    return NextResponse.json({
      success: true,
      ok: true,
      total_processed: mlResult.total_processed,
      total_optimized: mlResult.total_optimized,
      total_not_optimized: mlResult.total_processed - mlResult.total_optimized,
      total_savings: mlResult.total_savings,
      success_rate: mlResult.total_processed > 0 ? (mlResult.total_optimized / mlResult.total_processed) * 100 : 0,
      results: mlResult.results
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/optimize] Unhandled error:', msg, error)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}

function parseCSV(text: string): any[] {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false // Don't force typing - let us handle it
  })

  return (parsed.data as any[])
    .filter(row => row.sku && row.product_name) // Filter out empty rows
    .map(row => ({
      sku: String(row.sku || '').trim(),
      product_name: String(row.product_name || '').trim(),
      weight_kg: Number(row.weight_kg || 0.5),
      length_cm: Number(row.length_cm || 0),
      width_cm: Number(row.width_cm || 0),
      height_cm: Number(row.height_cm || 0),
      quantity: Number(row.quantity || 1),
      fragility: String(row.fragility || 'LOW').toUpperCase() // 🔴 BUG FIX: Parse fragility from CSV
    }))
}
