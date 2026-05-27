'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function CarrierDistributionDonut({ data }: { data: any[] }) {
  // Aggregate carriers from orders data if provided
  let chartData = []
  
  if (data && data.length > 0) {
    const boxCount: Record<string, number> = {}
    data.forEach(d => {
      const box = d.new_box_name || d.optimized_box || 'Unknown'
      boxCount[box] = (boxCount[box] || 0) + 1
    })
    
    chartData = Object.keys(boxCount).map(k => ({ name: k, value: boxCount[k] }))
  } else {
    chartData = [
      { name: 'No Data', value: 1 },
    ]
  }

  const COLORS = ['#4D148C', '#FFB500', '#333366', '#D40511', '#8884d8']

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          paddingAngle={5}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: '#0D1427', borderColor: '#ffffff20', color: '#fff', borderRadius: '16px' }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  )
}
