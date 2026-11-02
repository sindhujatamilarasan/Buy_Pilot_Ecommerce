// Printable pick list for one order: which warehouse and shelf (bin) to take each item from.
// Opened from the Orders page by staff, warehouse managers and admins.
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getPickList } from '../../api/inventory'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { homeForRole } from '../../utils/roles'

const PickList = () => {
  const { orderId } = useParams()
  const { user } = useAuth()
  const { data, loading, error } = useApi(getPickList, orderId)
  const back = user.role === 'staff' ? '/staff/orders' : ['admin', 'superadmin'].includes(user.role) ? '/admin/orders' : homeForRole(user.role)

  if (loading) return <Spinner />
  if (error) return <div className="mx-auto max-w-3xl p-6"><LoadError what="this pick list" /></div>

  return (
    <div className="min-h-screen bg-[#f6f8f7] p-4 print:bg-white print:p-0 md:p-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-ink-300/20 print:rounded-none print:shadow-none print:ring-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link to={back} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800"><ArrowLeft size={16} /> Orders</Link>
          <button onClick={() => window.print()} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"><Printer size={16} /> Print</button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-300/30 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Pick list · {data.store}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-ink-900">Order #{data.order}</h1>
            <p className="text-sm text-ink-500">{new Date(data.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {data.status_label}</p>
          </div>
          <div className="text-sm text-ink-700">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Ship to</p>
            <p className="font-semibold">{data.ship_to.name} · {data.ship_to.phone}</p>
            <p>{data.ship_to.address}</p>
            <p>{data.ship_to.city} – {data.ship_to.pincode}</p>
          </div>
        </div>

        <table className="mt-5 w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            <tr><th className="py-2 pr-3">✓</th><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Pick from</th><th className="py-2 text-right">Qty</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-300/30">
            {data.items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="py-3 pr-3"><span className="inline-block h-5 w-5 rounded border-2 border-ink-300" /></td>
                <td className="py-3 pr-3"><p className="font-semibold text-ink-900">{item.product}</p><p className="text-xs text-ink-500">{item.sku} · {item.variant}</p></td>
                <td className="py-3 pr-3">
                  {item.picks.length === 0 && <span className="text-ink-400">Default warehouse</span>}
                  {item.picks.map(p => (
                    <p key={p.code} className="text-ink-700"><b>{p.warehouse}</b> ({p.code}){p.bin && <> · Bin <b>{p.bin}</b></>} {item.picks.length > 1 && <span className="text-ink-400">× {p.qty}</span>}</p>
                  ))}
                </td>
                <td className="py-3 text-right font-display text-lg font-extrabold text-ink-900">{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 border-t border-ink-300/30 pt-4 text-xs text-ink-400">
          Total items: <b className="text-ink-700">{data.items.reduce((n, i) => n + i.qty, 0)}</b> · Picked by: ____________________ · Packed by: ____________________
        </p>
      </div>
    </div>
  )
}

export default PickList
