// Editable list of rows (perks, footer links): edit, move up / down, remove, add
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { adminInput } from './adminStyles'

const iconButton = 'flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 hover:bg-ink-300/10 hover:text-ink-900 disabled:opacity-30'

const ListEditor = ({ rows, onChange, fields, columns, newRow, addLabel, max }) => {
  const update = (key, field, value) => onChange(rows.map(r => (r.key === key ? { ...r, [field]: value } : r)))
  const move = (index, step) => {
    const next = [...rows]
    ;[next[index], next[index + step]] = [next[index + step], next[index]] // swap with the neighbour
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className={`grid grid-cols-1 gap-2 rounded-2xl bg-brand-50/60 p-2 sm:items-center sm:bg-transparent sm:p-0 ${columns}`}>
          {fields.map(f => (
            <input
              key={f.name}
              value={row[f.name]}
              onChange={e => update(row.key, f.name, e.target.value)}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              required={f.required}
              aria-label={f.placeholder}
              className={`${adminInput} w-full min-w-0`}
            />
          ))}
          <div className="flex justify-end">
            <button type="button" title="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={iconButton}><ArrowUp size={16} /></button>
            <button type="button" title="Move down" disabled={index === rows.length - 1} onClick={() => move(index, 1)} className={iconButton}><ArrowDown size={16} /></button>
            <button type="button" title="Remove" onClick={() => onChange(rows.filter(r => r.key !== row.key))} className={`${iconButton} hover:bg-rose-50 hover:text-rose-600`}><X size={18} /></button>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-ink-400">Nothing here yet – this part is hidden on the shop.</p>}
      {rows.length < max && (
        <button type="button" onClick={() => onChange([...rows, { key: crypto.randomUUID(), ...newRow }])} className="flex items-center gap-1 text-sm font-bold text-brand-700">
          <Plus size={16} /> {addLabel}
        </button>
      )}
    </div>
  )
}

export default ListEditor
