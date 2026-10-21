// Admin lists: "Showing 13–24 of 155" + Previous · 1 … 4 5 6 … 13 · Next
const PAGE_SIZE = 12 // must match PAGE_SIZE in the Django settings

// Which page numbers to show: always first + last, and the pages around the current one
const pageNumbers = (page, total) => {
  const wanted = new Set([1, total, page - 1, page, page + 1].filter(n => n >= 1 && n <= total))
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ['…', n] : [n]))
}

const button = 'min-w-9 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-ink-300/30 disabled:opacity-40'

const Pagination = ({ page, count, onChange }) => {
  if (!count) return null
  const total = Math.ceil(count / PAGE_SIZE)
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, count)

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
      <span className="text-ink-500">Showing <b className="text-ink-800">{from}–{to}</b> of <b className="text-ink-800">{count}</b></span>
      {total > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button disabled={page === 1} onClick={() => onChange(page - 1)} className={`${button} text-ink-700`}>Previous</button>
          {pageNumbers(page, total).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-ink-400">…</span>
            ) : (
              <button
                key={n}
                onClick={() => onChange(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`${button} ${n === page ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-700 hover:bg-[#f6f8f7]'}`}
              >
                {n}
              </button>
            ),
          )}
          <button disabled={page === total} onClick={() => onChange(page + 1)} className={`${button} text-ink-700`}>Next</button>
        </div>
      )}
    </nav>
  )
}

export default Pagination
