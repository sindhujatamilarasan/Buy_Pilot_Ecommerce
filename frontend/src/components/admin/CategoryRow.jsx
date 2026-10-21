// One category in the admin list: shows the name, or an input while renaming
import { useState } from 'react'
import { categoryStyle } from '../../utils/categoryStyle'
import { adminInput } from './adminStyles'

const CategoryRow = ({ category, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)

  const save = async e => {
    e.preventDefault()
    if (await onRename(category, name)) setEditing(false) // stay open if the server said no
  }

  return (
    <tr className="hover:bg-[#f6f8f7]">
      <td className="px-5 py-3">
        {editing ? (
          <form onSubmit={save} className="flex flex-wrap items-center gap-2">
            <input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} aria-label="Category name" className={`${adminInput} w-56`} />
            <button className="text-sm font-bold text-brand-700">Save</button>
            <button type="button" onClick={() => { setEditing(false); setName(category.name) }} className="text-sm font-bold text-ink-400">Cancel</button>
          </form>
        ) : (
          <span className="font-semibold text-ink-900">{categoryStyle(category.slug).emoji} {category.name}</span>
        )}
      </td>
      <td className="hidden px-5 py-3 font-mono text-xs text-ink-500 sm:table-cell">{category.slug}</td>
      <td className="px-5 py-3 text-ink-700">{category.product_count}</td>
      <td className="px-5 py-3">
        {!editing && (
          <div className="flex justify-end gap-4 text-sm font-bold">
            <button onClick={() => setEditing(true)} className="text-brand-700">Rename</button>
            <button onClick={() => onDelete(category)} className="text-ink-400 hover:text-rose-600">Delete</button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default CategoryRow
