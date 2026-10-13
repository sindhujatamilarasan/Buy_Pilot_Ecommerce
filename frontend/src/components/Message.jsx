// Empty / error / info box used on many pages
const styles = {
  info: 'border-ink-200 bg-sand-50 text-ink-600',
  error: 'border-red-200 bg-red-50 text-red-700',
}

const Message = ({ icon = 'ℹ️', title, children, type = 'info' }) => (
  <div className={`rounded-2xl border p-10 text-center ${styles[type]}`}>
    <div className="text-4xl">{icon}</div>
    <h2 className="mt-3 text-lg font-bold">{title}</h2>
    {children && <div className="mt-2 text-sm">{children}</div>}
  </div>
)

export default Message
