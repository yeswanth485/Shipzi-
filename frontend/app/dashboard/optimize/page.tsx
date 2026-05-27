'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, Table as TableIcon, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useOptimizationStore } from '@/lib/store/optimizationStore'
import { Badge } from '@/components/ui/Badge'

// No polling needed - using synchronous Fast API endpoint.

export default function OptimizePage() {
  const router = useRouter()
  const supabase = createClient()
  const { setCurrentRun, setResults, setIsOptimizing } = useOptimizationStore()

  const [step, setStep] = useState(1) // 1: Upload, 2: Preview, 3: Processing
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseCSV(selectedFile)
    }
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData(results.data)
      },
      error: (error) => {
        toast.error('Failed to parse CSV: ' + error.message)
      }
    })
  }



  const validateData = (data: any[]) => {
    const newErrors: string[] = []
    const validatedData = data.map((row, index) => {
      const sku = row.sku
      const productName = String(row.product_name || row.Product_Name || row.name || `Product ${index + 1}`)
      const length = parseFloat(row.length_cm || row.length)
      const width = parseFloat(row.width_cm || row.width)
      const height = parseFloat(row.height_cm || row.height)
      const weight = parseFloat(row.weight_kg || row.weight)
      const fragility = String(row.fragility || 'Medium')
      const quantity = parseInt(row.quantity || 1)

      const old_box_length_cm = row.old_box_length_cm ? parseFloat(row.old_box_length_cm) : undefined
      const old_box_width_cm = row.old_box_width_cm ? parseFloat(row.old_box_width_cm) : undefined
      const old_box_height_cm = row.old_box_height_cm ? parseFloat(row.old_box_height_cm) : undefined
      const old_box_name = row.old_box_name ? String(row.old_box_name) : undefined

      if (isNaN(length) || length <= 0) newErrors.push(`Row ${index + 1}: Invalid length_cm`)
      if (isNaN(width) || width <= 0) newErrors.push(`Row ${index + 1}: Invalid width_cm`)
      if (isNaN(height) || height <= 0) newErrors.push(`Row ${index + 1}: Invalid height_cm`)
      if (isNaN(weight) || weight <= 0) newErrors.push(`Row ${index + 1}: Invalid weight_kg`)
      if (quantity <= 0) newErrors.push(`Row ${index + 1}: Invalid quantity`)

      return {
        sku,
        product_name: productName,
        length_cm: length,
        width_cm: width,
        height_cm: height,
        weight_kg: weight,
        fragility,
        quantity,
        old_box_length_cm,
        old_box_width_cm,
        old_box_height_cm,
        old_box_name
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
      setStep(1)
    } else {
      setErrors([])
      setParsedData(validatedData)
      setStep(2)
    }
  }

  const runOptimization = async () => {
    setStep(3)
    setIsOptimizing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      setProgress(20)
      setProgressText('Uploading data to XGBoost engine...')

      // Call the backend API route
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          products: parsedData,
          fileName: file?.name || 'Manual Upload'
        })
      })

      setProgress(60)
      setProgressText('Running XGBoost & Database Insertion...')

      const responseData = await response.json()

      const saveOptimizationResults = async (finalData: any) => {
        setProgress(90)
        setProgressText('Saving results to database...')
        const saveRes = await fetch('/api/optimize/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: session.user.id,
            fileName: file?.name || 'Manual Upload',
            products: parsedData,
            mlResult: finalData
          })
        })
        if (!saveRes.ok) {
          throw new Error('Failed to save results to database')
        }
        const savedData = await saveRes.json()
        return savedData.session_id
      }

      if (!response.ok) {
        throw new Error(responseData.error || 'Optimization failed')
      }

      setProgress(80)
      setProgressText('Saving results to database...')
      const sessionId = await saveOptimizationResults(responseData)

      setProgress(100)
      setProgressText('Optimization Complete!')

      setCurrentRun({ id: sessionId } as any)
      setResults(responseData.results)

      toast.success('Successfully optimized ' + (responseData.total_optimized ?? responseData.results?.length ?? 0) + ' products')

      setTimeout(() => {
        setIsOptimizing(false)
        router.push('/dashboard/orders')
      }, 1500)

    } catch (error: any) {
      console.error(error)
      toast.error('Optimization failed: ' + error.message)
      setStep(2)
      setIsOptimizing(false)
    }
  }

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      { sku: 'SKU-001', product_name: 'Wireless Mouse', length_cm: 12.5, width_cm: 8.2, height_cm: 4.5, weight_kg: 0.15, fragility: 'Low', quantity: 1, old_box_name: 'Small Generic', old_box_length_cm: 15, old_box_width_cm: 10, old_box_height_cm: 6 },
      { sku: 'SKU-002', product_name: 'Ceramic Vase', length_cm: 20, width_cm: 20, height_cm: 35, weight_kg: 1.8, fragility: 'High', quantity: 1, old_box_name: 'Medium Generic', old_box_length_cm: 25, old_box_width_cm: 25, old_box_height_cm: 40 },
      { sku: 'SKU-003', product_name: 'Running Shoes', length_cm: 35, width_cm: 22, height_cm: 14, weight_kg: 0.8, fragility: 'Low', quantity: 1, old_box_name: 'Shoe Box', old_box_length_cm: 38, old_box_width_cm: 25, old_box_height_cm: 16 },
      { sku: 'SKU-004', product_name: 'Laptop Stand', length_cm: 40, width_cm: 30, height_cm: 8, weight_kg: 2.5, fragility: 'Medium', quantity: 1, old_box_name: 'Large Mailer', old_box_length_cm: 45, old_box_width_cm: 35, old_box_height_cm: 10 },
      { sku: 'SKU-005', product_name: 'Glass Photo Frame', length_cm: 28, width_cm: 22, height_cm: 3, weight_kg: 0.6, fragility: 'High', quantity: 2, old_box_name: 'Flat Box', old_box_length_cm: 32, old_box_width_cm: 26, old_box_height_cm: 5 },
    ])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'packiq_template.csv'
    a.click()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-space-grotesk text-white">Optimize Catalog</h1>
        <p className="text-zinc-500">Upload your product catalog CSV to find the perfect packaging for every item.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div
              className="border-2 border-dashed border-white/10 rounded-[40px] p-20 flex flex-col items-center justify-center space-y-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-blue-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-white">Drop your CSV here or click to browse</p>
                <p className="text-zinc-500">Support for large catalogs (up to 10,000 SKUs)</p>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-left w-full">
                  <div>
                    <p className="text-xs text-zinc-400 font-mono mb-1">Required Columns:</p>
                    <p className="text-[10px] text-zinc-500 font-mono bg-black/20 p-2 rounded-lg border border-white/5 inline-block w-full">sku, product_name, length_cm, width_cm, height_cm, weight_kg, fragility, quantity</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-mono mb-1">Optional Columns (for Box Comparison):</p>
                    <p className="text-[10px] text-zinc-500 font-mono bg-black/20 p-2 rounded-lg border border-white/5 inline-block w-full">old_box_name, old_box_length_cm, old_box_width_cm, old_box_height_cm</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Don't have a file?</p>
                  <p className="text-sm text-zinc-500">Download our sample template to get started.</p>
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all border border-white/10"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            {errors.length > 0 && (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  Validation Errors Found
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {errors.slice(0, 6).map((err, i) => (
                    <div key={i} className="text-sm text-red-400/80">• {err}</div>
                  ))}
                  {errors.length > 6 && <div className="text-sm text-red-400/80 font-bold">+ {errors.length - 6} more errors</div>}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <TableIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Preview Data</h3>
                  <p className="text-sm text-zinc-500">{parsedData.length} valid rows found</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-zinc-400 font-bold hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={runOptimization}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-2"
                >
                  Start Optimization
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-[#0D1427] border border-white/5 rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Product Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Dimensions</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Weight</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Fragility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-white/5 group hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{row.product_name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono mt-1">{row.sku}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-white/5 rounded-md text-xs font-mono text-zinc-300">
                              {row.length_cm} × {row.width_cm} × {row.height_cm} cm
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-300">{row.weight_kg} kg</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            row.fragility === 'High' ? 'bg-red-500/10 text-red-400' :
                            row.fragility === 'Low' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {row.fragility || 'Medium'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <div className="p-4 text-center text-xs font-bold text-zinc-600 uppercase tracking-widest bg-black/20">
                  Showing first 10 of {parsedData.length} rows
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 flex flex-col items-center justify-center space-y-12"
          >
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 80}
                  initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - progress / 100) }}
                  className="text-blue-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                <span className="text-4xl font-black font-space-grotesk text-white">{progress}%</span>
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold font-space-grotesk text-white">{progressText}</h2>
              <div className="flex gap-2">
                {[10, 40, 70, 90, 100].map(s => (
                  <div
                    key={s}
                    className={`h-1.5 w-12 rounded-full transition-all duration-500 ${progress >= s ? 'bg-blue-500' : 'bg-white/5'}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
