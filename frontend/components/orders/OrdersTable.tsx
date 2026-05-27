'use client'

import { useState } from 'react'
import { useOptimizationStore } from '@/lib/store/optimizationStore'
import { Badge } from '@/components/ui/Badge'
import { Search, ArrowUpDown, Download, Eye } from 'lucide-react'
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

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg font-bold">No results to display</p>
        <p className="text-sm mt-1">Click on a session above to view its optimization results.</p>
      </div>
    )
  }

  const filtered = results.filter(r =>
    (r.product_name || r.sku || '').toLowerCase().includes(search.toLowerCase())
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
    const exportData = results.map((r: any) => ({
      SKU: r.sku,
      Product: r.product_name,
      'Product Dims (LxWxH cm)': `${r.length_cm || 0}x${r.width_cm || 0}x${r.height_cm || 0}`,
      'Weight (kg)': r.weight_kg || 0,
      Fragility: r.fragility_level || r.fragility || 'LOW',
      'Old Box': r.old_box_name || '-',
      'Old Box Dims': r.old_box_dims || '-',
      'Old Box Price (₹)': r.old_box_cost || 0,
      'New Box': r.new_box_name || r.recommended_box_name || '-',
      'New Box Dims': r.new_box_dims || `${r.new_box_length_cm || 0}x${r.new_box_width_cm || 0}x${r.new_box_height_cm || 0}`,
      'New Box Price (₹)': r.new_box_cost || 0,
      'Savings (₹)': r.savings_amount || 0,
      'Savings (%)': r.savings_pct || 0,
      'Fit Score (%)': r.volume_utilization || 0,
    }))
    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipzi_results_${new Date().getTime()}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 font-bold">{filtered.length} results</span>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-6 py-3 rounded-2xl text-zinc-300 font-bold hover:bg-white/5 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#0D1427] border border-white/10 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('sku')}>
                  SKU <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('product_name')}>
                  Product <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Product Dims</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Old Box</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('old_box_cost')}>
                  Old Price <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">New Box</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('new_box_cost')}>
                  New Price <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Fragility</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('volume_utilization')}>
                  Fit <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer whitespace-nowrap" onClick={() => handleSort('savings_amount')}>
                  Savings <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.map((row: any, i: number) => {
                const productDims = (row.length_cm && row.width_cm && row.height_cm)
                  ? `${row.length_cm}×${row.width_cm}×${row.height_cm}`
                  : '-'

                const oldBoxDims = row.old_box_dims || '-'
                const newBoxDims = row.new_box_dims || (row.new_box_length_cm ? `${row.new_box_length_cm}×${row.new_box_width_cm}×${row.new_box_height_cm}` : '-')

                const fragility = row.fragility_level || row.fragility || 'LOW'
                const fitScore = row.volume_utilization || 0
                const savingsAmt = row.savings_amount || 0
                const oldCost = row.old_box_cost || 0
                const newCost = row.new_box_cost || 0

                return (
                  <tr key={row.id || `row-${i}`} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] text-zinc-500 font-mono font-bold">{row.sku || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white font-bold">{row.product_name || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-zinc-400 font-mono">{productDims}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400">{row.old_box_name || '-'}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">{oldBoxDims}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-red-400/80 font-bold">₹{Number(oldCost).toFixed(0)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs text-blue-400 font-bold">{row.new_box_name || row.recommended_box_name || '-'}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">{newBoxDims}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-emerald-400 font-bold">₹{Number(newCost).toFixed(0)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={fragility === 'HIGH' || fragility === 'CRITICAL' ? 'red' : fragility === 'MEDIUM' ? 'yellow' : 'green'}>
                        {fragility}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={fitScore >= 60 ? 'green' : fitScore >= 30 ? 'yellow' : 'red'}>
                        {fitScore}%
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-emerald-400 font-black">₹{Number(savingsAmt).toFixed(0)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelectedOrder(row)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-zinc-400" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <button onClick={() => setCurrentPage(currentPage - 1)} className="px-4 py-2 bg-white/5 text-zinc-400 rounded-xl font-bold hover:bg-white/10">Prev</button>
          )}
          {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => {
            const page = i + 1
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-xl font-bold transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {page}
              </button>
            )
          })}
          {currentPage < totalPages && (
            <button onClick={() => setCurrentPage(currentPage + 1)} className="px-4 py-2 bg-white/5 text-zinc-400 rounded-xl font-bold hover:bg-white/10">Next</button>
          )}
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
