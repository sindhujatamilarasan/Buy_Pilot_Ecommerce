// Shows size / colour buttons. Only combinations that exist can be picked.
const optionClass = (selected, disabled) =>
  `rounded-full border-2 px-5 py-2 text-sm font-bold transition ${
    selected
      ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200'
      : disabled
        ? 'cursor-not-allowed border-ink-300/40 text-ink-300 line-through'
        : 'border-brand-200 bg-white text-ink-700 hover:border-brand-400'
  }`

const unique = list => [...new Set(list.filter(Boolean))]

const VariantPicker = ({ variants, selected, onSelect }) => {
  const colors = unique(variants.map(v => v.color))
  const sizes = unique(variants.map(v => v.size))

  // Find the variant for a colour + size combination (if it exists)
  const find = (color, size) =>
    variants.find(v => (v.color || null) === (color || null) && (v.size || null) === (size || null))

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-700">Colour: {selected.color}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map(color => {
              const match = find(color, selected.size) || variants.find(v => v.color === color)
              return (
                <button key={color} onClick={() => onSelect(match)} className={optionClass(color === selected.color, false)}>
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-700">Size: {selected.size}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map(size => {
              const match = find(selected.color, size)
              return (
                <button
                  key={size}
                  disabled={!match}
                  onClick={() => onSelect(match)}
                  className={optionClass(size === selected.size, !match)}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default VariantPicker
