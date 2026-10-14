// placed → packed → shipped → delivered, with the time each step happened (from the status logs)
const STEPS = [
  { status: 'placed', label: 'Placed', icon: '🧾' },
  { status: 'packed', label: 'Packed', icon: '📦' },
  { status: 'shipped', label: 'Shipped', icon: '🚚' },
  { status: 'delivered', label: 'Delivered', icon: '🏠' },
]

const formatTime = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const StatusTimeline = ({ order }) => {
  if (order.status === 'cancelled') {
    const log = order.logs.findLast(l => l.status === 'cancelled')
    return (
      <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
        ❌ <b>Cancelled</b> {log && `on ${formatTime(log.created_at)} – ${log.note}`}
      </div>
    )
  }

  const reached = STEPS.findIndex(step => step.status === order.status) // -1 = waiting for payment

  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const done = index <= reached
        const log = order.logs.find(l => l.status === step.status)
        return (
          <li key={step.status} className="relative text-center">
            {index > 0 && <span className={`absolute right-1/2 top-5 h-1 w-full -translate-y-1/2 ${done ? 'bg-brand-400' : 'bg-brand-100'}`} />}
            <span className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg ${done ? 'bg-brand text-white shadow-md' : 'bg-brand-50 grayscale'}`}>
              {step.icon}
            </span>
            <p className={`mt-2 text-xs font-bold ${done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</p>
            {log && <p className="text-[11px] text-ink-400">{formatTime(log.created_at)}</p>}
          </li>
        )
      })}
    </ol>
  )
}

export default StatusTimeline
