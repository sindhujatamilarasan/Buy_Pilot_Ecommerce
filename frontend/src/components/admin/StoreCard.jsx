// One store on the super admin's Stores page: numbers, team, active switch, "add admin"
import { Package, ReceiptText, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLE_LABEL } from '../../utils/roles'
import AddStoreAdminForm from './AddStoreAdminForm'
import { adminCard } from './adminStyles'

const StoreCard = ({ store, onToggleActive, onAdminAdded }) => {
  const [adding, setAdding] = useState(false)

  return (
    <article className={`${adminCard} p-5 ${store.is_active ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-ink-900">{store.name}</h2>
          <p className="text-sm text-ink-500">{store.description || 'No description'}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-600">
          <input type="checkbox" checked={store.is_active} onChange={() => onToggleActive(store)} className="h-4 w-4 accent-brand-600" />
          {store.is_active ? 'Open' : 'Closed (hidden from shop)'}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to={`/admin/products?store=${store.slug}`} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 font-semibold text-brand-800"><Package size={16} /> {store.products} products</Link>
        <span className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 font-semibold text-sky-700"><ReceiptText size={16} /> {store.orders} orders</span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Team</p>
        {store.admins.length === 0 ? (
          <p className="mt-1 text-sm text-mango-600">No admin yet – add one so this store can be managed.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {store.admins.map(person => (
              <li key={person.id} className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-ink-800">{person.name || person.email}</span>
                <span className="text-ink-400">{person.email}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${person.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>{ROLE_LABEL[person.role]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding ? (
        <AddStoreAdminForm store={store} onCancel={() => setAdding(false)} onDone={message => { setAdding(false); onAdminAdded(message) }} />
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
          <UserPlus size={16} /> Add store admin
        </button>
      )}
    </article>
  )
}

export default StoreCard
