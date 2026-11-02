// <select> of the active warehouses. `warehouses` comes from getWarehouses().
import { adminInput } from '../admin/adminStyles'

const WarehouseSelect = ({ warehouses, value, onChange, placeholder = 'Choose warehouse…', allLabel, exclude, required = true }) => (
  <select value={value} onChange={e => onChange(e.target.value)} required={required} className={`${adminInput} w-full`}>
    <option value="">{allLabel || placeholder}</option>
    {warehouses.filter(w => w.is_active && String(w.id) !== String(exclude)).map(w => (
      <option key={w.id} value={w.id}>{w.name} ({w.code}){w.store_name && warehouses.some(x => x.store !== w.store) ? ` · ${w.store_name}` : ''}</option>
    ))}
  </select>
)

export default WarehouseSelect
