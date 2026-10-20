// Product form: which store sells this product.
// Super admin → chooses from all stores. Store admin → always their own store (shown, not editable).
import { getStores } from '../../api/manage'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { adminInput } from './adminStyles'

const noStores = () => Promise.resolve([])

const StoreSelect = ({ value, onChange }) => {
  const { user } = useAuth()
  const isSuper = user.role === 'superadmin'
  const { data: stores } = useApi(isSuper ? getStores : noStores)

  if (!isSuper) {
    return <p className="mt-4 text-sm font-semibold text-ink-700">Store <span className="mt-1 block rounded-xl bg-[#f6f8f7] px-3 py-2 font-bold text-ink-900">{user.store_name}</span></p>
  }

  return (
    <label className="mt-4 block text-sm font-semibold text-ink-700">Store
      <select required value={value} onChange={e => onChange(Number(e.target.value))} className={`${adminInput} mt-1 w-full`}>
        <option value="">Choose…</option>
        {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  )
}

export default StoreSelect
