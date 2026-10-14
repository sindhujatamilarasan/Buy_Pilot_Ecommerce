const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
)

export default PageHeader
