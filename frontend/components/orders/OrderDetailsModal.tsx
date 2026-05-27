'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Box, Info, Zap, Leaf, Shield, ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'

const Box3DViewer = dynamic(() => import('./Box3DViewer'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-white/5 animate-pulse rounded-3xl" />
})

export default function OrderDetailsModal({
  order,
  onClose
}: {
  order: any,
  onClose: () => void
}) {
  const supabase = createClient() as any
  const [labels, setLabels] = useState<any[]>([])
  const [selectedLabel, setSelectedLabel] = useState<any | null>(null)

  // Fetch labels
  useState(() => {
    supabase.from('packaging_labels').select('*').then(({ data }: any) => {
      if (data) setLabels(data)
    })
  })

  // Extract dimensions safely
  const dims = {
    l: order.length_cm || order.dimensions?.l || 0,
    w: order.width_cm || order.dimensions?.w || 0,
    h: order.height_cm || order.dimensions?.h || 0
  }
  const optDims = {
    l: order.new_box_length_cm || order.optimized_dims?.l || 0,
    w: order.new_box_width_cm || order.optimized_dims?.w || 0,
    h: order.new_box_height_cm || order.optimized_dims?.h || 0
  }
  const originalVolume = dims.l * dims.w * dims.h / 1000
  const optimizedVolume = optDims.l * optDims.w * optDims.h / 1000
  const fitScore = order.volume_utilization || order.volume_util || order.fit_score || 0
  const savings = order.savings_amount || order.savings || order.savings_per_unit || 0
  const baselineCost = order.old_box_cost || order.baseline_cost || order.old_box_price || 0
  const shippingCost = order.new_box_cost || order.shipping_cost || order.new_box_price || 0
  const fragility = order.fragility_level || order.fragility || 'LOW'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl bg-[#0D1427] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* 3D Viewer Side */}
        <div className="p-8 lg:p-12 h-[400px] lg:h-auto flex flex-col relative">
          <Box3DViewer
            productName={order.product_name}
            originalDims={dims}
            optimizedDims={optDims}
            labelUrl={selectedLabel?.image_url}
          />
          <div className="absolute top-12 right-12 z-10 w-48 pointer-events-auto">
             <select 
               className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none backdrop-blur-md"
               onChange={(e) => setSelectedLabel(labels.find(l => l.id === e.target.value) || null)}
               value={selectedLabel?.id || ''}
             >
                <option value="">No Label</option>
                {labels.map(l => (
                   <option key={l.id} value={l.id}>{l.name} (+₹{l.price})</option>
                ))}
             </select>
          </div>
        </div>

        {/* Info Side */}
        <div className="p-8 lg:p-12 lg:border-l border-white/5 space-y-8 overflow-y-auto max-h-[80vh] lg:max-h-none">
          <div className="space-y-4">
            <Badge variant="blue">Order Optimization Profile</Badge>
            <h2 className="text-4xl font-bold font-space-grotesk text-white">{order.product_name}</h2>
            <div className="flex gap-4">
               <Badge variant={fragility === 'HIGH' ? 'red' : fragility === 'MEDIUM' ? 'yellow' : 'green'}>
                  Fragility: {fragility}
               </Badge>
               <Badge variant="outline">SKU: {order.sku || 'N/A'}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Original Volume</p>
              <p className="text-2xl font-bold text-white">
                {originalVolume.toFixed(2)}L
              </p>
              <p className="text-xs text-zinc-600">{dims.l}x{dims.w}x{dims.h} cm</p>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Optimized Volume</p>
              <p className="text-2xl font-bold text-white">
                {optimizedVolume.toFixed(2)}L
              </p>
              <p className="text-xs text-blue-400/50">{optDims.l}x{optDims.w}x{optDims.h} cm</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Zap className="w-4 h-4 text-emerald-500" />
                   </div>
                   <span className="text-sm font-bold text-zinc-300">Fit Score</span>
                </div>
                <span className="text-lg font-black text-white">{fitScore}%</span>
             </div>

             <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Box className="w-4 h-4 text-blue-400" />
                   </div>
                   <span className="text-sm font-bold text-zinc-300">Weight</span>
                </div>
                <span className="text-lg font-black text-white">{order.weight || order.weight_kg || order.weightKg || 0} kg</span>
             </div>

             <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Shield className="w-4 h-4 text-purple-400" />
                   </div>
                   <span className="text-sm font-bold text-zinc-300">Baseline Box</span>
                </div>
                <span className="text-lg font-black text-white">{order.baseline_box || order.old_box_name || 'Original'}</span>
             </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Total Savings</p>
              <p className="text-3xl font-black text-white">₹{(savings - (selectedLabel?.price || 0)).toFixed(2)}</p>
            </div>
            <div className="text-right">
               <p className="text-lg font-bold text-white">{order.savings_percent ? order.savings_percent.toFixed(0) : 0}% saved</p>
               <p className="text-xs text-white/50">per shipment</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
