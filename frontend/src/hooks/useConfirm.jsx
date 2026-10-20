// Use the styled dialog like window.confirm, but with await:
//
//   const { confirm, notify, dialog } = useConfirm()
//   if (!(await confirm({ title: 'Delete coupon?', confirmLabel: 'Delete' }))) return
//   …and put {dialog} somewhere in the component's JSX.
import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

export const useConfirm = () => {
  const [request, setRequest] = useState(null) // the open dialog's options + its resolve()

  // Opens the dialog and returns a Promise that resolves true (confirm) or false (cancel)
  const confirm = useCallback(options => new Promise(resolve => setRequest({ ...options, resolve })), [])

  // A message with only an OK button (replaces window.alert)
  const notify = useCallback(
    (message, title = 'Something went wrong') =>
      new Promise(resolve => setRequest({ title, message, confirmLabel: 'OK', hideCancel: true, tone: 'info', resolve })),
    [],
  )

  const close = answer => {
    request.resolve(answer)
    setRequest(null)
  }

  const dialog = request && (
    <ConfirmDialog {...request} onConfirm={() => close(true)} onCancel={() => close(false)} />
  )

  return { confirm, notify, dialog }
}
