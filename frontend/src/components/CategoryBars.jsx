// Simple horizontal bar chart: products per category (no chart library needed)
import { categoryStyle } from '../utils/categoryStyle'

const CategoryBars = ({ categories }) => {
  const max = Math.max(...categories.map(c => c.products), 1)

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <h2 className="text-lg font-bold text-ink-900">Products by category</h2>
      <div className="mt-5 space-y-3">
        {categories.map(category => (
          <div key={category.slug} className="grid grid-cols-[minmax(0,150px)_1fr_32px] items-center gap-3 text-sm">
            <span className="truncate font-semibold text-ink-700">
              {categoryStyle(category.slug).emoji} {category.name}
            </span>
            <div className="h-3 overflow-hidden rounded-full bg-ink-300/15">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${(category.products / max) * 100}%` }}
              />
            </div>
            <span className="text-right font-bold text-ink-900">{category.products}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoryBars
