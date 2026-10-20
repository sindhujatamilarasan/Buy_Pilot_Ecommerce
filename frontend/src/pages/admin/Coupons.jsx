import { useState } from 'react'
import { deleteCoupon, getCoupons, updateCoupon } from '../../api/manage'
import CouponForm from '../../components/admin/CouponForm'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { formatPrice } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'

const Coupons = () => {
  const [version, setVersion] = useState(0)
  const { data: coupons, loading } = useApi(getCoupons, version)
  const reload = () => setVersion(v => v + 1)

  const toggle = async coupon => {
    await updateCoupon(coupon.id, { is_active: !coupon.is_active })
    reload()
  }

  const { confirm, dialog } = useConfirm()

  const remove = async coupon => {
    const ok = await confirm({ title: `Delete coupon ${coupon.code}?`, message: 'Customers will no longer be able to use this code. Orders that already used it are not changed.', confirmLabel: 'Delete coupon', cancelLabel: 'Keep it' })
    if (!ok) return
    await deleteCoupon(coupon.id)
    reload()
  }

  const status = c => (c.is_expired ? ['Expired', 'bg-ink-300/20 text-ink-500'] : c.is_active ? ['Active', 'bg-brand-100 text-brand-800'] : ['Paused', 'bg-mango-100 text-mango-600'])

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader title="Coupons" subtitle="Flat or % discounts · minimum order · expiry · one use per customer" />

      <div className={`${adminCard} p-6`}><CouponForm onCreated={reload} /></div>

      {loading ? <Spinner /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map(coupon => {
            const [label, colour] = status(coupon)
            return (
              <div key={coupon.id} className={`${adminCard} p-5`}>
                <div className="flex items-start justify-between">
                  <p className="rounded-xl border-2 border-dashed border-mango-400 bg-mango-100 px-3 py-1 font-mono text-lg font-bold text-ink-900">{coupon.code}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${colour}`}>{label}</span>
                </div>
                <p className="mt-4 font-display text-2xl font-extrabold text-ink-900">
                  {coupon.type === 'percent' ? `${Number(coupon.value)}% off` : `${formatPrice(coupon.value)} off`}
                </p>
                <p className="text-sm text-ink-500">
                  Min order {formatPrice(coupon.min_order)} · {coupon.expires_at ? `till ${new Date(coupon.expires_at).toLocaleDateString('en-IN')}` : 'no expiry'}
                </p>
                <p className="mt-1 text-xs text-ink-400">Used {coupon.times_used} times</p>
                <div className="mt-4 flex gap-4 text-sm font-bold">
                  <button onClick={() => toggle(coupon)} className="text-brand-700">{coupon.is_active ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => remove(coupon)} className="text-ink-400 hover:text-rose-600">Delete</button>
                </div>
              </div>
            )
          })}
          {coupons.length === 0 && <p className="text-ink-500">No coupons yet – create your first one above.</p>}
        </div>
      )}
    </div>
  )
}

export default Coupons
