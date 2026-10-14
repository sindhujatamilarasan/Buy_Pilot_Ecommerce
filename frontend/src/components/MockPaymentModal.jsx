// Development-only payment screen, used when no Razorpay keys are set in backend/.env
import { formatPrice } from '../utils/format'

const MockPaymentModal = ({ orderId, amount, onResult }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="bg-brand-soft p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Test payment</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{formatPrice(amount)}</p>
        <p className="text-sm text-ink-500">Order #{orderId}</p>
      </div>
      <div className="space-y-3 p-6">
        <p className="text-sm text-ink-600">
          No Razorpay keys are set, so this is a <b>pretend</b> payment. No money is used.
        </p>
        <button onClick={() => onResult('success')} className="bg-brand w-full rounded-full py-3 font-bold text-white">
          ✅ Pay successfully
        </button>
        <button onClick={() => onResult('failure')} className="w-full rounded-full border-2 border-rose-200 py-3 font-bold text-rose-600 hover:bg-rose-50">
          ❌ Make payment fail
        </button>
      </div>
    </div>
  </div>
)

export default MockPaymentModal
