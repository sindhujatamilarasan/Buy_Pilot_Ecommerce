// Stock per warehouse. Quantities change only through receipts, adjustments and transfers;
// here you can set the reorder level and the shelf (bin), and export a CSV.
import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadCsv, getStock, getWarehouses, updateStockRow } from '../../api/inventory'
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

const qtyStyle = row => (row.quantity === 0 ? 'bg-rose-50 text-rose-700' : row.is_low ? 'bg-mango-100 text-mango-600' : 'bg-brand-50 text-brand-700')

const Stock = () => {
  const [params] = useSearchParams()
  const [warehouse, setWarehouse] = useState('')
  const [text, setText] = useState('')
  const [lowOnly, setLowOnly] = useState(params.get('low') === '1')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const search = useDebounce(text, 400)
  const filters = { warehouse, search, low: lowOnly ? 1 : '' }
  const warehouses = useApi(getWarehouses)
  const { data, loading, error } = useApi(getStock, { ...filters, page }, version)
  const { notify, dialog } = useConfirm()

  // Save reorder level / bin when the box loses focus (only if it changed)
  const save = async (row, field, value) => {
    if (String(row[field]) === String(value)) return
    try {
      await updateStockRow(row.id, { [field]: value })
      setVersion(v => v + 1)
    } catch (err) {
      notify(getErrorMessage(err), 'Could not save')
    }
  }

  const exportCsv = () => downloadCsv('stock.csv', filters, 'stock-levels.csv').catch(err => notify(getErrorMessage(err), 'Export failed'))
  const filter = setter => value => { setter(value); setPage(1) }

  return (
    <div className="space-y-5">
      <PageHeader title="Stock levels" subtitle="Every product in every warehouse">
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink-700 ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]"><Download size={16} /> Export CSV</button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56"><WarehouseSelect warehouses={warehouses.data || []} value={warehouse} onChange={filter(setWarehouse)} allLabel="All warehouses" required={false} /></div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={text} onChange={e => filter(setText)(e.target.value)} placeholder="Product or SKU…" className={`${adminInput} pl-9`} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={lowOnly} onChange={e => filter(setLowOnly)(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Low stock only
        </label>
      </div>

      {loading ? <Spinner /> : error ? <LoadError what="stock" onRetry={() => setVersion(v => v + 1)} /> : (
        <>
          <div className={`${adminCard} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Warehouse</th><th className="px-5 py-3">In stock</th><th className="px-5 py-3">Reorder at</th><th className="px-5 py-3">Bin / shelf</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No stock rows match.</td></tr>}
                {data.results.map(row => (
                  <tr key={row.id} className="hover:bg-[#f6f8f7]">
                    <td className="px-5 py-3"><p className="max-w-[280px] truncate font-semibold text-ink-900">{row.product}</p><p className="text-xs text-ink-400">{row.sku} · {row.variant_label}</p></td>
                    <td className="px-5 py-3 text-ink-600">{row.warehouse_name}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${qtyStyle(row)}`}>{row.quantity}</span></td>
                    <td className="px-5 py-3"><input type="number" min="0" defaultValue={row.reorder_level} onBlur={e => save(row, 'reorder_level', e.target.value)} aria-label="Reorder level" className={`${adminInput} w-20`} /></td>
                    <td className="px-5 py-3"><input defaultValue={row.bin_location} maxLength={20} onBlur={e => save(row, 'bin_location', e.target.value.trim())} placeholder="e.g. A-03" aria-label="Bin" className={`${adminInput} w-28`} /></td>
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

export default Stock
