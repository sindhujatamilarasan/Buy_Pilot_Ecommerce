const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-extrabold text-ink-900">{title}</h1>
      {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
    </div>
    {children}
  </div>
)

export default PageHeader
