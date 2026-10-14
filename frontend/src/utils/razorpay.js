// Load Razorpay's checkout script only when someone pays (third-party script in React)
const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

export const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your internet.'))
    document.body.appendChild(script)
  })
