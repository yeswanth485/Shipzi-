'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function TotalSavedBarChart({ data }: { data: any[] }) {
  const chartData = data && data.length > 0 ? data.map(d => ({
    name: new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    saved: d.estimated_savings || 0
  })) : [
    { name: 'Run 1', saved: 120 },
    { name: 'Run 2', saved: 250 },
    { name: 'Run 3', saved: 180 },
    { name: 'Run 4', saved: 320 },
    { name: 'Run 5', saved: 450 }
  ] // Fallback

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
        <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0D1427', borderColor: '#ffffff20', color: '#fff', borderRadius: '16px' }}
          itemStyle={{ color: '#00FFD1' }}
        />
        <Bar dataKey="saved" fill="#00FFD1" radius={[4, 4, 0, 0]} name="Total Saved" />
      </BarChart>
    </ResponsiveContainer>
  )
}
