'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SuccessRateAreaChart({ data }: { data: any[] }) {
  const chartData = data && data.length > 0 ? data.map((d, index) => ({
    name: `Run ${index + 1}`,
    rate: d.optimization_rate || (d.total_items > 0 ? (d.optimized_items / d.total_items) * 100 : 0)
  })) : [
    { name: 'Run 1', rate: 45 },
    { name: 'Run 2', rate: 60 },
    { name: 'Run 3', rate: 85 },
    { name: 'Run 4', rate: 92 },
    { name: 'Run 5', rate: 98 }
  ] // Fallback

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
        <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0D1427', borderColor: '#ffffff20', color: '#fff', borderRadius: '16px' }}
          itemStyle={{ color: '#3B82F6' }}
        />
        <Area type="monotone" dataKey="rate" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="Success Rate" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
