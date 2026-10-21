// Sales report: KPIs, daily revenue chart, top products, revenue by category, order statuses.
// The range lives in the URL (?days=30) so the report can be refreshed or shared.
import { IndianRupee, Package, ReceiptText, ShoppingBag } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { getSalesReport } from '../../api/manage'
import PageHeader from '../../components/admin/PageHeader'
import CategoryShare from '../../components/admin/reports/CategoryShare'
import RevenueTrend from '../../components/admin/reports/RevenueTrend'
import TopProducts from '../../components/admin/reports/TopProducts'
import { shortDate } from '../../components/admin/reports/chartFormat'
import Message from '../../components/Message'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { useApi } from '../../hooks/useApi'
import { formatPrice } from '../../utils/format'

const RANGES = [7, 30, 90]

// 'pending_payment' → 'Pending payment'
const statusLabel = status => status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

// "+12.5% vs previous 30 days" (or a plain note when there is nothing to compare)
const changeText = (value, days) =>
  value === null ? `No sales in the ${days} days before` : `${value > 0 ? '+' : ''}${value}% vs previous ${days} days`

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const days = RANGES.includes(Number(searchParams.get('days'))) ? Number(searchParams.get('days')) : 30
  const { data, loading, error } = useApi(getSalesReport, days)

  return (
    <div className="space-y-6">
      <PageHeader title="Sales report" subtitle={data ? `${shortDate(data.start)} – ${shortDate(data.end)} · paid orders` : 'Paid orders'}>
        <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink-300/20" role="group" aria-label="Date range">
          {RANGES.map(range => (
            <button
              key={range}
              onClick={() => setSearchParams({ days: String(range) })}
              aria-pressed={range === days}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${range === days ? 'bg-brand text-white shadow' : 'text-ink-600 hover:bg-brand-50'}`}
            >
              {range} days
            </button>
          ))}
        </div>
      </PageHeader>

      {loading && <Spinner />}
      {error && <Message type="error" icon="⚠️" title="Could not load the report" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={IndianRupee} label="Revenue" value={formatPrice(Math.round(data.summary.revenue))} hint={changeText(data.summary.revenue_change, days)} tone="brand" />
            <StatCard icon={ReceiptText} label="Orders" value={data.summary.orders} hint={changeText(data.summary.orders_change, days)} tone="sky" />
            <StatCard icon={ShoppingBag} label="Average order" value={formatPrice(Math.round(data.summary.avg_order))} hint="Revenue ÷ orders" tone="mango" />
            <StatCard icon={Package} label="Items sold" value={data.summary.items_sold} hint="Units across all orders" tone="violet" />
          </div>

          <RevenueTrend daily={data.daily} />

          <div className="grid gap-6 lg:grid-cols-2">
            <TopProducts products={data.top_products} />
            <CategoryShare categories={data.by_category} />
          </div>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-300/20">
            <h2 className="text-lg font-bold text-ink-900">Orders by status</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {data.statuses.map(row => (
                <span key={row.status} className="flex items-center gap-2 rounded-2xl bg-[#f6f8f7] px-3 py-2 text-sm font-bold text-ink-800">
                  <OrderStatusBadge status={row.status} label={statusLabel(row.status)} /> {row.count}
                </span>
              ))}
            </div>
          </section>

          {/* The same daily numbers as text – accessible and easy to check */}
          <details className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-300/20">
            <summary className="cursor-pointer text-sm font-bold text-ink-700">Show daily numbers as a table</summary>
            <div className="mt-3 max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-ink-500">
                  <tr><th className="py-2">Date</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">Revenue</th></tr>
                </thead>
                <tbody>
                  {data.daily.map(row => (
                    <tr key={row.date} className="border-t border-ink-300/20">
                      <td className="py-2">{shortDate(row.date)}</td>
                      <td className="py-2 text-right">{row.orders}</td>
                      <td className="py-2 text-right font-semibold">{formatPrice(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

export default Reports
