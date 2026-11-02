// Goods receipts: stock that arrived from suppliers
import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getReceipts, getWarehouses } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Pagination from '../../components/admin/Pagination'
import ReceiptForm from '../../components/inventory/ReceiptForm'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'

const when = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const Receipts = () => {
  const [params] = useSearchParams()
  const [adding, setAdding] = useState(params.get('new') === '1')
  const [done, setDone] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const warehouses = useApi(getWarehouses)
  const { data, loading, error } = useApi(getReceipts, { page }, version)

  return (
    <div className="space-y-5">
      <PageHeader title="Goods receipts" subtitle="New stock from suppliers">
        {!adding && (
          <button onClick={() => { setAdding(true); setDone('') }} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md">
            <PackagePlus size={16} /> Receive goods
          </button>
        )}
      </PageHeader>

      {adding && warehouses.data && (
        <ReceiptForm
          warehouses={warehouses.data}
          onCancel={() => setAdding(false)}
          onDone={receipt => { setAdding(false); setDone(`${receipt.number} saved – stock added to ${receipt.warehouse_name}.`); setPage(1); setVersion(v => v + 1) }}
        />
      )}
      {done && <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">✓ {done}</p>}

      {loading ? <Spinner /> : error ? <LoadError what="receipts" onRetry={() => setVersion(v => v + 1)} /> : (
        <>
          <div className={`${adminCard} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Warehouse</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Received by</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No goods received yet.</td></tr>}
                {data.results.map(r => (
                  <tr key={r.id} className="align-top hover:bg-[#f6f8f7]">
                    <td className="px-5 py-3"><p className="font-bold text-ink-900">{r.number}</p><p className="text-xs text-ink-400">{when(r.created_at)}</p></td>
                    <td className="px-5 py-3 text-ink-600">{r.warehouse_name}</td>
                    <td className="px-5 py-3"><p className="font-semibold text-ink-800">{r.supplier}</p>{r.reference && <p className="text-xs text-ink-400">Ref. {r.reference}</p>}</td>
                    <td className="px-5 py-3 text-ink-600">{r.lines.map(l => <p key={l.sku}>{l.product} <span className="text-ink-400">× {l.qty}</span></p>)}</td>
                    <td className="px-5 py-3 text-ink-600">{r.received_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={data.count} onChange={setPage} />
        </>
      )}
    </div>
  )
}

export default Receipts
