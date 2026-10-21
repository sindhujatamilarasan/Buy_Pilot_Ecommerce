// Super admin: categories shared by every store. Store admins can also add one from the product form.
import { useState } from 'react'
import { createCategory, deleteCategory, getAdminCategories, renameCategory } from '../../api/manage'
import CategoryRow from '../../components/admin/CategoryRow'
import PageHeader from '../../components/admin/PageHeader'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useConfirm } from '../../hooks/useConfirm'
import { getErrorMessage } from '../../utils/format'

const Categories = () => {
  const [version, setVersion] = useState(0)
  const { data: categories, loading, error } = useApi(getAdminCategories, version)
  const reload = () => setVersion(v => v + 1)
  const [name, setName] = useState('')
  const [message, setMessage] = useState(null) // { ok, text }
  const { confirm, dialog } = useConfirm()

  const add = async e => {
    e.preventDefault()
    try {
      const category = await createCategory(name)
      setMessage({ ok: true, text: `"${category.name}" added.` })
      setName('')
      reload()
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err) })
    }
  }

  // Returns true when saved, so the row can close its input
  const rename = async (category, newName) => {
    try {
      await renameCategory(category.id, newName)
      setMessage(null)
      reload()
      return true
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err) })
      return false
    }
  }

  const remove = async category => {
    const ok = await confirm({ title: `Delete "${category.name}"?`, message: 'It disappears from the shop menu and the product form.', confirmLabel: 'Delete category', cancelLabel: 'Keep it' })
    if (!ok) return
    try {
      await deleteCategory(category.id)
      setMessage({ ok: true, text: `"${category.name}" deleted.` })
      reload()
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err) }) // e.g. it still has products
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader title="Categories" subtitle="Shared by every store · renaming keeps old links working" />

      <form onSubmit={add} className={`${adminCard} flex flex-wrap items-end gap-3 p-6`}>
        <label className="min-w-0 flex-1 text-xs font-bold text-ink-500">New category
          <input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Toys & Games" className={`${adminInput} mt-1 w-full`} />
        </label>
        <button className="bg-brand rounded-full px-6 py-2.5 text-sm font-bold text-white">+ Add</button>
      </form>

      {message && <p className={`text-sm font-semibold ${message.ok ? 'text-brand-700' : 'text-rose-600'}`}>{message.text}</p>}

      {loading ? <Spinner /> : error ? <LoadError what="categories" onRetry={reload} /> : (
        <div className={`${adminCard} overflow-hidden`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f8f7] text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="hidden px-5 py-3 sm:table-cell">In links as</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/20">
              {categories.map(category => (
                <CategoryRow key={category.id} category={category} onRename={rename} onDelete={remove} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Categories
