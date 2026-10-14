import { useState } from 'react'

// Type a code → the parent re-asks the server for a quote with that code
const CouponBox = ({ applied, error, onApply, onRemove }) => {
  const [code, setCode] = useState('')

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-200">
        <span className="font-bold text-brand-800">🏷️ {applied} applied</span>
        <button onClick={onRemove} className="font-semibold text-ink-500 hover:text-rose-600">Remove</button>
      </div>
    )
  }

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (code.trim()) onApply(code.trim().toUpperCase())
        }}
        className="flex gap-2"
      >
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" className="min-w-0 flex-1 rounded-full border-2 border-brand-100 px-4 py-2 text-sm uppercase outline-none focus:border-brand-400" />
        <button className="rounded-full bg-mango-500 px-4 py-2 text-sm font-bold text-white hover:bg-mango-600">Apply</button>
      </form>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}

export default CouponBox
