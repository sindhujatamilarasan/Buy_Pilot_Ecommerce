// Stock transfers: requested → approved → in transit → received
import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTransferCounts, getTransfers, getWarehouses, transferAction } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Pagination from '../../components/admin/Pagination'
import StatusPill from '../../components/inventory/StatusPill'
import TransferForm from '../../components/inventory/TransferForm'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { getErrorMessage } from '../../utils/format'

const TABS = [['requested', 'To approve'], ['approved', 'To dispatch'], ['in_transit', 'In transit'], ['received', 'Received'], ['', 'All']]
// Waits (does nothing) until we know which tab to open
const loadTransfers = params => (params ? getTransfers(params) : Promise.resolve(null))
const date = iso => iso && new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

const Transfers = () => {
  const { user } = useAuth()
  const isAdmin = user.role !== 'warehouse'
  // A manager tied to one warehouse: dispatch / cancel belong to the sending warehouse, receive to the receiving one
  const ownsSide = (t, side) => !user.warehouse || user.warehouse === t[`${side}_warehouse`]
  const [params] = useSearchParams()
  const [picked, setPicked] = useState(params.get('status'))  // the tab the user clicked (none yet → the one that needs them)
  const [adding, setAdding] = useState(params.get('new') === '1')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const warehouses = useApi(getWarehouses, { targets: 1 }) // every warehouse of the store (the "To" list)
  const counts = useApi(getTransferCounts, undefined, version)
  // Open on the tab with work waiting: a warehouse manager → stock to receive, then to dispatch; an admin → to approve first
  const order = isAdmin ? ['requested', 'in_transit', 'approved'] : ['in_transit', 'approved', 'requested']
  const status = picked ?? (counts.data ? order.find(tab => counts.data[tab] > 0) ?? '' : null)
  const setStatus = value => setPicked(value)
  const { data, loading, error } = useApi(loadTransfers, status === null ? null : { status, page }, version)
  const { confirm, notify, dialog } = useConfirm()

  const act = async (transfer, action, question) => {
    if (question && !(await confirm({ title: question, confirmLabel: 'Yes', cancelLabel: 'No', tone: action === 'reject' || action === 'cancel' ? 'danger' : 'info' }))) return
    try {
      await transferAction(transfer.id, action)
      setVersion(v => v + 1)
    } catch (err) {
      notify(getErrorMessage(err), `Could not ${action} ${transfer.number}`)
    }
  }

  const buttons = t => [
    t.status === 'requested' && isAdmin && ['approve', 'Approve', null, true],
    t.status === 'requested' && isAdmin && ['reject', 'Reject', `Reject ${t.number}?`],
    t.status === 'approved' && ownsSide(t, 'from') && ['dispatch', 'Dispatch', `Dispatch ${t.number}? Stock leaves ${t.from_name} now.`, true],
    t.status === 'in_transit' && ownsSide(t, 'to') && ['receive', 'Receive', `Mark ${t.number} as received in ${t.to_name}?`, true],
    ['requested', 'approved'].includes(t.status) && ownsSide(t, 'from') && ['cancel', 'Cancel', `Cancel ${t.number}?`],
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      <PageHeader title="Transfers" subtitle="Move stock between your warehouses">
        {!adding && <button onClick={() => setAdding(true)} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><ArrowLeftRight size={16} /> New transfer</button>}
      </PageHeader>

      {adding && warehouses.data && (
        <TransferForm warehouses={warehouses.data} needsApproval={!isAdmin} onCancel={() => setAdding(false)}
          onDone={t => { setAdding(false); setStatus(t.status); setPage(1); setVersion(v => v + 1) }} />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(1) }} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${status === value ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-300/30'}`}>
            {label}
            {counts.data?.[value] > 0 && <span className="rounded-full bg-mango-500 px-2 py-0.5 text-[11px] font-bold leading-none text-white">{counts.data[value]}</span>}
          </button>
        ))}
      </div>

      {loading || status === null ? <Spinner /> : error ? <LoadError what="transfers" onRetry={() => setVersion(v => v + 1)} /> : (
        <>
          {data.results.length === 0 && <p className={`${adminCard} p-10 text-center text-sm text-ink-400`}>No transfers here.</p>}
          {data.results.map(t => (
            <div key={t.id} className={`${adminCard} flex flex-wrap items-start gap-4 p-5`}>
              <div className="min-w-[150px]">
                <p className="font-bold text-ink-900">{t.number}</p>
                <p className="text-xs text-ink-400">by {t.requested_by_name} · {date(t.created_at)}</p>
                <div className="mt-2"><StatusPill status={t.status} label={t.status_label} /></div>
              </div>
              <div className="min-w-[220px] flex-1 text-sm">
                <p className="flex items-center gap-2 font-semibold text-ink-800">{t.from_name} <ArrowRight size={15} className="text-ink-400" /> {t.to_name}</p>
                {t.lines.map(l => <p key={l.sku} className="text-ink-600">{l.product} <span className="text-ink-400">({l.label}) × {l.qty}</span></p>)}
                {t.note && <p className="mt-1 text-xs text-ink-400">“{t.note}”</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {buttons(t).map(([action, label, question, primary]) => (
                  <button key={action} onClick={() => act(t, action, question)} className={primary ? 'bg-brand rounded-full px-4 py-2 text-xs font-bold text-white' : 'rounded-full px-3 py-2 text-xs font-semibold text-ink-500 ring-1 ring-ink-300/30 hover:text-rose-600'}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          <Pagination page={page} count={data.count} onChange={setPage} />
        </>
      )}
      {dialog}
    </div>
  )
}

export default Transfers
