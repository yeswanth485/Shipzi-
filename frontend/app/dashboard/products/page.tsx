'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Search, Archive } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      if (!error && data) {
        setProducts(data)
      } else {
        setProducts([])
      }
    } else {
      setProducts([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(search.toLowerCase()) || product.sku.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-space-grotesk text-white">Products Inventory</h1>
          <p className="text-zinc-500 mt-2">Manage your SKUs, dimensions, and weights for optimization.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] shrink-0">
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-2xl">
        <div className="relative w-full shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search products by Name or SKU..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 bg-white/5 animate-pulse rounded-[32px]" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] border border-white/5 rounded-[40px] border-dashed">
          <Archive className="w-16 h-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-bold text-white">No products found</h3>
          <p className="text-zinc-500">Try adjusting your search query or add a new product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={product.id} 
                className="bg-[#0D1427] border border-white/5 rounded-[32px] hover:border-blue-500/30 transition-all group overflow-hidden flex flex-col p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-tight line-clamp-1" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 uppercase tracking-widest">{product.sku}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button className="p-1.5 bg-white/5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Weight</span>
                    <span className="text-sm font-bold text-white">{product.weight_kg} kg</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Dimensions</span>
                    <span className="text-sm font-bold text-emerald-400">{product.length_cm}x{product.width_cm}x{product.height_cm}</span>
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
