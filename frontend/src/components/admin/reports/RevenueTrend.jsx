// Revenue (area, left axis) + number of orders (bars, right axis) for every day in the range
import { Area, Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPrice } from '../../../utils/format'
import { adminCard } from '../adminStyles'
import { compactRupees, shortDate, tooltipStyle } from './chartFormat'

const RevenueTrend = ({ daily }) => {
  const data = daily.map(d => ({ ...d, revenue: Number(d.revenue) }))

  return (
    <section className={`${adminCard} p-5`}>
      <h2 className="text-lg font-bold text-ink-900">Daily revenue &amp; orders</h2>
      <p className="text-sm text-ink-500">Paid orders only</p>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#ecfdf5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 12, fill: '#5d6075' }} minTickGap={24} />
            <YAxis yAxisId="money" tickFormatter={compactRupees} tick={{ fontSize: 12, fill: '#5d6075' }} width={64} />
            <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: '#5d6075' }} width={32} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={shortDate}
              formatter={(value, name) => (name === 'Revenue' ? [formatPrice(value), name] : [value, name])}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} formatter={label => <span style={{ color: "#45485c" }}>{label}</span>} />
            <Bar isAnimationActive={false} yAxisId="count" dataKey="orders" name="Orders" fill="#fcd34d" radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Area isAnimationActive={false} yAxisId="money" type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2.5} fill="#10b981" fillOpacity={0.15} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default RevenueTrend
