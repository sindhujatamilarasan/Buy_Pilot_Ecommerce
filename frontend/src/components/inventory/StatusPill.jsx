// Coloured status badge for adjustments and transfers
const STYLES = {
  pending: 'bg-mango-100 text-mango-600',
  requested: 'bg-mango-100 text-mango-600',
  approved: 'bg-sky-50 text-sky-700',
  in_transit: 'bg-violet-50 text-violet-700',
  received: 'bg-brand-50 text-brand-800',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-ink-300/15 text-ink-500',
}

const StatusPill = ({ status, label }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STYLES[status] || STYLES.cancelled}`}>
    {label}
  </span>
)

export default StatusPill
