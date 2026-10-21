// Top 5 products by revenue – horizontal bars
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useThemeColors } from '../../../hooks/useSite'
import { formatPrice } from '../../../utils/format'
import { shade } from '../../../utils/themes'
import Message from '../../Message'
import { adminCard } from '../adminStyles'
import { compactRupees, paletteFor, tooltipStyle } from './chartFormat'

const shorten = name => (name.length > 22 ? `${name.slice(0, 21)}…` : name)

const TopProducts = ({ products }) => {
  const data = products.map(p => ({ ...p, revenue: Number(p.revenue) }))
  const theme = useThemeColors()
  const palette = paletteFor(theme)

  return (
    <section className={`${adminCard} p-5`}>
      <h2 className="text-lg font-bold text-ink-900">Top products</h2>
      <p className="text-sm text-ink-500">By revenue</p>
      {data.length === 0 ? (
        <div className="mt-4"><Message icon="📦" title="No sales in this period" /></div>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={compactRupees} tick={{ fontSize: 12, fill: '#5d6075' }} />
              <YAxis type="category" dataKey="product_name" tickFormatter={shorten} width={170} tick={{ fontSize: 12, fill: '#33364a' }} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: shade(theme, 50) }}
                formatter={(value, _name, item) => [`${formatPrice(value)} · ${item.payload.units} sold`, 'Revenue']}
              />
              <Bar isAnimationActive={false} dataKey="revenue" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {data.map((row, index) => <Cell key={row.product_name} fill={palette[index % palette.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default TopProducts
