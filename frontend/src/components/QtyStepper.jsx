// − 2 +  buttons. "+" is disabled at the stock limit.
const QtyStepper = ({ value, max, onChange }) => (
  <div className="inline-flex items-center rounded-full border-2 border-brand-100 bg-white">
    <button
      type="button"
      onClick={() => onChange(value - 1)}
      disabled={value <= 1}
      className="h-9 w-9 rounded-full text-lg font-bold text-brand-700 hover:bg-brand-50 disabled:text-ink-300 disabled:hover:bg-transparent"
    >
      −
    </button>
    <span className="w-8 text-center font-bold text-ink-900">{value}</span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      title={value >= max ? `Only ${max} in stock` : undefined}
      className="h-9 w-9 rounded-full text-lg font-bold text-brand-700 hover:bg-brand-50 disabled:text-ink-300 disabled:hover:bg-transparent"
    >
      +
    </button>
  </div>
)

export default QtyStepper
