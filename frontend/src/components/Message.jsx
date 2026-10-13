// Empty / error / info box used on many pages
const styles = {
  info: 'border-brand-100 bg-white text-ink-600',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
}

const Message = ({ icon = 'ℹ️', title, children, type = 'info' }) => (
  <div className={`rounded-3xl border-2 border-dashed p-10 text-center ${styles[type]}`}>
    <div className="text-5xl">{icon}</div>
    <h2 className="mt-3 text-xl font-bold">{title}</h2>
    {children && <div className="mt-2 text-sm">{children}</div>}
  </div>
)

export default Message
