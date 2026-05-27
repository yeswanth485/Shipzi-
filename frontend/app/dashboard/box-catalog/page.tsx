'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Plus, Trash2, Edit, Truck, Map, Package, Search } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamically import 3D viewer without SSR
const BoxViewer3D = dynamic(() => import('@/components/BoxViewer3D'), { ssr: false })

const CARRIER_BOXES = [
  // FedEx
  { id: 'fedex-s', name: 'FedEx Small Box', carrier: 'FedEx', length_cm: 31.0, width_cm: 27.7, height_cm: 3.8, cost: 1.5, weight_limit_kg: 5, material: 'Corrugated' },
  { id: 'fedex-m', name: 'FedEx Medium Box', carrier: 'FedEx', length_cm: 33.6, width_cm: 29.2, height_cm: 6.0, cost: 2.5, weight_limit_kg: 10, material: 'Corrugated' },
  { id: 'fedex-l', name: 'FedEx Large Box', carrier: 'FedEx', length_cm: 44.4, width_cm: 31.1, height_cm: 7.6, cost: 3.5, weight_limit_kg: 15, material: 'Corrugated' },
  { id: 'fedex-xl', name: 'FedEx Extra Large', carrier: 'FedEx', length_cm: 30.1, width_cm: 27.9, height_cm: 27.3, cost: 4.5, weight_limit_kg: 20, material: 'Double Wall' },
  { id: 'fedex-tube', name: 'FedEx Tube', carrier: 'FedEx', length_cm: 96.5, width_cm: 15.2, height_cm: 15.2, cost: 6.0, weight_limit_kg: 10, material: 'Heavy Duty' },

  // UPS
  { id: 'ups-s', name: 'UPS Express Box Small', carrier: 'UPS', length_cm: 33.0, width_cm: 28.0, height_cm: 5.0, cost: 1.6, weight_limit_kg: 5, material: 'Corrugated' },
  { id: 'ups-m', name: 'UPS Express Box Medium', carrier: 'UPS', length_cm: 40.0, width_cm: 28.0, height_cm: 7.6, cost: 2.8, weight_limit_kg: 10, material: 'Corrugated' },
  { id: 'ups-l', name: 'UPS Express Box Large', carrier: 'UPS', length_cm: 45.7, width_cm: 33.0, height_cm: 7.6, cost: 3.9, weight_limit_kg: 15, material: 'Double Wall' },
  { id: 'ups-tube', name: 'UPS Express Tube', carrier: 'UPS', length_cm: 96.5, width_cm: 15.2, height_cm: 15.2, cost: 6.5, weight_limit_kg: 10, material: 'Heavy Duty' },
  { id: 'ups-10kg', name: 'UPS 10kg Box', carrier: 'UPS', length_cm: 41.9, width_cm: 33.6, height_cm: 27.3, cost: 5.0, weight_limit_kg: 10, material: 'Heavy Duty' },
  { id: 'ups-25kg', name: 'UPS 25kg Box', carrier: 'UPS', length_cm: 50.1, width_cm: 45.1, height_cm: 33.6, cost: 8.0, weight_limit_kg: 25, material: 'Double Wall' },

  // USPS
  { id: 'usps-s', name: 'USPS Priority Small', carrier: 'USPS', length_cm: 21.9, width_cm: 13.6, height_cm: 4.0, cost: 1.2, weight_limit_kg: 3, material: 'Corrugated' },
  { id: 'usps-m1', name: 'USPS Priority Medium 1', carrier: 'USPS', length_cm: 27.9, width_cm: 21.6, height_cm: 14.0, cost: 2.1, weight_limit_kg: 9, material: 'Corrugated' },
  { id: 'usps-m2', name: 'USPS Priority Medium 2', carrier: 'USPS', length_cm: 34.6, width_cm: 30.0, height_cm: 8.6, cost: 2.1, weight_limit_kg: 9, material: 'Corrugated' },
  { id: 'usps-l', name: 'USPS Priority Large', carrier: 'USPS', length_cm: 30.4, width_cm: 30.4, height_cm: 14.0, cost: 3.0, weight_limit_kg: 15, material: 'Double Wall' },
  { id: 'usps-shoe', name: 'USPS Shoe Box', carrier: 'USPS', length_cm: 36.5, width_cm: 13.0, height_cm: 19.0, cost: 2.5, weight_limit_kg: 8, material: 'Corrugated' },
  { id: 'usps-rega', name: 'USPS Regional A', carrier: 'USPS', length_cm: 25.4, width_cm: 17.8, height_cm: 12.0, cost: 2.4, weight_limit_kg: 7, material: 'Corrugated' },
  { id: 'usps-regb', name: 'USPS Regional B', carrier: 'USPS', length_cm: 30.4, width_cm: 26.0, height_cm: 12.7, cost: 2.8, weight_limit_kg: 9, material: 'Double Wall' },

  // DHL
  { id: 'dhl-2', name: 'DHL Express Box 2', carrier: 'DHL', length_cm: 33.0, width_cm: 28.0, height_cm: 5.0, cost: 1.8, weight_limit_kg: 4, material: 'Corrugated' },
  { id: 'dhl-3', name: 'DHL Express Box 3', carrier: 'DHL', length_cm: 33.0, width_cm: 33.0, height_cm: 8.9, cost: 2.4, weight_limit_kg: 7, material: 'Corrugated' },
  { id: 'dhl-4', name: 'DHL Express Box 4', carrier: 'DHL', length_cm: 33.0, width_cm: 29.2, height_cm: 24.1, cost: 3.2, weight_limit_kg: 10, material: 'Double Wall' },
  { id: 'dhl-5', name: 'DHL Express Box 5', carrier: 'DHL', length_cm: 45.7, width_cm: 30.4, height_cm: 9.5, cost: 3.6, weight_limit_kg: 12, material: 'Corrugated' },
  { id: 'dhl-6', name: 'DHL Express Box 6', carrier: 'DHL', length_cm: 47.0, width_cm: 30.4, height_cm: 24.1, cost: 4.8, weight_limit_kg: 18, material: 'Double Wall' },
  { id: 'dhl-7', name: 'DHL Express Box 7', carrier: 'DHL', length_cm: 48.2, width_cm: 39.3, height_cm: 38.1, cost: 6.5, weight_limit_kg: 25, material: 'Double Wall' },
  { id: 'dhl-8', name: 'DHL Express Box 8', carrier: 'DHL', length_cm: 57.1, width_cm: 43.1, height_cm: 34.9, cost: 8.2, weight_limit_kg: 30, material: 'Heavy Duty' },

  // Generic
  { id: 'gen-1', name: 'Custom Generic A1', carrier: 'Generic', length_cm: 15.0, width_cm: 10.0, height_cm: 5.0, cost: 0.5, weight_limit_kg: 2, material: 'Corrugated' },
  { id: 'gen-2', name: 'Custom Generic A2', carrier: 'Generic', length_cm: 20.0, width_cm: 15.0, height_cm: 10.0, cost: 0.8, weight_limit_kg: 4, material: 'Corrugated' },
  { id: 'gen-3', name: 'Custom Generic A3', carrier: 'Generic', length_cm: 25.0, width_cm: 20.0, height_cm: 15.0, cost: 1.2, weight_limit_kg: 8, material: 'Corrugated' },
  { id: 'gen-4', name: 'Custom Generic B1', carrier: 'Generic', length_cm: 30.0, width_cm: 20.0, height_cm: 15.0, cost: 1.5, weight_limit_kg: 12, material: 'Double Wall' },
  { id: 'gen-5', name: 'Custom Generic B2', carrier: 'Generic', length_cm: 35.0, width_cm: 25.0, height_cm: 20.0, cost: 2.0, weight_limit_kg: 16, material: 'Double Wall' },
  { id: 'gen-6', name: 'Custom Generic C1', carrier: 'Generic', length_cm: 40.0, width_cm: 30.0, height_cm: 25.0, cost: 2.8, weight_limit_kg: 22, material: 'Heavy Duty' },
  { id: 'gen-7', name: 'Custom Generic C2', carrier: 'Generic', length_cm: 50.0, width_cm: 40.0, height_cm: 30.0, cost: 4.5, weight_limit_kg: 35, material: 'Heavy Duty' },
  { id: 'gen-8', name: 'Custom Generic D1', carrier: 'Generic', length_cm: 60.0, width_cm: 50.0, height_cm: 40.0, cost: 6.8, weight_limit_kg: 50, material: 'Tri-Wall' }
].map(b => ({ ...b, isStandard: true }))

