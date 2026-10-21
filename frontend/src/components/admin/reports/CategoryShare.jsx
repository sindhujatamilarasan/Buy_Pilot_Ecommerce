// Revenue share per category – donut + a readable list (the list is what screen readers use)
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useThemeColors } from '../../../hooks/useSite'
import { formatPrice } from '../../../utils/format'
import { adminCard } from '../adminStyles'
import { paletteFor, tooltipStyle } from './chartFormat'

const CategoryShare = ({ categories }) => {
  const data = categories.map(c => ({ ...c, revenue: Number(c.revenue) }))
  const total = data.reduce((sum, c) => sum + c.revenue, 0) || 1
  const palette = paletteFor(useThemeColors())

  return (
    <section className={`${adminCard} p-5`}>
      <h2 className="text-lg font-bold text-ink-900">Revenue by category</h2>
      <div className="mt-2 grid items-center gap-4 sm:grid-cols-2">
        <div className="h-56" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie isAnimationActive={false} data={data} dataKey="revenue" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
                {data.map((row, index) => <Cell key={row.name} fill={palette[index % palette.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={value => formatPrice(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-sm">
          {data.map((row, index) => (
            <li key={row.name} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />
              <span className="flex-1 truncate font-semibold text-ink-700">{row.name}</span>
              <span className="text-ink-500">{Math.round((row.revenue / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default CategoryShare
