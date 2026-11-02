// Stock adjustments. A warehouse manager's request waits for a store admin to approve or reject it.
import { Check, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { decideAdjustment, getAdjustments, getWarehouses } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Pagination from '../../components/admin/Pagination'
import AdjustmentForm from '../../components/inventory/AdjustmentForm'
import StatusPill from '../../components/inventory/StatusPill'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { getErrorMessage } from '../../utils/format'

const TABS = [['pending', 'Waiting for approval'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]

const Adjustments = () => {
  const { user } = useAuth()
  const isAdmin = user.role !== 'warehouse'
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'pending')
  const [adding, setAdding] = useState(false)
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const warehouses = useApi(getWarehouses)
  const { data, loading, error } = useApi(getAdjustments, { status, page }, version)
  const { confirm, notify, dialog } = useConfirm()

  const decide = async (a, action) => {
    const verb = action === 'approve' ? 'Approve' : 'Reject'
    const ok = await confirm({ title: `${verb} this adjustment?`, message: `${a.change > 0 ? '+' : ''}${a.change} × ${a.product} in ${a.warehouse_name}`, confirmLabel: verb, tone: action === 'approve' ? 'info' : 'danger' })
    if (!ok) return
    try {
      await decideAdjustment(a.id, action)
      setVersion(v => v + 1)
    } catch (err) {
      notify(getErrorMessage(err), `Could not ${action}`)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Adjustments" subtitle="Damaged, lost or found stock and count corrections">
        {!adding && <button onClick={() => setAdding(true)} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><SlidersHorizontal size={16} /> Adjust stock</button>}
      </PageHeader>

      {adding && warehouses.data && (
        <AdjustmentForm warehouses={warehouses.data} needsApproval={!isAdmin} onCancel={() => setAdding(false)}
          onDone={a => { setAdding(false); setStatus(a.status); setPage(1); setVersion(v => v + 1) }} />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(1) }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${status === value ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-300/30'}`}>{label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : error ? <LoadError what="adjustments" onRetry={() => setVersion(v => v + 1)} /> : (
        <>
          <div className={`${adminCard} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Warehouse</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No adjustments here.</td></tr>}
                {data.results.map(a => (
                  <tr key={a.id} className="hover:bg-[#f6f8f7]">
                    <td className="px-5 py-3"><p className="font-semibold text-ink-900">{a.product}</p><p className="text-xs text-ink-400">{a.sku} · by {a.requested_by_name}</p></td>
                    <td className="px-5 py-3 text-ink-600">{a.warehouse_name}</td>
                    <td className={`px-5 py-3 font-bold ${a.change > 0 ? 'text-brand-700' : 'text-rose-600'}`}>{a.change > 0 ? `+${a.change}` : a.change}</td>
                    <td className="px-5 py-3"><p className="text-ink-700">{a.reason_label}</p>{a.note && <p className="text-xs text-ink-400">{a.note}</p>}</td>
                    <td className="px-5 py-3"><StatusPill status={a.status} label={a.status_label} />{a.decided_by_name && <p className="mt-1 text-xs text-ink-400">by {a.decided_by_name}</p>}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {a.status === 'pending' && isAdmin && (
                        <>
                          <button onClick={() => decide(a, 'approve')} title="Approve" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"><Check size={18} /></button>
                          <button onClick={() => decide(a, 'reject')} title="Reject" className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600"><X size={18} /></button>
                        </>
                      )}
                    </td>
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

export default Adjustments
