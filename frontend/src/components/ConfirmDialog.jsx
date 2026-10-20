// A styled replacement for window.confirm / window.alert.
// Uses the real HTML <dialog>: showModal() traps keyboard focus, Esc closes it,
// and screen readers announce it as a dialog.
import { AlertTriangle, Info } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

const TONES = {
  danger: { icon: AlertTriangle, bubble: 'bg-rose-100 text-rose-600', button: 'bg-rose-600 hover:bg-rose-700' },
  info: { icon: Info, bubble: 'bg-brand-100 text-brand-700', button: 'bg-brand-700 hover:bg-brand-800' },
}

const ConfirmDialog = ({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', hideCancel = false, onConfirm, onCancel,
}) => {
  const ref = useRef(null)
  const titleId = useId()
  const { icon: Icon, bubble, button } = TONES[tone]

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.open && dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={e => {
        e.preventDefault() // Esc key → treat like the Cancel button
        onCancel()
      }}
      onClick={e => e.target === ref.current && onCancel()} // click on the dark backdrop
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl p-0 shadow-2xl backdrop:bg-ink-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex gap-4 p-6">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bubble}`}><Icon size={22} /></span>
        <div>
          <h2 id={titleId} className="text-lg font-extrabold text-ink-900">{title}</h2>
          {message && <p className="mt-1 text-sm leading-relaxed text-ink-600">{message}</p>}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-3 bg-[#f6f8f7] px-6 py-4">
        {!hideCancel && (
          // autoFocus on the SAFE choice, so pressing Enter by mistake does not delete anything
          <button autoFocus onClick={onCancel} className="rounded-full px-5 py-2.5 text-sm font-bold text-ink-700 ring-1 ring-ink-300/40 hover:bg-white">
            {cancelLabel}
          </button>
        )}
        <button autoFocus={hideCancel} onClick={onConfirm} className={`rounded-full px-5 py-2.5 text-sm font-bold text-white ${button}`}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
