// Custom hook: start a payment for an order and verify it on the server.
//   const { startPayment, paymentModal, paying } = usePaymentFlow({ onSuccess, onFailure })
// Works in 2 modes (decided by the backend):
//   'razorpay' → opens the real Razorpay test popup
//   'mock'     → shows our MockPaymentModal (no keys set)
import { useState } from 'react'
import { markPaymentFailed, verifyPayment } from '../api/orders'
import MockPaymentModal from '../components/MockPaymentModal'
import { getErrorMessage } from '../utils/format'
import { loadRazorpay } from '../utils/razorpay'
import { shade } from '../utils/themes'
import { useAuth } from './useAuth'
import { useThemeColors } from './useSite'

export const usePaymentFlow = ({ onSuccess, onFailure }) => {
  const { user } = useAuth()
  const theme = useThemeColors()
  const [mock, setMock] = useState(null) // { order, payment } while the mock screen is open
  const [paying, setPaying] = useState(false)

  // Send the result to Django – the SERVER decides if the payment is real
  const verify = async (order, body) => {
    setPaying(true)
    try {
      const result = await verifyPayment(order.id, body)
      onSuccess(result.order)
    } catch (error) {
      onFailure(order, getErrorMessage(error))
    } finally {
      setPaying(false)
    }
  }

  const startPayment = async (order, payment) => {
    if (payment.mode === 'mock') {
      setMock({ order, payment })
      return
    }
    await loadRazorpay()
    const razorpay = new window.Razorpay({
      key: payment.key_id,
      amount: payment.amount, // in paise
      currency: payment.currency,
      order_id: payment.razorpay_order_id,
      name: 'Buy Pilot',
      description: `Order #${order.id}`,
      prefill: { name: user.name, email: user.email },
      theme: { color: shade(theme, 500) }, // popup matches the shop theme
      // Razorpay calls this after a successful payment → verify the signature on our server
      handler: response => verify(order, { payment_id: payment.payment_id, ...response }),
      modal: {
        ondismiss: async () => {
          await markPaymentFailed(order.id, 'Payment window closed')
          onFailure(order, 'Payment was cancelled. You can try again.')
        },
      },
    })
    razorpay.open()
  }

  const paymentModal = mock && (
    <MockPaymentModal
      orderId={mock.order.id}
      amount={mock.order.total}
      onResult={result => {
        const { order, payment } = mock
        setMock(null)
        verify(order, { payment_id: payment.payment_id, mock_result: result })
      }}
    />
  )

  return { startPayment, paymentModal, paying }
}
