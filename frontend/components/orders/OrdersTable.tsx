'use client'

import { useState } from 'react'
import { useOptimizationStore } from '@/lib/store/optimizationStore'
import { Badge } from '@/components/ui/Badge'
import { Search, ArrowUpDown, Box, Download, MoreHorizontal, Eye } from 'lucide-react'
import OrderDetailsModal from './OrderDetailsModal'
import { AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'

interface OrdersTableProps {
  data?: any[]
}

export default function OrdersTable({ data }: OrdersTableProps = {}) {
  const store = useOptimizationStore()
  const results = data || store.results
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('product_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  if (!results || results.length === 0) return null

  const filtered = results.filter(r =>
    r.product_name?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const valA = (a as any)[sortKey]
    const valB = (b as any)[sortKey]
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const exportToCSV = () => {
    const csv = Papa.unparse(results)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipzi_optimization_${new Date().getTime()}.csv`
    a.click()
  }

  const totals = {
    savings: results.reduce((acc, r) => acc + (r.savings || r.savings_per_unit || 0), 0),
    avgUtilization: results.reduce((acc, r) => acc + (r.volume_util || r.fit_score || 0), 0) / results.length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-6 py-3 rounded-2xl text-zinc-300 font-bold hover:bg-white/5 transition-all"
        >
          <Download className="w-4 h-4" />
          Export All (CSV)
        </button>
      </div>

      <div className="bg-[#0D1427] border border-white/10 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('product_name')}>
                  Product <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Original Dims</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('weight')}>
                  Weight <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Old Box</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('baseline_cost')}>
                  Old Price <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">New Box</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Carrier</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">New Dims</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('shipping_cost')}>
                  New Price <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('volume_util')}>
                  Fit Score <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer" onClick={() => handleSort('savings')}>
                  Savings <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
             {paginated.map((row: any, i) => {
                 const dimsStr = (row.length_cm && row.width_cm && row.height_cm) 
                   ? `${row.length_cm}x${row.width_cm}x${row.height_cm} cm`
                   : (row.dimensions ? `${row.dimensions.l}x${row.dimensions.w}x${row.dimensions.h} cm` : '-')
                 
                 const optDimsStr = (row.new_box_length_cm && row.new_box_width_cm && row.new_box_height_cm) 
                   ? `${row.new_box_length_cm}x${row.new_box_width_cm}x${row.new_box_height_cm} cm`
                   : (row.new_box_dims ? row.new_box_dims : (row.optimized_dims ? `${row.optimized_dims.l}x${row.optimized_dims.w}x${row.optimized_dims.h} cm` : '-'))
                 
                 return (
                 <tr key={row.id || i} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedOrder(row)}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{row.product_name || row.productName}</span>
                      <span className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">SKU: {row.sku || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{dimsStr}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{row.weight || row.weightKg || row.weight_kg || 0} kg</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{row.baseline_box || row.originalBox || row.old_box_name || '-'}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm font-bold">₹{(row.baseline_cost || row.old_box_price || row.old_box_cost || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-blue-400 text-sm font-bold">{row.optimized_box || row.optimizedBox || row.recommended_box_name || row.new_box_name || '-'}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{row.carrier || row.recommended_carrier || '-'}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{optDimsStr}</td>
                  <td className="px-6 py-4 text-white text-sm font-bold">₹{(row.shipping_cost || row.new_box_price || row.new_box_cost || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={(row.volume_util || row.fit_score || row.volume_utilization || 0) >= 80 ? 'green' : (row.volume_util || row.fit_score || row.volume_utilization || 0) >= 50 ? 'yellow' : 'red'}>
                      {row.volume_util || row.fit_score || row.volume_utilization || 0}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="green">
                      ₹{(row.savings || row.savings_per_unit || row.savings_amount || 0).toFixed(2)}
                    </Badge>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-10 h-10 rounded-xl font-bold transition-all ${
                currentPage === i + 1
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
