// Stock history (ledger): every change, who made it and the balance after it
import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { downloadCsv, getMovements, getWarehouses } from '../../api/inventory'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Pagination from '../../components/admin/Pagination'
import WarehouseSelect from '../../components/inventory/WarehouseSelect'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useConfirm } from '../../hooks/useConfirm'
import { useDebounce } from '../../hooks/useDebounce'
import { getErrorMessage } from '../../utils/format'

const KINDS = [['', 'All types'], ['receipt', 'Goods receipt'], ['sale', 'Sale'], ['return', 'Order cancelled'], ['adjustment', 'Adjustment'],
  ['transfer_out', 'Transfer out'], ['transfer_in', 'Transfer in'], ['opening', 'Opening stock']]

const Movements = () => {
  const [filters, setFilters] = useState({ warehouse: '', kind: '', from: '', to: '' })
  const [text, setText] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(text, 400)
  const query = { ...filters, search }
  const warehouses = useApi(getWarehouses)
  const { data, loading, error } = useApi(getMovements, { ...query, page })
  const { notify, dialog } = useConfirm()
  const set = field => value => { setFilters(f => ({ ...f, [field]: value })); setPage(1) }

  const exportCsv = () => downloadCsv('movements.csv', query, 'stock-movements.csv').catch(err => notify(getErrorMessage(err), 'Export failed'))

  return (
    <div className="space-y-5">
      <PageHeader title="Stock history" subtitle="Every stock change – nothing changes silently">
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink-700 ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]"><Download size={16} /> Export CSV</button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-52"><WarehouseSelect warehouses={warehouses.data || []} value={filters.warehouse} onChange={set('warehouse')} allLabel="All warehouses" required={false} /></div>
        <select value={filters.kind} onChange={e => set('kind')(e.target.value)} className={adminInput}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={text} onChange={e => { setText(e.target.value); setPage(1) }} placeholder="Product, SKU or reference…" className={`${adminInput} pl-9`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-600">From <input type="date" value={filters.from} onChange={e => set('from')(e.target.value)} className={adminInput} /></label>
        <label className="flex items-center gap-2 text-sm text-ink-600">To <input type="date" value={filters.to} onChange={e => set('to')(e.target.value)} className={adminInput} /></label>
      </div>

      {loading ? <Spinner /> : error ? <LoadError what="stock history" /> : (
        <>
          <div className={`${adminCard} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Warehouse</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Change</th><th className="px-5 py-3 text-right">Balance</th><th className="px-5 py-3">Reference</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-400">No stock changes match.</td></tr>}
                {data.results.map(m => (
                  <tr key={m.id} className="hover:bg-[#f6f8f7]">
                    <td className="whitespace-nowrap px-5 py-3 text-ink-600">{new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}<p className="text-xs text-ink-400">{m.created_by_name}</p></td>
                    <td className="px-5 py-3"><p className="max-w-[240px] truncate font-semibold text-ink-900">{m.product}</p><p className="text-xs text-ink-400">{m.sku}</p></td>
                    <td className="px-5 py-3 text-ink-600">{m.warehouse_name}</td>
                    <td className="px-5 py-3 text-ink-700">{m.kind_label}</td>
                    <td className={`px-5 py-3 text-right font-bold ${m.change > 0 ? 'text-brand-700' : 'text-rose-600'}`}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink-900">{m.balance_after}</td>
                    <td className="px-5 py-3"><p className="text-ink-700">{m.reference}</p>{m.note && <p className="max-w-[220px] truncate text-xs text-ink-400">{m.note}</p>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={data.count} onChange={setPage} />
        </>
      )}
      {dialog}
    </div>
  )
}

export default Movements
