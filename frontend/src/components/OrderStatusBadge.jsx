const STYLES = {
  pending_payment: 'bg-mango-100 text-mango-600',
  placed: 'bg-sky-100 text-sky-700',
  packed: 'bg-violet-100 text-violet-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-brand-100 text-brand-800',
  cancelled: 'bg-rose-100 text-rose-700',
}

const OrderStatusBadge = ({ status, label }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STYLES[status] || 'bg-ink-300/20 text-ink-600'}`}>{label}</span>
)

export default OrderStatusBadge