const TABS = ['All', 'FedEx', 'UPS', 'USPS', 'DHL', 'Generic', 'Custom']

export default function BoxCatalogPage() {
  const supabase = createClient() as any
  const [boxes, setBoxes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('box_catalog').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!error && data) {
        const customBoxes = data.map((b: any) => ({ ...b, carrier: 'Custom', isStandard: false }))
        setBoxes([...CARRIER_BOXES, ...customBoxes])
      } else {
        setBoxes(CARRIER_BOXES)
      }
    } else {
      setBoxes(CARRIER_BOXES)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  const filteredBoxes = boxes.filter(box => {
    const matchesTab = activeTab === 'All' ? true : box.carrier === activeTab
    const matchesSearch = box.name.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-space-grotesk text-white">Box Catalog</h1>
          <p className="text-zinc-500 mt-2">Manage your custom box sizes and dimensions. View them in 3D.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] shrink-0">
          <Plus className="w-5 h-5" />
          Add Custom Box
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-2xl">
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search boxes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-72 bg-white/5 animate-pulse rounded-[32px]" />)}
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] border border-white/5 rounded-[40px] border-dashed">
          <Package className="w-16 h-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-bold text-white">No boxes found</h3>
          <p className="text-zinc-500">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredBoxes.map((box) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={box.id} 
                className="bg-[#0D1427] border border-white/5 rounded-[32px] hover:border-blue-500/30 transition-all group overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-tight mb-1 line-clamp-1" title={box.name}>
                      {box.name}
                    </h3>
                    <div className="flex gap-2 items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        box.carrier === 'FedEx' ? 'bg-[#4D148C] text-white' :
                        box.carrier === 'UPS' ? 'bg-[#351C15] text-[#FFB500]' :
                        box.carrier === 'USPS' ? 'bg-[#333366] text-white' :
                        box.carrier === 'DHL' ? 'bg-[#D40511] text-[#FFCC00]' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {box.carrier}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{box.material}</span>
                    </div>
                  </div>
                  {!box.isStandard && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button className="p-1.5 bg-white/5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3D Viewer */}
                <div className="relative h-48 bg-[#0A0F1E]/50 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
                    <BoxViewer3D key={`${box.id}-${activeTab}`} length={box.length_cm} width={box.width_cm} height={box.height_cm} />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 flex flex-col items-center">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Dimensions</span>
                      <span className="text-xs font-bold text-white">{box.length_cm} × {box.width_cm} × {box.height_cm}</span>
                    </div>
                    <div className="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 flex flex-col items-center">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Volume</span>
                      <span className="text-xs font-bold text-blue-400">{((box.length_cm * box.width_cm * box.height_cm)/1000).toFixed(1)}L</span>
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="p-5 grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Max Weight</span>
                    <span className="text-sm font-bold text-white">{box.weight_limit_kg} kg</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Base Cost</span>
                    <span className="text-sm font-bold text-emerald-400">${box.cost?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
